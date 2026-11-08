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

# 4. Homebrew tools: ffmpeg + ffprobe (earshot, video) and node (real-sound's mux step).
#    Installing Homebrew itself needs your Mac password, so this only installs if brew exists.
if [ -x /opt/homebrew/bin/brew ]; then
  /opt/homebrew/bin/brew list ffmpeg >/dev/null 2>&1 || /opt/homebrew/bin/brew install ffmpeg
  /opt/homebrew/bin/brew list node >/dev/null 2>&1 || /opt/homebrew/bin/brew install node
  for t in brew ffmpeg ffprobe node npm npx; do ln -sf "/opt/homebrew/bin/$t" "$HOME/.local/bin/$t"; done
else
  echo "Missing Homebrew: install it from https://brew.sh (needs your password), then rerun ./setup.sh"
fi

# 5. earshot: lets agents hear, judge and make sound, plus 252 sound effects
EARSHOT="$HOME/.local/share/earshot"
if [ -d "$EARSHOT/.git" ]; then
  git -C "$EARSHOT" pull -q --ff-only || echo "Note: could not update earshot; using the installed version"
else
  git clone -q https://github.com/Leonxlnx/earshot.git "$EARSHOT"
fi
[ -x "$EARSHOT/.venv/bin/python" ] || uv venv -q --python 3.12 "$EARSHOT/.venv"
uv pip install -q --python "$EARSHOT/.venv/bin/python" torch
uv pip install -q --python "$EARSHOT/.venv/bin/python" -e "$EARSHOT[mcp,llm,dev]"
ln -sf "$EARSHOT/.venv/bin/earshot" "$HOME/.local/bin/earshot"
(cd "$EARSHOT" && .venv/bin/earshot doctor --fetch >/dev/null)  # listening models, ~1.1 GB, first run only
[ -f "$HOME/Music/SFX/earshot/INDEX.md" ] ||
  "$EARSHOT/.venv/bin/python" "$REPO/scripts/render-sfx-library.py" "$HOME/Music/SFX/earshot" >/dev/null

# 6. VoiceStudio: local voiceovers, voice cloning and dubbing (the voicestudio skill talks to it).
#    Its voice models download inside the app after you accept their licenses (see the voicestudio skill).
if [ -x /opt/homebrew/bin/brew ] && [ ! -d /Applications/VoiceStudio.app ]; then
  /opt/homebrew/bin/brew tap debpalash/tap
  /opt/homebrew/bin/brew trust --cask debpalash/tap/voicestudio
  /opt/homebrew/bin/brew install --cask debpalash/tap/voicestudio
fi

# 7. sound-effects: Python 3.12 with librosa for its sound pass, plus its 109 CC0 sounds.
#    The sounds are media, so git ignores them; fetch them from the skill's source at the commit we copied.
SFX_VENV="$HOME/.local/share/sound-effects/.venv"
[ -x "$SFX_VENV/bin/python" ] || uv venv -q --python 3.12 "$SFX_VENV"
uv pip install -q --python "$SFX_VENV/bin/python" librosa soundfile numpy scipy matplotlib
SFX_SKILL="$REPO/.agents/skills/sound-effects"
SFX_COMMIT=3d83d987d658601d8a1269eb691622bdcd427335  # Barty-Bart/motion-graphics, 13 Oct 2026
if [ ! -f "$SFX_SKILL/sfx/kit/whoosh.ogg" ]; then
  tmp="$(mktemp -d)"
  curl -fsSL "https://github.com/Barty-Bart/motion-graphics/archive/$SFX_COMMIT.tar.gz" |
    tar -xz -C "$tmp" --strip-components=3 "motion-graphics-$SFX_COMMIT/skills/sound-effects/sfx"
  rsync -a --include='*/' --include='*.ogg' --exclude='*' "$tmp/sfx/" "$SFX_SKILL/sfx/"
  rm -rf "$tmp"
fi

# 8. onetake: Python 3.12 with Playwright's Chromium (renders the HTML films), its analysis tools,
#    and faster-whisper for word-level narration timing (its speech model downloads on first use, ~480 MB).
#    av<16: faster-whisper 1.2.1 passes an argument to av.open that PyAV 19 no longer accepts.
OT_VENV="$HOME/.local/share/onetake/.venv"
[ -x "$OT_VENV/bin/python" ] || uv venv -q --python 3.12 "$OT_VENV"
uv pip install -q --python "$OT_VENV/bin/python" playwright numpy scipy Pillow matplotlib fonttools brotli opencv-python \
  faster-whisper "av<16" soundfile
"$OT_VENV/bin/python" -m playwright install chromium >/dev/null

# 9. real-sfx: sound design from real recordings in your own sound libraries.
#    ffmpeg-full (plain ffmpeg has no drawtext, which its frame sheets need; keg-only, so it sits beside ffmpeg),
#    its UI sounds (uisfx 0.4.0, CC0: media, so git ignores them), its own venv with the small YAMNet listening model
#    (~45 MB), and the sound-effects skill's 109 CC0 recordings as its first library.
#    Add your own library: .agents/skills/real-sfx/vendor/venv/bin/python .agents/skills/real-sfx/scripts/setup.py add-library NAME PATH --index
RSFX="$REPO/.agents/skills/real-sfx"
if [ -x /opt/homebrew/bin/brew ]; then
  /opt/homebrew/bin/brew list ffmpeg-full >/dev/null 2>&1 || /opt/homebrew/bin/brew install ffmpeg-full
fi
[ -f "$RSFX/vendor/node_modules/uisfx/sounds/studio/achievement.mp3" ] ||
  npm install uisfx@0.4.0 --prefix "$RSFX/vendor" --no-save --no-audit --no-fund >/dev/null
[ -x "$RSFX/vendor/venv/bin/python" ] || uv venv -q --seed --python 3.12 "$RSFX/vendor/venv"
"$RSFX/vendor/venv/bin/python" "$RSFX/scripts/listen.py" install --yes >/dev/null
[ -f "$RSFX/config.json" ] || cp "$RSFX/config.example.json" "$RSFX/config.json"
RSFX_INDEX=$([ -f "$RSFX/library_index.json" ] || echo --index)
PATH="/opt/homebrew/opt/ffmpeg-full/bin:$PATH" "$RSFX/vendor/venv/bin/python" "$RSFX/scripts/setup.py" \
  add-library sound_effects "$SFX_SKILL/sfx" --tier main $RSFX_INDEX >/dev/null

# 10. sfx-cloud: the sound library in your private Cloudflare R2 bucket (rclone + the `sfx-cloud` command).
#     The R2 token is yours to enter, once per Mac: ./scripts/r2-connect.sh
if [ -x /opt/homebrew/bin/brew ]; then
  /opt/homebrew/bin/brew list rclone >/dev/null 2>&1 || /opt/homebrew/bin/brew install rclone
  ln -sf /opt/homebrew/bin/rclone "$HOME/.local/bin/rclone"
fi
cat > "$HOME/.local/bin/sfx-cloud" <<EOF
#!/bin/bash
exec "$RSFX/vendor/venv/bin/python" "$REPO/.agents/skills/sfx-cloud/scripts/sfx_cloud.py" "\$@"
EOF
chmod +x "$HOME/.local/bin/sfx-cloud"
if rclone listremotes 2>/dev/null | grep -qx 'sfx-r2:'; then
  sfx-cloud mount >/dev/null && { sfx-cloud link-real-sfx >/dev/null 2>&1 || true; }
else
  echo "sfx-cloud: not connected to R2 yet. Run ./scripts/r2-connect.sh"
fi

# 11. HyperFrames: write HTML, render it to MP4 (heygen-com/hyperframes, Apache-2.0).
#     The CLI version matches the four skills copied into .agents/skills (hyperframes, hyperframes-cli,
#     hyperframes-registry, media-use, from tag v$HF_VERSION). To update, change HF_VERSION, re-copy those four
#     folders from the new tag (keep hyperframes/SKILL.md's "On this Mac" note and hyperframes/LICENSE), and rerun.
#     HYPERFRAMES_SKIP_SKILLS=1 stops the CLI installing its own skill copies.
#     Also fetches the Chrome Headless Shell it renders with (~150 MB, in ~/.cache/hyperframes).
HF_VERSION=0.9.19
export HYPERFRAMES_SKIP_SKILLS=1
if [ -x /opt/homebrew/bin/npm ]; then
  [ "$(/opt/homebrew/bin/hyperframes --version 2>/dev/null)" = "$HF_VERSION" ] ||
    /opt/homebrew/bin/npm install -g --no-audit --no-fund "hyperframes@$HF_VERSION" >/dev/null
  ln -sf /opt/homebrew/bin/hyperframes "$HOME/.local/bin/hyperframes"
  HYPERFRAMES_NO_TELEMETRY=1 hyperframes telemetry disable >/dev/null  # usage telemetry off (stored in ~/.hyperframes)
  hyperframes browser ensure >/dev/null
  # media-use's 19 bundled sounds are media, so git ignores them; the npm package ships the same files
  MU_SFX="$REPO/.agents/skills/media-use/audio/assets/sfx"
  [ -f "$MU_SFX/whoosh.mp3" ] ||
    cp /opt/homebrew/lib/node_modules/hyperframes/dist/skills/media-use/audio/assets/sfx/*.mp3 "$MU_SFX/"
fi

# 12. text-behind: title text behind the person. Its person matte comes from Apple's Vision framework (built into
#     macOS, runs on the Neural Engine, nothing downloaded); this compiles the small Swift tool that calls it.
#     The compositor runs with onetake's Python (step 8: numpy + Pillow).
if command -v swiftc >/dev/null; then
  mkdir -p "$HOME/.local/share/text-behind"
  swiftc -O "$REPO/.agents/skills/text-behind/scripts/personmask.swift" -o "$HOME/.local/share/text-behind/personmask"
fi

# 13. Make this repo's other skills work in any folder on this Mac
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
