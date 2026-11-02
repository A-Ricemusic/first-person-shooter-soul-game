# Build 71 — reviewer 2 raw ordinary playtest

2026-11-02. Exactly two fresh attempts, both actual terminal losses. Normal http://127.0.0.1:5173/ through default tools/visible-playtest.mjs only; read --help first. No source, tests, helper source, prior reports, hidden state, settings changes or runtime edits. No anchor assistance, boosts, arrangements, teleport, or additional rating round. All media and actions.jsonl preserved at docs/media/build71-review2.

## Exact end UI outcomes

|Attempt|Start|Actual terminal|End UI mission time (labelled cumulative play time)|Recovered|Eliminations|Score|Accuracy|Critical eliminations|Phase evades|Uplink retries|
|---|---|---|---|---|---|---|---|---|---|---|
|1|Fresh menu deployment|OPERATOR LOST / THE STATION REMEMBERS.|01:30|Mara Solberg, Sera Nord|1|2,255|11%|1|1|0|
|2|Visible START FRESH after loss|OPERATOR LOST / THE STATION REMEMBERS.|00:36|None|1|180|27%|1|0|0|

Terminal evidence: attempt1-east-detour.jpg (sequence19) and attempt2-heart.jpg (sequence25), both phase=end before and after capture. These are actual end screens, irrespective of filenames. Neither loss was only a live photograph followed by capture-to-pause death; no such separate case observed. End UI time is transcribed exactly; second fresh reset shows00:36, not a cross-attempt total. Arithmetic sum of the two displayed durations is02:06, not an additional UI claim.

## Unedited observations and mistakes

The opening menu has a clear visual identity: rain, teal lighting, monumental title, concise three-core/jammer/upload briefing. Facility map makes the overall arrangement understandable and explicitly distinguishes blocking low cover. Induction guard optic shot produced a critical elimination on both starts. Rifle feedback and bright amber enemy optics made that opening readable.

Attempt1: used visible map, eliminated guard, moved west. Missed later sentinel shots and left multiple patrols alive. Mara recovery at00:32 restored supplies; reward was clear. Ran into the archive back wall while trying to head toward Heart. Backed out via east service, overshot Heart northward, turned around, and initially held E outside reach. Explicit 1.6m/0.9m outside-reach prompts were useful. Lateral correction and vault moved farther from target, then dash also moved away; these were my navigation errors. Eventually recovered Sera at01:13, under fire. Ran toward East Archive at low health and hit another wall, attempted detour, died at01:30. Numerous uninterrupted travel/recovery batches left me exposed instead of suppressing patrols; this is a limitation of my play, not proof of unavoidable damage.

Attempt2: fresh eastern route after critical guard elimination. Hit outer eastern wall, corrected inward, reached8m from Elian but collided with large isolator. Tried moving right without backing out enough and stayed blocked; suffered damage while futilely holding E. Backed out and moved left, then advanced north to Heart rather than completing East Archive. Tried to reach Heart at31 health and died at00:36 without a recovered core. These mistakes are retained in the action log and photos. I did not use Tab trace or change the selected map target; doing so might have improved this route.

## Raw ratings

Scale for each:0 unusable/absent,2 very weak,4 substantially rough,5 functional prototype,6 promising playable slice,7 strong small production,8 highly polished,9 excellent commercial benchmark,10 exceptional benchmark with broad verified coverage. AAA-readiness means observed readiness relative to a polished major release, not ambition. Scores apply only to observed coverage.

|Named category|0–10|Reason|
|---|---|---|
|Gameplay|6.0|Critical opening, recovery resupply and dash offer a coherent combat/recovery loop. Open exposure punished my poor routing, but later combat feedback and tactical choices were only lightly explored. No completed mission to assess pacing payoff.|
|Presentation|7.5|Strong title treatment, wet lighting, teal/amber palette and station silhouette. Blocky humanoids, repeated box geometry and large flat obstacles keep the scene below premium production finish.|
|Usability|6.0|Controls and paused map are useful, restart works, recovery distance explains failure. Repeated collision and target switching while nearby made my routes confusing; my failure to select Elian or use trace also contributed.|
|Readability|6.5|High contrast HUD, numbered recovery slots, bright optics and named receivers work. Tiny minimap detail and small environmental text need deliberate inspection; threat directions were easier to notice than identify and suppress.|
|AAA-readiness|4.0|Coherent slice presentation and functional short loop, but observed enemy/environment finish and navigation clarity do not meet a major-release benchmark. Full mission, boss/jammer, upload, audio and performance remain unverified.|

## Coverage and limits

Observed: title, deployment, paused facility map, walking/strafe/sprint, ADS/look/fire, rifle reload, dash, attempted vault, incoming damage/shield regeneration, two named recoveries and supply refill, fresh restart, two actual losses and score screens. Coil rifle used in both; no pump breacher fired. No Custodian/jammer disable, third-core completion, upload deck, upload interruption/decay/retry, extraction success, earned anchor, memory reading, settings or full narrative coverage. Zero uplink retries on both end screens does not mean upload tested.

Synthetic browser-timed controls and software-WebGL fallback; paused between batches. No claim to certify enjoyment, audio, real mouse feel, continuous play, hardware performance or GPU stability. No captureHeld used: default input release before photographs. Photo-to-pause delay still allows damage/time; screenshot HUD and returned pre-pause HUD sometimes differ (e.g. post-recovery supply/shield update). Do not infer precise combat timing from stills. One image read was attempted before a batch finished and failed because the file did not yet exist; the completed photo was then inspected and preserved. All reported results are the completed outputs.

## Cleanup proof

Owned driver PID27043, owned Chrome PID27053 (ready event). Explicit {"op":"close"} sent after second terminal; awaited session69779 completion with exit_code0. Closed event: reason=input ended or close requested, browserLaunched=true, browserClosed=true, driverPid27043, chromePid27053. Exact `ps -p 27043,27053 -o pid=,ppid=,command=` then returned exit1 and empty output: both owned PIDs absent. No global kill or unrelated-process termination. No tests/builds or implementation changes performed.
