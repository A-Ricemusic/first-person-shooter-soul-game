# SOULFALL: The Last Signal

A single-player web FPS pitch prototype set in a storm-battered station. Recover three memories, disable the Custodian’s broadcast coils, then hold the uplink deck to extract. Original Blender assets support the rifle, robots, receivers, workshop and other environment props.

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

The current game is Build51: an original Blender Custodian induction hall with shared collision/fallback, sheltered service approaches, physical firing bays and a south exit. Its geometry changes encounter exposure; enemy/weapon/mission numerical values are preserved. Two fresh independent reviewers completed four losses; one disabled a coil, none reached upload. Source-informed play defeated the boss and reached upload but died; exact-information controllers completed the mission. Raw ratings and limits are retained in the dossier. The menu build-number correction happened after reviews and is explicitly unreviewed. Press 1 for the unchanged precision rifle or 2 for the original Blender-authored pump breacher: eight physical pellets, strongest within 6 m and fading to zero at 24 m; six shells plus 24 reserve. R inserts a shell every 0.55 seconds; firing interrupts after a shell seats. Weapon ammunition and cooldowns are independent. Pickups retain their rifle/health/shield supplies and add four shells; recovered cores add eight shells (36 reserve cap) alongside the existing partial restoration. The visible driver supports Digit1/Digit2 in browser and CDP modes. There is one compact mission, three difficulty levels, no multiplayer and no backend. Independent results and production-readiness limits remain candid in the dossier. Human enjoyment, audio and hardware performance are not certified. Quality work continues.

Build52 adds a 0.62-second committed Space vault across nearby thin 0.45–1.45 m cover when the full standing body has a clear supported landing. Space otherwise jumps. Fire and phase wait until landing; reloads, enemies and damage continue. The Tab trace remains ground-only. Original authored rifle/breacher glove rigs provide connected reach/handling poses; no new borrowed assets.

Build54 hunters acquire physical sight within 36 m or a real shot origin within 24 m. Lost sight preserves the last contact for 3 seconds, then a 5-second local search precedes return. Quiet relocation behind cover does not update pursuit. Hearing is simple distance propagation, not simulated acoustics.
