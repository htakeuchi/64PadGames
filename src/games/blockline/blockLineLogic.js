export const BLOCK_LINE_WIDTH = 8;
export const BLOCK_LINE_HEIGHT = 8;
export const BLOCK_LINE_BLOCK_WIDTHS = [1, 2, 3];
export const BLOCK_LINE_COLOR_COUNT = 8;
const INITIAL_ROW_ATTEMPTS = 40;

export const BLOCK_LINE_DIFFICULTY = {
  easy: {
    singleWidthAllowance: 3,
    singleWidthWeight: 0.9,
    blockCountWeight: 1,
    widthWeights: {
      1: 4,
      2: 5,
      3: 0.6,
    },
  },
  normal: {
    singleWidthAllowance: 2,
    singleWidthWeight: 0.68,
    blockCountWeight: 0.98,
    widthWeights: {
      1: 2.8,
      2: 5,
      3: 1.2,
    },
  },
  hard: {
    singleWidthAllowance: 1,
    singleWidthWeight: 0.35,
    blockCountWeight: 0.88,
    widthWeights: {
      1: 1.4,
      2: 5,
      3: 3.2,
    },
  },
};

export function indexOf(x, y) {
  return y * BLOCK_LINE_WIDTH + x;
}

export function cellAt(index) {
  return {
    x: index % BLOCK_LINE_WIDTH,
    y: Math.floor(index / BLOCK_LINE_WIDTH),
  };
}

export function cloneBlocks(blocks) {
  return blocks.map((block) => ({ ...block }));
}

export function assignDistinctAdjacentColors(blocks, colorCount = BLOCK_LINE_COLOR_COUNT) {
  const nextBlocks = cloneBlocks(blocks);
  const adjacency = buildColorConstraints(nextBlocks);
  const blockById = new Map(nextBlocks.map((block) => [block.id, block]));

  if (nextBlocks.length === 0 || colorCount <= 0) {
    return nextBlocks;
  }

  const colorAssignment = colorAdjacentGraph(nextBlocks, adjacency, colorCount);

  colorAssignment.forEach((colorIndex, blockId) => {
    const block = blockById.get(blockId);

    if (block) {
      block.colorIndex = colorIndex;
    }
  });

  return nextBlocks;
}

export function getColorConflicts(blocks) {
  const constraints = buildColorConstraints(blocks);
  const blockById = new Map(blocks.map((block) => [block.id, block]));
  const conflicts = [];

  constraints.forEach((neighborIds, blockId) => {
    const block = blockById.get(blockId);

    neighborIds.forEach((neighborId) => {
      if (neighborId < blockId) {
        return;
      }

      const neighbor = blockById.get(neighborId);

      if (block && neighbor && block.colorIndex === neighbor.colorIndex) {
        conflicts.push({
          firstBlockId: blockId,
          secondBlockId: neighborId,
          colorIndex: block.colorIndex,
        });
      }
    });
  });

  return conflicts;
}

export function createInitialBlocks(difficulty = 'normal', random = Math.random) {
  const config = getDifficultyConfig(difficulty);
  const bottomRow = createBlockRow(BLOCK_LINE_HEIGHT - 1, 1, config, random);
  let topRow = null;

  for (let attempt = 0; attempt < INITIAL_ROW_ATTEMPTS; attempt += 1) {
    const candidateRow = createBlockRow(
      BLOCK_LINE_HEIGHT - 2,
      bottomRow.nextBlockId,
      config,
      random,
    );

    if (!hasBlockAboveGap(candidateRow.blocks, bottomRow.gapX)) {
      topRow = candidateRow;
      break;
    }
  }

  if (!topRow) {
    topRow = createBlockRowWithGap(
      BLOCK_LINE_HEIGHT - 2,
      bottomRow.gapX,
      bottomRow.nextBlockId,
      config,
      random,
    );
  }

  return {
    blocks: [...topRow.blocks, ...bottomRow.blocks],
    nextBlockId: topRow.nextBlockId,
  };
}

export function createBlockRow(y, nextBlockId, config, random = Math.random) {
  const gapX = Math.floor(random() * BLOCK_LINE_WIDTH);

  return createBlockRowWithGap(y, gapX, nextBlockId, config, random);
}

function createBlockRowWithGap(y, gapX, nextBlockId, config, random = Math.random) {
  const left = createBlocksForSegment(0, gapX, y, nextBlockId, config, random);
  const right = createBlocksForSegment(
    gapX + 1,
    BLOCK_LINE_WIDTH - gapX - 1,
    y,
    left.nextBlockId,
    config,
    random,
  );

  return {
    blocks: [...left.blocks, ...right.blocks],
    gapX,
    nextBlockId: right.nextBlockId,
  };
}

export function buildGrid(blocks) {
  const grid = Array.from({ length: BLOCK_LINE_WIDTH * BLOCK_LINE_HEIGHT }, () => null);

  blocks.forEach((block) => {
    for (let offset = 0; offset < block.width; offset += 1) {
      const x = block.x + offset;

      if (x >= 0 && x < BLOCK_LINE_WIDTH && block.y >= 0 && block.y < BLOCK_LINE_HEIGHT) {
        grid[indexOf(x, block.y)] = block.id;
      }
    }
  });

  return grid;
}

export function getBlockAt(blocks, x, y) {
  const id = buildGrid(blocks)[indexOf(x, y)];

  return blocks.find((block) => block.id === id) ?? null;
}

export function getLegalMoves(blocks, blockId) {
  const block = blocks.find((candidate) => candidate.id === blockId);

  if (!block) {
    return [];
  }

  const grid = buildGrid(blocks);
  const moves = [];

  for (let destinationX = block.x - 1; destinationX >= 0; destinationX -= 1) {
    if (grid[indexOf(destinationX, block.y)] !== null) {
      break;
    }

    moves.push({
      direction: 'left',
      distance: block.x - destinationX,
      destinationIndex: indexOf(destinationX, block.y),
      targetX: destinationX,
    });
  }

  for (
    let destinationX = block.x + block.width;
    destinationX < BLOCK_LINE_WIDTH;
    destinationX += 1
  ) {
    if (grid[indexOf(destinationX, block.y)] !== null) {
      break;
    }

    moves.push({
      direction: 'right',
      distance: destinationX - block.x - block.width + 1,
      destinationIndex: indexOf(destinationX, block.y),
      targetX: destinationX - block.width + 1,
    });
  }

  return moves;
}

export function getMovesIntoCell(blocks, x, y) {
  if (x < 0 || x >= BLOCK_LINE_WIDTH || y < 0 || y >= BLOCK_LINE_HEIGHT) {
    return [];
  }

  const grid = buildGrid(blocks);

  if (grid[indexOf(x, y)] !== null) {
    return [];
  }

  return blocks.flatMap((block) => (
    getLegalMoves(blocks, block.id)
      .filter((move) => move.destinationIndex === indexOf(x, y))
      .map((move) => ({
        ...move,
        blockId: block.id,
      }))
  ));
}

export function getLegalMoveCount(blocks) {
  return blocks.reduce((total, block) => total + getLegalMoves(blocks, block.id).length, 0);
}

export function hasAnyLegalMove(blocks) {
  return getLegalMoveCount(blocks) > 0;
}

export function moveBlock(blocks, blockId, requestedMove) {
  const legalMoves = getLegalMoves(blocks, blockId);
  let legalMove = null;

  if (typeof requestedMove === 'string') {
    const directionalMoves = legalMoves.filter((move) => move.direction === requestedMove);

    legalMove = directionalMoves[directionalMoves.length - 1] ?? null;
  } else {
    legalMove = legalMoves.find((move) => (
      move.direction === requestedMove?.direction
      && move.destinationIndex === requestedMove?.destinationIndex
    )) ?? null;
  }

  if (!legalMove) {
    return null;
  }

  return cloneBlocks(blocks).map((block) => {
    if (block.id !== blockId) {
      return block;
    }

    return {
      ...block,
      x: legalMove.targetX,
    };
  });
}

export function applyGravity(blocks) {
  const nextBlocks = cloneBlocks(blocks);
  const movedBlockIds = new Set();
  let grid = buildGrid(nextBlocks);
  let movedInPass = false;

  do {
    movedInPass = false;

    [...nextBlocks]
      .sort((first, second) => second.y - first.y || first.x - second.x)
      .forEach((block) => {
        if (!canFall(block, grid)) {
          return;
        }

        clearBlockFromGrid(block, grid);
        block.y += 1;
        addBlockToGrid(block, grid);
        movedBlockIds.add(block.id);
        movedInPass = true;
      });
  } while (movedInPass);

  return {
    blocks: nextBlocks,
    moved: movedBlockIds.size > 0,
    movedBlockIds: [...movedBlockIds],
  };
}

export function findFullRows(blocks) {
  const grid = buildGrid(blocks);
  const rows = [];

  for (let y = 0; y < BLOCK_LINE_HEIGHT; y += 1) {
    let filled = true;

    for (let x = 0; x < BLOCK_LINE_WIDTH; x += 1) {
      if (grid[indexOf(x, y)] === null) {
        filled = false;
        break;
      }
    }

    if (filled) {
      rows.push(y);
    }
  }

  return rows;
}

export function removeRows(blocks, rows) {
  const rowSet = new Set(rows);

  return cloneBlocks(blocks).filter((block) => !rowSet.has(block.y));
}

export function hasBlocksAtTop(blocks) {
  return blocks.some((block) => block.y <= 0);
}

export function pushUpWithNewRow(blocks, nextBlockId, difficulty = 'normal', random = Math.random) {
  if (hasBlocksAtTop(blocks)) {
    return {
      blocks: cloneBlocks(blocks),
      gameOver: true,
      newBlockIds: [],
      nextBlockId,
    };
  }

  const config = getDifficultyConfig(difficulty);
  const shiftedBlocks = cloneBlocks(blocks).map((block) => ({
    ...block,
    y: block.y - 1,
  }));
  const row = createBlockRow(BLOCK_LINE_HEIGHT - 1, nextBlockId, config, random);

  return {
    blocks: [...shiftedBlocks, ...row.blocks],
    gameOver: false,
    newBlockIds: row.blocks.map((block) => block.id),
    nextBlockId: row.nextBlockId,
  };
}

export function scoreRows(rowCount, chainIndex) {
  return rowCount * 100 * chainIndex;
}

function createBlocksForSegment(startX, length, y, nextBlockId, config, random) {
  const blocks = [];
  let x = startX;
  let previousColorIndex = null;
  let currentBlockId = nextBlockId;
  const widths = chooseWidthsForSegment(length, config, random);

  widths.forEach((width) => {
    const colorIndex = chooseColorIndex(previousColorIndex, currentBlockId, random);

    blocks.push({
      id: currentBlockId,
      x,
      y,
      width,
      colorIndex,
    });

    x += width;
    previousColorIndex = colorIndex;
    currentBlockId += 1;
  });

  return {
    blocks,
    nextBlockId: currentBlockId,
  };
}

function hasBlockAboveGap(blocks, gapX) {
  return blocks.some((block) => block.x <= gapX && gapX < block.x + block.width);
}

function chooseWidthsForSegment(length, config, random) {
  if (length <= 0) {
    return [];
  }

  const partitions = enumerateWidthPartitions(length);
  const minimumSingleWidthBlocks = partitions.reduce(
    (minimum, widths) => Math.min(minimum, countWidth(widths, 1)),
    Infinity,
  );
  const singleWidthAllowance = config.singleWidthAllowance ?? 0;
  const candidatePartitions = partitions.filter((widths) => (
    countWidth(widths, 1) <= minimumSingleWidthBlocks + singleWidthAllowance
  ));
  const widthWeights = config.widthWeights ?? {};
  const blockCountWeight = config.blockCountWeight ?? 1;
  const singleWidthWeight = config.singleWidthWeight ?? 1;
  const weightedPartitions = candidatePartitions.map((widths) => {
    const widthWeight = widths.reduce(
      (product, width) => product * (widthWeights[width] ?? 1),
      1,
    );
    const blockWeight = Math.pow(blockCountWeight, Math.max(0, widths.length - 1));
    const singleWeight = Math.pow(singleWidthWeight, countWidth(widths, 1));

    return {
      widths,
      weight: widthWeight * blockWeight * singleWeight,
    };
  });
  const totalWeight = weightedPartitions.reduce((total, partition) => total + partition.weight, 0);
  let roll = random() * totalWeight;

  for (const partition of weightedPartitions) {
    roll -= partition.weight;

    if (roll <= 0) {
      return partition.widths;
    }
  }

  return weightedPartitions[weightedPartitions.length - 1].widths;
}

function countWidth(widths, targetWidth) {
  return widths.reduce((count, width) => (
    width === targetWidth ? count + 1 : count
  ), 0);
}

function enumerateWidthPartitions(length) {
  const partitions = [];

  function visit(remaining, widths) {
    if (remaining === 0) {
      partitions.push(widths);
      return;
    }

    BLOCK_LINE_BLOCK_WIDTHS.forEach((width) => {
      if (width <= remaining) {
        visit(remaining - width, [...widths, width]);
      }
    });
  }

  visit(length, []);
  return partitions;
}

function chooseColorIndex(previousColorIndex, blockId, random) {
  const colorCount = 6;
  let colorIndex = (blockId + Math.floor(random() * colorCount)) % colorCount;

  if (colorIndex === previousColorIndex) {
    colorIndex = (colorIndex + 1) % colorCount;
  }

  return colorIndex;
}

function canFall(block, grid) {
  if (block.y >= BLOCK_LINE_HEIGHT - 1) {
    return false;
  }

  for (let offset = 0; offset < block.width; offset += 1) {
    if (grid[indexOf(block.x + offset, block.y + 1)] !== null) {
      return false;
    }
  }

  return true;
}

function clearBlockFromGrid(block, grid) {
  for (let offset = 0; offset < block.width; offset += 1) {
    grid[indexOf(block.x + offset, block.y)] = null;
  }
}

function addBlockToGrid(block, grid) {
  for (let offset = 0; offset < block.width; offset += 1) {
    grid[indexOf(block.x + offset, block.y)] = block.id;
  }
}

function getDifficultyConfig(difficulty) {
  return BLOCK_LINE_DIFFICULTY[difficulty] ?? BLOCK_LINE_DIFFICULTY.normal;
}

function colorAdjacentGraph(blocks, adjacency, colorCount) {
  const blockById = new Map(blocks.map((block) => [block.id, block]));
  const blockIds = blocks.map((block) => block.id);
  const colorIndexes = Array.from({ length: colorCount }, (_, colorIndex) => colorIndex);
  const assignments = new Map();

  if (assignColorsBySaturation(blockIds, adjacency, blockById, colorIndexes, assignments)) {
    return assignments;
  }

  return assignColorsGreedily(blockIds, adjacency, blockById, colorIndexes);
}

function assignColorsBySaturation(blockIds, adjacency, blockById, colorIndexes, assignments) {
  if (assignments.size === blockIds.length) {
    return true;
  }

  const blockId = selectMostConstrainedBlock(blockIds, adjacency, assignments);
  const candidates = colorCandidates(blockId, adjacency, blockById, colorIndexes, assignments);

  for (const colorIndex of candidates) {
    assignments.set(blockId, colorIndex);

    if (assignColorsBySaturation(blockIds, adjacency, blockById, colorIndexes, assignments)) {
      return true;
    }

    assignments.delete(blockId);
  }

  return false;
}

function selectMostConstrainedBlock(blockIds, adjacency, assignments) {
  let selectedBlockId = null;
  let selectedSaturation = -1;
  let selectedDegree = -1;

  blockIds.forEach((blockId) => {
    if (assignments.has(blockId)) {
      return;
    }

    const neighbors = adjacency.get(blockId) ?? new Set();
    const saturation = new Set(
      [...neighbors]
        .map((neighborId) => assignments.get(neighborId))
        .filter((colorIndex) => Number.isInteger(colorIndex)),
    ).size;
    const degree = neighbors.size;

    if (
      saturation > selectedSaturation
      || (saturation === selectedSaturation && degree > selectedDegree)
      || (
        saturation === selectedSaturation
        && degree === selectedDegree
        && (selectedBlockId === null || blockId < selectedBlockId)
      )
    ) {
      selectedBlockId = blockId;
      selectedSaturation = saturation;
      selectedDegree = degree;
    }
  });

  return selectedBlockId;
}

function colorCandidates(blockId, adjacency, blockById, colorIndexes, assignments) {
  const usedColors = new Set(
    [...(adjacency.get(blockId) ?? [])]
      .map((neighborId) => assignments.get(neighborId))
      .filter((colorIndex) => Number.isInteger(colorIndex)),
  );
  const preferredColor = normalizeColorIndex(blockById.get(blockId)?.colorIndex, colorIndexes.length);
  const candidates = colorIndexes.filter((colorIndex) => !usedColors.has(colorIndex));

  candidates.sort((first, second) => {
    if (first === preferredColor) return -1;
    if (second === preferredColor) return 1;
    return first - second;
  });

  return candidates;
}

function assignColorsGreedily(blockIds, adjacency, blockById, colorIndexes) {
  const assignments = new Map();

  smallestLastOrder(adjacency).forEach((blockId) => {
    const usedColors = new Set(
      [...(adjacency.get(blockId) ?? [])]
        .map((neighborId) => assignments.get(neighborId))
        .filter((colorIndex) => Number.isInteger(colorIndex)),
    );
    const preferredColor = normalizeColorIndex(blockById.get(blockId)?.colorIndex, colorIndexes.length);
    const colorIndex = usedColors.has(preferredColor)
      ? colorIndexes.find((candidate) => !usedColors.has(candidate)) ?? preferredColor
      : preferredColor;

    assignments.set(blockId, colorIndex);
  });

  blockIds.forEach((blockId) => {
    if (!assignments.has(blockId)) {
      assignments.set(blockId, normalizeColorIndex(blockById.get(blockId)?.colorIndex, colorIndexes.length));
    }
  });

  return assignments;
}

function normalizeColorIndex(colorIndex, colorCount) {
  return Number.isInteger(colorIndex) && colorCount > 0
    ? ((colorIndex % colorCount) + colorCount) % colorCount
    : 0;
}

function buildAdjacency(blocks) {
  const grid = buildGrid(blocks);
  const adjacency = new Map(blocks.map((block) => [block.id, new Set()]));

  for (let y = 0; y < BLOCK_LINE_HEIGHT; y += 1) {
    for (let x = 0; x < BLOCK_LINE_WIDTH; x += 1) {
      const blockId = grid[indexOf(x, y)];

      if (blockId === null) {
        continue;
      }

      if (x < BLOCK_LINE_WIDTH - 1) {
        addAdjacency(adjacency, blockId, grid[indexOf(x + 1, y)]);
      }

      if (y < BLOCK_LINE_HEIGHT - 1) {
        addAdjacency(adjacency, blockId, grid[indexOf(x, y + 1)]);
      }
    }
  }

  return adjacency;
}

function buildColorConstraints(blocks) {
  const constraints = buildAdjacency(blocks);
  const blocksByRow = new Map();

  blocks.forEach((block) => {
    const rowBlocks = blocksByRow.get(block.y) ?? [];

    rowBlocks.push(block);
    blocksByRow.set(block.y, rowBlocks);
  });

  blocksByRow.forEach((rowBlocks) => {
    for (let firstIndex = 0; firstIndex < rowBlocks.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < rowBlocks.length; secondIndex += 1) {
        addAdjacency(constraints, rowBlocks[firstIndex].id, rowBlocks[secondIndex].id);
      }
    }
  });

  return constraints;
}

function addAdjacency(adjacency, firstBlockId, secondBlockId) {
  if (secondBlockId === null || firstBlockId === secondBlockId) {
    return;
  }

  adjacency.get(firstBlockId)?.add(secondBlockId);
  adjacency.get(secondBlockId)?.add(firstBlockId);
}

function smallestLastOrder(adjacency) {
  const remaining = new Map(
    [...adjacency.entries()].map(([blockId, neighbors]) => [blockId, new Set(neighbors)]),
  );
  const order = [];

  while (remaining.size > 0) {
    let nextBlockId = null;
    let nextDegree = Infinity;

    remaining.forEach((neighbors, blockId) => {
      if (neighbors.size < nextDegree) {
        nextBlockId = blockId;
        nextDegree = neighbors.size;
      }
    });

    order.push(nextBlockId);
    remaining.delete(nextBlockId);
    remaining.forEach((neighbors) => {
      neighbors.delete(nextBlockId);
    });
  }

  return order.reverse();
}
