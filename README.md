# Launchpad Gamepad

Static browser games for 8x8 pad controllers, starting with Launchpad Pro MK3.

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

Open the local URL printed by Vite. The app always includes a virtual 8x8 pad, so games can be tested without hardware.

When connecting hardware, allow both MIDI and SysEx access in the browser prompt. If SysEx is denied but MIDI is allowed, the app can still connect, but you must switch the Launchpad to Programmer Mode manually.

## Reversi

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

## Flood-It

- Grid tap: choose the tapped tile color and flood from the top-left region.
- Win by capturing all 64 tiles. When Move Limit is Limited, clear the board before the limit.
- Difficulty sets colors and the Limited move target: Easy 4 colors / 22 moves, Normal 5 / 18, Hard 6 / 15.
- Move Limit can be switched between Limited and Unlimited.
- The palette uses high-contrast colors tuned for Pad visibility: sky, amber, green, white, violet, and vermilion.
- Cursor Up / Down changes difficulty. Cursor Left / Right switches Move Limit.
- Record Arm starts a new Flood-It board.

## Simon

- The 8x8 grid is split into four 4x4 blocks.
- Watch the light and synth-chord pattern, then repeat it by tapping the same blocks in order.
- The four block sounds use the chord sequence F, G, Em, Am.
- Tap any pad to start after selecting Simon.
- Player input uses the same light and sound length as the playback pattern.
- Clear the game by completing the target: Easy 10 rounds, Normal 15, Hard 25.
- Difficulty changes target rounds, playback speed, input timeout, and lives.
- Cursor Up / Down changes difficulty. Cursor Left / Right is not assigned in Simon.
- Record Arm resets Simon to the waiting state.

## SameGame

- Grid tap: remove a connected same-color group of two or more blocks.
- Single blocks and empty spaces are invalid.
- Removed blocks fall downward, and empty columns shift left.
- Difficulty sets colors and clustering: Easy 4 colors, Normal 5, Hard 6.
- The palette uses high-contrast colors tuned for Pad visibility: sky, amber, green, white, violet, and vermilion.
- Score is `(removed blocks - 2)^2`, with a 100 point clear bonus.
- Cursor Up / Down changes difficulty. Cursor Left / Right is not assigned in SameGame.
- Record Arm starts a new SameGame board.

## Debug Colors

- Colors shows the selected game's palette on the top row.
- Tap a lit color pad to show its label and value on screen.
- Tap any unlit pad to return to the game.

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
- `src/games/minesweeper/` contains Minesweeper rules and pad feedback.
- `src/games/floodit/` contains Flood-It rules and pad feedback.
- `src/games/simon/` contains Simon rules and four-block pad feedback.
- `src/games/samegame/` contains SameGame rules and pad feedback.

The game layer talks only to `PadHub`, so future adapters such as other Launchpad models or Ableton Push can be added without rewriting games.
