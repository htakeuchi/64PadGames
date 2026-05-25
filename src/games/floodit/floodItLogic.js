export const FLOOD_SIZE = 8;

export const FLOOD_DIFFICULTY = {
  easy: {
    colorCount: 4,
    moveLimit: 22,
  },
  normal: {
    colorCount: 5,
    moveLimit: 18,
  },
  hard: {
    colorCount: 6,
    moveLimit: 15,
  },
};

export const FLOOD_LIGHTS = [
  {
    id: 'flood-sky',
    midi: 37,
    css: '#56b4e9',
    label: 'Sky',
  },
  {
    id: 'flood-amber',
    midi: 9,
    css: '#e69f00',
    label: 'Amber',
  },
  {
    id: 'flood-green',
    midi: 21,
    css: '#007a5e',
    label: 'Green',
  },
  {
    id: 'flood-white',
    midi: 3,
    css: '#f0f0f0',
    label: 'White',
  },
  {
    id: 'flood-violet',
    midi: 49,
    css: '#7b61ff',
    label: 'Violet',
  },
  {
    id: 'flood-vermilion',
    midi: 5,
    css: '#d55e00',
    label: 'Vermilion',
  },
];

export function indexOf(x, y) {
  return y * FLOOD_SIZE + x;
}

export function cellAt(index) {
  return {
    x: index % FLOOD_SIZE,
    y: Math.floor(index / FLOOD_SIZE),
  };
}

export function createBoard(colorCount) {
  return Array.from(
    { length: FLOOD_SIZE * FLOOD_SIZE },
    () => Math.floor(Math.random() * colorCount),
  );
}

export function getFloodedIndexes(board) {
  const targetColor = board[0];
  const flooded = new Set();
  const queue = [0];

  while (queue.length > 0) {
    const index = queue.shift();

    if (flooded.has(index) || board[index] !== targetColor) {
      continue;
    }

    flooded.add(index);
    neighborsOf(index).forEach((neighborIndex) => {
      if (!flooded.has(neighborIndex) && board[neighborIndex] === targetColor) {
        queue.push(neighborIndex);
      }
    });
  }

  return flooded;
}

export function applyFloodMove(board, colorIndex) {
  const beforeFlooded = getFloodedIndexes(board);
  const nextBoard = [...board];

  beforeFlooded.forEach((index) => {
    nextBoard[index] = colorIndex;
  });

  const afterFlooded = getFloodedIndexes(nextBoard);
  const newlyCaptured = [...afterFlooded].filter((index) => !beforeFlooded.has(index));

  return {
    board: nextBoard,
    capturedCount: afterFlooded.size,
    flooded: afterFlooded,
    newlyCaptured,
  };
}

export function isComplete(board) {
  return getFloodedIndexes(board).size === board.length;
}

function neighborsOf(index) {
  const { x, y } = cellAt(index);
  const neighbors = [];

  if (x > 0) neighbors.push(indexOf(x - 1, y));
  if (x < FLOOD_SIZE - 1) neighbors.push(indexOf(x + 1, y));
  if (y > 0) neighbors.push(indexOf(x, y - 1));
  if (y < FLOOD_SIZE - 1) neighbors.push(indexOf(x, y + 1));

  return neighbors;
}
