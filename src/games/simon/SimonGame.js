import { LIGHT_EFFECT, PAD_LIGHT, emptyFrame } from '../../pad/PadLights.js';
import {
  SIMON_BLOCKS,
  SIMON_DIFFICULTY,
  blockAt,
  cellsForBlock,
  createSimonStep,
} from './simonLogic.js';

const START_DELAY_MS = 650;
const NEXT_ROUND_DELAY_MS = 780;
const MISS_FLASH_MS = 150;

export class SimonGame {
  constructor({ pad, audio, onChange }) {
    this.pad = pad;
    this.audio = audio;
    this.onChange = onChange;
    this.animations = null;
    this.difficulty = 'normal';
    this.config = SIMON_DIFFICULTY.normal;
    this.targetRounds = this.config.targetRounds;
    this.sequence = [];
    this.round = 0;
    this.bestRound = 0;
    this.inputIndex = 0;
    this.livesRemaining = this.config.lives;
    this.phase = 'ready';
    this.message = '';
    this.statusLabel = 'Ready';
    this.gameOver = false;
    this.awaitingNewGame = false;
    this.activeBlock = null;
    this.playbackId = 0;
    this.inputTimer = null;
    this.destroyed = false;
  }

  start(options = {}) {
    this.destroyed = false;
    this.difficulty = options.difficulty ?? this.difficulty;
    this.animations = options.animations ?? this.animations;
    this.applyDifficulty();
    this.restart();
  }

  restart() {
    if (this.destroyed) {
      return;
    }

    this.cancelTimers();
    this.animations?.cancel();
    this.sequence = [];
    this.round = 0;
    this.inputIndex = 0;
    this.livesRemaining = this.config.lives;
    this.phase = 'ready';
    this.message = 'Tap any pad to start.';
    this.statusLabel = 'Ready';
    this.gameOver = false;
    this.awaitingNewGame = false;
    this.activeBlock = null;
    this.render();
    this.notify();
  }

  setDifficulty(difficulty) {
    this.difficulty = difficulty;
    this.applyDifficulty();
    this.restart();
  }

  destroy() {
    this.destroyed = true;
    this.cancelTimers();
    this.animations?.cancel();
    this.onChange = null;
  }

  async playDebugAnimation(result) {
    this.cancelTimers();
    this.animations?.cancel();

    if (result === 'win') {
      this.audio.win();
      await this.playClearSweep();
      await this.animations?.playWin();
    }

    if (result === 'lose') {
      this.audio.lose();
      await this.animations?.playLose();
    }

    if (result === 'draw') {
      this.audio.draw();
      await this.playClearSweep();
      await this.animations?.playDraw();
    }

    this.render();
  }

  async playDebugColors() {
    this.cancelTimers();
    this.animations?.cancel();
    this.audio.pass();
    await this.animations?.playColorList(this.getDebugColors());
    this.render();
  }

  getDebugColors() {
    return SIMON_BLOCKS.map((block) => ({
      id: `${block.id}-active`,
      midi: block.midi,
      css: block.css,
      label: block.label,
    }));
  }

  handlePadTap({ x, y }) {
    if (this.destroyed) {
      return;
    }

    if (this.gameOver) {
      if (this.awaitingNewGame) {
        this.restart();
        this.beginGame();
      }

      return;
    }

    if (this.phase === 'ready') {
      this.beginGame();
      return;
    }

    if (this.phase !== 'input') {
      return;
    }

    const selectedBlock = blockAt(x, y);
    const expectedBlock = this.sequence[this.inputIndex];

    if (selectedBlock !== expectedBlock) {
      this.handleMiss('Wrong pad.', selectedBlock);
      return;
    }

    this.handleCorrectInput(selectedBlock);
  }

  getState() {
    return {
      kind: 'simon',
      bestRound: this.bestRound,
      difficulty: this.difficulty,
      gameOver: this.gameOver,
      inputIndex: this.inputIndex,
      livesRemaining: this.livesRemaining,
      message: this.message,
      phase: this.phase,
      round: this.round,
      statusLabel: this.statusLabel,
      targetRounds: this.targetRounds,
    };
  }

  async handleCorrectInput(blockIndex) {
    if (this.destroyed) {
      return;
    }

    const playbackId = this.playbackId;
    const inputMs = this.config.playbackMs;

    this.clearInputTimer();
    this.phase = 'locked';
    this.inputIndex += 1;
    this.activeBlock = blockIndex;
    this.message = `${SIMON_BLOCKS[blockIndex].label}.`;
    this.audio.simonTone?.(blockIndex, inputMs / 1000);
    this.render();
    this.notify();
    await sleep(inputMs);

    if (this.destroyed || this.playbackId !== playbackId || this.gameOver) {
      return;
    }

    this.activeBlock = null;

    if (this.inputIndex >= this.sequence.length) {
      this.bestRound = Math.max(this.bestRound, this.round);

      if (this.round >= this.targetRounds) {
        this.finishWin();
        return;
      }

      this.phase = 'locked';
      this.message = 'Good. Next round.';
      this.statusLabel = 'Good';
      this.audio.pass();
      this.render();
      this.notify();
      this.queueNextRound(NEXT_ROUND_DELAY_MS);
      return;
    }

    this.phase = 'input';
    this.message = 'Repeat the pattern.';
    this.statusLabel = 'Repeat';
    this.render();
    this.notify();
    this.scheduleInputTimeout();
  }

  async handleMiss(reason, selectedBlock = null) {
    if (this.destroyed || this.phase !== 'input' || this.gameOver) {
      return;
    }

    const expectedBlock = this.sequence[this.inputIndex];

    this.clearInputTimer();
    this.playbackId += 1;
    this.livesRemaining -= 1;
    this.phase = 'locked';
    this.statusLabel = 'Miss';
    this.message = this.livesRemaining > 0
      ? `${reason} Try again.`
      : reason;
    this.audio.invalid();
    this.renderMiss(selectedBlock ?? expectedBlock);
    this.notify();
    await sleep(MISS_FLASH_MS);

    if (this.destroyed || this.gameOver) {
      return;
    }

    this.activeBlock = expectedBlock;
    this.render();
    await sleep(MISS_FLASH_MS);

    if (this.destroyed || this.gameOver) {
      return;
    }

    this.activeBlock = null;

    if (this.livesRemaining <= 0) {
      this.finishLose(reason);
      return;
    }

    this.render();
    this.notify();
    this.queueReplay(NEXT_ROUND_DELAY_MS);
  }

  beginGame() {
    if (this.destroyed || this.gameOver || this.phase !== 'ready') {
      return;
    }

    this.phase = 'locked';
    this.message = 'Starting.';
    this.statusLabel = 'Ready';
    this.render();
    this.notify();
    this.queueNextRound(START_DELAY_MS);
  }

  queueNextRound(delayMs) {
    const playbackId = ++this.playbackId;

    globalThis.setTimeout(() => {
      if (this.destroyed || this.playbackId !== playbackId || this.gameOver) {
        return;
      }

      this.sequence.push(createSimonStep());
      this.round = this.sequence.length;
      this.playSequence(playbackId);
    }, delayMs);
  }

  queueReplay(delayMs) {
    const playbackId = ++this.playbackId;

    globalThis.setTimeout(() => {
      if (this.destroyed || this.playbackId !== playbackId || this.gameOver) {
        return;
      }

      this.playSequence(playbackId);
    }, delayMs);
  }

  async playSequence(playbackId) {
    if (this.destroyed) {
      return;
    }

    this.clearInputTimer();
    this.phase = 'watch';
    this.statusLabel = 'Watch';
    this.message = 'Watch the pattern.';
    this.inputIndex = 0;
    this.activeBlock = null;
    this.render(true);
    this.notify();
    await sleep(this.config.gapMs);

    for (const blockIndex of this.sequence) {
      if (this.destroyed || this.playbackId !== playbackId || this.gameOver) {
        return;
      }

      this.activeBlock = blockIndex;
      this.audio.simonTone?.(blockIndex, this.config.playbackMs / 1000);
      this.render(true);
      await sleep(this.config.playbackMs);

      if (this.destroyed || this.playbackId !== playbackId || this.gameOver) {
        return;
      }

      this.activeBlock = null;
      this.render(true);
      await sleep(this.config.gapMs);
    }

    if (this.destroyed || this.playbackId !== playbackId || this.gameOver) {
      return;
    }

    this.phase = 'input';
    this.statusLabel = 'Repeat';
    this.message = 'Repeat the pattern.';
    this.render();
    this.notify();
    this.scheduleInputTimeout();
  }

  async finishWin() {
    if (this.destroyed || this.gameOver) {
      return;
    }

    this.clearInputTimer();
    this.gameOver = true;
    this.awaitingNewGame = false;
    this.phase = 'clear';
    this.statusLabel = 'Clear';
    this.message = 'Clear!';
    this.audio.win();
    this.activeBlock = null;
    this.render();
    this.notify();

    await this.playClearSweep();

    if (this.destroyed || !this.gameOver) {
      return;
    }

    await this.animations?.playWin();

    if (this.destroyed || !this.gameOver) {
      return;
    }

    this.awaitingNewGame = true;
    this.message = 'Clear! Press any pad for a new game.';
    this.render();
    this.notify();
  }

  async finishLose(reason) {
    if (this.destroyed || this.gameOver) {
      return;
    }

    this.clearInputTimer();
    this.gameOver = true;
    this.awaitingNewGame = false;
    this.phase = 'failed';
    this.statusLabel = 'Failed';
    this.message = reason;
    this.audio.lose();
    this.activeBlock = null;
    this.render();
    this.notify();

    await this.animations?.playLose();

    if (this.destroyed || !this.gameOver) {
      return;
    }

    this.awaitingNewGame = true;
    this.message = `${reason} Press any pad for a new game.`;
    this.render();
    this.notify();
  }

  async playClearSweep() {
    if (this.destroyed) {
      return;
    }

    const playbackId = ++this.playbackId;

    for (let cycle = 0; cycle < 2; cycle += 1) {
      for (let blockIndex = 0; blockIndex < SIMON_BLOCKS.length; blockIndex += 1) {
        if (this.destroyed || this.playbackId !== playbackId) {
          return;
        }

        this.activeBlock = blockIndex;
        this.render(true);
        this.audio.simonTone?.(blockIndex, 0.08);
        await sleep(95);
      }
    }

    this.activeBlock = null;
    this.render();
  }

  scheduleInputTimeout() {
    this.clearInputTimer();
    this.inputTimer = globalThis.setTimeout(() => {
      if (!this.destroyed) {
        this.handleMiss('Too slow.');
      }
    }, this.config.inputTimeoutMs);
  }

  clearInputTimer() {
    if (this.inputTimer) {
      globalThis.clearTimeout(this.inputTimer);
      this.inputTimer = null;
    }
  }

  cancelTimers() {
    this.clearInputTimer();
    this.playbackId += 1;
  }

  render(activeOnly = false) {
    if (this.destroyed) {
      return;
    }

    const frame = emptyFrame();

    SIMON_BLOCKS.forEach((block, blockIndex) => {
      const isActive = blockIndex === this.activeBlock;
      const light = isActive ? activeLight(block) : idleLight(block);

      cellsForBlock(blockIndex).forEach((cell) => {
        frame[cell.index] = activeOnly && !isActive ? PAD_LIGHT.off : light;
      });
    });

    this.pad.renderFrame(frame);
  }

  renderMiss(blockIndex) {
    if (this.destroyed) {
      return;
    }

    const frame = emptyFrame();

    SIMON_BLOCKS.forEach((block, candidateIndex) => {
      const light = candidateIndex === blockIndex
        ? { ...PAD_LIGHT.warning, effect: LIGHT_EFFECT.STATIC }
        : idleLight(block);

      cellsForBlock(candidateIndex).forEach((cell) => {
        frame[cell.index] = light;
      });
    });

    this.pad.renderFrame(frame);
  }

  notify() {
    if (this.destroyed) {
      return;
    }

    this.onChange?.(this.getState());
  }

  applyDifficulty() {
    this.config = SIMON_DIFFICULTY[this.difficulty] ?? SIMON_DIFFICULTY.normal;
    this.targetRounds = this.config.targetRounds;
  }
}

function activeLight(block) {
  return {
    id: `${block.id}-active`,
    midi: block.midi,
    css: block.css,
    label: block.label,
    effect: LIGHT_EFFECT.STATIC,
  };
}

function idleLight(block) {
  return {
    id: `${block.id}-idle`,
    midi: block.midi,
    css: block.idleCss,
    label: block.label,
    effect: LIGHT_EFFECT.STATIC,
  };
}

function sleep(ms) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}
