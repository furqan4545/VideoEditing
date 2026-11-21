export const meta = {
  name: 'reel40-v3-frame-audit',
  description: 'Audit reel 40 v3 frames for empty areas, off-centre subjects, unreadable captions and glitches (4 agents, one per 30 s)',
  phases: [{ title: 'Audit', detail: 'one agent per 30 s of the film' }],
}
const FILM = '/Users/topg/Desktop/Desktop - topg’s MacBook Pro/VideoEditing/downloads/reel40/full/out/film_v5_silent.mp4'
const SCRATCH = '/private/tmp/claude-501/-Users-topg--claude-spares-spare-4gJxdC/d5f0fc82-5bb7-4d0a-9617-a8328d7db910/scratchpad/audit3'
const LINES = `Voice lines (start-end s): hook 1.2-6.3 "Your Apple Watch doesn't actually feel your heartbeat. It watches your blood, using green light." (Apple photo on the watch peels away, the hand, a laser cuts the wrist open, green light pours in) | run 7.0-11.9 runner, watch says 155 | how 12.3-16.0 | leds 16.7-21.3 under the watch: its green lights | green 21.9-28.2 one blood cell in a vein, white beam, red bounces, green swallowed | skin 28.9-36.2 INSIDE the skin under the watch | clever 36.9-38.8 | beat 39.5-49.1 inside, vessels swell | rate 49.6-56.4 out to the watch on the hand, green line, then the watch face 155 | problem 57.1-63.1 runner arm swing, back to the cut: the vein rocking | rhythms 63.7-73.9 two lines green/orange above the watch | steps 74.2-77.8 face 165 | motion 78.3-86.3 motion sensor chip, orange line thrown away | nobody 87.2-89.4 under the watch, green glow | bp 90.1-93.9 face shows the alert, Apple's real alert photo | hose 94.5-103.8 garden hoses | bulge 104.3-111.2 watch over the vessel, 30-day calendar | payoff 112.0-116.8 runner | follow 117.3-118.9`
const SECTIONS = [[0, 30], [30, 60], [60, 90], [90, 120]]
const SCHEMA = {
  type: 'object',
  properties: {
    section: { type: 'string' },
    issues: { type: 'array', items: { type: 'object', properties: {
      t0: { type: 'number' }, t1: { type: 'number' },
      kind: { type: 'string', enum: ['empty-area', 'off-centre', 'caption-unreadable', 'glitch', 'other'] },
      description: { type: 'string' }, severity: { type: 'string', enum: ['high', 'medium', 'low'] } },
      required: ['t0', 't1', 'kind', 'description', 'severity'] } },
    good: { type: 'string' },
  },
  required: ['section', 'issues', 'good'],
}
const results = await parallel(SECTIONS.map(([a, b]) => () => agent(
`You are auditing one 30-second section (${a}-${b} s) of a vertical 1080x1920 reel (a 3D explainer film about how the Apple Watch reads your heartbeat with green light). This is version 3. The editor (Ali) rejected version 2 for: "why the hell we have empty area? why everything is pushed down, use full vertical screen ... bring everything to center", and "captions are black so they get hidden on black surface ... make caption slightly bold". He also asked to "start with the hand, cut it open, show the veins then go inside". Find EVERY remaining moment in your section with problems, with timestamps, so they can be fixed before he sees it.

Film: "${FILM}" (quote the path: it has a curly apostrophe and spaces). Work in your own folder "${SCRATCH}/s${a}" (mkdir -p it). Do not modify anything outside it.
1. Extract frames at 2 fps for your section, small: ffmpeg -v error -ss ${a} -t ${b - a} -i "$FILM" -vf "fps=2,scale=270:480" "${SCRATCH}/s${a}/f_%03d.jpg"  (frame n is at ${a} + (n-1)*0.5 s).
2. Tile them into contact sheets (e.g. ffmpeg -i f_%03d.jpg -vf "tile=6x2" sheet_%02d.jpg) and LOOK at every sheet with the Read tool. Open single frames at 540x960 where you need a closer look, and extract 10 fps around any transition that looks odd.
3. Judge each moment against:
   - empty-area: a big region (about a third of the frame or more) with nothing in it (flat colour, plain paper, fog) while the subject is squeezed elsewhere; blank paper during a camera move.
   - off-centre: the thing the voice is talking about sits at an edge, is small, or is cut by the frame.
   - caption-unreadable: captions (a few semibold words; dark ink on light areas, white ink with a dark halo on dark areas, or dark ink on a frosted white pill) that are hard to read, or that cover the key thing on screen.
   - glitch: wrong frames, objects cutting through each other, pops, flicker, blown-out white blobs, things showing through other things.
   - other: anything a picky editor would hate (unclear what we are looking at, ugly or fake-looking models, labels too small).
   Intended on purpose (do not report as a glitch unless it looks broken): the camera pushes INTO a watch's glass and comes out of another watch's glass (a watch screen fills the frame for a moment); a soft green or skin-pink flash fills the frame when the camera dives into the skin or comes out.
${LINES}
Return the structured result: every issue with t0/t1 in film seconds, kind, a concrete description of what is on screen and what is wrong (where in the frame, how much is empty), and severity. In "good", say in one or two sentences which moments work well. Be specific and honest; do not pad.`,
  { label: `audit ${a}-${b}s`, phase: 'Audit', schema: SCHEMA })))
return results.filter(Boolean)
