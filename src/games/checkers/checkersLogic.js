export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;
export const BLACK_KING = 3;
export const WHITE_KING = 4;

const BLACK_KING_ROW = 0;
const WHITE_KING_ROW = 7;

export function createInitialBoard() {
  const board = Array.from({ length: 64 }, () => EMPTY);

  for (let y = 0; y < 3; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      if (isPlayableSquare(x, y)) {
        board[indexOf(x, y)] = WHITE;
      }
    }
  }

  for (let y = 5; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      if (isPlayableSquare(x, y)) {
        board[indexOf(x, y)] = BLACK;
      }
    }
  }

  return board;
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

export function isPlayableSquare(x, y) {
  return (x + y) % 2 === 1;
}

export function opponentOf(player) {
  return player === BLACK ? WHITE : BLACK;
}

export function playerName(player) {
  return player === BLACK ? 'Black' : 'White';
}

export function pieceOwner(piece) {
  if (piece === BLACK || piece === BLACK_KING) return BLACK;
  if (piece === WHITE || piece === WHITE_KING) return WHITE;
  return EMPTY;
}

export function isKing(piece) {
  return piece === BLACK_KING || piece === WHITE_KING;
}

export function getLegalMoves(board, player, forcedFrom = null) {
  const captures = getCaptureMoves(board, player, forcedFrom);

  if (captures.length > 0 || forcedFrom) {
    return captures;
  }

  return getSimpleMoves(board, player);
}

export function getCaptureMoves(board, player, forcedFrom = null) {
  const moves = [];
  const indexes = forcedFrom !== null && forcedFrom !== undefined
    ? [forcedFrom]
    : board.map((_, index) => index);

  indexes.forEach((fromIndex) => {
    const piece = board[fromIndex];

    if (pieceOwner(piece) !== player) {
      return;
    }

    const { x, y } = cellAt(fromIndex);

    moveDirections(piece, player).forEach(([dx, dy]) => {
      const midX = x + dx;
      const midY = y + dy;
      const toX = x + dx * 2;
      const toY = y + dy * 2;

      if (!insideBoard(toX, toY) || !insideBoard(midX, midY)) {
        return;
      }

      const middleIndex = indexOf(midX, midY);
      const toIndex = indexOf(toX, toY);

      if (
        pieceOwner(board[middleIndex]) === opponentOf(player)
        && board[toIndex] === EMPTY
      ) {
        moves.push(createMove(board, fromIndex, toIndex, middleIndex));
      }
    });
  });

  return moves;
}

export function getSimpleMoves(board, player) {
  const moves = [];

  board.forEach((piece, fromIndex) => {
    if (pieceOwner(piece) !== player) {
      return;
    }

    const { x, y } = cellAt(fromIndex);

    moveDirections(piece, player).forEach(([dx, dy]) => {
      const toX = x + dx;
      const toY = y + dy;

      if (!insideBoard(toX, toY)) {
        return;
      }

      const toIndex = indexOf(toX, toY);

      if (board[toIndex] === EMPTY) {
        moves.push(createMove(board, fromIndex, toIndex));
      }
    });
  });

  return moves;
}

export function applyMove(board, move) {
  const nextBoard = [...board];
  const piece = nextBoard[move.fromIndex];
  const promotedPiece = promoted(piece, move.toY);

  nextBoard[move.fromIndex] = EMPTY;
  nextBoard[move.toIndex] = promotedPiece;

  if (move.capturedIndex !== null && move.capturedIndex !== undefined) {
    nextBoard[move.capturedIndex] = EMPTY;
  }

  return {
    board: nextBoard,
    captured: move.capturedIndex !== null && move.capturedIndex !== undefined,
    promoted: promotedPiece !== piece,
  };
}

export function getTurnSequences(board, player) {
  const captures = getCaptureMoves(board, player);

  if (captures.length > 0) {
    return captures.flatMap((move) => expandCaptureSequence(board, player, move));
  }

  return getSimpleMoves(board, player).map((move) => [move]);
}

export function countPieces(board) {
  return board.reduce(
    (score, piece) => {
      if (pieceOwner(piece) === BLACK) {
        score.black += 1;
        if (isKing(piece)) score.blackKings += 1;
      }

      if (pieceOwner(piece) === WHITE) {
        score.white += 1;
        if (isKing(piece)) score.whiteKings += 1;
      }

      return score;
    },
    { black: 0, white: 0, blackKings: 0, whiteKings: 0 },
  );
}

export function hasAnyMove(board, player) {
  return getLegalMoves(board, player).length > 0;
}

export function isGameOver(board, currentPlayer) {
  const score = countPieces(board);

  return score.black === 0
    || score.white === 0
    || !hasAnyMove(board, currentPlayer);
}

export function winnerOf(board, currentPlayer) {
  const score = countPieces(board);

  if (score.black === 0) return WHITE;
  if (score.white === 0) return BLACK;
  if (!hasAnyMove(board, currentPlayer)) return opponentOf(currentPlayer);
  return EMPTY;
}

function expandCaptureSequence(board, player, move) {
  const result = applyMove(board, move);

  if (result.promoted) {
    return [[move]];
  }

  const continuations = getCaptureMoves(result.board, player, move.toIndex);

  if (continuations.length === 0) {
    return [[move]];
  }

  return continuations.flatMap((nextMove) => (
    expandCaptureSequence(result.board, player, nextMove)
      .map((sequence) => [move, ...sequence])
  ));
}

function createMove(board, fromIndex, toIndex, capturedIndex = null) {
  const from = cellAt(fromIndex);
  const to = cellAt(toIndex);
  const piece = board[fromIndex];

  return {
    fromIndex,
    fromX: from.x,
    fromY: from.y,
    toIndex,
    toX: to.x,
    toY: to.y,
    capturedIndex,
    isCapture: capturedIndex !== null && capturedIndex !== undefined,
    promotes: promoted(piece, to.y) !== piece,
  };
}

function moveDirections(piece, player) {
  if (isKing(piece)) {
    return [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ];
  }

  return player === BLACK
    ? [[-1, -1], [1, -1]]
    : [[-1, 1], [1, 1]];
}

function promoted(piece, y) {
  if (piece === BLACK && y === BLACK_KING_ROW) {
    return BLACK_KING;
  }

  if (piece === WHITE && y === WHITE_KING_ROW) {
    return WHITE_KING;
  }

  return piece;
}
