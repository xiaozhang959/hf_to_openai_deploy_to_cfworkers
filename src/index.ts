import { getAdapter } from './adapters';
import type { Env } from './types';
import { errorJson, extractBearerToken, isTruthy, json, makeCompletion, makeModelList, makeSSEStream, parseRequest } from './utils';

function ensureAuthorized(request: Request, env: Env): Response | null {
  if (isTruthy(env.DISABLE_API_KEY_AUTH)) {
    return null;
  }

  const configuredKey = env.WORKER_API_KEY?.trim();
  if (!configuredKey) {
    return errorJson('Server missing WORKER_API_KEY configuration', 500, 'server_error');
  }

  const token = extractBearerToken(request);
  if (!token) {
    return errorJson('Missing Bearer token', 401, 'authentication_error');
  }

  if (token !== configuredKey) {
    return errorJson('Invalid API key', 401, 'authentication_error');
  }

  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      const adapter = getAdapter(env);

      if (request.method === 'GET' && url.pathname === '/health') {
        return json({ ok: true, adapter: adapter.name, upstream: env.HF_SPACE_BASE_URL });
      }

      if (url.pathname === '/v1/models' || url.pathname === '/v1/chat/completions') {
        const authError = ensureAuthorized(request, env);
        if (authError) return authError;
      }

      if (request.method === 'GET' && url.pathname === '/v1/models') {
        return json(makeModelList(adapter.listModels(env)));
      }

      if (request.method === 'POST' && url.pathname === '/v1/chat/completions') {
        const body = await parseRequest(request);
        const ctx = { env, request: body };
        const input = await adapter.resolveInput(ctx);
        const translated = await adapter.invoke(ctx, input);

        if (body.stream) {
          return new Response(makeSSEStream(input.model, translated), {
            headers: {
              'content-type': 'text/event-stream; charset=utf-8',
              'cache-control': 'no-cache, no-transform',
              connection: 'keep-alive',
            },
          });
        }

        return json(makeCompletion(input.model, translated));
      }

      return errorJson('Not found', 404);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return errorJson(message, 500, 'server_error');
    }
  },
};
