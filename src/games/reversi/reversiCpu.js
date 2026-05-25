import {
  BLACK,
  WHITE,
  applyMove,
  countPieces,
  getLegalMoves,
  indexOf,
  opponentOf,
} from './reversiLogic.js';

const POSITION_WEIGHTS = [
  120, -20, 20, 5, 5, 20, -20, 120,
  -20, -40, -5, -5, -5, -5, -40, -20,
  20, -5, 15, 3, 3, 15, -5, 20,
  5, -5, 3, 3, 3, 3, -5, 5,
  5, -5, 3, 3, 3, 3, -5, 5,
  20, -5, 15, 3, 3, 15, -5, 20,
  -20, -40, -5, -5, -5, -5, -40, -20,
  120, -20, 20, 5, 5, 20, -20, 120,
];

const DEPTH_BY_DIFFICULTY = {
  easy: 1,
  normal: 3,
  hard: 5,
};

export function chooseCpuMove(board, player, difficulty) {
  const legalMoves = getLegalMoves(board, player);

  if (legalMoves.length === 0) {
    return null;
  }

  if (difficulty === 'easy' && Math.random() < 0.35) {
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  const depth = DEPTH_BY_DIFFICULTY[difficulty] ?? DEPTH_BY_DIFFICULTY.normal;
  const orderedMoves = orderMoves(legalMoves);
  let bestMove = orderedMoves[0];
  let bestScore = -Infinity;

  orderedMoves.forEach((move) => {
    const result = applyMove(board, move, player);
    const score = search(
      result.board,
      opponentOf(player),
      player,
      depth - 1,
      -Infinity,
      Infinity,
    );

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  });

  return bestMove;
}

function search(board, currentPlayer, rootPlayer, depth, alpha, beta) {
  const legalMoves = getLegalMoves(board, currentPlayer);
  const opponentMoves = getLegalMoves(board, opponentOf(currentPlayer));

  if (depth <= 0 || (legalMoves.length === 0 && opponentMoves.length === 0)) {
    return evaluateBoard(board, rootPlayer);
  }

  if (legalMoves.length === 0) {
    return search(board, opponentOf(currentPlayer), rootPlayer, depth - 1, alpha, beta);
  }

  const maximizing = currentPlayer === rootPlayer;
  const orderedMoves = orderMoves(legalMoves);

  if (maximizing) {
    let value = -Infinity;

    for (const move of orderedMoves) {
      const result = applyMove(board, move, currentPlayer);
      value = Math.max(
        value,
        search(result.board, opponentOf(currentPlayer), rootPlayer, depth - 1, alpha, beta),
      );
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }

    return value;
  }

  let value = Infinity;

  for (const move of orderedMoves) {
    const result = applyMove(board, move, currentPlayer);
    value = Math.min(
      value,
      search(result.board, opponentOf(currentPlayer), rootPlayer, depth - 1, alpha, beta),
    );
    beta = Math.min(beta, value);
    if (alpha >= beta) break;
  }

  return value;
}

function evaluateBoard(board, rootPlayer) {
  const opponent = opponentOf(rootPlayer);
  const score = countPieces(board);
  const rootPieces = rootPlayer === BLACK ? score.black : score.white;
  const opponentPieces = opponent === BLACK ? score.black : score.white;
  const material = (rootPieces - opponentPieces) * 2;
  const mobility = (
    getLegalMoves(board, rootPlayer).length - getLegalMoves(board, opponent).length
  ) * 9;
  const position = board.reduce((total, cell, index) => {
    if (cell === rootPlayer) return total + POSITION_WEIGHTS[index];
    if (cell === opponent) return total - POSITION_WEIGHTS[index];
    return total;
  }, 0);

  return material + mobility + position;
}

function orderMoves(moves) {
  return [...moves].sort((a, b) => movePriority(b) - movePriority(a));
}

function movePriority(move) {
  const isCorner = (
    (move.x === 0 || move.x === 7)
    && (move.y === 0 || move.y === 7)
  );
  const isEdge = move.x === 0 || move.x === 7 || move.y === 0 || move.y === 7;

  return (isCorner ? 1000 : 0)
    + (isEdge ? 80 : 0)
    + POSITION_WEIGHTS[indexOf(move.x, move.y)]
    + move.flips.length;
}

