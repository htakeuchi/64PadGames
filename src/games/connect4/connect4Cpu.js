import {
  COLUMN_COUNT,
  EMPTY,
  ROW_COUNT,
  applyMove,
  findWinner,
  getLegalColumns,
  indexOf,
  opponentOf,
} from './connect4Logic.js';

const WIN_SCORE = 100000;
const COLUMN_ORDER = [3, 2, 4, 1, 5, 0, 6];

const DIFFICULTY_PROFILE = {
  easy: {
    depth: 2,
    randomMoveRate: 0.36,
    candidateWindow: 160,
  },
  normal: {
    depth: 4,
    randomMoveRate: 0.04,
    candidateWindow: 34,
  },
  hard: {
    depth: 6,
    randomMoveRate: 0,
    candidateWindow: 0,
  },
};

export function chooseCpuMove(board, player, difficulty) {
  const legalColumns = getLegalColumns(board);

  if (legalColumns.length === 0) {
    return null;
  }

  const winningColumn = findImmediateWinningColumn(board, legalColumns, player);

  if (winningColumn !== null) {
    return winningColumn;
  }

  const profile = DIFFICULTY_PROFILE[difficulty] ?? DIFFICULTY_PROFILE.normal;

  if (profile.randomMoveRate > 0 && Math.random() < profile.randomMoveRate) {
    return randomColumn(legalColumns);
  }

  const orderedColumns = orderColumns(legalColumns);
  const scoredColumns = orderedColumns.map((column) => {
    const result = applyMove(board, column, player);
    const score = search(
      result.board,
      opponentOf(player),
      player,
      profile.depth - 1,
      -Infinity,
      Infinity,
    );

    return { column, score };
  });

  return selectColumn(scoredColumns, profile);
}

function search(board, currentPlayer, rootPlayer, depth, alpha, beta) {
  const winner = findWinner(board).player;

  if (winner !== EMPTY) {
    return winner === rootPlayer ? WIN_SCORE + depth : -WIN_SCORE - depth;
  }

  const legalColumns = getLegalColumns(board);

  if (legalColumns.length === 0) {
    return 0;
  }

  if (depth <= 0) {
    return evaluateBoard(board, rootPlayer);
  }

  const maximizing = currentPlayer === rootPlayer;
  const orderedColumns = orderColumns(legalColumns);

  if (maximizing) {
    let value = -Infinity;

    for (const column of orderedColumns) {
      const result = applyMove(board, column, currentPlayer);

      value = Math.max(
        value,
        search(result.board, opponentOf(currentPlayer), rootPlayer, depth - 1, alpha, beta),
      );
      alpha = Math.max(alpha, value);

      if (alpha >= beta) {
        break;
      }
    }

    return value;
  }

  let value = Infinity;

  for (const column of orderedColumns) {
    const result = applyMove(board, column, currentPlayer);

    value = Math.min(
      value,
      search(result.board, opponentOf(currentPlayer), rootPlayer, depth - 1, alpha, beta),
    );
    beta = Math.min(beta, value);

    if (alpha >= beta) {
      break;
    }
  }

  return value;
}

function evaluateBoard(board, rootPlayer) {
  const opponent = opponentOf(rootPlayer);
  let score = countCenterPieces(board, rootPlayer) * 7;

  forEachWindow(board, (cells) => {
    score += evaluateWindow(cells, rootPlayer, opponent);
  });

  return score;
}

function evaluateWindow(cells, rootPlayer, opponent) {
  const rootCount = cells.filter((cell) => cell === rootPlayer).length;
  const opponentCount = cells.filter((cell) => cell === opponent).length;
  const emptyCount = cells.filter((cell) => cell === EMPTY).length;

  if (rootCount > 0 && opponentCount > 0) {
    return 0;
  }

  if (rootCount === 4) return WIN_SCORE;
  if (opponentCount === 4) return -WIN_SCORE;
  if (rootCount === 3 && emptyCount === 1) return 120;
  if (rootCount === 2 && emptyCount === 2) return 24;
  if (rootCount === 1 && emptyCount === 3) return 3;
  if (opponentCount === 3 && emptyCount === 1) return -150;
  if (opponentCount === 2 && emptyCount === 2) return -26;
  if (opponentCount === 1 && emptyCount === 3) return -2;
  return 0;
}

function forEachWindow(board, callback) {
  for (let y = 0; y < ROW_COUNT; y += 1) {
    for (let x = 0; x <= COLUMN_COUNT - 4; x += 1) {
      callback([
        board[indexOf(x, y)],
        board[indexOf(x + 1, y)],
        board[indexOf(x + 2, y)],
        board[indexOf(x + 3, y)],
      ]);
    }
  }

  for (let x = 0; x < COLUMN_COUNT; x += 1) {
    for (let y = 0; y <= ROW_COUNT - 4; y += 1) {
      callback([
        board[indexOf(x, y)],
        board[indexOf(x, y + 1)],
        board[indexOf(x, y + 2)],
        board[indexOf(x, y + 3)],
      ]);
    }
  }

  for (let y = 0; y <= ROW_COUNT - 4; y += 1) {
    for (let x = 0; x <= COLUMN_COUNT - 4; x += 1) {
      callback([
        board[indexOf(x, y)],
        board[indexOf(x + 1, y + 1)],
        board[indexOf(x + 2, y + 2)],
        board[indexOf(x + 3, y + 3)],
      ]);
    }
  }

  for (let y = 3; y < ROW_COUNT; y += 1) {
    for (let x = 0; x <= COLUMN_COUNT - 4; x += 1) {
      callback([
        board[indexOf(x, y)],
        board[indexOf(x + 1, y - 1)],
        board[indexOf(x + 2, y - 2)],
        board[indexOf(x + 3, y - 3)],
      ]);
    }
  }
}

function countCenterPieces(board, player) {
  const centerColumn = Math.floor(COLUMN_COUNT / 2);
  let count = 0;

  for (let y = 0; y < ROW_COUNT; y += 1) {
    if (board[indexOf(centerColumn, y)] === player) {
      count += 1;
    }
  }

  return count;
}

function findImmediateWinningColumn(board, legalColumns, player) {
  for (const column of orderColumns(legalColumns)) {
    const result = applyMove(board, column, player);

    if (findWinner(result.board).player === player) {
      return column;
    }
  }

  return null;
}

function orderColumns(columns) {
  return COLUMN_ORDER.filter((column) => columns.includes(column));
}

function selectColumn(scoredColumns, profile) {
  const bestScore = Math.max(...scoredColumns.map(({ score }) => score));
  const candidates = scoredColumns.filter(({ score }) => (
    score >= bestScore - profile.candidateWindow
  ));

  return candidates[Math.floor(Math.random() * candidates.length)].column;
}

function randomColumn(columns) {
  return columns[Math.floor(Math.random() * columns.length)];
}
