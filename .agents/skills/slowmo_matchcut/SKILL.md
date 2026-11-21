---
name: slowmo_matchcut
description: Recreate Ali’s Match Cut V2 from photos and moving footage using the Wasted reference loop, its original vocal hook, optical-flow slow motion, a flash-to-freeze, silhouette flicker and a cyan portrait finish. Use for slowmo_matchcut or a reference-style slow-motion match cut.
---

# Slowmo match cut

The default cut uses one 10.067-second cycle from the user’s own clips. For a requested musical passage, use the full interval and mark its accents before placing the shots. Use the sped-up audio already present in [SwoleTea’s reference](https://www.youtube.com/watch?v=mPcD-wWNBLk). The default excerpt is 10.066667–20.133333 seconds. The first vocal hook starts here, on the repeat of the opening picture. The 3:09 upload repeats the same visual sequence. Use the original audio at unity gain and its existing speed.

## Choose six moments

Use photos and videos from the folder the user names. Set `media_root` on a timed plan to restrict its picture sources to that folder, including its subfolders. Use the original files as inputs.

Open with one view that establishes the person and the setting. Hard-cut into a close-up from the very same take, continuing from the outgoing source time. With a still, use two crops of that same photograph. Every later portrait should be tight enough for the eyes to carry the cut. Choose compatible gaze directions and match the eye midpoint around 50% across and 40% down the delivered frame. Hold magnification constant within each shot. Follow genuine head movement with small crop translations as needed. Review the outgoing and incoming frame together at every cut.

Review each proposed interval in motion from its first source frame to its last. Slow motion and flash holds draw attention to incidental gestures. Exclude nose wiping or picking, face cleaning and other grooming. In Ali’s projector take (`IMG_3158.MOV`, also exported as `raw3158.mov`), the rejected wipe is in the 9.13–11.29 s selection. The separate cyan portrait at 12.07 s is approved. Choose another shot whenever a gesture is unclear.

The reference is a 60 fps file with 30 distinct exposures per second. These boundaries use **30 fps exposure numbers**, starting at zero. One whole cycle is 302 exposures or 604 delivered frames. Preserve the slightly uneven cut intervals.

| Role | First exposure | What to look for and how it plays |
|---|---:|---|
| opening | 0 | A moving, low-lit portrait. The subject turns or looks down. Motion eases in the second half. |
| flash_hold | 75 | A second, readable portrait. A silhouette, a single white exposure and a short bloom decay reveal a sharp held frame. |
| silhouette | 107 | An isolated outline against a clean background. Dark, backlit and horizon-lit versions of this pose alternate over 17 exposures. |
| profile | 124 | A tight portrait in violet light with a gaze direction compatible with its neighbors. The first movement is slow, then gains speed into the next cut. |
| gesture | 153 | A stride lands, an object swings into place or the subject turns into the light. The gesture slows through exposures 170–189, then releases. A warm diagonal flare shifts cool. |
| closing | 227 | A strong front-facing close-up. Cyan highlights land on the cut. Just 0.155 seconds of source motion plays across the final 2.5 seconds. |

## Render

Use a local copy of the reference. If needed, the installed video-watch skill can fetch the canonical URL above. Keep both media and the project shot list under the project's ignored `downloads/`. The renderer only reads the audio stream from the reference.

Write a JSON object with the six role names above as keys. Each value has a `file` and a `start` in source seconds. Paths may be absolute or relative to the JSON. Optional `focus: [x, y]` sets the center of a **fixed crop** in upright source coordinates from 0 to 1. Optional `scale` tightens that crop, with 1 filling the canvas. For example, a stride might use `{"file":"takes/night-walk.mov","start":22.05,"focus":[0.55,0.75],"scale":1}`. Aim to reach the clearest pose about 0.65 seconds into the source interval. Allow at least 2.2 seconds of source for the full gesture.

```sh
~/.agents/skills/slowmo_matchcut/scripts/slowmo-matchcut \
  --plan "/path/to/shots.json" --reference "/path/to/reference.mp4" \
  -o "/path/to/slowmo-matchcut.mp4"
```

The default is 1280×720 landscape, matching the supplied reference. Use `--size 1080x1920` for a requested vertical version and recheck each crop. Use `--audio-start SECONDS` to choose another 10.067-second passage. The runner handles iPhone orientation, HDR-to-SDR conversion and variable-rate footage. It uses the existing workspace FFmpeg, onetake Python and text-behind person matte tools. For a nonhuman subject, supply a grayscale `matte` path in the two flash roles, white on the foreground, matching the output crop. Choose a steady silhouette when using a single supplied matte.

For an eye match, `eye_crop` accepts `width` as a fraction of the upright source width and `points` as a list of `[seconds from source in-point, eye midpoint x, eye midpoint y]`. Use normalized coordinates from the top-left. The first point is at time zero. A single point holds the crop stationary. To measure eyes, extract upright frames around the selected interval and run `swift scripts/eye_landmarks.swift /path/to/frames > eyes.json` from this skill's directory. It returns both eye centers for each detected face. Identify the intended person in the images. Divide their eye separation as a fraction of source width by the desired fraction of screen width to get the crop width. Verify the rendered frames, especially when a subject is close to a source edge. A photo uses one point; video can use several. The optional `span` in seconds controls how much source motion a shot plays.

For a custom music edit, put `audio_end` and an ordered `shots` array in the JSON. Each shot adds `role` and `at` (absolute seconds in the reference) to the existing source fields. The first cue sets the soundtrack in-point. Each later cue starts its shot on the closest 30 fps exposure. A white flash peaks one exposure after the start of `flash_hold`. For the high-note section at 0:48–1:10, a first cue at 43.0, a flash at 47.966667 and an `audio_end` of 70.0 give a five-second lead-in and a 27-second edit.

For the default cycle, review the frames on both sides of 2.50, 3.57, 4.13, 5.10 and 7.57 seconds. Check the eye line, silhouette edges and the hand's slow section. Play the result against the same reference excerpt and check for audio offset or an unwanted location track. The output should contain one video stream and one audio stream.
