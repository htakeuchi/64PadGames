import { LIGHT_EFFECT, PAD_SIZE, normalizeLight } from './PadLights.js';
import { PAD_CONTROL } from './PadControls.js';

const SYSEX_HEADER = [0xf0, 0x00, 0x20, 0x29, 0x02, 0x0e];
const PROGRAMMER_MODE_COMMAND = 0x0e;
const PROGRAMMER_MODE = 0x01;
const LIVE_MODE = 0x00;

const LIGHT_STATUS_BY_EFFECT = {
  [LIGHT_EFFECT.STATIC]: 0x90,
  [LIGHT_EFFECT.FLASH]: 0x91,
  [LIGHT_EFFECT.PULSE]: 0x92,
};

export class LaunchpadProMk3Adapter {
  constructor() {
    this.id = 'launchpad-pro-mk3';
    this.midi = null;
    this.input = null;
    this.output = null;
    this.sysexEnabled = true;
    this.padDownListeners = new Set();
    this.controlListeners = new Set();
    this.handleMessage = this.handleMessage.bind(this);
  }

  async connect({ sysex = true } = {}) {
    if (!navigator.requestMIDIAccess) {
      throw new Error('This browser does not support the Web MIDI API.');
    }

    this.sysexEnabled = sysex;
    this.midi = await navigator.requestMIDIAccess({ sysex });
    this.input = findBestPort(this.midi.inputs, 'input');
    this.output = findBestPort(this.midi.outputs, 'output');

    if (!this.input || !this.output) {
      throw new Error('Could not auto-detect the Launchpad Pro MK3 MIDI ports.');
    }

    await this.input.open?.();
    await this.output.open?.();

    this.input.onmidimessage = this.handleMessage;
    if (this.sysexEnabled) {
      this.enterProgrammerMode();
    }
    this.clear();

    return {
      inputName: this.input.name,
      outputName: this.output.name,
      sysexEnabled: this.sysexEnabled,
    };
  }

  onPadDown(listener) {
    this.padDownListeners.add(listener);
    return () => this.padDownListeners.delete(listener);
  }

  onControl(listener) {
    this.controlListeners.add(listener);
    return () => this.controlListeners.delete(listener);
  }

  setCell(x, y, light) {
    if (!this.output) {
      return;
    }

    const normalized = normalizeLight(light);
    const note = cellToNote(x, y);
    const status = LIGHT_STATUS_BY_EFFECT[normalized.effect] ?? 0x90;

    this.output.send([status, note, clampMidi(normalized.midi)]);
  }

  clear() {
    if (!this.output) {
      return;
    }

    for (let y = 0; y < PAD_SIZE; y += 1) {
      for (let x = 0; x < PAD_SIZE; x += 1) {
        this.output.send([0x90, cellToNote(x, y), 0]);
      }
    }
  }

  disconnect() {
    if (this.output) {
      this.clear();
      if (this.sysexEnabled) {
        this.exitProgrammerMode();
      }
    }

    if (this.input) {
      this.input.onmidimessage = null;
    }

    this.input?.close?.();
    this.output?.close?.();
    this.input = null;
    this.output = null;
    this.midi = null;
  }

  enterProgrammerMode() {
    this.sendSysex(PROGRAMMER_MODE_COMMAND, PROGRAMMER_MODE);
  }

  exitProgrammerMode() {
    this.sendSysex(PROGRAMMER_MODE_COMMAND, LIVE_MODE);
  }

  sendSysex(command, ...data) {
    if (!this.sysexEnabled) {
      return;
    }

    this.output?.send([...SYSEX_HEADER, command, ...data, 0xf7]);
  }

  handleMessage(event) {
    const [status, data1, data2] = event.data;
    const command = status & 0xf0;
    const isNoteOn = command === 0x90 && data2 > 0;
    const isControlChange = command === 0xb0 && data2 > 0;
    const cell = noteToCell(data1);

    if (isControlChange) {
      const control = ccToControl(data1);

      if (control) {
        this.controlListeners.forEach((listener) => listener({ control, cc: data1 }));
      }

      return;
    }

    if (isNoteOn && cell) {
      this.padDownListeners.forEach((listener) => listener(cell));
    }
  }
}

export function cellToNote(x, y) {
  const rowFromBottom = PAD_SIZE - y;
  return rowFromBottom * 10 + x + 1;
}

export function noteToCell(note) {
  const x = (note % 10) - 1;
  const rowFromBottom = Math.floor(note / 10);
  const y = PAD_SIZE - rowFromBottom;

  if (x < 0 || x >= PAD_SIZE || y < 0 || y >= PAD_SIZE) {
    return null;
  }

  return { x, y };
}

function clampMidi(value) {
  return Math.max(0, Math.min(127, Math.round(value)));
}

function findBestPort(portMap, type) {
  return [...portMap.values()]
    .map((port) => ({ port, score: scorePort(port, type) }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.port ?? null;
}

function scorePort(port) {
  const text = `${port.name ?? ''} ${port.manufacturer ?? ''}`.toLowerCase();
  let score = 0;

  if (text.includes('lppromk3')) score += 120;
  if (text.includes('launchpad pro mk3')) score += 120;
  if (text.includes('launchpad pro')) score += 80;
  if (text.includes('mk3')) score += 30;
  if (text.includes('midi')) score += 20;
  if (text.includes('novation')) score += 10;
  if (text.includes('daw')) score -= 120;
  if (text.includes('din')) score -= 80;

  return score;
}

function ccToControl(cc) {
  if (cc === 91) return PAD_CONTROL.ARROW_LEFT;
  if (cc === 92) return PAD_CONTROL.ARROW_RIGHT;
  if (cc === 80) return PAD_CONTROL.ARROW_UP;
  if (cc === 70) return PAD_CONTROL.ARROW_DOWN;
  if (cc === 1) return PAD_CONTROL.RECORD_ARM;
  return null;
}
