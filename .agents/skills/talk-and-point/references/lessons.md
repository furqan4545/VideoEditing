# What reel 31 taught (17 Nov 2026)

## Framing his vertical take
- Full frame at the plain fill zoom put the captions (y ~1470) on his chin. The base frame is `Z0*1.08` centred at world
  y 1035: his chin lands at screen ~1270, the captions on his shirt. Edges: `st` k ≥ 1.0 and `face` k ≥ 1.03 show none.
- Punch-ins centre at world y 1000 (`face`), not on his eyes, so the chin stays above the captions.

## Fingertip pins
- "Index finger straight" picked the hand holding the selfie stick. The hand he points with is the one RAISED: take the
  highest index tip that is above its own wrist, and drop anything below take y 1420.
- A pin that follows his finger landed on his face three times (OpenMausBot tile, Cursor icon, the switch, the chip): his
  finger is often next to his face or pointing at the lens. Use fixed spots that read as "where he points": above his head
  for a raised finger, on his chest just above a finger pointed at the lens, beside his head for a finger up at the side.
- A tracked finger appears for short runs (0.3-1 s). `FG_pos` averages finger-or-rest over ±0.2 s so a pin glides instead of jumping.

## Camera
- Several keys came out of order (a hold key after the next whip's landing), so whips fired late or jumped. Rule: hold key
  at `T1(prev) - 0.3`, landing at `T0(next) + 0.08`; camera.js logs any key that is not after the one before.
- A close-up on a dark app card pushed its bottom edge into the caption band (captions flipped to white on paper, or black
  on dark). Use `fy` so the dark card's bottom edge stays above screen y ~1380 (reel 31: `fy: 600` for the list close-ups).
- A chat window much taller than the screen left a big empty dark area while the message typed; a window about one screen
  tall (1500 x 1240) at zoom 1.0 shows its header, the chat and the composer together.

## Story beats vs his takes
- He sent the message at the end of a line and the next line ("Keep your laptop awake") was on camera, so the "Every Monday
  becomes a schedule card" beat moved to the line after, landing as he says "every Monday morning".
- He skipped the script's placeholder line (the top complaint): the picture carries it (the top row lit). Tell him.

## Sound
- Mixer drops can land on a later word: `--drop "N1a+0.2:19.84"` (0.2 s into the piece = "here's" after a silent "Now").
- Two whooshes within 0.22 s collapse into one; earshot then reports a whip "without a hit". Space them or accept it.

## Sharing the Mac
- Four sessions shared one heavy lock. Waiters that slept 20-30 s lost it to faster ones again and again; `tools/heavy.sh`
  polls every second. Batch steps per hold: tone-map + Whisper; cut + turbo words + pauses + hands + matte; fix frames + Whisper.
- Render speed with motion blur and screenshot cards: ~1.4 frames/s on 6 workers (60 s ≈ 21 min). Re-rendering a few
  stretches with `--resume` takes under a minute.
