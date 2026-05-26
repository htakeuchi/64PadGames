# Launchpad Pro MK3 Games

Games designed to be played on the physical Novation Launchpad Pro MK3.

The browser page is a Web MIDI host and visual mirror for the hardware. Game input, lights, and feedback are centered on the Launchpad Pro MK3 8x8 pad surface; the on-screen pad exists to reflect the device state and support development. Only Launchpad Pro MK3 is supported at this time.

Play the hosted version at https://64padgames.namaraii.com/.

## Requirements

- Launchpad Pro MK3 connected over USB.
- Chrome, Edge, or another Chromium-based browser with Web MIDI support.
- HTTPS hosting for deployment. `localhost` is acceptable for development.

Open the page directly in Chrome or Edge, then connect the Launchpad Pro MK3 from the app. Embedded browsers may not expose Web MIDI device permissions.

## Development

```bash
npm install
npm run dev
```

Open the local URL printed by Vite and connect a Launchpad Pro MK3. The page includes a virtual 8x8 mirror so the hardware state can be inspected during development.

When connecting hardware, allow both MIDI and SysEx access in the browser prompt. If SysEx is denied but MIDI is allowed, the app can still connect, but you must switch the Launchpad to Programmer Mode manually.

Unless otherwise noted, "grid pad" in the game rules means a physical pad on the Launchpad Pro MK3 8x8 grid. The browser grid mirrors the same state.

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

## Checkers

- Grid tap: select one of your movable pieces, then tap a highlighted destination.
- Captures are mandatory. If a jump can continue, the selected piece must keep jumping.
- First plays black from the bottom side. Second plays white after the CPU opens.
- Men move and jump forward. Kings move and jump in both diagonal directions.
- Difficulty changes CPU search depth.
- Cursor Left / Right switches between First and Second player.
- Cursor Up / Down changes difficulty.
- Record Arm undoes the previous player turn and CPU response.

## Hasami Shogi

- This is an 8x8 pad adaptation of Hasami Shogi.
- Grid tap: select one of your pieces, then tap a highlighted destination.
- Pieces move any number of empty squares horizontally or vertically.
- After a move, opponent pieces are captured when they are sandwiched between the moved piece and another of your pieces.
- The player pieces use the same blue as Checkers. CPU pieces use the same red as Checkers.
- The game ends when one side has one or fewer pieces, or the current player has no legal move.
- Difficulty changes CPU search depth.
- Cursor Left / Right switches between First and Second player.
- Cursor Up / Down changes difficulty.
- Record Arm undoes the previous player turn and CPU response.

## Lights Out

- Grid tap: toggle the tapped light and its orthogonal neighbors.
- Clear the puzzle by turning every light off.
- Board Size selects one of seven boards: 2x2, 3x3, 4x4, 5x5, 6x6, 7x7, or 8x8.
- Boards smaller than 8x8 are centered on the pad.
- Difficulty controls the scramble depth: Easy uses fewer generated taps, Normal uses a medium scramble, and Hard uses a denser scramble.
- Every board is generated by applying valid taps from the solved state, so puzzles are always solvable.
- Cursor Left / Right changes board size.
- Cursor Up / Down changes difficulty.
- Record Arm undoes one move.

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
- The palette uses five high-contrast colors tuned for Pad visibility: sky, amber, green, white, and violet.
- Cursor Up / Down changes difficulty. Cursor Left / Right is not assigned in Match 3.
- Record Arm undoes one valid move.
- Play starts a new Match 3 board.

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

The generated `dist/` directory hosts the Web MIDI bridge and mirror UI. It must be served from an HTTPS-capable static host so the browser can request MIDI access for the Launchpad Pro MK3.

## Architecture

- `src/pad/` contains the controller abstraction and concrete adapters.
- `src/pad/LaunchpadProMk3Adapter.js` handles Web MIDI, Programmer Mode, pad note mapping, and LED updates.
- `src/pad/VirtualPadAdapter.js` mirrors the hardware API in the browser view.
- `src/games/registry.js` is the game lineup entry point.
- `src/games/reversi/` contains Reversi rules, CPU search, and game orchestration.
- `src/games/minesweeper/` contains Minesweeper rules and pad feedback.
- `src/games/floodit/` contains Flood-It rules and pad feedback.
- `src/games/simon/` contains Simon rules and four-block pad feedback.
- `src/games/samegame/` contains SameGame rules and pad feedback.
- `src/games/checkers/` contains Checkers rules, CPU search, and pad feedback.
- `src/games/hasami/` contains Hasami Shogi rules, CPU search, and pad feedback.
- `src/games/lightsout/` contains Lights Out puzzle generation and pad feedback.
- `src/games/match3/` contains Match 3 rules and pad feedback.

The game layer talks only to `PadHub`, so future hardware adapters such as other Launchpad models or Ableton Push can be added without rewriting games.

For implementation conventions and pitfalls when adding a new game, see [docs/adding-games.md](docs/adding-games.md).
