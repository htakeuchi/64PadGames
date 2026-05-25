import { PAD_SIZE, normalizeLight } from './PadLights.js';

export class PadHub {
  constructor(adapters = []) {
    this.adapters = [];
    this.padDownListeners = new Set();
    this.padUpListeners = new Set();
    this.controlListeners = new Set();

    adapters.forEach((adapter) => this.addAdapter(adapter));
  }

  addAdapter(adapter) {
    this.adapters.push(adapter);

    if (typeof adapter.onPadDown === 'function') {
      adapter.onPadDown((cell) => {
        this.padDownListeners.forEach((listener) => {
          listener({ ...cell, source: adapter.id });
        });
      });
    }

    if (typeof adapter.onPadUp === 'function') {
      adapter.onPadUp((cell) => {
        this.padUpListeners.forEach((listener) => {
          listener({ ...cell, source: adapter.id });
        });
      });
    }

    if (typeof adapter.onControl === 'function') {
      adapter.onControl((control) => {
        this.controlListeners.forEach((listener) => {
          listener({ ...control, source: adapter.id });
        });
      });
    }
  }

  onPadDown(listener) {
    this.padDownListeners.add(listener);
    return () => this.padDownListeners.delete(listener);
  }

  onPadUp(listener) {
    this.padUpListeners.add(listener);
    return () => this.padUpListeners.delete(listener);
  }

  onControl(listener) {
    this.controlListeners.add(listener);
    return () => this.controlListeners.delete(listener);
  }

  setCell(x, y, light) {
    const normalized = normalizeLight(light);

    this.adapters.forEach((adapter) => {
      adapter.setCell?.(x, y, normalized);
    });
  }

  renderFrame(frame) {
    for (let y = 0; y < PAD_SIZE; y += 1) {
      for (let x = 0; x < PAD_SIZE; x += 1) {
        this.setCell(x, y, frame[y * PAD_SIZE + x]);
      }
    }
  }

  clear() {
    this.adapters.forEach((adapter) => adapter.clear?.());
  }

  async disconnect() {
    await Promise.allSettled(
      this.adapters.map((adapter) => adapter.disconnect?.()),
    );
  }
}
