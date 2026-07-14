import type { IncomingMessage, ServerResponse } from 'node:http';

import type { CustomRoute } from '@slack/bolt';

/**
 * Liveness probe at GET /health. Returns 200 with a small JSON body so Fly
 * (and uptime checks) can confirm the app is serving. Registered via
 * `customRoutes` in `app.ts`.
 */
export function createHealthRoute(): CustomRoute {
  return {
    path: '/health',
    method: ['GET'],
    handler: (_req: IncomingMessage, res: ServerResponse) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok' }));
    },
  };
}
