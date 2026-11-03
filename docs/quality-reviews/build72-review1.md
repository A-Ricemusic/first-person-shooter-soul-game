# Build 72 ordinary visible playtest — review 1

I played http://127.0.0.1:5173/ at default settings, using only current helper help, visible UI, screenshots and the facility map. No source, previous evidence, other reports, debug URL or hidden state was consulted. Exactly two actual terminal attempts were made, both fresh starts; no earned-anchor continuation occurred. This is my single scoring pass.

## Terminal outcomes

| Attempt | Start | Outcome | End UI cumulative play time | Eliminations | Score | Accuracy |
|---|---|---|---|---|---|---|
| 1 | Enter the Storm, fresh | Operator lost | 00:37 | 1 | 1,180 | 8% |
| 2 | Start Fresh, fresh; HUD reset to 00:00 | Operator lost | 00:57 | 3 | 1,540 | 7% |

Both end panels label their mission time as cumulative play time. These are the displayed values, not wall-clock session duration. Both showed zero phase evades and zero uplink retries; critical eliminations were respectively 1 and 3. Mara Solberg was recovered in both attempts. I did not reach the other two archives, jammer or upload, and did not earn or test an anchor continuation.

## Raw experience

The title screen is visually coherent: strong typography, a rainy industrial backdrop and a short mission statement establish the mood immediately. The opening guard instruction gave me a concrete action. On attempt 1 I aimed upward slightly at its optic and fired too long: 24 rounds spent for one elimination. I reloaded and went diagonally left toward the west signal. The receiver proximity text was useful and precise: I initially held E outside reach, adjusted position, and recovered Mara around 00:20.

I then tried moving east and north toward the Heart, but collided with the archive wall/cover. The distance decreased without my reaching an entrance. Patrols depleted my shield and health while I was concentrating on navigation. Retreating south and trying east did not save me; the first terminal loss was 00:37. This was a real navigation and threat-management failure, retained in the evidence.

Attempt 2 used a shorter opening burst and moved into the central/east lane. I saw an interceptor directly ahead. My first downward aim and burst failed to eliminate it; I dashed and strafed, then turned west to locate two visible threats. A further burst while strafing earned my second elimination but left me at 69 health. I sprinted back toward the west archive, collected supplies along the way, and again bumped into walls before finding the south-side route. At the receiver I initially held E 0.8 m outside reach under fire. A short forward/right adjustment allowed recovery. A rightward burst earned a third elimination, but health had fallen to 34. I tried sprinting/dashing out, switched to the pump breacher, and fired while moving; I ran into another surface near the Heart route. Backing away and turning to fight ended in the second loss at 00:57, with 18 health visible just before the final batch. The pump firing did not produce a visible extra elimination.

The map clearly names archives, extraction and jammer, and its explicit low-cover legend is valuable. I still found it difficult to translate a nearby signal through occluding architecture into a usable entrance while under fire. The small route and threat labels compete with the larger HUD and world geometry. I saw clear health, ammo and recharge feedback. Reload timing caught me once: my 1.5-second pause still photographed the old magazine with RELOADING, and it completed in the following action.

## Scores

Scale: 0 = unusable/absent, 2 = severe problems, 5 = functional with substantial weaknesses, 7 = good with noticeable gaps, 9 = excellent and broadly polished, 10 = exceptional with no material issues in the covered experience. Scores describe only this limited session, with no target or expected score.

| Dimension | Score / 10 | Reason and coverage |
|---|---|---|
| Gameplay | 6 | Opening critical hits, patrol movement, reloads, supplies and dash create useful decisions. My two losses had understandable player mistakes, but combat while finding archive entrances became frustrating. Only the first recovery and early lanes were covered. |
| Presentation | 7 | Cohesive storm, cyan/amber lighting, strong title/end screens and a striking relay feature. Close views expose simple block geometry and repetitive flat surfaces; enemy forms and weapon presentation are less refined than the menus. No audio assessment or late-mission spectacle coverage. |
| Usability | 6 | Controls are printed, mission state is persistent, and the map genuinely helps. Precise reach messages resolved failed recovery attempts. Route interpretation under pressure was difficult, and some secondary text is tiny. Settings were left untouched. |
| Readability | 6 | Orange optics, directional damage cues, large vitals/ammo and objective markers communicate well. I repeatedly lost useful spatial context against close walls; small threat/route labels and marker direction alone did not reliably identify entrances. |
| AAA-readiness | 4 | A coherent playable slice with attractive UI and identifiable mechanics, but the covered environments, character/weapon shapes and navigation clarity do not yet convey a finished big-budget release. Full mission, audio, hardware performance and wider robustness remain unassessed. |

## Method and limits

Paused synthetic browser input through tools/visible-playtest.mjs, default browser input mode. RMB always preceded fallback look; I used the stated ADS sensitivity assumption 0.00125 (hip 0.002), with every individual look delta at most 1250 horizontally and 100 vertically, below 2400. No browser arrangement, controllers, resource changes or teleportation. Pauses between batches gave me more thinking time than continuous ordinary play; multi-second batches also made reactive aiming harder. Captures release inputs and then pause, so screenshot scheduling adds live time and a still is not a complete combat record. Reported screenshot capture times ranged approximately 19–308 ms in these results. The helper reported software-WebGL fallback, renderer not certified; this is not a GPU performance benchmark. No page errors appeared in returned results. Mistakes, misses and losses were retained without retrying or rescoring.

Evidence: docs/media/build72-review1/ contains the helper session artifacts and screenshots from menu through attempt2-last-fight.jpg. Key terminal images are attempt1-exit.jpg and attempt2-last-fight.jpg; attempt1-map.jpg records the facility map. Intermediate approach, failed reach, combat and collision photographs remain in the same directory.

## Cleanup evidence

Owned driver PID 30199; owned Chrome PID 30209. Sent explicit helper op close. The helper returned type closed with browserClosed:true, those exact PIDs and reason input ended or close requested. Awaited the owned driver session: exit code 0. Independently ran `ps -p 30199,30209 -o pid=,comm=` after exit; it returned exit code 1 with empty output, confirming both exact owned PIDs absent. No further attempt was started.
