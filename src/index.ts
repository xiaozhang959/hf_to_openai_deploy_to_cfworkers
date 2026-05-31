import { getAdapter } from './adapters';
import type { Env } from './types';
import { errorJson, extractBearerToken, isTruthy, json, makeCompletion, makeModelList, makeSSEStream, parseRequest } from './utils';

function hasConfiguredWorkerApiKey(env: Env): boolean {
  return Boolean(env.WORKER_API_KEY && env.WORKER_API_KEY.trim().length > 0);
}

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

      if (request.method === 'GET' && url.pathname === '/status') {
        return json({
          ok: true,
          adapter: adapter.name,
          auth: {
            disable_api_key_auth: isTruthy(env.DISABLE_API_KEY_AUTH),
            worker_api_key_configured: hasConfiguredWorkerApiKey(env),
            worker_api_key_length: env.WORKER_API_KEY ? env.WORKER_API_KEY.length : 0,
            worker_api_key_preview: env.WORKER_API_KEY
              ? `${env.WORKER_API_KEY.slice(0, 3)}***${env.WORKER_API_KEY.slice(-2)}`
              : '',
            upstream_bearer_token_configured: Boolean(env.HF_BEARER_TOKEN && env.HF_BEARER_TOKEN.trim().length > 0),
          },
          config: {
            upstream: env.HF_SPACE_BASE_URL,
            submit_path: env.GRADIO_SUBMIT_PATH,
            result_path_template: env.GRADIO_RESULT_PATH_TEMPLATE,
            default_model: env.OPENAI_DEFAULT_MODEL,
            default_target_lang: env.DEFAULT_TARGET_LANG,
            adapter_name: env.ADAPTER_NAME,
          },
          hints: [
            'If worker_api_key_configured is false, the Worker runtime did not receive WORKER_API_KEY.',
            'Deploy to Cloudflare buttons do not automatically populate secrets for you.',
            'In Cloudflare dashboard, set WORKER_API_KEY under Worker Settings -> Variables and Secrets -> Secrets, then deploy again.',
            'A plain text variable is not the same thing as a secret in many dashboard flows.',
          ],
        });
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
