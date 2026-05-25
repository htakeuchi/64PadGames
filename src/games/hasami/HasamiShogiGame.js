import { LIGHT_EFFECT, PAD_LIGHT, emptyFrame } from '../../pad/PadLights.js';
import { chooseCpuMove } from './hasamiCpu.js';
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
  pieceOwner,
  playerName,
  winnerOf,
} from './hasamiLogic.js';

const CPU_THINK_DELAY_MS = 360;
const CPU_MOVE_HOLD_MS = 440;
const END_BOARD_HOLD_MS = 500;
const CAPTURE_HIGHLIGHT_MS = 2000;
const HASAMI_CPU_LIGHT = {
  id: 'hasami-cpu',
  midi: 5,
  css: '#ff4f4f',
  label: 'CPU',
};

export class HasamiShogiGame {
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
    this.lastMove = null;
    this.history = [];
    this.message = '';
    this.thinking = false;
    this.gameOver = false;
    this.awaitingNewGame = false;
    this.cpuTimer = null;
    this.captureHighlightTimer = null;
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
    this.cancelCaptureHighlightTimer();
    this.animations?.cancel();
    this.board = createInitialBoard();
    this.currentPlayer = BLACK;
    this.selectedIndex = null;
    this.lastMove = null;
    this.history = [];
    this.thinking = false;
    this.gameOver = false;
    this.awaitingNewGame = false;
    this.message = this.humanPlayer === BLACK ? 'Select a piece.' : "CPU's turn.";
    this.render();
    this.notify();
    this.resolveTurn();
  }

  destroy() {
    this.animationId += 1;
    this.cancelCpuTimer();
    this.cancelCaptureHighlightTimer();
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
    const legalMoves = getLegalMoves(this.board, this.humanPlayer);

    if (this.selectedIndex !== null) {
      const selectedMove = legalMoves.find((move) => (
        move.fromIndex === this.selectedIndex && move.toIndex === targetIndex
      ));

      if (selectedMove) {
        this.playHumanMove(selectedMove);
        return;
      }

      if (targetIndex === this.selectedIndex) {
        this.selectedIndex = null;
        this.message = 'Selection cleared.';
        this.render();
        this.notify();
        return;
      }
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
    this.cancelCaptureHighlightTimer();
    this.animationId += 1;
    this.animations?.cancel();

    let snapshot = this.history.pop();

    if (snapshot.movePlayer === this.cpuPlayer && this.history.length > 0) {
      snapshot = this.history.pop();
    }

    this.board = [...snapshot.board];
    this.currentPlayer = snapshot.currentPlayer;
    this.selectedIndex = snapshot.selectedIndex;
    this.lastMove = snapshot.lastMove ? cloneLastMove(snapshot.lastMove) : null;
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
      HASAMI_CPU_LIGHT,
      PAD_LIGHT.legal,
      PAD_LIGHT.last,
      PAD_LIGHT.warning,
      PAD_LIGHT.dim,
    ];
  }

  getState() {
    const score = countPieces(this.board);
    const legalMoves = this.gameOver ? [] : getLegalMoves(this.board, this.currentPlayer);
    const winner = this.gameOver ? winnerOf(this.board, this.currentPlayer) : EMPTY;

    return {
      kind: 'hasami',
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
      lastCaptureCount: this.lastMove?.capturedIndexes.length ?? 0,
      message: this.message,
      thinking: this.thinking,
      winner,
    };
  }

  playHumanMove(move) {
    this.pushSnapshot(this.humanPlayer, { selectedIndex: null });
    this.applyStep(move);
    this.selectedIndex = null;
    this.currentPlayer = this.cpuPlayer;
    this.message = formatMoveMessage('You', this.lastMove.capturedIndexes.length);
    this.audio.place(this.lastMove.capturedIndexes.length);
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
      capturedIndexes: result.capturedIndexes,
    };
    this.scheduleCaptureHighlightClear(this.lastMove);
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

    const move = chooseCpuMove(this.board, this.cpuPlayer, this.difficulty);

    if (!move) {
      this.finishGame();
      return;
    }

    const animationId = ++this.animationId;

    this.pushSnapshot(this.cpuPlayer);
    this.thinking = true;
    this.applyStep(move);
    this.selectedIndex = move.toIndex;
    this.message = formatMoveMessage('CPU', this.lastMove.capturedIndexes.length);
    this.audio.place(this.lastMove.capturedIndexes.length);
    this.render();
    this.notify();
    await sleep(CPU_MOVE_HOLD_MS);

    if (this.animationId !== animationId || this.gameOver) {
      return;
    }

    this.selectedIndex = null;
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
    this.selectedIndex = null;
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
      ? getLegalMoves(this.board, this.humanPlayer)
      : [];
    const legalSourceIndexes = new Set(legalMoves.map((move) => move.fromIndex));
    const legalDestinationIndexes = this.selectedIndex === null
      ? new Set()
      : new Set(
        legalMoves
          .filter((move) => move.fromIndex === this.selectedIndex)
          .map((move) => move.toIndex),
      );
    const capturedIndexes = new Set(this.lastMove?.capturedIndexes ?? []);

    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const index = indexOf(x, y);
        const piece = this.board[index];
        let light = PAD_LIGHT.dim;

        if (pieceOwner(piece) === this.humanPlayer) {
          light = PAD_LIGHT.player;
        } else if (pieceOwner(piece) === this.cpuPlayer) {
          light = HASAMI_CPU_LIGHT;
        }

        if (this.lastMove?.toIndex === index) {
          light = PAD_LIGHT.last;
        }

        if (capturedIndexes.has(index)) {
          light = {
            ...PAD_LIGHT.warning,
            effect: LIGHT_EFFECT.FLASH,
          };
        }

        if (legalSourceIndexes.has(index) && this.selectedIndex === null) {
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

  pushSnapshot(movePlayer, overrides = {}) {
    this.history.push({
      board: [...this.board],
      currentPlayer: this.currentPlayer,
      selectedIndex: this.selectedIndex,
      lastMove: this.lastMove ? cloneLastMove(this.lastMove) : null,
      movePlayer,
      ...overrides,
    });
  }

  cancelCpuTimer() {
    if (this.cpuTimer) {
      window.clearTimeout(this.cpuTimer);
      this.cpuTimer = null;
    }
    this.thinking = false;
  }

  scheduleCaptureHighlightClear(move) {
    this.cancelCaptureHighlightTimer();

    if (move.capturedIndexes.length === 0 || typeof window === 'undefined') {
      return;
    }

    this.captureHighlightTimer = window.setTimeout(() => {
      this.captureHighlightTimer = null;

      if (this.gameOver || this.lastMove !== move) {
        return;
      }

      this.lastMove = {
        ...this.lastMove,
        capturedIndexes: [],
      };
      this.render();
    }, CAPTURE_HIGHLIGHT_MS);
  }

  cancelCaptureHighlightTimer() {
    if (!this.captureHighlightTimer || typeof window === 'undefined') {
      this.captureHighlightTimer = null;
      return;
    }

    window.clearTimeout(this.captureHighlightTimer);
    this.captureHighlightTimer = null;
  }

  notify() {
    this.onChange?.(this.getState());
  }
}

export { BLACK, WHITE };

function cloneLastMove(move) {
  return {
    ...move,
    capturedIndexes: [...move.capturedIndexes],
  };
}

function formatMoveMessage(owner, capturedCount) {
  if (capturedCount === 0) {
    return `${owner} moved.`;
  }

  return `${owner} captured ${capturedCount}.`;
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
