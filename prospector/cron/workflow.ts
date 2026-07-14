import type { Logger } from 'pino';
import { filterHits } from '../agent/filter.ts';
import { generateReply } from '../agent/reply.ts';
import { type SocialHit, searchKeywords } from '../bridgly/index.ts';
import { getCompanyBrief } from '../db/company-brief.ts';
import {
  createReply,
  createResultIfNew,
  getMonitorRunContext,
  markMonitorRun,
  setResultSlackTs,
} from '../db/results.ts';
import type { CompanyBrief, MonitorRecord } from '../schemas/db.ts';
import { postLead } from '../slack/post-lead.ts';
import { createLogger } from '../util/logger.ts';
import { safe } from '../util/result.ts';

const log = createLogger('workflow');

/** A search hit enriched with the monitor keywords that surfaced it. */
type MatchedHit = SocialHit & { matchedKeywords: string[] };

/**
 * End-to-end run for a single monitor:
 *   1. search every platform/keyword combo on Bridgly
 *   2. store each new match as a MonitorResult (deduped by URL)
 *   3. draft a reply for each new match and save it
 *   4. post a lead card (with the editable reply box) to the monitor's channel
 *
 * Idempotent across runs: posts already seen are skipped by the URL dedupe, so
 * re-running only surfaces genuinely new leads.
 */
export async function runMonitor(monitorId: string): Promise<void> {
  const contextResult = await safe(() => getMonitorRunContext(monitorId));
  if (!contextResult.success) {
    log.error({ monitorId, error: contextResult.error }, 'failed to load monitor context, aborting run');
    return;
  }
  if (!contextResult.data) {
    log.warn({ monitorId }, 'monitor not found, skipping run');
    return;
  }
  const { monitor, slackInstallId } = contextResult.data;
  if (!monitor.isActive) {
    log.debug({ monitorId }, 'monitor is paused, skipping run');
    return;
  }

  const runLog = log.child({ monitorId, monitor: monitor.name });
  runLog.info({ platforms: monitor.platforms, keywords: monitor.keywords }, 'starting scan');

  const search = await safe(() => searchKeywords({ platforms: monitor.platforms, keywords: monitor.keywords }));
  if (!search.success) {
    runLog.error({ error: search.error }, 'search failed, aborting run');
    return;
  }
  const rawHits = search.data;
  runLog.info({ hits: rawHits.length }, `scan returned ${rawHits.length} raw hit(s)`);

  // Load the customer's company brief so filtering + reply drafting know who
  // this monitor is really for. Missing brief is fine — the filter falls back
  // to a stricter keyword-only mode.
  const briefResult = await safe(() => getCompanyBrief({ slackInstallId }));
  const brief = briefResult.success ? briefResult.data : null;
  if (!briefResult.success) runLog.warn({ error: briefResult.error }, 'failed to load company brief, filtering blind');

  // Qualify keyword hits into real leads before anything is stored or posted.
  // A filter failure fails safe (surfaces nothing) so a bad run never floods
  // the channel with unfiltered noise.
  const filtered = await safe(() => filterHits({ hits: rawHits, monitor, brief }));
  if (!filtered.success) {
    runLog.error({ error: filtered.error }, 'lead filter failed, aborting run to avoid posting noise');
    return;
  }
  const hits = filtered.data.qualified;
  runLog.info(
    { rawHits: rawHits.length, qualified: hits.length, rejected: rawHits.length - hits.length },
    `filter kept ${hits.length} of ${rawHits.length} hit(s)`,
  );

  let newLeads = 0;
  let skipped = 0;
  let failed = 0;
  for (const hit of hits) {
    const outcome = await processHit({ hit, monitor, brief, monitorId, slackInstallId, runLog });
    if (outcome === 'posted') newLeads += 1;
    else if (outcome === 'duplicate') skipped += 1;
    else failed += 1;
  }

  const marked = await safe(() => markMonitorRun(monitorId));
  if (!marked.success) runLog.error({ error: marked.error }, 'failed to stamp monitor run');

  runLog.info(
    { totalHits: rawHits.length, qualified: hits.length, newLeads, skippedDuplicates: skipped, failed },
    `scan complete: ${newLeads} new lead(s), ${skipped} duplicate(s), ${failed} failed of ${hits.length} qualified hit(s)`,
  );
}

type HitOutcome = 'posted' | 'duplicate' | 'failed';

/**
 * Process a single hit end-to-end. Every step is wrapped so a failure only
 * skips this lead — it never throws or aborts the surrounding loop.
 */
async function processHit({
  hit,
  monitor,
  brief,
  monitorId,
  slackInstallId,
  runLog,
}: {
  hit: MatchedHit;
  monitor: MonitorRecord;
  brief: CompanyBrief | null;
  monitorId: string;
  slackInstallId: string;
  runLog: Logger;
}): Promise<HitOutcome> {
  const hitLog = runLog.child({ platform: hit.platform, author: hit.author, url: hit.url });

  const created = await safe(() =>
    createResultIfNew({
      monitorId,
      platform: hit.platform,
      author: hit.author,
      url: hit.url,
      content: hit.content,
      matchedKeywords: hit.matchedKeywords,
      externalId: hit.externalId,
    }),
  );
  if (!created.success) {
    hitLog.error({ error: created.error }, 'failed to store result, skipping lead');
    return 'failed';
  }
  const result = created.data;
  if (!result) {
    hitLog.debug('already surfaced in a previous run, skipping');
    return 'duplicate'; // deduped by URL
  }

  const drafted = await safe(() => generateReply({ hit, monitor, brief }));
  if (!drafted.success) {
    hitLog.error({ error: drafted.error, resultId: result.id }, 'failed to draft reply, skipping lead');
    return 'failed';
  }
  const draftReply = drafted.data;

  const savedReply = await safe(() => createReply({ monitorResultId: result.id, content: draftReply }));
  if (!savedReply.success) {
    hitLog.error({ error: savedReply.error, resultId: result.id }, 'failed to save reply, skipping lead');
    return 'failed';
  }

  const posted = await safe(() =>
    postLead({
      slackInstallId,
      channelId: monitor.channelId,
      card: {
        platform: hit.platform,
        author: hit.author,
        url: hit.url,
        content: hit.content,
        matchedKeywords: hit.matchedKeywords,
        draftReply,
        resultId: result.id,
      },
    }),
  );
  if (!posted.success) {
    hitLog.error({ error: posted.error, resultId: result.id }, 'failed to post lead to Slack, skipping lead');
    return 'failed';
  }

  const slackMessageTs = posted.data;
  if (slackMessageTs) {
    const stamped = await safe(() => setResultSlackTs({ resultId: result.id, slackMessageTs }));
    if (!stamped.success) hitLog.warn({ error: stamped.error, resultId: result.id }, 'failed to record Slack ts');
  }

  hitLog.info({ resultId: result.id }, 'posted new lead');
  return 'posted';
}
