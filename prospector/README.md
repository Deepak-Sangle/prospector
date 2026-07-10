# ⛏️ Prospector

Find your next customer where they already talk. Prospector is a social listening and lead-generation agent that lives entirely in Slack: create a **monitor** (up to 10 keywords, platforms, frequency, a channel, and custom filter instructions) and Prospector watches Reddit, LinkedIn, and X for high-intent conversations, drafts a reply for each qualified lead, and pings your channel.

Built with [Bolt for JavaScript](https://tools.slack.dev/bolt-js/) (TypeScript) and the [Vercel AI SDK](https://ai-sdk.dev) (Vertex AI / Claude / Gemini). Entry for the [Slack Agent Builder Challenge](https://slackhack.devpost.com) — _Slack Agent for Organizations_ track.

> **Status:** baseline. The agent installs via OAuth, converses in DMs / @mentions / the assistant panel with per-thread memory, and runs five stubbed tools (`create_monitor`, `list_monitors`, `delete_monitor`, `get_recent_leads`, `draft_reply`). Real scanning, cron scheduling, and monitor persistence are next — see [PRD.md](./PRD.md).

## How it runs

The app is an HTTP + OAuth Bolt app — one entry point (`app.ts`), one configuration. Slack delivers events to `POST /slack/events`; workspaces install through `/slack/install` → `/slack/oauth_redirect`; per-workspace bot tokens live in Postgres (Prisma `SlackInstallation`).

- **Production:** Railway at **https://prospector.withsia.com** — the manifest's event/interactivity URLs point here.
- **Local dev:** ngrok at **https://lateritic-unrepentingly-catherine.ngrok-free.dev** (registered as a second OAuth redirect). To receive events locally, temporarily point the request URLs of the app (or a separate dev app) at the ngrok domain in App Settings.

App configuration is defined in [`manifest.json`](./manifest.json); apply changes at [api.slack.com/apps](https://api.slack.com/apps) → your app → App Manifest.

## Setup

Requirements: **Node ≥ 23.6** (TypeScript runs natively — no build step), Postgres, and Vertex AI (or Anthropic/Gemini) credentials.

```sh
npm install
cp .env.sample .env    # fill in everything not commented out
npm run db:migrate     # apply Prisma migrations to DATABASE_URL
npm start
```

`.env` requires (validated at startup — the app exits with a clear message if anything is missing):

| Variable                                                         | Source                                                                                            |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                   | Postgres connection string                                                                        |
| `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET` | App Settings → Basic Information                                                                  |
| `SLACK_REDIRECT_URI`                                             | production or ngrok redirect (must match `manifest.json`)                                         |
| `GOOGLE_VERTEX_PROJECT`, `GOOGLE_VERTEX_LOCATION`                | GCP project for the default model (`vertex:gemini-2.5-pro`); switch models via `PROSPECTOR_MODEL` |

## Deploy (Railway)

1. Deploy the repo — Node 24 runtime, start command `npm start` (`PORT` is respected), run `npm run db:migrate` on release.
2. Set the env vars above; for Vertex auth on a server, mount a service-account key and set `GOOGLE_APPLICATION_CREDENTIALS` (ADC login doesn't exist there).
3. Install: open `https://prospector.withsia.com/slack/install`. Every workspace (yours, the dev sandbox, judges') installs through the same URL; tokens are kept per-workspace in Postgres.

## Using the app

- **Assistant panel** — click _Add Agent_ in Slack, pick Prospector, use a suggested prompt.
- **Direct messages** — DM Prospector; it replies in-thread with streaming and keeps context.
- **Channel @mentions** — `/invite @Prospector`, then `@Prospector list my monitors`. It stays engaged in that thread afterwards.
- **App Home** — overview of what Prospector can do.

## Development

```sh
npm run check       # tsc --noEmit (strict)
npm run lint        # Biome
npm run lint:fix
npm test            # node:test
npm run db:migrate:dev  # create a new migration after schema changes
```

Architecture and conventions: [AGENTS.md](./AGENTS.md). Product spec and hackathon plan: [PRD.md](./PRD.md). Coding standards: [CLAUDE.md](./CLAUDE.md).
