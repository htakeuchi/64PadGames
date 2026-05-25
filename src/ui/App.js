import { createIcons, icons } from 'lucide';
import { GameAudio } from '../audio/GameAudio.js';
import { BLACK, WHITE } from '../games/reversi/ReversiGame.js';
import { gameRegistry } from '../games/registry.js';
import { LaunchpadProMk3Adapter } from '../pad/LaunchpadProMk3Adapter.js';
import { PadAnimationPlayer } from '../pad/PadAnimationPlayer.js';
import { PAD_CONTROL } from '../pad/PadControls.js';
import { PadHub } from '../pad/PadHub.js';
import { emptyFrame } from '../pad/PadLights.js';
import { VirtualPadAdapter } from '../pad/VirtualPadAdapter.js';

const DIFFICULTIES = ['easy', 'normal', 'hard'];
const LONG_PRESS_MS = 500;

export function createApp(root) {
  return new PadGameApp(root).mount();
}

class PadGameApp {
  constructor(root) {
    this.root = root;
    this.audio = new GameAudio();
    this.padHub = null;
    this.animations = null;
    this.virtualPad = null;
    this.launchpad = null;
    this.game = null;
    this.selectedGameId = gameRegistry[0].id;
    this.humanPlayer = BLACK;
    this.difficulty = 'normal';
    this.moveLimitEnabled = true;
    this.muted = false;
    this.padPresses = new Map();
    this.currentGameState = null;
    this.debugColorMode = null;
  }

  mount() {
    this.root.innerHTML = this.template();
    createIcons({ icons });

    this.cacheElements();
    this.renderGameList();
    this.virtualPad = new VirtualPadAdapter(this.padRoot);
    this.padHub = new PadHub([this.virtualPad]);
    this.animations = new PadAnimationPlayer(this.padHub);
    this.padHub.onPadDown((cell) => {
      this.audio.resume();
      this.handlePadDown(cell);
    });
    this.padHub.onPadUp((cell) => {
      this.handlePadUp(cell);
    });
    this.padHub.onControl((event) => {
      this.audio.resume();
      this.handlePadControl(event.control);
    });

    this.bindEvents();
    this.selectGame(this.selectedGameId);

    return this;
  }

  template() {
    return `
      <div class="app-shell">
        <header class="topbar">
          <div class="brand">
            <p class="brand__kicker">Launchpad Gamepad</p>
            <h1>64 Pad Games</h1>
          </div>
          <button class="button button--primary" type="button" data-action="connect">
            <i data-lucide="cable"></i>
            <span>Connect Launchpad</span>
          </button>
        </header>

        <main class="workspace">
          <nav class="game-panel" aria-label="Game list">
            <div class="panel-heading">
              <h2>Games</h2>
            </div>
            <div class="game-list" data-game-list></div>
            <div class="device-status" data-device-status>
              <span class="status-dot"></span>
              <span>Virtual pad only</span>
            </div>
          </nav>

          <section class="play-panel" aria-label="Play area">
            <div class="play-header">
              <div>
                <p class="section-label" data-current-game-label>Reversi</p>
                <h2 data-turn-label>Your turn.</h2>
              </div>
              <div class="turn-chip" data-turn-chip>Black</div>
            </div>
            <div class="pad-stage">
              <div data-pad-root></div>
            </div>
          </section>

          <aside class="control-panel" aria-label="Game controls">
            <section class="control-section" data-reversi-controls>
              <h2>Player</h2>
              <div class="segmented" data-control="player">
                <button class="is-active" type="button" data-human-player="black">First</button>
                <button type="button" data-human-player="white">Second</button>
              </div>
            </section>

            <section class="control-section">
              <h2>Level</h2>
              <label class="field">
                <span>Difficulty</span>
                <select data-control="difficulty">
                  <option value="easy">Easy</option>
                  <option value="normal" selected>Normal</option>
                  <option value="hard">Hard</option>
                </select>
              </label>
            </section>

            <section class="control-section" data-floodit-controls>
              <h2>Moves</h2>
              <div class="segmented" data-control="move-limit">
                <button class="is-active" type="button" data-move-limit="on">Limited</button>
                <button type="button" data-move-limit="off">Unlimited</button>
              </div>
            </section>

            <section class="score-panel">
              <div>
                <span data-human-label>You</span>
                <strong data-human-score>2</strong>
              </div>
              <div>
                <span>CPU</span>
                <strong data-cpu-score>2</strong>
              </div>
            </section>

            <section class="action-grid">
              <button class="button" type="button" data-action="new-game">
                <i data-lucide="rotate-ccw"></i>
                <span>New</span>
              </button>
              <button class="button" type="button" data-action="undo">
                <i data-lucide="undo-2"></i>
                <span>Undo</span>
              </button>
              <button class="button" type="button" data-action="pass">
                <i data-lucide="skip-forward"></i>
                <span>Pass</span>
              </button>
              <button class="button" type="button" data-action="mute">
                <i data-lucide="volume-2"></i>
                <span>Sound</span>
              </button>
            </section>

            <section class="control-section debug-section">
              <h2>Debug</h2>
              <div class="debug-grid">
                <button class="button" type="button" data-action="debug-win">
                  <i data-lucide="smile"></i>
                  <span>Win</span>
                </button>
                <button class="button" type="button" data-action="debug-lose">
                  <i data-lucide="frown"></i>
                  <span>Lose</span>
                </button>
                <button class="button" type="button" data-action="debug-draw">
                  <i data-lucide="meh"></i>
                  <span>Draw</span>
                </button>
                <button class="button" type="button" data-action="debug-colors">
                  <i data-lucide="palette"></i>
                  <span>Colors</span>
                </button>
              </div>
            </section>

            <div class="message-line" data-message-line>Ready</div>
          </aside>
        </main>
      </div>
    `;
  }

  cacheElements() {
    this.gameList = this.root.querySelector('[data-game-list]');
    this.padRoot = this.root.querySelector('[data-pad-root]');
    this.deviceStatus = this.root.querySelector('[data-device-status]');
    this.connectButton = this.root.querySelector('[data-action="connect"]');
    this.turnLabel = this.root.querySelector('[data-turn-label]');
    this.turnChip = this.root.querySelector('[data-turn-chip]');
    this.currentGameLabel = this.root.querySelector('[data-current-game-label]');
    this.humanScore = this.root.querySelector('[data-human-score]');
    this.cpuScore = this.root.querySelector('[data-cpu-score]');
    this.humanLabel = this.root.querySelector('[data-human-label]');
    this.cpuLabel = this.cpuScore.previousElementSibling;
    this.messageLine = this.root.querySelector('[data-message-line]');
    this.passButton = this.root.querySelector('[data-action="pass"]');
    this.undoButton = this.root.querySelector('[data-action="undo"]');
    this.muteButton = this.root.querySelector('[data-action="mute"]');
    this.difficultySelect = this.root.querySelector('[data-control="difficulty"]');
    this.reversiControls = this.root.querySelector('[data-reversi-controls]');
    this.floodItControls = this.root.querySelector('[data-floodit-controls]');
  }

  renderGameList() {
    this.gameList.innerHTML = gameRegistry.map((game) => `
      <button class="game-item ${game.id === this.selectedGameId ? 'is-active' : ''}" type="button" data-game-id="${game.id}">
        <span>${game.title}</span>
        <small>${game.summary}</small>
      </button>
    `).join('');
  }

  bindEvents() {
    this.root.addEventListener('click', (event) => {
      const gameButton = event.target.closest('[data-game-id]');
      const actionButton = event.target.closest('[data-action]');
      const playerButton = event.target.closest('[data-human-player]');
      const moveLimitButton = event.target.closest('[data-move-limit]');

      if (gameButton) {
        this.selectGame(gameButton.dataset.gameId);
        return;
      }

      if (playerButton) {
        this.setHumanPlayer(playerButton.dataset.humanPlayer === 'black' ? BLACK : WHITE);
        return;
      }

      if (moveLimitButton) {
        this.setMoveLimitEnabled(moveLimitButton.dataset.moveLimit === 'on');
        return;
      }

      if (!actionButton) {
        return;
      }

      this.audio.resume();
      this.handleAction(actionButton.dataset.action);
    });

    this.root.addEventListener('change', (event) => {
      if (event.target.matches('[data-control="difficulty"]')) {
        this.setDifficulty(event.target.value);
      }
    });

    window.addEventListener('beforeunload', () => {
      this.padHub?.disconnect();
    });
  }

  handleAction(action) {
    if (action === 'connect') {
      this.connectLaunchpad();
    }

    if (action === 'new-game') {
      this.exitDebugColorMode();
      this.game?.restart();
    }

    if (action === 'undo') {
      this.exitDebugColorMode();
      this.game?.undo?.();
    }

    if (action === 'pass') {
      this.exitDebugColorMode();
      this.game?.pass?.();
    }

    if (action === 'mute') {
      this.setMuted(!this.muted);
    }

    if (action === 'debug-win') {
      this.playDebugAnimation('win');
    }

    if (action === 'debug-lose') {
      this.playDebugAnimation('lose');
    }

    if (action === 'debug-draw') {
      this.playDebugAnimation('draw');
    }

    if (action === 'debug-colors') {
      this.playDebugColors();
    }
  }

  handlePadDown(cell) {
    const key = padKey(cell);
    if (this.debugColorMode) {
      this.padPresses.set(key, {
        cell,
        canHold: false,
        held: false,
        timer: null,
      });
      return;
    }

    const canHold = typeof this.game?.handlePadHold === 'function';
    const press = {
      cell,
      canHold,
      held: false,
      timer: window.setTimeout(() => {
        if (!canHold || typeof this.game?.handlePadHold !== 'function') {
          return;
        }

        press.held = true;
        this.game.handlePadHold(cell);
      }, LONG_PRESS_MS),
    };

    this.padPresses.set(key, press);
  }

  handlePadUp(cell) {
    const key = padKey(cell);
    const press = this.padPresses.get(key);

    if (!press) {
      return;
    }

    if (press.timer) {
      window.clearTimeout(press.timer);
    }
    this.padPresses.delete(key);

    if (this.debugColorMode) {
      this.handleDebugColorPad(cell);
      return;
    }

    if (press.held && press.canHold) {
      return;
    }

    if (typeof this.game?.handlePadTap === 'function') {
      this.game.handlePadTap(cell);
    } else {
      this.game?.handlePadDown?.(cell);
    }
  }

  async playDebugAnimation(result) {
    if (typeof this.game?.playDebugAnimation === 'function') {
      await this.game.playDebugAnimation(result);
      return;
    }

    this.animations.cancel();

    if (result === 'win') {
      this.audio.win();
      await this.animations.playWin();
    }

    if (result === 'lose') {
      this.audio.lose();
      await this.animations.playLose();
    }

    if (result === 'draw') {
      this.audio.draw();
      await this.animations.playDraw();
    }

    this.game?.render();
  }

  async playDebugColors() {
    const colors = typeof this.game?.getDebugColors === 'function'
      ? this.game.getDebugColors()
      : [];

    this.debugColorMode = {
      colors,
    };
    this.animations.cancel();
    this.audio.pass();
    this.renderDebugColorFrame();
    this.turnLabel.textContent = 'Color list';
    this.turnChip.textContent = 'Debug';
    this.messageLine.textContent = 'Tap a color pad to show its label. Tap any empty pad to return.';
  }

  handleDebugColorPad({ x, y }) {
    const color = y === 0 ? this.debugColorMode?.colors[x] : null;

    if (!color) {
      this.exitDebugColorMode();
      return;
    }

    this.turnLabel.textContent = formatDebugColor(color);
    this.turnChip.textContent = 'Color';
    this.messageLine.textContent = `Label ${color.label ?? color.id ?? 'Color'} / MIDI ${color.midi ?? '-'}`;
    this.renderDebugColorFrame();
  }

  renderDebugColorFrame() {
    const frame = emptyFrame();

    this.debugColorMode.colors.slice(0, 8).forEach((color, x) => {
      frame[x] = color;
    });

    this.padHub.renderFrame(frame);
  }

  exitDebugColorMode() {
    if (!this.debugColorMode) {
      return;
    }

    this.debugColorMode = null;
    this.game?.render();

    if (this.currentGameState) {
      this.syncGameState(this.currentGameState);
    }
  }

  selectGame(gameId) {
    const gameDefinition = gameRegistry.find((game) => game.id === gameId);

    if (!gameDefinition) {
      return;
    }

    this.selectedGameId = gameId;
    this.debugColorMode = null;
    this.currentGameState = null;
    this.renderGameList();
    this.currentGameLabel.textContent = gameDefinition.title;
    this.game?.destroy?.();
    this.game = gameDefinition.create({
      pad: this.padHub,
      audio: this.audio,
      onChange: (state) => this.syncGameState(state),
    });
    this.game.start({
      humanPlayer: this.humanPlayer,
      difficulty: this.difficulty,
      moveLimitEnabled: this.moveLimitEnabled,
      animations: this.animations,
    });
    this.syncGameControls();
  }

  setHumanPlayer(player) {
    this.humanPlayer = player;
    this.root.querySelectorAll('[data-human-player]').forEach((button) => {
      button.classList.toggle(
        'is-active',
        (button.dataset.humanPlayer === 'black' && player === BLACK)
          || (button.dataset.humanPlayer === 'white' && player === WHITE),
      );
    });
    this.game?.setHumanPlayer(player);
  }

  setDifficulty(difficulty) {
    this.exitDebugColorMode();
    this.difficulty = difficulty;
    this.difficultySelect.value = difficulty;
    this.game?.setDifficulty(difficulty);
  }

  setMoveLimitEnabled(enabled) {
    this.exitDebugColorMode();
    this.moveLimitEnabled = enabled;
    this.root.querySelectorAll('[data-move-limit]').forEach((button) => {
      button.classList.toggle(
        'is-active',
        (button.dataset.moveLimit === 'on') === enabled,
      );
    });
    this.game?.setMoveLimitEnabled?.(enabled);
  }

  handlePadControl(control) {
    if (this.debugColorMode) {
      this.exitDebugColorMode();
      return;
    }

    if (hasPlayerChoice(this.selectedGameId) && control === PAD_CONTROL.ARROW_LEFT) {
      this.setHumanPlayer(BLACK);
    }

    if (hasPlayerChoice(this.selectedGameId) && control === PAD_CONTROL.ARROW_RIGHT) {
      this.setHumanPlayer(WHITE);
    }

    if (this.selectedGameId === 'floodit' && control === PAD_CONTROL.ARROW_LEFT) {
      this.setMoveLimitEnabled(true);
    }

    if (this.selectedGameId === 'floodit' && control === PAD_CONTROL.ARROW_RIGHT) {
      this.setMoveLimitEnabled(false);
    }

    if (control === PAD_CONTROL.ARROW_UP) {
      this.stepDifficulty(1);
    }

    if (control === PAD_CONTROL.ARROW_DOWN) {
      this.stepDifficulty(-1);
    }

    if (control === PAD_CONTROL.RECORD_ARM) {
      if (
        this.selectedGameId === 'floodit'
        || this.selectedGameId === 'simon'
        || this.selectedGameId === 'samegame'
      ) {
        this.game?.restart();
      } else {
        this.game?.undo?.();
      }
    }
  }

  stepDifficulty(direction) {
    const currentIndex = DIFFICULTIES.indexOf(this.difficulty);
    const nextIndex = Math.max(
      0,
      Math.min(DIFFICULTIES.length - 1, currentIndex + direction),
    );

    this.setDifficulty(DIFFICULTIES[nextIndex]);
  }

  async connectLaunchpad() {
    if (this.launchpad) {
      return;
    }

    this.connectButton.disabled = true;
    this.setDeviceStatus('Connecting...', false);

    try {
      const { adapter, info, warning } = await this.connectLaunchpadAdapter();
      this.activateLaunchpad(adapter, info, warning);
    } catch (error) {
      this.connectButton.disabled = false;
      this.setDeviceStatus(getMidiErrorMessage(error), false, true);
    }
  }

  async connectLaunchpadAdapter() {
    try {
      const adapter = new LaunchpadProMk3Adapter();
      const info = await adapter.connect({ sysex: true });
      return { adapter, info, warning: null };
    } catch (error) {
      if (!isPermissionError(error)) {
        throw error;
      }

      const adapter = new LaunchpadProMk3Adapter();
      const info = await adapter.connect({ sysex: false });
      return {
        adapter,
        info,
        warning: 'Connected without SysEx. Switch Launchpad to Programmer Mode manually.',
      };
    }
  }

  activateLaunchpad(adapter, info, warning) {
    this.launchpad = adapter;
    this.padHub.addAdapter(adapter);
    this.game?.render();
    this.setDeviceStatus(warning ?? `Connected: ${info.outputName}`, true);
    this.connectButton.innerHTML = warning
      ? '<i data-lucide="badge-alert"></i><span>MIDI Connected</span>'
      : '<i data-lucide="check"></i><span>Connected</span>';
    createIcons({ icons });
  }

  setMuted(muted) {
    this.muted = muted;
    this.audio.setMuted(muted);
    this.muteButton.innerHTML = muted
      ? '<i data-lucide="volume-x"></i><span>Muted</span>'
      : '<i data-lucide="volume-2"></i><span>Sound</span>';
    createIcons({ icons });
  }

  syncGameState(state) {
    this.currentGameState = state;

    if (this.debugColorMode) {
      return;
    }

    if (state.kind === 'minesweeper') {
      this.syncMinesweeperState(state);
      return;
    }

    if (state.kind === 'floodit') {
      this.syncFloodItState(state);
      return;
    }

    if (state.kind === 'simon') {
      this.syncSimonState(state);
      return;
    }

    if (state.kind === 'samegame') {
      this.syncSameGameState(state);
      return;
    }

    if (state.kind === 'checkers') {
      this.syncCheckersState(state);
      return;
    }

    const humanScore = state.humanPlayer === BLACK ? state.score.black : state.score.white;
    const cpuScore = state.cpuPlayer === BLACK ? state.score.black : state.score.white;
    const humanColor = state.humanPlayer === BLACK ? 'Black' : 'White';
    const cpuColor = state.cpuPlayer === BLACK ? 'Black' : 'White';

    this.turnLabel.textContent = state.message;
    this.turnChip.textContent = state.gameOver
      ? 'Game over'
      : `${state.currentPlayerName}${state.thinking ? ' thinking' : ''}`;
    this.humanScore.textContent = String(humanScore);
    this.cpuScore.textContent = String(cpuScore);
    this.humanLabel.textContent = `You (${humanColor})`;
    this.cpuLabel.textContent = 'CPU';
    this.messageLine.textContent = `CPU (${cpuColor}) / Legal moves ${state.legalMoveCount}`;
    this.passButton.disabled = !state.canPass;
    this.undoButton.disabled = !state.canUndo;
  }

  syncMinesweeperState(state) {
    this.turnLabel.textContent = state.message;
    this.turnChip.textContent = state.statusLabel;
    this.humanLabel.textContent = 'Opened';
    this.humanScore.textContent = String(state.openedCount);
    this.cpuLabel.textContent = 'Flags';
    this.cpuScore.textContent = String(state.flagCount);
    this.messageLine.textContent = `Mines ${state.mineCount} / Hidden ${state.hiddenCount}`;
    this.passButton.disabled = true;
    this.undoButton.disabled = true;
  }

  syncFloodItState(state) {
    this.turnLabel.textContent = state.message;
    this.turnChip.textContent = state.statusLabel;
    this.humanLabel.textContent = 'Captured';
    this.humanScore.textContent = String(state.capturedCount);
    this.cpuLabel.textContent = 'Moves';
    this.cpuScore.textContent = state.moveLimitEnabled
      ? `${state.movesUsed}/${state.moveLimit}`
      : String(state.movesUsed);
    this.messageLine.textContent = state.moveLimitEnabled
      ? `Colors ${state.colorCount} / Remaining ${state.remainingMoves}`
      : `Colors ${state.colorCount} / Unlimited moves`;
    this.passButton.disabled = true;
    this.undoButton.disabled = true;
  }

  syncSimonState(state) {
    this.turnLabel.textContent = state.message;
    this.turnChip.textContent = state.statusLabel;
    this.humanLabel.textContent = 'Round';
    this.humanScore.textContent = `${state.round}/${state.targetRounds}`;
    this.cpuLabel.textContent = 'Lives';
    this.cpuScore.textContent = String(state.livesRemaining);
    this.messageLine.textContent = state.phase === 'input'
      ? `Step ${state.inputIndex + 1}/${state.round} / Best ${state.bestRound}`
      : `Target ${state.targetRounds} / Best ${state.bestRound}`;
    this.passButton.disabled = true;
    this.undoButton.disabled = true;
  }

  syncSameGameState(state) {
    this.turnLabel.textContent = state.message;
    this.turnChip.textContent = state.statusLabel;
    this.humanLabel.textContent = 'Score';
    this.humanScore.textContent = String(state.score);
    this.cpuLabel.textContent = 'Blocks';
    this.cpuScore.textContent = String(state.blocksRemaining);
    this.messageLine.textContent = `Groups ${state.availableGroupCount} / Colors ${state.colorCount} / Best ${state.bestScore}`;
    this.passButton.disabled = true;
    this.undoButton.disabled = true;
  }

  syncCheckersState(state) {
    const humanScore = state.humanPlayer === BLACK ? state.score.black : state.score.white;
    const cpuScore = state.cpuPlayer === BLACK ? state.score.black : state.score.white;
    const humanKings = state.humanPlayer === BLACK ? state.score.blackKings : state.score.whiteKings;
    const cpuKings = state.cpuPlayer === BLACK ? state.score.blackKings : state.score.whiteKings;
    const humanColor = state.humanPlayer === BLACK ? 'Black' : 'White';
    const cpuColor = state.cpuPlayer === BLACK ? 'Black' : 'White';

    this.turnLabel.textContent = state.message;
    this.turnChip.textContent = state.gameOver
      ? 'Game over'
      : `${state.currentPlayerName}${state.thinking ? ' thinking' : ''}`;
    this.humanScore.textContent = String(humanScore);
    this.cpuScore.textContent = String(cpuScore);
    this.humanLabel.textContent = `You (${humanColor})`;
    this.cpuLabel.textContent = 'CPU';
    this.messageLine.textContent = `CPU (${cpuColor}) / Kings ${humanKings}-${cpuKings} / Legal moves ${state.legalMoveCount}`;
    this.passButton.disabled = true;
    this.undoButton.disabled = !state.canUndo;
  }

  syncGameControls() {
    this.reversiControls.hidden = !hasPlayerChoice(this.selectedGameId);
    this.floodItControls.hidden = this.selectedGameId !== 'floodit';
  }

  setDeviceStatus(message, connected = false, error = false) {
    this.deviceStatus.innerHTML = `
      <span class="status-dot ${connected ? 'is-connected' : ''} ${error ? 'is-error' : ''}"></span>
      <span>${message}</span>
    `;
  }
}

function padKey({ x, y }) {
  return `${x},${y}`;
}

function hasPlayerChoice(gameId) {
  return gameId === 'reversi' || gameId === 'checkers';
}

function formatDebugColor(color) {
  const label = color.label ?? color.id ?? 'Color';
  const css = typeof color.css === 'string' ? color.css.toUpperCase() : 'NO CSS';

  return `${label} (${css})`;
}

function isPermissionError(error) {
  const message = String(error?.message ?? '');

  return error?.name === 'NotAllowedError'
    || message.includes('Permission')
    || message.includes('permission')
    || message.includes('not granted');
}

function getMidiErrorMessage(error) {
  if (isPermissionError(error)) {
    return 'Web MIDI permission was denied. Open this URL in Chrome or Edge and allow MIDI and SysEx access.';
  }

  return error?.message ?? 'Could not connect to the MIDI device.';
}
