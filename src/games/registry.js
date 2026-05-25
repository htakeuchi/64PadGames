import { CheckersGame } from './checkers/CheckersGame.js';
import { FloodItGame } from './floodit/FloodItGame.js';
import { HasamiShogiGame } from './hasami/HasamiShogiGame.js';
import { LightsOutGame } from './lightsout/LightsOutGame.js';
import { Match3Game } from './match3/Match3Game.js';
import { MinesweeperGame } from './minesweeper/MinesweeperGame.js';
import { ReversiGame } from './reversi/ReversiGame.js';
import { SameGame } from './samegame/SameGame.js';
import { SimonGame } from './simon/SimonGame.js';

export const gameRegistry = [
  {
    id: 'reversi',
    title: 'Reversi',
    summary: 'Play against the CPU on an 8x8 board mirrored to the Launchpad.',
    create: (context) => new ReversiGame(context),
  },
  {
    id: 'minesweeper',
    title: 'Minesweeper',
    summary: 'Tap to open, hold to flag, and read numbers as pad blinks.',
    create: (context) => new MinesweeperGame(context),
  },
  {
    id: 'floodit',
    title: 'Flood-It',
    summary: 'Flood the full board with accessible colors before moves run out.',
    create: (context) => new FloodItGame(context),
  },
  {
    id: 'simon',
    title: 'Simon',
    summary: 'Repeat a growing four-block light and sound pattern.',
    create: (context) => new SimonGame(context),
  },
  {
    id: 'samegame',
    title: 'SameGame',
    summary: 'Remove connected color groups and collapse the board.',
    create: (context) => new SameGame(context),
  },
  {
    id: 'checkers',
    title: 'Checkers',
    summary: 'Select pieces, make jumps, and play CPU checkers with kings.',
    create: (context) => new CheckersGame(context),
  },
  {
    id: 'hasami',
    title: 'Hasami Shogi',
    summary: 'Slide pieces in straight lines and capture by sandwiching the CPU.',
    create: (context) => new HasamiShogiGame(context),
  },
  {
    id: 'lightsout',
    title: 'Lights Out',
    summary: 'Turn off every light on board sizes from 2x2 through 8x8.',
    create: (context) => new LightsOutGame(context),
  },
  {
    id: 'match3',
    title: 'Match 3',
    summary: 'Swap adjacent panels, clear the target color, and beat the move limit.',
    create: (context) => new Match3Game(context),
  },
];
