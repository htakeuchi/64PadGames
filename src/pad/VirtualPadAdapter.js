import { LIGHT_EFFECT, PAD_SIZE, normalizeLight } from './PadLights.js';

export class VirtualPadAdapter {
  constructor(root) {
    this.id = 'virtual-pad';
    this.root = root;
    this.padDownListeners = new Set();
    this.padUpListeners = new Set();
    this.buttons = [];

    this.mount();
  }

  mount() {
    this.root.className = 'virtual-pad';
    this.root.setAttribute('role', 'grid');
    this.root.setAttribute('aria-label', 'Virtual 8x8 pad');
    this.root.innerHTML = '';

    for (let y = 0; y < PAD_SIZE; y += 1) {
      for (let x = 0; x < PAD_SIZE; x += 1) {
        const button = document.createElement('button');
        button.className = 'virtual-pad__cell';
        button.type = 'button';
        button.dataset.x = String(x);
        button.dataset.y = String(y);
        button.setAttribute('role', 'gridcell');
        button.setAttribute('aria-label', `Pad ${x + 1}, ${y + 1}`);

        button.addEventListener('pointerdown', (event) => {
          event.preventDefault();
          button.setPointerCapture?.(event.pointerId);
          this.padDownListeners.forEach((listener) => listener({ x, y }));
        });

        button.addEventListener('pointerup', (event) => {
          event.preventDefault();
          this.padUpListeners.forEach((listener) => listener({ x, y }));
        });

        button.addEventListener('pointercancel', (event) => {
          event.preventDefault();
          this.padUpListeners.forEach((listener) => listener({ x, y }));
        });

        this.root.append(button);
        this.buttons.push(button);
      }
    }

    this.clear();
  }

  onPadDown(listener) {
    this.padDownListeners.add(listener);
    return () => this.padDownListeners.delete(listener);
  }

  onPadUp(listener) {
    this.padUpListeners.add(listener);
    return () => this.padUpListeners.delete(listener);
  }

  setCell(x, y, light) {
    const cell = this.buttons[y * PAD_SIZE + x];
    const normalized = normalizeLight(light);

    if (!cell) {
      return;
    }

    cell.style.setProperty('--pad-color', normalized.css);
    cell.dataset.light = normalized.id;
    cell.dataset.effect = normalized.effect;
    cell.classList.toggle('is-pulsing', normalized.effect === LIGHT_EFFECT.PULSE);
    cell.classList.toggle('is-flashing', normalized.effect === LIGHT_EFFECT.FLASH);
  }

  clear() {
    this.buttons.forEach((button) => {
      button.style.setProperty('--pad-color', '#121417');
      button.dataset.light = 'off';
      button.dataset.effect = LIGHT_EFFECT.STATIC;
      button.classList.remove('is-pulsing', 'is-flashing');
    });
  }
}
