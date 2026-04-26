#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
MCP_DIR="$REPO_ROOT/mcp-servers/d365-mcp"

echo "Installing d365-mcp dependencies..."
cd "$MCP_DIR"
npm install
npm run build

cd "$REPO_ROOT"

if [ ! -f "$REPO_ROOT/.env.local" ]; then
  cp "$REPO_ROOT/.env.example" "$REPO_ROOT/.env.local"
  echo "Created .env.local from .env.example"
fi

if [ ! -f "$REPO_ROOT/config/d365-connections.json" ]; then
  cp "$REPO_ROOT/config/d365-connections.example.json" "$REPO_ROOT/config/d365-connections.json"
  echo "Created config/d365-connections.json from example"
fi

if [ ! -f "$REPO_ROOT/.opencode/opencode.jsonc" ]; then
  cp "$REPO_ROOT/.opencode/opencode.example.jsonc" "$REPO_ROOT/.opencode/opencode.jsonc"
  echo "Created .opencode/opencode.jsonc from example"
fi

echo ""
echo "Next steps:"
echo "1. Fill in secrets in .env.local"
echo "2. Review profile mappings in config/d365-connections.json"
echo "3. Start OpenCode after setting D365_PROFILE"
echo "4. Test the current profile with: cd mcp-servers/d365-mcp && npm run test:connection"
