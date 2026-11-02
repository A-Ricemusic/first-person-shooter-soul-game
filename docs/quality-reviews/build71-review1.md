# Build 71 — raw ordinary reviewer 1

Exactly two actual terminal attempts, both fresh, normal http://127.0.0.1:5173/. No anchor-assisted attempt. Ordinary visible controls, menu, map and screenshots only. No source, prior reports, dossier, helper source, hidden state, test URL, boosts, teleport, arrangements, settings edits, runtime edits, tests or build. Helper --help was read; default browser-timed synthetic controls and software-WebGL fallback used. RMB preceded all look actions; individual look deltas <=2400. captureHeld was never used. Actions and all live/terminal photographs retained in docs/media/build71-review1/actions.jsonl and adjacent JPGs.

## Actual outcomes

| Attempt | Start | Terminal | End UI mission/cumulative play time | Recovered | Kills | Score | Accuracy | Critical eliminations | Phase evades | Uplink retries |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Fresh | OPERATOR LOST / THE STATION REMEMBERS. | 01:14 | Mara Solberg | 1 | 1,255 | 8% | 1 | 1 | 0 |
| 2 | START FRESH from attempt 1 end | OPERATOR LOST / THE STATION REMEMBERS. | 01:17 | Mara Solberg, Elian Vale, Sera Nord | 2 | 3,435 | 16% | 2 | 1 | 0 |

These are the exact end UI times; UI labels these CUMULATIVE PLAY TIME. No anchor time was added or inferred. Attempt 2 exposed RETRY FROM UPLINK, but I did not use it. Exactly two ends, no third attempt.

Attempt 1 actual end evidence: attempt1-end.jpg, action sequence18 beforePause and after both phase end. Attempt2 actual end evidence: attempt2-end-check.jpg sequence38 and attempt2-terminal-final.jpg sequence39, both phase end. Misleading filename attempt1-terminal-check.jpg sequence16 is a LIVE recovery photograph (01:05), not an outcome. Likewise attempt2-all-cores.jpg sequence33 is live and had only two cores; actual third recovery is attempt2-elian-secured.jpg sequence34. Filenames express intention, not proof.

No capture-to-pause deaths occurred: both terminal transitions were already phase end before photography. Default photographs release inputs before capture; photo-to-Escape pause time can still admit damage. This scheduling limitation applies throughout; health/time values are recorded as observed, not attributed exclusively to my requested wait durations.

## Observations and mistakes

First optic critical kill was easy to understand. In attempt 1 I took 23 shots for the guard, then repeatedly walked into archive cover/walls, made an unsuccessful recovery hold at 4.6m, and used Shift near the receiver while facing away. Small reach corrections took several tries under fire. I recovered Mara at01:05 with33hp and died en route to the Heart at01:14. I used the paused facility map once; its walls, cover legend and objective positions were readable.

Attempt2 repeated the induction kill, reached archive at00:11, missed shots against a sentinel, and recovered Mara00:21. I again entered a corner heading to the Heart, backed out, and found the open yard. Heart warden optic/Shift kill gave the second elimination. Recovered Sera00:51, Elian01:03. Small reach corrections again cost time/health, including 0.1m outside-reach messages. Those messages were useful, but my direction choices often overshot or approached from the wrong side. ADS held while moving slowed my initial approaches; releasing it made the sprint approach much faster.

Reached Custodian at01:06 with35hp35shield and coils100/100/100. Fired at coil1 and saw it OFF at01:10; fired at coil2 and saw INERT COVER at01:14, with12hp. Reloaded and attempted coil3, died01:17. Coil3 destruction not observed. Upload deck entry/progress/decay/completion not covered. No victory. No earned anchor attempted. Pump breacher, crouch, sustained Tab trace and recovered-memory reading not covered. Rifle reload, sprint, vault attempt, Shift, ADS, pickup/recovery, map, fresh restart, all three archives and two coil destructions covered.

## Raw ratings

Scale for every category: 0 unusable/absent; 2 severely deficient; 4 weak; 5 functional but mixed; 6 promising with clear shortcomings; 7 good; 8 strong; 9 excellent; 10 exceptional finished benchmark. AAA-readiness additionally means observed production completeness and polish, not ambition or technical branding.

- Gameplay: **6.5/10**. Optic targeting, Shift interruption, recoveries and coil windows give distinct decisions. The second run improved substantially from learned routes. I spent too much of the sampled play correcting collision/navigation and tiny reach errors, and often absorbed damage from enemies outside my view. Cannot certify real-time enjoyment from this paused synthetic session.
- Presentation: **7.5/10**. Strong teal/amber identity, wet ground, large relay landmark, coherent weapon silhouette, deliberate typography and clear recovery cards. Enemies and architectural surfaces remain visibly simple; near-wall views frequently consumed the frame. Audio not assessed.
- Usability: **6/10**. Controls, paused map, distance and explicit outside-reach text helped. Recovering at the threshold repeatedly needed corrections, and an objective marker did not itself communicate the usable approach. Fresh restart was straightforward; earned anchor option was clear but untested.
- Readability: **6.5/10**. Bright optic, coil OFF state, shutter text, health/ammo and core count were useful. Small map/utility text and multiple competing messages require attention; occlusion and offscreen threats made it difficult for me to resolve attacks while navigating.
- AAA-readiness: **4.5/10**. Coherent vertical-slice presentation and meaningful mechanics are visible. This limited coverage does not establish a complete, varied, polished commercial experience; I did not finish upload, assess audio, hardware performance, broad reliability or accessibility. Simple enemies/surfaces and sampled movement friction keep my observed readiness modest.

Scores are my raw observations from these two attempts only, with no target score. Software-WebGL, pauses and synthetic DOM controls do not certify enjoyment, audio quality, latency or hardware performance. No page errors were reported in the visible action responses.

## Cleanup proof

Owned driver PID26344; owned Chrome PID26354 (ready event). Explicit op close sent after second terminal capture. Driver returned closed reason 'input ended or close requested', browserLaunched true, browserClosed true. Awaited PTY session61050 completion: exit_code0. Then ps -p 26344,26354 -o pid=,ppid=,command= returned no rows and exit1, proving both exact owned PIDs absent. No global process kill or unrelated termination. No changes implemented.
