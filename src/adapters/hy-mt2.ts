import type { AdapterContext, Env, TranslationAdapter } from '../types';
import { getLastUserMessage, getString } from '../utils';
import { callGradioSSE } from '../upstream';

const SUPPORTED_MODELS = [
  'tencent/Hy-MT2-30B-A3B',
  'tencent/Hy-MT2-7B',
  'tencent/Hy-MT2-1.8B',
];

const SUPPORTED_LANGUAGES = [
  'Arabic', 'Bengali', 'Burmese', 'Cantonese', 'Chinese', 'Czech',
  'Dutch', 'English', 'Filipino', 'French', 'German', 'Gujarati',
  'Hebrew', 'Hindi', 'Indonesian', 'Italian', 'Japanese', 'Kazakh',
  'Khmer', 'Korean', 'Malay', 'Marathi', 'Mongolian', 'Persian',
  'Polish', 'Portuguese', 'Russian', 'Spanish', 'Tamil', 'Telugu',
  'Thai', 'Tibetan', 'Traditional Chinese', 'Turkish', 'Ukrainian',
  'Urdu', 'Uyghur', 'Vietnamese',
];

function ensureSupported(model: string, targetLang: string) {
  if (!SUPPORTED_MODELS.includes(model)) {
    throw new Error(`Unsupported model: ${model}`);
  }
  if (!SUPPORTED_LANGUAGES.includes(targetLang)) {
    throw new Error(`Unsupported target_lang: ${targetLang}`);
  }
}

export const hyMt2Adapter: TranslationAdapter = {
  name: 'hy-mt2',
  listModels(_env: Env): string[] {
    return SUPPORTED_MODELS;
  },
  resolveInput(ctx: AdapterContext) {
    const extra = ctx.request.extra_body ?? {};
    const targetLang = getString(extra, 'target_lang') ?? ctx.env.DEFAULT_TARGET_LANG ?? 'English';
    const sourceText = getString(extra, 'source_text') ?? getLastUserMessage(ctx.request.messages);
    const model = ctx.request.model ?? ctx.env.OPENAI_DEFAULT_MODEL ?? 'tencent/Hy-MT2-1.8B';
    ensureSupported(model, targetLang);
    if (!sourceText.trim()) throw new Error('source_text cannot be empty');
    return { sourceText, targetLang, model };
  },
  async invoke(ctx: AdapterContext, input) {
    return callGradioSSE(
      ctx.env,
      '/gradio_api/call/v2/translate',
      {
        source_text: input.sourceText,
        target_lang: input.targetLang,
        selected_model: input.model,
      },
      (eventId) => `/gradio_api/call/translate/${encodeURIComponent(eventId)}`,
    );
  },
};
