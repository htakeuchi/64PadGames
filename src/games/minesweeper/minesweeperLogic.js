export const MINE = -1;

export const MINE_COUNT_BY_DIFFICULTY = {
  easy: 8,
  normal: 10,
  hard: 14,
};

export function createEmptyCells() {
  return Array.from({ length: 64 }, () => ({
    adjacent: 0,
    flagged: false,
    mine: false,
    open: false,
  }));
}

export function indexOf(x, y) {
  return y * 8 + x;
}

export function cellAt(index) {
  return {
    x: index % 8,
    y: Math.floor(index / 8),
  };
}

export function insideBoard(x, y) {
  return x >= 0 && x < 8 && y >= 0 && y < 8;
}

export function neighborsOf(x, y) {
  const neighbors = [];

  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) {
        continue;
      }

      const nx = x + dx;
      const ny = y + dy;

      if (insideBoard(nx, ny)) {
        neighbors.push(indexOf(nx, ny));
      }
    }
  }

  return neighbors;
}

export function generateBoard(firstIndex, mineCount) {
  const cells = createEmptyCells();
  const candidates = Array.from({ length: 64 }, (_, index) => index)
    .filter((index) => index !== firstIndex);

  shuffle(candidates);

  candidates.slice(0, mineCount).forEach((index) => {
    cells[index].mine = true;
    cells[index].adjacent = MINE;
  });

  cells.forEach((cell, index) => {
    if (cell.mine) {
      return;
    }

    const { x, y } = cellAt(index);
    cell.adjacent = neighborsOf(x, y)
      .filter((neighborIndex) => cells[neighborIndex].mine)
      .length;
  });

  return cells;
}

export function openCells(cells, startIndex) {
  if (cells[startIndex].flagged || cells[startIndex].open) {
    return [];
  }

  const opened = [];
  const queue = [startIndex];
  const visited = new Set();

  while (queue.length > 0) {
    const index = queue.shift();
    const cell = cells[index];

    if (visited.has(index) || cell.flagged || cell.open) {
      continue;
    }

    visited.add(index);
    cell.open = true;
    opened.push(index);

    if (cell.mine || cell.adjacent !== 0) {
      continue;
    }

    const { x, y } = cellAt(index);
    neighborsOf(x, y).forEach((neighborIndex) => {
      const neighbor = cells[neighborIndex];

      if (!neighbor.open && !neighbor.flagged && !neighbor.mine) {
        queue.push(neighborIndex);
      }
    });
  }

  return opened;
}

export function countOpenedSafeCells(cells) {
  return cells.filter((cell) => cell.open && !cell.mine).length;
}

export function countFlags(cells) {
  return cells.filter((cell) => cell.flagged).length;
}

export function hasWon(cells, mineCount) {
  return countOpenedSafeCells(cells) === cells.length - mineCount;
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[swapIndex]] = [items[swapIndex], items[index]];
  }
}

