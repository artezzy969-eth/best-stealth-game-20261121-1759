// engine.js — core stealth simulation for Shadow Courier.
// Owns: player movement + collision, guard vision cones with line of
// sight, the detection meter, alert states, the noise system, and the
// win / lose checks. Rendering lives in render.js; input in input.js.
// Level data is plain data in pixel units (world 960x600, see levels.js);
// this module never touches the DOM, so it can be imported in Node for
// a syntax check or a headless simulation.
// The game reports events on game.events (drained by main.js each frame):
// 'pickup', 'suspicious', 'alert', 'caught', 'level-complete'.

import { Warden, angleDiff } from './guard.js';

export const WORLD_WIDTH = 960;
export const WORLD_HEIGHT = 600;

const PLAYER_RADIUS = 11;
const WALK_SPEED = 132; // px/s standing
const SNEAK_SPEED = 68; // px/s crouched
const CATCH_DIST = 20; // guard touches the player while alerted
const NOISE_WALK_RADIUS = 78; // px; crouching is silent
const NOISE_HEAR_RADIUS = 150; // guards hear a noise only this close

function asPxRect(rect) {
  return { x: rect.x, y: rect.y, w: rect.w, h: rect.h };
}

function asPxPoint(point) {
  return { x: point.x, y: point.y };
}

export function pointInRect(x, y, rect) {
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

export function circleHitsRect(cx, cy, r, rect) {
  const nx = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const ny = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

// Solid geometry: walls and crates block movement and sight.
export function solidsOf(game) {
  return game.solids;
}

export function pointBlocked(game, x, y) {
  for (const rect of game.solids) {
    if (pointInRect(x, y, rect)) return true;
  }
  return false;
}

// Line of sight by sampling points along the segment. Walls and crates
// block sight; bushes and shadows do not (they conceal instead).
export function hasLineOfSight(game, x0, y0, x1, y1) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / 7));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    if (pointBlocked(game, x, y)) return false;
  }
  return true;
}

// Move a circle (player or guard) with axis-separated collision so it
// slides along walls instead of sticking to corners. Returns true when
// the entity could not move at all on either axis (used as "arrived").
export function moveCircle(game, entity, dx, dy) {
  const r = entity.r !== undefined ? entity.r : PLAYER_RADIUS;
  let blockedX = false;
  let blockedY = false;
  const nx = entity.x + dx;
  if (!game.solids.some((rect) => circleHitsRect(nx, entity.y, r, rect))) {
    entity.x = nx;
  } else {
    blockedX = true;
  }
  const ny = entity.y + dy;
  if (!game.solids.some((rect) => circleHitsRect(entity.x, ny, r, rect))) {
    entity.y = ny;
  } else {
    blockedY = true;
  }
  // Keep entities inside the level bounds.
  entity.x = Math.max(r, Math.min(game.w - r, entity.x));
  entity.y = Math.max(r, Math.min(game.h - r, entity.y));
  return blockedX && blockedY;
}

export function playerConcealment(game) {
  // Returns a multiplier on how fast guards spot the player.
  // 1 = fully exposed; lower = hidden in a bush or shadow.
  const p = game.player;
  for (const bush of game.bushes) {
    if (pointInRect(p.x, p.y, bush)) return p.crouched ? 0.22 : 0.45;
  }
  for (const shadow of game.shadows) {
    if (pointInRect(p.x, p.y, shadow)) return p.crouched ? 0.4 : 0.55;
  }
  return 1;
}

export function guardSeesPlayer(game, guard) {
  const p = game.player;
  const dx = p.x - guard.x;
  const dy = p.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > guard.range) return false;
  const angle = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(guard.dir, angle)) > guard.halfAngle) return false;
  if (!hasLineOfSight(game, guard.x, guard.y, p.x, p.y)) return false;
  return true;
}

export function createGame(levelDef, levelIndex, rng) {
  // Level geometry is already in pixel units (world 960x600).
  const walls = (levelDef.walls || []).map(asPxRect);
  const crates = (levelDef.crates || []).map(asPxRect);
  const bushes = (levelDef.bushes || []).map(asPxRect);
  const shadows = (levelDef.shadows || []).map(asPxRect);
  const start = asPxPoint(levelDef.playerStart || { x: 60, y: 520 });
  const exit = asPxRect(levelDef.exit || { x: 884, y: 40, w: 44, h: 44 });
  const intel = (levelDef.intel || []).map((p) => {
    const pt = asPxPoint(p);
    return { ...pt, label: p.label || 'Parcel', taken: false, bob: rng ? rng.range(0, Math.PI * 2) : 0 };
  });

  const game = {
    levelDef,
    levelIndex,
    levelName: levelDef.name || `Level ${levelIndex + 1}`,
    cols: 0,
    rows: 0,
    w: levelDef.width || WORLD_WIDTH,
    h: levelDef.height || WORLD_HEIGHT,
    seed: levelDef.seed || 1,
    walls,
    crates,
    bushes,
    shadows,
    solids: [...walls, ...crates],
    exit,
    intel,
    intelTotal: intel.length,
    intelCollected: 0,
    player: {
      x: start.x,
      y: start.y,
      r: PLAYER_RADIUS,
      dir: -Math.PI / 2,
      crouched: false,
      moving: false,
      speed: 0,
      stepPhase: 0,
    },
    guards: (levelDef.guards || []).map((def) => new Warden(def, 1)),
    time: 0,
    score: 0,
    status: 'playing', // playing | level-complete | caught | win
    statusReason: '',
    noise: 0, // current noise radius in px (0 = silent)
    noiseX: 0,
    noiseY: 0,
    visibility: 0, // highest guard detection meter, 0..1
    spotted: 0, // times a guard has turned suspicious or started a chase
    events: [], // drained by main.js each frame: pickup/suspicious/alert/...
    par: levelDef.parTime || levelDef.par || 90,
    flash: 0, // red flash timer after being spotted
  };
  game.canSeePlayer = (guard) => guardSeesPlayer(game, guard);
  return game;
}

function updatePlayer(game, input, dt) {
  const p = game.player;
  const axis = input.axis();
  const moving = axis.x !== 0 || axis.y !== 0;
  p.moving = moving;
  const speed = p.crouched ? SNEAK_SPEED : WALK_SPEED;
  p.speed = moving ? speed : 0;
  if (moving) {
    p.dir = Math.atan2(axis.y, axis.x);
    p.stepPhase += dt * speed * 0.09;
    moveCircle(game, p, axis.x * speed * dt, axis.y * speed * dt);
  }

  // Noise: standing movement rustles; crouching is silent.
  if (moving && !p.crouched) {
    game.noise = NOISE_WALK_RADIUS;
    game.noiseX = p.x;
    game.noiseY = p.y;
  } else {
    game.noise = 0;
  }

  // Pick up intel by walking over it.
  for (const item of game.intel) {
    if (!item.taken && Math.hypot(item.x - p.x, item.y - p.y) < 24) {
      item.taken = true;
      game.intelCollected += 1;
      game.score += 150;
      game.events.push('pickup');
    }
  }
}

function updateDetection(game, dt) {
  const p = game.player;
  const conceal = playerConcealment(game);
  let maxSeen = 0;
  for (const guard of game.guards) {
    const sees = guardSeesPlayer(game, guard);
    if (sees) {
      const dist = Math.hypot(p.x - guard.x, p.y - guard.y);
      const closeness = 1.6 - (dist / guard.range) * 0.9; // closer = spotted faster
      const stance = p.crouched ? 0.5 : 1; // crouching halves the fill rate
      const rate = 0.55 * closeness * stance * conceal;
      guard.detection = Math.min(1, guard.detection + rate * dt);
      game.flash = Math.max(game.flash, 0.25);
    } else {
      guard.detection = Math.max(0, guard.detection - 0.22 * dt);
    }
    maxSeen = Math.max(maxSeen, guard.detection);
  }
  game.visibility = maxSeen;

  // A full meter means the alarm is raised: the guard knows where you are.
  // Count each fresh escalation so the results screen can report it.
  for (const guard of game.guards) {
    if (guard.detection >= 1 && guard.state !== 'chase') {
      guard.lastSeen = { x: p.x, y: p.y };
      guard.state = 'chase';
      guard.loseTimer = 0;
      game.spotted += 1;
      game.events.push('alert');
    } else if (guard.detection > 0.45 && guard.state === 'patrol' && guard.lastSeen) {
      game.spotted += 1;
      game.events.push('suspicious');
    }
  }
}

function updateNoise(game) {
  // A noise pulse draws nearby patrolling guards to investigate.
  if (game.noise <= 0) return;
  for (const guard of game.guards) {
    if (guard.state !== 'patrol') continue;
    const dist = Math.hypot(guard.x - game.noiseX, guard.y - game.noiseY);
    if (dist < NOISE_HEAR_RADIUS && dist < game.noise + 80) {
      guard.lastSeen = { x: game.noiseX, y: game.noiseY };
      guard.detection = Math.max(guard.detection, 0.5);
      guard.becomeSuspicious();
    }
  }
}

function checkEndConditions(game) {
  const p = game.player;
  // Caught: a chasing guard touches the player, or the alarm filled up.
  for (const guard of game.guards) {
    const dist = Math.hypot(p.x - guard.x, p.y - guard.y);
    if (guard.state === 'chase' && dist < CATCH_DIST) {
      game.status = 'caught';
      game.statusReason = 'A warden caught you in the open.';
      game.events.push('caught');
      return;
    }
  }
  if (game.visibility >= 1) {
    // Only a full meter while a guard is actively chasing ends the run;
    // otherwise the meter decays and the player gets a second chance.
    const chasing = game.guards.some((g) => g.state === 'chase');
    if (chasing) {
      game.status = 'caught';
      game.statusReason = 'The alarm went up — you were spotted.';
      game.events.push('caught');
      return;
    }
  }
  // Win this level: all intel collected, then reach the exit unseen.
  const inExit = pointInRect(p.x, p.y, game.exit);
  if (inExit && game.intelCollected >= game.intelTotal) {
    const timeBonus = Math.max(0, Math.round((game.par - game.time) * 8));
    const stealthBonus = Math.round((1 - game.visibility) * 100);
    game.score += 500 + timeBonus + stealthBonus;
    game.status = 'level-complete';
    game.statusReason = `Level clear! +500, time bonus +${timeBonus}, stealth +${stealthBonus}.`;
    game.events.push('level-complete');
  }
}

export function updateGame(game, input, dt) {
  if (game.status !== 'playing') return;
  game.time += dt;
  game.flash = Math.max(0, game.flash - dt);

  // Stance is owned by main.js: holding Shift sneaks, and C toggles a
  // sneak latch. The engine only reads game.player.crouched.
  updatePlayer(game, input, dt);
  updateDetection(game, dt);
  updateNoise(game);
  for (const guard of game.guards) {
    guard.update(dt, game, (entity, dx, dy) => moveCircle(game, entity, dx, dy));
  }
  checkEndConditions(game);
}
