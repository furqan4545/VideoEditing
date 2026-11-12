# Reel 15 sound: what was decided and why (stage 1, 13 Nov 2026)

Run: `~/.local/share/earshot/.venv/bin/python sound/prep_sfx.py` (once), then `... sound/mix.py [--events sound/events.json]`.
`sound/events.json` is PROVISIONAL (from film/STORYBOARD.md). Replace it with the film's own list ([{t, kind, note, dur}]).

## Music: main_loud_hanZimmer.mp3 (Ali's folder)
earshot rank vs "cinematic, curious, slow build, science documentary underscore, modern film score": Zimmer z +2.8 (plausible,
"cinematic orchestral music"), stay +2.6, Solace +2.3, biting bullets +2.0, stay_v2 +1.9, Every Living +1.8, struct +1.6, Timeless +1.2.
Song map (measured): ticks every 0.625 s; a bass note every 10 s at 19.91 / 29.91 / ... / 129.93; the build 137.5-164; the wave
breaks at 166.10; organ cycles of 16 s with a bright first chord at 212.8, 226.6, 242.1 ...; the last warm swell at 468.75.
Cut (song -> film), all joins are crossfades on those landmarks:
- S1 206.35-219.45 -> 0.00-13.10: organ tail under the hook, first chord of the next cycle lands at 6.45 (camera out at the gates)
- S2 116.01-178.01 -> 11.27-73.27: quiet ticking section (bass notes at 15.2, 25.1), build from 35.5 (bass note on "the gate fires"),
  wave breaks on the main alarm (166.10 = T_ALARM), natural decay to 71
- S3 99.51-117.54 -> 72.45-90.48: ticking section, bass note on "One man" (72.97) and on "its alarm rang" (83.0)
- S4 468.25-473.02 -> 89.93-94.70: the song's last swell under the last line, 0.8 s fade to the end
Thinned to a held, low-passed note (never silence): 46.2-48.3 (-10 dB) and 71.45-72.4 (-9 dB).
A slow contour gain puts the music's own 3 s loudness on the film's curve (see CONT in mix.py). T_ALARM and the hook landing are read from the events.

## Effects (real recordings; cut clips in sound/sfx/cut/, sources in sound/sfx/src/)
Dropped after earshot: every thud (toy-drum z 3.2-4.2: box, case, cloth pat, footsteps), the whammy "ruler twang" (cartoon boing z 3.9),
bass-drop whoomp (cartoon z 3.3), water rinse ("toilet flushing" z 3.8), hinge creak ("bird chirping"), mains / EMF hum
("error buzz" z 3.5-4.6, p_real 0.03-0.06), reversed-metal riser (p_real 0.43), microwave beeps as an alarm (z -0.2).
So there is NO sound for: the ruler, the swing, the washing machine, footsteps, shoes as thuds.
The library has no retail gate alarm: the alarm is a real 3.9 kHz piezo beep (InMotionAudio, Medical Thermometer Beep11) repeated like a
gate sounder (4 beeps = 0.91 s, 6 beeps = 1.32 s): earshot "shop security gate alarm beeping" z +2.6 / +2.9.
