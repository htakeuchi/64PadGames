export const SAMEGAME_SIZE = 8;

export const SAMEGAME_DIFFICULTY = {
  easy: {
    colorCount: 4,
    cohesion: 0.5,
    maxGenerationAttempts: 40,
    solverNodeLimit: 30000,
  },
  normal: {
    colorCount: 5,
    cohesion: 0.52,
    maxGenerationAttempts: 60,
    solverNodeLimit: 40000,
  },
  hard: {
    colorCount: 6,
    cohesion: 0.55,
    maxGenerationAttempts: 80,
    solverNodeLimit: 50000,
  },
};

const DEFAULT_SOLVER_NODE_LIMIT = 40000;
const MIN_SINGLE_BLOCKS = 4;
const MIN_HORIZONTAL_MATCHES = 8;
const MIN_VERTICAL_MATCHES = 8;

export const SAMEGAME_LIGHTS = [
  {
    id: 'samegame-sky',
    midi: 37,
    css: '#56b4e9',
    label: 'Sky',
  },
  {
    id: 'samegame-amber',
    midi: 9,
    css: '#e69f00',
    label: 'Amber',
  },
  {
    id: 'samegame-green',
    midi: 21,
    css: '#007a5e',
    label: 'Green',
  },
  {
    id: 'samegame-white',
    midi: 3,
    css: '#f0f0f0',
    label: 'White',
  },
  {
    id: 'samegame-violet',
    midi: 49,
    css: '#7b61ff',
    label: 'Violet',
  },
  {
    id: 'samegame-vermilion',
    midi: 5,
    css: '#d55e00',
    label: 'Vermilion',
  },
];

export function indexOf(x, y) {
  return y * SAMEGAME_SIZE + x;
}

export function cellAt(index) {
  return {
    x: index % SAMEGAME_SIZE,
    y: Math.floor(index / SAMEGAME_SIZE),
  };
}

export function createBoard(config, random = Math.random) {
  const colorCount = config?.colorCount ?? SAMEGAME_DIFFICULTY.normal.colorCount;
  const cohesion = config?.cohesion ?? SAMEGAME_DIFFICULTY.normal.cohesion;
  const maxGenerationAttempts = config?.maxGenerationAttempts
    ?? SAMEGAME_DIFFICULTY.normal.maxGenerationAttempts;
  const solverNodeLimit = config?.solverNodeLimit ?? DEFAULT_SOLVER_NODE_LIMIT;

  for (let attempt = 0; attempt < maxGenerationAttempts; attempt += 1) {
    const board = createCandidateBoard(colorCount, cohesion, random);

    if (hasNaturalTexture(board) && canClearBoard(board, { nodeLimit: solverNodeLimit })) {
      return board;
    }
  }

  for (let attempt = 0; attempt < maxGenerationAttempts; attempt += 1) {
    const board = createCandidateBoard(colorCount, cohesion + 0.12, random);

    if (canClearBoard(board, { nodeLimit: solverNodeLimit })) {
      return board;
    }
  }

  return createFallbackClearableBoard(colorCount, random);
}

export function findGroup(board, startIndex) {
  const color = board[startIndex];

  if (color === null || color === undefined) {
    return [];
  }

  const group = [];
  const visited = new Set();
  const queue = [startIndex];

  while (queue.length > 0) {
    const index = queue.shift();

    if (visited.has(index) || board[index] !== color) {
      continue;
    }

    visited.add(index);
    group.push(index);
    neighborsOf(index).forEach((neighborIndex) => {
      if (!visited.has(neighborIndex) && board[neighborIndex] === color) {
        queue.push(neighborIndex);
      }
    });
  }

  return group;
}

export function removeGroupAndCollapse(board, group) {
  const groupSet = new Set(group);
  const removedBoard = board.map((cell, index) => (groupSet.has(index) ? null : cell));

  return compactColumns(applyGravity(removedBoard));
}

export function scoreGroup(size) {
  return Math.max(0, size - 2) ** 2;
}

export function countBlocks(board) {
  return board.filter((cell) => cell !== null && cell !== undefined).length;
}

export function isClear(board) {
  return countBlocks(board) === 0;
}

export function hasAvailableMove(board) {
  const visited = new Set();

  for (let index = 0; index < board.length; index += 1) {
    if (visited.has(index) || board[index] === null || board[index] === undefined) {
      continue;
    }

    const group = findGroup(board, index);
    group.forEach((groupIndex) => visited.add(groupIndex));

    if (group.length >= 2) {
      return true;
    }
  }

  return false;
}

export function countAvailableGroups(board) {
  const visited = new Set();
  let count = 0;

  for (let index = 0; index < board.length; index += 1) {
    if (visited.has(index) || board[index] === null || board[index] === undefined) {
      continue;
    }

    const group = findGroup(board, index);
    group.forEach((groupIndex) => visited.add(groupIndex));

    if (group.length >= 2) {
      count += 1;
    }
  }

  return count;
}

export function canClearBoard(board, options = {}) {
  return solveClearableBoard(board, options).clearable;
}

function createCandidateBoard(colorCount, cohesion, random) {
  const board = [];

  for (let y = 0; y < SAMEGAME_SIZE; y += 1) {
    for (let x = 0; x < SAMEGAME_SIZE; x += 1) {
      const neighbors = [];

      if (x > 0) neighbors.push(board[indexOf(x - 1, y)]);
      if (y > 0) neighbors.push(board[indexOf(x, y - 1)]);

      if (neighbors.length > 0 && random() < cohesion) {
        board.push(neighbors[Math.floor(random() * neighbors.length)]);
      } else {
        board.push(Math.floor(random() * colorCount));
      }
    }
  }

  return board;
}

function solveClearableBoard(board, options = {}) {
  const nodeLimit = options.nodeLimit ?? DEFAULT_SOLVER_NODE_LIMIT;
  const failedBoards = new Set();
  let visitedNodeCount = 0;

  function visit(currentBoard) {
    visitedNodeCount += 1;

    if (visitedNodeCount > nodeLimit) {
      return false;
    }

    if (isClear(currentBoard)) {
      return true;
    }

    const key = boardKey(currentBoard);

    if (failedBoards.has(key)) {
      return false;
    }

    if (hasSingleRemainingColor(currentBoard)) {
      failedBoards.add(key);
      return false;
    }

    const groups = removableGroups(currentBoard);

    for (const group of groups) {
      if (visit(removeGroupAndCollapse(currentBoard, group))) {
        return true;
      }
    }

    failedBoards.add(key);
    return false;
  }

  return {
    clearable: visit(board),
    visitedNodeCount,
  };
}

function removableGroups(board) {
  const visited = new Set();
  const groups = [];

  for (let index = 0; index < board.length; index += 1) {
    if (visited.has(index) || board[index] === null || board[index] === undefined) {
      continue;
    }

    const group = findGroup(board, index);
    group.forEach((groupIndex) => visited.add(groupIndex));

    if (group.length >= 2) {
      groups.push(group);
    }
  }

  groups.sort((first, second) => second.length - first.length);
  return groups;
}

function hasSingleRemainingColor(board) {
  const colorCounts = new Map();

  board.forEach((colorIndex) => {
    if (colorIndex !== null && colorIndex !== undefined) {
      colorCounts.set(colorIndex, (colorCounts.get(colorIndex) ?? 0) + 1);
    }
  });

  return [...colorCounts.values()].some((count) => count === 1);
}

function hasNaturalTexture(board) {
  const texture = boardTexture(board);

  return texture.singleBlocks >= MIN_SINGLE_BLOCKS
    && texture.horizontalMatches >= MIN_HORIZONTAL_MATCHES
    && texture.verticalMatches >= MIN_VERTICAL_MATCHES;
}

function boardTexture(board) {
  let singleBlocks = 0;
  let horizontalMatches = 0;
  let verticalMatches = 0;

  for (let y = 0; y < SAMEGAME_SIZE; y += 1) {
    for (let x = 0; x < SAMEGAME_SIZE; x += 1) {
      const index = indexOf(x, y);
      const colorIndex = board[index];

      if (colorIndex === null || colorIndex === undefined) {
        continue;
      }

      if (findGroup(board, index).length === 1) {
        singleBlocks += 1;
      }

      if (x < SAMEGAME_SIZE - 1 && colorIndex === board[indexOf(x + 1, y)]) {
        horizontalMatches += 1;
      }

      if (y < SAMEGAME_SIZE - 1 && colorIndex === board[indexOf(x, y + 1)]) {
        verticalMatches += 1;
      }
    }
  }

  return {
    horizontalMatches,
    singleBlocks,
    verticalMatches,
  };
}

function createFallbackClearableBoard(colorCount, random) {
  const normalizedColorCount = Math.max(2, colorCount);
  const board = Array.from({ length: SAMEGAME_SIZE * SAMEGAME_SIZE }, () => null);
  let previousColor = null;

  for (let y = 0; y < SAMEGAME_SIZE; y += 1) {
    for (let x = 0; x < SAMEGAME_SIZE; x += 2) {
      let colorIndex = Math.floor(random() * normalizedColorCount);

      if (colorIndex === previousColor) {
        colorIndex = (colorIndex + 1) % normalizedColorCount;
      }

      board[indexOf(x, y)] = colorIndex;
      board[indexOf(x + 1, y)] = colorIndex;
      previousColor = colorIndex;
    }
  }

  return board;
}

function boardKey(board) {
  return board.map((cell) => (
    cell === null || cell === undefined ? '.' : String(cell)
  )).join('');
}

function applyGravity(board) {
  const nextBoard = Array.from({ length: board.length }, () => null);

  for (let x = 0; x < SAMEGAME_SIZE; x += 1) {
    const column = [];

    for (let y = SAMEGAME_SIZE - 1; y >= 0; y -= 1) {
      const cell = board[indexOf(x, y)];

      if (cell !== null && cell !== undefined) {
        column.push(cell);
      }
    }

    column.forEach((cell, offset) => {
      nextBoard[indexOf(x, SAMEGAME_SIZE - 1 - offset)] = cell;
    });
  }

  return nextBoard;
}

function compactColumns(board) {
  const columns = [];

  for (let x = 0; x < SAMEGAME_SIZE; x += 1) {
    const column = [];

    for (let y = 0; y < SAMEGAME_SIZE; y += 1) {
      column.push(board[indexOf(x, y)]);
    }

    if (column.some((cell) => cell !== null && cell !== undefined)) {
      columns.push(column);
    }
  }

  const nextBoard = Array.from({ length: board.length }, () => null);

  columns.forEach((column, x) => {
    column.forEach((cell, y) => {
      nextBoard[indexOf(x, y)] = cell;
    });
  });

  return nextBoard;
}

function neighborsOf(index) {
  const { x, y } = cellAt(index);
  const neighbors = [];

  if (x > 0) neighbors.push(indexOf(x - 1, y));
  if (x < SAMEGAME_SIZE - 1) neighbors.push(indexOf(x + 1, y));
  if (y > 0) neighbors.push(indexOf(x, y - 1));
  if (y < SAMEGAME_SIZE - 1) neighbors.push(indexOf(x, y + 1));

  return neighbors;
}
