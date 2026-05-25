import {
  BLACK,
  EMPTY,
  WHITE,
  applyMove,
  countPieces,
  DIRECTIONS,
  getLegalMoves,
  indexOf,
  opponentOf,
} from './reversiLogic.js';

const BOARD_SIZE = 8;
const TERMINAL_SCORE = 100000;

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

const CORNERS = [
  indexOf(0, 0),
  indexOf(7, 0),
  indexOf(0, 7),
  indexOf(7, 7),
];

const CORNER_ADJACENCY = [
  {
    corner: indexOf(0, 0),
    danger: [indexOf(1, 0), indexOf(0, 1), indexOf(1, 1)],
  },
  {
    corner: indexOf(7, 0),
    danger: [indexOf(6, 0), indexOf(7, 1), indexOf(6, 1)],
  },
  {
    corner: indexOf(0, 7),
    danger: [indexOf(1, 7), indexOf(0, 6), indexOf(1, 6)],
  },
  {
    corner: indexOf(7, 7),
    danger: [indexOf(6, 7), indexOf(7, 6), indexOf(6, 6)],
  },
];

const DIFFICULTY_PROFILE = {
  easy: {
    depth: 1,
    exactEmptyCount: 0,
    lateDepth: 2,
    lateDepthEmptyCount: 10,
    randomMoveRate: 0.32,
    candidateWindow: 150,
  },
  normal: {
    depth: 3,
    exactEmptyCount: 8,
    lateDepth: 5,
    lateDepthEmptyCount: 14,
    randomMoveRate: 0.04,
    candidateWindow: 35,
  },
  hard: {
    depth: 5,
    exactEmptyCount: 10,
    lateDepth: 7,
    lateDepthEmptyCount: 16,
    randomMoveRate: 0,
    candidateWindow: 0,
  },
};

export function chooseCpuMove(board, player, difficulty) {
  const legalMoves = getLegalMoves(board, player);

  if (legalMoves.length === 0) {
    return null;
  }

  const profile = DIFFICULTY_PROFILE[difficulty] ?? DIFFICULTY_PROFILE.normal;

  if (profile.randomMoveRate > 0 && Math.random() < profile.randomMoveRate) {
    return legalMoves[Math.floor(Math.random() * legalMoves.length)];
  }

  const depth = searchDepthFor(board, profile);
  const orderedMoves = orderMoves(board, legalMoves, player);
  const scoredMoves = [];

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

    scoredMoves.push({ move, score });
  });

  return selectMove(scoredMoves, profile);
}

function search(board, currentPlayer, rootPlayer, depth, alpha, beta) {
  const legalMoves = getLegalMoves(board, currentPlayer);
  const opponentMoves = getLegalMoves(board, opponentOf(currentPlayer));

  if (legalMoves.length === 0 && opponentMoves.length === 0) {
    return evaluateTerminalBoard(board, rootPlayer);
  }

  if (depth <= 0) {
    return evaluateBoard(board, rootPlayer);
  }

  if (legalMoves.length === 0) {
    return search(board, opponentOf(currentPlayer), rootPlayer, depth - 1, alpha, beta);
  }

  const maximizing = currentPlayer === rootPlayer;
  const orderedMoves = orderMoves(board, legalMoves, currentPlayer);

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
  const occupiedCount = rootPieces + opponentPieces;
  const emptyCount = board.length - occupiedCount;
  const phaseWeights = evaluationWeightsFor(emptyCount);
  const material = ratioScore(rootPieces - opponentPieces, occupiedCount);
  const rootMobility = getLegalMoves(board, rootPlayer).length;
  const opponentMobility = getLegalMoves(board, opponent).length;
  const mobility = ratioScore(rootMobility - opponentMobility, rootMobility + opponentMobility);
  const potentialMobility = ratioScore(
    countPotentialMobility(board, rootPlayer) - countPotentialMobility(board, opponent),
    countPotentialMobility(board, rootPlayer) + countPotentialMobility(board, opponent),
  );
  const corners = ratioScore(
    countCorners(board, rootPlayer) - countCorners(board, opponent),
    CORNERS.length,
  );
  const cornerDanger = (
    countCornerDanger(board, opponent) - countCornerDanger(board, rootPlayer)
  ) * 25;
  const frontier = ratioScore(
    countFrontierDiscs(board, opponent) - countFrontierDiscs(board, rootPlayer),
    occupiedCount,
  );
  const stability = ratioScore(
    countStableEdgeDiscs(board, rootPlayer) - countStableEdgeDiscs(board, opponent),
    occupiedCount,
  );
  const position = board.reduce((total, cell, index) => (
    total + cellScore(cell, rootPlayer, opponent, index)
  ), 0);
  const parity = emptyCount % 2 === 0 ? -20 : 20;

  return material * phaseWeights.material
    + mobility * phaseWeights.mobility
    + potentialMobility * phaseWeights.potentialMobility
    + corners * phaseWeights.corners
    + cornerDanger * phaseWeights.cornerDanger
    + frontier * phaseWeights.frontier
    + stability * phaseWeights.stability
    + position * phaseWeights.position
    + parity * phaseWeights.parity;
}

function evaluateTerminalBoard(board, rootPlayer) {
  const score = countPieces(board);
  const rootPieces = rootPlayer === BLACK ? score.black : score.white;
  const opponentPieces = rootPlayer === BLACK ? score.white : score.black;
  const difference = rootPieces - opponentPieces;

  if (difference > 0) return TERMINAL_SCORE + difference;
  if (difference < 0) return -TERMINAL_SCORE + difference;
  return 0;
}

function evaluationWeightsFor(emptyCount) {
  if (emptyCount > 44) {
    return {
      cornerDanger: 3.5,
      corners: 7,
      frontier: 2.6,
      material: -0.15,
      mobility: 4.4,
      parity: 0,
      position: 0.18,
      potentialMobility: 1.7,
      stability: 1.1,
    };
  }

  if (emptyCount > 16) {
    return {
      cornerDanger: 2.8,
      corners: 8.5,
      frontier: 2.1,
      material: 0.35,
      mobility: 3.5,
      parity: 0.15,
      position: 0.16,
      potentialMobility: 1,
      stability: 1.7,
    };
  }

  return {
    cornerDanger: 1.4,
    corners: 7,
    frontier: 0.8,
    material: 3.6,
    mobility: 1.2,
    parity: 0.8,
    position: 0.06,
    potentialMobility: 0.3,
    stability: 2.5,
  };
}

function orderMoves(board, moves, player) {
  return [...moves].sort((a, b) => movePriority(board, b, player) - movePriority(board, a, player));
}

function movePriority(board, move, player) {
  const isCorner = (
    (move.x === 0 || move.x === 7)
    && (move.y === 0 || move.y === 7)
  );
  const isEdge = move.x === 0 || move.x === 7 || move.y === 0 || move.y === 7;

  return (isCorner ? 1000 : 0)
    + (isEdge ? 80 : 0)
    - (isDangerSquareNearEmptyCorner(board, move) ? 700 : 0)
    + POSITION_WEIGHTS[indexOf(move.x, move.y)]
    + move.flips.length;
}

function selectMove(scoredMoves, profile) {
  const sortedMoves = [...scoredMoves].sort((a, b) => b.score - a.score);

  if (profile.candidateWindow <= 0) {
    return sortedMoves[0].move;
  }

  const bestScore = sortedMoves[0].score;
  const candidates = sortedMoves.filter((entry) => (
    entry.score >= bestScore - profile.candidateWindow
  ));

  return candidates[Math.floor(Math.random() * candidates.length)].move;
}

function searchDepthFor(board, profile) {
  const emptyCount = countEmptyCells(board);

  if (emptyCount <= profile.exactEmptyCount) {
    return emptyCount + 1;
  }

  if (emptyCount <= profile.lateDepthEmptyCount) {
    return Math.min(emptyCount + 1, profile.lateDepth);
  }

  return Math.min(emptyCount + 1, profile.depth);
}

function countEmptyCells(board) {
  return board.reduce((total, cell) => total + (cell === EMPTY ? 1 : 0), 0);
}

function ratioScore(difference, total) {
  return total > 0 ? (100 * difference) / total : 0;
}

function cellScore(cell, rootPlayer, opponent, index) {
  if (cell === rootPlayer) return POSITION_WEIGHTS[index];
  if (cell === opponent) return -POSITION_WEIGHTS[index];
  return 0;
}

function countCorners(board, player) {
  return CORNERS.reduce((total, index) => total + (board[index] === player ? 1 : 0), 0);
}

function countCornerDanger(board, player) {
  return CORNER_ADJACENCY.reduce((total, { corner, danger }) => {
    if (board[corner] !== EMPTY) {
      return total;
    }

    return total + danger.filter((index) => board[index] === player).length;
  }, 0);
}

function countFrontierDiscs(board, player) {
  return board.reduce((total, cell, index) => {
    if (cell !== player) {
      return total;
    }

    return total + (hasEmptyNeighbor(board, index) ? 1 : 0);
  }, 0);
}

function countPotentialMobility(board, player) {
  const opponent = opponentOf(player);

  return board.reduce((total, cell, index) => {
    if (cell !== EMPTY) {
      return total;
    }

    return total + (hasNeighborOf(board, index, opponent) ? 1 : 0);
  }, 0);
}

function countStableEdgeDiscs(board, player) {
  const stableDiscs = new Set();

  addStableLine(board, player, stableDiscs, 0, 0, 1, 0);
  addStableLine(board, player, stableDiscs, 0, 0, 0, 1);
  addStableLine(board, player, stableDiscs, 7, 0, -1, 0);
  addStableLine(board, player, stableDiscs, 7, 0, 0, 1);
  addStableLine(board, player, stableDiscs, 0, 7, 1, 0);
  addStableLine(board, player, stableDiscs, 0, 7, 0, -1);
  addStableLine(board, player, stableDiscs, 7, 7, -1, 0);
  addStableLine(board, player, stableDiscs, 7, 7, 0, -1);

  return stableDiscs.size;
}

function addStableLine(board, player, stableDiscs, startX, startY, dx, dy) {
  if (board[indexOf(startX, startY)] !== player) {
    return;
  }

  let x = startX;
  let y = startY;

  while (x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE) {
    const index = indexOf(x, y);

    if (board[index] !== player) {
      return;
    }

    stableDiscs.add(index);
    x += dx;
    y += dy;
  }
}

function hasEmptyNeighbor(board, index) {
  return hasNeighborOf(board, index, EMPTY);
}

function hasNeighborOf(board, index, targetCell) {
  const x = index % BOARD_SIZE;
  const y = Math.floor(index / BOARD_SIZE);

  return DIRECTIONS.some(([dx, dy]) => {
    const neighborX = x + dx;
    const neighborY = y + dy;

    return neighborX >= 0
      && neighborX < BOARD_SIZE
      && neighborY >= 0
      && neighborY < BOARD_SIZE
      && board[indexOf(neighborX, neighborY)] === targetCell;
  });
}

function isDangerSquareNearEmptyCorner(board, move) {
  const moveIndex = indexOf(move.x, move.y);

  return CORNER_ADJACENCY.some(({ corner, danger }) => (
    board[corner] === EMPTY && danger.includes(moveIndex)
  ));
}
