import { LIGHT_EFFECT, PAD_LIGHT, emptyFrame } from '../../pad/PadLights.js';
import {
  MINE_COUNT_BY_DIFFICULTY,
  cellAt,
  countFlags,
  countOpenedSafeCells,
  generateBoard,
  hasWon,
  indexOf,
  openCells,
} from './minesweeperLogic.js';

const NUMBER_BLINK_DELAY_MS = 360;
const NUMBER_BLINK_MS = 350;

export class MinesweeperGame {
  constructor({ pad, audio, onChange }) {
    this.pad = pad;
    this.audio = audio;
    this.onChange = onChange;
    this.animations = null;
    this.difficulty = 'normal';
    this.mineCount = MINE_COUNT_BY_DIFFICULTY.normal;
    this.cells = [];
    this.generated = false;
    this.gameOver = false;
    this.awaitingNewGame = false;
    this.revealingMines = false;
    this.message = '';
    this.statusLabel = 'Ready';
    this.blinkId = 0;
  }

  start(options = {}) {
    this.difficulty = options.difficulty ?? this.difficulty;
    this.mineCount = MINE_COUNT_BY_DIFFICULTY[this.difficulty] ?? MINE_COUNT_BY_DIFFICULTY.normal;
    this.animations = options.animations ?? this.animations;
    this.restart();
  }

  restart() {
    this.animations?.cancel();
    this.blinkId += 1;
    this.cells = Array.from({ length: 64 }, () => ({
      adjacent: 0,
      flagged: false,
      mine: false,
      open: false,
    }));
    this.generated = false;
    this.gameOver = false;
    this.awaitingNewGame = false;
    this.revealingMines = false;
    this.message = 'Tap a pad to start.';
    this.statusLabel = 'Playing';
    this.render();
    this.notify();
  }

  setDifficulty(difficulty) {
    this.difficulty = difficulty;
    this.mineCount = MINE_COUNT_BY_DIFFICULTY[difficulty] ?? MINE_COUNT_BY_DIFFICULTY.normal;
    this.restart();
  }

  handlePadTap({ x, y }) {
    if (this.gameOver) {
      if (this.awaitingNewGame) {
        this.restart();
      }

      return;
    }

    const index = indexOf(x, y);
    const cell = this.cells[index];

    if (cell.flagged) {
      this.message = 'Flagged. Hold to clear the flag.';
      this.audio.invalid();
      this.notify();
      return;
    }

    if (!this.generated) {
      const flaggedIndexes = this.cells
        .map((candidate, candidateIndex) => (candidate.flagged ? candidateIndex : null))
        .filter((candidateIndex) => candidateIndex !== null && candidateIndex !== index);
      this.cells = generateBoard(index, this.mineCount);
      flaggedIndexes.forEach((flaggedIndex) => {
        this.cells[flaggedIndex].flagged = true;
      });
      this.generated = true;
    }

    const currentCell = this.cells[index];

    if (currentCell.open) {
      this.message = `Adjacent mines: ${currentCell.adjacent}`;
      this.audio.place(currentCell.adjacent);
      this.blinkNumber(x, y, currentCell.adjacent);
      this.notify();
      return;
    }

    if (currentCell.mine) {
      this.triggerMine(x, y);
      return;
    }

    const opened = openCells(this.cells, index);
    this.message = opened.length > 1
      ? `Opened ${opened.length} cells. Adjacent mines: ${currentCell.adjacent}`
      : `Adjacent mines: ${currentCell.adjacent}`;
    this.audio.place(currentCell.adjacent);
    this.render();
    this.notify();

    if (this.checkWin()) {
      return;
    }

    this.blinkNumber(x, y, currentCell.adjacent);
  }

  handlePadHold({ x, y }) {
    if (this.gameOver) {
      return;
    }

    const index = indexOf(x, y);
    const cell = this.cells[index];

    if (cell.open) {
      this.message = `Adjacent mines: ${cell.adjacent}`;
      this.audio.place(cell.adjacent);
      this.blinkNumber(x, y, cell.adjacent);
      this.notify();
      return;
    }

    cell.flagged = !cell.flagged;
    this.message = cell.flagged ? 'Flag placed.' : 'Flag cleared.';
    this.audio.pass();
    this.render();
    this.notify();
  }

  async playDebugAnimation(result) {
    this.blinkId += 1;
    this.animations?.cancel();

    if (result === 'win') {
      this.audio.win();
      await this.animations?.playWin();
    }

    if (result === 'lose') {
      this.audio.lose();
      await this.animations?.playExplosion({ x: 3.5, y: 3.5 });
    }

    if (result === 'draw') {
      this.audio.draw();
      await this.animations?.playDraw();
    }

    this.render();
  }

  async playDebugColors() {
    this.blinkId += 1;
    this.animations?.cancel();
    this.audio.pass();
    await this.animations?.playColorList(this.getDebugColors());
    this.render();
  }

  getDebugColors() {
    return [
      PAD_LIGHT.dim,
      PAD_LIGHT.flag,
      PAD_LIGHT.mine,
      PAD_LIGHT.player,
      PAD_LIGHT.opponent,
      PAD_LIGHT.warning,
    ];
  }

  getState() {
    const openedCount = countOpenedSafeCells(this.cells);
    const flagCount = countFlags(this.cells);

    return {
      kind: 'minesweeper',
      difficulty: this.difficulty,
      flagCount,
      gameOver: this.gameOver,
      hiddenCount: this.cells.length - openedCount - flagCount,
      mineCount: this.mineCount,
      message: this.message,
      openedCount,
      statusLabel: this.statusLabel,
    };
  }

  async triggerMine(x, y) {
    const index = indexOf(x, y);

    this.cells[index].open = true;
    this.gameOver = true;
    this.awaitingNewGame = false;
    this.statusLabel = 'Boom';
    this.message = 'Boom.';
    this.audio.lose();
    this.render();
    this.notify();

    await this.animations?.playExplosion({ x, y });

    this.revealingMines = true;
    this.awaitingNewGame = true;
    this.message = 'Boom. Press any pad for a new game.';
    this.render();
    this.notify();
  }

  checkWin() {
    if (!hasWon(this.cells, this.mineCount)) {
      return false;
    }

    this.playWinSequence();
    return true;
  }

  async playWinSequence() {
    this.gameOver = true;
    this.awaitingNewGame = false;
    this.statusLabel = 'Clear';
    this.message = 'Clear.';
    this.audio.win();
    this.render();
    this.notify();

    await this.animations?.playWin();

    this.cells.forEach((cell) => {
      if (cell.mine) {
        cell.flagged = true;
      }
    });
    this.awaitingNewGame = true;
    this.message = 'Clear. Press any pad for a new game.';
    this.render();
    this.notify();
  }

  async blinkNumber(x, y, count) {
    const blinkId = ++this.blinkId;

    if (count === 0 || this.gameOver) {
      return;
    }

    await sleep(NUMBER_BLINK_DELAY_MS);

    for (let index = 0; index < count; index += 1) {
      if (this.blinkId !== blinkId) {
        return;
      }

      this.pad.setCell(x, y, {
        ...PAD_LIGHT.player,
        effect: LIGHT_EFFECT.STATIC,
      });
      await sleep(NUMBER_BLINK_MS);
      this.render();
      await sleep(NUMBER_BLINK_MS);
    }
  }

  render() {
    const frame = emptyFrame();

    this.cells.forEach((cell, index) => {
      const { x, y } = cellAt(index);

      if (this.revealingMines && cell.mine) {
        frame[indexOf(x, y)] = PAD_LIGHT.mine;
      } else if (cell.flagged) {
        frame[indexOf(x, y)] = PAD_LIGHT.flag;
      } else if (cell.open && cell.mine) {
        frame[indexOf(x, y)] = {
          ...PAD_LIGHT.mine,
          effect: LIGHT_EFFECT.FLASH,
        };
      } else if (cell.open) {
        frame[indexOf(x, y)] = PAD_LIGHT.dim;
      } else {
        frame[indexOf(x, y)] = PAD_LIGHT.off;
      }
    });

    this.pad.renderFrame(frame);
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
