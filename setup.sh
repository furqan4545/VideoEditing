#!/bin/bash
# Run once on any Mac after cloning this repo.
# Installs the tools behind this repo's skills and registers the skills
# with Claude Code, Codex and other AI tools on this computer.
set -euo pipefail

REPO="$(cd "$(dirname "$0")" && pwd)"
export PATH="$HOME/.local/bin:$PATH"
export AGENT_REACH_LANG=en

# 1. uv: installs command-line tools, no admin password needed
command -v uv >/dev/null || curl -LsSf https://astral.sh/uv/install.sh | sh

# 2. Agent Reach (search/read YouTube, GitHub, web and more)
#    Never install the PyPI package called agent-reach: it is a different project.
command -v agent-reach >/dev/null ||
  uv tool install https://github.com/Panniantong/Agent-Reach/releases/latest/download/agent-reach.zip
agent-reach setup >/dev/null ||
  echo "Note: some Agent Reach channels failed. Run: agent-reach doctor --text"
# Keep this repo's copy of the skill refreshed by future `agent-reach update` runs
agent-reach skill link "$REPO/.agents/skills" >/dev/null

# 3. video-watch: pre-install its tools (yt-dlp and ffmpeg)
uv run --script "$REPO/.agents/skills/video-watch/scripts/watch.py" --check >/dev/null

# 4. Make this repo's other skills work in any folder on this Mac
#    (~/.agents/skills is read by Codex and others, ~/.claude/skills by Claude Code)
for skill in "$REPO"/.agents/skills/*/; do
  name="$(basename "$skill")"
  [ "$name" = agent-reach ] && continue  # Agent Reach links itself
  for dir in "$HOME/.agents/skills" "$HOME/.claude/skills"; do
    mkdir -p "$dir"
    if [ -e "$dir/$name" ] && [ ! -L "$dir/$name" ]; then
      echo "Skipped $dir/$name: a different skill is already there"
      continue
    fi
    ln -sfn "${skill%/}" "$dir/$name"
  done
done

echo "Done. Skills in $REPO/.agents/skills are ready for Claude Code and Codex."
