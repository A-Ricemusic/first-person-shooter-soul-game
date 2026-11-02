# SOULFALL: The Last Signal

Build63 is a single-player web FPS pitch prototype set in a storm-battered station. Recover three memories, disable the Custodian’s broadcast coils, then hold the uplink deck to extract. Original Blender assets support the rifle, robots, receivers, workshop and other environment props.

[Play](https://a-ricemusic.github.io/first-person-shooter-soul-game/) · [Design decisions and evidence](https://a-ricemusic.github.io/first-person-shooter-soul-game/docs/human.html)

## Run

Requires Node.js 20.19+ or 22.12+ and a desktop browser with WebGL 2.

```sh
npm ci
npm run dev
```

Open the printed local URL and choose **Enter the Storm**. Escape pauses and releases the mouse. If capture is unavailable, hold a mouse button and drag to look.

WASD move · mouse look · LMB fire · RMB aim · R reload · Shift phase dash · Ctrl sprint · Space contextual low-cover vault / jump · hold E recover · M paused facility map · hold Tab ground trace · Escape pause.

Charging emitters glow amber and cast a physical sightline that stops at cover. Bullet strikes show gray surface chips, amber armor chips, cyan damage, and pale optic strikes. These cues describe actual contact; empty shots produce no impact.

The map lets you select a receiver. The optional trace follows known ground geometry; stay alert for patrols. A close phase break can interrupt a charging attack. Robot proximity discharges have a visible windup and can also be interrupted or avoided.

## Verify and playtest

```sh
npm run build
npm run preview
npm test
npm run test:production
```

The production output is `dist/`, including the dossier. Browser checks use installed Chrome on macOS or `CHROME_PATH`. The explicit `?test=1` harness is absent during normal play. See `package.json` for focused combat, movement, phase, receiver, rig and mission checks.

```sh
npm run playtest:visible -- --help
npm run playtest:visible -- --out docs/media/my-playtest
npm run test:visible-input
npm run test:visible-driver
```

The visible driver uses browser-timed synthetic DOM controls, screenshots and visible UI; its protocol rejects game-state evaluation and test URLs. It remains pause-assisted synthetic play. `npm run playtest:controls` is a separate privileged controller that reads exact geometry and targets; its wins are correctness evidence, not independent discovery or human feedback.

## Assets and scope

Native `.blend` sources and exports are in `public/assets/`; asset-specific generators live in `tools/`. Use the generators and provenance linked in [docs/human.html](docs/human.html), which also retains historical reviews, failures and validation limits.

Build51 introduced: an original Blender Custodian induction hall with shared collision/fallback, sheltered service approaches, physical firing bays and a south exit. Its geometry changes encounter exposure; enemy/weapon/mission numerical values are preserved. Two fresh independent reviewers completed four losses; one disabled a coil, none reached upload. Source-informed play defeated the boss and reached upload but died; exact-information controllers completed the mission. Raw ratings and limits are retained in the dossier. The menu build-number correction happened after reviews and is explicitly unreviewed. Press 1 for the unchanged precision rifle or 2 for the original Blender-authored pump breacher: eight physical pellets, strongest within 6 m and fading to zero at 24 m; six shells plus 24 reserve. R inserts a shell every 0.55 seconds; firing interrupts after a shell seats. Weapon ammunition and cooldowns are independent. Pickups retain their rifle/health/shield supplies and add four shells; recovered cores add eight shells (36 reserve cap) alongside the existing partial restoration. The visible driver supports Digit1/Digit2 in browser and CDP modes. There is one compact mission, three difficulty levels, no multiplayer and no backend. Independent results and production-readiness limits remain candid in the dossier. Human enjoyment, audio and hardware performance are not certified. Quality work continues.

Build52 adds a 0.62-second committed Space vault across nearby thin 0.45–1.45 m cover when the full standing body has a clear supported landing. Space otherwise jumps. Fire and phase wait until landing; reloads, enemies and damage continue. The Tab trace remains ground-only. Original authored rifle/breacher glove rigs provide connected reach/handling poses; no new borrowed assets.

Build54 hunters acquire physical sight within 36 m or a real shot origin within 24 m. Lost sight preserves the last contact for 3 seconds, then a 5-second local search precedes return. Quiet relocation behind cover does not update pursuit. Hearing is simple distance propagation, not simulated acoustics.

Build55 finishes the original first-person assets with Blender-authored 1K UV base-color, roughness and normal atlases, a shared rounded glove construction for both weapons, a detailed breacher receiver/action-bar/loading-gate assembly, and connected wrist/sleeve bridges. Reproduce with Blender using `tools/build55-viewmodel.py`, then `tools/build55-breacher.py`; native sources are `build55-operator-handling.blend` and `build55-pump-breacher.blend`. These are rigid posed gloves, not a full skeletal hand or world-contact IK system. Gameplay values remain unchanged. Current validation, review outcomes and remaining limits are recorded in the Build55 dossier.

Build56: **C** toggles physical crouch (1.05 m eye, 1.25 m body, 3 m/s). Ctrl requests standing and sprint; blocked headroom retains the low body. Posture changes require grounding outside phase/vault; low jumps retain posture. Stand before vaulting. Recovery and upload require grounding.

Build57 teaches C beside nearby low cover using the existing controls strip. The short lesson stays visible during combat, then retires after a completed crouch; recovery and service-grate instructions keep priority. Combat and posture tuning are unchanged.

Build58 replaces the generic Custodian diamond with one small numbered component bracket when a physical coil surface is clear. Foreign cover, the machine itself and nearer enemies block the cue; it carries no offscreen tracking arrow. The existing aim readout identifies inert housing. Damage, assets and mission rules remain unchanged. Evidence and ordinary-play limitations are recorded in `docs/human.html`.

Build59 aligns nearby receiver feedback: local heading, scanner and waypoint identify the same person while the planned map route stays selected. The existing prompt shows how far outside recovery reach the player is, with larger text and no duplicate close waypoint label. Recovery radius, hold time, world geometry and combat rules are unchanged.

Build61 fixes fallback mouse-look after one mouse button is released while another remains held. The visible input helper rejects uncaptured, unheld look instead of silently issuing ignored movement; its example now shows the required button order. Sensitivity, combat values and Blender assets are unchanged. Historical review scores remain unmodified.

Build62 deliberately delays new patrol ranged charges through the Custodian’s existing exposed-coil window (2.6 seconds after a volley, 3 after a phase break). Moving patrols, committed shots and close discharges remain dangerous. Damage, exposure duration, assets, service and upload rules stay unchanged; this is a combat pacing change whose independent results are pending.

Build63 corrects compass orientation: the compact HUD shows the actual cardinal direction and normalized degrees, including the north wrap to000. Camera, sensitivity, physics and combat remain unchanged. The visible test driver can read the displayed cardinal label. Contextual route help briefly marks walkable ground after sustained blocked walking. It is enabled by default in Settings; held Tab remains available independently. Patrols still matter. The Build63 dossier retains validation and two independent mission reviews with their limits.

Build64 restores gray physical strike effects on inert Custodian housing, spent coils and dormant/dead machinery without granting damage or hit credit. Breacher overkill preserves the shell’s coil-kill effect and single reward. Evidence, fixture corrections and ordinary-play limits are retained in the Build64 dossier.
