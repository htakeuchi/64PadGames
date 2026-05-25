import { CheckersGame } from './checkers/CheckersGame.js';
import { BlockLineGame } from './blockline/BlockLineGame.js';
import { Connect4Game } from './connect4/Connect4Game.js';
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
    rules: [
      'Place a disc on a legal square to sandwich CPU discs in a straight line.',
      'Sandwiched discs flip to your color. If you have no legal move, pass.',
      'The game ends when neither side can move; the higher disc count wins.',
    ],
    create: (context) => new ReversiGame(context),
  },
  {
    id: 'connect4',
    title: 'Connect 4',
    summary: 'Drop discs by column and race the CPU to connect four.',
    rules: [
      'Tap any pad in one of the seven columns to drop your disc.',
      'The disc falls to the lowest open space in that column.',
      'Connect four horizontally, vertically, or diagonally before the CPU.',
    ],
    create: (context) => new Connect4Game(context),
  },
  {
    id: 'minesweeper',
    title: 'Minesweeper',
    summary: 'Tap to open, hold to flag, and read numbers as pad blinks.',
    rules: [
      'Tap closed pads to reveal safe cells. Hold a pad to flag a suspected mine.',
      'Numbers show how many mines touch that cell, using pad light patterns.',
      'Reveal every safe cell without opening a mine.',
    ],
    create: (context) => new MinesweeperGame(context),
  },
  {
    id: 'floodit',
    title: 'Flood-It',
    summary: 'Flood the full board with accessible colors before moves run out.',
    rules: [
      'Start from the corner region and choose colors to absorb matching neighbors.',
      'Each color choice uses one move when the move limit is enabled.',
      'Win by making the whole board one color before the move limit runs out.',
    ],
    create: (context) => new FloodItGame(context),
  },
  {
    id: 'simon',
    title: 'Simon',
    summary: 'Repeat a growing four-block light and sound pattern.',
    rules: [
      'Watch the four-color sequence, then tap the same pads in order.',
      'Each successful round adds one more step to the sequence.',
      'A wrong tap ends the run; keep the longest streak you can.',
    ],
    create: (context) => new SimonGame(context),
  },
  {
    id: 'samegame',
    title: 'SameGame',
    summary: 'Remove connected color groups and collapse the board.',
    rules: [
      'Tap a group of two or more touching blocks with the same color to remove it.',
      'Blocks fall downward, then empty columns collapse inward.',
      'Every board has at least one full-clear route; clear large groups for more points.',
    ],
    create: (context) => new SameGame(context),
  },
  {
    id: 'checkers',
    title: 'Checkers',
    summary: 'Select pieces, make jumps, and play CPU checkers with kings.',
    rules: [
      'Move diagonally on dark squares. Jump over CPU pieces to capture them.',
      'Multiple jumps continue in the same turn when available.',
      'Reach the far side to crown a king; capture all CPU pieces or block their moves.',
    ],
    create: (context) => new CheckersGame(context),
  },
  {
    id: 'hasami',
    title: 'Hasami Shogi',
    summary: 'Slide pieces in straight lines and capture by sandwiching the CPU.',
    rules: [
      'Slide one of your pieces any clear distance horizontally or vertically.',
      'Capture CPU pieces by trapping them between two of your pieces or an edge.',
      'Win by reducing the CPU to too few pieces to continue.',
    ],
    create: (context) => new HasamiShogiGame(context),
  },
  {
    id: 'lightsout',
    title: 'Lights Out',
    summary: 'Turn off every light on board sizes from 2x2 through 8x8.',
    rules: [
      'Tap a pad to toggle that light and its orthogonal neighbors.',
      'Use the board-size control to practice from small boards up to 8x8.',
      'Win when every light on the board is off.',
    ],
    create: (context) => new LightsOutGame(context),
  },
  {
    id: 'match3',
    title: 'Match 3',
    summary: 'Swap adjacent panels, clear the target color, and beat the move limit.',
    rules: [
      'Select a tile, then swap it with an adjacent tile to create a line of three or more.',
      'Matched tiles clear, new tiles fall in, and chain reactions can follow.',
      'Clear the requested target color before the move limit runs out.',
    ],
    create: (context) => new Match3Game(context),
  },
  {
    id: 'blockline',
    title: 'Block Line',
    summary: 'Slide width 1-3 blocks, clear full lines, and survive the rising board.',
    rules: [
      'Select a horizontal block, then move it left or right through any open gap.',
      'Gravity and full-line clears resolve after each move, including chains.',
      'A new row rises from the bottom after each turn; survive and score as long as possible.',
    ],
    create: (context) => new BlockLineGame(context),
  },
];
