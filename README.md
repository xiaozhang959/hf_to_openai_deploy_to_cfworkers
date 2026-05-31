# HF Space -> OpenAI Compatible Cloudflare Worker Template

这是一个可复用模板：把 Hugging Face Space 的网页/Gradio 能力，快速包装成 OpenAI 兼容接口，并部署到 Cloudflare Workers。

当前已内置示例适配器：Hy-MT2 翻译器。

支持接口：
- GET /health
- GET /v1/models
- POST /v1/chat/completions

核心思路：
1. Workers 接收 OpenAI 风格请求
2. adapter 负责把请求参数映射到具体 HF Space
3. upstream 层负责调用 Gradio/HF 的真实接口
4. 返回 OpenAI 兼容 JSON / SSE

## 当前内置示例

- HF Space: https://noxwano-hy-mt2.hf.space
- Adapter: src/adapters/hy-mt2.ts
- 上游协议: Gradio SSE

## 快速开始

1. 安装依赖

npm install

2. 本地开发

npm run dev

3. 部署

npm run deploy

## OpenAI 兼容调用示例

curl https://your-worker.example.workers.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tencent/Hy-MT2-1.8B",
    "messages": [
      {"role": "user", "content": "你好，世界"}
    ],
    "extra_body": {
      "target_lang": "English"
    }
  }'

## 返回格式

返回 OpenAI chat completions 风格 JSON。

## 如何复用到别的 HF Space

你下次只要替换 3 个点：

1. wrangler.toml 里的 HF_SPACE_BASE_URL
2. 新增一个 adapter 文件到 src/adapters/
3. 在 src/adapters/index.ts 注册它

## 新增 adapter 的最低要求

每个 adapter 只要实现这几个方法：

- name
- listModels(env)
- resolveInput(ctx)
- invoke(ctx, input)

其中：
- resolveInput 负责把 OpenAI 请求解析成你的业务参数
- invoke 负责真正请求 Hugging Face Space

## 适配 Gradio Space 的建议流程

先探测这些地址：
- /config
- /gradio_api/info
- /gradio_api/openapi.json

重点看：
- named_endpoints
- 参数名
- 是否是 /gradio_api/call/v2/... 
- 返回是否为 SSE

## 目录结构

src/
  adapters/
    hy-mt2.ts
    index.ts
  index.ts
  types.ts
  upstream.ts
  utils.ts

## 环境变量

wrangler.toml 默认包含：

- HF_SPACE_BASE_URL
- HF_API_MODE
- OPENAI_DEFAULT_MODEL
- DEFAULT_TARGET_LANG
- ADAPTER_NAME

如果你的目标 Space 需要鉴权，还可以额外设置：

- HF_BEARER_TOKEN

命令：

wrangler secret put HF_BEARER_TOKEN

## Hy-MT2 的参数约定

请求体示例：

{
  "model": "tencent/Hy-MT2-1.8B",
  "messages": [
    {"role": "user", "content": "你好，今天怎么样？"}
  ],
  "extra_body": {
    "target_lang": "English"
  }
}

约定：
- 最后一个 user message 作为待翻译文本
- extra_body.target_lang 作为目标语言
- model 作为选用模型

## 下一步可扩展

后续可以继续加：
- 更通用的 Gradio text-generation adapter
- JSON schema 参数映射
- 多 adapter 路由
- API Key 鉴权
- usage 统计
- 更细粒度流式输出

如果你要把它包装成你自己的长期模板仓库，建议仓库名：
- hf-space-openai-worker-template
- hf2openai-worker
- openai-compatible-hf-worker
