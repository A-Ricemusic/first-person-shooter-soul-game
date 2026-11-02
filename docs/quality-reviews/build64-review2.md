# SOULFALL build 64 independent review 2

Exactly two ordinary attempts at http://127.0.0.1:5173/, using only the visible-playtest help/protocol, browser-timed controls, screenshots and visible UI. No source, other reports, hidden state, grants or arrangement were consulted. This is paused synthetic visible play; these ratings do not certify human enjoyment, audio quality or performance. Software-WebGL fallback was reported at startup.

| Attempt | Terminal result | Visible results |
|---|---|---|
| 1 | Death | 01:01; score 3,180; 1 elimination; 9% accuracy; 1 critical elimination; 0 phase evades |
| 2 | Death | 00:52; score 3,100; 1 elimination; 12% accuracy; 0 critical eliminations; 0 phase evades |

Both attempts recovered all three memories and reached the disable-Custodian objective, then died before completing it. Terminal evidence: [attempt 1](../media/build64-review2/attempt1-return-south.jpg), [attempt 2](../media/build64-review2/attempt2-custodian-return.jpg). No win was observed.

Ratings use 1–10: 1 unusable/absent, 5 functional with substantial friction, 8 strong polished slice, 10 exceptional finished commercial standard. AAA readiness uses the same scale with 10 meaning convincingly ready for a full-price AAA release, within observed coverage only.

| Dimension | Rating | Basis |
|---|---|---|
| G — gameplay | 6 | Recovery objectives and enemy pressure create clear stakes; I repeatedly failed to land useful fire while moving enemies depleted shields. Two losses are evidence of my failed play, not proof of unfair difficulty. |
| P — presentation | 8 | Coherent rainy industrial setting, cyan/amber palette, wet lighting and strong title/death screens. Repeated simple robot silhouettes and sparse close-up consoles limit the impression. |
| U — usability | 6 | Persistent controls, paused facility map and explicit interaction messages help. Receiver approach still required several corrections under fire. |
| Readability | 6 | Health/ammo, amber optics and recovery confirmations are clear. Small map symbols, edge direction markers and dense small text made immediate spatial decisions harder. |
| AAA readiness | 4 | Attractive vertical-slice identity, but my observed combat/navigation experience and limited demonstrated encounter variety do not establish finished AAA readiness. |

The strongest first impression is the [menu](../media/build64-review2/menu.jpg), whose typography and environment support the fiction immediately. The [first deployment](../media/build64-review2/attempt1-start.jpg) communicates the induction guard's optic/Shift/flank options explicitly. My first longer burst did eliminate that guard with a critical hit; subsequent sentinel bursts missed as the target moved, visible in [attempt 2 sentinel fire](../media/build64-review2/attempt2-sentinel-fire.jpg). I preserved those misses and both deaths.

First friction was translating the west-archive cue into a traversable approach: the target lay behind cover, with a small map/edge marker rather than a large direct path. The [facility map](../media/build64-review2/attempt1-map.jpg) helped me correct course. Later friction was more concrete: holding E just outside the Heart ring did nothing, and my initial forward correction moved from 2.9 m to 3.2 m rather than solving the lateral offset. The UI correctly explained “0.2 M OUTSIDE REACH” in [Heart approach](../media/build64-review2/attempt1-heart-approach.jpg); the subsequent [map](../media/build64-review2/attempt1-heart-map.jpg) preserved my unsuccessful correction. This is understandable feedback, but costly spatial friction during incoming fire. Attempt 2 also included an unsuccessful Heart hold before returning successfully.

Recovery restored supplies and provided clear confirmations. [Attempt 1 Heart recovery](../media/build64-review2/attempt1-heart-recovery.jpg) and [attempt 2 final Heart approach](../media/build64-review2/attempt2-heart-final-approach.jpg) show all three slots lit and the next objective. The Custodian panel clearly lists three 100% coils and armored shutters. I never meaningfully fought those coils: attempt 1 died while I tried to turn and return south; attempt 2 died after firing at the nearby warden and trying to retreat. I cannot evaluate boss balance, upload decay, extraction, victory, or a complete successful loop.

Coverage: title, deploy/redeploy, rifle fire/ADS/reload, walking and diagonal movement, Shift, paused map, three receivers, shield depletion and health damage, supply restoration, Custodian activation and two terminal loss screens. No shotgun, crouch, sprint, deliberate vault, settings, memory reading, successful phase evade, win, audio or performance evaluation. Browser scheduling and screenshot pauses limit timing realism. Driver responses reported no page errors, but that is not a broad stability certification.

Cleanup: owned driver PID 94913 and Chrome PID 94923 were recorded at startup. I issued the exact driver command `{"op":"close"}`. The driver returned `{"type":"closed","reason":"input ended or close requested","driverPid":94913,"chromePid":94923,"browserLaunched":true,"browserClosed":true}` and the TTY process exited 0. `ps -p 94913,94923 -o pid=,command=` returned no rows (exit 1), verifying both exact owned PIDs absent. [Cleanup record](../media/build64-review2/cleanup.json). No unrelated browser was killed.
