import type { ChatCompletionRequest, ChatMessage } from './types';

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export function errorJson(message: string, status = 400, type = 'invalid_request_error'): Response {
  return json({ error: { message, type } }, status);
}

export function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

export function extractBearerToken(request: Request): string | null {
  const auth = request.headers.get('authorization') ?? request.headers.get('Authorization');
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

export function getLastUserMessage(messages: ChatMessage[]): string {
  const msg = [...messages].reverse().find((m) => m.role === 'user' && m.content.trim());
  if (!msg) throw new Error('No non-empty user message found');
  return msg.content.trim();
}

export function getString(extraBody: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = extraBody?.[key];
  return typeof value === 'string' ? value : undefined;
}

export function makeCompletion(model: string, content: string): Record<string, unknown> {
  return {
    id: `chatcmpl-${crypto.randomUUID().replace(/-/g, '')}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    },
  };
}

export function makeModelList(models: string[]): Record<string, unknown> {
  return {
    object: 'list',
    data: models.map((id) => ({
      id,
      object: 'model',
      owned_by: 'hf-space-proxy',
      permission: [],
    })),
  };
}

export function makeSSEStream(model: string, content: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      const completionId = `chatcmpl-${crypto.randomUUID().replace(/-/g, '')}`;
      const first = {
        id: completionId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          {
            index: 0,
            delta: { role: 'assistant', content },
            finish_reason: null,
          },
        ],
      };
      const last = {
        id: completionId,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          {
            index: 0,
            delta: {},
            finish_reason: 'stop',
          },
        ],
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(first)}\n\n`));
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(last)}\n\n`));
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
}

export async function parseRequest(request: Request): Promise<ChatCompletionRequest> {
  const body = (await request.json()) as ChatCompletionRequest;
  if (!body || !Array.isArray(body.messages)) {
    throw new Error('Request body must include messages array');
  }
  return body;
}
