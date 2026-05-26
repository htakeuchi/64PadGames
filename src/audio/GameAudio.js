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

  reversiMove(flips = 0) {
    this.playTone(250, 0.035, 'triangle', 0.026);
    this.playTone(330, 0.04, 'sine', 0.018, 0.025);

    const flipCount = Math.min(flips, 8);

    for (let index = 0; index < flipCount; index += 1) {
      this.playTone(430 + index * 34, 0.032, 'triangle', 0.016, 0.055 + index * 0.025);
    }
  }

  connect4Drop(row = 5) {
    const normalizedRow = Math.max(0, Math.min(5, row));
    const landingFrequency = 190 + normalizedRow * 24;

    this.playSweep(760 - normalizedRow * 28, landingFrequency, 0.11, 'triangle', 0.026);
    this.playTone(landingFrequency, 0.08, 'square', 0.022, 0.095);
    this.playNoise(0.035, 0.012, 0.09, 1800, 'lowpass');
  }

  minesweeperReveal(adjacent = 0, openedCount = 1) {
    if (adjacent === 0) {
      this.playTone(410, 0.045, 'sine', 0.018);
      this.playSweep(620, 880 + Math.min(openedCount, 16) * 12, 0.13, 'sine', 0.016, 0.025);
      return;
    }

    const frequency = 360 + Math.min(adjacent, 8) * 54;

    this.playTone(frequency, 0.055, 'sine', 0.024);
    this.playTone(frequency * 1.5, 0.04, 'triangle', 0.012, 0.045);
  }

  minesweeperFlag(flagged = true) {
    if (flagged) {
      this.playTone(520, 0.035, 'square', 0.018);
      this.playTone(680, 0.045, 'square', 0.014, 0.04);
      return;
    }

    this.playTone(620, 0.035, 'square', 0.016);
    this.playTone(430, 0.045, 'square', 0.014, 0.04);
  }

  minesweeperMine() {
    this.playNoise(0.16, 0.05, 0, 900, 'lowpass');
    this.playSweep(180, 68, 0.24, 'sawtooth', 0.04);
    this.playTone(86, 0.18, 'triangle', 0.035, 0.06);
  }

  floodFill(capturedCount = 0, colorIndex = 0) {
    const bases = [330, 392, 440, 523, 587, 659];
    const base = bases[colorIndex % bases.length];
    const size = Math.min(capturedCount, 24);
    const duration = 0.09 + size * 0.004;

    this.playSweep(base * 0.72, base * 1.2, duration, 'sine', 0.018);
    this.playTone(base, duration, 'triangle', 0.016, 0.02);
    this.playTone(base * 1.5, duration * 0.8, 'sine', 0.012, 0.045);
  }

  sameGamePop(size = 2) {
    const count = Math.min(Math.max(size, 2), 12);

    this.playNoise(0.045, 0.018, 0, 2600, 'highpass');
    for (let index = 0; index < Math.min(count, 6); index += 1) {
      this.playTone(460 + index * 42, 0.035, 'triangle', 0.014, index * 0.018);
    }

    if (size >= 8) {
      this.playTone(840, 0.09, 'sine', 0.02, 0.09);
    }
  }

  checkersSelect() {
    this.playNoise(0.025, 0.011, 0, 1700, 'lowpass');
    this.playTone(300, 0.035, 'triangle', 0.018);
  }

  checkersMove({ capture = false, promotes = false } = {}) {
    if (capture) {
      this.playNoise(0.045, 0.025, 0, 2100, 'highpass');
      this.playTone(180, 0.04, 'square', 0.018);
      this.playTone(360, 0.05, 'triangle', 0.016, 0.05);
    } else {
      this.playSweep(290, 230, 0.065, 'triangle', 0.018);
      this.playNoise(0.025, 0.01, 0.055, 1600, 'lowpass');
    }

    if (promotes) {
      this.playTone(392, 0.075, 'triangle', 0.022, 0.08);
      this.playTone(494, 0.075, 'triangle', 0.02, 0.14);
      this.playTone(659, 0.1, 'triangle', 0.018, 0.2);
    }
  }

  hasamiSelect() {
    this.playTone(260, 0.035, 'triangle', 0.017);
    this.playNoise(0.022, 0.009, 0.02, 1400, 'lowpass');
  }

  hasamiMove(capturedCount = 0) {
    this.playSweep(360, 250, 0.085, 'triangle', 0.018);
    this.playNoise(0.026, 0.01, 0.07, 1500, 'lowpass');

    for (let index = 0; index < Math.min(capturedCount, 6); index += 1) {
      this.playTone(520 + index * 32, 0.032, 'square', 0.013, 0.095 + index * 0.025);
    }
  }

  lightsOutToggle(affectedCount = 1, lightsRemaining = null) {
    const base = lightsRemaining === 0 ? 620 : 260 + Math.min(affectedCount, 5) * 42;

    this.playTone(base, 0.045, 'square', 0.018);
    this.playTone(base * 1.5, 0.04, 'sine', 0.012, 0.035);
  }

  pegSolitaireSelect() {
    this.playTone(320, 0.035, 'triangle', 0.016);
    this.playTone(410, 0.04, 'sine', 0.012, 0.035);
  }

  pegSolitaireJump() {
    this.playSweep(420, 250, 0.085, 'triangle', 0.019);
    this.playNoise(0.035, 0.012, 0.055, 1500, 'lowpass');
    this.playTone(520, 0.04, 'square', 0.012, 0.085);
  }

  pegSolitaireClear() {
    this.playTone(392, 0.075, 'triangle', 0.024);
    this.playTone(523, 0.085, 'triangle', 0.022, 0.08);
    this.playTone(784, 0.12, 'sine', 0.02, 0.17);
  }

  pegSolitaireStuck() {
    this.playTone(220, 0.07, 'triangle', 0.02);
    this.playTone(165, 0.09, 'triangle', 0.018, 0.075);
  }

  match3Select(colorIndex = 0) {
    const bases = [523, 587, 659, 784, 880];
    const base = bases[colorIndex % bases.length];

    this.playTone(base, 0.045, 'sine', 0.017);
    this.playTone(base * 2, 0.035, 'triangle', 0.01, 0.04);
  }

  match3Swap() {
    this.playTone(440, 0.04, 'triangle', 0.014);
    this.playTone(554, 0.04, 'triangle', 0.014, 0.045);
  }

  match3Match(count = 3, chainCount = 1, targetHits = 0) {
    const base = 480 + Math.min(chainCount, 6) * 42;
    const length = Math.min(count, 8);

    this.playTone(base, 0.055, 'triangle', 0.019);
    this.playTone(base * 1.25, 0.055, 'sine', 0.016, 0.04);
    this.playTone(base * 1.5, 0.07, 'sine', 0.014, 0.08);

    if (length >= 5 || targetHits > 0) {
      this.playTone(base * 2, 0.095, 'triangle', 0.019, 0.13);
    }
  }

  blockLineSelect(width = 1) {
    this.playTone(190 + width * 42, 0.04, 'square', 0.018);
    this.playNoise(0.025, 0.01, 0.025, 1000, 'lowpass');
  }

  blockLineSlide(width = 1, distance = 1) {
    const span = Math.max(1, distance);

    this.playSweep(180 + width * 48, 280 + span * 36, 0.08 + span * 0.014, 'sawtooth', 0.017);
    this.playTone(150 + width * 30, 0.045, 'triangle', 0.018, 0.08 + span * 0.012);
  }

  blockLineClear(rowCount = 1, chainCount = 1) {
    const base = 320 + chainCount * 46;

    for (let index = 0; index < Math.min(rowCount + 2, 5); index += 1) {
      this.playTone(base + index * 70, 0.05, 'square', 0.016, index * 0.035);
    }
    this.playNoise(0.06, 0.013, 0.04, 2200, 'highpass');
  }

  blockLineRise() {
    this.playTone(120, 0.075, 'sawtooth', 0.018);
    this.playTone(155, 0.075, 'sawtooth', 0.015, 0.075);
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

  playSweep(fromFrequency, toFrequency, duration, type = 'sine', gainValue = 0.025, offset = 0) {
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

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(1, fromFrequency), start);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, toFrequency),
      start + Math.max(0.01, duration),
    );
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(gainValue, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(this.context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  playNoise(duration, gainValue = 0.02, offset = 0, filterFrequency = 1800, filterType = 'lowpass') {
    if (this.muted) {
      return;
    }

    this.resume();

    if (!this.context) {
      return;
    }

    const sampleRate = this.context.sampleRate;
    const sampleCount = Math.max(1, Math.floor(sampleRate * duration));
    const buffer = this.context.createBuffer(1, sampleCount, sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < sampleCount; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / sampleCount);
    }

    const start = this.context.currentTime + offset;
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();

    source.buffer = buffer;
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFrequency, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(gainValue, start + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(gain).connect(this.context.destination);
    source.start(start);
    source.stop(start + duration + 0.02);
  }
}
