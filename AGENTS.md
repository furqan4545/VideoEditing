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
| `earshot` | Hear sound you can't: describe, match, find moments, check sync to picture, critique a film's audio, make sound effects. Command: `earshot` |
| `real-sound` | Full soundtrack process for a video from real licensed recordings: cue list, sourcing, mix, QA, mastering, credits, mux. Uses earshot. |
| `voicestudio` | Local voiceovers with emotion (VoxCPM2), voice cloning and design, transcription and dubbing in 600+ languages (OmniVoice). Talks to the VoiceStudio app at `localhost:3900` (REST or MCP). Personal use only. |
| `sound-effects` | Quick measured sound pass for a motion-graphics video: cue list, beat grid checked against the kicks, one real CC0 sound per cue from a bundled 110-sound kit, mix to -16 LUFS, swap report and credits. From [Barty-Bart/motion-graphics](https://github.com/Barty-Bart/motion-graphics). Script: `.agents/skills/sound-effects/scripts/sound_pass.py` |
| `real-sfx` | Sound design with real recordings from your own sound libraries: finds the moments (cue list, synth script, HyperFrames timeline, screen recording or the picture), places each sound on the frame at the original level, swaps out synthesized sound instead of doubling it, keeps music and voice, returns MP4 + SFX track + critique. Libraries: `sound-effects`' CC0 recordings + uisfx; add your own with `scripts/setup.py add-library`. By Clipwing. |
| `onetake` | Short product launch films, teasers and feature demos (10–60 s) as one continuous take: one HTML composition on a library of measured moves, rendered with real motion blur (1080p30 drafts, 4K60 finals) and checked by an oracle that fails a slideshow. From [feitangyuan/onetake](https://github.com/feitangyuan/onetake). **Noncommercial use only** (PolyForm Noncommercial). |

## Sound effects library

All 252 earshot sound effects (whooshes, hits, risers, pops, clicks, drips, bells, keys and more) are rendered as WAVs
in `~/Music/SFX/earshot/<category>/<member>.wav`, listed in `~/Music/SFX/earshot/INDEX.md`. It lives outside this repo
on purpose (media never goes in git). New takes with a set length, peak time or pitch: `earshot sfx render ID -o x.wav`.

## Adding a skill

1. Put it in `.agents/skills/<name>/`, never directly in `.claude/skills`.
2. If it needs a tool installed, add that install step to `setup.sh`.
3. Add a row to the table above.
4. Run `./setup.sh` so the skill also works outside this folder.

## Rules

- Downloaded videos and audio go in `downloads/`, which git ignores. Never commit media files.
- Update Agent Reach with `AGENT_REACH_LANG=en agent-reach update` so its skill stays in English.
