export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

export const DIRECTIONS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

export function createInitialBoard() {
  const board = Array.from({ length: 64 }, () => EMPTY);
  board[indexOf(3, 3)] = WHITE;
  board[indexOf(4, 3)] = BLACK;
  board[indexOf(3, 4)] = BLACK;
  board[indexOf(4, 4)] = WHITE;
  return board;
}

export function indexOf(x, y) {
  return y * 8 + x;
}

export function insideBoard(x, y) {
  return x >= 0 && x < 8 && y >= 0 && y < 8;
}

export function opponentOf(player) {
  return player === BLACK ? WHITE : BLACK;
}

export function playerName(player) {
  return player === BLACK ? 'Black' : 'White';
}

export function getFlips(board, x, y, player) {
  if (!insideBoard(x, y) || board[indexOf(x, y)] !== EMPTY) {
    return [];
  }

  const opponent = opponentOf(player);
  const flips = [];

  DIRECTIONS.forEach(([dx, dy]) => {
    const line = [];
    let cx = x + dx;
    let cy = y + dy;

    while (insideBoard(cx, cy) && board[indexOf(cx, cy)] === opponent) {
      line.push(indexOf(cx, cy));
      cx += dx;
      cy += dy;
    }

    if (line.length > 0 && insideBoard(cx, cy) && board[indexOf(cx, cy)] === player) {
      flips.push(...line);
    }
  });

  return flips;
}

export function getLegalMoves(board, player) {
  const moves = [];

  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const flips = getFlips(board, x, y, player);

      if (flips.length > 0) {
        moves.push({ x, y, flips });
      }
    }
  }

  return moves;
}

export function applyMove(board, move, player) {
  const nextBoard = [...board];
  const flips = move.flips?.length ? move.flips : getFlips(board, move.x, move.y, player);

  nextBoard[indexOf(move.x, move.y)] = player;
  flips.forEach((index) => {
    nextBoard[index] = player;
  });

  return {
    board: nextBoard,
    flips,
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

export function hasAnyMove(board, player) {
  return getLegalMoves(board, player).length > 0;
}

export function isGameOver(board) {
  return !hasAnyMove(board, BLACK) && !hasAnyMove(board, WHITE);
}

export function winnerOf(board) {
  const score = countPieces(board);

  if (score.black > score.white) return BLACK;
  if (score.white > score.black) return WHITE;
  return EMPTY;
}
