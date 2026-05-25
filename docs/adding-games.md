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

The first right-panel option is always `Level`.

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

Use `GameAudio` consistently:

- `place()` for successful placement or progress.
- `invalid()` for illegal taps or disabled hardware actions.
- `undo()` for successful undo.
- `pass()` for pass-like transitions or non-scoring confirmation.
- `win()`, `lose()`, and `draw()` for final outcomes.

Avoid long or repeated sounds during rapid animations.

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
