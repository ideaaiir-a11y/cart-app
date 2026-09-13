#!/bin/sh
set -e

# ─────────────────────────────────────────────────────────────
# Entrypoint — generates .z-ai-config from env vars,
# initializes the Prisma SQLite schema, then starts the
# Next.js standalone server.
# ─────────────────────────────────────────────────────────────

# 1) Generate .z-ai-config if ZAI_API_KEY is set
if [ -n "$ZAI_API_KEY" ]; then
  ZAI_BASE_URL="${ZAI_BASE_URL:-https://api.z.ai/v1}"
  cat > .z-ai-config << EOF
{
  "baseUrl": "${ZAI_BASE_URL}",
  "apiKey": "${ZAI_API_KEY}"
}
EOF
  echo "✓ z-ai config written"
fi

# 2) Initialize the SQLite database schema (idempotent)
echo "→ Running prisma db push..."
bunx prisma db push --accept-data-loss

# 3) Hand off to the Next.js standalone server
echo "→ Starting Next.js server..."
exec bun server.js
