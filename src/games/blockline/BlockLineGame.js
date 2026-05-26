import { LIGHT_EFFECT, PAD_LIGHT, emptyFrame } from '../../pad/PadLights.js';
import {
  BLOCK_LINE_HEIGHT,
  BLOCK_LINE_WIDTH,
  BLOCK_LINE_COLOR_COUNT,
  applyGravity,
  assignDistinctAdjacentColors,
  buildGrid,
  cloneBlocks,
  createInitialBlocks,
  findFullRows,
  getBlockAt,
  getLegalMoveCount,
  getLegalMoves,
  getMovesIntoCell,
  hasAnyLegalMove,
  indexOf,
  moveBlock,
  pushUpWithNewRow,
  removeRows,
  scoreRows,
} from './blockLineLogic.js';

const MOVE_MS = 110;
const FALL_MS = 130;
const CLEAR_FLASH_MS = 105;
const CLEAR_GAP_MS = 80;
const RISE_MS = 150;
const INVALID_FLASH_MS = 120;
const SCORE_SCROLL_MS = 130;
const SCORE_HOLD_MS = 1200;

const BLOCK_LINE_LIGHTS = [
  {
    id: 'blockline-blue',
    midi: 45,
    css: '#2f80ff',
    label: 'Blue block',
  },
  {
    id: 'blockline-green',
    midi: 21,
    css: '#35d66b',
    label: 'Green block',
  },
  {
    id: 'blockline-sky',
    midi: 37,
    css: '#56b4e9',
    label: 'Sky block',
  },
  {
    id: 'blockline-amber',
    midi: 13,
    css: '#ffd84d',
    label: 'Amber block',
  },
  {
    id: 'blockline-orange',
    midi: 9,
    css: '#e69f00',
    label: 'Orange block',
  },
  {
    id: 'blockline-coral',
    midi: 5,
    css: '#ff6b6b',
    label: 'Coral block',
  },
  {
    id: 'blockline-white',
    midi: 3,
    css: '#f2f5f8',
    label: 'White block',
  },
  {
    id: 'blockline-violet',
    midi: 49,
    css: '#9b7cff',
    label: 'Violet block',
  },
];

if (BLOCK_LINE_LIGHTS.length !== BLOCK_LINE_COLOR_COUNT) {
  throw new Error('Block Line light palette must match BLOCK_LINE_COLOR_COUNT.');
}

const LEGAL_MOVE_LIGHT = {
  ...PAD_LIGHT.legal,
  label: 'Move gap',
};

const CLEAR_LIGHT = {
  ...PAD_LIGHT.opponent,
  id: 'blockline-clear',
  label: 'Clear line',
};

const RISE_LIGHT = {
  ...PAD_LIGHT.last,
  id: 'blockline-rise',
  label: 'New line',
};

export class BlockLineGame {
  constructor({ pad, audio, onChange }) {
    this.pad = pad;
    this.audio = audio;
    this.onChange = onChange;
    this.animations = null;
    this.difficulty = 'normal';
    this.blocks = [];
    this.nextBlockId = 1;
    this.score = 0;
    this.linesCleared = 0;
    this.movesUsed = 0;
    this.lastChainCount = 0;
    this.selectedBlockId = null;
    this.history = [];
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
    this.restart();
  }

  restart() {
    this.animationId += 1;
    this.animations?.cancel();
    const initial = createInitialBlocks(this.difficulty);

    this.blocks = this.withDistinctColors(initial.blocks);
    this.nextBlockId = initial.nextBlockId;
    this.score = 0;
    this.linesCleared = 0;
    this.movesUsed = 0;
    this.lastChainCount = 0;
    this.selectedBlockId = null;
    this.history = [];
    this.gameOver = false;
    this.awaitingNewGame = false;
    this.animating = false;
    this.message = 'Select a block, then tap a lit gap.';
    this.statusLabel = 'Playing';
    this.render();
    this.notify();
  }

  destroy() {
    this.animationId += 1;
  }

  setDifficulty(difficulty) {
    this.difficulty = difficulty;
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

    const block = getBlockAt(this.blocks, x, y);

    if (this.selectedBlockId !== null) {
      const selected = this.blocks.find((candidate) => candidate.id === this.selectedBlockId);
      const legalMove = getLegalMoves(this.blocks, this.selectedBlockId)
        .find((move) => move.destinationIndex === indexOf(x, y));

      if (legalMove) {
        this.playMove(this.selectedBlockId, legalMove);
        return;
      }

      if (block?.id === this.selectedBlockId) {
        this.selectedBlockId = null;
        this.message = 'Selection cleared.';
        this.statusLabel = 'Playing';
        this.render();
        this.notify();
        return;
      }

      if (block) {
        this.selectBlock(block.id);
        return;
      }

      this.message = selected
        ? `Width ${selected.width} block cannot move there.`
        : 'Select a block.';
      this.audio.invalid();
      this.flashCell(x, y);
      this.notify();
      return;
    }

    if (block) {
      this.selectBlock(block.id);
      return;
    }

    const movesIntoCell = getMovesIntoCell(this.blocks, x, y);

    if (movesIntoCell.length === 1) {
      this.playMove(movesIntoCell[0].blockId, movesIntoCell[0]);
      return;
    }

    this.message = movesIntoCell.length > 1
      ? 'Two blocks can use that gap. Select one first.'
      : 'Select a block first.';
    this.audio.invalid();
    this.flashCell(x, y);
    this.notify();
  }

  moveSelected(direction) {
    if (this.gameOver || this.animating) {
      return;
    }

    if (this.selectedBlockId === null) {
      this.message = 'Select a block first.';
      this.audio.invalid();
      this.notify();
      return;
    }

    const legalMoves = getLegalMoves(this.blocks, this.selectedBlockId)
      .filter((move) => move.direction === direction);
    const legalMove = legalMoves[legalMoves.length - 1];

    if (!legalMove) {
      this.message = `Selected block cannot move ${direction}.`;
      this.audio.invalid();
      this.notify();
      return;
    }

    this.playMove(this.selectedBlockId, legalMove);
  }

  undo() {
    if (this.history.length === 0 || this.animating) {
      this.audio.invalid();
      return;
    }

    const snapshot = this.history.pop();

    this.animationId += 1;
    this.blocks = cloneBlocks(snapshot.blocks);
    this.nextBlockId = snapshot.nextBlockId;
    this.score = snapshot.score;
    this.linesCleared = snapshot.linesCleared;
    this.movesUsed = snapshot.movesUsed;
    this.lastChainCount = snapshot.lastChainCount;
    this.selectedBlockId = null;
    this.gameOver = false;
    this.awaitingNewGame = false;
    this.animating = false;
    this.message = 'Undid one turn.';
    this.statusLabel = 'Playing';
    this.audio.undo();
    this.render();
    this.notify();
  }

  async playDebugAnimation(result) {
    this.animationId += 1;
    this.animations?.cancel();

    if (result === 'win') {
      this.audio.win();
      await this.playLineSweep();
      await this.animations?.playWin();
    }

    if (result === 'lose') {
      this.audio.draw();
      await this.playGameOverScoreSequence(this.animationId);
      return;
    }

    if (result === 'draw') {
      this.audio.draw();
      await this.playLineSweep();
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
      ...BLOCK_LINE_LIGHTS,
      LEGAL_MOVE_LIGHT,
      CLEAR_LIGHT,
      RISE_LIGHT,
      PAD_LIGHT.warning,
    ];
  }

  getState() {
    const selected = this.blocks.find((block) => block.id === this.selectedBlockId);

    return {
      kind: 'blockline',
      canUndo: this.history.length > 0 && !this.animating,
      blockCount: this.blocks.length,
      difficulty: this.difficulty,
      gameOver: this.gameOver,
      lastChainCount: this.lastChainCount,
      legalMoveCount: getLegalMoveCount(this.blocks),
      linesCleared: this.linesCleared,
      message: this.message,
      movesUsed: this.movesUsed,
      score: this.score,
      selectedWidth: selected?.width ?? null,
      statusLabel: this.statusLabel,
    };
  }

  selectBlock(blockId) {
    const block = this.blocks.find((candidate) => candidate.id === blockId);
    const legalMoves = getLegalMoves(this.blocks, blockId);

    if (!block || legalMoves.length === 0) {
      this.message = 'That block is blocked.';
      this.audio.invalid();
      this.notify();
      return;
    }

    this.selectedBlockId = blockId;
    this.message = `Width ${block.width} block selected.`;
    this.statusLabel = 'Selected';
    this.audio.blockLineSelect(block.width);
    this.render();
    this.notify();
  }

  async playMove(blockId, move) {
    const movedBlocks = moveBlock(this.blocks, blockId, move);
    const block = this.blocks.find((candidate) => candidate.id === blockId);

    if (!movedBlocks || !block) {
      this.message = 'That move is blocked.';
      this.audio.invalid();
      this.notify();
      return;
    }

    const animationId = ++this.animationId;

    this.history.push(this.createSnapshot());
    this.blocks = this.withDistinctColors(movedBlocks);
    this.movesUsed += 1;
    this.lastChainCount = 0;
    this.selectedBlockId = null;
    this.animating = true;
    this.statusLabel = 'Move';
    this.message = `Moved width ${block.width} block ${move.direction} ${move.distance}.`;
    this.audio.blockLineSlide(block.width, move.distance);
    this.render();
    this.notify();
    await sleep(MOVE_MS);

    await this.resolveSettling(animationId);

    if (this.animationId !== animationId || this.gameOver) {
      return;
    }

    const raised = pushUpWithNewRow(
      this.blocks,
      this.nextBlockId,
      this.difficulty,
    );

    if (raised.gameOver) {
      await this.finishGameOver('Blocks crossed the top.', animationId);
      return;
    }

    this.blocks = this.withDistinctColors(raised.blocks);
    this.nextBlockId = raised.nextBlockId;
    this.statusLabel = 'Rise';
    this.message = 'New line rising.';
    this.audio.blockLineRise();
    this.render(newBlockOverrides(raised.newBlockIds, this.blocks));
    this.notify();
    await sleep(RISE_MS);

    await this.resolveSettling(animationId);

    if (this.animationId !== animationId || this.gameOver) {
      return;
    }

    if (!hasAnyLegalMove(this.blocks)) {
      await this.finishGameOver('No legal moves remain.', animationId);
      return;
    }

    this.animating = false;
    this.statusLabel = 'Playing';
    this.message = 'Select a block, then tap a lit gap.';
    this.render();
    this.notify();
  }

  async resolveSettling(animationId) {
    let chainIndex = 0;

    while (this.animationId === animationId && !this.gameOver) {
      const gravity = applyGravity(this.blocks);

      if (gravity.moved) {
        this.blocks = this.withDistinctColors(gravity.blocks);
        this.statusLabel = 'Falling';
        this.message = `Dropped ${gravity.movedBlockIds.length} blocks.`;
        this.render(fallingOverrides(gravity.movedBlockIds, this.blocks));
        this.notify();
        await sleep(FALL_MS);
      }

      if (this.animationId !== animationId || this.gameOver) {
        return;
      }

      const fullRows = findFullRows(this.blocks);

      if (fullRows.length === 0) {
        return;
      }

      chainIndex += 1;
      this.lastChainCount = Math.max(this.lastChainCount, chainIndex);
      const points = scoreRows(fullRows.length, chainIndex);

      this.score += points;
      this.linesCleared += fullRows.length;
      this.statusLabel = chainIndex > 1 ? `Chain ${chainIndex}` : 'Clear';
      this.message = fullRows.length === 1
        ? `Line clear. +${points}`
        : `${fullRows.length} lines clear. +${points}`;
      this.audio.blockLineClear(fullRows.length, chainIndex);
      this.render(fullRowOverrides(fullRows));
      this.notify();
      await sleep(CLEAR_FLASH_MS);

      if (this.animationId !== animationId || this.gameOver) {
        return;
      }

      this.blocks = this.withDistinctColors(removeRows(this.blocks, fullRows));
      this.render();
      await sleep(CLEAR_GAP_MS);
    }
  }

  async finishGameOver(message, animationId) {
    if (this.gameOver || this.animationId !== animationId) {
      return;
    }

    this.gameOver = true;
    this.awaitingNewGame = false;
    this.animating = true;
    this.selectedBlockId = null;
    this.statusLabel = 'Game Over';
    this.message = `${message} Score ${this.score}.`;
    this.audio.draw();
    this.notify();

    await this.playGameOverScoreSequence(animationId);

    if (this.animationId !== animationId) {
      return;
    }

    this.animating = false;
    this.awaitingNewGame = true;
    this.message = `${message} Final score ${this.score}. Press any pad for a new game.`;
    this.notify();
    this.loopScoreDisplay(animationId);
  }

  createSnapshot() {
    return {
      blocks: cloneBlocks(this.blocks),
      nextBlockId: this.nextBlockId,
      score: this.score,
      linesCleared: this.linesCleared,
      movesUsed: this.movesUsed,
      lastChainCount: this.lastChainCount,
    };
  }

  withDistinctColors(blocks) {
    return assignDistinctAdjacentColors(blocks, BLOCK_LINE_LIGHTS.length);
  }

  flashCell(x, y) {
    this.pad.setCell(x, y, {
      ...PAD_LIGHT.warning,
      effect: LIGHT_EFFECT.FLASH,
    });

    globalThis.setTimeout(() => {
      if (!this.animating && !this.gameOver) {
        this.render();
      }
    }, INVALID_FLASH_MS);
  }

  async playLineSweep() {
    const animationId = this.animationId;

    for (let y = BLOCK_LINE_HEIGHT - 1; y >= 0; y -= 1) {
      if (this.animationId !== animationId) {
        return;
      }

      const frame = emptyFrame();

      for (let x = 0; x < BLOCK_LINE_WIDTH; x += 1) {
        frame[indexOf(x, y)] = CLEAR_LIGHT;
      }

      this.pad.renderFrame(frame);
      await sleep(70);
    }
  }

  async playGameOverScoreSequence(animationId) {
    const completed = (await this.animations?.playDraw()) ?? true;

    if (!completed || this.animationId !== animationId) {
      return;
    }

    await this.playScoreDisplay(animationId);
  }

  async loopScoreDisplay(animationId) {
    while (
      this.animationId === animationId
      && this.gameOver
      && this.awaitingNewGame
    ) {
      await this.playScoreDisplay(animationId);
      await sleep(260);
    }
  }

  async playScoreDisplay(animationId) {
    const scoreText = String(Math.max(0, this.score));
    const totalWidth = scoreText.length * 4 - 1;

    if (totalWidth <= BLOCK_LINE_WIDTH) {
      this.pad.renderFrame(createScoreHoldFrame(this.score));
      await sleep(SCORE_HOLD_MS);
      return;
    }

    for (let offsetX = BLOCK_LINE_WIDTH; offsetX >= -totalWidth; offsetX -= 1) {
      if (this.animationId !== animationId) {
        return;
      }

      this.pad.renderFrame(createScoreFrame(scoreText, offsetX));
      await sleep(SCORE_SCROLL_MS);
    }

    if (this.animationId === animationId) {
      await sleep(240);
    }
  }

  render(overrides = new Map()) {
    const frame = emptyFrame();
    const selectedMoves = this.selectedBlockId === null
      ? []
      : getLegalMoves(this.blocks, this.selectedBlockId);
    const selectedDestinationIndexes = new Set(
      selectedMoves.map((move) => move.destinationIndex),
    );
    const grid = buildGrid(this.blocks);

    this.blocks.forEach((block) => {
      const light = BLOCK_LINE_LIGHTS[block.colorIndex % BLOCK_LINE_LIGHTS.length];

      for (let offset = 0; offset < block.width; offset += 1) {
        const cellIndex = indexOf(block.x + offset, block.y);
        const isSelected = block.id === this.selectedBlockId;

        frame[cellIndex] = isSelected
          ? {
            ...light,
            effect: LIGHT_EFFECT.PULSE,
          }
          : light;
      }
    });

    selectedDestinationIndexes.forEach((cellIndex) => {
      if (grid[cellIndex] === null) {
        frame[cellIndex] = {
          ...LEGAL_MOVE_LIGHT,
          effect: LIGHT_EFFECT.PULSE,
        };
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
}

function fullRowOverrides(rows) {
  const overrides = new Map();

  rows.forEach((y) => {
    for (let x = 0; x < BLOCK_LINE_WIDTH; x += 1) {
      overrides.set(indexOf(x, y), {
        ...CLEAR_LIGHT,
        effect: LIGHT_EFFECT.FLASH,
      });
    }
  });

  return overrides;
}

function fallingOverrides(blockIds, blocks) {
  return blockIdOverrides(blockIds, blocks, {
    ...PAD_LIGHT.last,
    effect: LIGHT_EFFECT.PULSE,
  });
}

function newBlockOverrides(blockIds, blocks) {
  return blockIdOverrides(blockIds, blocks, {
    ...RISE_LIGHT,
    effect: LIGHT_EFFECT.PULSE,
  });
}

function blockIdOverrides(blockIds, blocks, light) {
  const overrides = new Map();
  const idSet = new Set(blockIds);

  blocks
    .filter((block) => idSet.has(block.id))
    .forEach((block) => {
      for (let offset = 0; offset < block.width; offset += 1) {
        overrides.set(indexOf(block.x + offset, block.y), light);
      }
    });

  return overrides;
}

function createScoreHoldFrame(score) {
  const scoreText = String(Math.max(0, score));
  const holdText = scoreText.length <= 2 ? scoreText : scoreText.slice(-2);
  const totalWidth = holdText.length * 4 - 1;
  const offsetX = Math.floor((BLOCK_LINE_WIDTH - totalWidth) / 2);

  return createScoreFrame(holdText, offsetX);
}

function createScoreFrame(scoreText, offsetX) {
  const frame = emptyFrame();
  const light = {
    ...LEGAL_MOVE_LIGHT,
    effect: LIGHT_EFFECT.PULSE,
  };

  scoreText.split('').forEach((digit, index) => {
    drawDigit(frame, Number(digit), offsetX + index * 4, 2, light);
  });

  return frame;
}

function drawDigit(frame, digit, offsetX, offsetY, light) {
  DIGITS[digit].forEach((row, y) => {
    row.split('').forEach((cell, x) => {
      const targetX = offsetX + x;
      const targetY = offsetY + y;

      if (
        cell === '1'
        && targetX >= 0
        && targetX < BLOCK_LINE_WIDTH
        && targetY >= 0
        && targetY < BLOCK_LINE_HEIGHT
      ) {
        frame[indexOf(targetX, targetY)] = light;
      }
    });
  });
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

function sleep(ms) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}
