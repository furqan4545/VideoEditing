---
name: simple-storytell-caption
description: Ali's "simple story tell caption" - the plain black captions of the reel 15 film. A few words at a time near the top of the frame in Apple's SF, medium weight, never bold, never moving; the words already spoken are near-black and the words still to come are grey, so the line fills in as he talks (white over footage). Use for story-telling, explainer and animated films, whenever Ali says "simple story tell caption", "story caption", "the black captions", "captions like the gate video / reel 15", or asks for simple captions with no bold or flying text. Ships one JavaScript file for any HTML film (onetake, paper3d, HyperFrames) and a script that burns the captions onto a finished video.
---

# Simple story tell caption

The caption template Ali approved on reel 15 ("your black captions are perfect", 13 Nov 2026). It is quiet on purpose:
the picture tells the story, the caption only keeps the viewer in step with the voice.

## The look (do not restyle it)

| | |
|---|---|
| Font | Apple SF (`"SF Reel"` from a font file if the page has one, else the system font), **weight 500**, 50 px, letter-spacing -0.008em, line-height 1.16 |
| Place | centred in x 110 to 970, first line at **y 268** (1080 x 1920 frame); a long chunk wraps to a second line (to y 384) |
| Colour | spoken words `#15161a`, coming words `#a9aaae`. Over footage (`theme: 'light'`): white and 55% white with a soft shadow |
| Chunk | at most 4 words or 20 characters; also ends after `. ? ! , :`, at a pause over 0.45 s, or when the next phrase starts |
| Timing | shows 0.06 s before its first word; each word turns dark 0.03 s before it is spoken; stays at most 0.9 s after its last word |
| Motion | none. No bold, no colour word, no pop, no slide, no box, no emoji |

Keep the band y 250 to 400 clear of the subject, and never put other on-screen text in it.

## Use it in an HTML film (onetake, paper3d, HyperFrames, any page with a `__seek(t)`)

```html
<script src="story_caption.js"></script>
<script>
  StoryCaption.mount(overlayElement);            // a positioned element covering the 1080 x 1920 frame
  StoryCaption.build(TIMING.words);              // [[word, t0, t1, pieceId?], ...] in seconds, spelled the way it should read
  // every frame:
  StoryCaption.draw(t, { theme: 'dark' });       // 'light' while his footage fills the frame; { hidden: true } to hide; { opacity }
</script>
```

Copy `story_caption.js` next to the composition. `draw` is a pure function of `t` (safe for onetake's shutter). The paper3d
kit loads it by default (`TIMING.captions = 'apple'` switches that kit to the reels 12/13 Apple style instead).
For SF to render in a headless render, give the page the font file:
`@font-face { font-family: "SF Reel"; src: url("fonts/SFNS.ttf"); font-weight: 1 1000; }` with a copy of
`/System/Library/Fonts/SFNS.ttf` (never commit the font).

Preview: open `demo.html?t=1.2` (dark on paper) or `demo.html?t=1.2&theme=light` (white over a dark picture).

## Burn it onto a finished video

```bash
~/.local/share/onetake/.venv/bin/python .agents/skills/simple-storytell-caption/scripts/burn.py IN.mp4 cut/timing.json OUT.mp4 --theme light
```

`--theme dark` for a white or light picture behind the caption band, `light` for footage. `--top 268` moves the band. The words
come from the reel's `cut/timing.json` (or any JSON list of `[word, t0, t1]`); the sound is copied untouched.

## Word times

Captions are only as good as the word times. Transcribe the finished voice track once (one Whisper process), then map the
script's spelling onto the heard times (reel 15: `examples/reel15/cut/build.py` in the paper3d skill). Fix what Whisper
mishears ("58,000" as one word, names, "its / it's") in the caption text, never in the timing.

## When not to use it

Ali's talking-head tool reels have had their own caption looks (the Apple style of reels 12 and 13 with one blue italic key
word, the serif word-lit captions of the reel-edit skill). Use this template for story-telling and explainer films, or when he
names it.
