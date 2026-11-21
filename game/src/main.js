// main.js — entry module for Shadow Courier.
// Canvas setup, fixed-timestep game loop, state machine
// (title / playing / paused / level-complete / caught / win), keyboard and
// mouse input, DOM HUD + screen wiring exactly as index.html's hook
// contract specifies, timer + score, WebAudio hooks, and the two
// play-test APIs: window.ShadowCourier (B1's contract) and window.__game
// (screenshot shot states). Levels come from ./levels.js via loadLevels()
// below; three small built-in fallback levels in the same tile format
// are used only if LEVELS arrives empty.
// This file never writes levels.js itself.

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

// --- Fallback levels (same tile format as levels.js) --------------------
// Used only when ./levels.js is absent or exports an empty LEVELS array.
const FALLBACK_LEVELS = [
  {
    name: 'Vault',
    seed: 101,
    cols: 30,
    rows: 19,
    brief: 'Opening night. Two wardens walk the floor.',
    hint: 'Crouch in shadow. Crates block sight.',
    par: 90,
    playerStart: { x: 1, y: 16 },
    exit: { x: 27, y: 1, w: 2, h: 2 },
    walls: [
      { x: 0, y: 0, w: 30, h: 1 }, { x: 0, y: 18, w: 30, h: 1 },
      { x: 0, y: 0, w: 1, h: 19 }, { x: 29, y: 0, w: 1, h: 19 },
      { x: 13, y: 4, w: 3, h: 1 }, { x: 13, y: 14, w: 3, h: 1 },
    ],
    crates: [
      { x: 7, y: 6, w: 2, h: 2 }, { x: 17, y: 9, w: 2, h: 2 },
      { x: 8, y: 15, w: 2, h: 2 },
    ],
    bushes: [{ x: 12, y: 8, w: 3, h: 2 }],
    shadows: [{ x: 4, y: 3, w: 4, h: 3 }, { x: 19, y: 13, w: 5, h: 3 }],
    intel: [
      { x: 15, y: 9, label: 'Floor plan' },
      { x: 27, y: 16, label: 'Key code' },
    ],
    guards: [
      {
        name: 'Mara',
        seed: 11,
        waypoints: [[12, 3], [12, 17], [5, 17], [5, 3]],
        speed: 62, range: 190, halfAngle: 0.593, pause: 0.9, phase: 0,
      },
      {
        name: 'Ivo',
        seed: 23,
        waypoints: [[19, 15], [19, 6], [26, 6], [26, 15]],
        speed: 55, range: 175, halfAngle: 0.559, pause: 1.2, phase: 0.5,
      },
    ],
  },
  {
    name: 'Archive',
    seed: 202,
    cols: 30,
    rows: 19,
    brief: 'Three wardens, tighter shelves.',
    hint: 'Bushes hide you completely while crouched.',
    par: 105,
    playerStart: { x: 1, y: 2 },
    exit: { x: 27, y: 16, w: 2, h: 2 },
    walls: [
      { x: 0, y: 0, w: 30, h: 1 }, { x: 0, y: 18, w: 30, h: 1 },
      { x: 0, y: 0, w: 1, h: 19 }, { x: 29, y: 0, w: 1, h: 19 },
      { x: 6, y: 5, w: 7, h: 1 }, { x: 17, y: 13, w: 7, h: 1 },
    ],
    crates: [
      { x: 3, y: 7, w: 2, h: 2 }, { x: 26, y: 8, w: 2, h: 2 },
      { x: 4, y: 15, w: 2, h: 2 },
    ],
    bushes: [{ x: 13, y: 6, w: 3, h: 2 }],
    shadows: [{ x: 10, y: 2, w: 4, h: 2 }, { x: 2, y: 10, w: 3, h: 3 }],
    intel: [
      { x: 15, y: 7, label: 'Catalogue' },
      { x: 10, y: 16, label: 'Ledger' },
      { x: 27, y: 3, label: 'Cipher' },
    ],
    guards: [
      {
        name: 'Mara',
        seed: 11,
        waypoints: [[16, 2], [16, 17], [3, 17], [3, 2]],
        speed: 66, range: 195, halfAngle: 0.611, pause: 0.8, phase: 0,
      },
      {
        name: 'Ivo',
        seed: 23,
        waypoints: [[25, 17], [24, 17], [24, 3], [25, 3]],
        speed: 60, range: 185, halfAngle: 0.576, pause: 1.0, phase: 0.33,
      },
      {
        name: 'Sable',
        seed: 37,
        waypoints: [[24, 13], [24, 6], [28, 6], [28, 13]],
        speed: 72, range: 200, halfAngle: 0.628, pause: 0.7, phase: 0.66,
      },
    ],
  },
  {
    name: 'Rooftops',
    seed: 303,
    cols: 30,
    rows: 19,
    brief: 'Fast wardens, long sightlines, thin cover.',
    hint: 'Shadows are your only real cover up here.',
    par: 120,
    playerStart: { x: 1, y: 16 },
    exit: { x: 27, y: 1, w: 2, h: 2 },
    walls: [
      { x: 0, y: 0, w: 30, h: 1 }, { x: 0, y: 18, w: 30, h: 1 },
      { x: 0, y: 0, w: 1, h: 19 }, { x: 29, y: 0, w: 1, h: 19 },
      { x: 7, y: 6, w: 6, h: 1 }, { x: 17, y: 12, w: 6, h: 1 },
    ],
    crates: [
      { x: 5, y: 4, w: 2, h: 2 }, { x: 24, y: 13, w: 2, h: 2 },
    ],
    bushes: [{ x: 9, y: 9, w: 3, h: 2 }],
    shadows: [{ x: 3, y: 7, w: 3, h: 4 }, { x: 12, y: 15, w: 5, h: 2 }],
    intel: [
      { x: 15, y: 11, label: 'Roof key' },
      { x: 3, y: 3, label: 'Blueprint' },
      { x: 27, y: 16, label: 'Manifest' },
    ],
    guards: [
      {
        name: 'Mara',
        seed: 11,
        waypoints: [[13, 2], [13, 16], [4, 16], [4, 2]],
        speed: 78, range: 215, halfAngle: 0.646, pause: 0.6, phase: 0,
      },
      {
        name: 'Ivo',
        seed: 23,
        waypoints: [[26, 16], [23, 16], [23, 2], [26, 2]],
        speed: 74, range: 210, halfAngle: 0.628, pause: 0.7, phase: 0.4,
      },
      {
        name: 'Sable',
        seed: 37,
        waypoints: [[13, 4], [13, 11], [16, 11], [16, 4]],
        speed: 84, range: 220, halfAngle: 0.663, pause: 0.5, phase: 0.75,
      },
    ],
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

export async function boot() {
  const { levels: LEVEL_DATA, fromFallback } = await loadLevels();
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
    // F7 fix: "unseen" is only true when the run was never spotted.
    // Word the sub-line from runSpotted so a spotted clear never
    // claims to be unseen.
    const spottedWord =
      runSpotted === 0
        ? `${game.levelName} cleared — unseen.`
        : runSpotted === 1
          ? `${game.levelName} cleared — spotted 1 time.`
          : `${game.levelName} cleared — spotted ${runSpotted} times.`;
    setText('level-complete-sub', spottedWord);
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
    // F5 fix: onCaught() already folded this level's time into
    // totalTime before calling fillCaught(), so adding game.time
    // again here doubled the displayed time (00:05 became 00:10).
    setText('caught-time', formatTime(totalTime));
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
        // F3 fix: the old shot put the player 90 px ahead of a chasing
        // guard at detection 0.75, so the guard closed the gap and the
        // run was already 'caught' <1 s later — no alert frame could
        // ever be captured. Three changes make the shot stable:
        //   1. the player stands ~150 px ahead, nudged sideways out of
        //      the bush, so the guard's red cone still reaches them
        //      but the gap is wider;
        //   2. detection stays 0.75 in 'chase' so the HUD reads
        //      Hunted / Exposed, exactly the alert moment;
        //   3. game.shotHold freezes the simulation (the frame loop
        //      skips updateGame while it is set) so the guard cannot
        //      move, the meter cannot fill and the run cannot flip to
        //      'caught' while the screenshot is taken. startLevel()
        //      builds a fresh game object, so the hold never leaks
        //      into normal play.
        const ahead = 150;
        const side = 80;
        const px = guard.x + Math.cos(guard.dir) * ahead - Math.sin(guard.dir) * side;
        const py = guard.y + Math.sin(guard.dir) * ahead + Math.cos(guard.dir) * side;
        p.x = px;
        p.y = py;
        p.crouched = false;
        crouchLatch = false;
        guard.state = 'chase';
        guard.detection = 0.75;
        guard.lastSeen = { x: p.x, y: p.y };
        guard.loseTimer = 0;
        game.visibility = 0.75;
        game.shotHold = true;
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
      // F4 fix: the old helper only flipped the screen to 'win', so
      // the overlay ("GHOST RUN COMPLETE / Nobody saw a thing") sat
      // over a HUD that still read Hunted / Exposed with 0/2 parcels
      // and a guard mid-chase behind it. Rebuild a clean ghost run
      // from level 1 first, then stage it as a completed win: every
      // parcel collected, every guard back on patrol with an empty
      // detection meter, visibility 0, and runSpotted 0 so the win
      // screen's "Times spotted 0" agrees with "Nobody saw a thing".
      // The player stands at the exit they just slipped through.
      startLevel(0);
      for (const item of game.intel) item.taken = true;
      game.intelCollected = game.intelTotal;
      for (const guard of game.guards) {
        guard.state = 'patrol';
        guard.detection = 0;
        guard.lastSeen = null;
        guard.loseTimer = 0;
        guard.lookTimer = 0;
        guard.suspicionPoint = null;
      }
      game.visibility = 0;
      game.flash = 0;
      game.spotted = 0;
      runSpotted = 0;
      game.player.x = game.exit.x + game.exit.w / 2;
      game.player.y = game.exit.y + game.exit.h / 2;
      totalScore = game.score + 1200;
      totalTime += game.time;
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
      return fromFallback;
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
    // F3: a shot state may freeze the simulation (game.shotHold) so a
    // staged alert frame stays put for the screenshot; rendering and
    // the HUD still update every frame. Normal play never sets it.
    if (screen === 'playing' && !game.shotHold) {
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
