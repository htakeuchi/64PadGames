# Launchpad Gamepad

Static browser games for 8x8 pad controllers, starting with Reversi on Launchpad Pro MK3.

## Requirements

- Chrome, Edge, or another Chromium-based browser with Web MIDI support.
- HTTPS hosting for deployment. `localhost` is acceptable for development.
- Launchpad Pro MK3 connected over USB.

For hardware testing, open the app directly in Chrome or Edge. Embedded browsers may not expose Web MIDI device permissions.

## Development

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The app always includes a virtual 8x8 pad, so Reversi can be tested without hardware.

When connecting hardware, allow both MIDI and SysEx access in the browser prompt. If SysEx is denied but MIDI is allowed, the app can still connect, but you must switch the Launchpad to Programmer Mode manually.

## Launchpad Controls

- Grid pads: place a disc, or start a new game after the end animation finishes.
- Left / Right cursor: switch between First and Second player.
- Up / Down cursor: change CPU difficulty.
- Record Arm: undo.
- Pass is automatic when the current player has no legal moves.

## Minesweeper

- Grid tap: open a tile, or blink the adjacent mine count on an open tile.
- Grid hold: place or clear a yellow flag.
- Opened tiles are dim. Hidden tiles are off. Mines are red after a blast.
- The first tap is always safe.
- Difficulty sets the mine count: Easy 8, Normal 10, Hard 14.
- Cursor Up / Down changes difficulty. Cursor Left / Right is not assigned in Minesweeper.
- Stepping on a mine plays an explosion animation, then any grid pad starts a new game.

## End Animations

At game over, the final board remains visible briefly, then the Launchpad plays a result animation:

- Win: blue ripple, celebration flash, happy face.
- Lose: closing frame, red flash, sad face.
- Draw: balanced checker wave, neutral face.

After the result animation finishes, the final board returns and any grid pad starts a new game.

## Build

```bash
npm run build
```

The generated `dist/` directory is a static site and can be hosted on any HTTPS-capable static host.

## Architecture

- `src/pad/` contains the controller abstraction and concrete adapters.
- `src/pad/LaunchpadProMk3Adapter.js` handles Web MIDI, Programmer Mode, pad note mapping, and LED updates.
- `src/pad/VirtualPadAdapter.js` mirrors the same API for browser-only testing.
- `src/games/registry.js` is the game lineup entry point.
- `src/games/reversi/` contains Reversi rules, CPU search, and game orchestration.

The game layer talks only to `PadHub`, so future adapters such as other Launchpad models or Ableton Push can be added without rewriting games.
