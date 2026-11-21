---
name: match-cut
description: Turn photos or footage into match cuts on a steady camera-shutter loop. Use fixed framing, warp blur in all four corners, and one picture per click. Adjust the shutter and cut speed together when requested.
---

# Match cut

Deliver a playable MP4 from the user's photos, clips, or a mix of both. By default, repeat the complete opening shutter from Ali's first photo edit at **10 clicks per second**. At 60 fps this puts a new picture on screen every six frames, at the same pace through the ending. Photo edits default to 10 seconds. Aim for 100 distinct pictures for that cut.

Use one distinct picture or excerpt for each audible shutter click, including the opening picture. Hold the framing fixed between clicks. The warp-zoom look comes from a strong radial smear baked into all four corners. The center stays sharp and still. A video excerpt keeps its recorded motion. Use these defaults in every new match cut unless the user explicitly requests a change.

## Find the match

Look at the source pictures or a contact sheet from the take. For a photo edit from a folder containing photos and videos, select the still image files and pass their paths to the runner. Choose the feature the viewer will follow. A coin rim can become a clock rim, an eye can stay on the same third of the frame, or a rightward hand in one scene can finish the gesture in a different scene. When the link is thematic, choose the order editorially and pass the files in that order with `--keep-order`.

In Ben Kaluza's reference, roughly 0:00.7–0:05.9 cycles through groups of disks, painted faces, moons and fans. Some images last just two frames. Around 0:19–0:23 the globe or disk stays centered as its surface changes. Use a short burst for a clear repeated silhouette. Give actions enough frames on each side for the viewer to see the motion. [Reference reel](https://www.instagram.com/reel/Df5T5Cxsau3/)

## Make the edit

Run `scripts/match-cut` from **this skill's directory**, or call its installed path. Put the output in a new directory under the project's ignored `downloads/`. Use absolute input paths when running from another folder. On this Mac, the runner uses the Python environment, FFmpeg and sound library installed by the workspace's `setup.sh`.

```sh
~/.agents/skills/match-cut/scripts/match-cut "/path/to/photos" \
  --motif circle --aspect portrait -o downloads/match-cut/01

~/.agents/skills/match-cut/scripts/match-cut "/path/to/footage.mov" \
  -o downloads/match-cut/02

~/.agents/skills/match-cut/scripts/match-cut "/path/to/press-side.mov" \
  "/path/to/press-front.mov" "/path/to/press-wide.mov" --keep-order \
  --aspect portrait -o downloads/match-cut/03
```

### Change the speed

Use `--shutter-speed MULTIPLIER` when the user asks to slow down or speed up the shutter. The cuts follow the same clock. Changing the spacing preserves the pitch, attack, and mechanical return of the sampled shutter.

| Requested pace | Option | Clicks per second | Frames per photo at 60 fps |
|---|---|---:|---:|
| Half speed | `--shutter-speed 0.5` | 5 | 12 |
| Approved default | `--shutter-speed 1` or omit | 10 | 6 |
| One and a half speed | `--shutter-speed 1.5` | 15 | 4 |
| Double speed | `--shutter-speed 2` | 20 | 3 |

Other positive multipliers up to 3× also work. For fractional frame intervals, the audio stays on its exact clock and the picture lands on the nearest frame. The last partial exposure must fit at least two frames. Use `--duration` to set a different length. With fixed duration, a slower loop uses fewer pictures and a faster loop uses more. If the user asks for every photo exactly once, allow one tenth of a second per photo at 1× and divide that duration by the selected speed.

- **Graphic matches.** Choose photos with a shared silhouette, eye line, or gesture and a visible change at each cut. Spread similar burst photos apart. The runner skips identical copies and uses the available set before cycling back when there are more clicks than pictures. Consecutive exposures always use different inputs in a multi-source edit. With extra pictures, `--keep-order` samples across the ordered selection. Use `--motif circle` for disks and wheels, or `--motif face` for frontal faces. Automatic mode picks isolated silhouettes.
- **Action matches.** Inspect the whole video. Pick the same phase of a gesture, screen direction and point of action across different camera shots. The runner searches out of order and prefers early → late → middle for the first three. It records the source time, detected shot number and region in `edit.json`. With a single unbroken take, use separated portions of the take and identify them as time jumps. If a detected scene change turns out to be camera shake, move that excerpt to a distinct moment before delivering.
- **Shutter sound.** The default recording is `~/Desktop/MY VIDEO EDITING STUFF/Ali_BG_MUSIC/camera_sfx/alexis_gaming_cam-camera-shutter-346101.mp3`. The runner recreates the first edit's pitch-preserving 2× treatment, −12 dB high shelf at 2.2 kHz and 5.8 kHz low-pass. It takes the opening exposure with its return and quiet release, and repeats that same sound on every cut. The variable-speed tail of the source never enters the loop. The existing `--pace burst` option selects a 2× loop unless an explicit shutter speed is given.
- **Sound choices.** Plain media drops use the shutter alone. `--shutter FILE` selects a replacement shutter recording. Use `--audio FILE` for an uninterrupted soundtrack or `--location-sound` for overlapping source audio only when the user explicitly requests that sound.
- **Framing.** Default to the first input’s aspect ratio. Use `--aspect portrait`, `square`, or `landscape` when requested. Use a single crop at the scale needed to fill the canvas. Let the matched subject guide the crop. Keep its scale and position constant for the entire shot.

## Carry one action across several clips

Group takes by gesture. In the gym edit, a hand loaded a plate, one press extended across three angles, a pulldown closed across three more, and the hand released. The nine shots fit 1.90 seconds on the shutter. Choose the order with `--keep-order`. Across each pair, locate the last visible movement in the outgoing shot and its continuation in the next. An elbow midway through extension should keep opening after the cut. Reframe the wrist or grip to land near its previous screen position.

For presses, pulls, or throws with a visible arm, the optional macOS helper measures elbow angle and wrist position locally. Sample each candidate clip into its own fresh directory. This example reads the first four seconds.

```sh
frames=$(mktemp -d)
ffmpeg -v error -i "/path/to/press-side.mov" -t 4 -vf "fps=12,scale=-2:320" \
  -start_number 0 "$frames/%05d.jpg"
swift ~/.agents/skills/match-cut/scripts/arm-phase.swift "$frames" 12 > "$frames/poses.json"
```

The timestamps are seconds from the sample start. If you seek into a longer clip, add the seek offset. Follow the same arm through each shot. Increasing `elbowDegrees` means extension, and `wrist` gives x and y from the top left as fractions of the frame. Missing arm measurements indicate an obscured or uncertain pose. Check the hands visually when the camera angle changes or another person enters. Use these measurements to adjust the source time and framing in the plan, keeping every shutter cue in place.

## Watch the joins and finish

Open `match-cut.mp4` and its `joins-*.jpg` sheets. Each row shows the final two outgoing frames and the first two incoming frames. Trace the rim, eye, fingertip or direction of travel across the divider. For action, inspect the gesture at playback speed. A matched optical-flow direction is a candidate and `graphic fallback` flags a weak action match. For stills, compare the first and last frame of a hold for drift, and check a textured corner at viewing size for visible outward streaking. Check the exported duration and the shutter hits in Earshot against the cut frames in the plan. A sequence of N pictures needs N audible clicks and N−1 visible transitions, with the first click at the opening. Check in both directions for extra clicks and silent picture changes.

To repair a join, copy `edit.json`. Set the shot's `anchor` to `[center_x, center_y, width, height]` in fractions of its **oriented source image**. A clock spanning x=.10–.50 and y=.20–.60 has anchor `[.30,.40,.40,.40]`. The center places the crop toward the common screen `target` within the source bounds. For action, adjust `in_seconds` to the matching phase and leave enough source frames for the shot. Preserve the shot lengths to keep the cut points. If a shot length changes, its neighbors’ shutter clicks follow their new first frames. Earlier saved plans replay their original framing and mix. Start from the original inputs to give an older edit the current style.

```sh
~/.agents/skills/match-cut/scripts/match-cut --from-plan "/path/to/revised.json" \
  -o downloads/match-cut/04
```

Return the finished MP4 and briefly name the visual match and audio source. If the footage only supports a graphic match or the soundtrack has no distinguishable accents, say which technique the edit actually uses.
