export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

export const COLUMN_COUNT = 7;
export const ROW_COUNT = 6;

const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

export function createInitialBoard() {
  return Array.from({ length: COLUMN_COUNT * ROW_COUNT }, () => EMPTY);
}

export function indexOf(x, y) {
  return y * COLUMN_COUNT + x;
}

export function cellAt(index) {
  return {
    x: index % COLUMN_COUNT,
    y: Math.floor(index / COLUMN_COUNT),
  };
}

export function insideBoard(x, y) {
  return x >= 0 && x < COLUMN_COUNT && y >= 0 && y < ROW_COUNT;
}

export function opponentOf(player) {
  return player === BLACK ? WHITE : BLACK;
}

export function playerName(player) {
  return player === BLACK ? 'First' : 'Second';
}

export function canPlayColumn(board, column) {
  return Number.isInteger(column)
    && column >= 0
    && column < COLUMN_COUNT
    && board[indexOf(column, 0)] === EMPTY;
}

export function getLegalColumns(board) {
  const columns = [];

  for (let column = 0; column < COLUMN_COUNT; column += 1) {
    if (canPlayColumn(board, column)) {
      columns.push(column);
    }
  }

  return columns;
}

export function getDropRow(board, column) {
  if (!Number.isInteger(column) || column < 0 || column >= COLUMN_COUNT) {
    return -1;
  }

  for (let y = ROW_COUNT - 1; y >= 0; y -= 1) {
    if (board[indexOf(column, y)] === EMPTY) {
      return y;
    }
  }

  return -1;
}

export function applyMove(board, column, player) {
  const y = getDropRow(board, column);

  if (y < 0) {
    throw new Error(`Column ${column} is full or outside the board.`);
  }

  const nextBoard = [...board];
  const moveIndex = indexOf(column, y);

  nextBoard[moveIndex] = player;

  return {
    board: nextBoard,
    x: column,
    y,
    index: moveIndex,
  };
}

export function countPieces(board) {
  return board.reduce(
    (score, cell) => {
      if (cell === BLACK) score.black += 1;
      if (cell === WHITE) score.white += 1;
      return score;
    },
    { black: 0, white: 0 },
  );
}

export function findWinner(board) {
  for (let y = 0; y < ROW_COUNT; y += 1) {
    for (let x = 0; x < COLUMN_COUNT; x += 1) {
      const player = board[indexOf(x, y)];

      if (player === EMPTY) {
        continue;
      }

      for (const [dx, dy] of DIRECTIONS) {
        const indexes = [indexOf(x, y)];

        for (let step = 1; step < 4; step += 1) {
          const nextX = x + dx * step;
          const nextY = y + dy * step;

          if (!insideBoard(nextX, nextY)) {
            break;
          }

          const nextIndex = indexOf(nextX, nextY);

          if (board[nextIndex] !== player) {
            break;
          }

          indexes.push(nextIndex);
        }

        if (indexes.length === 4) {
          return {
            player,
            indexes,
          };
        }
      }
    }
  }

  return {
    player: EMPTY,
    indexes: [],
  };
}

export function winnerOf(board) {
  return findWinner(board).player;
}

export function isDraw(board) {
  return winnerOf(board) === EMPTY && getLegalColumns(board).length === 0;
}

export function isGameOver(board) {
  return winnerOf(board) !== EMPTY || getLegalColumns(board).length === 0;
}
