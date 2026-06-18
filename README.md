# 64 Pad Games

Games designed to be played on the physical Novation Launchpad Pro MK3.

The browser page is a Web MIDI host, visual mirror, audio host, and control panel for the hardware. Game input, lights, and feedback are centered on the Launchpad Pro MK3 8x8 pad surface; the on-screen pad exists to mirror the device state and support development. Only Launchpad Pro MK3 is supported at this time.

Play the hosted version at https://64padgames.namaraii.com/.

## Requirements

- Launchpad Pro MK3 connected over USB.
- Chrome, Edge, or another Chromium-based browser with Web MIDI support.
- HTTPS hosting for deployment. `localhost` is acceptable for development.

Open the page directly in Chrome or Edge, then connect the Launchpad Pro MK3 from the app. Embedded browsers may not expose Web MIDI device permissions.

When connecting hardware, allow both MIDI and SysEx access in the browser prompt. If SysEx is denied but MIDI is allowed, the app can still connect, but you must switch the Launchpad to Programmer Mode manually.

## Development

```bash
npm install
npm run dev
```

Open the local URL printed by Vite and connect a Launchpad Pro MK3. The page includes a virtual 8x8 mirror so the hardware state can be inspected during development.

Useful commands:

```bash
npm run build
npm run preview
npm run build:pages
npm run preview:pages
npm run deploy:pages
```

- `npm run build` creates the regular Vite `dist/` output.
- `npm run build:pages` builds for production and obfuscates the generated JavaScript.
- `npm run preview:pages` builds the Pages output and runs `wrangler pages dev dist`.
- `npm run deploy:pages` deploys `dist/` to the Cloudflare Pages project `launchpad-gamepad`.
- `npm run deploy` is an alias for `npm run deploy:pages`.

Add `?debug=1` to the URL to show the debug panel for result animations and color palettes.

## Hardware Controls

Unless otherwise noted, "grid pad" in the game rules means a physical pad on the Launchpad Pro MK3 8x8 grid. The browser grid mirrors the same state.

The app owns the global hardware controls:

| Hardware key | Meaning |
| --- | --- |
| Left cursor Up / Down | Select previous / next game |
| Right `Patterns >` | Change Level, or Stage in Peg Solitaire |
| Right `Steps >` | Change the second option when available |
| Left Play | New game |
| Bottom Record Arm | Undo when available |
| Bottom Stop Clip | Pass, or Solver in Peg Solitaire, when available |

The right-side control panel mirrors these assignments and shows unavailable actions as disabled. The second option is Player for Reversi, Connect 4, Checkers, and Hasami Shogi; Moves for Flood-It; and Board for Lights Out.

## Reversi

- Grid pads: place a disc on a highlighted legal square, or start a new game after the end animation finishes.
- Sandwiched CPU discs flip to your color. The higher disc count wins when neither side can move.
- Pass is automatic when the current player has no legal moves. Stop Clip is enabled only when a manual pass is legal.
- `Steps >` switches between First and Second player.
- `Patterns >` changes CPU difficulty.
- Record Arm undoes the previous player turn and CPU response.

## Connect 4

- Grid pads: tap one of the seven columns to drop your disc.
- The 7x6 board is shown on the lower six rows. The top row marks playable columns.
- Connect four discs horizontally, vertically, or diagonally before the CPU.
- Full columns are invalid and flash a warning.
- `Steps >` switches between First and Second player.
- `Patterns >` changes CPU difficulty.
- Record Arm undoes the previous player turn and CPU response.

## Minesweeper

- Grid tap: open a tile, or blink the adjacent mine count on an open tile.
- Grid hold: place or clear a yellow flag.
- Opened tiles are dim. Hidden tiles are off. Mines are red after a blast.
- The first tap is always safe.
- Difficulty sets the mine count: Easy 8, Normal 10, Hard 14.
- `Patterns >` changes difficulty.
- After a mine blast or clear animation, any grid pad starts a new game.

## Flood-It

- Grid tap: choose the tapped tile color and flood from the top-left region.
- Win by capturing all 64 tiles. When Moves is Limited, clear the board before the move limit.
- Difficulty sets colors and the Limited move target: Easy 4 colors / 22 moves, Normal 5 / 18, Hard 6 / 15.
- `Steps >` switches Moves between Limited and Unlimited.
- `Patterns >` changes difficulty.
- The palette uses high-contrast colors tuned for pad visibility: sky, amber, green, white, violet, and vermilion.

## Simon

- The 8x8 grid is split into four 4x4 blocks.
- Watch the light and synth-tone pattern, then repeat it by tapping the same blocks in order.
- Tap any pad to start after selecting Simon.
- Player input uses the same light and sound length as the playback pattern.
- Clear the game by completing the target: Easy 10 rounds, Normal 15, Hard 25.
- Difficulty changes target rounds, playback speed, input timeout, and lives.
- `Patterns >` changes difficulty.
- `Steps >`, Record Arm, and Stop Clip are disabled.

## SameGame

- Grid tap: remove a connected same-color group of two or more blocks.
- Single blocks and empty spaces are invalid.
- Removed blocks fall downward, and empty columns shift left.
- Generated boards are checked for a full-clear route before play starts.
- Difficulty sets colors and clustering: Easy 4 colors, Normal 5, Hard 6.
- The palette uses high-contrast colors tuned for pad visibility: sky, amber, green, white, violet, and vermilion.
- Score is `(removed blocks - 2)^2`, with a 100 point clear bonus.
- `Patterns >` changes difficulty.

## Checkers

- Grid tap: select one of your movable pieces, then tap a highlighted destination.
- Captures are mandatory. If a jump can continue, the selected piece must keep jumping.
- First plays black from the bottom side. Second plays white after the CPU opens.
- Men move and jump forward. Kings move and jump in both diagonal directions.
- Difficulty changes CPU search depth.
- `Steps >` switches between First and Second player.
- `Patterns >` changes difficulty.
- Record Arm undoes the previous player turn and CPU response.

## Hasami Shogi

- This is an 8x8 pad adaptation of Hasami Shogi.
- Grid tap: select one of your pieces, then tap a highlighted destination.
- Pieces move any number of empty squares horizontally or vertically.
- After a move, opponent pieces are captured when they are sandwiched between the moved piece and another of your pieces.
- The player pieces use the same blue as Checkers. CPU pieces use the same red as Checkers.
- The game ends when one side has one or fewer pieces, or the current player has no legal move.
- Difficulty changes CPU search depth.
- `Steps >` switches between First and Second player.
- `Patterns >` changes difficulty.
- Record Arm undoes the previous player turn and CPU response.

## Lights Out

- Grid tap: toggle the tapped light and its orthogonal neighbors.
- Clear the puzzle by turning every light off.
- Board selects one of seven boards: 2x2, 3x3, 4x4, 5x5, 6x6, 7x7, or 8x8.
- Boards smaller than 8x8 are centered on the pad.
- Difficulty controls the scramble depth: Easy uses fewer generated taps, Normal uses a medium scramble, and Hard uses a denser scramble.
- Every board is generated by applying valid taps from the solved state, so puzzles are always solvable.
- `Steps >` changes board size.
- `Patterns >` changes difficulty.
- Record Arm undoes one move.

## Peg Solitaire

- Grid tap: select a peg, then jump over an adjacent peg into an empty hole two pads away.
- The jumped peg is removed. Finish a stage with one peg remaining.
- The board is the classic 7x7 cross, placed in the upper-left 7x7 area of the Launchpad grid.
- There are 20 prepared stages. Clearing a stage advances to the next one automatically.
- The final stage is the classic center-empty board.
- `Patterns >` changes Stage. Peg Solitaire does not use Level.
- Stop Clip runs the Solver from the current stage path when available.
- Record Arm undoes one jump.

## Match 3

- Grid tap: select a panel, then tap an orthogonal neighbor to swap.
- Tapping the selected panel clears the selection. Tapping a non-neighbor changes the selection.
- Matches are three or more same-color panels horizontally or vertically. Diagonal matches do not count.
- Invalid swaps flash red, revert, and do not spend a move.
- Matched panels flash white, disappear, fall downward, and refill from the top. Cascades resolve automatically.
- The game starts by blinking the random target color and target count as pad digits.
- Clear the stage by removing the target count before moves run out.
- Difficulty sets target and moves: Easy 18 target / 28 moves, Normal 24 / 24, Hard 32 / 22.
- If the move limit reaches zero or no valid swaps remain, the game ends.
- The palette uses five high-contrast colors tuned for pad visibility: sky, amber, green, white, and violet.
- `Patterns >` changes difficulty.
- Record Arm undoes one valid move.

## Block Line

- Grid tap: select a horizontal block, then tap a highlighted gap to slide it left or right.
- If only one block can move into an empty gap, tapping that gap moves it directly.
- Blocks have widths from 1 to 3 pads.
- Gravity resolves after every move, full rows clear, and chain clears score more points.
- After each turn, a new row rises from the bottom. The game ends when blocks cross the top or no legal moves remain.
- Difficulty changes the generated row pressure and block-width mix.
- `Patterns >` changes difficulty.
- Record Arm undoes one turn.

## Debug Colors

With `?debug=1`, the Debug panel exposes:

- Win, Lose, and Draw result animations.
- Colors, which shows the selected game's palette on the top row.
- In Colors mode, tap a lit color pad to show its label and value on screen.
- Tap any unlit pad to return to the game.

## Result Feedback

Games use pad animations and sounds for result feedback. Many board games return to the final board after the result animation, then any grid pad starts a new game. Some games add custom feedback, such as Reversi score blinking, Connect 4 winning-line pulses, Minesweeper explosions, Peg Solitaire stage-clear frames, and Block Line score display.

## Build

```bash
npm run build
```

The generated `dist/` directory hosts the Web MIDI bridge and mirror UI. It must be served from an HTTPS-capable static host so the browser can request MIDI access for the Launchpad Pro MK3.

For the Cloudflare Pages deployment path, use:

```bash
npm run build:pages
npm run deploy:pages
```

## Architecture

- `src/pad/` contains the controller abstraction and concrete adapters.
- `src/pad/LaunchpadProMk3Adapter.js` handles Web MIDI, Programmer Mode, pad note mapping, hardware controls, and LED updates.
- `src/pad/VirtualPadAdapter.js` mirrors the hardware API in the browser view.
- `src/pad/PadAnimationPlayer.js` contains shared result and utility animations.
- `src/audio/GameAudio.js` contains the shared Web Audio sound engine.
- `src/ui/App.js` owns game selection, the browser UI, global hardware controls, and game state display.
- `src/games/registry.js` is the game lineup entry point.
- `src/games/reversi/` contains Reversi rules, CPU search, and game orchestration.
- `src/games/connect4/` contains Connect 4 rules, CPU search, and pad feedback.
- `src/games/minesweeper/` contains Minesweeper rules and pad feedback.
- `src/games/floodit/` contains Flood-It rules and pad feedback.
- `src/games/simon/` contains Simon rules and four-block pad feedback.
- `src/games/samegame/` contains SameGame generation, scoring, and pad feedback.
- `src/games/checkers/` contains Checkers rules, CPU search, and pad feedback.
- `src/games/hasami/` contains Hasami Shogi rules, CPU search, and pad feedback.
- `src/games/lightsout/` contains Lights Out puzzle generation and pad feedback.
- `src/games/pegsolitaire/` contains Peg Solitaire prepared stages, solver playback, and pad feedback.
- `src/games/match3/` contains Match 3 board generation, cascade logic, and pad feedback.
- `src/games/blockline/` contains Block Line row generation, gravity, scoring, and pad feedback.
- `scripts/obfuscate-dist.mjs` obfuscates production Pages output after Vite builds.
- `wrangler.jsonc` configures Cloudflare Pages output from `dist/`.

The game layer talks only to `PadHub`, so future hardware adapters such as other Launchpad models or Ableton Push can be added without rewriting games.

For implementation conventions and pitfalls when adding a new game, see [docs/adding-games.md](docs/adding-games.md).
