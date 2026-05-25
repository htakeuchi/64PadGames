import { FloodItGame } from './floodit/FloodItGame.js';
import { MinesweeperGame } from './minesweeper/MinesweeperGame.js';
import { ReversiGame } from './reversi/ReversiGame.js';
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
];
