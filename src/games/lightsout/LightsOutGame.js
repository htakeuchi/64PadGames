import { LIGHT_EFFECT, PAD_LIGHT, emptyFrame } from '../../pad/PadLights.js';
import {
  boardToPadCell,
  countLightsOn,
  createPuzzle,
  getAffectedIndexes,
  isClear,
  normalizeBoardSize,
  padToBoardIndex,
  toggleAt,
} from './lightsOutLogic.js';

const HIGHLIGHT_MS = 240;
const END_BOARD_HOLD_MS = 500;

const LIGHTS_OUT_ON = {
  ...PAD_LIGHT.player,
  label: 'On',
};

const LIGHTS_OUT_OFF = {
  ...PAD_LIGHT.dim,
  label: 'Off',
};

export class LightsOutGame {
  constructor({ pad, audio, onChange }) {
    this.pad = pad;
    this.audio = audio;
    this.onChange = onChange;
    this.animations = null;
    this.difficulty = 'normal';
    this.boardSize = 5;
    this.board = [];
    this.movesUsed = 0;
    this.parMoves = 0;
    this.bestMoves = new Map();
    this.history = [];
    this.lastAffectedIndexes = [];
    this.message = '';
    this.statusLabel = 'Ready';
    this.gameOver = false;
    this.awaitingNewGame = false;
    this.highlightTimer = null;
    this.animationId = 0;
  }

  start(options = {}) {
    this.difficulty = options.difficulty ?? this.difficulty;
    this.boardSize = normalizeBoardSize(options.boardSize ?? this.boardSize);
    this.animations = options.animations ?? this.animations;
    this.restart();
  }

  restart() {
    this.animationId += 1;
    this.cancelHighlightTimer();
    this.animations?.cancel();
    const puzzle = createPuzzle(this.boardSize, this.difficulty);

    this.board = puzzle.board;
    this.parMoves = puzzle.parMoves;
    this.movesUsed = 0;
    this.history = [];
    this.lastAffectedIndexes = [];
    this.gameOver = false;
    this.awaitingNewGame = false;
    this.statusLabel = `${this.boardSize}x${this.boardSize}`;
    this.message = 'Turn off all lights.';
    this.render();
    this.notify();
  }

  destroy() {
    this.animationId += 1;
    this.cancelHighlightTimer();
  }

  setDifficulty(difficulty) {
    this.difficulty = difficulty;
    this.restart();
  }

  setBoardSize(size) {
    this.boardSize = normalizeBoardSize(size);
    this.restart();
  }

  handlePadTap({ x, y }) {
    if (this.gameOver) {
      if (this.awaitingNewGame) {
        this.restart();
      }

      return;
    }

    const boardIndex = padToBoardIndex(x, y, this.boardSize);

    if (boardIndex === null) {
      this.message = 'Tap inside the board.';
      this.audio.invalid();
      this.flashCell(x, y);
      this.notify();
      return;
    }

    this.playMove(boardIndex);
  }

  undo() {
    if (this.history.length === 0 || this.gameOver) {
      this.audio.invalid();
      return;
    }

    const snapshot = this.history.pop();

    this.board = [...snapshot.board];
    this.movesUsed = snapshot.movesUsed;
    this.lastAffectedIndexes = [];
    this.message = 'Undid one move.';
    this.audio.undo();
    this.cancelHighlightTimer();
    this.render();
    this.notify();
  }

  async playDebugAnimation(result) {
    this.animationId += 1;
    this.animations?.cancel();

    if (result === 'win') {
      this.audio.win();
      await this.animations?.playWin();
    }

    if (result === 'lose') {
      this.audio.lose();
      await this.animations?.playLose();
    }

    if (result === 'draw') {
      this.audio.draw();
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
    return [
      LIGHTS_OUT_ON,
      LIGHTS_OUT_OFF,
      PAD_LIGHT.last,
      PAD_LIGHT.warning,
      PAD_LIGHT.dim,
    ];
  }

  getState() {
    const bestKey = this.bestKey();

    return {
      kind: 'lightsout',
      boardSize: this.boardSize,
      difficulty: this.difficulty,
      gameOver: this.gameOver,
      movesUsed: this.movesUsed,
      parMoves: this.parMoves,
      bestMoves: this.bestMoves.get(bestKey) ?? null,
      lightsOnCount: countLightsOn(this.board),
      canUndo: this.history.length > 0 && !this.gameOver,
      message: this.message,
      statusLabel: this.statusLabel,
    };
  }

  playMove(boardIndex) {
    this.history.push({
      board: [...this.board],
      movesUsed: this.movesUsed,
    });
    this.board = toggleAt(this.board, this.boardSize, boardIndex);
    this.movesUsed += 1;
    this.lastAffectedIndexes = getAffectedIndexes(this.boardSize, boardIndex);
    this.message = `${countLightsOn(this.board)} lights remain.`;
    this.audio.place(this.lastAffectedIndexes.length);
    this.render();
    this.notify();
    this.scheduleHighlightClear();

    if (isClear(this.board)) {
      this.finishGame();
    }
  }

  finishGame() {
    if (this.gameOver) {
      return;
    }

    this.gameOver = true;
    this.awaitingNewGame = false;
    this.cancelHighlightTimer();
    const bestKey = this.bestKey();
    const previousBest = this.bestMoves.get(bestKey);

    if (previousBest === undefined || this.movesUsed < previousBest) {
      this.bestMoves.set(bestKey, this.movesUsed);
    }

    this.message = `Clear in ${this.movesUsed} moves.`;
    this.audio.win();
    this.render();
    this.notify();
    this.playEndSequence(this.message);
  }

  async playEndSequence(endMessage) {
    const animationId = ++this.animationId;

    await sleep(END_BOARD_HOLD_MS);

    if (this.animationId !== animationId || !this.gameOver) {
      return;
    }

    const completed = (await this.animations?.playWin()) ?? true;

    if (!completed || this.animationId !== animationId || !this.gameOver) {
      return;
    }

    this.render();
    this.awaitingNewGame = true;
    this.message = `${endMessage} Press any pad for a new game.`;
    this.notify();
  }

  render() {
    const frame = emptyFrame();
    const highlighted = new Set(this.lastAffectedIndexes);

    this.board.forEach((isOn, boardIndex) => {
      const { x, y } = boardToPadCell(boardIndex, this.boardSize);
      let light = isOn ? LIGHTS_OUT_ON : LIGHTS_OUT_OFF;

      if (highlighted.has(boardIndex)) {
        light = {
          ...light,
          effect: LIGHT_EFFECT.PULSE,
        };
      }

      frame[y * 8 + x] = light;
    });

    this.pad.renderFrame(frame);
  }

  flashCell(x, y) {
    this.pad.setCell(x, y, {
      ...PAD_LIGHT.warning,
      effect: LIGHT_EFFECT.FLASH,
    });
    window.setTimeout(() => this.render(), 260);
  }

  scheduleHighlightClear() {
    this.cancelHighlightTimer();

    if (typeof window === 'undefined') {
      return;
    }

    this.highlightTimer = window.setTimeout(() => {
      this.highlightTimer = null;
      this.lastAffectedIndexes = [];
      this.render();
    }, HIGHLIGHT_MS);
  }

  cancelHighlightTimer() {
    if (!this.highlightTimer || typeof window === 'undefined') {
      this.highlightTimer = null;
      return;
    }

    window.clearTimeout(this.highlightTimer);
    this.highlightTimer = null;
  }

  bestKey() {
    return `${this.boardSize}:${this.difficulty}`;
  }

  notify() {
    this.onChange?.(this.getState());
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
