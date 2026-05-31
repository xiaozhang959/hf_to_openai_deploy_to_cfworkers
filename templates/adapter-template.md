# Reusable adapter template

优先建议先试默认的 gradio-translate adapter，很多 Gradio 翻译类 HF Space 只改环境变量就够了。

只有当目标 Space 的参数结构或返回结构差异很大时，再新建 adapter。

默认通用 adapter 可配置项：
- HF_SPACE_BASE_URL
- GRADIO_SUBMIT_PATH
- GRADIO_RESULT_PATH_TEMPLATE
- HF_MODEL_LIST
- HF_TARGET_LANG_LIST
- HF_SOURCE_TEXT_PARAM
- HF_TARGET_LANG_PARAM
- HF_MODEL_PARAM

把这个文件复制成新的 adapter，例如 my-space.ts，然后实现下面几个接口。

```ts
import type { AdapterContext, Env, TranslationAdapter } from '../types';
import { getLastUserMessage, getString } from '../utils';
import { callGradioSSE } from '../upstream';

export const mySpaceAdapter: TranslationAdapter = {
  name: 'my-space',
  listModels(_env: Env): string[] {
    return ['your/model-name'];
  },
  resolveInput(ctx: AdapterContext) {
    const extra = ctx.request.extra_body ?? {};
    const sourceText = getString(extra, 'source_text') ?? getLastUserMessage(ctx.request.messages);
    const model = ctx.request.model ?? ctx.env.OPENAI_DEFAULT_MODEL ?? 'your/model-name';
    const targetLang = getString(extra, 'target_lang') ?? 'English';

    if (!sourceText.trim()) throw new Error('source_text cannot be empty');

    return { sourceText, targetLang, model };
  },
  async invoke(ctx: AdapterContext, input) {
    return callGradioSSE(
      ctx.env,
      '/gradio_api/call/v2/your_endpoint',
      {
        source_text: input.sourceText,
        target_lang: input.targetLang,
        selected_model: input.model,
      },
      (eventId) => `/gradio_api/call/your_endpoint/${encodeURIComponent(eventId)}`,
    );
  },
};
```

常见要改的地方：
- endpoint 名
- payload 字段名
- 返回解析方式
- 模型列表
- 参数校验
