// main.js — entry module for Shadow Courier.
// Canvas setup, fixed-timestep game loop, state machine
// (title / playing / paused / level-complete / caught / win), keyboard and
// mouse input, HUD updates, timer + score, and the window.__game hook the
// play-tester drives for screenshots.
// Levels come from ./levels.js (written by the level author); until that
// file exists, three small built-in fallback levels keep the game playable.
// This file never writes levels.js itself.

import { createGame, updateGame, TILE } from './engine.js';
import { createInput } from './input.js';
import { makeRng } from './random.js';
import { renderGame, formatTime } from './render.js';

// --- Fallback levels (used only when ./levels.js is absent) -------------
// Tile coords. Border walls ring every level; crates block sight and
// movement, bushes and shadows conceal the courier.
const FALLBACK_LEVELS = [
  {
    name: 'Vault',
    seed: 101,
    cols: 30,
    rows: 19,
    playerStart: { x: 2, y: 16 },
    exit: { x: 27, y: 1, w: 2, h: 2 },
    walls: [
      { x: 0, y: 0, w: 30, h: 1 }, { x: 0, y: 18, w: 30, h: 1 },
      { x: 0, y: 0, w: 1, h: 19 }, { x: 29, y: 0, w: 1, h: 19 },
      { x: 8, y: 4, w: 1, h: 7 }, { x: 18, y: 8, w: 1, h: 7 },
      { x: 12, y: 12, w: 6, h: 1 },
    ],
    crates: [
      { x: 5, y: 6, w: 2, h: 2 }, { x: 14, y: 4, w: 2, h: 2 },
      { x: 22, y: 12, w: 2, h: 2 }, { x: 10, y: 15, w: 2, h: 1 },
    ],
    bushes: [{ x: 4, y: 12, w: 3, h: 2 }, { x: 20, y: 5, w: 3, h: 2 }],
    shadows: [{ x: 15, y: 14, w: 5, h: 2 }, { x: 24, y: 8, w: 3, h: 3 }],
    intel: [{ x: 6, y: 3 }, { x: 16, y: 10 }, { x: 25, y: 15 }],
    guards: [
      { waypoints: [[6, 8], [14, 8], [14, 14], [6, 14]], speed: 55, range: 180 },
      { waypoints: [[22, 3], [22, 10], [26, 10], [26, 3]], speed: 62, range: 185 },
    ],
    par: 90,
  },
  {
    name: 'Archive',
    seed: 202,
    cols: 30,
    rows: 19,
    playerStart: { x: 2, y: 2 },
    exit: { x: 27, y: 16, w: 2, h: 2 },
    walls: [
      { x: 0, y: 0, w: 30, h: 1 }, { x: 0, y: 18, w: 30, h: 1 },
      { x: 0, y: 0, w: 1, h: 19 }, { x: 29, y: 0, w: 1, h: 19 },
      { x: 10, y: 3, w: 1, h: 8 }, { x: 19, y: 8, w: 1, h: 8 },
      { x: 6, y: 14, w: 8, h: 1 },
    ],
    crates: [
      { x: 5, y: 8, w: 2, h: 2 }, { x: 15, y: 5, w: 2, h: 2 },
      { x: 23, y: 13, w: 2, h: 2 }, { x: 13, y: 16, w: 2, h: 1 },
    ],
    bushes: [{ x: 3, y: 13, w: 3, h: 2 }, { x: 21, y: 3, w: 3, h: 2 }],
    shadows: [{ x: 12, y: 2, w: 5, h: 2 }, { x: 24, y: 10, w: 3, h: 3 }],
    intel: [{ x: 8, y: 16 }, { x: 15, y: 9 }, { x: 25, y: 4 }],
    guards: [
      { waypoints: [[4, 6], [12, 6], [12, 12], [4, 12]], speed: 60, range: 185 },
      { waypoints: [[20, 5], [20, 12], [26, 12], [26, 5]], speed: 66, range: 190 },
      { waypoints: [[14, 2], [14, 16]], speed: 50, range: 170 },
    ],
    par: 100,
  },
  {
    name: 'Rooftops',
    seed: 303,
    cols: 30,
    rows: 19,
    playerStart: { x: 2, y: 16 },
    exit: { x: 27, y: 2, w: 2, h: 2 },
    walls: [
      { x: 0, y: 0, w: 30, h: 1 }, { x: 0, y: 18, w: 30, h: 1 },
      { x: 0, y: 0, w: 1, h: 19 }, { x: 29, y: 0, w: 1, h: 19 },
      { x: 9, y: 5, w: 1, h: 7 }, { x: 15, y: 7, w: 1, h: 7 },
      { x: 21, y: 4, w: 1, h: 8 },
    ],
    crates: [
      { x: 5, y: 5, w: 2, h: 2 }, { x: 12, y: 13, w: 2, h: 2 },
      { x: 18, y: 3, w: 2, h: 2 }, { x: 24, y: 12, w: 2, h: 2 },
    ],
    bushes: [{ x: 4, y: 11, w: 3, h: 2 }, { x: 22, y: 8, w: 3, h: 2 }],
    shadows: [{ x: 14, y: 15, w: 5, h: 2 }, { x: 25, y: 5, w: 3, h: 3 }],
    intel: [{ x: 7, y: 2 }, { x: 17, y: 11 }, { x: 25, y: 16 }],
    guards: [
      { waypoints: [[6, 4], [13, 4], [13, 11], [6, 11]], speed: 66, range: 190 },
      { waypoints: [[19, 6], [25, 6], [25, 13], [19, 13]], speed: 70, range: 195 },
      { waypoints: [[3, 9], [27, 9]], speed: 58, range: 180 },
    ],
    par: 110,
  },
];

const STEP = 1 / 60; // fixed timestep, seconds

async function loadLevels() {
  try {
    const mod = await import('./levels.js');
    if (mod && Array.isArray(mod.LEVELS) && mod.LEVELS.length > 0) {
      return { levels: mod.LEVELS, fromFallback: false };
    }
  } catch (err) {
    // levels.js not written yet — fall through to the built-in levels.
  }
  return { levels: FALLBACK_LEVELS, fromFallback: true };
}

function findCanvas() {
  return (
    document.getElementById('game-canvas') ||
    document.querySelector('canvas') ||
    (() => {
      const canvas = document.createElement('canvas');
      canvas.id = 'game-canvas';
      document.body.appendChild(canvas);
      return canvas;
    })()
  );
}

function hudElement(id) {
  return document.getElementById(id);
}

export async function boot() {
  const { levels: LEVELS, fromFallback } = await loadLevels();
  const canvas = findCanvas();
  const ctx = canvas.getContext('2d');
  const input = createInput(canvas);

  let levelIndex = 0;
  let totalScore = 0;
  let totalTime = 0;
  let screen = 'title'; // title | playing | paused | level-complete | caught | win
  let muted = false;
  let game = createGame(LEVELS[0], 0, makeRng(LEVELS[0].seed || 1));
  canvas.width = game.w;
  canvas.height = game.h;

  function startLevel(index) {
    levelIndex = index;
    const def = LEVELS[levelIndex];
    game = createGame(def, levelIndex, makeRng(def.seed || 1));
    game.score = totalScore;
    canvas.width = game.w;
    canvas.height = game.h;
    screen = 'playing';
  }

  function startGame() {
    totalScore = 0;
    totalTime = 0;
    startLevel(0);
  }

  function updateHud() {
    const setText = (id, text) => {
      const el = hudElement(id);
      if (el) el.textContent = text;
    };
    setText('hud-time', formatTime(game.time + totalTime));
    setText('hud-score', String(game.score));
    setText('hud-level', `${game.levelName} (${levelIndex + 1}/${LEVELS.length})`);
    setText('hud-intel', `${game.intelCollected}/${game.intelTotal}`);
    setText('hud-state', screen);
    const detect = hudElement('hud-detect');
    if (detect) detect.style.width = `${Math.round(game.visibility * 100)}%`;
    const noise = hudElement('hud-noise');
    if (noise) noise.style.width = `${Math.round(Math.min(1, game.noise / 150) * 100)}%`;
    const message = hudElement('hud-message');
    if (message) {
      message.textContent =
        screen === 'caught'
          ? game.statusReason
          : screen === 'level-complete'
            ? game.statusReason
            : screen === 'title' && fromFallback
              ? 'Shadow Courier — playing fallback levels (levels.js not found yet)'
              : screen === 'title'
                ? 'Shadow Courier — press Enter to begin'
                : '';
    }
  }

  function handleGlobalKeys() {
    if (input.wasPressed('KeyP') && (screen === 'playing' || screen === 'paused')) {
      screen = screen === 'playing' ? 'paused' : 'playing';
    }
    if (input.wasPressed('KeyM')) {
      muted = !muted;
    }
    if (input.wasPressed('KeyR')) {
      if (screen !== 'title') startLevel(levelIndex);
    }
    if (input.wasPressed('Enter') || input.wasPressed('Space')) {
      if (screen === 'title') startGame();
      else if (screen === 'level-complete') {
        totalScore = game.score;
        totalTime += game.time;
        if (levelIndex + 1 < LEVELS.length) startLevel(levelIndex + 1);
        else screen = 'win';
      } else if (screen === 'caught' || screen === 'win') {
        startGame();
      }
    }
    // Mouse click on the title screen starts the game; in play it pings.
    if (input.takeClick() && screen === 'title') startGame();
  }

  function syncScreenFromGame() {
    if (game.status === 'level-complete' && screen === 'playing') {
      screen = 'level-complete';
    } else if (game.status === 'caught' && screen === 'playing') {
      screen = 'caught';
    }
  }

  let last = performance.now();
  let accumulator = 0;

  function frame(now) {
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    handleGlobalKeys();
    if (screen === 'playing') {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        updateGame(game, input, STEP);
        accumulator -= STEP;
        if (game.status !== 'playing') break;
      }
      syncScreenFromGame();
    }
    renderGame(ctx, game, screen);
    updateHud();
    input.endFrame();
    requestAnimationFrame(frame);
  }

  // --- Screenshot / play-test hook --------------------------------------
  // Only positions entities and sets state; it never fakes a render.
  function setStateForShot(name) {
    if (name === 'overview') {
      startLevel(0);
      return 'overview';
    }
    if (name === 'hidden') {
      startLevel(0);
      const p = game.player;
      // Crouch behind the first crate while the nearest guard patrols past.
      const crate = game.crates[0];
      if (crate) {
        p.x = crate.x + crate.w / 2;
        p.y = crate.y + crate.h + p.r + 2;
        p.crouched = true;
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
        // Put the courier inside the warden's cone, close and standing.
        const ahead = 90;
        p.x = guard.x + Math.cos(guard.dir) * ahead;
        p.y = guard.y + Math.sin(guard.dir) * ahead;
        p.crouched = false;
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
      screen = 'caught';
      return 'caught';
    }
    if (name === 'win') {
      totalScore = game.score + 1200;
      totalTime += game.time;
      game.score = totalScore;
      game.status = 'level-complete';
      screen = 'win';
      return 'win';
    }
    return null;
  }

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
      return LEVELS;
    },
    get levelsFromFallback() {
      return fromFallback;
    },
    get muted() {
      return muted;
    },
    setStateForShot,
    startLevel,
    startGame,
    toggleMute() {
      muted = !muted;
      return muted;
    },
  };

  requestAnimationFrame(frame);
  return window.__game;
}

// Auto-boot in the browser only; a bare Node import stays side-effect free
// so syntax checks and the kit's tooling can load this module safely.
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  boot();
}
