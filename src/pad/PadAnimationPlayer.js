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

  nextRun() {
    this.runId += 1;
    return this.runId;
  }

  async showFace(result, runId) {
    const openFace = faceFrame(result, false);
    const blinkFace = faceFrame(result, true);

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

function faceFrame(result, blinking) {
  const frame = emptyFrame();
  const faceLight = result === 'win'
    ? PAD_LIGHT.legal
    : result === 'lose'
      ? PAD_LIGHT.warning
      : PAD_LIGHT.opponent;

  drawEye(frame, faceLight, blinking);

  if (result === 'win') {
    drawCells(frame, faceLight, [
      [1, 4], [6, 4],
      [2, 5], [5, 5],
      [3, 6], [4, 6],
    ]);
  }

  if (result === 'lose') {
    drawCells(frame, faceLight, [
      [3, 4], [4, 4],
      [2, 5], [5, 5],
      [1, 6], [6, 6],
    ]);
  }

  if (result === 'draw') {
    drawCells(frame, faceLight, [
      [2, 5], [3, 5], [4, 5], [5, 5],
    ]);
  }

  return frame;
}

function drawEye(frame, light, blinking) {
  if (blinking) {
    drawCells(frame, light, [
      [2, 2], [5, 2],
    ]);
    return;
  }

  drawCells(frame, light, [
    [2, 2], [5, 2],
  ]);
}

function drawCells(frame, light, cells) {
  cells.forEach(([x, y]) => {
    frame[cellIndex(x, y)] = light;
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
