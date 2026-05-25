export class GameAudio {
  constructor() {
    this.context = null;
    this.muted = false;
  }

  resume() {
    if (this.muted) {
      return;
    }

    const AudioContext = window.AudioContext ?? window.webkitAudioContext;

    if (!AudioContext) {
      return;
    }

    if (!this.context) {
      this.context = new AudioContext();
    }

    if (this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  setMuted(muted) {
    this.muted = muted;
  }

  place(flips = 0) {
    this.playTone(320, 0.045, 'triangle', 0.035);
    this.playTone(440 + Math.min(flips, 8) * 18, 0.08, 'sine', 0.03, 0.045);
  }

  invalid() {
    this.playTone(130, 0.09, 'sawtooth', 0.025);
  }

  pass() {
    this.playTone(230, 0.06, 'triangle', 0.025);
    this.playTone(180, 0.08, 'triangle', 0.018, 0.06);
  }

  undo() {
    this.playTone(260, 0.05, 'sine', 0.025);
    this.playTone(210, 0.06, 'sine', 0.02, 0.05);
  }

  win() {
    this.playTone(392, 0.08, 'triangle', 0.035);
    this.playTone(523, 0.1, 'triangle', 0.035, 0.08);
    this.playTone(659, 0.13, 'triangle', 0.03, 0.18);
  }

  lose() {
    this.playTone(260, 0.1, 'triangle', 0.03);
    this.playTone(196, 0.16, 'triangle', 0.025, 0.12);
  }

  draw() {
    this.playTone(330, 0.08, 'triangle', 0.028);
    this.playTone(330, 0.08, 'triangle', 0.024, 0.12);
  }

  playTone(frequency, duration, type = 'sine', gainValue = 0.03, offset = 0) {
    if (this.muted) {
      return;
    }

    this.resume();

    if (!this.context) {
      return;
    }

    const start = this.context.currentTime + offset;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();

    oscillator.frequency.value = frequency;
    oscillator.type = type;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(gainValue, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }
}

