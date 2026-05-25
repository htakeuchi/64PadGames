import { LIGHT_EFFECT, PAD_LIGHT, PAD_SIZE, emptyFrame } from './PadLights.js';

const FRAME_MS = 90;
const END_ANIMATION_SPEED = 2;
const FACE_HOLD_MS = 760;

export class PadAnimationPlayer {
  constructor(pad) {
    this.pad = pad;
    this.runId = 0;
  }

  cancel() {
    this.runId += 1;
  }

  async playWin() {
    const runId = this.nextRun();
    const center = 3.5;

    for (let radius = 0; radius <= 6; radius += 1) {
      const frame = emptyFrame();

      forEachCell((x, y) => {
        const distance = Math.hypot(x - center, y - center);

        if (distance <= radius) {
          frame[cellIndex(x, y)] = {
            ...PAD_LIGHT.player,
            effect: radius % 2 === 0 ? LIGHT_EFFECT.PULSE : LIGHT_EFFECT.STATIC,
          };
        }
      });

      if (!await this.showFrame(frame, endMs(FRAME_MS), runId)) return false;
    }

    if (!await this.flashAll(PAD_LIGHT.player, runId, 3, END_ANIMATION_SPEED)) return false;
    return this.showFace('win', runId);
  }

  async playLose() {
    const runId = this.nextRun();

    for (let ring = 0; ring < 4; ring += 1) {
      const frame = emptyFrame();

      forEachCell((x, y) => {
        const distanceToEdge = Math.min(x, y, PAD_SIZE - 1 - x, PAD_SIZE - 1 - y);

        if (distanceToEdge <= ring) {
          frame[cellIndex(x, y)] = PAD_LIGHT.opponent;
        }
      });

      if (!await this.showFrame(frame, endMs(140), runId)) return false;
    }

    if (!await this.flashAll(PAD_LIGHT.warning, runId, 2, END_ANIMATION_SPEED)) return false;
    return this.showFace('lose', runId);
  }

  async playDraw() {
    const runId = this.nextRun();

    for (let step = 0; step < 8; step += 1) {
      const frame = emptyFrame();

      forEachCell((x, y) => {
        frame[cellIndex(x, y)] = (x + y + step) % 2 === 0
          ? PAD_LIGHT.player
          : PAD_LIGHT.opponent;
      });

      if (!await this.showFrame(frame, endMs(110), runId)) return false;
    }

    return this.showFace('draw', runId);
  }

  async playPass() {
    const runId = this.nextRun();

    for (let diagonal = 0; diagonal <= 14; diagonal += 1) {
      const frame = emptyFrame();

      forEachCell((x, y) => {
        if (x + y === diagonal) {
          frame[cellIndex(x, y)] = {
            ...PAD_LIGHT.legal,
            effect: LIGHT_EFFECT.PULSE,
          };
        } else if (Math.abs(x + y - diagonal) === 1) {
          frame[cellIndex(x, y)] = PAD_LIGHT.dim;
        }
      });

      if (!await this.showFrame(frame, 45, runId)) return false;
    }

    return true;
  }

  async playExplosion(origin) {
    const runId = this.nextRun();
    const centerX = origin?.x ?? 3.5;
    const centerY = origin?.y ?? 3.5;

    for (let radius = 0; radius <= 8; radius += 1) {
      const frame = emptyFrame();

      forEachCell((x, y) => {
        const distance = Math.hypot(x - centerX, y - centerY);

        if (Math.abs(distance - radius) < 0.9) {
          frame[cellIndex(x, y)] = {
            ...PAD_LIGHT.warning,
            effect: LIGHT_EFFECT.FLASH,
          };
        } else if (distance < radius) {
          frame[cellIndex(x, y)] = radius % 2 === 0 ? PAD_LIGHT.last : PAD_LIGHT.opponent;
        }
      });

      if (!await this.showFrame(frame, 80, runId)) return false;
    }

    for (let flash = 0; flash < 3; flash += 1) {
      if (!await this.showFrame(fillFrame(PAD_LIGHT.warning), 90, runId)) return false;
      if (!await this.showFrame(fillFrame(PAD_LIGHT.last), 70, runId)) return false;
    }

    return true;
  }

  async playFloodSweep(lights) {
    const runId = this.nextRun();

    for (let step = 0; step < 12; step += 1) {
      const frame = emptyFrame();

      forEachCell((x, y) => {
        const colorIndex = (x + y + step) % lights.length;
        frame[cellIndex(x, y)] = lights[colorIndex];
      });

      if (!await this.showFrame(frame, 105, runId)) return false;
    }

    return true;
  }

  async playColorList(lights, duration = 2400) {
    const runId = this.nextRun();
    const palette = lights.length > 0 ? lights : [PAD_LIGHT.off];
    const frame = emptyFrame();

    palette.slice(0, PAD_SIZE).forEach((light, x) => {
      frame[cellIndex(x, 0)] = light;
    });

    return this.showFrame(frame, duration, runId);
  }

  nextRun() {
    this.runId += 1;
    return this.runId;
  }

  async showFace(result, runId) {
    const openFace = faceFrame(result);
    const blinkFace = faceFrame(result);

    if (!await this.showFrame(openFace, endMs(FACE_HOLD_MS), runId)) return false;
    if (!await this.showFrame(blinkFace, endMs(120), runId)) return false;
    if (!await this.showFrame(openFace, endMs(FACE_HOLD_MS), runId)) return false;

    return true;
  }

  async flashAll(light, runId, count, speed = 1) {
    for (let index = 0; index < count; index += 1) {
      if (!await this.showFrame(fillFrame(light), 95 * speed, runId)) return false;
      if (!await this.showFrame(emptyFrame(), 70 * speed, runId)) return false;
    }

    return true;
  }

  async showFrame(frame, duration, runId) {
    if (this.runId !== runId) {
      return false;
    }

    this.pad.renderFrame(frame);
    await sleep(duration);
    return this.runId === runId;
  }
}

function fillFrame(light) {
  return Array.from({ length: PAD_SIZE * PAD_SIZE }, () => light);
}

function faceFrame(result) {
  const frame = emptyFrame();
  const faceLight = result === 'win'
    ? PAD_LIGHT.legal
    : result === 'lose'
      ? PAD_LIGHT.warning
      : PAD_LIGHT.opponent;
  const patterns = {
    win: [
      '........',
      '........',
      '..#..#..',
      '........',
      '........',
      '.#....#.',
      '..####..',
      '........',
    ],
    lose: [
      '........',
      '........',
      '..#..#..',
      '........',
      '........',
      '..####..',
      '.#....#.',
      '........',
    ],
    draw: [
      '........',
      '........',
      '..#..#..',
      '........',
      '........',
      '.######.',
      '........',
      '........',
    ],
  };

  drawPattern(frame, faceLight, patterns[result] ?? patterns.draw);

  return frame;
}

function drawPattern(frame, light, rows) {
  rows.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell === '#') {
        frame[cellIndex(x, y)] = light;
      }
    });
  });
}

function forEachCell(callback) {
  for (let y = 0; y < PAD_SIZE; y += 1) {
    for (let x = 0; x < PAD_SIZE; x += 1) {
      callback(x, y);
    }
  }
}

function cellIndex(x, y) {
  return y * PAD_SIZE + x;
}

function endMs(ms) {
  return ms * END_ANIMATION_SPEED;
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
