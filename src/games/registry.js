import { ReversiGame } from './reversi/ReversiGame.js';

export const gameRegistry = [
  {
    id: 'reversi',
    title: 'Reversi',
    summary: 'Play against the CPU on an 8x8 board mirrored to the Launchpad.',
    create: (context) => new ReversiGame(context),
  },
];
