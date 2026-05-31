import type { Env, TranslationAdapter } from '../types';
import { hyMt2Adapter } from './hy-mt2';

export function getAdapter(env: Env): TranslationAdapter {
  const name = (env.ADAPTER_NAME ?? 'hy-mt2').toLowerCase();
  switch (name) {
    case 'hy-mt2':
      return hyMt2Adapter;
    default:
      throw new Error(`Unknown adapter: ${name}`);
  }
}
