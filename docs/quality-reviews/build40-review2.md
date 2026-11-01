# Build 40 — independent ordinary reviewer 2

Provisional ratings, based on exactly two normal terminal attempts at http://127.0.0.1:5173/: Gameplay **6.5/10**, Presentation **7/10**, Usability **6/10**, Replayability **5.5/10**, AAA-readiness **3.5/10**. These are separate judgments, not a perfect-score target.

## Method and evidence

Used `npm run playtest:visible -- --out docs/media/build40-review2` in a TTY after reading its help. Only normal UI clicks, movement, looking, firing, ADS, reload, recovery, map and dash inputs were used. Read the visible handbook and later recovered records. No source, tests, prior reports, hidden geometry, arbitrary JavaScript or internal state were inspected. Evidence is in `docs/media/build40-review2/actions.jsonl` and the accompanying screenshots. Installed Chrome used the authorized software-WebGL fallback; this is not hardware/backend certification. No audio assessment was possible through this screenshot-driven session.

## Terminal attempts

| Attempt | Outcome | Memories | Eliminations | Mission time | Score | Accuracy | Critical eliminations | Phase evades |
|---|---|---|---|---|---|---|---|---|
| 1 | OPERATOR LOST | 3/3 | 1 | 01:12 | 3,100 | 16% | 0 | 0 |
| 2 | OPERATOR LOST | 3/3 | 3 | 01:24 | 3,535 | 4% | 2 | 1 |

Attempt 1 fired at the introductory guard, then used the paused facility map and routed west → heart → east. West recovery restored supplies. I pushed into medical-area walls and spent multiple movement commands against obstruction while being attacked; health fell to 58. I overshot the heart receiver and held E out of reach before correcting the route. A later dash produced the visible `PHASE BREAK · SHOT CANCELED` feed. I collected all memories, retreated toward extraction and arrived at 72 health/16 shield with `UPLINK 0% · NEAR EDGE: MOVE INWARD`. I stepped backward and waited, then died before establishing a successful hold. The last snapshot cannot establish exactly how much upload progressed before death. See `a1-map.jpg`, `a1-heart-route.jpg`, `a1-heart-recover.jpg`, `a1-extraction-route.jpg`, `a1-terminal-or-hold.jpg`.

Attempt 2 tried ADS and more combat, routing east → heart → west. I held fire far longer than useful during the opening approach, wasting ammunition and contributing to the low final accuracy. Low cover repeatedly blocked movement; I had to step sideways around it. Near engineering I naturally encountered an amber cabinet labeled to shoot its isolator. I fired two rounds at very close range and dashed backward. The next view showed a dark/spent cabinet and eliminations increased from 1 to 2, with health still 100 and shield increasing from 41 to 59. A discharge kill is plausible, but the burst itself was between captures and I cannot conclusively attribute that elimination. I did not test the other bank or every protection case. See `a2-cabinet.jpg` and `a2-discharge.jpg`.

At the heart I fired near the warden optic with ADS; eliminations rose to 3. Recovery and regeneration repeatedly rescued the run. I again held E just outside a receiver ring before moving closer. After all three memories I returned toward extraction at 58 health/0 shield, stepped backward toward its center and used a stationary dash plus fire. That dash may have moved me forward away from the intended hold; I cannot reconstruct the exact terminal position. I died at 01:24. This was a player/input mistake, not evidence of a broken extraction system. No third deployment occurred.

## Observations behind the ratings

Gameplay has a clear, compact recovery-and-extraction loop. A regenerating shield, receiver supply restoration, precise optic shots, dash charge interruption and explosive cabinets provide several meaningful options. Moving quickly let me recover all objectives despite leaving many enemies alive; surviving the exposed extraction was the real failure point in both runs. Sparse snapshots and overly long fire/movement commands made my play less effective than continuous mouse-and-keyboard play. I did not prove the game's difficulty excessive. Combat felt promising but this sample did not establish enough enemy/weapon variety or a sustained encounter arc for a higher rating.

Presentation has a cohesive stormy industrial mood: teal/amber lighting, wet-floor reflections, rain, bold editorial title treatment and a striking central relay. The title, end screen and recovery cards are consistent and readable. The facility is visibly geometric, with simple robot silhouettes and repeated box-like cover. Close contact with cabinets/walls can fill nearly the whole view with a flat surface. That makes the gap between a polished menu and the simpler playable space noticeable. These screenshots do not support AAA visual or animation claims.

Usability benefits from persistent objective counts, compass, signal distance, map, recovery prompts, shield/ammo numbers and the explicit extraction edge warning. The map's distinction between walls and low cover helped planning. The handbook explains unusually specific mechanics clearly, though it is a large block of instructions to absorb before playing. Several times a signal marker pointed toward a receiver behind cover while the best path was unclear, and my E holds failed until I moved inside the ring. The move-closer message was helpful. Directional threat cues indicated pressure without giving me enough continuous feedback here to confidently prioritize every attacker. Long command gaps are a limitation of this review method.

Replayability comes from trying another route and improving optic/dash use; my second run had more kills and critical eliminations despite another loss. Recoverable character records add human context and remained accessible after death. However, the visible scope is one mission with three receivers and a short hold, and two runs already exposed the same broad progression. I did not observe alternate missions, substantial progression or long-term variety.

AAA-readiness is substantially below the other ratings because a coherent vertical slice is different from a broad, production-finished release. The mood and UI are strong foundations; this sample offers no basis to certify animation breadth, audio, accessibility, controller support, hardware performance, content scale or reliability across devices. No page errors were reported in successful driver responses, but that narrow observation is not a general bug-free claim.

## Preserved errors and uncertainty

An attempted `Shift` driver key was rejected as unsupported before a successful `ShiftLeft` retry; this was a driver-input error. A broad RETURN button selector matched multiple buttons, and the queued Deploy Again click was then blocked by the open records dialog. I closed the visible dialog using its button and deployed exactly once more. These errors are preserved in the action log and are not counted as extra game attempts or game defects. Inputs release before capture, so ADS can be absent in screenshots; auto-Escape paused after actions and closed the map. Game time advanced before some initial captures/commands, so elapsed terminal time is reported from the end screens rather than inferred from wait durations.

## Cleanup

Explicit `{"op":"close"}` returned `browserClosed:true`, driver PID **94373**, Chrome PID **94374**, with process exit **0**. A subsequent `ps -p 94373,94374 -o pid=,ppid=,command=` returned no output and exit **1**, confirming both exact owned PIDs were absent. No global process kill was used. Source and settings were unchanged.
