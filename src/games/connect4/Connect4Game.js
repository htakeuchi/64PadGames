import { LIGHT_EFFECT, PAD_LIGHT, emptyFrame } from '../../pad/PadLights.js';
import { chooseCpuMove } from './connect4Cpu.js';
import {
  BLACK,
  COLUMN_COUNT,
  EMPTY,
  ROW_COUNT,
  WHITE,
  applyMove,
  canPlayColumn,
  countPieces,
  createInitialBoard,
  findWinner,
  getLegalColumns,
  indexOf,
  isGameOver,
  opponentOf,
  playerName,
  winnerOf,
} from './connect4Logic.js';

const BOARD_PAD_Y = 2;
const CPU_THINK_DELAY_MS = 360;
const CPU_MOVE_HOLD_MS = 320;
const END_BOARD_HOLD_MS = 500;
const CONNECT4_CPU_LIGHT = {
  id: 'connect4-cpu',
  midi: 5,
  css: '#ff4f4f',
  label: 'CPU',
};

export class Connect4Game {
  constructor({ pad, audio, onChange }) {
    this.pad = pad;
    this.audio = audio;
    this.onChange = onChange;
    this.animations = null;
    this.humanPlayer = BLACK;
    this.cpuPlayer = WHITE;
    this.difficulty = 'normal';
    this.board = createInitialBoard();
    this.currentPlayer = BLACK;
    this.lastMove = null;
    this.history = [];
    this.message = '';
    this.thinking = false;
    this.gameOver = false;
    this.awaitingNewGame = false;
    this.cpuTimer = null;
    this.animationId = 0;
  }

  start(options = {}) {
    this.humanPlayer = options.humanPlayer ?? this.humanPlayer;
    this.cpuPlayer = opponentOf(this.humanPlayer);
    this.difficulty = options.difficulty ?? this.difficulty;
    this.animations = options.animations ?? this.animations;
    this.restart();
  }

  restart() {
    this.animationId += 1;
    this.cancelCpuTimer();
    this.animations?.cancel();
    this.board = createInitialBoard();
    this.currentPlayer = BLACK;
    this.lastMove = null;
    this.history = [];
    this.thinking = false;
    this.gameOver = false;
    this.awaitingNewGame = false;
    this.message = this.humanPlayer === BLACK ? 'Choose a column.' : "CPU's turn.";
    this.render();
    this.notify();
    this.resolveTurn();
  }

  destroy() {
    this.animationId += 1;
    this.cancelCpuTimer();
    this.animations?.cancel();
  }

  setHumanPlayer(player) {
    this.humanPlayer = player;
    this.cpuPlayer = opponentOf(player);
    this.restart();
  }

  setDifficulty(difficulty) {
    this.difficulty = difficulty;
  }

  handlePadTap({ x, y }) {
    if (this.gameOver) {
      if (this.awaitingNewGame) {
        this.restart();
      }

      return;
    }

    if (this.thinking || this.currentPlayer !== this.humanPlayer) {
      this.audio.invalid();
      return;
    }

    if (x < 0 || x >= COLUMN_COUNT) {
      this.message = 'Use one of the seven columns.';
      this.audio.invalid();
      this.flashCell(x, y);
      this.notify();
      return;
    }

    if (!canPlayColumn(this.board, x)) {
      this.message = 'That column is full.';
      this.audio.invalid();
      this.flashCell(x, y);
      this.notify();
      return;
    }

    this.playHumanMove(x);
  }

  undo() {
    if (this.history.length === 0 || this.thinking) {
      this.audio.invalid();
      return;
    }

    this.cancelCpuTimer();
    this.animationId += 1;
    this.animations?.cancel();

    let snapshot = this.history.pop();

    if (snapshot.movePlayer === this.cpuPlayer && this.history.length > 0) {
      snapshot = this.history.pop();
    }

    this.board = [...snapshot.board];
    this.currentPlayer = snapshot.currentPlayer;
    this.lastMove = snapshot.lastMove ? { ...snapshot.lastMove } : null;
    this.thinking = false;
    this.gameOver = false;
    this.awaitingNewGame = false;
    this.message = 'Undid one turn.';
    this.audio.undo();
    this.render();
    this.notify();
    this.resolveTurn();
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
      PAD_LIGHT.player,
      CONNECT4_CPU_LIGHT,
      PAD_LIGHT.legal,
      PAD_LIGHT.warning,
      PAD_LIGHT.dim,
    ];
  }

  getState() {
    const score = countPieces(this.board);
    const legalColumns = this.gameOver ? [] : getLegalColumns(this.board);
    const winner = this.gameOver ? winnerOf(this.board) : EMPTY;

    return {
      kind: 'connect4',
      score,
      currentPlayer: this.currentPlayer,
      currentPlayerName: playerName(this.currentPlayer),
      humanPlayer: this.humanPlayer,
      cpuPlayer: this.cpuPlayer,
      difficulty: this.difficulty,
      canPass: false,
      canUndo: this.history.length > 0 && !this.thinking && !this.gameOver,
      gameOver: this.gameOver,
      legalMoveCount: legalColumns.length,
      message: this.message,
      thinking: this.thinking,
      winner,
    };
  }

  playHumanMove(column) {
    this.pushSnapshot(this.humanPlayer);
    const result = this.applyColumn(column, this.humanPlayer);
    this.currentPlayer = this.cpuPlayer;
    this.message = 'Your move is complete.';
    this.audio.connect4Drop(result.y);
    this.render();
    this.notify();
    this.resolveTurn();
  }

  applyColumn(column, player) {
    const result = applyMove(this.board, column, player);

    this.board = result.board;
    this.lastMove = {
      x: result.x,
      y: result.y,
      index: result.index,
      player,
    };

    return result;
  }

  resolveTurn() {
    if (isGameOver(this.board)) {
      this.finishGame();
      return;
    }

    if (this.currentPlayer === this.cpuPlayer) {
      this.scheduleCpuMove();
      return;
    }

    this.message = 'Choose a column.';
    this.render();
    this.notify();
  }

  scheduleCpuMove() {
    this.cancelCpuTimer();
    this.thinking = true;
    this.message = 'CPU is thinking.';
    this.render();
    this.notify();

    this.cpuTimer = window.setTimeout(() => {
      this.cpuTimer = null;
      this.runCpuTurn();
    }, CPU_THINK_DELAY_MS);
  }

  async runCpuTurn() {
    if (this.gameOver || this.currentPlayer !== this.cpuPlayer) {
      return;
    }

    const column = chooseCpuMove(this.board, this.cpuPlayer, this.difficulty);

    if (column === null) {
      this.finishGame();
      return;
    }

    const animationId = ++this.animationId;

    this.pushSnapshot(this.cpuPlayer);
    this.thinking = true;
    const result = this.applyColumn(column, this.cpuPlayer);
    this.message = 'CPU dropped a disc.';
    this.audio.connect4Drop(result.y);
    this.render();
    this.notify();

    if (isGameOver(this.board)) {
      this.finishGame();
      return;
    }

    await sleep(CPU_MOVE_HOLD_MS);

    if (this.animationId !== animationId || this.gameOver) {
      return;
    }

    this.thinking = false;
    this.currentPlayer = this.humanPlayer;
    this.render();
    this.notify();
    this.resolveTurn();
  }

  finishGame() {
    if (this.gameOver) {
      return;
    }

    this.gameOver = true;
    this.thinking = false;
    this.awaitingNewGame = false;
    const winner = winnerOf(this.board);
    const endMessage = getEndMessage(winner, this.humanPlayer);

    if (winner === this.humanPlayer) {
      this.audio.win();
    } else if (winner === this.cpuPlayer) {
      this.audio.lose();
    } else {
      this.audio.draw();
    }

    this.message = endMessage;
    this.render();
    this.notify();
    this.playEndSequence(winner, endMessage);
  }

  async playEndSequence(winner, endMessage) {
    const animationId = ++this.animationId;

    await sleep(END_BOARD_HOLD_MS);

    if (this.animationId !== animationId || !this.gameOver) {
      return;
    }

    let completed = true;

    if (winner === this.humanPlayer) {
      completed = (await this.animations?.playWin()) ?? true;
    } else if (winner === this.cpuPlayer) {
      completed = (await this.animations?.playLose()) ?? true;
    } else {
      completed = (await this.animations?.playDraw()) ?? true;
    }

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
    const legalColumns = this.currentPlayer === this.humanPlayer && !this.gameOver && !this.thinking
      ? getLegalColumns(this.board)
      : [];
    const legalColumnSet = new Set(legalColumns);
    const winnerInfo = findWinner(this.board);
    const winningIndexes = new Set(winnerInfo.indexes);

    for (let column = 0; column < COLUMN_COUNT; column += 1) {
      frame[column] = legalColumnSet.has(column)
        ? { ...PAD_LIGHT.legal, effect: LIGHT_EFFECT.PULSE }
        : PAD_LIGHT.dim;
    }

    for (let y = 0; y < ROW_COUNT; y += 1) {
      for (let x = 0; x < COLUMN_COUNT; x += 1) {
        const boardIndex = indexOf(x, y);
        const padIndex = (y + BOARD_PAD_Y) * 8 + x;
        const cell = this.board[boardIndex];
        let light = PAD_LIGHT.dim;

        if (cell === this.humanPlayer) {
          light = PAD_LIGHT.player;
        } else if (cell === this.cpuPlayer) {
          light = CONNECT4_CPU_LIGHT;
        }

        if (
          this.lastMove?.index === boardIndex
          && !winningIndexes.has(boardIndex)
          && cell !== EMPTY
        ) {
          light = {
            ...light,
            effect: LIGHT_EFFECT.PULSE,
          };
        }

        if (winningIndexes.has(boardIndex)) {
          light = {
            ...light,
            effect: LIGHT_EFFECT.PULSE,
          };
        }

        frame[padIndex] = light;
      }
    }

    this.pad.renderFrame(frame);
  }

  flashCell(x, y) {
    this.pad.setCell(x, y, {
      ...PAD_LIGHT.warning,
      effect: LIGHT_EFFECT.FLASH,
    });
    window.setTimeout(() => this.render(), 260);
  }

  pushSnapshot(movePlayer) {
    this.history.push({
      board: [...this.board],
      currentPlayer: this.currentPlayer,
      lastMove: this.lastMove ? { ...this.lastMove } : null,
      movePlayer,
    });
  }

  cancelCpuTimer() {
    if (this.cpuTimer) {
      window.clearTimeout(this.cpuTimer);
      this.cpuTimer = null;
    }
    this.thinking = false;
  }

  notify() {
    this.onChange?.(this.getState());
  }
}

export { BLACK, WHITE };

function getEndMessage(winner, humanPlayer) {
  if (winner === EMPTY) {
    return 'Draw. Board is full.';
  }

  if (winner === humanPlayer) {
    return 'You win. Four connected.';
  }

  return 'CPU wins. Four connected.';
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
