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

WASD move · mouse look · left click fire · right click aim · R reload · Shift Soul Shift · Ctrl sprint · Space jump · E collect · Escape pause.

Read **[docs/human.html](docs/human.html)** for creative decisions, implementation rationale, original-asset provenance, validation evidence, known limitations, and the production pitch.

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
