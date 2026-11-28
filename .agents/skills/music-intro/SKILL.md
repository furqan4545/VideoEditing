---
name: music-intro
description: Start the background music of a video naturally instead of fading it in. Builds a ~1 s lead-in that swells into the song's first full beat, landing exactly on a time you choose in the video - the reversed end cut (the song's own ending played backwards), the stem cut (one instrument of the song alone, then the full song; stems split by demucs), riser + whoosh (a riser, a deep whoosh and a mid whoosh from the user's sfx-cloud library, all peaking on the beat), a filter open (song muffled, then open) and the plain fade for comparison. Finds the song's drop by itself, snaps to the beat, renders every style plus an A/B compare file, and can mix the result under a video's voice with ducking. Use whenever background music starts in an edit, or when Ali says "start the music naturally", "music intro", "reverse end cut", "stem cut", "riser and whoosh into the music", "elevate the music start", "like the iam_ar_un reel".
---

# music-intro: start the music, don't fade it in

From @iam_ar_un's reel "How to start a music" (Instagram `DdML99Ds5Kr`, watched 28 Nov 2026, saved in
`downloads/Instagram-DdML99Ds5Kr/`). In that reel the voice stops, then about 1 s of lead-in swells straight into the
song's first full beat. The music never comes up from silence on a volume ramp (his "not like this").

| Style | What you hear | How it is made |
|---|---|---|
| `reverse` | the song "sucks in", then the beat lands | the song's last ~1.2 s (its final hit and decay) reversed, so the decay becomes a swell; set 2 dB under the beat. `--reverse-source hit` reverses the first beat instead |
| `stem` | one instrument plays alone, then the band comes in | demucs `htdemucs` splits only the few seconds around the hit; the `other` stem (melody, falls back to drums → bass) from the `--lead` seconds before the hit, lifted to 5 dB under the beat, then the full mix |
| `riser` | a whoosh builds and hits with the beat | a kit from `kits.json`: reversed real whoosh as the riser (stops dead on its peak), deep whoosh and mid whoosh, all peaking on the hit, levels set against the music |
| `filter` | the song muffled (as if through a wall), opening up on the beat | low-pass from 300 Hz to 2.5 kHz over the lead-in, 6 dB under the beat. Needs no model |
| `plain` | the old volume fade-in | only to compare against |

## Run

```bash
music-intro SONG.mp3 --out downloads/reelN/music-intro                       # every style + compare.wav
music-intro SONG.mp3 --style riser --kit 2 --hit 3.4 --out DIR                 # music lands at 3.4 s in the video
music-intro SONG.mp3 --style stem --at 38.8 --video downloads/reelN/cut.mp4 --hit 3.4 --music-db -14 --out DIR
```

(`music-intro` = `~/.local/share/sound-effects/.venv/bin/python .agents/skills/music-intro/scripts/music_intro.py`,
installed by `setup.sh`.)

| Option | Meaning |
|---|---|
| `--style` | `reverse`, `stem`, `riser`, `filter`, `plain`, a comma list, or `all` (default) |
| `--at` | seconds **in the song** where the full music hits. Default `auto` = the first big drop (biggest jump in 2 s loudness in the first 75 s, the song's own start from silence excluded), then snapped to the strongest onset nearby. Always read `song_hit_s` in the report, and pass `--at` when Ali names a part of the song ("from the drop at 0:38") |
| `--hit` | seconds **in the video** where the full music lands: the first beat after the hook line, a cut or a reveal. Default: right after the lead-in |
| `--lead` | lead-in length, default 1.2 s (the reel uses ~1 s). Use 0.8 for fast reels and 2 for slow films |
| `--stem` | force `other` / `drums` / `bass` / `vocals` for the stem cut |
| `--kit` | riser kit: `1` cinematic (Sonniss real recordings), `2` ali-own (his epic whoosh + deep sub boom), `3` airy. **Rotate** between videos so starts don't repeat. `--riser/--deep/--mid FILE` overrides one layer (use `sfx-cloud search` for paths) |
| `--video` | also mixes the bed under this video's audio: `<out>/<video>_<style>.mp4`, picture copied, music ducked under the voice (`--no-duck` to turn off), bed gain `--music-db` (default -12) |
| `--length` | seconds of music after the hit (default: to the end of `--video`, else 20) |

Output folder: `intro_<style>.wav` (a full bed: silent until the lead-in, the music hits on `--hit`, faded out at the
video's end), `compare.wav` (every style one after another, 0.5 s before the lead-in to 3 s after the hit, 1 s gaps,
in the order listed in `music_intro.json` → `compare.order`), `music_intro.json` (song hit, lead-in source, stem
and gain, kit files, timings).

## How to use it in an edit

1. Pick the moment in the video: the line before the music should END just before `--hit - lead`. Silence or a
   breath under the lead-in is what makes it work (in the reel, the voice stops, then the swell plays, then the beat).
2. Pick the song's entry with `--at` (or let auto find the drop) and run `--style all` first.
3. **You cannot hear.** Check with earshot before choosing: `earshot sheet` on `compare.wav` with the hit times as
   cues (all five should be green, within 40 ms), `earshot timeline` on the chosen bed. Then give Ali the
   `compare.wav` timestamps to listen to and let him pick. Never call a style "good" by ear.
4. Use the chosen `intro_<style>.wav` as the music bed in the edit (HyperFrames `<audio>`, the mix script, or the
   `--video` MP4). Keep the house rules: music level from the reel's own rules (memory: music low under the voice
   for explainers, full power for reels that call for it), one level for all SFX, `-14 LUFS` master.
5. When a reel has more than one music start (after a pause or a beat switch), use a **different** style or kit
   for each one.

## Notes and limits

- The stem cut runs demucs (`htdemucs`, CPU, ~10-30 s) through `uv run` with torch 2.5.1 on the first use for a
  song window; the stems are cached in `~/Library/Caches/music-intro/`. It is a real ML model: per house rules,
  never run it next to another heavy model.
- `reverse` with `--reverse-source end` needs a song that ends on a hit or a decay. If the song fades out slowly,
  `--reverse-source hit` usually swells better.
- Auto `--at` finds the loudest *jump*, not always the best musical moment. When the song's entry matters, Ali's
  time wins. For songs that loop (New Computers), his time ranges are song time.
- The riser kits pick from `sfx-cloud` (mounted on first use). Kits are plain JSON: add a kit by copying one and
  changing the IDs. `db` is the layer's level vs the music; `reverse` + `trim_to_peak` turn a whoosh into a riser.
- Tested 28 Nov 2026 on Runaway (instrumental, drop found at 38.77 s) and Not Like Us (instrumental, 7.17 s). In
  earshot, all five styles land within 40 ms of the hit. Test output is in `downloads/music-intro-test/`.
