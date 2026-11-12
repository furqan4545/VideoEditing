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
| `hyperframes` | Edit and make videos as HTML rendered to MP4 with [HyperFrames](https://github.com/heygen-com/hyperframes) (HeyGen, Apache-2.0): launch films, explainers, captions, overlays, charts, title cards, edits on your own footage. Four skills from tag v0.9.19: `hyperframes` (read first), `hyperframes-cli`, `hyperframes-registry` (about 450 ready-made blocks), `media-use` (music, SFX, voice, grades). CLI: `npx hyperframes`. Usage telemetry is turned off by `setup.sh`. |
| `sfx-cloud` | The main sound library, in a private Cloudflare R2 bucket (`sfx-r2:soundeffects`): Sonniss GDC 2024 + 2026 (real recordings) plus the earshot, CC0 and uisfx sets and `ali-own` (the user's own effects from `MY VIDEO EDITING STUFF/Ali_BG_MUSIC`: cinematic booms, whooshes, click, heartbeat, plus an IShowSpeed meme pack), every sound described (catalog + sidecar JSON). Use it while editing: `sfx-cloud search WORDS` prints a ready path per hit (mounts `~/Music/SFX/cloud` read-only, sounds download on first use, 10 GB cache), `sfx-cloud path ID`; `real-sfx` picks from it; add new packs with `sfx-cloud ingest`. |
| `reel-edit` | Ali's reel style, from phone takes to the Instagram description: hook on camera, takes cut tight (no gap over 0.5 s), always-on subtle zoom, whips, punch-ins, tool panels and hand zoom-throughs hiding every take change, serif word-lit captions, STOP/START cards, demo voices made in the tool, music cut to the words, one-level real SFX, -14 LUFS. Reel 4 is the template; reel 3 (with the cartoon) is an example. Scripts: `new_reel.sh`, `check_pieces.sh`, `verify.py` in `.agents/skills/reel-edit/scripts/` |
| `text-behind` | Big title text behind the speaker for ~2 s (editorial look: tall condensed serif, red/white, background dimmed). The person matte comes from Apple's Vision framework (built into macOS, no model download). Works on a finished video or an onetake take's frame folder. Script: `.agents/skills/text-behind/scripts/textbehind.py` |
| `paper3d` | 3D explainer films on white paper in one continuous take (how-it-works reels, "like reel 15"): a three.js world rendered with onetake's motion blur, a camera that dives from the whole scene into the device and back, a library of ready 3D models (full-body person, shop gates, security tag, field lines, bag, checkout, jeans, washing machine and more), Ali's Apple-style captions, a thumbnail scene and reel 15 as the worked example. Rules inside: people full body, object whole first then zoom in, short close-ups, voice on top. Script: `.agents/skills/paper3d/scripts/new_film.sh` |
| `html-canvas-animation` | The "html canvas animation skill": Ali's clean 2D white-paper cinematic movie (reel 16 loading bar, reel 17 Instagram likes). One HTML canvas, every frame a function of time, one camera that whips, dives and pulls out over a paper desk, premium black-and-white components with soft shadows, hidden joins instead of cuts, his footage as a photo card, reel 13 captions, 0.2 s after every sentence, rendered by onetake with motion blur. Start: `.agents/skills/html-canvas-animation/scripts/new_film.sh downloads/reelN/full`. Reel 17 is the worked example. Needs `onetake`. |

## Sound effects library

The big library (Sonniss GDC bundles, real recordings) is in Cloudflare R2, not on this Mac: use the `sfx-cloud`
skill (`sfx-cloud search ...`, `sfx-cloud mount`). Sonniss licence: media production only, no redistribution, no AI
training, so the bucket stays private. The R2 token is entered once per Mac by the user: `./scripts/r2-connect.sh`.

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
- Every video gets subtle camera motion: a slow zoom in and out (about 1.00 to 1.045, turning at each beat, a little
  further on the punchline) on the picture, so the frame is always changing. Captions and titles stay still, and
  the zoom never goes below 1.0, so no edge shows.
