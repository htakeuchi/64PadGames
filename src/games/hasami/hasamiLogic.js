export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

const BOARD_SIZE = 8;
const DIRECTIONS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

export function createInitialBoard() {
  const board = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => EMPTY);

  for (let x = 0; x < BOARD_SIZE; x += 1) {
    board[indexOf(x, 0)] = WHITE;
    board[indexOf(x, BOARD_SIZE - 1)] = BLACK;
  }

  return board;
}

export function indexOf(x, y) {
  return y * BOARD_SIZE + x;
}

export function cellAt(index) {
  return {
    x: index % BOARD_SIZE,
    y: Math.floor(index / BOARD_SIZE),
  };
}

export function insideBoard(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

export function opponentOf(player) {
  return player === BLACK ? WHITE : BLACK;
}

export function playerName(player) {
  return player === BLACK ? 'Black' : 'White';
}

export function pieceOwner(piece) {
  if (piece === BLACK) return BLACK;
  if (piece === WHITE) return WHITE;
  return EMPTY;
}

export function getLegalMoves(board, player) {
  const moves = [];

  board.forEach((piece, fromIndex) => {
    if (pieceOwner(piece) !== player) {
      return;
    }

    const { x, y } = cellAt(fromIndex);

    DIRECTIONS.forEach(([dx, dy]) => {
      let toX = x + dx;
      let toY = y + dy;

      while (insideBoard(toX, toY) && board[indexOf(toX, toY)] === EMPTY) {
        moves.push(createMove(board, fromIndex, indexOf(toX, toY)));
        toX += dx;
        toY += dy;
      }
    });
  });

  return moves;
}

export function applyMove(board, move) {
  const nextBoard = [...board];
  const piece = nextBoard[move.fromIndex];

  nextBoard[move.fromIndex] = EMPTY;
  nextBoard[move.toIndex] = piece;

  const capturedIndexes = findCaptures(nextBoard, pieceOwner(piece), move.toIndex);
  capturedIndexes.forEach((index) => {
    nextBoard[index] = EMPTY;
  });

  return {
    board: nextBoard,
    capturedIndexes,
  };
}

export function countPieces(board) {
  return board.reduce(
    (score, piece) => {
      if (piece === BLACK) score.black += 1;
      if (piece === WHITE) score.white += 1;
      return score;
    },
    { black: 0, white: 0 },
  );
}

export function hasAnyMove(board, player) {
  return getLegalMoves(board, player).length > 0;
}

export function isGameOver(board, currentPlayer) {
  const score = countPieces(board);

  return score.black <= 1
    || score.white <= 1
    || !hasAnyMove(board, currentPlayer);
}

export function winnerOf(board, currentPlayer) {
  const score = countPieces(board);

  if (score.black <= 1 && score.white <= 1) return EMPTY;
  if (score.black <= 1) return WHITE;
  if (score.white <= 1) return BLACK;
  if (!hasAnyMove(board, currentPlayer)) return opponentOf(currentPlayer);
  return EMPTY;
}

function createMove(board, fromIndex, toIndex) {
  const from = cellAt(fromIndex);
  const to = cellAt(toIndex);
  const nextBoard = [...board];
  const piece = nextBoard[fromIndex];

  nextBoard[fromIndex] = EMPTY;
  nextBoard[toIndex] = piece;

  return {
    fromIndex,
    fromX: from.x,
    fromY: from.y,
    toIndex,
    toX: to.x,
    toY: to.y,
    capturedIndexes: findCaptures(nextBoard, pieceOwner(piece), toIndex),
  };
}

function findCaptures(board, player, originIndex) {
  const opponent = opponentOf(player);
  const origin = cellAt(originIndex);
  const captured = [];

  DIRECTIONS.forEach(([dx, dy]) => {
    const line = [];
    let x = origin.x + dx;
    let y = origin.y + dy;

    while (insideBoard(x, y) && pieceOwner(board[indexOf(x, y)]) === opponent) {
      line.push(indexOf(x, y));
      x += dx;
      y += dy;
    }

    if (
      line.length > 0
      && insideBoard(x, y)
      && pieceOwner(board[indexOf(x, y)]) === player
    ) {
      captured.push(...line);
    }
  });

  return captured;
}
