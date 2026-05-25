import { LIGHT_EFFECT, emptyFrame } from '../../pad/PadLights.js';
import {
  FLOOD_DIFFICULTY,
  FLOOD_LIGHTS,
  applyFloodMove,
  cellAt,
  createBoard,
  getFloodedIndexes,
  indexOf,
  isComplete,
} from './floodItLogic.js';

const FLOOD_WAVE_MS = 45;

export class FloodItGame {
  constructor({ pad, audio, onChange }) {
    this.pad = pad;
    this.audio = audio;
    this.onChange = onChange;
    this.animations = null;
    this.difficulty = 'normal';
    this.colorCount = FLOOD_DIFFICULTY.normal.colorCount;
    this.moveLimit = FLOOD_DIFFICULTY.normal.moveLimit;
    this.moveLimitEnabled = true;
    this.board = [];
    this.movesUsed = 0;
    this.capturedCount = 0;
    this.gameOver = false;
    this.awaitingNewGame = false;
    this.message = '';
    this.statusLabel = 'Ready';
    this.animationId = 0;
  }

  start(options = {}) {
    this.difficulty = options.difficulty ?? this.difficulty;
    this.moveLimitEnabled = options.moveLimitEnabled ?? this.moveLimitEnabled;
    this.animations = options.animations ?? this.animations;
    this.applyDifficulty();
    this.restart();
  }

  restart() {
    this.animationId += 1;
    this.animations?.cancel();
    this.board = createBoard(this.colorCount);
    this.movesUsed = 0;
    this.capturedCount = getFloodedIndexes(this.board).size;
    this.gameOver = false;
    this.awaitingNewGame = false;
    this.message = 'Tap a color to flood.';
    this.statusLabel = 'Playing';
    this.render();
    this.notify();
  }

  setDifficulty(difficulty) {
    this.difficulty = difficulty;
    this.applyDifficulty();
    this.restart();
  }

  setMoveLimitEnabled(enabled) {
    this.moveLimitEnabled = enabled;

    if (!this.gameOver) {
      this.message = enabled ? 'Move limit enabled.' : 'Move limit disabled.';
      this.notify();
    }
  }

  async playDebugAnimation(result) {
    this.animationId += 1;
    this.animations?.cancel();

    if (result === 'win') {
      this.audio.win();
      await this.animations?.playFloodSweep(FLOOD_LIGHTS.slice(0, this.colorCount));
      await this.animations?.playWin();
    }

    if (result === 'lose') {
      this.audio.lose();
      await this.animations?.playLose();
    }

    if (result === 'draw') {
      this.audio.draw();
      await this.animations?.playFloodSweep(FLOOD_LIGHTS.slice(0, this.colorCount));
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
    return FLOOD_LIGHTS;
  }

  handlePadTap({ x, y }) {
    if (this.gameOver) {
      if (this.awaitingNewGame) {
        this.restart();
      }

      return;
    }

    const colorIndex = this.board[indexOf(x, y)];
    const currentColor = this.board[0];

    if (colorIndex === currentColor) {
      this.message = 'Choose a different color.';
      this.audio.invalid();
      this.notify();
      return;
    }

    this.movesUsed += 1;
    const result = applyFloodMove(this.board, colorIndex);
    this.board = result.board;
    this.capturedCount = result.capturedCount;
    this.message = `Flooded ${this.capturedCount} tiles.`;
    this.audio.place(result.newlyCaptured.length);
    this.render();
    this.notify();
    this.playCaptureWave(result.newlyCaptured, FLOOD_LIGHTS[colorIndex]);

    if (isComplete(this.board)) {
      this.finishWin();
      return;
    }

    if (this.moveLimitEnabled && this.movesUsed >= this.moveLimit) {
      this.finishLose();
    }
  }

  getState() {
    return {
      kind: 'floodit',
      capturedCount: this.capturedCount,
      colorCount: this.colorCount,
      difficulty: this.difficulty,
      gameOver: this.gameOver,
      message: this.message,
      moveLimitEnabled: this.moveLimitEnabled,
      moveLimit: this.moveLimit,
      movesUsed: this.movesUsed,
      remainingMoves: this.moveLimitEnabled ? Math.max(0, this.moveLimit - this.movesUsed) : null,
      statusLabel: this.statusLabel,
    };
  }

  async finishWin() {
    if (this.gameOver) {
      return;
    }

    this.gameOver = true;
    this.awaitingNewGame = false;
    this.statusLabel = 'Clear';
    this.message = `Clear in ${this.movesUsed} moves.`;
    this.audio.win();
    this.render();
    this.notify();

    await this.animations?.playFloodSweep(FLOOD_LIGHTS.slice(0, this.colorCount));
    await this.animations?.playWin();

    this.awaitingNewGame = true;
    this.message = `Clear in ${this.movesUsed} moves. Press any pad for a new game.`;
    this.render();
    this.notify();
  }

  async finishLose() {
    if (this.gameOver) {
      return;
    }

    this.gameOver = true;
    this.awaitingNewGame = false;
    this.statusLabel = 'Out';
    this.message = 'Out of moves.';
    this.audio.lose();
    this.render();
    this.notify();

    await this.animations?.playLose();

    this.awaitingNewGame = true;
    this.message = 'Out of moves. Press any pad for a new game.';
    this.render();
    this.notify();
  }

  async playCaptureWave(indexes, light) {
    const animationId = ++this.animationId;
    const groups = groupByDistance(indexes);

    for (const group of groups) {
      if (this.animationId !== animationId || this.gameOver) {
        return;
      }

      group.forEach((index) => {
        const { x, y } = cellAt(index);
        this.pad.setCell(x, y, {
          ...light,
          effect: LIGHT_EFFECT.PULSE,
        });
      });
      await sleep(FLOOD_WAVE_MS);
    }

    if (this.animationId === animationId && !this.gameOver) {
      this.render();
    }
  }

  render() {
    const frame = emptyFrame();

    this.board.forEach((colorIndex, index) => {
      frame[index] = FLOOD_LIGHTS[colorIndex];
    });

    this.pad.renderFrame(frame);
  }

  notify() {
    this.onChange?.(this.getState());
  }

  applyDifficulty() {
    const config = FLOOD_DIFFICULTY[this.difficulty] ?? FLOOD_DIFFICULTY.normal;

    this.colorCount = config.colorCount;
    this.moveLimit = config.moveLimit;
  }
}

function groupByDistance(indexes) {
  const groups = new Map();

  indexes.forEach((index) => {
    const { x, y } = cellAt(index);
    const distance = x + y;
    const group = groups.get(distance) ?? [];

    group.push(index);
    groups.set(distance, group);
  });

  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map((entry) => entry[1]);
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
