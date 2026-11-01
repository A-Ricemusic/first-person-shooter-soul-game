# SOULFALL: The Last Signal

A complete single-player web FPS vertical slice: recover three soul cores from a storm-battered industrial station, survive its sentinels, then return to extraction. Original Blender props, a coil rifle, reactive combat, Soul Shift dash, three difficulty levels, and a studio-facing design dossier.

## Play

**[Play in your browser](https://a-ricemusic.github.io/first-person-shooter-soul-game/)** · **[Read the design dossier](https://a-ricemusic.github.io/first-person-shooter-soul-game/docs/human.html)**

Requires Node.js 20.19+ or 22.12+ and a desktop browser with WebGL 2 / hardware acceleration.

```sh
npm ci
npm run dev
```

Open the printed localhost URL. In T3 Code, the project also has a **Play SOULFALL** script. Click **Enter the Storm** to capture the mouse. Escape pauses and releases it. If pointer lock is blocked, hold the left mouse button and drag to turn.

WASD move · mouse look · left click fire · right click aim · R reload · Shift Soul Shift · Ctrl sprint · Space jump · hold E recover · Escape pause.

Read **[docs/human.html](docs/human.html)** for creative decisions, implementation rationale, original-asset provenance, validation evidence, known limitations, and the production pitch.

## Playtest status

No quality rating or claim of AAA readiness is made. An automated normal-control run completed the mission; it used exact enemy/collision observations and is not human feedback. Build 02 fixes a blocked ADS sight, incorrect out-of-order core indicators, and sprint/browser shortcut conflicts. See the playtest review in `docs/human.html`.

With the dev server running, `npm run test:playtest` checks these regressions; `npm run playtest:controls` runs an automated combat exercise without teleport/resource/enemy cheats.

Build 03 adds an independent agent review and fixes projectile penetration through concrete, stale aim on turn/fire, low-frame-rate slow motion, and retained restart zoom/recoil. `npm run test:combat` reproduces these six targeted checks with a running dev server. Reports are retained in `docs/independent-playtest.json` and `docs/combat-regressions.json`.

## Current improvement cycle

Build 06 adds named objective and threat markers, held recovery, difficulty-based extraction defense, differentiated predictive interceptors with coordinated windups, persistent memory archive and results manifest, graphics settings, and Blender-baked physically scaled concrete materials. Independent reviewers have **not** rated it 10/10; raw ratings and shortcomings remain in `docs/quality-reviews/`. Improvement work continues.

With the dev server running, `npm run test:mission` checks recovery cancellation, restored sites, extraction, archive, graphics and damage cues. New Blender materials can be reproduced with `blender --background --python tools/build_materials.py`; source is `public/assets/station-materials.blend`.

## Build 07 handling and phase counter

Dash close to a charging enemy with line of sight to interrupt its shot and stagger it for 0.8 seconds. No damage or cooldown reset; the 4.5-second dash cooldown remains. Original Blender gloves/sleeves and a separate reload cell add authored handling, with a synthesized wind/turbine bed and directional charge warnings.

Reproduce the new assets with `blender --background --python tools/build_viewmodel.py`; original sources remain intact. `npm run test:phase` checks interrupt boundaries and audio lifecycle against the running dev server. Fresh agent reviews rated gameplay 7/10, presentation 7.5/10, usability/readability 8/10 and AAA readiness 2.5/10. Human play/audio validation and richer content remain outstanding. Full evidence and limitations: `docs/human.html` and `docs/quality-reviews/build07-*.json`.

Build09 fixes forward phase-break overshoot and target-marker obstruction. A successful approach break brakes the burst, preserving the target ahead; escape/sideways travel stays intact. Final visual followups remove the giant floating sign and bound warden emission. `npm run test:phase-usability` verifies this behavior with a running dev server. Raw fresh reviews remain candid in `docs/quality-reviews/build09-*`. Overall quality work continues.

## Build and verify

```sh
npm run build
npm run preview
npm test
npm run test:production
```

The production output is `dist/`, including the design dossier. Tests start an isolated Vite server and launch Chromium (installed Chrome on macOS, or `CHROME_PATH`; otherwise install Playwright Chromium with `npx playwright install chromium`). Tests cover real render initialization, combat, movement/collision, dash, reload, recovery, extraction, failure, restart, pause, settings, and production test-hook isolation. The `?test=1` query enables a small explicit test harness; it is absent during normal play.

## Original Blender assets

Source: `public/assets/soulfall-assets.blend`. Rebuild all GLBs:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python tools/build_assets.py
```

The procedural source script authors the signal pylon, barricade, sentinel, and coil rifle. Architecture, weather, materials, textures and sound are authored in code. No borrowed game models or commercial sound samples.

## Scope

This is a playable pitch prototype, not a finished commercial AAA production. It contains one complete replayable mission, no multiplayer or backend. See the dossier for the production roadmap and evidence boundaries.

## Build 08 staged memories

One amber induction warden introduces the optional close phase counter. Pass it via either side lane, shoot its upper optic, or interrupt its long charge to open armor for three seconds. Finite location stages replace the seven-enemy opening and generic recovery waves: west triage sentinels, east predictive interceptors and a heart relay guard. Recoveries still restore supplies; the final memory sends two sentinels and extraction adds two interceptors. There is no invulnerability gate or required kill.

Original perimeter memory dioramas (evacuation cot/medic case, dismantled induction bench, vacant relay consoles) are reproducible with `blender --background --python tools/build_memory_props.py`; source `public/assets/memory-stories.blend`. Paths remain flat. `npm run test:encounters` checks finite stages, armor/optic alternatives and route connectivity with a running dev server. Fresh review evidence and limitations are recorded in `docs/human.html`; passing automation is not human enjoyment or AAA readiness evidence.
