---
name: no-cut-edit
description: THE DEFAULT edit style for Ali's own videos (since 24 Nov 2026). Whenever Ali gives his video, takes or a topic for an edit and does not name another style, make it a "no cut edit" exactly like the two charles.zhengg reference reels (GPS / quasar and "How does sand think?") - ONE continuous take with no cuts and no transitions. Zoom OUT when the line is about the bigger picture, keep zooming IN while explaining, and teach inside a dark cinematic 3D world. His face is home base inside the same take - his room with the same 3D object floating above his shoulder - and he comes back at each new question. Joins are camera moves only - pull back until the object hangs in his room, push into the object as the room dims, lean into the lens, dive into a screen that shows his face. The voice calls each zoom ("Let's zoom in. Further. Even further."), scale labels show while zooming, parts are added to the same object, and the ending recaps small to big and lands on the opening frame so the reel loops. Built on paper3d (three.js, one camera, fast GPU renderer). Use for "no cut edit", "zoom in zoom out style", "like the GPS reel / the sand reel", "one take like charles", or any edit of his video with no other style named.
---

# no-cut-edit: one take through scale, his face as home base

Ali's ask (24 Nov 2026), with the two reference reels: *"we need to edit our videos using onetake exactly like this,
there should be only one take and scene should flow from one point to another without any transition and cut, we need
to use same strategy of zoom in and zoom out, when we want to talk about bigger picture, we zoom out and when we are
explaining something we keep zooming in and use 3d world to describe or teach something."* Then: *"save these
instructions as skill or default rules so next time when i give you any edit with my video, you need to make exactly
like this style, no cut edit."*

References (local, not in git): `downloads/Instagram-De818_Hh51D/` (GPS / quasar, 2:31) and
`downloads/Instagram-Dev8BHVBea_/` (sand, 2:21), each with frames, a Whisper transcript and filmstrips in `sheets/`.
The full breakdown with timestamps is [references/breakdown.md](references/breakdown.md). Read it before scripting.
If the reference folders are gone, re-download them with `video-watch` (links are in the breakdown).

## When this skill applies

- **Default:** any edit of Ali's own video, takes or topic, unless he names another style.
- **Use the other skill instead when he names it:** `reel-edit` (reel 3/4), `talk-and-point` (reel 31),
  `funky-edit` (reel 33), `html-canvas-animation` (reel 16/17), `paper3d` on white paper (reel 15/40), `match-cut`,
  `slowmo_matchcut`, `insta_zoom_pw_story`. Ranking or quick-fire reels keep their own templates (reel 9/10).
- His standing rules still hold (memory and `AGENTS.md`), except where this file says otherwise.

## The style (copy it exactly)

1. **One take, zero cuts, zero transitions.** No cross-fades, wipes, whips or jump cuts. Every change of place,
   scale or speaker is a camera move through space.
2. **Zoom direction follows meaning.**
   - **Zoom IN = explaining:** the camera keeps going deeper (object → part → smaller part → the mechanism).
   - **Zoom OUT = the bigger picture:** consequences, scale, "every phone in the world", history.
   - Each step is one level of scale. Show the thing whole first, then go inside (paper3d rule 2).
3. **The voice calls each big zoom.** Write "Let's zoom in." / "Further." / "Even further." / "Let's zoom out." into
   the script. The move starts on that word. While zooming, a small scale label sits near the frame edge and counts
   the level (500 µm → 50 µm; 20,000 km; ×10 per level).
4. **Build by adding to the same object.** The camera holds one thing while the voice adds parts ("add a second…
   add a third…"). Each addition appears on its word, and the earlier parts stay visible.
5. **His face is home base, inside the take.** It's his room, and the 3D object from the current scene floats above
   his shoulder: the same object, same angle, lit to sit in the room. He appears:
   - on the hook,
   - at each new question or turn ("How is this even possible?", "But wait…"),
   - sometimes on a reaction line.

   Everything else is his voice over the 3D world. His face is on screen for roughly 10-20 % of the reel.
6. **Big moves are fast, then drift.** A long zoom is a fast push with streaky radial motion blur, easing into a slow
   drift. The picture never stands still (always-on subtle motion).
7. **Ending = the whole chain in one move.** Recap small to big, or big to small, in one continuous camera move. Land
   exactly on the opening frame so the reel loops. The last line is his value close or "drop a follow" (no profile card).

## The joins (the only ways to change place)

- **Pull back to his face.** The camera pulls out of the 3D world until the object is small. The world around it fades
  to black, and his room fades in behind it. The object settles into the empty space above his shoulder.
- **Push in from his face.** The camera pushes toward the floating object. The room dims and blurs to black, and the
  object grows until it is the world again.
- **Lean in.** He leans toward the lens, his face blurs huge, and the blur opens onto the next 3D place. This needs a
  lean-in take; ask him to film one per question line.
- **Screen dive.** A 3D phone or monitor in the world plays his take (or the real demo recording). The camera dives
  into the screen and comes out full frame.
- **Scale dive.** Inside the 3D world, every place is reached by zooming through the object (paper3d `dive: true`
  keys). The camera never passes through solid objects (route around, or go through a screen or opening).

**Take changes hide only where his face is not on screen:**
- while the 3D world fills the frame (his voice carries on as voice-over),
- inside a push, lean-in or screen dive.

A face segment plays one take, continuously. If a line has no clean take for its face segment, play it as voice over
3D instead. Never jump-cut on his face.

## Script

- **Topic, no takes yet:** write the script first, in the last similar reel's Script | Action format. Build nothing
  until he approves it. The script follows the reference shape:
  1. Hook: on camera, a claim that raises a question.
  2. "Let's zoom in" / "Let's zoom out" into the world.
  3. Build by adding.
  4. "But wait…" back to his face.
  5. The biggest zoom.
  6. The recap move.
  7. Close, landing on the opening.

  Mark each line FACE or 3D, and IN, OUT or HOLD. His hook rules still apply (real number or name, raises a question,
  gives a stake).
- **Takes already filmed:** transcribe them. Take his LAST complete take of each line, whole. Mark each line:
  - FACE: hook, questions, reactions;
  - 3D-IN: explaining;
  - 3D-OUT: bigger picture.

  Add a spoken zoom cue only if he said one; never invent his words. Show him the line map before building.
- **The shoot list** to give him: talking takes in his room with clear space above one shoulder, a glance up at that
  spot on question lines, hands shaping the object, and one lean into the lens per question line. His shirt and room
  are the same in every take, because the room is a place the film returns to.

## Picture

- **His hook is on camera from frame 0**, with the hook's 3D object already floating in his room and the camera
  already moving. This is the one deliberate change from the references, which open on the object, because his rule
  is "the hook is always mine".
- **Look:** dark and cinematic like the references. Load `kit/cine-dark.js` (reel 37/38's look: near-black, premium
  dark lighting, bloom, NaN-sanitise pass). Use one warm accent (gold / amber) only for the thing that matters
  (signal, current, data). Real photos and textures where they exist (die shots, Earth, product photos). This style
  replaces the white wrapped paper look for these edits, but the 3D quality rules of reel 40 still apply:
  - real 3D insides, never vague dots,
  - fill the 9:16 frame,
  - subject big and centred,
  - no empty areas.
- **His room plate:** his take as a camera-locked plane (`K.footage`) that exactly fills the frame:
  - size: h = 2·d·tan(fov/2), w = h·9/16;
  - draw order: drawn first (`renderOrder` low, `depthTest` off), so the 3D object draws over it.
  - Fade the plate in at the end of a pull-back, and dim it to black on a push-in.
  - Subtle zoom 1.00-1.045 on the plate while it holds, never below 1.0.
- **Where the object floats:** above the shoulder on the side with more empty room. Read the asset catalog face data
  (eye positions, face size), so it never covers his face or eyes. Keep it inside x 100-980. Grade it warmer and dimmer
  to sit in the room.
- **On-camera only:** his face shows only while he looks into the lens (catalog face data; cut reading or look-away
  frames, but keep his deliberate funny moments).
- **On-screen words:**
  - big white numbers and one-word labels in the upper third, on their word, as plain type with no box;
  - captions: semibold, lower third, one amber key word, no box or pill, placed by
    `paper3d/examples/reel40/tools/capplan.py` so they are never dark-on-dark;
  - no footnotes or disclaimers.
- **Tool reels:** the real demo recorded on this Mac plays on a 3D screen in the world, and the camera dives into it.
  Before, then after, each held at least 5 s.

## Build

1. `.agents/skills/paper3d/scripts/new_film.sh downloads/reelN/full`, then copy `kit/cine-dark.js` to `film/cine.js`.
   Load it after `kit.js` and call `KIT.cine.setup()` after `KIT.init()` (see `downloads/reel38/full/film/comp.html`).
2. Plan the camera as a list of keys:
   - one level of scale per key,
   - `dive: true` for big jumps,
   - nested levels about 10x apart, each built at its own unit scale, so precision holds;
   - switch to the next level while it fills the frame.
3. Put the face plate and the floating object in one helper, and drive the whole join from one 0-1 value per join.
4. Render with `tools/render_gpu.py` (the fast GPU renderer, real motion blur). The screenshot renderer is only a
   fallback.
5. **Sound:** follow his standing rules:
   - raw voice, 1.10x plus one gain per line;
   - breath after sentences;
   - music at least 15 LU under the voice, moving with it;
   - cinematic real effects at one level on the big zooms and pull-backs;
   - earshot checks before delivery.

## Before delivery

- Check a 2 fps sheet of the whole render:
  - no cut anywhere: every frame-to-frame change is a move;
  - every zoom direction matches its line (IN explaining, OUT bigger picture);
  - his eyes on the lens in every face frame;
  - the floating object clear of his face;
  - captions readable;
  - the last frame matches the first.
- Keep every delivered version (v1, v2…), and deliver to `~/Downloads/reelN_*` with a thumbnail from the film.
