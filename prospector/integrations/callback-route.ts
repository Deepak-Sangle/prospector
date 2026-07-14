import type { IncomingMessage, ServerResponse } from 'node:http';

import type { CustomRoute } from '@slack/bolt';

import { formatError } from '../util/error.ts';
import { handleOAuthCallback, OAUTH_CALLBACK_PATH, OAuthCallbackQuerySchema } from './connect.ts';
import { PLATFORM_LABEL } from './slugs.ts';

/** Render a tiny self-contained result page shown after the OAuth handshake. */
function resultPage({ title, message, ok }: { title: string; message: string; ok: boolean }): string {
  const color = ok ? '#16a34a' : '#dc2626';
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head><body style="font-family: -apple-system, system-ui, sans-serif; background:#0b0b0c; color:#e5e5e5; display:flex; min-height:100vh; align-items:center; justify-content:center; margin:0;"><div style="max-width:420px; padding:32px; text-align:center;"><div style="font-size:40px; margin-bottom:12px;">⛏️</div><h1 style="color:${color}; font-size:20px; margin:0 0 8px;">${title}</h1><p style="color:#a1a1aa; line-height:1.5;">${message}</p><p style="color:#71717a; font-size:13px; margin-top:24px;">You can close this tab and return to Slack.</p></div></body></html>`;
}

function sendHtml(res: ServerResponse, status: number, html: string): void {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

/**
 * Bolt custom route Composio redirects to after OAuth. Persists the connected
 * account and shows the user a success/failure page. Registered on the app's
 * HTTP receiver via `customRoutes` in `app.ts`.
 */
export function createOAuthCallbackRoute(): CustomRoute {
  return {
    path: OAUTH_CALLBACK_PATH,
    method: ['GET'],
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const url = new URL(req.url ?? '', 'http://localhost');
        const query = Object.fromEntries(url.searchParams.entries());
        const parsed = OAuthCallbackQuerySchema.safeParse(query);
        if (!parsed.success) {
          sendHtml(
            res,
            400,
            resultPage({ title: 'Invalid request', message: 'Missing callback parameters.', ok: false }),
          );
          return;
        }

        const result = await handleOAuthCallback(parsed.data);
        if (result.type === 'ok') {
          const label = PLATFORM_LABEL[result.platform];
          sendHtml(
            res,
            200,
            resultPage({
              title: `${label} connected`,
              message: `Your ${label} account is linked. Prospector can now post replies on your behalf.`,
              ok: true,
            }),
          );
          return;
        }

        const label = result.platform != null ? PLATFORM_LABEL[result.platform] : 'account';
        sendHtml(
          res,
          200,
          resultPage({
            title: 'Connection failed',
            message: `We couldn't connect your ${label}: ${result.error}`,
            ok: false,
          }),
        );
      } catch (e) {
        sendHtml(res, 500, resultPage({ title: 'Something went wrong', message: formatError(e), ok: false }));
      }
    },
  };
}
