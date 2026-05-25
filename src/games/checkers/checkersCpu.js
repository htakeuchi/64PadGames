import {
  BLACK,
  BLACK_KING,
  EMPTY,
  WHITE,
  WHITE_KING,
  applyMove,
  cellAt,
  getLegalMoves,
  getTurnSequences,
  isGameOver,
  opponentOf,
  pieceOwner,
  winnerOf,
} from './checkersLogic.js';

const DEPTH_BY_DIFFICULTY = {
  easy: 1,
  normal: 3,
  hard: 5,
};

const WIN_SCORE = 100000;

export function chooseCpuSequence(board, player, difficulty) {
  const sequences = getTurnSequences(board, player);

  if (sequences.length === 0) {
    return null;
  }

  if (difficulty === 'easy' && Math.random() < 0.4) {
    return sequences[Math.floor(Math.random() * sequences.length)];
  }

  const depth = DEPTH_BY_DIFFICULTY[difficulty] ?? DEPTH_BY_DIFFICULTY.normal;
  const orderedSequences = orderSequences(sequences);
  let bestSequence = orderedSequences[0];
  let bestScore = -Infinity;

  orderedSequences.forEach((sequence) => {
    const nextBoard = applySequence(board, sequence);
    const score = search(
      nextBoard,
      opponentOf(player),
      player,
      depth - 1,
      -Infinity,
      Infinity,
    );

    if (score > bestScore) {
      bestScore = score;
      bestSequence = sequence;
    }
  });

  return bestSequence;
}

function search(board, currentPlayer, rootPlayer, depth, alpha, beta) {
  if (isGameOver(board, currentPlayer)) {
    const winner = winnerOf(board, currentPlayer);
    return winner === rootPlayer ? WIN_SCORE + depth : -WIN_SCORE - depth;
  }

  if (depth <= 0) {
    return evaluateBoard(board, rootPlayer);
  }

  const maximizing = currentPlayer === rootPlayer;
  const sequences = orderSequences(getTurnSequences(board, currentPlayer));

  if (maximizing) {
    let value = -Infinity;

    for (const sequence of sequences) {
      const nextBoard = applySequence(board, sequence);
      value = Math.max(
        value,
        search(nextBoard, opponentOf(currentPlayer), rootPlayer, depth - 1, alpha, beta),
      );
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }

    return value;
  }

  let value = Infinity;

  for (const sequence of sequences) {
    const nextBoard = applySequence(board, sequence);
    value = Math.min(
      value,
      search(nextBoard, opponentOf(currentPlayer), rootPlayer, depth - 1, alpha, beta),
    );
    beta = Math.min(beta, value);
    if (alpha >= beta) break;
  }

  return value;
}

function applySequence(board, sequence) {
  return sequence.reduce((currentBoard, move) => applyMove(currentBoard, move).board, board);
}

function evaluateBoard(board, rootPlayer) {
  const opponent = opponentOf(rootPlayer);
  const mobility = (
    getLegalMoves(board, rootPlayer).length - getLegalMoves(board, opponent).length
  ) * 9;
  const material = board.reduce((total, piece, index) => {
    const owner = pieceOwner(piece);

    if (owner === EMPTY) {
      return total;
    }

    const sign = owner === rootPlayer ? 1 : -1;
    return total + sign * pieceValue(piece, index, owner);
  }, 0);

  return material + mobility;
}

function pieceValue(piece, index, owner) {
  const { x, y } = cellAt(index);
  const centerDistance = Math.abs(x - 3.5) + Math.abs(y - 3.5);
  const centerBonus = 12 - centerDistance * 2;
  const isEdge = x === 0 || x === 7 || y === 0 || y === 7;

  if (piece === BLACK_KING || piece === WHITE_KING) {
    return 180 + centerBonus + (isEdge ? 6 : 0);
  }

  const advancement = owner === BLACK ? 7 - y : y;
  const backRowGuard = (owner === BLACK && y === 7) || (owner === WHITE && y === 0);

  return 100 + advancement * 8 + centerBonus + (backRowGuard ? 10 : 0);
}

function orderSequences(sequences) {
  return [...sequences].sort((a, b) => sequencePriority(b) - sequencePriority(a));
}

function sequencePriority(sequence) {
  return sequence.reduce((total, move) => (
    total
    + (move.isCapture ? 120 : 0)
    + (move.promotes ? 80 : 0)
    + (move.toX > 1 && move.toX < 6 ? 8 : 0)
    + (move.toY > 1 && move.toY < 6 ? 8 : 0)
  ), 0);
}
