# Adding Games

This guide is for future contributors and coding agents adding a new game to this repository.

The project is a Launchpad Pro MK3 game collection first. The browser UI is a Web MIDI host, mirror, and development aid. Design and implementation decisions should start from the physical 8x8 pad, then make the web view reflect that experience.

## Product Rules

- Treat the Launchpad Pro MK3 as the primary screen and controller.
- Keep the full game understandable on an 8x8 grid without relying on browser-only text.
- Use the browser pad as an exact mirror of hardware lights and input, not as a separate UI.
- Prefer simple pad gestures: tap, select-then-tap, and hold only when it is clearly useful.
- Make every generated board fair: solvable puzzles must be solvable, random starts must obey their own invariants, and score games should avoid trivial or impossible openings.
- Keep difficulty levels meaningful. Easy should teach the game, Normal should be approachable, and Hard should add pressure without requiring luck.
- Avoid hidden rules. If a player needs a rule to make decisions, it should be represented through lights, legal-move highlights, status text, or the game info panel.

## Unified Hardware Controls

The app owns global hardware controls. Do not give these buttons game-specific meanings unless the whole control scheme is intentionally changed.

| Hardware key | Meaning |
| --- | --- |
| Left cursor Up / Down | Select previous / next game |
| Right `Patterns >` | Change Level |
| Right `Steps >` | Change the second right-panel option |
| Left Play | New Game |
| Bottom Record Arm | Undo |
| Bottom Stop Clip | Pass |

The right panel shows the same assignments. If a key has no meaning for the selected game or current state, show it as disabled. `canUndo` and `canPass` in game state drive both the web buttons and the hardware-key disabled display.

Examples:

- Reversi: `Steps >` changes Player, `Stop Clip` is enabled only when pass is legal.
- Flood-It: `Steps >` changes Moves.
- Lights Out: `Steps >` changes Board.
- Simon: `Steps >`, Undo, and Pass are disabled.

## File Layout

Use the existing game layout unless there is a strong reason not to.

```text
src/games/<game-id>/
  <GameName>Game.js      # Game orchestration, pad rendering, audio, state notifications
  <gameName>Logic.js     # Pure rules / board generation / scoring
  <gameName>Cpu.js       # Optional CPU/search logic
```

Register the game in `src/games/registry.js` with:

- `id`: stable lowercase id used by the app.
- `title`: visible game name.
- `summary`: one short sentence for the game list and game info panel.
- `rules`: concise player-facing rules.
- `create(context)`: returns the game instance.

Update `README.md` when adding a user-visible game.

## Game Class Contract

Game classes are plain JavaScript classes created by `gameRegistry`.

Required constructor dependencies:

```js
constructor({ pad, audio, onChange }) {
  this.pad = pad;
  this.audio = audio;
  this.onChange = onChange;
}
```

Common methods:

- `start(options)`: read shared app options and call `restart()`.
- `restart()`: reset game state, cancel stale animations, render, then notify.
- `destroy()`: cancel timers, async sequences, and animations.
- `handlePadTap({ x, y })`: handle a completed pad tap.
- `handlePadHold({ x, y })`: optional long-press behavior.
- `undo()`: optional. Play invalid feedback if undo is unavailable.
- `pass()`: optional. Play invalid feedback if pass is unavailable.
- `setDifficulty(difficulty)`: optional, usually restarts the game.
- `setHumanPlayer(player)`: optional for CPU games with first/second player choice.
- `setMoveLimitEnabled(enabled)`: optional for games with move-limit mode.
- `setBoardSize(size)`: optional for board-size games.
- `playDebugAnimation(result)`: optional custom debug animation.
- `getDebugColors()`: optional palette shown by debug color mode.

The app turns pad down/up into `handlePadTap()` by default. If a game omits `handlePadTap()`, the app falls back to `handlePadDown()`.

## State Contract

Every game should expose a compact state object from `getState()` and call `this.onChange?.(this.getState())` from `notify()`.

Baseline fields:

```js
{
  kind: 'mygame',
  message: 'Short player-facing status.',
  statusLabel: 'Playing',
  gameOver: false,
  canUndo: false,
  canPass: false,
}
```

`canUndo` and `canPass` should reflect the current state, not just whether the game has an `undo()` or `pass()` method. For example, `canUndo` is usually false during animations, after game over, or before the first move.

If the existing score panel labels do not fit the game, add a `sync<MyGame>State(state)` method in `src/ui/App.js` and branch to it from `syncGameState()`.

Keep right-panel messages short. They need to fit beside the pad at desktop sizes and remain readable on smaller screens.

## Right Panel Options

The first right-panel option is usually `Level`.

If a game intentionally has no difficulty setting, add `usesDifficulty: false` to its registry entry. `syncGameControls()` hides the Level control and disables the hardware `Patterns >` Level key for that game. Do this only when progression is represented another way, such as prepared stages that increase in difficulty.

Only one second option is currently supported by the global hardware scheme. If the game needs one, wire it consistently:

1. Add or reuse a right-panel control section in `App.js`.
2. Hide/show it from `syncGameControls()`.
3. Add the label in `getSecondaryOptionLabel(gameId)`.
4. Apply the change from `stepSecondaryOption()`.
5. Pass the option through `start(options)` and add a setter method on the game.

If a game does not have a second option, `Steps >` should be disabled in the hardware-key list.

## Pad Rendering

Pad coordinates are zero-based: `x` and `y` are both `0..7`. A frame is a 64-element array indexed as `frame[y * 8 + x]`.

Use:

- `emptyFrame()` to start a full render.
- `PAD_LIGHT` for shared semantic colors.
- `LIGHT_EFFECT.PULSE` and `LIGHT_EFFECT.FLASH` for supported effects.
- `pad.renderFrame(frame)` for stable board state.
- `pad.setCell(x, y, light)` only for short transient effects, followed by a stable render.

Define game-specific lights by extending shared lights when possible:

```js
const MY_LIGHT = {
  ...PAD_LIGHT.player,
  label: 'My piece',
};
```

Always keep `midi`, `css`, and `label` aligned. The physical pad and web mirror must communicate the same state.

## Color And Visual Design

Colors must be distinguishable on both hardware and web.

- Avoid placing indistinguishable adjacent colors where the player must identify piece boundaries.
- Use high-contrast palettes already proven in the app when possible.
- Include every gameplay color in `getDebugColors()`.
- Use labels that explain semantics, not only color names: `Legal`, `Last`, `Warning`, `Player`, `CPU`.
- When random generation or gravity can create adjacent pieces, validate that color rules still hold after the whole resolution step, not only at spawn time.

## Random Generation

Random generation must be designed around game invariants.

- Generate from a solved state for solvable puzzles.
- Keep retry loops bounded, and prefer pure validation helpers over ad hoc patches.
- For generated boards, test many seeds locally before trusting the algorithm.
- If generation can take time, keep it comfortably below the threshold where the UI feels frozen. Around 250ms is acceptable for heavier board generation, but most games should be much faster.
- Difficulty should change parameters intentionally, not just make random values larger.

## Undo, Pass, And New Game

Undo should restore a complete snapshot of the player-visible state.

Capture history before mutating:

```js
this.history.push({
  board: cloneBoard(this.board),
  movesUsed: this.movesUsed,
});
```

Do not allow undo during unresolved animations unless the game is explicitly built for it. Set `canUndo: false` while animating.

Pass should be implemented only when it is a real game action. Do not add a no-op `pass()` just to satisfy the global key. Leave `canPass: false` and let the hardware-key list show Disabled.

Play always means New Game and is handled by the app.

## Async And Lifecycle Safety

Game switching must not leave timers or async animations running.

Recommended pattern:

```js
restart() {
  this.animationId += 1;
  this.animations?.cancel();
  // reset state
}

destroy() {
  this.animationId += 1;
  window.clearTimeout(this.timer);
}

async playSequence() {
  const animationId = ++this.animationId;
  await sleep(500);

  if (this.animationId !== animationId) {
    return;
  }
}
```

The app already ignores stale `onChange` calls from old game instances, but each game should still clean up its own timers and animation loops.

## Audio

Use `GameAudio` consistently and keep audio tied to the meaning of the move.

Shared utility sounds are still useful:

- `invalid()` for illegal taps or disabled hardware actions.
- `undo()` for successful undo.
- `pass()` for pass-like transitions, mode confirmations, or debug color entry.
- `win()`, `lose()`, and `draw()` for final outcomes.
- `place()` is a simple fallback for older or very small interactions. Prefer a named game-specific method for new gameplay feedback.

For new games, add short semantic methods to `GameAudio` instead of building Web Audio directly inside the game class. Name the method after the player-visible event, not the implementation detail:

```js
this.audio.discDrop(row);
this.audio.tileReveal(adjacent, openedCount);
this.audio.groupPop(group.length);
this.audio.lineClear(rowCount, chainCount);
```

Good game audio should be:

- **Short**: most move sounds should finish in about 40-250ms. Longer musical gestures are for intros, result sequences, or Simon-style memory play.
- **Parameterized**: use values the player already understands, such as flipped discs, captured pieces, adjacent mines, chain count, dropped row, selected color, or block width.
- **Distinct**: selection, movement, capture, clear, danger, and failure should not all sound like the same beep at different pitches.
- **Low clutter**: for chain reactions or many affected cells, play one shaped sound for the event instead of one sound per cell. Cap repeated ticks so large clears do not become noise.
- **Pad-first**: the sound should reinforce what the Launchpad lights are doing. If lights sweep, the sound can sweep; if a piece lands, the sound should have a landing accent.
- **Gentle**: avoid loud noise bursts, long drones, or stacked tones that become harsh on small speakers.

Recommended sound identities:

- Reversi: quiet stone placement plus a small rising flip pattern based on the flip count.
- Connect 4: a falling disc sweep ending in a short landing click, with drop row affecting the fall.
- Minesweeper: sonar-like reveal blips, pitch by adjacent mine count, latch sounds for flags, and a short noise burst for mines.
- Flood-It: soft liquid or ink sweeps, with color and newly captured count shaping the chord.
- SameGame: block pops and sparkles, larger groups sounding fuller than small groups.
- Checkers: wooden clicks, sliding moves, sharper capture snaps, and a small crown flourish for kings.
- Hasami Shogi: dry wooden slide and sandwich-capture clicks, with multiple captures ticking quickly.
- Lights Out: electronic switch tones that distinguish on/off progress and resolve when clear.
- Match 3: glassy selection, two-note swaps, bright match chords, and pitch-up cascades.
- Block Line: heavy block selection, short slide or motor movement, warning rise, and horizontal line-clear sweeps.

Implementation guidelines:

- Put reusable oscillators, sweeps, noise bursts, filters, and envelopes in `GameAudio`; game classes should only call semantic methods.
- Every new method must respect `muted`, call `resume()`, and return early if the audio context is unavailable. Helper methods such as `playTone()`, `playSweep()`, and `playNoise()` should handle this where possible.
- Keep gain values conservative and stop every oscillator or buffer source shortly after its envelope finishes.
- Avoid timers or long async audio flows in game classes. Let the existing visual animation lifecycle own timing, and trigger audio at the state transition.
- When adding a new sound path, run `npm run build`; for interactions or animations, verify the browser mirror and check the console for Web Audio errors.

## End States

At game over, preserve the result context long enough for the player to understand what happened.

- Board games should usually show the final board, play the result animation, then return to the final board.
- Score-survival games should make the score visible and avoid replacing the result with a generic `END` screen.
- After end animation, any grid pad may start a new game only if the game clearly enters an awaiting-new-game state.

Use `PadAnimationPlayer` for shared win/lose/draw style unless the game has a strong reason for a custom sequence.

## Development Checklist

Before considering a new game done:

- Add the game to `src/games/registry.js`.
- Add or update any `App.js` state sync branch and second-option handling.
- Ensure `canUndo` and `canPass` drive both web buttons and hardware-key disabled display.
- Verify all colors on the web mirror and, when available, Launchpad hardware.
- Verify game switching stops timers, animations, and stale state updates.
- Verify difficulty changes and second-option changes restart or update intentionally.
- Verify random boards across many runs.
- Run `npm run build`.
- Run `npm run build:pages` before deploy-related work.
- Use the browser mirror to inspect desktop and smaller viewport layouts when UI changes.
