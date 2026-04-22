#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 \"your prompt\"" >&2
  exit 1
fi

if [ -z "${AZURE_OPENAI_API_KEY:-}" ]; then
  echo "AZURE_OPENAI_API_KEY is not set" >&2
  exit 1
fi

BASE_URL="${AZURE_OPENAI_BASE_URL:-https://vyungai20260318.openai.azure.com/openai/v1}"
MODEL="${AZURE_OPENAI_DEPLOYMENT:-gpt-5.4}"
API_VERSION_HEADER="${AZURE_OPENAI_API_VERSION_HEADER:-2025-01-01-preview}"
MAX_COMPLETION_TOKENS="${AZURE_OPENAI_MAX_COMPLETION_TOKENS:-512}"
PROMPT="$1"

curl -sS \
  -H "api-key: $AZURE_OPENAI_API_KEY" \
  -H "api_version: $API_VERSION_HEADER" \
  -H "Content-Type: application/json" \
  "$BASE_URL/chat/completions" \
  -d "$(jq -n \
    --arg model "$MODEL" \
    --arg content "$PROMPT" \
    --argjson max_completion_tokens "$MAX_COMPLETION_TOKENS" \
    '{model: $model, messages: [{role: "user", content: $content}], max_completion_tokens: $max_completion_tokens}')" \
  | jq -r '.choices[0].message.content // .error.message // "No content returned"'
