export const SIMON_BLOCK_COUNT = 4;
export const SIMON_BLOCK_SIZE = 4;

export const SIMON_DIFFICULTY = {
  easy: {
    targetRounds: 10,
    lives: 3,
    playbackMs: 520,
    gapMs: 190,
    inputTimeoutMs: 5000,
  },
  normal: {
    targetRounds: 15,
    lives: 2,
    playbackMs: 430,
    gapMs: 160,
    inputTimeoutMs: 4000,
  },
  hard: {
    targetRounds: 25,
    lives: 1,
    playbackMs: 330,
    gapMs: 130,
    inputTimeoutMs: 3000,
  },
};

export const SIMON_BLOCKS = [
  {
    id: 'simon-green',
    label: 'Top Left',
    midi: 21,
    css: '#007a5e',
    idleCss: '#12483b',
    frequency: 392,
    x: 0,
    y: 0,
  },
  {
    id: 'simon-amber',
    label: 'Top Right',
    midi: 9,
    css: '#e69f00',
    idleCss: '#5a410d',
    frequency: 494,
    x: 4,
    y: 0,
  },
  {
    id: 'simon-sky',
    label: 'Bottom Left',
    midi: 37,
    css: '#56b4e9',
    idleCss: '#1d4f64',
    frequency: 587,
    x: 0,
    y: 4,
  },
  {
    id: 'simon-white',
    label: 'Bottom Right',
    midi: 3,
    css: '#f0f0f0',
    idleCss: '#555961',
    frequency: 659,
    x: 4,
    y: 4,
  },
];

export function blockAt(x, y) {
  return (y < SIMON_BLOCK_SIZE ? 0 : 2) + (x < SIMON_BLOCK_SIZE ? 0 : 1);
}

export function cellsForBlock(blockIndex) {
  const block = SIMON_BLOCKS[blockIndex];
  const cells = [];

  if (!block) {
    return cells;
  }

  for (let y = block.y; y < block.y + SIMON_BLOCK_SIZE; y += 1) {
    for (let x = block.x; x < block.x + SIMON_BLOCK_SIZE; x += 1) {
      cells.push({ x, y, index: y * 8 + x });
    }
  }

  return cells;
}

export function createSimonStep(random = Math.random) {
  return Math.floor(random() * SIMON_BLOCK_COUNT);
}
