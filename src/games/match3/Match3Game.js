import { LIGHT_EFFECT, PAD_LIGHT, emptyFrame } from '../../pad/PadLights.js';
import {
  MATCH3_COLOR_COUNT,
  MATCH3_DIFFICULTY,
  MATCH3_LIGHTS,
  areAdjacent,
  cellAt,
  clearMatches,
  collapseAndFill,
  createBoard,
  findMatches,
  getAdjacentIndexes,
  hasValidMove,
  indexOf,
  swapCells,
} from './match3Logic.js';

const INTRO_BLINKS = 3;
const INTRO_ON_MS = 260;
const INTRO_OFF_MS = 130;
const SWAP_MS = 120;
const INVALID_FLASH_MS = 85;
const CLEAR_FLASH_MS = 90;
const CLEAR_GAP_MS = 85;
const DROP_MS = 150;
const CHAIN_FLASH_MS = 70;

const CLEAR_LIGHT = {
  ...PAD_LIGHT.opponent,
  id: 'match3-clear',
  label: 'Clear',
};

export class Match3Game {
  constructor({ pad, audio, onChange }) {
    this.pad = pad;
    this.audio = audio;
    this.onChange = onChange;
    this.animations = null;
    this.difficulty = 'normal';
    this.config = MATCH3_DIFFICULTY.normal;
    this.board = [];
    this.targetColor = 0;
    this.targetQuota = this.config.targetQuota;
    this.targetRemaining = this.targetQuota;
    this.moveLimit = this.config.moveLimit;
    this.movesUsed = 0;
    this.selectedIndex = null;
    this.history = [];
    this.gameOver = false;
    this.awaitingNewGame = false;
    this.animating = false;
    this.message = '';
    this.statusLabel = 'Ready';
    this.lastChainCount = 0;
    this.animationId = 0;
  }

  start(options = {}) {
    this.difficulty = options.difficulty ?? this.difficulty;
    this.animations = options.animations ?? this.animations;
    this.applyDifficulty();
    this.restart();
  }

  restart() {
    const animationId = ++this.animationId;

    this.animations?.cancel();
    this.board = createBoard(MATCH3_COLOR_COUNT);
    this.targetColor = Math.floor(Math.random() * MATCH3_COLOR_COUNT);
    this.targetQuota = this.config.targetQuota;
    this.targetRemaining = this.targetQuota;
    this.moveLimit = this.config.moveLimit;
    this.movesUsed = 0;
    this.selectedIndex = null;
    this.history = [];
    this.gameOver = false;
    this.awaitingNewGame = false;
    this.animating = true;
    this.statusLabel = 'Target';
    this.lastChainCount = 0;
    this.message = `Target ${this.targetLabel()}: ${this.targetQuota}.`;
    this.audio.pass();
    this.notify();
    this.playTargetIntro(animationId);
  }

  destroy() {
    this.animationId += 1;
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

    if (this.selectedIndex === null) {
      this.selectCell(index);
      return;
    }

    if (this.selectedIndex === index) {
      this.selectedIndex = null;
      this.message = 'Selection cleared.';
      this.render();
      this.notify();
      return;
    }

    if (!areAdjacent(this.selectedIndex, index)) {
      this.selectCell(index);
      return;
    }

    this.playSwap(this.selectedIndex, index);
  }

  undo() {
    if (this.history.length === 0 || this.animating) {
      this.audio.invalid();
      return;
    }

    const snapshot = this.history.pop();

    this.animationId += 1;
    this.board = [...snapshot.board];
    this.targetRemaining = snapshot.targetRemaining;
    this.movesUsed = snapshot.movesUsed;
    this.lastChainCount = snapshot.lastChainCount;
    this.selectedIndex = null;
    this.gameOver = false;
    this.awaitingNewGame = false;
    this.animating = false;
    this.statusLabel = 'Playing';
    this.message = 'Undid one move.';
    this.audio.undo();
    this.render();
    this.notify();
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
      await this.animations?.playExplosion?.({ x: 3.5, y: 3.5 });
      await this.animations?.playLose();
    }

    if (result === 'draw') {
      this.audio.draw();
      await this.playColorSweep();
      await this.animations?.playDraw();
    }

    this.render();
  }

  getDebugColors() {
    return [
      ...MATCH3_LIGHTS,
      CLEAR_LIGHT,
      PAD_LIGHT.warning,
    ];
  }

  getState() {
    return {
      kind: 'match3',
      canUndo: this.history.length > 0 && !this.animating,
      difficulty: this.difficulty,
      gameOver: this.gameOver,
      lastChainCount: this.lastChainCount,
      message: this.message,
      moveLimit: this.moveLimit,
      movesRemaining: Math.max(0, this.moveLimit - this.movesUsed),
      movesUsed: this.movesUsed,
      statusLabel: this.statusLabel,
      targetCleared: this.targetQuota - this.targetRemaining,
      targetColor: this.targetColor,
      targetLabel: this.targetLabel(),
      targetQuota: this.targetQuota,
      targetRemaining: this.targetRemaining,
    };
  }

  selectCell(index) {
    this.selectedIndex = index;
    this.message = `Selected ${formatColorLabel(this.board[index])}.`;
    this.render();
    this.notify();
  }

  async playSwap(firstIndex, secondIndex) {
    const animationId = ++this.animationId;
    const beforeBoard = [...this.board];
    const swappedBoard = swapCells(this.board, firstIndex, secondIndex);
    const matches = findMatches(swappedBoard);

    this.animating = true;
    this.selectedIndex = null;
    this.board = swappedBoard;
    this.statusLabel = 'Swapping';
    this.message = 'Swapping panels.';
    this.render();
    this.notify();
    await sleep(SWAP_MS);

    if (this.animationId !== animationId || this.gameOver) {
      return;
    }

    if (matches.indexes.length === 0) {
      await this.playInvalidSwap(firstIndex, secondIndex, beforeBoard, animationId);
      return;
    }

    this.history.push({
      board: beforeBoard,
      lastChainCount: this.lastChainCount,
      movesUsed: this.movesUsed,
      targetRemaining: this.targetRemaining,
    });
    this.movesUsed += 1;
    this.audio.place(matches.indexes.length);
    await this.resolveCascades(animationId);
  }

  async playInvalidSwap(firstIndex, secondIndex, beforeBoard, animationId) {
    this.statusLabel = 'Invalid';
    this.message = 'No match. Swap reverted.';
    this.audio.invalid();

    for (let flash = 0; flash < 2; flash += 1) {
      if (this.animationId !== animationId || this.gameOver) {
        return;
      }

      this.render(overridesFor([firstIndex, secondIndex], PAD_LIGHT.warning));
      await sleep(INVALID_FLASH_MS);
      this.render();
      await sleep(INVALID_FLASH_MS);
    }

    if (this.animationId !== animationId || this.gameOver) {
      return;
    }

    this.board = beforeBoard;
    this.animating = false;
    this.statusLabel = 'Playing';
    this.render();
    this.notify();
  }

  async resolveCascades(animationId) {
    let chainCount = 0;

    while (this.animationId === animationId && !this.gameOver) {
      const matches = findMatches(this.board);

      if (matches.indexes.length === 0) {
        break;
      }

      chainCount += 1;
      this.lastChainCount = chainCount;
      this.statusLabel = chainCount === 1 ? 'Clearing' : `Chain ${chainCount}`;
      const targetHits = matches.indexes.filter((index) => this.board[index] === this.targetColor).length;

      this.targetRemaining = Math.max(0, this.targetRemaining - targetHits);
      this.message = targetHits > 0
        ? `Cleared ${targetHits} target panels.`
        : `Chain ${chainCount}.`;
      this.notify();
      await this.flashMatches(matches, chainCount, animationId);

      if (this.animationId !== animationId || this.gameOver) {
        return;
      }

      this.board = clearMatches(this.board, matches.indexes);
      this.render();
      await sleep(CLEAR_GAP_MS);

      if (this.animationId !== animationId || this.gameOver) {
        return;
      }

      this.board = collapseAndFill(this.board, MATCH3_COLOR_COUNT);
      this.statusLabel = 'Dropping';
      this.render();
      this.notify();
      await sleep(DROP_MS);
    }

    if (this.animationId !== animationId || this.gameOver) {
      return;
    }

    if (this.targetRemaining <= 0) {
      await this.finishClear(animationId);
      return;
    }

    if (this.movesUsed >= this.moveLimit) {
      await this.finishOutOfMoves(animationId);
      return;
    }

    if (!hasValidMove(this.board)) {
      await this.finishNoMoves(animationId);
      return;
    }

    this.animating = false;
    this.statusLabel = 'Playing';
    this.message = 'Choose a swap.';
    this.render();
    this.notify();
  }

  async flashMatches(matches, chainCount, animationId) {
    const flashCount = matches.maxGroupLength >= 5
      ? 3
      : matches.maxGroupLength === 4
        ? 2
        : 1;
    const groups = matches.groups.length > 1 ? matches.groups : [matches.indexes];

    for (let flash = 0; flash < flashCount; flash += 1) {
      for (const group of groups) {
        if (this.animationId !== animationId || this.gameOver) {
          return;
        }

        this.render(overridesFor(group, CLEAR_LIGHT));
        await sleep(CLEAR_FLASH_MS);
        this.render();
        await sleep(CLEAR_FLASH_MS);
      }
    }

    if (chainCount >= 3 && this.animationId === animationId && !this.gameOver) {
      this.pad.renderFrame(Array.from({ length: 64 }, () => CLEAR_LIGHT));
      await sleep(CHAIN_FLASH_MS);
      this.render();
      await sleep(CHAIN_FLASH_MS);
    }
  }

  async finishClear(animationId) {
    if (this.gameOver || this.animationId !== animationId) {
      return;
    }

    this.gameOver = true;
    this.awaitingNewGame = false;
    this.animating = true;
    this.statusLabel = 'Clear';
    this.message = `Clear in ${this.movesUsed} moves.`;
    this.audio.win();
    this.render();
    this.notify();

    await this.playColorSweep(animationId);
    await this.animations?.playWin();

    if (this.animationId !== animationId) {
      return;
    }

    this.animating = false;
    this.awaitingNewGame = true;
    this.message = `Clear in ${this.movesUsed} moves. Press any pad for a new game.`;
    this.render();
    this.notify();
  }

  async finishOutOfMoves(animationId) {
    if (this.gameOver || this.animationId !== animationId) {
      return;
    }

    this.gameOver = true;
    this.awaitingNewGame = false;
    this.animating = true;
    this.statusLabel = 'Out';
    this.message = 'Out of moves.';
    this.audio.lose();
    this.render();
    this.notify();

    await this.animations?.playLose();

    if (this.animationId !== animationId) {
      return;
    }

    this.animating = false;
    this.awaitingNewGame = true;
    this.message = 'Out of moves. Press any pad for a new game.';
    this.render();
    this.notify();
  }

  async finishNoMoves(animationId) {
    if (this.gameOver || this.animationId !== animationId) {
      return;
    }

    this.gameOver = true;
    this.awaitingNewGame = false;
    this.animating = true;
    this.statusLabel = 'No Moves';
    this.message = 'No valid swaps remain.';
    this.audio.lose();
    this.render();
    this.notify();

    await this.animations?.playLose();

    if (this.animationId !== animationId) {
      return;
    }

    this.animating = false;
    this.awaitingNewGame = true;
    this.message = 'No valid swaps remain. Press any pad for a new game.';
    this.render();
    this.notify();
  }

  async playTargetIntro(animationId) {
    for (let blink = 0; blink < INTRO_BLINKS; blink += 1) {
      if (this.animationId !== animationId) {
        return;
      }

      this.pad.renderFrame(this.targetNumberFrame(true));
      await sleep(INTRO_ON_MS);
      this.pad.renderFrame(this.targetNumberFrame(false));
      await sleep(INTRO_OFF_MS);
    }

    if (this.animationId !== animationId) {
      return;
    }

    this.animating = false;
    this.statusLabel = 'Playing';
    this.message = 'Choose a swap.';
    this.render();
    this.notify();
  }

  targetNumberFrame(visible) {
    const frame = emptyFrame();

    if (!visible) {
      return frame;
    }

    const digits = String(this.targetQuota).padStart(2, '0').split('').map(Number);
    const light = MATCH3_LIGHTS[this.targetColor];

    drawDigit(frame, digits[0], 0, 1, light);
    drawDigit(frame, digits[1], 4, 1, light);
    return frame;
  }

  async playColorSweep(runId = ++this.animationId) {

    for (let step = 0; step < 12; step += 1) {
      if (this.animationId !== runId) {
        return;
      }

      const frame = emptyFrame();

      for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) {
          const colorIndex = (x + y + step) % MATCH3_LIGHTS.length;
          frame[indexOf(x, y)] = MATCH3_LIGHTS[colorIndex];
        }
      }

      this.pad.renderFrame(frame);
      await sleep(90);
    }
  }

  render(overrides = new Map()) {
    const frame = emptyFrame();
    const adjacentIndexes = this.selectedIndex === null
      ? new Set()
      : new Set(getAdjacentIndexes(this.selectedIndex));

    this.board.forEach((colorIndex, cellIndex) => {
      if (colorIndex === null || colorIndex === undefined) {
        frame[cellIndex] = PAD_LIGHT.off;
        return;
      }

      const light = MATCH3_LIGHTS[colorIndex];

      if (cellIndex === this.selectedIndex) {
        frame[cellIndex] = {
          ...light,
          midi: Math.min(127, light.midi + 16),
          effect: LIGHT_EFFECT.PULSE,
        };
      } else if (adjacentIndexes.has(cellIndex)) {
        frame[cellIndex] = {
          ...light,
          midi: Math.min(127, light.midi + 8),
          effect: LIGHT_EFFECT.PULSE,
        };
      } else {
        frame[cellIndex] = light;
      }
    });

    overrides.forEach((light, cellIndex) => {
      frame[cellIndex] = light;
    });

    this.pad.renderFrame(frame);
  }

  notify() {
    this.onChange?.(this.getState());
  }

  applyDifficulty() {
    this.config = MATCH3_DIFFICULTY[this.difficulty] ?? MATCH3_DIFFICULTY.normal;
  }

  targetLabel() {
    return MATCH3_LIGHTS[this.targetColor]?.label ?? 'Color';
  }
}

const DIGITS = {
  0: ['111', '101', '101', '101', '111'],
  1: ['010', '110', '010', '010', '111'],
  2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'],
  4: ['101', '101', '111', '001', '001'],
  5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'],
  7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
};

function drawDigit(frame, digit, offsetX, offsetY, light) {
  DIGITS[digit].forEach((row, y) => {
    row.split('').forEach((cell, x) => {
      if (cell === '1') {
        frame[indexOf(offsetX + x, offsetY + y)] = light;
      }
    });
  });
}

function overridesFor(indexes, light) {
  const overrides = new Map();

  indexes.forEach((index) => {
    overrides.set(index, {
      ...light,
      effect: LIGHT_EFFECT.FLASH,
    });
  });

  return overrides;
}

function formatColorLabel(colorIndex) {
  const light = MATCH3_LIGHTS[colorIndex];

  if (!light) {
    return 'Unknown color';
  }

  return light.label;
}

function sleep(ms) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}
