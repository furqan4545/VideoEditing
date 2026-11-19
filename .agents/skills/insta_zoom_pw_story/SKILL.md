---
name: insta_zoom_pw_story
description: OPT-IN story pattern, never a default - use it only when Ali names it ("insta zoom pw story", "the zoom password story", "the keyboard password reel pattern", "like Hari Ganesh's reel"). Writes a 60 to 100 s explainer script in the shape of the viral "AI hears your password from the sound of your keyboard" reel - an impossible-sounding claim about something the viewer does every day, proof with one name and one number, "here is how it works and how you'd build one", one thing the viewer already knows, one tiny question (the E key against the R key), four drawn steps, the name of the thing at the midpoint, the why, a one-line build recipe, an honest catch, the close. Ships the beat sheet with word limits, a topic test, the picture rules (one drawing per sentence, one example carried through), the reference reel's breakdown, an example script and a checker (scripts/check_story.py). For every other story or explainer script keep using the normal story template.
---

# insta_zoom_pw_story: claim, proof, "how you'd build one"

A storytelling pattern taken from one reel: Hari Ganesh's "an AI can work out what you typed from the sound of your
keys" (67 s, 41.7K likes and 4,828 comments three weeks after posting). The full breakdown is in
[references/reference-reel.md](references/reference-reel.md).

**Only on request.** Ali, 19 Nov 2026: "do not make this pattern default.. whenever i want this, we will call the
skill". When he has not named this skill, write story and explainer scripts the usual way (the scenario story:
"Imagine you run…", people, "That is X"). This pattern has no scenario story and no people. It explains the real
thing directly, with drawings.

## Does the topic fit?

All six must be true. If one is missing, say which, and offer the usual story shape instead.

1. **An impossible-sounding claim about the viewer's own day.** Their password, their phone, their Wi-Fi, their photos.
   A threat is the strongest kind; a surprise works too.
2. **A real source with one number.** Who did it, and one result ("95 out of 100 keys"). Read the source itself, not a
   news story about it.
3. **A mechanism in 3 to 5 steps**, and every step can be drawn.
4. **One tiny pair** the whole question shrinks to (the E key against the R key). Two things, two colours.
5. **A familiar thing to stand on** ("You already know AI can tell what is in a photo").
6. **An honest catch.** The limit that makes the claim true but smaller.

## The shape

One row per beat, in this order. "Max" is the word limit the checker uses. "Reference" is where the beat sat in the
reference reel.

| Beat | Its job | How the line is built | Max | Reference |
|---|---|---|---|---|
| `claim` | Stop the scroll. Say the result, never the mechanism. | "Someone could [impossible thing] to your [everyday thing], with only [small harmless thing]." | 20 | 0:00–0:04 |
| `proof` | Make them believe before they invest. | Who did it, what they used, one number. | 26 | 0:04–0:12 |
| `promise` | Two rewards: understand it, and build it. | "Here is how it works, and how you would build one." | 12 | 0:12–0:14 |
| `anchor` | Start from what they know. | "You already know [familiar thing]." | 18 | 0:14–0:17 |
| `question` | The one real question, at its smallest. | "So how can it tell [A] from [B] with only [the small thing]?" | 18 | 0:17–0:21 |
| `step` × 3–5 | One move each. One sentence, one drawing. | "Every… / Next, you… / For every… / Then you…" | 16 each | 0:21–0:34 |
| `name` | The "aha": the strange thing became a familiar thing. Say the term only now. | "Now [the small thing] is a [familiar thing]. It is called a [term]." | 14 | 0:34–0:38 |
| `read` (optional) | Teach them to read the new picture. | Three short facts, one per axis or part. | 16 | 0:38–0:42 |
| `why` | Answer the question with the tiny pair, side by side. | "[A] and [B] are different in [one way], so each leaves its own [mark]." | 28 | 0:42–0:47 |
| `recipe` | The build, start to end. | "So you [collect], [turn into the familiar thing], and [train / use a free tool]." | 30 | 0:47–0:55 |
| `catch` | The honest limit. | "Here is the catch. It only works when…" | 16 | 0:55–1:00 |
| `close` | Use it, share it. | An apply-it line, then the share line or keyword. | 30 | 1:00–1:07 |

Time shares in the reference: claim + proof + promise 21%, anchor + question 10%, steps + name + read 31%, why 8%,
recipe 12%, catch 7%, close 10%.

## What keeps people watching (keep all five)

1. **Questions close late.** "How is that possible?" opens in the claim and closes in `why`. "How would I build it?"
   opens in the promise and closes in `recipe`. Never answer early, and open the next question before the last one
   closes.
2. **Proof comes before the explanation.** By the 12th second the viewer has a name and a number.
3. **The "aha" sits in the middle.** The `name` beat starts between 40% and 62% of the words. Everything before it
   builds the picture; everything after it uses the picture.
4. **One example is carried the whole way.** The same E key, in the same colour, from the first step to the final tick.
   Never swap examples.
5. **Every sentence starts on what the last one ended with.** Click → wave → slices → one slice → picture → stripes →
   pictures. One new idea per sentence. A term is said only after its picture exists.

## The picture half

The story is told by the drawings as much as by the voice. Write the Action column with these rules.

- **One sentence, one drawing.** It draws itself while the sentence is said and is finished on the last word.
- **Labels land on their word.** "Time", "pitch", "louder" each appear as they are spoken.
- **Two colours for the tiny pair**, one more for labels and highlights, green for "right". Nothing else.
- **Old drawings shrink to the top and stay.** The viewer always sees where the current step came from.
- **Two worlds.** The real world (the desk, the device) for `claim`, `proof` and `close`. A plain board for the
  mechanism. Enter the board by diving into the object the explanation is about.
- **The claim shows the result.** The picture proves the line while it is being said.
- **Drawings in the top 60% of the frame.** The lower third stays clear.

Build it with the film skills: `html-canvas-animation` for the board, `paper3d` when the real-world part should be 3D,
`talk-and-point` when Ali's take is in the film. The reference used a dark chalkboard; use Ali's white paper look
unless he asks for the dark one.

## House rules on top

The reference is faceless, uses an AI voice, runs at 3.7 words a second and ends on "comment the word and I'll send
it". Ali's version changes five things:

- **The claim is Ali on camera.** The result plays right after his line (or beside him), then the film moves into the
  board through a move, never a hard cut. When he gives a hook or outline, use it word for word.
- **His pace.** Plan at 2.6 words a second. Aim for 200 to 260 words (about 77 to 100 s). Never over 120 s.
- **No gate.** Nothing is held back behind a comment. The build steps go in the description; the last line is an
  apply-it line plus a share line, or a keyword as a vote when he asks for one.
- **His words.** 5th-grade words, full sentences, nothing hard to say. No sentence over 20 words.
- **A real demo and a before / after, always.** When the reel teaches a tool, the film shows one working example
  recorded on Ali's Mac: the tool really being installed or used (a screen recording of the real thing, not a redrawn
  screen), and what it made as a before and an after (for icons: the app with its old icons, then the same app with
  the new ones). The demo is the picture of the `recipe` beat, because the build IS the demo; the before / after can
  also open the `claim`, where the picture has to prove the line. Every other example in the film is shown the same
  way, before then after. The agent records it on this Mac (Ali only films himself); tools installed for it go in
  `downloads/reelN/demo-tools/` with a `CLEANUP.md`. Keep it short and about the result: a few seconds of the real run,
  never a click-by-click tutorial. His words, 19 Nov 2026: "always always show one working example of demo, recorded
  from my laptop in the video. always show live demo of creating or using the tool we are teaching, if it is about
  icon, show before and after.. always show examples like before and after."

Facts about real people, companies and papers are checked against the source and framed honestly (name the
universities, not "scientists"). Put the research in `downloads/reelN/research/`.

## Write one

1. Run the topic test. Read the source. Write down: the claim, who, the one number, the steps, the tiny pair, the
   catch.
   For a tool: run it for real on this Mac before you write. Record the screen while it works (the one-line install or
   the ask, the tool doing the job, the result) and keep the same thing before and after. What really happened in that
   run is what the `recipe` row says and shows.
2. Write the script as one table, `| Beat | Script | Action |`, one row per beat, in a file like
   `downloads/reelN/script.md`. Copy [examples/keyboard_sound.md](examples/keyboard_sound.md) as the start.
3. Check it:

   ```bash
   python3 .agents/skills/insta_zoom_pw_story/scripts/check_story.py downloads/reelN/script.md
   ```

   It checks the order of the beats, the word limit of each, the length at his pace, that `name` sits in the middle,
   that the proof has a number, that the question is one question, and that the close has no gate. It also prints which
   word links each sentence to the one before; a row marked `no link` needs a look.
   For a reel that teaches a tool, add `--tool`: the Action column must then hold a recorded demo and a before / after,
   or the check fails (without the flag it only reminds you).
4. Show Ali the clean table with the word count and length:

   ```bash
   python3 .agents/skills/insta_zoom_pw_story/scripts/check_story.py downloads/reelN/script.md --clean
   ```

5. Write the description. It adds what the video skipped: the second number, the exact setup, the build steps, the
   source. It never retells the video.

## Files

| File | What it is |
|---|---|
| `references/reference-reel.md` | The reference reel beat by beat: timing, word counts, what is on screen, the sound, the numbers, why it worked |
| `examples/keyboard_sound.md` | The same topic written in our words and house rules; passes the checker |
| `scripts/check_story.py` | The checker and the clean-table printer (Python 3, no installs) |

The reel itself and its exact transcript are local only, in `downloads/Instagram-De5oJe-x_lS/` (git ignores it). If the
folder is gone, download it again with `video-watch`: `https://www.instagram.com/reel/De5oJe-x_lS/`.
