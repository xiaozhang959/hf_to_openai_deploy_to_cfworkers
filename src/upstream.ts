import type { Env } from './types';

export async function postJson(env: Env, path: string, payload: unknown): Promise<Response> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (env.HF_BEARER_TOKEN) {
    headers.authorization = `Bearer ${env.HF_BEARER_TOKEN}`;
  }
  return fetch(`${env.HF_SPACE_BASE_URL.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
}

export async function getText(env: Env, path: string): Promise<string> {
  const headers: Record<string, string> = {};
  if (env.HF_BEARER_TOKEN) {
    headers.authorization = `Bearer ${env.HF_BEARER_TOKEN}`;
  }
  const response = await fetch(`${env.HF_SPACE_BASE_URL.replace(/\/$/, '')}${path}`, {
    method: 'GET',
    headers,
  });
  if (!response.ok) {
    throw new Error(`Upstream GET failed: ${response.status} ${await response.text()}`);
  }
  return response.text();
}

export async function callGradioSSE(env: Env, path: string, payload: unknown, resultPathBuilder: (eventId: string) => string): Promise<string> {
  const submitResp = await postJson(env, path, payload);
  if (!submitResp.ok) {
    throw new Error(`Upstream POST failed: ${submitResp.status} ${await submitResp.text()}`);
  }
  const submitJson = (await submitResp.json()) as { event_id?: string };
  const eventId = submitJson.event_id;
  if (!eventId) {
    throw new Error('Upstream did not return event_id');
  }
  const sseText = await getText(env, resultPathBuilder(eventId));
  const dataLines = sseText
    .split('\n')
    .filter((line) => line.startsWith('data: '))
    .map((line) => line.slice(6).trim())
    .filter(Boolean);
  const payloadLine = [...dataLines].reverse().find((line) => line !== '[DONE]');
  if (!payloadLine) {
    throw new Error('No SSE data payload received');
  }
  try {
    const parsed = JSON.parse(payloadLine);
    if (Array.isArray(parsed)) return String(parsed[0] ?? '');
    return typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
  } catch {
    return payloadLine;
  }
}
