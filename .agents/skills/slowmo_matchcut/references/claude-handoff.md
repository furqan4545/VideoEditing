# Handoff for Claude

Ali wants to revise the direction of the current 27-second edit. Watch the latest export alongside the reference before changing the shot list. Treat the current picture edit as a draft. The music passage and high-note cue are already in place.

## Reference and music

Match Cut V2 uses the sped-up “Wasted” audio from the linked upload. Its picture repeats a 10.067-second sequence. A moving portrait flashes into a held pose at 2.50 seconds, silhouettes flicker at 3.57, a violet portrait enters at 4.13, a gesture slows and releases from 5.10, and a cyan close-up settles at 7.57. The separate `match-cut` skill is the earlier shutter-loop edit. [Watch the V2 reference](https://www.youtube.com/watch?v=mPcD-wWNBLk)

The 27-second version uses the continuous passage from **0:43 to 1:10** at original playback speed. The first five seconds lead into the requested **0:48–1:10** high-note section. The white flash peaks at output **0:05.000**. The short version uses reference audio from 0:10.067–0:20.133.

## What Ali wants fixed

- Use both videos and photos, sourced exclusively from `~/Desktop/MY VIDEO EDITING STUFF/Ali_Insta` and its subfolders. Earlier drafts used unrelated wide street views and anonymous detail shots. Ali rejected those choices.
- Show the set and the person once, then hard-cut straight to a closer crop of **the same person, scene and take**, continuing the action. For a photograph, use the same image for the wide and close crops. Change scale at the cut and keep scale steady within the shot.
- Keep the remaining portraits close. Place the eyes in the same part of the frame and choose compatible gaze directions. The last pass targeted the eye midpoint at 50% across and 40% down. Scrub both sides of each join to judge where the person is looking, their expression and whether the action carries across.
- Choose deliberate, flattering moments. A previous edit held on a nose wipe in the café projector clip `IMG_3158.MOV`, source 9.13–11.29 seconds. Exclude that interval and other grooming gestures. The separate cyan portrait from 12.07 seconds was accepted.

## Current state on Ali’s Mac

Paths below are relative to the VideoEditing repository. The footage, reference, shot plans and exports live locally. A fresh clone needs access to those files to reproduce this exact edit.

| Artifact | Path |
|---|---|
| Latest 27-second export | `downloads/slowmo-matchcut/slowmo-matchcut-eye-match.mp4` |
| Its editable shot plan | `downloads/slowmo-matchcut/shots-high-notes.json` |
| Short export and plan | `downloads/slowmo-matchcut/slowmo-matchcut.mp4` and `downloads/slowmo-matchcut/shots.json` |
| Downloaded audiovisual reference | `downloads/slowmo-matchcut/reference/Youtube-mPcD-wWNBLk/video.mp4` |

The long draft has 17 shots from five videos and seven photos. It opens at the store counter in `IMG_2482.MOV`, then punches into that take at output 0:01.23. Audio alignment, source-folder membership and eye midpoint placement were checked. Shot selection and gaze continuity still need editorial review.

The renderer consumes an authored JSON shot list. The agent selects takes, source intervals and framing. On the timed plan, `at` is an absolute time in the reference soundtrack. `start` and `span` describe the interval inside the chosen visual source. The Swift helper measures eye positions. Evaluate gaze direction and performance by watching the frames.

Run this from the repository root to reproduce the long cut in a separate review file.

```sh
project=downloads/slowmo-matchcut
~/.claude/skills/slowmo_matchcut/scripts/slowmo-matchcut \
  --plan "$project/shots-high-notes.json" \
  --reference "$project/reference/Youtube-mPcD-wWNBLk/video.mp4" \
  -o "$project/claude-review.mp4"
```
