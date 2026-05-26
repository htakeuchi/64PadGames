export const PEG_SOLITAIRE_SIZE = 7;
export const EMPTY = 0;
export const PEG = 1;

const CLASSIC_CENTER_SOLUTION_MOVES = [
  [[3, 5], [3, 3]],
  [[3, 2], [3, 4]],
  [[3, 0], [3, 2]],
  [[5, 3], [3, 3]],
  [[3, 3], [3, 1]],
  [[5, 2], [3, 2]],
  [[4, 0], [4, 2]],
  [[2, 1], [4, 1]],
  [[2, 3], [2, 1]],
  [[2, 0], [2, 2]],
  [[2, 5], [2, 3]],
  [[4, 4], [2, 4]],
  [[2, 3], [2, 5]],
  [[0, 4], [2, 4]],
  [[0, 2], [0, 4]],
  [[4, 6], [4, 4]],
  [[2, 6], [4, 6]],
  [[3, 2], [5, 2]],
  [[1, 2], [3, 2]],
  [[6, 2], [4, 2]],
  [[3, 2], [5, 2]],
  [[6, 4], [6, 2]],
  [[6, 2], [4, 2]],
  [[4, 1], [4, 3]],
  [[4, 3], [4, 5]],
  [[4, 6], [4, 4]],
  [[5, 4], [3, 4]],
  [[3, 4], [1, 4]],
  [[0, 4], [2, 4]],
  [[2, 5], [2, 3]],
  [[1, 3], [3, 3]],
];

export const PEG_SOLITAIRE_LEVELS = [
  { name: 'First Hop', reverseMoveCount: 1, seed: 0x1011, finalIndex: indexOf(3, 3) },
  { name: 'Small Turn', reverseMoveCount: 2, seed: 0x2021, finalIndex: indexOf(2, 3) },
  { name: 'Tiny Cross', reverseMoveCount: 3, seed: 0x3031, finalIndex: indexOf(3, 2) },
  { name: 'Short Cross', reverseMoveCount: 4, seed: 0x4041, finalIndex: indexOf(3, 4) },
  { name: 'First Bend', reverseMoveCount: 5, seed: 0x5051, finalIndex: indexOf(2, 3) },
  { name: 'Low Turn', reverseMoveCount: 6, seed: 0x6061, finalIndex: indexOf(4, 3) },
  { name: 'Opening Cross', reverseMoveCount: 7, seed: 0x1234, finalIndex: indexOf(3, 3) },
  { name: 'Narrow Path', reverseMoveCount: 8, seed: 0x8081, finalIndex: indexOf(3, 2) },
  { name: 'Side Step', reverseMoveCount: 9, seed: 0x28d1, finalIndex: indexOf(2, 3) },
  { name: 'Center Return', reverseMoveCount: 10, seed: 0xa0a1, finalIndex: indexOf(3, 3) },
  { name: 'Wide Return', reverseMoveCount: 12, seed: 0x6c33, finalIndex: indexOf(4, 3) },
  { name: 'Upper Arm', reverseMoveCount: 14, seed: 0xc0c1, finalIndex: indexOf(3, 0) },
  { name: 'Lower Arm', reverseMoveCount: 16, seed: 0xd0d1, finalIndex: indexOf(3, 6) },
  { name: 'Long Turn', reverseMoveCount: 18, seed: 0xe0e1, finalIndex: indexOf(2, 3) },
  { name: 'Outer Arm', reverseMoveCount: 20, seed: 0xa77c, finalIndex: indexOf(3, 0) },
  { name: 'Deep Cross', reverseMoveCount: 22, seed: 0x1212, finalIndex: indexOf(4, 3) },
  { name: 'Long March', reverseMoveCount: 24, seed: 0x1000, finalIndex: indexOf(6, 3) },
  { name: 'Full Sweep', reverseMoveCount: 26, seed: 0x1000, finalIndex: indexOf(6, 3) },
  { name: 'Almost Full', reverseMoveCount: 29, seed: 0x10fa, finalIndex: indexOf(6, 3) },
  {
    name: 'Classic Center',
    initialPegCount: 32,
    solutionMoves: CLASSIC_CENTER_SOLUTION_MOVES,
  },
];

const DIRECTIONS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

export function createLevel(levelIndex) {
  const normalizedIndex = normalizeLevelIndex(levelIndex);
  const definition = PEG_SOLITAIRE_LEVELS[normalizedIndex];

  if (definition.solutionMoves) {
    return {
      board: createClassicCenterBoard(),
      definition,
      levelIndex: normalizedIndex,
      solution: definition.solutionMoves.map(createMoveFromCoordinates),
    };
  }

  const random = createRandom(definition.seed);
  let board = createFinalBoard(definition.finalIndex);
  const solution = [];

  for (let step = 0; step < definition.reverseMoveCount; step += 1) {
    const reverseMoves = getReverseMoves(board);

    if (reverseMoves.length === 0) {
      break;
    }

    const move = reverseMoves[Math.floor(random() * reverseMoves.length)];
    board = applyReverseMove(board, move).board;
    solution.unshift(reverseToForwardMove(move));
  }

  return {
    board,
    definition,
    levelIndex: normalizedIndex,
    solution,
  };
}

export function getLevelPegCount(definition) {
  return definition.initialPegCount ?? definition.reverseMoveCount + 1;
}

export function createFinalBoard(finalIndex = indexOf(3, 3)) {
  const board = Array.from({ length: PEG_SOLITAIRE_SIZE * PEG_SOLITAIRE_SIZE }, (_, index) => (
    isValidIndex(index) ? EMPTY : null
  ));

  board[finalIndex] = PEG;
  return board;
}

export function createClassicCenterBoard() {
  const board = Array.from({ length: PEG_SOLITAIRE_SIZE * PEG_SOLITAIRE_SIZE }, (_, index) => (
    isValidIndex(index) ? PEG : null
  ));

  board[indexOf(3, 3)] = EMPTY;
  return board;
}

export function indexOf(x, y) {
  return y * PEG_SOLITAIRE_SIZE + x;
}

export function cellAt(index) {
  return {
    x: index % PEG_SOLITAIRE_SIZE,
    y: Math.floor(index / PEG_SOLITAIRE_SIZE),
  };
}

export function insideBoard(x, y) {
  return x >= 0 && x < PEG_SOLITAIRE_SIZE && y >= 0 && y < PEG_SOLITAIRE_SIZE;
}

export function isValidCell(x, y) {
  return insideBoard(x, y)
    && !((x < 2 || x > 4) && (y < 2 || y > 4));
}

export function isValidIndex(index) {
  const { x, y } = cellAt(index);

  return isValidCell(x, y);
}

export function getLegalMoves(board, fromIndex = null) {
  const moves = [];

  board.forEach((cell, index) => {
    if (cell !== PEG || (fromIndex !== null && index !== fromIndex)) {
      return;
    }

    const { x, y } = cellAt(index);

    DIRECTIONS.forEach(([dx, dy]) => {
      const overX = x + dx;
      const overY = y + dy;
      const toX = x + dx * 2;
      const toY = y + dy * 2;

      if (!isValidCell(overX, overY) || !isValidCell(toX, toY)) {
        return;
      }

      const overIndex = indexOf(overX, overY);
      const toIndex = indexOf(toX, toY);

      if (board[overIndex] === PEG && board[toIndex] === EMPTY) {
        moves.push({
          fromIndex: index,
          overIndex,
          toIndex,
          fromX: x,
          fromY: y,
          overX,
          overY,
          toX,
          toY,
        });
      }
    });
  });

  return moves;
}

export function applyMove(board, move) {
  const nextBoard = [...board];

  nextBoard[move.fromIndex] = EMPTY;
  nextBoard[move.overIndex] = EMPTY;
  nextBoard[move.toIndex] = PEG;

  return {
    board: nextBoard,
    removedIndex: move.overIndex,
  };
}

export function countPegs(board) {
  return board.filter((cell) => cell === PEG).length;
}

export function countValidHoles(board) {
  return board.filter((cell) => cell !== null).length;
}

export function isSolved(board) {
  return countPegs(board) === 1;
}

export function hasAnyMove(board) {
  return getLegalMoves(board).length > 0;
}

export function normalizeLevelIndex(levelIndex) {
  const parsed = Number(levelIndex);

  if (!Number.isInteger(parsed)) {
    return 0;
  }

  return Math.max(0, Math.min(PEG_SOLITAIRE_LEVELS.length - 1, parsed));
}

function getReverseMoves(board) {
  const moves = [];

  board.forEach((cell, toIndex) => {
    if (cell !== PEG) {
      return;
    }

    const { x, y } = cellAt(toIndex);

    DIRECTIONS.forEach(([dx, dy]) => {
      const overX = x + dx;
      const overY = y + dy;
      const fromX = x + dx * 2;
      const fromY = y + dy * 2;

      if (!isValidCell(overX, overY) || !isValidCell(fromX, fromY)) {
        return;
      }

      const overIndex = indexOf(overX, overY);
      const fromIndex = indexOf(fromX, fromY);

      if (board[overIndex] === EMPTY && board[fromIndex] === EMPTY) {
        moves.push({
          fromIndex,
          overIndex,
          toIndex,
          fromX,
          fromY,
          overX,
          overY,
          toX: x,
          toY: y,
        });
      }
    });
  });

  return moves;
}

function applyReverseMove(board, move) {
  const nextBoard = [...board];

  nextBoard[move.toIndex] = EMPTY;
  nextBoard[move.overIndex] = PEG;
  nextBoard[move.fromIndex] = PEG;

  return {
    board: nextBoard,
  };
}

function reverseToForwardMove(move) {
  return {
    fromIndex: move.fromIndex,
    overIndex: move.overIndex,
    toIndex: move.toIndex,
    fromX: move.fromX,
    fromY: move.fromY,
    overX: move.overX,
    overY: move.overY,
    toX: move.toX,
    toY: move.toY,
  };
}

function createMoveFromCoordinates([[fromX, fromY], [toX, toY]]) {
  const overX = (fromX + toX) / 2;
  const overY = (fromY + toY) / 2;

  return {
    fromIndex: indexOf(fromX, fromY),
    overIndex: indexOf(overX, overY),
    toIndex: indexOf(toX, toY),
    fromX,
    fromY,
    overX,
    overY,
    toX,
    toY,
  };
}

function createRandom(seed) {
  let state = seed >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}
