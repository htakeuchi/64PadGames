import { LIGHT_EFFECT, PAD_LIGHT, emptyFrame } from '../../pad/PadLights.js';
import { chooseCpuSequence } from './checkersCpu.js';
import {
  BLACK,
  BLACK_KING,
  EMPTY,
  WHITE,
  WHITE_KING,
  applyMove,
  countPieces,
  createInitialBoard,
  getCaptureMoves,
  getLegalMoves,
  indexOf,
  isGameOver,
  isKing,
  isPlayableSquare,
  opponentOf,
  pieceOwner,
  playerName,
  winnerOf,
} from './checkersLogic.js';

const CPU_THINK_DELAY_MS = 360;
const CPU_STEP_DELAY_MS = 260;
const CPU_MULTI_JUMP_STEP_DELAY_MS = 700;
const END_BOARD_HOLD_MS = 500;
const KING_BLINK_MS = 180;
const CHECKERS_CPU_LIGHT = {
  id: 'checkers-cpu',
  midi: 5,
  css: '#ff4f4f',
  label: 'CPU',
};

export class CheckersGame {
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
    this.selectedIndex = null;
    this.forcedFrom = null;
    this.lastMove = null;
    this.history = [];
    this.message = '';
    this.thinking = false;
    this.gameOver = false;
    this.awaitingNewGame = false;
    this.turnSnapshotPushed = false;
    this.cpuTimer = null;
    this.kingBlinkTimer = null;
    this.kingBlinkOn = true;
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
    this.startKingBlink();
    this.animations?.cancel();
    this.board = createInitialBoard();
    this.currentPlayer = BLACK;
    this.selectedIndex = null;
    this.forcedFrom = null;
    this.lastMove = null;
    this.history = [];
    this.thinking = false;
    this.gameOver = false;
    this.awaitingNewGame = false;
    this.turnSnapshotPushed = false;
    this.message = this.humanPlayer === BLACK ? 'Select a piece.' : "CPU's turn.";
    this.render();
    this.notify();
    this.resolveTurn();
  }

  destroy() {
    this.animationId += 1;
    this.cancelCpuTimer();
    this.stopKingBlink();
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

    const targetIndex = indexOf(x, y);
    const legalMoves = getLegalMoves(this.board, this.humanPlayer, this.forcedFrom);

    if (this.selectedIndex !== null) {
      const selectedMove = legalMoves.find((move) => (
        move.fromIndex === this.selectedIndex && move.toIndex === targetIndex
      ));

      if (selectedMove) {
        this.playHumanMove(selectedMove);
        return;
      }

      if (targetIndex === this.selectedIndex && this.forcedFrom === null) {
        this.selectedIndex = null;
        this.message = 'Selection cleared.';
        this.render();
        this.notify();
        return;
      }
    }

    if (this.forcedFrom !== null) {
      this.message = 'Continue the jump with the selected piece.';
      this.audio.invalid();
      this.flashCell(x, y);
      this.notify();
      return;
    }

    const selectable = legalMoves.some((move) => move.fromIndex === targetIndex);

    if (selectable) {
      this.selectedIndex = targetIndex;
      this.message = 'Choose a destination.';
      this.audio.place(0);
      this.render();
      this.notify();
      return;
    }

    this.message = 'That piece cannot move.';
    this.audio.invalid();
    this.flashCell(x, y);
    this.notify();
  }

  undo() {
    if (this.history.length === 0) {
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
    this.selectedIndex = snapshot.selectedIndex;
    this.forcedFrom = snapshot.forcedFrom;
    this.lastMove = snapshot.lastMove ? { ...snapshot.lastMove } : null;
    this.thinking = false;
    this.gameOver = false;
    this.awaitingNewGame = false;
    this.turnSnapshotPushed = false;
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
      CHECKERS_CPU_LIGHT,
      PAD_LIGHT.legal,
      PAD_LIGHT.last,
      PAD_LIGHT.warning,
      PAD_LIGHT.dim,
    ];
  }

  getState() {
    const score = countPieces(this.board);
    const legalMoves = this.gameOver
      ? []
      : getLegalMoves(this.board, this.currentPlayer, this.forcedFrom);
    const winner = this.gameOver ? winnerOf(this.board, this.currentPlayer) : EMPTY;

    return {
      kind: 'checkers',
      score,
      currentPlayer: this.currentPlayer,
      currentPlayerName: playerName(this.currentPlayer),
      humanPlayer: this.humanPlayer,
      cpuPlayer: this.cpuPlayer,
      difficulty: this.difficulty,
      canPass: false,
      canUndo: this.history.length > 0,
      gameOver: this.gameOver,
      legalMoveCount: legalMoves.length,
      message: this.message,
      selected: this.selectedIndex !== null,
      thinking: this.thinking,
      winner,
    };
  }

  playHumanMove(move) {
    this.pushHumanSnapshotOnce();
    this.applyStep(move);

    const additionalCaptures = move.isCapture && !move.promotes
      ? getCaptureMoves(this.board, this.humanPlayer, move.toIndex)
      : [];

    if (additionalCaptures.length > 0) {
      this.currentPlayer = this.humanPlayer;
      this.selectedIndex = move.toIndex;
      this.forcedFrom = move.toIndex;
      this.message = 'Continue the jump.';
      this.audio.place(2);
      this.render();
      this.notify();
      return;
    }

    this.selectedIndex = null;
    this.forcedFrom = null;
    this.turnSnapshotPushed = false;
    this.currentPlayer = this.cpuPlayer;
    this.message = 'Your move is complete.';
    this.audio.place(move.isCapture ? 2 : 0);
    this.render();
    this.notify();
    this.resolveTurn();
  }

  applyStep(move) {
    const result = applyMove(this.board, move);

    this.board = result.board;
    this.lastMove = {
      fromIndex: move.fromIndex,
      toIndex: move.toIndex,
      capturedIndex: move.capturedIndex,
    };
  }

  resolveTurn() {
    if (isGameOver(this.board, this.currentPlayer)) {
      this.finishGame();
      return;
    }

    if (this.currentPlayer === this.cpuPlayer) {
      this.scheduleCpuMove();
      return;
    }

    this.message = this.selectedIndex === null ? 'Select a piece.' : 'Choose a destination.';
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

    const sequence = chooseCpuSequence(this.board, this.cpuPlayer, this.difficulty);

    if (!sequence) {
      this.finishGame();
      return;
    }

    const animationId = ++this.animationId;

    this.pushSnapshot(this.cpuPlayer);
    this.thinking = true;
    const stepDelay = sequence.filter((move) => move.isCapture).length > 1
      ? CPU_MULTI_JUMP_STEP_DELAY_MS
      : CPU_STEP_DELAY_MS;

    for (const move of sequence) {
      if (this.animationId !== animationId || this.gameOver) {
        return;
      }

      this.applyStep(move);
      this.selectedIndex = move.toIndex;
      this.message = move.isCapture ? 'CPU jumps.' : 'CPU moves.';
      this.audio.place(move.isCapture ? 2 : 0);
      this.render();
      this.notify();
      await sleep(stepDelay);
    }

    if (this.animationId !== animationId || this.gameOver) {
      return;
    }

    this.selectedIndex = null;
    this.forcedFrom = null;
    this.thinking = false;
    this.currentPlayer = this.humanPlayer;
    this.message = 'Your turn.';
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
    this.selectedIndex = null;
    this.forcedFrom = null;
    this.awaitingNewGame = false;
    const winner = winnerOf(this.board, this.currentPlayer);
    const endMessage = getEndMessage(winner, this.humanPlayer, countPieces(this.board));

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
    const legalMoves = this.currentPlayer === this.humanPlayer && !this.gameOver && !this.thinking
      ? getLegalMoves(this.board, this.humanPlayer, this.forcedFrom)
      : [];
    const legalSourceIndexes = new Set(legalMoves.map((move) => move.fromIndex));
    const legalDestinationIndexes = this.selectedIndex === null
      ? new Set()
      : new Set(
        legalMoves
          .filter((move) => move.fromIndex === this.selectedIndex)
          .map((move) => move.toIndex),
      );

    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const index = indexOf(x, y);
        const piece = this.board[index];
        const pieceIsKing = isKing(piece);
        let light = isPlayableSquare(x, y) ? PAD_LIGHT.dim : PAD_LIGHT.off;

        if (pieceOwner(piece) === this.humanPlayer) {
          light = pieceLight(PAD_LIGHT.player, piece, this.kingBlinkOn);
        } else if (pieceOwner(piece) === this.cpuPlayer) {
          light = pieceLight(CHECKERS_CPU_LIGHT, piece, this.kingBlinkOn);
        }

        if (this.lastMove?.toIndex === index && !pieceIsKing) {
          light = PAD_LIGHT.last;
        }

        if (legalSourceIndexes.has(index) && this.selectedIndex === null && !pieceIsKing) {
          light = {
            ...light,
            effect: LIGHT_EFFECT.PULSE,
          };
        }

        if (this.selectedIndex === index) {
          light = {
            ...PAD_LIGHT.last,
            effect: LIGHT_EFFECT.PULSE,
          };
        }

        if (legalDestinationIndexes.has(index)) {
          light = {
            ...PAD_LIGHT.legal,
            effect: LIGHT_EFFECT.PULSE,
          };
        }

        frame[index] = light;
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

  pushHumanSnapshotOnce() {
    if (this.turnSnapshotPushed) {
      return;
    }

    this.history.push({
      board: [...this.board],
      currentPlayer: this.currentPlayer,
      selectedIndex: null,
      forcedFrom: null,
      lastMove: this.lastMove ? { ...this.lastMove } : null,
      movePlayer: this.humanPlayer,
    });
    this.turnSnapshotPushed = true;
  }

  pushSnapshot(movePlayer) {
    this.history.push({
      board: [...this.board],
      currentPlayer: this.currentPlayer,
      selectedIndex: this.selectedIndex,
      forcedFrom: this.forcedFrom,
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

  startKingBlink() {
    this.stopKingBlink();
    this.kingBlinkOn = true;

    if (typeof window === 'undefined') {
      return;
    }

    this.kingBlinkTimer = window.setInterval(() => {
      if (this.gameOver || !this.board.some(isKing)) {
        this.kingBlinkOn = true;
        return;
      }

      this.kingBlinkOn = !this.kingBlinkOn;
      this.render();
    }, KING_BLINK_MS);
  }

  stopKingBlink() {
    if (!this.kingBlinkTimer || typeof window === 'undefined') {
      this.kingBlinkTimer = null;
      return;
    }

    window.clearInterval(this.kingBlinkTimer);
    this.kingBlinkTimer = null;
  }

  notify() {
    this.onChange?.(this.getState());
  }
}

export { BLACK, WHITE };

function pieceLight(baseLight, piece, kingBlinkOn) {
  if (piece === BLACK_KING || piece === WHITE_KING) {
    return kingBlinkOn ? baseLight : PAD_LIGHT.dim;
  }

  return baseLight;
}

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
