---
name: match-cut
description: Turn photos, multiple clips, or one video into fast match cuts timed to Ali’s softened, double-speed camera shutter. Align shapes and faces, carry an action across camera angles, or jump between distant moments of a single take.
---

# Match cut

Deliver a playable MP4. Use the user's dropped files as the source material. A folder, a selection of individual files, a phone video, or a mixture of photos and clips all work. The default soundtrack is Ali’s camera-shutter recording alone.

## Find the match

Look at the source pictures or a contact sheet from the take. Choose the feature the viewer will follow. A coin rim can become a clock rim, an eye can stay on the same third of the frame, or a rightward hand in one scene can finish the gesture in a different scene. When the link is thematic, choose the order editorially and pass the files in that order with `--keep-order`.

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

- **Graphic matches.** Each input contributes one shot. Match the motif’s position, size and silhouette. Use `--motif circle` for disks and wheels, or `--motif face` for frontal faces. Automatic mode picks isolated silhouettes.
- **Action matches.** Inspect the whole video. Pick the same phase of a gesture, screen direction and point of action across different camera shots. The runner searches out of order and prefers early → late → middle for the first three. It records the source time, detected shot number and region in `edit.json`. With a single unbroken take, use separated portions of the take and identify them as time jumps. If a detected scene change turns out to be camera shake, move that excerpt to a distinct moment before delivering.
- **Shutter timing.** The default recording is `~/Desktop/MY VIDEO EDITING STUFF/Ali_BG_MUSIC/camera_sfx/alexis_gaming_cam-camera-shutter-346101.mp3`. The runner doubles its tempo with pitch preserved, applies a −12 dB high shelf at 2.2 kHz and a 5.8 kHz low-pass, then measures the attacks in that processed audio. The first frame opens on the first stroke. Each cut lands on the nearest 60 fps frame to another stroke. Leave the little pauses between bursts. Use `--pace burst` to retain closer attacks for movement, or `--duration` for a specified run time. A fixed set of photos uses one appearance per photo.
- **Sound choices.** Plain media drops use the shutter alone. `--shutter FILE` selects a replacement shutter recording. Use `--audio FILE` for an uninterrupted soundtrack or `--location-sound` for overlapping source audio only when the user explicitly requests that sound.
- **Framing.** Default to the first input’s aspect ratio. Use `--aspect portrait`, `square`, or `landscape` when requested. Subtle camera motion runs continuously through the cuts.

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

Open `match-cut.mp4` and its `joins-*.jpg` sheets. Each row shows the final two outgoing frames and the first two incoming frames. Trace the rim, eye, fingertip or direction of travel across the divider. For action, inspect the gesture at playback speed. A matched optical-flow direction is a candidate and `graphic fallback` flags a weak action match. Check every visible change in size, crop, direction, or gesture phase. Check the rendered audio with Earshot using the cut frames from the plan. On a shutter edit, listen for the start of the mechanical stroke as the new picture arrives.

To repair a join, copy `edit.json`. Set the shot's `anchor` to `[center_x, center_y, width, height]` in fractions of its **oriented source image**. A clock spanning x=.10–.50 and y=.20–.60 has anchor `[.30,.40,.40,.40]`. Set the common screen `target` and `fill` in the plan as needed. `fill` is the motif's longest dimension as a fraction of the output's shorter side. For action, adjust `in_seconds` to the matching phase and leave enough source frames for the shot. Preserve the shot lengths to keep the audio cut points. Render and inspect the revision:

```sh
~/.agents/skills/match-cut/scripts/match-cut --from-plan "/path/to/revised.json" \
  -o downloads/match-cut/04
```

Return the finished MP4 and briefly name the visual match and audio source. If the footage only supports a graphic match or the soundtrack has no distinguishable accents, say which technique the edit actually uses.
