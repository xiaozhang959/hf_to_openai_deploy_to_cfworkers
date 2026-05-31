export interface Env {
  HF_SPACE_BASE_URL: string;
  HF_API_MODE?: string;
  OPENAI_DEFAULT_MODEL?: string;
  DEFAULT_TARGET_LANG?: string;
  ADAPTER_NAME?: string;
  HF_BEARER_TOKEN?: string;
  WORKER_API_KEY?: string;
  DISABLE_API_KEY_AUTH?: string;
  GRADIO_API_NAME?: string;
  GRADIO_SUBMIT_PATH?: string;
  GRADIO_RESULT_PATH_TEMPLATE?: string;
  HF_MODEL_LIST?: string;
  HF_TARGET_LANG_LIST?: string;
  HF_SOURCE_TEXT_PARAM?: string;
  HF_TARGET_LANG_PARAM?: string;
  HF_MODEL_PARAM?: string;
}

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ChatCompletionRequest = {
  model?: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  extra_body?: Record<string, unknown>;
};

export type OpenAIChatCompletion = Record<string, unknown>;

export interface AdapterContext {
  env: Env;
  request: ChatCompletionRequest;
}

export interface TranslationAdapter {
  name: string;
  listModels(env: Env): string[];
  resolveInput(ctx: AdapterContext): Promise<{
    sourceText: string;
    targetLang: string;
    model: string;
  }> | {
    sourceText: string;
    targetLang: string;
    model: string;
  };
  invoke(ctx: AdapterContext, input: {
    sourceText: string;
    targetLang: string;
    model: string;
  }): Promise<string>;
}
