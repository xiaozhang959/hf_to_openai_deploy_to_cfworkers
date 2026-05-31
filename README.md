# HF Space 转 OpenAI 接口的 Cloudflare Workers 模板

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/xiaozhang959/hf_to_openai_deploy_to_cfworkers)

这个项目的作用是：
把 Hugging Face Space 的接口包装成 OpenAI 兼容接口，然后部署到 Cloudflare Workers。

目前这个模板已经可以直接用于一类很常见的场景：
Gradio 翻译类 Space。

仓库内已经内置好 Hy-MT2 的示例配置，同时也支持通过环境变量切换到别的同类 HF Space。

## 现在已经支持的功能

1. 部署到 Cloudflare Workers
2. OpenAI 风格接口
3. Bearer Token 鉴权
4. 对接 Hugging Face Space 的 Gradio SSE 接口
5. 通过环境变量切换不同的 Space 地址和参数名
6. 保留 Hy-MT2 的专用适配器示例

## 接口列表

1. GET /health
用于检查服务是否正常运行，这个接口不需要鉴权。

2. GET /status
用于查看 Worker 当前运行状态和关键配置是否生效，这个接口不需要鉴权。
它会返回：
- 当前 adapter
- 是否关闭了 API Key 鉴权
- WORKER_API_KEY 是否已经注入到运行时
- HF_BEARER_TOKEN 是否已经注入到运行时
- 当前使用的上游地址和关键路径配置

3. GET /v1/models
返回当前可用模型列表，这个接口需要 API Key。

4. POST /v1/chat/completions
OpenAI 兼容接口，这个接口需要 API Key。

## 适合什么场景

这个模板最适合下面这种情况：

1. 目标是 Hugging Face Space
2. Space 是 Gradio 应用
3. 后端接口是 /gradio_api/call/v2/... 这种形式
4. 返回结果通过 SSE 或 event_id 轮询拿到
5. 你想把它包装成 OpenAI SDK 可以调用的接口

## 项目结构

src/
  adapters/
    gradio-translate.ts
    hy-mt2.ts
    index.ts
  index.ts
  types.ts
  upstream.ts
  utils.ts

templates/
  adapter-template.md

文件说明：

1. src/index.ts
Worker 入口，处理路由、鉴权和统一返回格式。

2. src/adapters/gradio-translate.ts
通用翻译适配器。大多数同类 Gradio 翻译 Space 优先用这个。

3. src/adapters/hy-mt2.ts
Hy-MT2 的示例适配器，主要用于保留一个明确可参考的实现。

4. src/upstream.ts
负责请求上游 HF Space。

5. src/utils.ts
通用工具函数。

6. templates/adapter-template.md
如果以后真的遇到通用配置不够用的 Space，可以按这个模板写新的 adapter。

## 安装

npm install

## 本地开发

npm run dev

## 部署

你可以直接点 README 顶部的 Deploy to Cloudflare 按钮进行一键部署。

现在一键部署页面里会直接出现可填写项，包括：

1. WORKER_API_KEY
2. HF_BEARER_TOKEN（如果上游需要）

其中：

- WORKER_API_KEY 现在按普通运行时变量处理，方便一键部署时直接填写
- 配完部署后，访问 /status，应该看到 worker_api_key_configured = true

也可以手动部署：

npm run deploy

## 配置 Worker API Key

现在默认推荐你在 Cloudflare 一键部署页面里直接填写 WORKER_API_KEY。

这个值目前按普通运行时变量处理，目的是让一键部署时能直接出现输入框。

如果你是手动部署，也可以在 wrangler.toml 或 Cloudflare 后台里配置它。

部署完成后，访问：

/status

确认返回里：

worker_api_key_configured = true

调用接口时，需要带上这个请求头：

Authorization: Bearer your_worker_api_key

如果只是本地临时调试，也可以在 wrangler.toml 里把下面这个值改成 true：

DISABLE_API_KEY_AUTH = "true"

注意：
线上环境不要关闭鉴权。

## 如果上游 HF Space 还需要鉴权

有些 Hugging Face Space 不是公开接口，这种情况下还需要配置上游访问密钥：

npx wrangler secret put HF_BEARER_TOKEN

配置后，Worker 会把这个 Bearer Token 带给上游 HF Space。

## 调用示例

curl https://your-worker.example.workers.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_worker_api_key" \
  -d '{
    "model": "tencent/Hy-MT2-1.8B",
    "messages": [
      {"role": "user", "content": "你好，世界"}
    ],
    "extra_body": {
      "target_lang": "English"
    }
  }'

## 返回结果

返回格式是 OpenAI chat completions 风格的 JSON。

如果请求使用 stream=true，则返回 SSE。

## 默认环境变量说明

wrangler.toml 里当前已经提供这些变量：

1. HF_SPACE_BASE_URL
目标 Hugging Face Space 的地址。

2. HF_API_MODE
当前模板里主要用于标识上游接口类型，默认是 gradio_sse。

3. OPENAI_DEFAULT_MODEL
默认模型名。如果请求里不传 model，就用这个值。

4. DEFAULT_TARGET_LANG
默认目标语言。

5. ADAPTER_NAME
当前使用哪个 adapter。默认是 gradio-translate。

6. GRADIO_SUBMIT_PATH
提交任务的上游路径。

7. GRADIO_RESULT_PATH_TEMPLATE
读取结果的上游路径模板，里面的 {event_id} 会自动替换。

8. HF_MODEL_LIST
当前允许的模型列表，逗号分隔。

9. HF_TARGET_LANG_LIST
当前允许的目标语言列表，逗号分隔。

10. HF_SOURCE_TEXT_PARAM
上游接口里“源文本”的字段名。

11. HF_TARGET_LANG_PARAM
上游接口里“目标语言”的字段名。

12. HF_MODEL_PARAM
上游接口里“模型名”的字段名。

13. DISABLE_API_KEY_AUTH
是否关闭 Worker 自身的 API Key 鉴权。默认是 false。

## 怎么切换到别的同类 HF Space

如果新的 HF Space 仍然是同类 Gradio 翻译接口，通常你只需要修改环境变量，不需要改代码。

常见需要改的是：

1. HF_SPACE_BASE_URL
2. GRADIO_SUBMIT_PATH
3. GRADIO_RESULT_PATH_TEMPLATE
4. HF_MODEL_LIST
5. HF_TARGET_LANG_LIST
6. HF_SOURCE_TEXT_PARAM
7. HF_TARGET_LANG_PARAM
8. HF_MODEL_PARAM

也就是说，很多情况下你只是在换配置，不是在重写项目。

## Hy-MT2 当前的请求约定

这个模板默认演示的是 Hy-MT2，对应调用方式如下：

1. messages 里最后一个 user 内容作为待翻译文本
2. extra_body.target_lang 作为目标语言
3. model 作为模型名

请求示例：

{
  "model": "tencent/Hy-MT2-1.8B",
  "messages": [
    {"role": "user", "content": "你好，今天怎么样？"}
  ],
  "extra_body": {
    "target_lang": "English"
  }
}

## 什么时候需要新建 adapter

如果目标 HF Space 和当前这种通用 Gradio 翻译接口差异很大，才需要新建 adapter。

例如：

1. 参数结构完全不同
2. 返回格式完全不同
3. 不是 SSE / event_id 这种结果获取方式
4. 不是翻译任务，而是别的任务类型

如果只是字段名不同，优先改环境变量就够了。
