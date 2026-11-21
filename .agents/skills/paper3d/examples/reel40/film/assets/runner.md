# runner (`KIT.make('runner', opts)`)

A whole person running an easy run: 165 steps a minute, 3.0 m/s, 2.2 m per gait cycle (1.1 m a step). Real size
1.78 m. Fitted charcoal tee with a rib crew neck, black running shorts with a curved side split and a small
reflective tab, low light-grey socks, running shoes with a dark knit upper, a light midsole, a white edge line and a
reflective heel strip and pull tab. Medium-brown skin with a soft sheen, short dark hair with a real hairline, a calm
head with no face (a hint of a nose, ears). Loosely closed runner's fists, thumb resting on the index finger.

One skinned body on one 17-bone skeleton (GPU skinning): no gap can open at a shoulder, elbow, hip or knee. Hands,
head, hair, socks and shoes ride rigidly on their bones. About 128k triangles.

Local frame: feet on y = 0 when standing, faces +Z, metres.

**His LEFT side is +X.** A person facing +Z in a right-handed frame has his left hand on +X. (legs.js says "R is the
+X side"; that is a mirror image, and a watch worn on its "left" would read as being on his right wrist.) Everything
named `L` (wristL, handL, footL, his left foot striking at run = 0) is on +X. Option `leftX: -1` swaps the sides.

## Options
| option | default | meaning |
|---|---|---|
| `leftX` | `1` | the X side of his left arm and leg (`-1` = the old legs.js convention) |
| `watchY` | `'across'` | frame returned by `wristL` (see below). `'fingers'` = watch +Y points at the fingers |
| `watchStub` | `false` | show a placeholder 46 mm watch + band on the left wrist (preview / checks only) |
| `skin`, `tee` | `'#85573d'`, `'#323843'` | colours |
| `look` | `'all'` | preview cameras only: `'all'` \| `'gait'` (side strip, group moves, foot must not slide) \| `'wrist'` \| `'front'` \| `'detail'` \| `'joints'` |
| `keys`, `states` | | preview only: six camera keys and six state objects (like iphone.js) |

## State (`defaults`)
| state | default | meaning |
|---|---|---|
| `run` | 0 | gait phase in cycles (1 cycle = 2 steps). His LEFT foot strikes at run = 0, 1, 2 ..., his right at 0.5, 1.5 ... **The film moves him:** `group.position.z = z0 + 2.2 * run`; a planted foot then stays exactly where it landed (checked numerically: contact rolls heel to toe with no slide, strikes 1.1 m apart). 165 steps/min: `run = t * 1.375`. |
| `still` | 0 | 0..1 blend to standing relaxed (feet 20 cm apart and flat, arms hanging, no lean). Blend it in while `run` holds still, or the feet slide. |
| `arms` | 1 | 0..1 scales the arm swing (0 = arms held bent at about 90 degrees, not swinging) |

What the run does, per cycle: stance 0..0.31 of the cycle per foot (heel lands 8 cm ahead of the body's centre,
rolls flat, heel rises, toe pushes off), two flight phases (run 0.33..0.48 and 0.83..0.98: both feet off the ground),
heel kick to 35 cm, knee drive to about 40 degrees, the hips bob 6 cm twice a cycle (lowest at run 0.12 and 0.62,
highest in flight), trunk lean about 6.6 degrees (pelvis tipped forward plus spine), pelvis turns 5 degrees with the
forward leg while the shoulders turn 6 degrees the other way, the head stays level looking ahead. Arms: elbows 71..103
degrees, the upper arm swings from about 38 degrees back to 17 degrees forward, opposite to the legs (left arm back
when the left foot lands); the front hand rises to about 1.21 m (lower chest) and comes in toward the midline, the
back hand passes the hip. Forearms turned about 35 degrees palm-down, so the watch face looks out and up.

## API (runner local frame, for the pose of state `s`)
These call `apply(s)` to pose the skeleton, so call them from a shot's `update` (shots run before the frame's own
`apply`, which then restores the frame's pose). Pass `null` to read the pose last applied.

- `wristL(s)` -> `{ pos: [x, y, z], quat: [x, y, z, w] }`: the watch centre on the back of his left wrist, 32 mm above
  the wrist joint, case back on the skin (25.5 mm from the forearm axis). Frame: watch **+Z = away from the skin**,
  **+X (crown side) = toward his fingers**, **+Y (12 o'clock) = across the wrist** (toward the little-finger side), so a
  band attached at +-Y wraps round the wrist, the way a real watch is worn. With `watchY: 'fingers'` +Y points at the
  fingers instead (only right for a watch model whose band attaches at +-X). Attach the watch with
  `watch.group.position.fromArray(w.pos); watch.group.quaternion.fromArray(w.quat)` as a child of `runner.group`.
  The wrist there is 58 mm wide x 42 mm thick (a 46 mm case spans most of it).
- `wristR(s)`: the same on the right wrist.
- `point(s, name)` -> `[x, y, z]`: `heart` | `head` | `hip` | `wristL|R` | `handL|R` (centre of the fist) | `elbowL|R` |
  `shoulderL|R` | `kneeL|R` | `ankleL|R`. For the orange arm-swing trace sample e.g. `point({ run: r }, 'wristL')`
  for r in 0..1 (add `2.2 * r` to z if the trace should follow him down the road).
- `_soles(s)` (debug): lowest sole point of each foot `[yL, zL, yR, zR]`.
- `size`: `{ height 1.78, hip 0.895, stride 2.2, step 1.1, cadence 165, speed 3.025, shoulder 0.356, upperArm 0.305,
  forearm 0.26, thigh 0.405, shin 0.40, wrist { w 0.058, t 0.042 }, watch { w 0.039, h 0.046, d 0.0097 } }`
- `skeleton`: the THREE.Skeleton (bones: pelvis, spine, chest, neck, head, then shoulder/elbow/hand for +X, -X, then
  thigh/shin/foot for +X, -X).

## Anchors (standing pose, `still = 1`)
`chest` = `heart` (inside the chest, 2.8 cm to his left of centre, 4.5 cm in front of the spine line, y 1.31),
`head` (centre), `wristL`, `wristR` (watch centres), `handL`, `handR`, `footL`, `footR`, `hip`, `top` [0, 1.78, 0],
`ground`. While running use `point(s, ...)` instead: the body bobs and leans.

## Preview
`tools/preview.sh runner` (side, front-quarter, other side, two wrist close-ups while running, then the still pose;
the demo adds the watch placeholder). `tools/preview.sh runner '{"look":"gait"}'` (side strip, the group moves 2.2 m a
cycle: the planted foot holds its place). Also `'wrist'`, `'front'`, `'detail'` (head, shoulders, hips in knee drive,
hand), `'joints'` (elbow at full bend, shoulder at full back swing, hip at toe-off, knee at heel kick).

## Known limits
- Linear-blend skinning: at the deepest knee bend the back of the knee folds in on itself (as flesh does); the shorts
  crease at the front of the hip in the knee drive. Both read as natural at normal distances.
- The tee and shorts do not flutter; cloth is skinned, not simulated.
- `still` blends the pose, not the travel: hold `run` (and the group's z) still while blending, or the feet slide.
- No floor of its own (the film's road catches the shadow).
