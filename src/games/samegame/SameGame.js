import { LIGHT_EFFECT, PAD_LIGHT, emptyFrame } from '../../pad/PadLights.js';
import {
  SAMEGAME_DIFFICULTY,
  SAMEGAME_LIGHTS,
  cellAt,
  countAvailableGroups,
  countBlocks,
  createBoard,
  findGroup,
  hasAvailableMove,
  indexOf,
  isClear,
  removeGroupAndCollapse,
  scoreGroup,
} from './sameGameLogic.js';

const GROUP_FLASH_MS = 95;
const COLLAPSE_MS = 140;
const CLEAR_BONUS = 100;

export class SameGame {
  constructor({ pad, audio, onChange }) {
    this.pad = pad;
    this.audio = audio;
    this.onChange = onChange;
    this.animations = null;
    this.difficulty = 'normal';
    this.config = SAMEGAME_DIFFICULTY.normal;
    this.board = [];
    this.score = 0;
    this.bestScore = 0;
    this.gameOver = false;
    this.awaitingNewGame = false;
    this.animating = false;
    this.message = '';
    this.statusLabel = 'Ready';
    this.animationId = 0;
  }

  start(options = {}) {
    this.difficulty = options.difficulty ?? this.difficulty;
    this.animations = options.animations ?? this.animations;
    this.applyDifficulty();
    this.restart();
  }

  restart() {
    this.animationId += 1;
    this.animations?.cancel();
    this.board = createBoard(this.config);
    this.score = 0;
    this.gameOver = false;
    this.awaitingNewGame = false;
    this.animating = false;
    this.message = 'Tap a group to remove it.';
    this.statusLabel = 'Playing';
    this.render();
    this.notify();
  }

  setDifficulty(difficulty) {
    this.difficulty = difficulty;
    this.applyDifficulty();
    this.restart();
  }

  handlePadTap({ x, y }) {
    if (this.gameOver) {
      if (this.awaitingNewGame) {
        this.restart();
      }

      return;
    }

    if (this.animating) {
      return;
    }

    const index = indexOf(x, y);
    const colorIndex = this.board[index];

    if (colorIndex === null || colorIndex === undefined) {
      this.message = 'Empty space.';
      this.audio.invalid();
      this.flashCell(x, y);
      this.notify();
      return;
    }

    const group = findGroup(this.board, index);
    const colorLabel = formatColorLabel(colorIndex);

    if (group.length < 2) {
      this.message = `${colorLabel}. Single blocks cannot be removed.`;
      this.audio.invalid();
      this.flashCell(x, y);
      this.notify();
      return;
    }

    this.removeGroup(group, colorIndex);
  }

  async playDebugAnimation(result) {
    this.animationId += 1;
    this.animations?.cancel();

    if (result === 'win') {
      this.audio.win();
      await this.playColorSweep();
      await this.animations?.playWin();
    }

    if (result === 'lose') {
      this.audio.lose();
      await this.playSink();
      await this.animations?.playLose();
    }

    if (result === 'draw') {
      this.audio.draw();
      await this.playColorSweep();
      await this.animations?.playDraw();
    }

    this.render();
  }

  async playDebugColors() {
    this.animationId += 1;
    this.animations?.cancel();
    this.audio.pass();
    await this.animations?.playColorList(this.getDebugColors());
    this.render();
  }

  getDebugColors() {
    return SAMEGAME_LIGHTS;
  }

  getState() {
    return {
      kind: 'samegame',
      availableGroupCount: countAvailableGroups(this.board),
      bestScore: this.bestScore,
      blocksRemaining: countBlocks(this.board),
      colorCount: this.config.colorCount,
      difficulty: this.difficulty,
      gameOver: this.gameOver,
      message: this.message,
      score: this.score,
      statusLabel: this.statusLabel,
    };
  }

  async removeGroup(group, colorIndex) {
    const animationId = ++this.animationId;
    const points = scoreGroup(group.length);

    this.animating = true;
    this.score += points;
    this.bestScore = Math.max(this.bestScore, this.score);
    const colorLabel = formatColorLabel(colorIndex);
    this.message = points > 0
      ? `${colorLabel}. Removed ${group.length} blocks. +${points}`
      : `${colorLabel}. Removed ${group.length} blocks.`;
    this.statusLabel = 'Removing';
    this.audio.sameGamePop(group.length);
    this.notify();

    await this.flashGroup(group, SAMEGAME_LIGHTS[colorIndex], animationId);

    if (this.animationId !== animationId || this.gameOver) {
      this.animating = false;
      return;
    }

    this.board = removeGroupAndCollapse(this.board, group);
    this.statusLabel = 'Playing';
    this.render();
    this.notify();
    await sleep(COLLAPSE_MS);

    if (this.animationId !== animationId || this.gameOver) {
      this.animating = false;
      return;
    }

    this.animating = false;

    if (isClear(this.board)) {
      this.finishClear();
      return;
    }

    if (!hasAvailableMove(this.board)) {
      this.finishGameOver();
      return;
    }

    this.message = 'Tap a group to remove it.';
    this.notify();
  }

  async finishClear() {
    if (this.gameOver) {
      return;
    }

    this.gameOver = true;
    this.awaitingNewGame = false;
    this.score += CLEAR_BONUS;
    this.bestScore = Math.max(this.bestScore, this.score);
    this.statusLabel = 'Clear';
    this.message = `Clear! Bonus +${CLEAR_BONUS}.`;
    this.audio.win();
    this.render();
    this.notify();

    await this.playColorSweep();
    await this.animations?.playWin();

    this.awaitingNewGame = true;
    this.message = 'Clear! Press any pad for a new game.';
    this.render();
    this.notify();
  }

  async finishGameOver() {
    if (this.gameOver) {
      return;
    }

    this.gameOver = true;
    this.awaitingNewGame = false;
    this.statusLabel = 'Game Over';
    this.message = 'No groups left.';
    this.audio.lose();
    this.render();
    this.notify();

    await this.playSink();
    await this.animations?.playLose();

    this.awaitingNewGame = true;
    this.message = 'No groups left. Press any pad for a new game.';
    this.render();
    this.notify();
  }

  async flashGroup(group, light, animationId) {
    for (let index = 0; index < 2; index += 1) {
      if (this.animationId !== animationId) {
        return;
      }

      group.forEach((cellIndex) => {
        const { x, y } = cellAt(cellIndex);
        this.pad.setCell(x, y, {
          ...PAD_LIGHT.opponent,
          effect: LIGHT_EFFECT.STATIC,
        });
      });
      await sleep(GROUP_FLASH_MS);

      if (this.animationId !== animationId) {
        return;
      }

      group.forEach((cellIndex) => {
        const { x, y } = cellAt(cellIndex);
        this.pad.setCell(x, y, {
          ...light,
          effect: LIGHT_EFFECT.STATIC,
        });
      });
      await sleep(GROUP_FLASH_MS);
    }
  }

  async playColorSweep() {
    const animationId = ++this.animationId;

    for (let step = 0; step < 12; step += 1) {
      if (this.animationId !== animationId) {
        return;
      }

      const frame = emptyFrame();

      for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) {
          const colorIndex = (x + y + step) % this.config.colorCount;
          frame[indexOf(x, y)] = SAMEGAME_LIGHTS[colorIndex];
        }
      }

      this.pad.renderFrame(frame);
      await sleep(90);
    }
  }

  async playSink() {
    const animationId = ++this.animationId;

    for (let row = 0; row < 8; row += 1) {
      if (this.animationId !== animationId) {
        return;
      }

      const frame = emptyFrame();

      this.board.forEach((colorIndex, cellIndex) => {
        if (colorIndex === null || colorIndex === undefined) {
          return;
        }

        const { x, y } = cellAt(cellIndex);
        frame[cellIndex] = y < row ? PAD_LIGHT.dim : SAMEGAME_LIGHTS[colorIndex];
        if (x + y === row || y === row) {
          frame[cellIndex] = PAD_LIGHT.warning;
        }
      });

      this.pad.renderFrame(frame);
      await sleep(95);
    }
  }

  render() {
    const frame = emptyFrame();

    this.board.forEach((colorIndex, cellIndex) => {
      if (colorIndex === null || colorIndex === undefined) {
        frame[cellIndex] = PAD_LIGHT.off;
      } else {
        frame[cellIndex] = SAMEGAME_LIGHTS[colorIndex];
      }
    });

    this.pad.renderFrame(frame);
  }

  flashCell(x, y) {
    this.pad.setCell(x, y, {
      ...PAD_LIGHT.warning,
      effect: LIGHT_EFFECT.FLASH,
    });
    globalThis.setTimeout(() => this.render(), 260);
  }

  notify() {
    this.onChange?.(this.getState());
  }

  applyDifficulty() {
    this.config = SAMEGAME_DIFFICULTY[this.difficulty] ?? SAMEGAME_DIFFICULTY.normal;
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

function formatColorLabel(colorIndex) {
  const light = SAMEGAME_LIGHTS[colorIndex];

  if (!light) {
    return 'Unknown color';
  }

  return `${light.label} (${light.css.toUpperCase()})`;
}
