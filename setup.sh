#!/usr/bin/env bash
set -e

echo "== D365 Skills Setup Starting =="

# 1. 创建目录
mkdir -p .opencode scripts opencode-skills openclaw-skills

# 2. build_flat_skills.sh
cat > scripts/build_flat_skills.sh <<'EOT'
#!/usr/bin/env bash
set -e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$ROOT_DIR/skills"
OPENCODE_DIR="$ROOT_DIR/opencode-skills"
OPENCLAW_DIR="$ROOT_DIR/openclaw-skills"

rm -rf "$OPENCODE_DIR" "$OPENCLAW_DIR"
mkdir -p "$OPENCODE_DIR" "$OPENCLAW_DIR"

find "$SRC_DIR" -type f -name "SKILL.md" | while read skill_file; do
  skill_dir="$(dirname "$skill_file")"
  skill_name="$(basename "$skill_dir")"

  mkdir -p "$OPENCODE_DIR/$skill_name"
  mkdir -p "$OPENCLAW_DIR/$skill_name"

  cp "$skill_file" "$OPENCODE_DIR/$skill_name/SKILL.md"
  cp "$skill_file" "$OPENCLAW_DIR/$skill_name/SKILL.md"
done

echo "Flat skills generated."
EOT

chmod +x scripts/build_flat_skills.sh

# 3. install-opencode.sh
cat > install-opencode.sh <<'EOT'
#!/usr/bin/env bash
set -e
REPO_DIR="${1:-$HOME/.d365-enterprise-skills}"
TARGET_DIR="$HOME/.config/opencode/skills"

[ -d "$REPO_DIR" ] || git clone https://github.com/williamzhou1216/d365-enterprise-skills.git "$REPO_DIR"
git -C "$REPO_DIR" pull || true

"$REPO_DIR/scripts/build_flat_skills.sh"

mkdir -p "$TARGET_DIR"
rm -f "$TARGET_DIR"/* 2>/dev/null || true

for d in "$REPO_DIR"/opencode-skills/*; do
  [ -d "$d" ] && ln -sfn "$d" "$TARGET_DIR/$(basename "$d")"
done

echo "Installed for OpenCode"
EOT

chmod +x install-opencode.sh

# 4. install-openclaw.sh
cat > install-openclaw.sh <<'EOT'
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
EOT

chmod +x install-openclaw.sh

# 5. INSTALL.md
cat > .opencode/INSTALL.md <<'EOT'
# Install

## OpenCode
./install-opencode.sh

## OpenClaw
./install-openclaw.sh
EOT

# 6. README 补丁
if ! grep -q "## Installation" README.md; then
cat >> README.md <<'EOT'

## Installation

### OpenCode
./install-opencode.sh

### OpenClaw
./install-openclaw.sh

### Rebuild skills
./scripts/build_flat_skills.sh
EOT
fi

# 7. build
./scripts/build_flat_skills.sh

# 8. git commit
git add .
git commit -m "Add setup.sh: OpenCode/OpenClaw install + flat skills build" || true
git push origin main

echo "== DONE =="
EOT

chmod +x setup.sh
