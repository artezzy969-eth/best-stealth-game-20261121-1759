// main.js — entry module for Shadow Courier.
// Canvas setup, fixed-timestep game loop, state machine
// (title / playing / paused / level-complete / caught / win), keyboard and
// mouse input, DOM HUD + screen wiring exactly as index.html's hook
// contract specifies, timer + score, WebAudio hooks, and the two
// play-test APIs: window.ShadowCourier (B1's contract) and window.__game
// (screenshot shot states). Levels come from ./levels.js (static import,
// as agreed with the level author); three small built-in fallback levels
// in the same pixel format are used only if LEVELS arrives empty.
// This file never writes levels.js itself.

import { LEVELS } from './levels.js';
import { createGame, updateGame } from './engine.js';
import { createInput } from './input.js';
import { makeRng } from './random.js';
import { renderGame, formatTime } from './render.js';
import {
  initAudio,
  setMuted,
  isMuted,
  playSound,
  startAmbient,
} from './audio.js';

// --- Fallback levels (same pixel format as levels.js) --------------------
// Used only when ./levels.js exports an empty LEVELS array.
const FALLBACK_LEVELS = [
  {
    name: 'Vault',
    seed: 101,
    brief: 'Opening night. Two wardens walk the floor.',
    hint: 'Crouch in shadow. Crates block sight.',
    parTime: 90,
    playerStart: { x: 60, y: 520 },
    exit: { x: 884, y: 40, w: 44, h: 44 },
    walls: [
      { x: 0, y: 0, w: 960, h: 16 }, { x: 0, y: 584, w: 960, h: 16 },
      { x: 0, y: 0, w: 16, h: 600 }, { x: 944, y: 0, w: 16, h: 600 },
      { x: 430, y: 120, w: 100, h: 24 }, { x: 430, y: 456, w: 100, h: 24 },
    ],
    crates: [
      { x: 220, y: 180, w: 56, h: 56 }, { x: 560, y: 300, w: 56, h: 56 },
      { x: 260, y: 470, w: 56, h: 56 },
    ],
    bushes: [{ x: 400, y: 250, w: 90, h: 70 }],
    shadows: [{ x: 120, y: 90, w: 130, h: 90 }, { x: 620, y: 430, w: 150, h: 90 }],
    intel: [
      { x: 500, y: 300, label: 'Floor plan' },
      { x: 880, y: 520, label: 'Key code' },
    ],
    guards: [
      {
        name: 'Mara',
        waypoints: [{ x: 480, y: 100 }, { x: 480, y: 500 }, { x: 200, y: 500 }, { x: 200, y: 100 }],
        speed: 62, coneRange: 190, coneAngleDeg: 68, pauseMs: 900, phase: 0,
      },
      {
        name: 'Ivo',
        waypoints: [{ x: 820, y: 120 }, { x: 820, y: 480 }, { x: 600, y: 480 }, { x: 600, y: 120 }],
        speed: 55, coneRange: 175, coneAngleDeg: 64, pauseMs: 1200, phase: 0.5,
      },
    ],
  },
  {
    name: 'Archive',
    seed: 202,
    brief: 'Three wardens, tighter shelves.',
    hint: 'Bushes hide you completely while crouched.',
    parTime: 105,
    playerStart: { x: 60, y: 60 },
    exit: { x: 884, y: 516, w: 44, h: 44 },
    walls: [
      { x: 0, y: 0, w: 960, h: 16 }, { x: 0, y: 584, w: 960, h: 16 },
      { x: 0, y: 0, w: 16, h: 600 }, { x: 944, y: 0, w: 16, h: 600 },
      { x: 200, y: 150, w: 220, h: 22 }, { x: 540, y: 430, w: 220, h: 22 },
    ],
    crates: [
      { x: 90, y: 220, w: 52, h: 52 }, { x: 820, y: 250, w: 52, h: 52 },
      { x: 120, y: 480, w: 52, h: 52 },
    ],
    bushes: [{ x: 430, y: 180, w: 100, h: 70 }],
    shadows: [{ x: 330, y: 60, w: 140, h: 70 }, { x: 60, y: 330, w: 110, h: 100 }],
    intel: [
      { x: 480, y: 230, label: 'Catalogue' },
      { x: 320, y: 520, label: 'Ledger' },
      { x: 880, y: 90, label: 'Cipher' },
    ],
    guards: [
      {
        name: 'Mara',
        waypoints: [{ x: 320, y: 90 }, { x: 320, y: 540 }, { x: 90, y: 540 }, { x: 90, y: 90 }],
        speed: 66, coneRange: 195, coneAngleDeg: 70, pauseMs: 800, phase: 0,
      },
      {
        name: 'Ivo',
        waypoints: [{ x: 640, y: 90 }, { x: 640, y: 540 }, { x: 480, y: 540 }, { x: 480, y: 90 }],
        speed: 60, coneRange: 185, coneAngleDeg: 66, pauseMs: 1000, phase: 0.33,
      },
      {
        name: 'Sable',
        waypoints: [{ x: 880, y: 200 }, { x: 880, y: 420 }, { x: 760, y: 420 }, { x: 760, y: 200 }],
        speed: 72, coneRange: 200, coneAngleDeg: 72, pauseMs: 700, phase: 0.66,
      },
    ],
  },
  {
    name: 'Rooftops',
    seed: 303,
    brief: 'Fast wardens, long sightlines, thin cover.',
    hint: 'Shadows are your only real cover up here.',
    parTime: 120,
    playerStart: { x: 60, y: 520 },
    exit: { x: 884, y: 40, w: 44, h: 44 },
    walls: [
      { x: 0, y: 0, w: 960, h: 16 }, { x: 0, y: 584, w: 960, h: 16 },
      { x: 0, y: 0, w: 16, h: 600 }, { x: 944, y: 0, w: 16, h: 600 },
      { x: 240, y: 180, w: 180, h: 24 }, { x: 540, y: 396, w: 180, h: 24 },
    ],
    crates: [
      { x: 150, y: 120, w: 52, h: 52 }, { x: 770, y: 430, w: 52, h: 52 },
    ],
    bushes: [{ x: 300, y: 300, w: 90, h: 60 }],
    shadows: [{ x: 90, y: 240, w: 110, h: 120 }, { x: 400, y: 470, w: 160, h: 70 }],
    intel: [
      { x: 480, y: 300, label: 'Roof key' },
      { x: 90, y: 90, label: 'Blueprint' },
      { x: 880, y: 520, label: 'Manifest' },
    ],
    guards: [
      {
        name: 'Mara',
        waypoints: [{ x: 480, y: 80 }, { x: 480, y: 520 }, { x: 120, y: 520 }, { x: 120, y: 80 }],
        speed: 78, coneRange: 215, coneAngleDeg: 74, pauseMs: 600, phase: 0,
      },
      {
        name: 'Ivo',
        waypoints: [{ x: 840, y: 80 }, { x: 840, y: 520 }, { x: 620, y: 520 }, { x: 620, y: 80 }],
        speed: 74, coneRange: 210, coneAngleDeg: 72, pauseMs: 700, phase: 0.4,
      },
      {
        name: 'Sable',
        waypoints: [{ x: 300, y: 300 }, { x: 660, y: 300 }, { x: 660, y: 120 }, { x: 300, y: 120 }],
        speed: 84, coneRange: 220, coneAngleDeg: 76, pauseMs: 500, phase: 0.75,
      },
    ],
  },
];

const STEP = 1 / 60; // fixed timestep, seconds
const LEVEL_DATA = Array.isArray(LEVELS) && LEVELS.length > 0 ? LEVELS : FALLBACK_LEVELS;
const SCREENS = ['title', 'level-complete', 'win', 'caught', 'pause'];

function el(id) {
  return document.getElementById(id);
}

function showScreen(name) {
  // Exactly one DOM screen visible at a time; null hides them all.
  for (const key of SCREENS) {
    const section = el(`screen-${key}`);
    if (section) section.hidden = key !== name;
  }
}

export function boot() {
  const canvas = el('game');
  const ctx = canvas.getContext('2d');
  const input = createInput(canvas);

  let levelIndex = 0;
  let totalScore = 0;
  let totalTime = 0;
  let runSpotted = 0;
  let screen = 'title'; // title | playing | paused | level-complete | caught | win
  let crouchLatch = false; // C toggles sneaking; holding Shift sneaks too
  let footstepTimer = 0;
  let toastTimer = 0;
  let audioStarted = false;
  let game = createGame(LEVEL_DATA[0], 0, makeRng(LEVEL_DATA[0].seed || 1));
  canvas.width = game.w;
  canvas.height = game.h;

  function startLevel(index) {
    levelIndex = index;
    const def = LEVEL_DATA[levelIndex];
    game = createGame(def, levelIndex, makeRng(def.seed || 1));
    game.score = totalScore;
    canvas.width = game.w;
    canvas.height = game.h;
    screen = 'playing';
    showScreen(null);
  }

  function startGame() {
    totalScore = 0;
    totalTime = 0;
    runSpotted = 0;
    startLevel(0);
  }

  function quitToTitle() {
    totalScore = 0;
    totalTime = 0;
    runSpotted = 0;
    levelIndex = 0;
    game = createGame(LEVEL_DATA[0], 0, makeRng(LEVEL_DATA[0].seed || 1));
    canvas.width = game.w;
    canvas.height = game.h;
    screen = 'title';
    showScreen('title');
  }

  function alertWord() {
    if (game.guards.some((g) => g.state === 'chase')) return 'Hunted';
    if (game.guards.some((g) => g.state === 'suspicious')) return 'Suspicious';
    return 'Unseen';
  }

  function toast(message) {
    const node = el('toast');
    if (!node) return;
    node.textContent = message;
    toastTimer = 2.4;
  }

  function ensureAudio() {
    if (audioStarted) return;
    if (initAudio()) {
      audioStarted = true;
      startAmbient();
    }
  }

  function updateMuteButton() {
    const btn = el('btn-mute');
    if (btn) btn.textContent = isMuted() ? 'Sound: off' : 'Sound: on';
  }

  function toggleMute() {
    ensureAudio();
    setMuted(!isMuted());
    updateMuteButton();
    return isMuted();
  }

  function updateHud() {
    const totalSeconds = totalTime + (screen === 'playing' ? game.time : 0);
    const setText = (id, text) => {
      const node = el(id);
      if (node) node.textContent = text;
    };
    setText('hud-timer', formatTime(totalSeconds));
    setText('hud-score', String(game.score));
    setText('hud-level', `${levelIndex + 1} / ${LEVEL_DATA.length}`);
    setText('hud-objective', `Parcels ${game.intelCollected} / ${game.intelTotal}`);
    setText('hud-crouch', game.player.crouched ? 'Crouching' : 'Standing');
    setText('hud-alert', alertWord());
    const visibility = Math.round(game.visibility * 100);
    const visFill = el('hud-visibility-fill');
    if (visFill) visFill.style.width = `${visibility}%`;
    const visMeter = el('hud-visibility');
    if (visMeter) visMeter.setAttribute('aria-valuenow', String(visibility));
    setText(
      'hud-visibility-text',
      game.visibility >= 1 ? 'Spotted' : game.visibility > 0.45 ? 'Exposed' : 'Hidden',
    );
    const noisePct = Math.round(Math.min(1, game.noise / 150) * 100);
    const noiseFill = el('hud-noise-fill');
    if (noiseFill) noiseFill.style.width = `${noisePct}%`;
    const noiseMeter = el('hud-noise');
    if (noiseMeter) noiseMeter.setAttribute('aria-valuenow', String(noisePct));
    setText(
      'hud-noise-text',
      game.noise <= 0 ? 'Silent' : game.player.crouched ? 'Heard' : 'Loud',
    );
    if (toastTimer > 0) {
      toastTimer -= STEP;
      if (toastTimer <= 0) {
        const node = el('toast');
        if (node) node.textContent = '';
      }
    }
  }

  function fillLevelComplete() {
    const setText = (id, text) => {
      const node = el(id);
      if (node) node.textContent = text;
    };
    setText('level-complete-sub', `${game.levelName} cleared — unseen.`);
    setText('level-complete-time', formatTime(game.time));
    setText('level-complete-score', String(game.score));
    setText('level-complete-spotted', String(runSpotted));
  }

  function fillWin() {
    const setText = (id, text) => {
      const node = el(id);
      if (node) node.textContent = text;
    };
    setText('win-time', formatTime(totalTime));
    setText('win-score', String(totalScore));
    setText('win-spotted', String(runSpotted));
  }

  function fillCaught() {
    const setText = (id, text) => {
      const node = el(id);
      if (node) node.textContent = text;
    };
    setText('caught-sub', game.statusReason || "A guard's lamp found you.");
    setText('caught-level', String(levelIndex + 1));
    setText('caught-score', String(game.score));
    setText('caught-time', formatTime(totalTime + game.time));
  }

  function onLevelComplete() {
    totalScore = game.score;
    totalTime += game.time;
    runSpotted += game.spotted;
    screen = 'level-complete';
    fillLevelComplete();
    showScreen('level-complete');
    playSound('win');
  }

  function onCaught() {
    totalTime += game.time;
    runSpotted += game.spotted;
    screen = 'caught';
    fillCaught();
    showScreen('caught');
    playSound('caught');
  }

  function nextLevel() {
    if (screen !== 'level-complete') return;
    if (levelIndex + 1 < LEVEL_DATA.length) {
      startLevel(levelIndex + 1);
    } else {
      screen = 'win';
      fillWin();
      showScreen('win');
      playSound('win');
    }
  }

  function pauseGame() {
    if (screen !== 'playing') return;
    screen = 'paused';
    showScreen('pause');
  }

  function resumeGame() {
    if (screen !== 'paused') return;
    screen = 'playing';
    showScreen(null);
  }

  function drainEvents() {
    for (const event of game.events) {
      if (event === 'pickup') {
        playSound('pickup');
        toast('Parcel collected');
      } else if (event === 'suspicious') {
        playSound('suspicious');
        toast('Guard suspicious…');
      } else if (event === 'alert') {
        playSound('alert');
        toast('Spotted — run!');
      }
    }
    game.events.length = 0;
  }

  function handleGlobalKeys() {
    if (input.wasPressed('KeyM')) toggleMute();
    if (input.wasPressed('KeyC')) crouchLatch = !crouchLatch;
    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
      if (screen === 'playing') pauseGame();
      else if (screen === 'paused') resumeGame();
    }
    if (input.wasPressed('KeyR') && screen !== 'title') {
      startLevel(levelIndex);
      toast('Level restarted');
    }
    if (input.wasPressed('Enter') || input.wasPressed('Space')) {
      ensureAudio();
      if (screen === 'title') startGame();
      else if (screen === 'level-complete') nextLevel();
      else if (screen === 'caught' || screen === 'win') startGame();
    }
    // Any key or click is a user gesture: unlock audio once.
    if (input.takeClick()) ensureAudio();
  }

  function syncScreenFromGame() {
    if (game.status === 'level-complete' && screen === 'playing') onLevelComplete();
    else if (game.status === 'caught' && screen === 'playing') onCaught();
  }

  function getState() {
    return {
      screen,
      level: levelIndex + 1,
      score: game.score,
      timeMs: Math.round((totalTime + game.time) * 1000),
      parcelsCollected: game.intelCollected,
      parcelsTotal: game.intelTotal,
      alert: alertWord(),
      crouching: game.player.crouched,
      muted: isMuted(),
    };
  }

  // --- Buttons (B1 hook contract) ----------------------------------------
  function wireButton(id, fn) {
    const btn = el(id);
    if (btn) {
      btn.addEventListener('click', () => {
        ensureAudio();
        playSound('click');
        fn();
      });
    }
  }
  wireButton('btn-start', startGame);
  wireButton('btn-how', () => {
    const how = el('how-text');
    if (how) how.hidden = !how.hidden;
  });
  wireButton('btn-next-level', nextLevel);
  wireButton('btn-replay-level', () => startLevel(levelIndex));
  wireButton('btn-play-again', startGame);
  wireButton('btn-menu-win', quitToTitle);
  wireButton('btn-retry', () => startLevel(levelIndex));
  wireButton('btn-menu-caught', quitToTitle);
  wireButton('btn-resume', resumeGame);
  wireButton('btn-restart', () => startLevel(levelIndex));
  wireButton('btn-quit', quitToTitle);
  wireButton('btn-mute', toggleMute);
  updateMuteButton();

  // --- Screenshot / play-test hooks ---------------------------------------
  // setStateForShot only positions entities and sets state; it never
  // fakes a render.
  function setStateForShot(name) {
    if (name === 'overview') {
      startLevel(0);
      return 'overview';
    }
    if (name === 'hidden') {
      startLevel(0);
      const p = game.player;
      const crate = game.crates[0];
      if (crate) {
        // Crouch in the crate's shadow, on the side the patrol passes.
        p.x = crate.x + crate.w / 2;
        p.y = crate.y + crate.h + p.r + 2;
        p.crouched = true;
        crouchLatch = true;
      }
      const guard = game.guards[0];
      if (guard) {
        guard.state = 'patrol';
        guard.detection = 0;
        guard.wpIndex = 0;
      }
      return 'hidden';
    }
    if (name === 'alert') {
      startLevel(0);
      const guard = game.guards[0];
      const p = game.player;
      if (guard) {
        const ahead = 90;
        p.x = guard.x + Math.cos(guard.dir) * ahead;
        p.y = guard.y + Math.sin(guard.dir) * ahead;
        p.crouched = false;
        crouchLatch = false;
        guard.state = 'chase';
        guard.detection = 0.75;
        guard.lastSeen = { x: p.x, y: p.y };
        guard.loseTimer = 0;
        game.visibility = 0.75;
      }
      return 'alert';
    }
    if (name === 'caught') {
      setStateForShot('alert');
      const guard = game.guards[0];
      if (guard) {
        guard.x = game.player.x + 12;
        guard.y = game.player.y;
      }
      game.status = 'caught';
      game.statusReason = 'A warden caught you in the open.';
      onCaught();
      return 'caught';
    }
    if (name === 'win') {
      totalScore = game.score + 1200;
      totalTime += game.time;
      runSpotted += game.spotted;
      game.score = totalScore;
      game.status = 'level-complete';
      screen = 'win';
      fillWin();
      showScreen('win');
      return 'win';
    }
    return null;
  }

  window.ShadowCourier = {
    start: startGame,
    pause: pauseGame,
    resume: resumeGame,
    restartLevel: () => startLevel(levelIndex),
    nextLevel,
    quitToTitle,
    getState,
  };

  window.__game = {
    get state() {
      return screen;
    },
    get level() {
      return levelIndex;
    },
    get game() {
      return game;
    },
    get levels() {
      return LEVEL_DATA;
    },
    get levelsFromFallback() {
      return LEVEL_DATA === FALLBACK_LEVELS;
    },
    get muted() {
      return isMuted();
    },
    setStateForShot,
    startLevel,
    startGame,
    toggleMute,
  };

  let last = performance.now();
  let accumulator = 0;

  function frame(now) {
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    handleGlobalKeys();
    if (screen === 'playing') {
      // Stance: holding Shift sneaks, and C toggles a sneak latch.
      game.player.crouched = crouchLatch || input.sneakHeld();
      accumulator += elapsed;
      while (accumulator >= STEP) {
        updateGame(game, input, STEP);
        accumulator -= STEP;
        if (game.status !== 'playing') break;
      }
      // Footsteps: one soft step per stride while moving, never crouched.
      if (game.player.moving && !game.player.crouched) {
        footstepTimer -= elapsed;
        if (footstepTimer <= 0) {
          playSound('runstep');
          footstepTimer = 0.38;
        }
      } else if (game.player.moving) {
        footstepTimer -= elapsed;
        if (footstepTimer <= 0) {
          playSound('footstep');
          footstepTimer = 0.55;
        }
      }
      drainEvents();
      syncScreenFromGame();
    }
    renderGame(ctx, game, screen);
    updateHud();
    input.endFrame();
    requestAnimationFrame(frame);
  }

  showScreen('title');
  requestAnimationFrame(frame);
  return window.__game;
}

// Auto-boot in the browser only; a bare Node import stays side-effect free
// so syntax checks and the kit's tooling can load this module safely.
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  boot();
}
