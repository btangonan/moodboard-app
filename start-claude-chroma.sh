#!/usr/bin/env bash
set -euo pipefail

# Check if config exists
if [[ ! -f ".mcp.json" ]]; then
    echo "❌ No MCP config found in this directory"
    echo "Run the ChromaDB setup script first"
    exit 1
fi

# Validate JSON
if ! jq -e . .mcp.json >/dev/null 2>&1; then
    echo "❌ Invalid .mcp.json configuration"
    echo "Run: jq . .mcp.json to see the error"
    exit 1
fi

# Optional: bump registry usage if helper exists
if [[ -x "bin/registry.sh" ]]; then
  bin/registry.sh bump "$PWD" || true
fi
echo "🚀 Starting Claude with ChromaDB..."
exec claude "$@"