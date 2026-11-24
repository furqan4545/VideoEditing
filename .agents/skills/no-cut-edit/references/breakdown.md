# Zoom-ladder one-take style (charles.zhengg references, watched 24 Nov 2026)

References (frames, Whisper transcripts, filmstrips in each folder's `sheets/`):
- A "GPS / quasar": `downloads/Instagram-De818_Hh51D/` (2:31) - instagram.com/reel/De818_Hh51D
- B "How does sand think?": `downloads/Instagram-Dev8BHVBea_/` (2:21) - instagram.com/reel/Dev8BHVBea_

Ali's brief: one take, no transitions or cuts, scenes flow from one point to the next. Zoom OUT when talking about
the bigger picture, keep zooming IN while explaining, and use a 3D world to show and teach.

## The grammar (both reels follow it)

1. **Hook = a strange object + an impossible claim.** A title at the top for ~6-8 s ("This black hole is how your
   phone knows you're on the toilet" / "How does sand think?"), the camera already moving at frame 0.
2. **Every change of scale is a camera move, and the voice calls it.** "Let's zoom out." / "Let's zoom in.
   Further. Even further." The word lands on the first frame of the move. Scale labels on screen while zooming
   (500 µm, 50 µm, 20,000 km).
   - Zoom IN = explaining (sand -> wafer -> die -> transistor -> gate; Earth -> city -> street -> your phone).
   - Zoom OUT = the bigger picture (Earth -> Moon -> galaxy -> quasar; chip -> phone -> every computer).
3. **Build by adding to the same object.** The camera holds one thing and the voice adds parts: "add a second
   satellite... add a third... add a fourth"; "put two switches in a row... side by side... add a NOT gate".
4. **His face is home base, inside the same take.** He is in his room with THE SAME 3D object floating above his
   shoulder (Earth top-right in A, the memory block / chip top-left in B). He comes back at every new question
   ("How is this even possible?", "But wait, how do satellites know...?") and leaves when the answer starts.
5. **How the face joins the 3D world (no cuts):**
   - *Pull back:* the camera pulls out of the 3D world until the object is small; his room fades in behind it and
     the object now hangs in his room (A 0:50-0:53, B 1:06-1:09).
   - *Push in:* the camera pushes toward the floating object; the room dims and blurs to black; the object grows
     until it is the world again (A 0:56-0:58, B 1:12-1:14).
   - *Lean in:* he leans into the lens, his face blurs huge, and the blur becomes the next 3D place
     (A 0:13, B 0:12 "How is this...").
   - *Screen dive:* a 3D phone in the world shows his face; the camera dives into the screen and it is him
     (A 0:08-0:10).
6. **Big moves are fast with radial motion blur (warp streaks), then ease into a slow drift.** Never static.
7. **On-screen words:** big white numbers and one-word labels at the top ("100,000,000,000", "ALU", "Memory",
   "3,000,000,000 / second", timers "0:02"); captions in the middle-low area, word by word, one key word in amber.
8. **Look:** dark and cinematic, one accent colour (gold / amber) for the thing that matters (signal, current,
   bits). Real photos mixed in where they exist (chip die shots, Earth textures).
9. **Ending = recap in one continuous move, small to big, then land on the opening image** so the reel loops
   (A ends "and all of this started with..." on the quasar; B ends back on the grain of sand in the desert).

## Timeline notes

A (GPS): 0:00 quasar + title -> 0:04 warp zoom in -> clouds -> 0:08 3D bathroom, hooded figure on the toilet, his
face on the phone screen -> dive into it -> 0:10 him, Earth top-right -> 0:13 lean in -> Earth in space,
"So let's zoom out" -> 0:15 GPS satellite -> spheres crossing (2nd, 3rd, 4th satellite) -> 0:42 dive into a city
at night, clock readouts, "100 ns" -> "30 m" -> 0:50 radial pull-out -> Earth + 4 lines -> 0:52 his room fades in,
Earth over his head -> 0:56 room falls away -> gravity / Einstein, ionosphere, city bounces (1:09-1:27) ->
1:28 "But wait..." him -> 1:31 ground station -> 770 m / 2.5 km drift, tectonic plates -> 1:54 "Let's zoom out":
past the Moon, the galaxy, back to the quasar -> 2:01 two telescopes, 3.976 ms / 5.968 ms -> 2:16 recap: zoom into
the bathroom, then out through satellites, ground stations, galaxies -> quasar (loop).

B (sand): 0:00 grain on a dune + title -> dive in: melt, grow crystal, slice, carve with light -> die -> phone
board -> 0:08 him, chip top-left, "1,134,000,000" -> 0:12 lean in -> real die photo, "Let's zoom in" 500 µm ->
50 µm -> "Further" -> "Even further" -> transistor (1 / 0) -> AND, OR, NOT -> adder -> ALU -> latch loop ->
memory with addresses -> 1:06 pull back: memory block in his room -> 1:12 push in -> program, clock tower,
fetch / decode / execute, 3 billion / s -> 1:35 him -> slow time: "1 tick = 1 second", "Day 1", "0:02" -> cache ->
pull out to the phone board -> camera / screen -> Input / Control / ALU / Memory / Output -> server hall -> laptop
-> phone in a hand on the dune -> into the transistors -> back to the grain of sand (loop).

## How we build it (our kit)

- **3D world + zooms:** `paper3d` (three.js, one camera, `dive: true` keys for big scale jumps, GPU renderer with
  real motion blur). Nested levels each 10x apart so precision holds; a scale label per level.
- **Dark look:** reel 37's `cine.js` (dark env, bloom, NaN-sanitise pass), gold for meaning only.
- **His face as home base:** his take as a camera-locked full-frame plate (`K.footage`) with the 3D object in
  front; the plate fades in at the end of a pull-back and dims out on the push-in. Place the object in the empty
  space above his shoulder using the asset catalog face data (eyes, gaze).
- **Captions:** our rules win over the reference's look: semibold, no box or pill, one amber key word, placed by
  `capplan.py`.
- **What Ali films:** talking takes in his room with clear space above one shoulder, glancing up at that spot,
  hands shaping the thing; one "lean into the lens" take for each question line.
