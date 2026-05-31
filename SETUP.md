# npm

This project currently installs with npm. If you prefer pnpm later, you can switch easily.

# Wrangler auth

Before deploy, run:

npx wrangler login

or if you already use an API token:

export CLOUDFLARE_API_TOKEN=your_token

# Optional secret for private/gated Spaces

npx wrangler secret put HF_BEARER_TOKEN
