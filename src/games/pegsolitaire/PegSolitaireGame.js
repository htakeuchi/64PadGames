import { LIGHT_EFFECT, PAD_LIGHT, emptyFrame } from '../../pad/PadLights.js';
import {
  EMPTY,
  PEG,
  PEG_SOLITAIRE_LEVELS,
  applyMove,
  cellAt,
  countPegs,
  countValidHoles,
  createLevel,
  getLevelPegCount,
  getLegalMoves,
  hasAnyMove,
  indexOf,
  isSolved,
} from './pegSolitaireLogic.js';

const STAGE_CLEAR_HOLD_MS = 700;
const SOLVER_MOVE_HOLD_MS = 420;
const SOLVER_STEP_HOLD_MS = 130;
const STUCK_FLASH_MS = 260;
const STUCK_NOTIFY_HOLD_MS = 620;

const PEG_LIGHT = {
  ...PAD_LIGHT.player,
  label: 'Peg',
};

const EMPTY_HOLE_LIGHT = {
  ...PAD_LIGHT.dim,
  label: 'Empty hole',
};

const SELECTED_LIGHT = {
  ...PAD_LIGHT.last,
  id: 'peg-selected',
  label: 'Selected',
};

const SOLVER_FROM_LIGHT = {
  ...PAD_LIGHT.last,
  id: 'solver-from',
  label: 'Solver from',
};

const SOLVER_OVER_LIGHT = {
  ...PAD_LIGHT.warning,
  id: 'solver-over',
  label: 'Solver jumped',
};

const SOLVER_TO_LIGHT = {
  ...PAD_LIGHT.legal,
  id: 'solver-to',
  label: 'Solver landing',
};

const CLEAR_LIGHT = {
  ...PAD_LIGHT.legal,
  label: 'Clear',
};

const STUCK_LIGHT = {
  ...PAD_LIGHT.warning,
  id: 'peg-stuck',
  label: 'Stuck',
  effect: LIGHT_EFFECT.FLASH,
};

export class PegSolitaireGame {
  constructor({ pad, audio, onChange }) {
    this.pad = pad;
    this.audio = audio;
    this.onChange = onChange;
    this.animations = null;
    this.levelIndex = 0;
    this.level = createLevel(this.levelIndex);
    this.board = [...this.level.board];
    this.selectedIndex = null;
    this.solverMove = null;
    this.lastMove = null;
    this.history = [];
    this.movesUsed = 0;
    this.gameOver = false;
    this.solverRunning = false;
    this.awaitingNextStage = false;
    this.awaitingRestart = false;
    this.message = '';
    this.statusLabel = 'Ready';
    this.animationId = 0;
  }

  start(options = {}) {
    this.animations = options.animations ?? this.animations;
    this.levelIndex = 0;
    this.restart();
  }

  restart() {
    this.animationId += 1;
    this.animations?.cancel();
    this.level = createLevel(this.levelIndex);
    this.board = [...this.level.board];
    this.selectedIndex = null;
    this.solverMove = null;
    this.lastMove = null;
    this.history = [];
    this.movesUsed = 0;
    this.gameOver = false;
    this.solverRunning = false;
    this.awaitingNextStage = false;
    this.awaitingRestart = false;
    this.statusLabel = `Stage ${this.levelIndex + 1}`;
    this.message = 'Select a peg to jump.';
    this.render();
    this.notify();
  }

  setStage(levelIndex) {
    const normalizedIndex = Number(levelIndex);

    if (!Number.isInteger(normalizedIndex)) {
      this.audio.invalid();
      return;
    }

    this.levelIndex = Math.max(
      0,
      Math.min(PEG_SOLITAIRE_LEVELS.length - 1, normalizedIndex),
    );
    this.restart();
  }

  destroy() {
    this.animationId += 1;
    this.animations?.cancel();
  }

  handlePadTap({ x, y }) {
    if (this.solverRunning) {
      return;
    }

    if (this.gameOver) {
      if (this.awaitingNextStage) {
        return;
      }

      if (this.awaitingRestart) {
        this.levelIndex = 0;
        this.restart();
        return;
      }

      this.audio.invalid();
      return;
    }

    if (x > 6 || y > 6) {
      this.message = 'Tap inside the cross board.';
      this.audio.invalid();
      this.flashCell(x, y);
      this.notify();
      return;
    }

    const targetIndex = indexOf(x, y);
    const cell = this.board[targetIndex];

    if (cell === null || cell === undefined) {
      this.message = 'That pad is outside the board.';
      this.audio.invalid();
      this.flashCell(x, y);
      this.notify();
      return;
    }

    const legalMoves = getLegalMoves(this.board);

    if (this.selectedIndex !== null) {
      const selectedMove = legalMoves.find((move) => (
        move.fromIndex === this.selectedIndex && move.toIndex === targetIndex
      ));

      if (selectedMove) {
        this.playMove(selectedMove);
        return;
      }

      if (targetIndex === this.selectedIndex) {
        this.selectedIndex = null;
        this.message = 'Selection cleared.';
        this.render();
        this.notify();
        return;
      }

      if (cell === PEG && legalMoves.some((move) => move.fromIndex === targetIndex)) {
        this.selectPeg(targetIndex);
        return;
      }

      this.message = 'Jump over one peg into an empty hole.';
      this.audio.invalid();
      this.flashCell(x, y);
      this.notify();
      return;
    }

    if (cell === PEG && legalMoves.some((move) => move.fromIndex === targetIndex)) {
      this.selectPeg(targetIndex);
      return;
    }

    this.message = cell === PEG ? 'That peg has no jump.' : 'Select a movable peg.';
    this.audio.invalid();
    this.flashCell(x, y);
    this.notify();
  }

  undo() {
    if (this.solverRunning || this.history.length === 0 || this.awaitingNextStage) {
      this.audio.invalid();
      return;
    }

    const snapshot = this.history.pop();

    this.animationId += 1;
    this.board = [...snapshot.board];
    this.selectedIndex = snapshot.selectedIndex;
    this.solverMove = null;
    this.lastMove = snapshot.lastMove ? { ...snapshot.lastMove } : null;
    this.movesUsed = snapshot.movesUsed;
    this.gameOver = false;
    this.awaitingNextStage = false;
    this.awaitingRestart = false;
    this.statusLabel = `Stage ${this.levelIndex + 1}`;
    this.message = 'Undid one jump.';
    this.audio.undo();
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
      PEG_LIGHT,
      EMPTY_HOLE_LIGHT,
      SELECTED_LIGHT,
      SOLVER_TO_LIGHT,
      SOLVER_OVER_LIGHT,
      PAD_LIGHT.warning,
    ];
  }

  getState() {
    const legalMoves = this.gameOver ? [] : getLegalMoves(this.board);
    const pegCount = countPegs(this.board);

    return {
      kind: 'pegsolitaire',
      canUndo: this.history.length > 0 && !this.awaitingNextStage && !this.solverRunning,
      canPass: !this.gameOver && !this.awaitingNextStage && !this.solverRunning,
      gameOver: this.gameOver,
      legalMoveCount: legalMoves.length,
      levelCount: PEG_SOLITAIRE_LEVELS.length,
      levelIndex: this.levelIndex,
      levelName: this.level.definition.name,
      message: this.message,
      movesRemaining: Math.max(0, pegCount - 1),
      movesUsed: this.movesUsed,
      pegCount,
      passLabel: this.solverRunning ? 'Solving' : 'Solver',
      stages: PEG_SOLITAIRE_LEVELS.map((definition, index) => ({
        index,
        name: definition.name,
        pegCount: getLevelPegCount(definition),
      })),
      statusLabel: this.statusLabel,
      validHoleCount: countValidHoles(this.board),
    };
  }

  selectPeg(index) {
    this.selectedIndex = index;
    this.message = 'Choose an empty landing hole two pads away.';
    this.audio.pegSolitaireSelect?.();
    this.render();
    this.notify();
  }

  playMove(move) {
    this.history.push({
      board: [...this.board],
      selectedIndex: null,
      lastMove: this.lastMove ? { ...this.lastMove } : null,
      movesUsed: this.movesUsed,
    });

    const result = applyMove(this.board, move);

    this.board = result.board;
    this.selectedIndex = null;
    this.solverMove = null;
    this.lastMove = {
      fromIndex: move.fromIndex,
      overIndex: move.overIndex,
      toIndex: move.toIndex,
      removedIndex: result.removedIndex,
    };
    this.movesUsed += 1;
    this.message = `${countPegs(this.board)} pegs remain.`;
    this.audio.pegSolitaireJump?.();
    this.render();
    this.notify();
    this.resolveBoard();
  }

  async pass() {
    if (this.gameOver || this.awaitingNextStage || this.solverRunning) {
      this.audio.invalid();
      return;
    }

    const animationId = ++this.animationId;

    this.solverRunning = true;
    this.selectedIndex = null;
    this.statusLabel = 'Solver';
    this.audio.pass();
    this.notify();

    while (this.animationId === animationId && !this.gameOver) {
      const move = this.getNextSolutionMove();

      if (!move) {
        this.finishSolverUnavailable();
        return;
      }

      this.solverMove = move;
      this.message = `Solving ${this.movesUsed + 1}/${this.level.solution.length}: ${formatPad(move.fromX, move.fromY)} to ${formatPad(move.toX, move.toY)}.`;
      this.render();
      this.notify();

      await sleep(SOLVER_MOVE_HOLD_MS);

      if (this.animationId !== animationId || this.gameOver) {
        return;
      }

      const legalMove = getLegalMoves(this.board).find((candidate) => (
        candidate.fromIndex === move.fromIndex && candidate.toIndex === move.toIndex
      ));

      if (!legalMove) {
        this.finishSolverUnavailable();
        return;
      }

      const result = applyMove(this.board, legalMove);

      this.board = result.board;
      this.selectedIndex = null;
      this.solverMove = null;
      this.lastMove = {
        fromIndex: move.fromIndex,
        overIndex: move.overIndex,
        toIndex: move.toIndex,
        removedIndex: result.removedIndex,
      };
      this.movesUsed += 1;
      this.message = `${countPegs(this.board)} pegs remain.`;
      this.audio.pegSolitaireJump?.();
      this.render();
      this.notify();

      if (isSolved(this.board)) {
        this.finishStage();
        return;
      }

      await sleep(SOLVER_STEP_HOLD_MS);
    }
  }

  finishSolverUnavailable() {
    if (this.gameOver) {
      return;
    }

    this.solverRunning = false;
    this.solverMove = null;
    this.selectedIndex = null;
    this.statusLabel = `Stage ${this.levelIndex + 1}`;
    this.message = 'Solver path is unavailable from this board.';
    this.audio.invalid();
    this.render();
    this.notify();
  }

  resolveBoard() {
    if (isSolved(this.board)) {
      this.finishStage();
      return;
    }

    if (!hasAnyMove(this.board)) {
      this.finishStuck();
    }
  }

  finishStage() {
    if (this.gameOver) {
      return;
    }

    this.gameOver = true;
    this.solverRunning = false;
    this.awaitingNextStage = this.levelIndex < PEG_SOLITAIRE_LEVELS.length - 1;
    this.awaitingRestart = !this.awaitingNextStage;
    this.selectedIndex = null;
    this.solverMove = null;
    this.statusLabel = this.awaitingNextStage ? 'Clear' : 'Complete';
    this.message = this.awaitingNextStage
      ? `Stage ${this.levelIndex + 1} clear. Next stage...`
      : 'All stages clear. Press any pad to restart.';
    this.audio.pegSolitaireClear?.();
    this.renderClearFrame();
    this.notify();
    this.advanceAfterClear();
  }

  finishStuck() {
    if (this.gameOver) {
      return;
    }

    this.gameOver = true;
    this.solverRunning = false;
    this.awaitingNextStage = false;
    this.awaitingRestart = false;
    this.selectedIndex = null;
    this.solverMove = null;
    this.statusLabel = 'Stuck';
    this.message = 'No jumps remain. Undo or press New.';
    this.audio.pegSolitaireStuck?.();
    this.renderStuckFrame();
    this.notify();
    this.restoreAfterStuckNotification();
  }

  async advanceAfterClear() {
    const animationId = ++this.animationId;

    await sleep(STAGE_CLEAR_HOLD_MS);

    if (
      this.animationId !== animationId
      || !this.gameOver
      || !this.awaitingNextStage
    ) {
      return;
    }

    this.advanceStage();
  }

  advanceStage() {
    this.levelIndex += 1;
    this.restart();
  }

  render() {
    const frame = emptyFrame();

    this.board.forEach((cell, index) => {
      if (cell === null) {
        return;
      }

      const { x, y } = cellAt(index);
      let light = cell === PEG ? PEG_LIGHT : EMPTY_HOLE_LIGHT;

      if (this.solverMove?.toIndex === index) {
        light = SOLVER_TO_LIGHT;
      }

      if (this.solverMove?.overIndex === index) {
        light = SOLVER_OVER_LIGHT;
      }

      if (this.solverMove?.fromIndex === index) {
        light = SOLVER_FROM_LIGHT;
      }

      if (this.selectedIndex === index) {
        light = {
          ...SELECTED_LIGHT,
          effect: LIGHT_EFFECT.PULSE,
        };
      }

      frame[y * 8 + x] = light;
    });

    this.pad.renderFrame(frame);
  }

  getNextSolutionMove() {
    if (isSolved(this.board)) {
      return null;
    }

    let candidateBoard = [...this.level.board];

    if (boardsEqual(candidateBoard, this.board)) {
      return this.level.solution[0] ?? null;
    }

    for (let index = 0; index < this.level.solution.length; index += 1) {
      const move = this.level.solution[index];
      const legalMove = getLegalMoves(candidateBoard).find((candidate) => (
        candidate.fromIndex === move.fromIndex && candidate.toIndex === move.toIndex
      ));

      if (!legalMove) {
        return null;
      }

      candidateBoard = applyMove(candidateBoard, legalMove).board;

      if (boardsEqual(candidateBoard, this.board)) {
        return this.level.solution[index + 1] ?? null;
      }
    }

    return null;
  }

  renderClearFrame() {
    const frame = emptyFrame();

    this.board.forEach((cell, index) => {
      if (cell === null) {
        return;
      }

      const { x, y } = cellAt(index);
      frame[y * 8 + x] = CLEAR_LIGHT;
    });

    this.pad.renderFrame(frame);
  }

  renderStuckFrame() {
    const frame = emptyFrame();

    this.board.forEach((cell, index) => {
      if (cell === null) {
        return;
      }

      const { x, y } = cellAt(index);
      frame[y * 8 + x] = STUCK_LIGHT;
    });

    this.pad.renderFrame(frame);
  }

  async restoreAfterStuckNotification() {
    const animationId = ++this.animationId;

    await sleep(STUCK_NOTIFY_HOLD_MS);

    if (
      this.animationId !== animationId
      || !this.gameOver
      || this.statusLabel !== 'Stuck'
    ) {
      return;
    }

    this.render();
    this.notify();
  }

  flashCell(x, y) {
    this.pad.setCell(x, y, {
      ...PAD_LIGHT.warning,
      effect: LIGHT_EFFECT.FLASH,
    });
    window.setTimeout(() => this.render(), STUCK_FLASH_MS);
  }

  notify() {
    this.onChange?.(this.getState());
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

function boardsEqual(left, right) {
  return left.length === right.length
    && left.every((cell, index) => cell === right[index]);
}

function formatPad(x, y) {
  return `Pad ${x + 1},${y + 1}`;
}
