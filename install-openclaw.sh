#!/usr/bin/env bash
set -e
REPO_DIR="${1:-$HOME/.d365-enterprise-skills}"
SKILL_TARGET="$HOME/.openclaw/skills/d365-enterprise"
AGENT_TARGET="$HOME/.openclaw/agents"

[ -d "$REPO_DIR" ] || git clone https://github.com/williamzhou1216/d365-enterprise-skills.git "$REPO_DIR"
git -C "$REPO_DIR" pull || true

"$REPO_DIR/scripts/build_flat_skills.sh"

mkdir -p "$SKILL_TARGET" "$AGENT_TARGET"
rm -rf "$SKILL_TARGET"/*

cp -R "$REPO_DIR"/openclaw-skills/* "$SKILL_TARGET"/
cp "$REPO_DIR/agents/d365-master-agent.json" "$AGENT_TARGET"/

echo "Installed for OpenClaw"
