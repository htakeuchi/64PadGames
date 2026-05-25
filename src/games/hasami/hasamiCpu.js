import {
  BLACK,
  EMPTY,
  WHITE,
  applyMove,
  cellAt,
  countPieces,
  getLegalMoves,
  isGameOver,
  opponentOf,
  pieceOwner,
  winnerOf,
} from './hasamiLogic.js';

const DEPTH_BY_DIFFICULTY = {
  easy: 1,
  normal: 2,
  hard: 3,
};
const MAX_BRANCH = 36;
const WIN_SCORE = 100000;

export function chooseCpuMove(board, player, difficulty) {
  const legalMoves = getLegalMoves(board, player);

  if (legalMoves.length === 0) {
    return null;
  }

  if (difficulty === 'easy' && Math.random() < 0.4) {
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  const depth = DEPTH_BY_DIFFICULTY[difficulty] ?? DEPTH_BY_DIFFICULTY.normal;
  const orderedMoves = orderMoves(legalMoves);
  let bestMove = orderedMoves[0];
  let bestScore = -Infinity;

  orderedMoves.forEach((move) => {
    const result = applyMove(board, move);
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
  if (isGameOver(board, currentPlayer)) {
    const winner = winnerOf(board, currentPlayer);
    if (winner === EMPTY) return 0;
    return winner === rootPlayer ? WIN_SCORE + depth : -WIN_SCORE - depth;
  }

  if (depth <= 0) {
    return evaluateBoard(board, rootPlayer);
  }

  const maximizing = currentPlayer === rootPlayer;
  const moves = orderMoves(getLegalMoves(board, currentPlayer)).slice(0, MAX_BRANCH);

  if (maximizing) {
    let value = -Infinity;

    for (const move of moves) {
      const result = applyMove(board, move);
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

  for (const move of moves) {
    const result = applyMove(board, move);
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
  const material = (rootPieces - opponentPieces) * 150;
  const captureThreats = (
    capturePotential(board, rootPlayer) - capturePotential(board, opponent)
  ) * 18;
  const mobility = (
    getLegalMoves(board, rootPlayer).length - getLegalMoves(board, opponent).length
  ) * 2;
  const position = board.reduce((total, piece, index) => {
    const owner = pieceOwner(piece);
    if (owner === EMPTY) return total;

    const sign = owner === rootPlayer ? 1 : -1;
    return total + sign * positionValue(piece, index);
  }, 0);

  return material + captureThreats + mobility + position;
}

function capturePotential(board, player) {
  return getLegalMoves(board, player).reduce(
    (total, move) => total + move.capturedIndexes.length,
    0,
  );
}

function positionValue(piece, index) {
  const { x, y } = cellAt(index);
  const centerDistance = Math.abs(x - 3.5) + Math.abs(y - 3.5);
  const center = 12 - centerDistance * 2;
  const homeProgress = piece === BLACK ? 7 - y : y;

  return center + homeProgress;
}

function orderMoves(moves) {
  return [...moves].sort((a, b) => movePriority(b) - movePriority(a));
}

function movePriority(move) {
  const distance = Math.abs(move.toX - move.fromX) + Math.abs(move.toY - move.fromY);

  return move.capturedIndexes.length * 1000
    + distance
    + (move.toX > 1 && move.toX < 6 ? 8 : 0)
    + (move.toY > 1 && move.toY < 6 ? 8 : 0);
}
