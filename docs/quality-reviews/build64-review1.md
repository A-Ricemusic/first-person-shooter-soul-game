# SOULFALL Build 64 — independent visible review 1

Exactly **two ordinary attempts, both terminal deaths**. Played the normal `http://127.0.0.1:5173/` through browser-timed controls in `tools/visible-playtest.mjs`. No source, other reports, hidden state, grants or debug URLs were consulted. This is paused synthetic visible play; it does not certify human enjoyment, audio or performance. Startup reported software WebGL fallback.

| Attempt | Actual outcome | Visible result | Evidence |
|---|---|---|---|
| 1 | Death at 01:01 | Mara and Sera recovered; 1 elimination; 7% accuracy; score 2,180 | [Terminal](../media/build64-review1/attempt1-east-run.jpg) |
| 2 | Death at 00:56 | Elian recovered; 1 elimination; 11% accuracy; score 1,100 | [Terminal](../media/build64-review1/attempt2-heart-recover-fight.jpg) |

## Ratings

0–10 scale: 0 unusable/absent; 5 functional but materially rough; 8 strong polished slice; 10 exemplary shipping standard. AAA readiness rates observed readiness against a large commercial FPS presentation/usability bar, not project potential.

| G gameplay | P presentation | U usability | Readability | AAA readiness |
|---|---|---|---|---|
| 6 | 7 | 6 | 6 | 3 |

The mission supports meaningful movement, recovery and combat decisions, and both attempts reached different receivers. The opening centered optic was easy to understand: firing produced a critical elimination ([opening](../media/build64-review1/attempt1-opening-fire.jpg)). Subsequent misses remained expensive. My first sentinel burst missed, later fire still left the elimination count at one, and health fell while I tried to aim ([miss and damage](../media/build64-review1/attempt1-sentinel-aim.jpg)). These are retained player errors, not proof of broken hit detection. I used Shift but neither terminal summary credited a phase evade.

Presentation is the strongest observed part: a coherent cyan/amber palette, wet floor lighting, rain, big environmental typography and the relay landmark give the station identity. The [title screen](../media/build64-review1/menu.jpg) is particularly composed. In-world geometry and enemies remain visibly simple, and the same gray cover vocabulary repeats. That gap, short tested content and unverified endgame prevent a strong AAA readiness judgment.

First friction was forward travel stopping at low cover during the west approach. I initially spent movement time without closing much distance ([blocked approach](../media/build64-review1/attempt1-archive-approach.jpg)); Space corrected it and recovery succeeded ([Mara](../media/build64-review1/attempt1-vault-recover.jpg)). The map usefully labels low cover as blocking movement and shows receiver reach ([map](../media/build64-review1/attempt1-west-map.jpg)). Still, on the east attempt I again needed a lateral correction and vault. The distinction between walkable-looking floor, cover and the intended approach took deliberate map checking.

Recovery communicates success well through a memory card, objective change and supplies. Its proximity envelope was less clear in the moment: “NEARBY” at 5.1 m and later 4.8 m still left my held E unsuccessful ([nearby](../media/build64-review1/attempt2-heart-correction.jpg), [closer](../media/build64-review1/attempt2-heart-close.jpg)). I then moved and tried again, dying without Sera. Distance alone was insufficient for my synthetic approach; this does not establish that the prompt was factually wrong. The map and trace were available aids, but I did not exhaust them.

Attempt 1 recovered Mara, overshot the Heart into its rear wall, corrected backward/laterally, recovered Sera under fire, and died trying to cross east. Attempt 2 deliberately explored the east side first, missed a distant target, corrected around cover, recovered Elian, overshot toward the Heart wall, then spent time finding receiver range under attack and died. All intermediate captures and driver transcript evidence remain under [the evidence directory](../media/build64-review1/).

Coverage: title, deployment/redeployment, rifle ADS/fire/reload, movement/sprint/vault, Shift, facility map, memory recovery and death summaries. Pump was selected and fired briefly in the final attempt. No win, all-three-memory state, jammer disable, extraction, settings, sustained pump combat, narrative reading or audio assessment was completed. Poor aim and long synthetic batches limit difficulty conclusions. Pauses allow deliberation unavailable in continuous human play; screenshots and software rendering cannot support a performance claim.

## Cleanup

Owned startup PIDs were driver **94405** and Chrome **94415**. Sent exactly `{"op":"close"}`; driver reported `browserClosed:true` and exited **0**. `ps -p 94405,94415 -o pid=,comm=` then returned no output, exit **1**, confirming those exact owned PIDs absent. No unrelated browser was killed. [Retained cleanup record](../media/build64-review1/cleanup.json).
