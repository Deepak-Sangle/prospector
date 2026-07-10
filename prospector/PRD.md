# Prospector — PRD

Social listening + lead-generation agent that lives entirely in Slack. Users create **monitors** (keywords + platforms + frequency + target channel + custom filter instructions); Prospector scans Reddit/LinkedIn/X on a cron, filters matches, drafts replies, and pings the channel.

## 1. Hackathon context (Slack Agent Builder Challenge)

- **Site:** https://slackhack.devpost.com | **Deadline:** July 13, 2026, 5:00 PM PDT
- **Track:** **Slack Agent for Organizations** (New Agent). Requirements:
  - Build a new Slack agent using at least one of: **Slack AI capabilities**, **MCP server integration**, **Real-Time Search (RTS) API**.
  - **Submit the app to the Slack Marketplace before the deadline** — this is what distinguishes the org track. Must follow all Slack Marketplace guidelines, including being **installed in 5 active workspaces**.
  - App must be **deployed in a production workspace** (create a free workspace if needed); the developer sandbox is for testing/judging only.
- **What to submit on Devpost:**
  - Text description of features/functionality
  - ~3-minute demo video showing the working project (judges spend ~5–7 min per project — first 60s matter)
  - Architecture diagram
  - URL to Slack developer sandbox with access granted to `slackhack@salesforce.com` and `testing@devpost.com`
  - **Slack App ID** proving Marketplace submission during the hackathon window
- **Judging criteria:** Technological implementation (quality of code, use of the 3 technologies), Design/UX, Potential impact, Quality/uniqueness of idea. Best submissions solve a real workflow problem inside Slack, not a generic chatbot wrapper.
- **Which technology we lean on:** _Slack AI capabilities_ — `agent_view` (assistant panel), assistant threads (`setStatus` loading messages, `setSuggestedPrompts`), streamed responses (`sayStream`), feedback buttons. MCP and RTS are deliberately not used in the baseline (per project decision); adding RTS later (e.g. "watch Slack itself for keyword mentions") would be a strong differentiator.
- **Prizes for the org track:** $8,000 first / $4,000 second, plus side prizes (Best UX, Most Innovative, Best Technological Implementation — $2,000 each).
- **Team limit:** up to 4. Devpost account + Slack Developer Program membership required.

## 2. Product spec

### Monitor (core object)

| Field          | Constraint                                                                 |
| -------------- | -------------------------------------------------------------------------- |
| `name`         | short human label                                                          |
| `keywords`     | 1–10 keywords/phrases                                                      |
| `platforms`    | subset of `reddit`, `linkedin`, `x`                                        |
| `frequency`    | `hourly`, `every_6_hours`, `daily`                                         |
| `channelId`    | Slack channel that receives leads                                          |
| `instructions` | optional free-text filter instructions ("only founders, ignore job posts") |

### Flow

1. User installs Prospector, creates monitors via DM conversation (later: a Block Kit modal).
2. A cron job runs per monitor at its frequency: fetch candidate posts per platform → LLM-filter using keywords + instructions → for each qualified lead, draft a reply → post a Block Kit message to the monitor's channel (lead content, link, matched keywords, drafted reply, action buttons: "Copy reply", "Regenerate", "Dismiss").
3. Users can also chat with Prospector anywhere (DM, @mention, assistant panel) to manage monitors and review leads.

### Current status (baseline, this repo)

- ✅ Installs via OAuth (`npm start`, HTTP mode — the only mode) with per-workspace tokens in Postgres.
- ✅ Answers any question via the agent in DMs, @mentions, and the assistant panel, with per-thread conversation memory.
- ✅ Five **stubbed** tools the agent can call: `create_monitor`, `list_monitors`, `delete_monitor` (in-memory Map, seeded with `mon_1`), `get_recent_leads`, `draft_reply` (canned leads).
- ✅ Prisma/Postgres schema for `Organization`/`User`/`SlackInstallation`/`Monitor`/`MonitorResult`/`MonitorReply` — installation store is wired; monitor tools are not yet.
- ❌ No cron, no real platform scraping, no lead-posting to channels, no modal UI; conversation memory is still in-memory. The core scanning/filtering/drafting logic exists **separately** (owner has it) and will be wired in.

## 3. Codebase

Starter heritage: scaffolded with `slack create agent` from Slack's `bolt-js-support-agent` template (an IT helpdesk agent, "Casey"). All IT-specific code was deleted; everything was converted from JavaScript (JSDoc + checkJs) to strict TypeScript run **natively by Node 24** (type stripping — no build step, no tsx). The Claude Agent SDK from the template was replaced with the **Vercel AI SDK**.

```
app.ts                    # single entry: HTTP + OAuth Bolt app (npm start); env validated by util/env.ts
manifest.json             # Slack app manifest (scopes, agent_view, events, request URLs)
db/                       # Prisma client + createDbInstallationStore (per-workspace OAuth tokens)
prisma/                   # schema.prisma + migrations (Organization, User, SlackInstallation, Monitor, …)
agent/
  prospector.ts           # system prompt + runProspectorAgent() (generateText loop, stopWhen stepCountIs(8))
  model.ts                # provider registry: PROSPECTOR_MODEL="provider:model-id"
  tools/monitors.ts       # stub create/list/delete monitor tools (ai `tool()` + zod inputSchema)
  tools/leads.ts          # stub get_recent_leads + draft_reply tools
schemas/monitor.ts        # Zod schemas + types: Monitor, MonitorInput, Lead, Platform, Frequency
listeners/
  events/message.ts       # DMs + engaged channel threads → run agent, stream reply
  events/app-mentioned.ts # @Prospector in channels → run agent in thread
  events/app-home-opened.ts # Home tab view / pinned suggested prompts (Messages tab)
  actions/feedback-buttons.ts # 👍/👎 on responses → ephemeral ack
  views/app-home-builder.ts   # Block Kit Home view
  views/feedback-builder.ts   # context_actions feedback_buttons block
thread-context/store.ts   # in-memory per-thread ModelMessage[] history (TTL 24h, max 1000)
util/env.ts               # zod-validated required env (exits with a clear message if missing)
util/error.ts             # formatError (surfaces Slack API error codes)
tests/                    # node:test, mirrors source tree
```

Key design points:

- **Conversation memory is client-side.** The AI SDK is stateless, so `thread-context` stores the full `ModelMessage[]` per `${channelId}:${threadTs}` and passes it back on each turn. `history !== null` also doubles as the "bot is engaged in this thread" check in `listeners/events/message.ts`.
- **Model switching:** `PROSPECTOR_MODEL=provider:model-id` — `vertex:gemini-2.5-pro` (default), `anthropic:claude-opus-4-8`, or `google:gemini-2.5-flash`. Set the matching credentials (`GOOGLE_VERTEX_PROJECT`+auth / `ANTHROPIC_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY`).
- **Tools** are AI SDK `tool({description, inputSchema, execute})` objects returning plain strings; registered by snake_case name in `agent/prospector.ts`.

## 4. Technical how-tos

- **Run locally:** `cp .env.sample .env`, fill everything not commented out (all required vars are validated at startup by `util/env.ts`), `npm run db:migrate`, then `npm start`. To receive Slack events locally, run ngrok and point the app's request URLs at `https://lateritic-unrepentingly-catherine.ngrok-free.dev` in App Settings.
- **Checks:** `npm run check` (tsc), `npm run lint` / `lint:fix` (Biome), `npm test` (node:test, native TS).
- **Node ≥ 23.6 required** — imports use explicit `.ts` extensions (`allowImportingTsExtensions`), run directly by Node.
- **Manifest changes:** `manifest.json` in this repo is source-of-truth for documentation; apply changes at api.slack.com/apps → App Manifest (scope changes require a re-install).
- **Deployment:** HTTP + OAuth only. Production runs on Railway at `https://prospector.withsia.com` (manifest request URLs point there); ngrok is registered as a second OAuth redirect for local dev. Start command: `npm start`; `PORT` is respected; run `npm run db:migrate` on release. Installations are stored per-workspace in Postgres, so the deployment is stateless.
- **Scopes are minimal by design** (Marketplace review scrutinizes every scope; adding one later forces a re-install/re-approval, so add only when the feature lands). Current bot scopes and why: `app_mentions:read` (app_mention event), `assistant:write` (agent panel: status, suggested prompts, streaming), `channels:history`/`groups:history`/`im:history`/`mpim:history` (message events incl. thread replies), `chat:write` (replies + ephemeral), `reactions:write` (covers both `reactions.add` and `reactions.remove`). No user scopes (the template's long user-scope list existed only for its Slack MCP integration, which we removed). Likely future additions: `channels:read` + `channels:join` (validate/join the lead channel), `im:write` (DM users about leads), `users:read` (nicer lead attribution).
- **Assistant surface gotchas:** `app_home_opened` fires for both tabs — branch on `event.tab`; `setSuggestedPrompts` is called with `thread_ts: ''` (pinned prompts need no thread, but the type requires the field); `sayStream()` streams markdown then attaches feedback blocks on `.stop()`.

## 5. What to build next (ordered)

1. **Persistence** — Prisma models exist (`Monitor`, `MonitorResult`, `MonitorReply`); wire the stub tools and the conversation store to Postgres. Key by team + user for multi-workspace installs.
2. **Monitor creation modal** — Block Kit modal (keywords, platform checkboxes, frequency select, `conversations_select` for channel, instructions textarea) opened from App Home button and/or a `create_monitor` shortcut; register in `listeners/views/`.
3. **Cron scheduler** — per-monitor schedule (node-cron or a hosted scheduler); each tick runs scan → filter → draft → post.
4. **Real platform integrations** — wire in the owner's existing scan/filter/draft logic behind the current tool interfaces (swap the stub `execute` bodies; the schemas in `schemas/monitor.ts` are the contract).
5. **Lead delivery messages** — Block Kit lead cards posted to the monitor channel with action buttons; handlers in `listeners/actions/`.
6. **Marketplace prep** — production workspace deploy, OAuth mode, privacy policy/support URLs in manifest, 5 active workspace installs, submit before July 13.
7. **Demo assets** — 3-min video, architecture diagram, sandbox access for judges.
