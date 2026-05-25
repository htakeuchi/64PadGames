export const MATCH3_SIZE = 8;
export const MATCH3_COLOR_COUNT = 5;

export const MATCH3_DIFFICULTY = {
  easy: {
    targetQuota: 18,
    moveLimit: 28,
  },
  normal: {
    targetQuota: 24,
    moveLimit: 24,
  },
  hard: {
    targetQuota: 32,
    moveLimit: 22,
  },
};

export const MATCH3_LIGHTS = [
  {
    id: 'match3-sky',
    midi: 37,
    css: '#56b4e9',
    label: 'Sky',
  },
  {
    id: 'match3-amber',
    midi: 9,
    css: '#e69f00',
    label: 'Amber',
  },
  {
    id: 'match3-green',
    midi: 21,
    css: '#007a5e',
    label: 'Green',
  },
  {
    id: 'match3-white',
    midi: 3,
    css: '#f0f0f0',
    label: 'White',
  },
  {
    id: 'match3-violet',
    midi: 49,
    css: '#7b61ff',
    label: 'Violet',
  },
];

export function indexOf(x, y) {
  return y * MATCH3_SIZE + x;
}

export function cellAt(index) {
  return {
    x: index % MATCH3_SIZE,
    y: Math.floor(index / MATCH3_SIZE),
  };
}

export function createBoard(colorCount = MATCH3_COLOR_COUNT, random = Math.random) {
  for (let attempt = 0; attempt < 250; attempt += 1) {
    const board = createCandidateBoard(colorCount, random);

    if (findMatches(board).indexes.length === 0 && hasValidMove(board)) {
      return board;
    }
  }

  return createFallbackBoard();
}

export function areAdjacent(firstIndex, secondIndex) {
  const first = cellAt(firstIndex);
  const second = cellAt(secondIndex);

  return Math.abs(first.x - second.x) + Math.abs(first.y - second.y) === 1;
}

export function getAdjacentIndexes(index) {
  const { x, y } = cellAt(index);
  const indexes = [];

  if (x > 0) indexes.push(indexOf(x - 1, y));
  if (x < MATCH3_SIZE - 1) indexes.push(indexOf(x + 1, y));
  if (y > 0) indexes.push(indexOf(x, y - 1));
  if (y < MATCH3_SIZE - 1) indexes.push(indexOf(x, y + 1));

  return indexes;
}

export function swapCells(board, firstIndex, secondIndex) {
  const nextBoard = [...board];
  const firstValue = nextBoard[firstIndex];

  nextBoard[firstIndex] = nextBoard[secondIndex];
  nextBoard[secondIndex] = firstValue;
  return nextBoard;
}

export function isValidSwap(board, firstIndex, secondIndex) {
  if (!areAdjacent(firstIndex, secondIndex) || board[firstIndex] === board[secondIndex]) {
    return false;
  }

  return findMatches(swapCells(board, firstIndex, secondIndex)).indexes.length > 0;
}

export function hasValidMove(board) {
  for (let y = 0; y < MATCH3_SIZE; y += 1) {
    for (let x = 0; x < MATCH3_SIZE; x += 1) {
      const index = indexOf(x, y);

      if (x < MATCH3_SIZE - 1 && isValidSwap(board, index, indexOf(x + 1, y))) {
        return true;
      }

      if (y < MATCH3_SIZE - 1 && isValidSwap(board, index, indexOf(x, y + 1))) {
        return true;
      }
    }
  }

  return false;
}

export function findMatches(board) {
  const matched = new Set();
  const groups = [];
  let maxGroupLength = 0;

  for (let y = 0; y < MATCH3_SIZE; y += 1) {
    let runStart = 0;
    let runColor = board[indexOf(0, y)];

    for (let x = 1; x <= MATCH3_SIZE; x += 1) {
      const color = x < MATCH3_SIZE ? board[indexOf(x, y)] : undefined;

      if (color === runColor && color !== null && color !== undefined) {
        continue;
      }

      const runLength = x - runStart;

      if (runColor !== null && runColor !== undefined && runLength >= 3) {
        const group = [];

        for (let groupX = runStart; groupX < x; groupX += 1) {
          const groupIndex = indexOf(groupX, y);

          group.push(groupIndex);
          matched.add(groupIndex);
        }

        groups.push(group);
        maxGroupLength = Math.max(maxGroupLength, runLength);
      }

      runStart = x;
      runColor = color;
    }
  }

  for (let x = 0; x < MATCH3_SIZE; x += 1) {
    let runStart = 0;
    let runColor = board[indexOf(x, 0)];

    for (let y = 1; y <= MATCH3_SIZE; y += 1) {
      const color = y < MATCH3_SIZE ? board[indexOf(x, y)] : undefined;

      if (color === runColor && color !== null && color !== undefined) {
        continue;
      }

      const runLength = y - runStart;

      if (runColor !== null && runColor !== undefined && runLength >= 3) {
        const group = [];

        for (let groupY = runStart; groupY < y; groupY += 1) {
          const groupIndex = indexOf(x, groupY);

          group.push(groupIndex);
          matched.add(groupIndex);
        }

        groups.push(group);
        maxGroupLength = Math.max(maxGroupLength, runLength);
      }

      runStart = y;
      runColor = color;
    }
  }

  return {
    indexes: [...matched],
    groups,
    maxGroupLength,
  };
}

export function clearMatches(board, indexes) {
  const matched = new Set(indexes);

  return board.map((cell, index) => (matched.has(index) ? null : cell));
}

export function collapseAndFill(board, colorCount = MATCH3_COLOR_COUNT, random = Math.random) {
  const nextBoard = Array.from({ length: board.length }, () => null);

  for (let x = 0; x < MATCH3_SIZE; x += 1) {
    const column = [];

    for (let y = MATCH3_SIZE - 1; y >= 0; y -= 1) {
      const cell = board[indexOf(x, y)];

      if (cell !== null && cell !== undefined) {
        column.push(cell);
      }
    }

    for (let y = MATCH3_SIZE - 1; y >= 0; y -= 1) {
      const cell = column[MATCH3_SIZE - 1 - y];

      nextBoard[indexOf(x, y)] = cell ?? Math.floor(random() * colorCount);
    }
  }

  return nextBoard;
}

export function countColor(board, colorIndex) {
  return board.filter((cell) => cell === colorIndex).length;
}

function createCandidateBoard(colorCount, random) {
  const board = [];

  for (let y = 0; y < MATCH3_SIZE; y += 1) {
    for (let x = 0; x < MATCH3_SIZE; x += 1) {
      const candidates = [];

      for (let colorIndex = 0; colorIndex < colorCount; colorIndex += 1) {
        if (!wouldCreateRun(board, x, y, colorIndex)) {
          candidates.push(colorIndex);
        }
      }

      const available = candidates.length > 0
        ? candidates
        : Array.from({ length: colorCount }, (_, colorIndex) => colorIndex);

      board.push(available[Math.floor(random() * available.length)]);
    }
  }

  return board;
}

function wouldCreateRun(board, x, y, colorIndex) {
  const horizontal = x >= 2
    && board[indexOf(x - 1, y)] === colorIndex
    && board[indexOf(x - 2, y)] === colorIndex;
  const vertical = y >= 2
    && board[indexOf(x, y - 1)] === colorIndex
    && board[indexOf(x, y - 2)] === colorIndex;

  return horizontal || vertical;
}

function createFallbackBoard() {
  const board = [];

  for (let y = 0; y < MATCH3_SIZE; y += 1) {
    for (let x = 0; x < MATCH3_SIZE; x += 1) {
      board.push((x + y * 2) % MATCH3_COLOR_COUNT);
    }
  }

  board[indexOf(0, 1)] = 1;
  board[indexOf(1, 1)] = 2;
  board[indexOf(2, 1)] = 1;
  return board;
}
