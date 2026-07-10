# AGENTS.md — Prospector

Slack agent built with [Bolt for JavaScript](https://tools.slack.dev/bolt-js/) (TypeScript) and the [Vercel AI SDK](https://ai-sdk.dev) (Vertex AI + Anthropic + Google providers). Scaffolded from Slack's `bolt-js-support-agent` template via `slack create agent`, then converted to strict TypeScript and rebuilt as Prospector.

See `PRD.md` for the product spec, hackathon requirements, and roadmap. See `CLAUDE.md` for coding standards (functional style, no classes, Zod-first types, kebab-case files).

## Setup

```sh
npm install
cp .env.sample .env   # Fill in everything not commented out (validated at startup by util/env.ts)
npm run db:migrate    # Apply Prisma migrations to DATABASE_URL
npm start
```

## Environment Variables

| Variable                                                                                  | Description                                                                                                                                   |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                            | Postgres connection string (Prisma). Run `npm run db:migrate` once after setting.                                                             |
| `GOOGLE_VERTEX_PROJECT` / `GOOGLE_VERTEX_LOCATION`                                        | GCP project and region for Vertex AI (default provider); auth via `gcloud auth application-default login` or `GOOGLE_APPLICATION_CREDENTIALS` |
| `ANTHROPIC_API_KEY`                                                                       | Anthropic API key (when using the anthropic provider)                                                                                         |
| `GOOGLE_GENERATIVE_AI_API_KEY`                                                            | Google Gemini API key (when using the google provider)                                                                                        |
| `PROSPECTOR_MODEL`                                                                        | `provider:model-id`, e.g. `vertex:gemini-2.5-pro` (default), `anthropic:claude-opus-4-8`, or `google:gemini-2.5-flash`                        |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` / `SLACK_SIGNING_SECRET` / `SLACK_REDIRECT_URI` | Slack OAuth credentials — **required**, validated at startup by `util/env.ts`                                                                 |
| `PORT` / `SLACK_STATE_SECRET`                                                             | Optional (default 3000 / static secret)                                                                                                       |

## Commands

```sh
npm start            # HTTP + OAuth entry (node app.ts — native TS, no build step)
npm run check        # Type check (tsc --noEmit, strict)
npm run lint         # Biome lint + format check
npm run lint:fix     # Auto-fix
npm test             # node:test over tests/**/*.test.ts
npm run db:generate  # Regenerate Prisma client into db/generated (also runs on postinstall)
npm run db:migrate   # Apply committed migrations to DATABASE_URL (prisma migrate deploy)
npm run db:migrate:dev # Create + apply a new migration after editing prisma/schema.prisma
```

**Node ≥ 23.6 required** (native TypeScript type stripping; repo developed on Node 24). Imports use explicit `.ts` extensions.

## Architecture

### Agent layer (`agent/`)

- `prospector.ts` — `runProspectorAgent({text, history, deps})` calls `generateText()` with the system prompt, tools, and `stopWhen: stepCountIs(8)` for multi-step tool use. Returns `{responseText, messages}` where `messages` is the updated history to persist.
- `model.ts` — `resolveModel()` picks the provider from `PROSPECTOR_MODEL`.
- `tools/` — AI SDK `tool({description, inputSchema, execute})` definitions with Zod v4 schemas, returning plain strings:
  - `monitors.ts`: `createMonitorTools(context)` factory → `create_monitor`, `list_monitors`, `delete_monitor`, backed by Postgres via `db/monitors.ts` and scoped to the request's org (install key) + user
  - `leads.ts`: `get_recent_leads`, `draft_reply` — still **stubs** over canned data
- `deps` (`ProspectorDeps`: Slack `client`, user/channel/thread IDs, plus `teamId`/`enterpriseId`/`isEnterpriseInstall` from Bolt `context`) is required; `runProspectorAgent` resolves the org context from it to bind the monitor tools.

Adding a tool:

```ts
import { tool } from 'ai';
import { z } from 'zod';

export const myTool = tool({
  description: 'What it does and when to call it',
  inputSchema: z.object({ query: z.string().describe('…') }),
  execute: async ({ query }) => 'result string',
});
// then register it under a snake_case name in agent/prospector.ts `tools`
```

### Conversation management (`thread-context/`)

The AI SDK is stateless, so full `ModelMessage[]` history is stored per thread in an in-memory Map keyed by `${channelId}:${threadTs}` (TTL 24h, max 1000 entries). Listeners read history before the agent call and write the updated array after. A non-null history is also how `message.ts` decides the bot is "engaged" in a channel thread.

### Listeners (`listeners/`)

Registered in `listeners/index.ts` → `registerListeners(app)`; one register function per category (events/actions/views).

- `events/message.ts` — DMs always handled; channel thread replies only when engaged; top-level channel messages ignored (that's `app_mention`'s job). Skips bot messages and subtyped events.
- `events/app-mentioned.ts` — strips the `<@BOTID>` mention, runs the agent, replies in-thread.
- Both add an `:eyes:` reaction to the first message, call `setStatus()` with loading messages, stream the response via `sayStream()`, and attach feedback buttons on `.stop()`.
- `events/app-home-opened.ts` — fires for both tabs under `agent_view`; `event.tab === 'messages'` pins suggested prompts (`assistant.threads.setSuggestedPrompts`, `thread_ts: ''`), `'home'` publishes the Block Kit Home view.
- `actions/feedback-buttons.ts` — 👍/👎 → ephemeral acknowledgement.
- `views/` — pure Block Kit builders (`app-home-builder.ts`, `feedback-builder.ts`) plus an empty view-submission registrar (the monitor-creation modal will live here).

### Schemas (`schemas/monitor.ts`)

Zod schemas + inferred types for `Monitor`, `MonitorInput`, `Lead`, `Platform`, `Frequency`. This is the contract between the stub tools and the future real implementation — keep it the single source of truth.

### Database (`prisma/`, `db/`, `schemas/db.ts`)

Postgres via Prisma 7 (driver adapter `@prisma/adapter-pg`, connection from `DATABASE_URL`; `prisma.config.ts` holds the migrate config). Models: `Organization` (Slack workspace, unique `slackTeamId`), `User` (per-org Slack user), `SlackInstallation` (raw Bolt OAuth payload JSON, one per workspace), `Monitor` (config + `isActive`/`lastRunAt` for the cron), `MonitorResult` (lead, deduped by `@@unique([monitorId, url])`, `status` new/dismissed, `slackMessageTs` of the posted card), `MonitorReply` (drafted replies, newest wins).

- `db/client.ts` — shared `prisma` instance. `db/generated/` is gitignored; `prisma generate` runs on postinstall.
- `db/installation-store.ts` — `createDbInstallationStore()`, the Bolt `InstallationStore` used by `app.ts` (per-workspace OAuth payloads in `SlackInstallation`).
- `schemas/db.ts` — Zod mirrors of the Prisma models; app code uses these types, never the generated Prisma model types. Keep in sync with `prisma/schema.prisma`.
- Schema changes: edit `prisma/schema.prisma` → `npm run db:migrate:dev` (commits a migration under `prisma/migrations/`) → update `schemas/db.ts`. The initial migration `0_init` was created offline; on first deploy run `npx prisma migrate resolve --applied 0_init` **only if** the tables already exist, otherwise just `npm run db:migrate`.
- `db/monitors.ts` — monitor repository (`createMonitor` / `listMonitors` / `deleteMonitor`), all scoped by the org's `slackInstallId`; lazily upserts Organization + User so tools work even before install rows are backfilled.
- The lead tools in `agent/tools/leads.ts` are still in-memory stubs — wiring them to `MonitorResult`/`MonitorReply` is the next step.

### Entry point

- `app.ts` — the only entry: HTTP + OAuth Bolt app. Env is validated by `util/env.ts` (zod — exits with a clear message on missing vars); bot scopes are read from `manifest.json`; installations live in Postgres via `db/installation-store.ts`. The OAuth redirect is pinned with the top-level `redirectUri` App option + `installerOptions.redirectUriPath` — the manifest registers two redirect URLs (production + ngrok), so the explicit `redirect_uri` param is required for Slack to accept the flow.
- Slack delivers events to `POST /slack/events`; installs go through `/slack/install` → `/slack/oauth_redirect`. Production is Railway at `https://prospector.withsia.com`; local dev receives events via the ngrok domain (point the app's request URLs there temporarily in App Settings).

## Testing

Node's built-in runner (`node:test` + `node:assert`), TypeScript executed natively.

- Files live in `tests/` mirroring the source tree, named `<source-file>.test.ts`
- `describe()` / `it()` / `beforeEach()`; `mock.fn()` / `mock.method()` from `node:test` — no external libraries
- Mock Slack client methods as `mock.fn()` objects with the needed nested structure
- What to test: view builders (pure functions), listener handlers (mock `ack`/`client`/`context`/`logger`), the conversation store (CRUD, TTL, eviction)

## Template heritage (what `slack create agent` gave us)

The starter was the Casey IT-helpdesk sample. Kept: the listener structure, assistant-thread UX (status, suggested prompts, streaming, feedback buttons), the OAuth entry-point pattern, Biome config, test conventions, manifest shape. Removed: Claude Agent SDK (+ in-process MCP server and Slack MCP integration), all IT tools, the issue-category modal flow, all `.js` sources. If you need a reference for a removed pattern, the upstream template is `slack-samples/bolt-js-support-agent` (subdir `claude-agent-sdk`).
