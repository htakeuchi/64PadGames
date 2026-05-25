export const LIGHTS_OUT_SIZES = [2, 3, 4, 5, 6, 7, 8];

export const LIGHTS_OUT_DIFFICULTY = {
  easy: {
    ratio: 0.18,
    minMoves: 1,
  },
  normal: {
    ratio: 0.34,
    minMoves: 2,
  },
  hard: {
    ratio: 0.52,
    minMoves: 3,
  },
};

export function createPuzzle(size, difficulty) {
  const scrambleCount = getScrambleCount(size, difficulty);
  const board = createEmptyBoard(size);
  const indexes = shuffledIndexes(size).slice(0, scrambleCount);
  let nextBoard = board;

  indexes.forEach((index) => {
    nextBoard = toggleAt(nextBoard, size, index);
  });

  if (isClear(nextBoard)) {
    nextBoard = toggleAt(nextBoard, size, indexes[0] ?? 0);
  }

  return {
    board: nextBoard,
    parMoves: indexes.length,
  };
}

export function createEmptyBoard(size) {
  return Array.from({ length: size * size }, () => false);
}

export function indexOf(x, y, size) {
  return y * size + x;
}

export function cellAt(index, size) {
  return {
    x: index % size,
    y: Math.floor(index / size),
  };
}

export function padToBoardIndex(x, y, size) {
  const offset = getBoardOffset(size);
  const boardX = x - offset.x;
  const boardY = y - offset.y;

  if (boardX < 0 || boardX >= size || boardY < 0 || boardY >= size) {
    return null;
  }

  return indexOf(boardX, boardY, size);
}

export function boardToPadCell(index, size) {
  const offset = getBoardOffset(size);
  const cell = cellAt(index, size);

  return {
    x: cell.x + offset.x,
    y: cell.y + offset.y,
  };
}

export function getAffectedIndexes(size, index) {
  const { x, y } = cellAt(index, size);
  const candidates = [
    [x, y],
    [x, y - 1],
    [x + 1, y],
    [x, y + 1],
    [x - 1, y],
  ];

  return candidates
    .filter(([cellX, cellY]) => (
      cellX >= 0 && cellX < size && cellY >= 0 && cellY < size
    ))
    .map(([cellX, cellY]) => indexOf(cellX, cellY, size));
}

export function toggleAt(board, size, index) {
  const nextBoard = [...board];

  getAffectedIndexes(size, index).forEach((affectedIndex) => {
    nextBoard[affectedIndex] = !nextBoard[affectedIndex];
  });

  return nextBoard;
}

export function isClear(board) {
  return board.every((cell) => !cell);
}

export function countLightsOn(board) {
  return board.filter(Boolean).length;
}

export function normalizeBoardSize(size) {
  const parsedSize = Number(size);

  if (LIGHTS_OUT_SIZES.includes(parsedSize)) {
    return parsedSize;
  }

  return 5;
}

export function getScrambleCount(size, difficulty) {
  const config = LIGHTS_OUT_DIFFICULTY[difficulty] ?? LIGHTS_OUT_DIFFICULTY.normal;

  return Math.max(
    config.minMoves,
    Math.min(size * size, Math.round(size * size * config.ratio)),
  );
}

function getBoardOffset(size) {
  const offset = Math.floor((8 - size) / 2);

  return {
    x: offset,
    y: offset,
  };
}

function shuffledIndexes(size) {
  const indexes = Array.from({ length: size * size }, (_, index) => index);

  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [indexes[index], indexes[swapIndex]] = [indexes[swapIndex], indexes[index]];
  }

  return indexes;
}
