# Build 40 independent ordinary review 1

Reviewed 2026-11-01 at normal http://127.0.0.1:5173/ using the visible driver and installed Chrome software-WebGL fallback. Exactly two deployments, both terminal losses. No source, tests, hidden state, test routes, or arbitrary JS inspected. Ratings are provisional, based on this limited play, without a perfect-score target.

| Area | Rating / 10 |
|---|---:|
| Gameplay | 6.5 |
| Presentation | 7.5 |
| Usability | 6.5 |
| Replayability | 5.5 |
| AAA-readiness | 3.5 |

## Raw outcomes

1. **OPERATOR LOST**, 00:39, score 255, 1 elimination, 2% accuracy, 1 critical elimination, 1 phase evade. No memories recovered. Walked past the induction guard, fired into empty space, turned back and killed it with optic fire. Consulted the facility map, moved north/east, overshot and circled the east receiver while under fire. Repeated recovery input outside receiver reach produced the approach reminder. Lost shield, then health; fired many missed rounds and died while strafing/firing with a dash.
2. **OPERATOR LOST**, 00:53, score 3,355, 2 eliminations, 9% accuracy, 1 critical elimination, 1 phase evade. Killed the initial guard from spawn using ADS/fire, then a west Sentinel. Recovered Mara Solberg (west), Sera Nord (Heart), and Elian Vale (east). Missed the distant Sentinel near the west exit; took damage while advancing. Dashed north, collected Heart without killing its guard, then crossed to east. Recovered all three and returned to extraction. At 00:49 the HUD reported approximately 33% uplink, 2.1 m distance, and “NEAR EDGE: MOVE INWARD”; screenshot showed 35%. Moved forward briefly, turned toward the yard, dashed and fired, then died. The final dash may have carried me out of the ring; no intermediate capture establishes that, so this is uncertain. Did not win or observe completed extraction.

## Observations

- Strong, coherent stormy industrial look: rain, reflective wet ground, cyan lighting, amber optics, portal structure, restrained typography, readable end screen. The title presentation feels more finished than the simple blocky enemy silhouettes and repeated cover geometry.
- The opening guard gives an immediate combat lesson. Precise optic fire earned a critical kill on attempt 1; straightforward ADS fire killed it without damage on attempt 2. Dash displacement and recharge feedback were clear, but I did not verify a deliberate close charge-break/stagger.
- Recovering memories gave a satisfying progress signal and visibly restored supplies and health/shield. Three short personal records were accessible from the loss screen; they give the otherwise functional receivers some emotional meaning.
- Facility map was useful and explicitly paused the mission. World labels, nearest-core distance, route hints and ground arrows helped me improve markedly on the second run. Nevertheless, the first east approach was confusing: a nearby marker behind cover did not make the reachable approach obvious, and I overshot repeatedly.
- Threat arrows conveyed danger, including behind me, but distant tiny targets were hard to hit through this input/capture method. Most misses were plainly mine; I cannot infer a hit registration fault. I generally spent too long facing away from firing enemies.
- Extraction's floor ring, uplink percentage, and inward warning were understandable. Survival pressure escalated sharply there: I arrived with 100 health/47 shield, reached the ring, and died within several seconds. My choice to dash at the edge was likely poor. This does not establish unfair tuning.
- Naturally noticed amber engineering equipment beside the east receiver, after the handbook explained shootable capacitor banks. I did not deliberately shoot it, observe a discharge, test cover protection, or establish its tactical value. No explosion success should be inferred.
- There was visible improvement and a reason to retry after loss, but the two runs exposed one compact mission with the same landmarks. Long-term variety, alternative builds, enemy diversity and progression were not established.

## Limits and input record

The driver releases controls before capture and automatically pauses afterward; ADS appearance can differ from held-input play. This was segmented tool-driven play, not a continuous mouse/keyboard session, and screenshot viewing adds pauses. The first attempt initially used unsupported key spelling `Shift`, which produced a command error after preceding fire actions; subsequent dash input used `ShiftLeft`. That mistake is retained in the evidence. No settings were changed. No page errors appeared in driver results. Audio quality and hardware-rendered performance were not assessed; software fallback is not graphics/backend certification. A win, upload grace/decay, deliberate charge break, capacitor discharge and broader replay depth remain unverified.

Evidence: `docs/media/build40-review1/` contains screenshots and driver records, including `a1-lastfight.jpg`, `a2-terminal.jpg`, `a2-ring.jpg`, `a1-map.jpg`, and `memories.jpg`.

## Cleanup

Explicit `{"op":"close"}` returned `browserClosed:true` for owned driver PID 93350 and Chrome PID 93351; driver session exited 0. `ps -p 93350,93351 -o pid=,ppid=,command=` returned no rows and exit 1, confirming both owned PIDs absent. No global kill was used.
