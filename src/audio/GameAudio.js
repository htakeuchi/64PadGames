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

  simonTone(blockIndex, duration = 0.18) {
    if (this.muted) {
      return;
    }

    this.resume();

    if (!this.context) {
      return;
    }

    const chords = [
      [349.23, 440.00, 523.25, 698.46],
      [392.00, 493.88, 587.33, 783.99],
      [329.63, 392.00, 493.88, 659.25],
      [220.00, 261.63, 329.63, 440.00],
    ];
    const notes = chords[blockIndex] ?? chords[0];
    const start = this.context.currentTime;
    const sustainEnd = start + Math.max(duration, 0.22);
    const releaseEnd = start + Math.max(duration + 0.45, 0.65);
    const filter = this.context.createBiquadFilter();
    const master = this.context.createGain();
    const delay = this.context.createDelay();
    const feedback = this.context.createGain();
    const wet = this.context.createGain();
    const compressor = this.context.createDynamicsCompressor();

    filter.type = 'lowpass';
    filter.Q.setValueAtTime(8, start);
    filter.frequency.setValueAtTime(6800, start);
    filter.frequency.exponentialRampToValueAtTime(2300, sustainEnd);
    filter.frequency.exponentialRampToValueAtTime(1400, releaseEnd);

    master.gain.setValueAtTime(0.0001, start);
    master.gain.linearRampToValueAtTime(1, start + 0.018);
    master.gain.setValueAtTime(0.82, sustainEnd);
    master.gain.exponentialRampToValueAtTime(0.0001, releaseEnd);

    delay.delayTime.setValueAtTime(0.15, start);
    feedback.gain.setValueAtTime(0.23, start);
    wet.gain.setValueAtTime(0.24, start);

    compressor.threshold.setValueAtTime(-9, start);
    compressor.knee.setValueAtTime(18, start);
    compressor.ratio.setValueAtTime(4, start);
    compressor.attack.setValueAtTime(0.003, start);
    compressor.release.setValueAtTime(0.18, start);

    filter.connect(master);
    master.connect(compressor);
    master.connect(delay);
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(compressor);
    compressor.connect(this.context.destination);

    notes.forEach((frequency) => {
      [-4, 4].forEach((detune, voiceIndex) => {
        const oscillator = this.context.createOscillator();
        const voiceGain = this.context.createGain();

        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.detune.setValueAtTime(detune, start);
        oscillator.type = voiceIndex === 0 ? 'sawtooth' : 'square';
        voiceGain.gain.setValueAtTime(voiceIndex === 0 ? 0.05 : 0.024, start);
        oscillator.connect(voiceGain).connect(filter);
        oscillator.start(start);
        oscillator.stop(releaseEnd + 0.2);
      });
    });
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
