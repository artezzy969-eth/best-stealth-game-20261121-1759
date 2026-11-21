// levels.js — level data for "Shadow Courier", a top-down stealth game.
// Data only: no game logic lives here. The engine (engine.js, owned by
// B2) reads LEVELS through main.js's dynamic import and steps the
// simulation; this file only describes the three depot floors: where
// the walls, cover, shadows, bushes, guards, intel and exits are.
//
// SHAPE CONTRACT — tile grid, matching B2's engine (TILE = 32 px,
// world 30 cols x 19 rows = 960 x 608 px), guard.js's Warden, and
// main.js's FALLBACK_LEVELS:
//   LEVELS: Array<{
//     name: string, seed: number, cols: number, rows: number,
//     brief: string, hint: string, par: number,          // par: seconds
//     playerStart: { x, y },                              // tile coords
//     exit: { x, y, w, h },                               // tile rect
//     walls: Array<{ x, y, w, h }>,                       // tile rects
//     crates: Array<{ x, y, w, h }>,
//     shadows: Array<{ x, y, w, h }>,
//     bushes: Array<{ x, y, w, h }>,
//     guards: Array<{
//       name: string, seed: number,
//       waypoints: Array<[number, number]>,  // tile coords, looped in order
//       speed: number,        // px/s on patrol
//       range: number,        // vision range, px
//       halfAngle: number,    // half of the vision cone, radians
//       pause: number,        // seconds waited at each waypoint
//       phase: number         // 0..1: where along the loop the guard starts;
//                            // encoded by rotating `waypoints` (see
//                            // guard.js), so guards on one floor never
//                            // march in lockstep
//     }>,
//     intel: Array<{ x, y, label: string }>               // tile coords
//   }>
//
// Patrol clearance: every guard leg was checked against the level's
// solids (walls + crates, converted to pixels) with the guard's 11 px
// radius in mind — each leg runs in a corridor clear of solid
// geometry, so a patrol can never wedge itself against a wall.
// (engine.moveCircle slides along walls, but a leg aimed straight
// through a solid would stall the patrol, so the routes avoid that.)

export const WORLD = { width: 960, height: 608 };
export const TILE = 32;
export const COLS = 30;
export const ROWS = 19;

// Perimeter walls shared by every level: a 1-tile frame so the player
// and guards can never leave the floor. Levels add interior walls
// on top of these.
const FRAME = [
  { x: 0, y: 0, w: 30, h: 1 },
  { x: 0, y: 18, w: 30, h: 1 },
  { x: 0, y: 0, w: 1, h: 19 },
  { x: 29, y: 0, w: 1, h: 19 },
];

export const LEVELS = [
  {
    name: 'The Vault',
    seed: 1101,
    cols: 30,
    rows: 19,
    brief: 'Opening night. Two guards walk the gallery floor. Slip past the crates, cross the dark corners, and reach the green exit door.',
    hint: 'Crouch (hold Shift) to move quietly. Crates block sight; shadows hide you.',
    par: 75,
    playerStart: { x: 1, y: 16 },
    exit: { x: 27, y: 1, w: 2, h: 2 },
    walls: [
      ...FRAME,
      // Central gallery partition with a gap on each side.
      { x: 13, y: 4, w: 3, h: 1 },
      { x: 13, y: 14, w: 3, h: 1 },
      // Vault door block, top right — forces a detour around it.
      { x: 22, y: 0, w: 1, h: 5 },
      // Low display plinth, bottom left.
      { x: 6, y: 13, w: 4, h: 1 },
    ],
    crates: [
      { x: 7, y: 6, w: 2, h: 2 },
      { x: 9, y: 6, w: 2, h: 2 },
      { x: 17, y: 9, w: 2, h: 2 },
      { x: 20, y: 9, w: 2, h: 2 },
      { x: 8, y: 15, w: 2, h: 2 },
      { x: 24, y: 6, w: 2, h: 2 },
    ],
    shadows: [
      { x: 4, y: 3, w: 4, h: 3 },
      { x: 19, y: 13, w: 5, h: 3 },
      { x: 26, y: 9, w: 3, h: 3 },
    ],
    bushes: [
      { x: 12, y: 8, w: 3, h: 2 },
      { x: 5, y: 9, w: 3, h: 2 },
    ],
    guards: [
      {
        name: 'Mara',
        seed: 11,
        // Legs at tile x=12 (px 384, clear of the partitions at px 416
        // and the crates) and tile x=4 (px 144, clear of the plinth).
        waypoints: [
          [12, 3],
          [12, 17],
          [4, 17],
          [4, 3],
        ],
        speed: 62,
        range: 190,
        halfAngle: 0.593,
        pause: 0.9,
        phase: 0,
      },
      {
        name: 'Ivo',
        seed: 23,
        // Rotated by half the loop (phase 0.5): starts at the far corner
        // while Mara starts at the near one. Legs at tile x=23 (px 752,
        // clear of the vault block ending px 736) and x=27 (px 880).
        waypoints: [
          [23, 16],
          [23, 8],
          [27, 8],
          [27, 16],
        ],
        speed: 55,
        range: 175,
        halfAngle: 0.559,
        pause: 1.2,
        phase: 0.5,
      },
    ],
    intel: [
      { x: 15, y: 9, label: 'Floor plan' },
      { x: 27, y: 16, label: 'Key code' },
    ],
  },
  {
    name: 'The Archive',
    seed: 2202,
    cols: 30,
    rows: 19,
    brief: 'Three guards, tighter shelves, thicker hedges. Learn the patrol rhythm, then move shelf to shelf when the cones turn away.',
    hint: 'Bushes hide you completely while crouched. Watch the cone sweep before crossing the middle aisle.',
    par: 105,
    playerStart: { x: 1, y: 2 },
    exit: { x: 27, y: 16, w: 2, h: 2 },
    walls: [
      ...FRAME,
      // Archive shelving rows, each with a gap to slip through.
      { x: 6, y: 5, w: 7, h: 1 },
      { x: 17, y: 5, w: 7, h: 1 },
      { x: 6, y: 9, w: 7, h: 1 },
      { x: 17, y: 13, w: 7, h: 1 },
      { x: 6, y: 13, w: 4, h: 1 },
      // Reading-desk block, centre.
      { x: 13, y: 9, w: 3, h: 2 },
    ],
    crates: [
      { x: 3, y: 7, w: 2, h: 2 },
      { x: 14, y: 3, w: 2, h: 2 },
      { x: 26, y: 8, w: 2, h: 2 },
      { x: 4, y: 15, w: 2, h: 2 },
      { x: 22, y: 14, w: 2, h: 2 },
    ],
    shadows: [
      { x: 10, y: 2, w: 4, h: 2 },
      { x: 2, y: 10, w: 3, h: 3 },
      { x: 24, y: 2, w: 4, h: 3 },
      { x: 15, y: 16, w: 5, h: 2 },
    ],
    bushes: [
      { x: 13, y: 6, w: 3, h: 2 },
      { x: 8, y: 11, w: 3, h: 2 },
      { x: 20, y: 10, w: 3, h: 2 },
    ],
    guards: [
      {
        name: 'Mara',
        seed: 11,
        // West loop: legs at tile x=2 (px 80) and x=13 (px 432, clear
        // of the shelf ends and the crate at px 448), aisles at y=3
        // and y=6 (above the crate row, below the shelf row).
        waypoints: [
          [2, 3],
          [13, 3],
          [13, 6],
          [2, 6],
        ],
        speed: 66,
        range: 195,
        halfAngle: 0.611,
        pause: 0.8,
        phase: 0,
      },
      {
        name: 'Ivo',
        seed: 23,
        // Rotated by one stop (phase 0.33). East loop: legs at tile
        // x=24 (px 784, clear of the shelves ending px 768) and x=28.
        waypoints: [
          [24, 12],
          [28, 12],
          [28, 3],
          [24, 3],
        ],
        speed: 60,
        range: 185,
        halfAngle: 0.576,
        pause: 1.0,
        phase: 0.33,
      },
      {
        name: 'Sable',
        seed: 37,
        // Rotated by half the loop (phase 0.66). South loop: legs at
        // tile x=2 and x=24, aisles at y=12 and y=17 (tile 17's centre
        // is px 560, below the bottom crate row and above the frame;
        // tile 18 IS the frame wall, so no waypoint may use it).
        waypoints: [
          [24, 12],
          [2, 12],
          [2, 17],
          [24, 17],
        ],
        speed: 72,
        range: 200,
        halfAngle: 0.628,
        pause: 0.7,
        phase: 0.66,
      },
    ],
    intel: [
      { x: 15, y: 7, label: 'Catalogue' },
      { x: 10, y: 16, label: 'Ledger' },
      { x: 27, y: 3, label: 'Cipher' },
    ],
  },
  {
    name: 'The Rooftops',
    seed: 3303,
    cols: 30,
    rows: 19,
    brief: 'The night roof: fast guards, long sightlines, thin cover. Cross in the dark strips between the skylights and vanish before the sweep comes back.',
    hint: 'The roof is open — shadows are your only real cover. Sprint only between patrols; running is loud.',
    par: 120,
    playerStart: { x: 1, y: 16 },
    exit: { x: 27, y: 1, w: 2, h: 2 },
    walls: [
      ...FRAME,
      // Skylight housings: long low blocks that break sightlines.
      { x: 7, y: 6, w: 6, h: 1 },
      { x: 17, y: 6, w: 6, h: 1 },
      { x: 7, y: 12, w: 6, h: 1 },
      { x: 17, y: 12, w: 6, h: 1 },
      // Vent stack, centre — the middle gap (tiles 13–16) stays open.
      { x: 14, y: 8, w: 2, h: 2 },
    ],
    crates: [
      { x: 5, y: 4, w: 2, h: 2 },
      { x: 24, y: 4, w: 2, h: 2 },
      { x: 5, y: 13, w: 2, h: 2 },
      { x: 24, y: 13, w: 2, h: 2 },
    ],
    shadows: [
      { x: 3, y: 7, w: 3, h: 4 },
      { x: 24, y: 7, w: 3, h: 4 },
      { x: 12, y: 2, w: 5, h: 2 },
      { x: 12, y: 15, w: 5, h: 2 },
      { x: 14, y: 8, w: 2, h: 3 },
    ],
    bushes: [
      { x: 9, y: 9, w: 3, h: 2 },
      { x: 18, y: 9, w: 3, h: 2 },
    ],
    guards: [
      {
        name: 'Mara',
        seed: 11,
        // Middle-gap loop, left side of the vent: tile x=13 (px 432)
        // threads the 416–448 gap with room for the guard's radius.
        waypoints: [
          [13, 2],
          [13, 16],
          [4, 16],
          [4, 2],
        ],
        speed: 78,
        range: 215,
        halfAngle: 0.646,
        pause: 0.6,
        phase: 0,
      },
      {
        name: 'Ivo',
        seed: 23,
        // Rotated by one stop (phase 0.4). East loop: legs at tile
        // x=27 (px 880) and x=23 (px 752, clear of the skylight
        // housings ending px 736 and the crates starting px 768).
        waypoints: [
          [27, 16],
          [23, 16],
          [23, 2],
          [27, 2],
        ],
        speed: 74,
        range: 210,
        halfAngle: 0.628,
        pause: 0.7,
        phase: 0.4,
      },
      {
        name: 'Sable',
        seed: 37,
        // Rotated by three stops (phase 0.75). Middle-gap loop, right
        // side of the vent: tile x=16 (px 528) threads the 512–544
        // gap; aisles at y=4 and y=11, clear of the vent.
        waypoints: [
          [16, 4],
          [16, 11],
          [23, 11],
          [23, 4],
        ],
        speed: 84,
        range: 220,
        halfAngle: 0.663,
        pause: 0.5,
        phase: 0.75,
      },
    ],
    intel: [
      { x: 15, y: 11, label: 'Roof key' },
      { x: 3, y: 3, label: 'Blueprint' },
      { x: 27, y: 16, label: 'Manifest' },
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
