import type { AdapterContext, Env, TranslationAdapter } from '../types';
import { getLastUserMessage, getString } from '../utils';
import { callGradioSSE } from '../upstream';

function parseCsvList(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function ensureSupported(env: Env, model: string, targetLang: string) {
  const models = parseCsvList(env.HF_MODEL_LIST);
  const langs = parseCsvList(env.HF_TARGET_LANG_LIST);

  if (models.length > 0 && !models.includes(model)) {
    throw new Error(`Unsupported model: ${model}`);
  }
  if (langs.length > 0 && !langs.includes(targetLang)) {
    throw new Error(`Unsupported target_lang: ${targetLang}`);
  }
}

function buildResultPath(template: string, eventId: string): string {
  return template.replace('{event_id}', encodeURIComponent(eventId));
}

export const gradioTranslateAdapter: TranslationAdapter = {
  name: 'gradio-translate',
  listModels(env: Env): string[] {
    const models = parseCsvList(env.HF_MODEL_LIST);
    if (models.length > 0) return models;
    return env.OPENAI_DEFAULT_MODEL ? [env.OPENAI_DEFAULT_MODEL] : [];
  },
  resolveInput(ctx: AdapterContext) {
    const extra = ctx.request.extra_body ?? {};
    const sourceText = getString(extra, 'source_text') ?? getLastUserMessage(ctx.request.messages);
    const targetLang = getString(extra, 'target_lang') ?? ctx.env.DEFAULT_TARGET_LANG ?? 'English';
    const model = ctx.request.model ?? ctx.env.OPENAI_DEFAULT_MODEL ?? '';

    if (!sourceText.trim()) throw new Error('source_text cannot be empty');
    if (!model) throw new Error('No model configured. Set OPENAI_DEFAULT_MODEL or pass model in request');
    ensureSupported(ctx.env, model, targetLang);
    return { sourceText, targetLang, model };
  },
  async invoke(ctx: AdapterContext, input) {
    const submitPath = ctx.env.GRADIO_SUBMIT_PATH ?? '/gradio_api/call/v2/translate';
    const resultTemplate = ctx.env.GRADIO_RESULT_PATH_TEMPLATE ?? '/gradio_api/call/translate/{event_id}';
    const sourceParam = ctx.env.HF_SOURCE_TEXT_PARAM ?? 'source_text';
    const targetParam = ctx.env.HF_TARGET_LANG_PARAM ?? 'target_lang';
    const modelParam = ctx.env.HF_MODEL_PARAM ?? 'selected_model';

    return callGradioSSE(
      ctx.env,
      submitPath,
      {
        [sourceParam]: input.sourceText,
        [targetParam]: input.targetLang,
        [modelParam]: input.model,
      },
      (eventId) => buildResultPath(resultTemplate, eventId),
    );
  },
};
