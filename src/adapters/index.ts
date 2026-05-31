import type { Env, TranslationAdapter } from '../types';
import { gradioTranslateAdapter } from './gradio-translate';
import { hyMt2Adapter } from './hy-mt2';

export function getAdapter(env: Env): TranslationAdapter {
  const name = (env.ADAPTER_NAME ?? 'gradio-translate').toLowerCase();
  switch (name) {
    case 'gradio-translate':
      return gradioTranslateAdapter;
    case 'hy-mt2':
      return hyMt2Adapter;
    default:
      throw new Error(`Unknown adapter: ${name}`);
  }
}
