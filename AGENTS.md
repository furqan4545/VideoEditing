# VideoEditing

Workspace for finding, downloading, watching and editing videos with AI agents
(Claude Code, Codex and any other harness that reads `AGENTS.md`).

## Skills

Every skill lives in `.agents/skills/<skill-name>/SKILL.md`.
`.claude/skills` is a link to that same folder, so Claude Code and Codex share one copy.

| Skill | What it does |
|---|---|
| `agent-reach` | Search and read YouTube (video info, subtitles, transcripts), GitHub, web pages and more. Command: `agent-reach` |
| `video-watch` | Download a video (any yt-dlp site) or take a local file, then grab frames + timestamped subtitles so you can watch it. Script: `.agents/skills/video-watch/scripts/watch.py` |

## Adding a skill

1. Put it in `.agents/skills/<name>/`, never directly in `.claude/skills`.
2. If it needs a tool installed, add that install step to `setup.sh`.
3. Add a row to the table above.
4. Run `./setup.sh` so the skill also works outside this folder.

## Rules

- Downloaded videos and audio go in `downloads/`, which git ignores. Never commit media files.
- Update Agent Reach with `AGENT_REACH_LANG=en agent-reach update` so its skill stays in English.
