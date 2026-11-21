// levels.js — level data for "Night Shift", a top-down stealth game.
// Data only: no game logic lives here. The engine (main.js / guard.js /
// render.js, owned by B2) reads LEVELS and steps the simulation; this file
// only describes the three museum-night levels: where the walls, cover,
// shadows, bushes, guards, intel and exits are.
//
// Coordinate system: a fixed logical world, WORLD.width x WORLD.height
// units, drawn 1:1 onto the game canvas. x grows right, y grows down.
// All rects are { x, y, w, h } in world units. Guard waypoints are
// { x, y } points the guard walks between in order, then loops.
// coneAngleDeg is the guard's full vision-cone angle in degrees.
// speed is world units per second. pauseMs is the wait at each waypoint.
// parTime is seconds: finishing faster earns a time bonus.
//
// Shape contract (agreed for B2's import `import { LEVELS } from './levels.js'`):
//   LEVELS: Array<{
//     name: string, seed: number, brief: string, hint: string,
//     parTime: number,
//     playerStart: { x: number, y: number },
//     exit: { x: number, y: number, w: number, h: number },
//     walls: Array<{ x, y, w, h }>,
//     crates: Array<{ x, y, w, h }>,
//     shadows: Array<{ x, y, w, h }>,
//     bushes: Array<{ x, y, w, h }>,
//     guards: Array<{
//       name: string,
//       waypoints: Array<{ x, y }>,
//       speed: number, coneRange: number, coneAngleDeg: number,
//       pauseMs: number,
//       phase: number  // 0..1: where along the patrol loop the guard starts,
//                      // so guards on one level never march in lockstep
//     }>,
//     intel: Array<{ x, y, label: string }>
//   }>

export const WORLD = { width: 960, height: 600 };

// Perimeter walls shared by every level: a 16-unit frame so the player
// and guards can never leave the floor. Levels add their own interior
// walls on top of these.
const FRAME = [
  { x: 0, y: 0, w: 960, h: 16 },
  { x: 0, y: 584, w: 960, h: 16 },
  { x: 0, y: 0, w: 16, h: 600 },
  { x: 944, y: 0, w: 16, h: 600 },
];

export const LEVELS = [
  {
    name: 'The Vault',
    seed: 1101,
    brief: 'Opening night. Two guards walk the gallery floor. Slip past the crates, cross the dark corners, and reach the green exit door.',
    hint: 'Crouch (hold Shift) to move quietly. Crates block sight; shadows hide you.',
    parTime: 75,
    playerStart: { x: 60, y: 520 },
    exit: { x: 884, y: 40, w: 44, h: 44 },
    walls: [
      ...FRAME,
      // Central gallery partition with a gap on each side.
      { x: 430, y: 120, w: 100, h: 24 },
      { x: 430, y: 456, w: 100, h: 24 },
      // Vault door block, top right — forces a detour around it.
      { x: 700, y: 16, w: 24, h: 150 },
      // Low display plinth, bottom left.
      { x: 180, y: 420, w: 140, h: 20 },
    ],
    crates: [
      { x: 220, y: 180, w: 56, h: 56 },
      { x: 300, y: 180, w: 56, h: 56 },
      { x: 560, y: 300, w: 56, h: 56 },
      { x: 640, y: 300, w: 56, h: 56 },
      { x: 260, y: 470, w: 56, h: 56 },
      { x: 760, y: 180, w: 56, h: 56 },
    ],
    shadows: [
      { x: 120, y: 90, w: 130, h: 90 },
      { x: 620, y: 430, w: 150, h: 90 },
      { x: 830, y: 300, w: 90, h: 110 },
    ],
    bushes: [
      { x: 400, y: 250, w: 90, h: 70 },
      { x: 150, y: 300, w: 80, h: 60 },
    ],
    guards: [
      {
        name: 'Mara',
        waypoints: [
          { x: 480, y: 100 },
          { x: 480, y: 500 },
          { x: 200, y: 500 },
          { x: 200, y: 100 },
        ],
        speed: 62,
        coneRange: 190,
        coneAngleDeg: 68,
        pauseMs: 900,
        phase: 0,
      },
      {
        name: 'Ivo',
        waypoints: [
          { x: 820, y: 120 },
          { x: 820, y: 480 },
          { x: 600, y: 480 },
          { x: 600, y: 120 },
        ],
        speed: 55,
        coneRange: 175,
        coneAngleDeg: 64,
        pauseMs: 1200,
        phase: 0.5,
      },
    ],
    intel: [
      { x: 500, y: 300, label: 'Floor plan' },
      { x: 880, y: 520, label: 'Key code' },
    ],
  },
  {
    name: 'The Archive',
    seed: 2202,
    brief: 'Three guards, tighter shelves, thicker hedges. Learn the patrol rhythm, then move shelf to shelf when the cones turn away.',
    hint: 'Bushes hide you completely while crouched. Watch the cone sweep before crossing the middle aisle.',
    parTime: 105,
    playerStart: { x: 60, y: 60 },
    exit: { x: 884, y: 516, w: 44, h: 44 },
    walls: [
      ...FRAME,
      // Archive shelving rows, each with a gap to slip through.
      { x: 200, y: 150, w: 220, h: 22 },
      { x: 540, y: 150, w: 220, h: 22 },
      { x: 200, y: 300, w: 220, h: 22 },
      { x: 540, y: 430, w: 220, h: 22 },
      { x: 200, y: 430, w: 120, h: 22 },
      // Reading-desk block, centre.
      { x: 430, y: 280, w: 100, h: 64 },
    ],
    crates: [
      { x: 90, y: 220, w: 52, h: 52 },
      { x: 460, y: 90, w: 52, h: 52 },
      { x: 820, y: 250, w: 52, h: 52 },
      { x: 120, y: 480, w: 52, h: 52 },
      { x: 700, y: 500, w: 52, h: 52 },
    ],
    shadows: [
      { x: 330, y: 60, w: 140, h: 70 },
      { x: 60, y: 330, w: 110, h: 100 },
      { x: 780, y: 60, w: 120, h: 90 },
      { x: 480, y: 500, w: 150, h: 60 },
    ],
    bushes: [
      { x: 430, y: 180, w: 100, h: 70 },
      { x: 250, y: 360, w: 110, h: 70 },
      { x: 640, y: 330, w: 100, h: 70 },
    ],
    guards: [
      {
        name: 'Mara',
        waypoints: [
          { x: 320, y: 90 },
          { x: 320, y: 540 },
          { x: 90, y: 540 },
          { x: 90, y: 90 },
        ],
        speed: 66,
        coneRange: 195,
        coneAngleDeg: 70,
        pauseMs: 800,
        phase: 0,
      },
      {
        name: 'Ivo',
        waypoints: [
          { x: 640, y: 90 },
          { x: 640, y: 540 },
          { x: 480, y: 540 },
          { x: 480, y: 90 },
        ],
        speed: 60,
        coneRange: 185,
        coneAngleDeg: 66,
        pauseMs: 1000,
        phase: 0.33,
      },
      {
        name: 'Sable',
        waypoints: [
          { x: 880, y: 200 },
          { x: 880, y: 420 },
          { x: 760, y: 420 },
          { x: 760, y: 200 },
        ],
        speed: 72,
        coneRange: 200,
        coneAngleDeg: 72,
        pauseMs: 700,
        phase: 0.66,
      },
    ],
    intel: [
      { x: 480, y: 230, label: 'Catalogue' },
      { x: 320, y: 520, label: 'Ledger' },
      { x: 880, y: 90, label: 'Cipher' },
    ],
  },
  {
    name: 'The Rooftops',
    seed: 3303,
    brief: 'The night roof: fast guards, long sightlines, thin cover. Cross in the dark strips between the skylights and vanish before the sweep comes back.',
    hint: 'The roof is open — shadows are your only real cover. Sprint only between patrols; running is loud.',
    parTime: 120,
    playerStart: { x: 60, y: 520 },
    exit: { x: 884, y: 40, w: 44, h: 44 },
    walls: [
      ...FRAME,
      // Skylight housings: long low blocks that break sightlines.
      { x: 240, y: 180, w: 180, h: 24 },
      { x: 540, y: 180, w: 180, h: 24 },
      { x: 240, y: 396, w: 180, h: 24 },
      { x: 540, y: 396, w: 180, h: 24 },
      // Vent stack, centre.
      { x: 452, y: 268, w: 56, h: 64 },
    ],
    crates: [
      { x: 150, y: 120, w: 52, h: 52 },
      { x: 770, y: 120, w: 52, h: 52 },
      { x: 150, y: 430, w: 52, h: 52 },
      { x: 770, y: 430, w: 52, h: 52 },
    ],
    shadows: [
      { x: 90, y: 240, w: 110, h: 120 },
      { x: 760, y: 240, w: 110, h: 120 },
      { x: 400, y: 60, w: 160, h: 70 },
      { x: 400, y: 470, w: 160, h: 70 },
      { x: 440, y: 250, w: 80, h: 100 },
    ],
    bushes: [
      { x: 300, y: 300, w: 90, h: 60 },
      { x: 580, y: 300, w: 90, h: 60 },
    ],
    guards: [
      {
        name: 'Mara',
        waypoints: [
          { x: 480, y: 80 },
          { x: 480, y: 520 },
          { x: 120, y: 520 },
          { x: 120, y: 80 },
        ],
        speed: 78,
        coneRange: 215,
        coneAngleDeg: 74,
        pauseMs: 600,
        phase: 0,
      },
      {
        name: 'Ivo',
        waypoints: [
          { x: 840, y: 80 },
          { x: 840, y: 520 },
          { x: 620, y: 520 },
          { x: 620, y: 80 },
        ],
        speed: 74,
        coneRange: 210,
        coneAngleDeg: 72,
        pauseMs: 700,
        phase: 0.4,
      },
      {
        name: 'Sable',
        waypoints: [
          { x: 300, y: 300 },
          { x: 660, y: 300 },
          { x: 660, y: 120 },
          { x: 300, y: 120 },
        ],
        speed: 84,
        coneRange: 220,
        coneAngleDeg: 76,
        pauseMs: 500,
        phase: 0.75,
      },
    ],
    intel: [
      { x: 480, y: 300, label: 'Roof key' },
      { x: 90, y: 90, label: 'Blueprint' },
      { x: 880, y: 520, label: 'Manifest' },
    ],
  },
];

// Small lookup helpers for the engine and the HUD. Pure functions over
// the data above; they change no state.
export function levelByName(name) {
  return LEVELS.find((level) => level.name === name) || null;
}

export function levelCount() {
  return LEVELS.length;
}

// Total guard count across the game, for the HUD / progress display.
export function totalGuards() {
  return LEVELS.reduce((sum, level) => sum + level.guards.length, 0);
}

// Total intel pickups across the game.
export function totalIntel() {
  return LEVELS.reduce((sum, level) => sum + level.intel.length, 0);
}
