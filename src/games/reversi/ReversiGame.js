import { LIGHT_EFFECT, PAD_LIGHT, emptyFrame } from '../../pad/PadLights.js';
import { chooseCpuMove } from './reversiCpu.js';
import {
  BLACK,
  EMPTY,
  WHITE,
  applyMove,
  countPieces,
  createInitialBoard,
  getLegalMoves,
  indexOf,
  isGameOver,
  opponentOf,
  playerName,
  winnerOf,
} from './reversiLogic.js';

const CPU_THINK_DELAY_MS = 360;
const END_BOARD_HOLD_MS = 500;

export class ReversiGame {
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
    this.autoPassing = false;
    this.awaitingNewGame = false;
    this.cpuTimer = null;
    this.endSequenceId = 0;
  }

  start(options = {}) {
    this.humanPlayer = options.humanPlayer ?? this.humanPlayer;
    this.cpuPlayer = opponentOf(this.humanPlayer);
    this.difficulty = options.difficulty ?? this.difficulty;
    this.animations = options.animations ?? this.animations;
    this.restart();
  }

  restart() {
    this.endSequenceId += 1;
    this.cancelCpuTimer();
    this.animations?.cancel();
    this.board = createInitialBoard();
    this.currentPlayer = BLACK;
    this.lastMove = null;
    this.history = [];
    this.thinking = false;
    this.gameOver = false;
    this.autoPassing = false;
    this.awaitingNewGame = false;
    this.message = this.humanPlayer === BLACK ? 'Your turn.' : "CPU's turn.";
    this.render();
    this.notify();
    this.resolveTurn();
  }

  setHumanPlayer(player) {
    this.humanPlayer = player;
    this.cpuPlayer = opponentOf(player);
    this.restart();
  }

  setDifficulty(difficulty) {
    this.difficulty = difficulty;
  }

  handlePadDown({ x, y }) {
    if (this.gameOver) {
      if (this.awaitingNewGame) {
        this.restart();
      }

      return;
    }

    if (this.autoPassing || this.thinking || this.currentPlayer !== this.humanPlayer) {
      this.audio.invalid();
      return;
    }

    const move = this.findLegalMove(x, y, this.humanPlayer);

    if (!move) {
      this.message = 'That move is not legal.';
      this.audio.invalid();
      this.flashCell(x, y);
      this.notify();
      return;
    }

    this.playMove(move, this.humanPlayer);
  }

  pass() {
    if (!this.canPass()) {
      this.message = 'You still have a legal move.';
      this.audio.invalid();
      this.notify();
      return;
    }

    this.currentPlayer = this.cpuPlayer;
    this.message = 'You passed.';
    this.audio.pass();
    this.render();
    this.notify();
    this.resolveTurn();
  }

  undo() {
    if (this.history.length === 0) {
      this.audio.invalid();
      return;
    }

    this.cancelCpuTimer();

    let snapshot = this.history.pop();

    if (snapshot.movePlayer === this.cpuPlayer && this.history.length > 0) {
      snapshot = this.history.pop();
    }

    this.board = [...snapshot.board];
    this.currentPlayer = snapshot.currentPlayer;
    this.lastMove = snapshot.lastMove;
    this.message = 'Undid one move.';
    this.thinking = false;
    this.gameOver = false;
    this.autoPassing = false;
    this.awaitingNewGame = false;
    this.audio.undo();
    this.render();
    this.notify();
    this.resolveTurn();
  }

  async playDebugAnimation(result) {
    this.endSequenceId += 1;
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

  getState() {
    const score = countPieces(this.board);
    const legalMoves = getLegalMoves(this.board, this.currentPlayer);
    const winner = this.gameOver ? winnerOf(this.board) : EMPTY;

    return {
      score,
      currentPlayer: this.currentPlayer,
      currentPlayerName: playerName(this.currentPlayer),
      humanPlayer: this.humanPlayer,
      cpuPlayer: this.cpuPlayer,
      difficulty: this.difficulty,
      canPass: this.canPass(),
      canUndo: this.history.length > 0,
      gameOver: this.gameOver,
      legalMoveCount: legalMoves.length,
      message: this.message,
      thinking: this.thinking,
      winner,
    };
  }

  playMove(move, player) {
    this.history.push({
      board: [...this.board],
      currentPlayer: this.currentPlayer,
      lastMove: this.lastMove ? { ...this.lastMove } : null,
      movePlayer: player,
    });

    const result = applyMove(this.board, move, player);
    this.board = result.board;
    this.lastMove = { x: move.x, y: move.y, player };
    this.currentPlayer = opponentOf(player);
    this.message = `${playerName(player)} placed a disc.`;
    this.audio.place(result.flips.length);
    this.render();
    this.notify();
    this.resolveTurn();
  }

  resolveTurn() {
    if (isGameOver(this.board)) {
      this.finishGame();
      return;
    }

    const legalMoves = getLegalMoves(this.board, this.currentPlayer);

    if (legalMoves.length === 0) {
      this.autoPass(this.currentPlayer);
      return;
    }

    if (this.currentPlayer === this.cpuPlayer) {
      this.scheduleCpuMove();
      return;
    }

    this.message = 'Your turn.';
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
      this.thinking = false;
      const move = chooseCpuMove(this.board, this.cpuPlayer, this.difficulty);

      this.playMove(move, this.cpuPlayer);
    }, CPU_THINK_DELAY_MS);
  }

  finishGame() {
    if (this.gameOver) {
      return;
    }

    this.gameOver = true;
    this.thinking = false;
    this.autoPassing = false;
    this.awaitingNewGame = false;
    const score = countPieces(this.board);
    const winner = winnerOf(this.board);
    const endMessage = getEndMessage(winner, this.humanPlayer, score);

    if (winner === EMPTY) {
      this.audio.draw();
    } else if (winner === this.humanPlayer) {
      this.audio.win();
    } else {
      this.audio.lose();
    }

    this.message = endMessage;
    this.render();
    this.notify();
    this.playEndSequence(winner, endMessage);
  }

  async autoPass(player) {
    if (this.autoPassing || this.gameOver) {
      return;
    }

    this.autoPassing = true;
    this.message = player === this.humanPlayer
      ? 'No legal moves. Passing automatically.'
      : 'CPU has no legal moves. Passing automatically.';
    this.audio.pass();
    this.render();
    this.notify();

    await this.animations?.playPass();

    if (!this.autoPassing || this.gameOver) {
      return;
    }

    this.currentPlayer = opponentOf(player);
    this.autoPassing = false;
    this.render();
    this.notify();
    this.resolveTurn();
  }

  async playEndSequence(winner, endMessage) {
    const sequenceId = ++this.endSequenceId;

    await sleep(END_BOARD_HOLD_MS);

    if (this.endSequenceId !== sequenceId || !this.gameOver) {
      return;
    }

    let completed = true;

    if (winner === EMPTY) {
      completed = (await this.animations?.playDraw()) ?? true;
    } else if (winner === this.humanPlayer) {
      completed = (await this.animations?.playWin()) ?? true;
    } else {
      completed = (await this.animations?.playLose()) ?? true;
    }

    if (!completed || this.endSequenceId !== sequenceId || !this.gameOver) {
      return;
    }

    this.render();
    this.awaitingNewGame = true;
    this.message = `${endMessage} Press any pad for a new game.`;
    this.notify();
  }

  render() {
    const frame = emptyFrame();
    const legalMoves = this.currentPlayer === this.humanPlayer && !this.gameOver
      ? getLegalMoves(this.board, this.humanPlayer)
      : [];
    const legalMoveKeys = new Set(legalMoves.map((move) => `${move.x},${move.y}`));

    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const cell = this.board[indexOf(x, y)];
        const key = `${x},${y}`;

        if (cell === this.humanPlayer) {
          frame[indexOf(x, y)] = PAD_LIGHT.player;
        } else if (cell === this.cpuPlayer) {
          frame[indexOf(x, y)] = PAD_LIGHT.opponent;
        } else if (legalMoveKeys.has(key)) {
          frame[indexOf(x, y)] = {
            ...PAD_LIGHT.legal,
            effect: LIGHT_EFFECT.PULSE,
          };
        } else {
          frame[indexOf(x, y)] = PAD_LIGHT.off;
        }
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

  findLegalMove(x, y, player) {
    return getLegalMoves(this.board, player)
      .find((move) => move.x === x && move.y === y) ?? null;
  }

  canPass() {
    return !this.gameOver
      && !this.autoPassing
      && this.currentPlayer === this.humanPlayer
      && getLegalMoves(this.board, this.humanPlayer).length === 0;
  }

  cancelCpuTimer() {
    if (this.cpuTimer) {
      window.clearTimeout(this.cpuTimer);
      this.cpuTimer = null;
    }
  }

  notify() {
    this.onChange?.(this.getState());
  }
}

export { BLACK, WHITE };

function getEndMessage(winner, humanPlayer, score) {
  if (winner === EMPTY) {
    return `Draw. ${score.black}-${score.white}`;
  }

  if (winner === humanPlayer) {
    return `You win. ${score.black}-${score.white}`;
  }

  return `CPU wins. ${score.black}-${score.white}`;
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
