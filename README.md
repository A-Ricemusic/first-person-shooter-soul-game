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

WASD move · mouse look · LMB fire · RMB aim · R reload · Shift phase dash · Ctrl sprint · Space jump · hold E recover · M paused facility map · hold Tab ground trace · Escape pause.

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

The current game is Build50. Press 1 for the unchanged precision rifle or 2 for the original Blender-authored pump breacher: eight physical pellets, strongest within 6 m and fading to zero at 24 m; six shells plus 24 reserve. R inserts a shell every 0.55 seconds; firing interrupts after a shell seats. Weapon ammunition and cooldowns are independent. Pickups retain their rifle/health/shield supplies and add four shells; recovered cores add eight shells (36 reserve cap) alongside the existing partial restoration. The visible driver supports Digit1/Digit2 in browser and CDP modes. There is one compact mission, three difficulty levels, no multiplayer and no backend. Independent results and production-readiness limits remain candid in the dossier. Human enjoyment, audio and hardware performance are not certified. Quality work continues.
