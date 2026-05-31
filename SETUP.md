# npm

This project currently installs with npm. If you prefer pnpm later, you can switch easily.

# Wrangler auth

Before deploy, run:

npx wrangler login

or if you already use an API token:

export CLOUDFLARE_API_TOKEN=your_token

# Worker API key auth

Set the upstream client auth key used by your callers:

npx wrangler secret put WORKER_API_KEY

Call the API like this:

Authorization: Bearer your_worker_api_key

If you want to temporarily disable auth during local debugging only, set:

DISABLE_API_KEY_AUTH = "true"

# Optional secret for private/gated Spaces

npx wrangler secret put HF_BEARER_TOKEN
