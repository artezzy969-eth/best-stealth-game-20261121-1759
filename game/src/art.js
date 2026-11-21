// art.js — original canvas-drawn art for "Shadow Courier".
// Every sprite here is drawn with canvas paths at run time: no image
// files, no external assets, nothing copied. B2's render.js imports the
// draw* helpers below and calls them each frame; the helpers never keep
// state between calls except the tiny wobble they derive from `time`.
//
// Palette (night-museum look):
//   floor tiles  #232a35 / #20262f   walls  #3a4354 with #4b5870 tops
//   crates       #7a5a33 / #8f6c3e   bushes #2f6b3a   shadows #10141c
//   player       teal #37c8a3        guards amber #e8a13a / alert #e84a3a
//   exit         green #46d17c       intel  gold #f2c94c
// Vision cones are translucent wedges: pale yellow when calm, orange
// when suspicious, red when chasing — so the cone itself tells the
// player how much danger they are in.
//
// All helpers take (ctx, ...) and draw in world coordinates. The engine
// is responsible for ctx.save/restore around calls that rotate.

export const PALETTE = {
  floorA: '#232a35',
  floorB: '#20262f',
  floorLine: '#2e3742',
  wall: '#3a4354',
  wallTop: '#4b5870',
  wallEdge: '#232a38',
  crate: '#7a5a33',
  crateTop: '#8f6c3e',
  crateEdge: '#543d20',
  bush: '#2f6b3a',
  bushDark: '#245430',
  bushLight: '#3f8a4c',
  shadow: '#10141c',
  player: '#37c8a3',
  playerDark: '#1f8a6d',
  guard: '#e8a13a',
  guardDark: '#9a6420',
  alert: '#e84a3a',
  suspicious: '#e8a13a',
  calm: '#e8c53a',
  exit: '#46d17c',
  intel: '#f2c94c',
};

function rect(ctx, x, y, w, h) {
  ctx.beginPath();
  ctx.rect(x, y, w, h);
}

// --- floor ---------------------------------------------------------------

// Checkerboard stone tiles with faint grout lines and a subtle vignette
// pulse. `time` is seconds; it only drives the faint lamp glow.
export function drawFloor(ctx, level, time) {
  const tile = 60;
  const { width, height } = { width: 960, height: 600 };
  for (let ty = 0; ty < height / tile; ty += 1) {
    for (let tx = 0; tx < width / tile; tx += 1) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(tx * tile, ty * tile, tile, tile);
    }
  }
  ctx.strokeStyle = PALETTE.floorLine;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= width; x += tile) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
  }
  for (let y = 0; y <= height; y += tile) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
  }
  ctx.stroke();
  // Faint warm lamp glow drifting slowly across the floor.
  const glowX = 480 + Math.sin(time * 0.12) * 120;
  const glow = ctx.createRadialGradient(glowX, 300, 40, glowX, 300, 420);
  glow.addColorStop(0, 'rgba(232, 197, 58, 0.05)');
  glow.addColorStop(1, 'rgba(232, 197, 58, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  void level;
}

// --- cover and walls ------------------------------------------------------

export function drawShadowZone(ctx, zone) {
  ctx.fillStyle = 'rgba(16, 20, 28, 0.78)';
  rect(ctx, zone.x, zone.y, zone.w, zone.h);
  ctx.fill();
  // Dotted rim so the safe dark patch reads at a glance.
  ctx.strokeStyle = 'rgba(120, 150, 190, 0.35)';
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(zone.x + 1, zone.y + 1, zone.w - 2, zone.h - 2);
  ctx.setLineDash([]);
}

export function drawBush(ctx, bush, time) {
  const wobble = Math.sin(time * 1.4 + bush.x * 0.05) * 1.5;
  ctx.fillStyle = PALETTE.bushDark;
  rect(ctx, bush.x, bush.y, bush.w, bush.h);
  ctx.fill();
  // Leafy blobs: overlapping circles make a readable hedge.
  ctx.fillStyle = PALETTE.bush;
  const cols = Math.max(2, Math.floor(bush.w / 26));
  const rows = Math.max(2, Math.floor(bush.h / 26));
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const cx = bush.x + ((c + 0.5) * bush.w) / cols + wobble * (r % 2 ? 1 : -1) * 0.4;
      const cy = bush.y + ((r + 0.5) * bush.h) / rows;
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = PALETTE.bushLight;
  ctx.beginPath();
  ctx.arc(bush.x + bush.w * 0.3, bush.y + bush.h * 0.35, 5, 0, Math.PI * 2);
  ctx.arc(bush.x + bush.w * 0.65, bush.y + bush.h * 0.6, 5, 0, Math.PI * 2);
  ctx.fill();
}

export function drawCrate(ctx, crate) {
  ctx.fillStyle = PALETTE.crateEdge;
  rect(ctx, crate.x + 2, crate.y + 3, crate.w, crate.h);
  ctx.fill();
  ctx.fillStyle = PALETTE.crate;
  rect(ctx, crate.x, crate.y, crate.w, crate.h);
  ctx.fill();
  ctx.fillStyle = PALETTE.crateTop;
  ctx.fillRect(crate.x, crate.y, crate.w, 10);
  // Cross planks + nails.
  ctx.strokeStyle = PALETTE.crateEdge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(crate.x + 4, crate.y + 4);
  ctx.lineTo(crate.x + crate.w - 4, crate.y + crate.h - 4);
  ctx.moveTo(crate.x + crate.w - 4, crate.y + 4);
  ctx.lineTo(crate.x + 4, crate.y + crate.h - 4);
  ctx.strokeRect(crate.x + 2, crate.y + 2, crate.w - 4, crate.h - 4);
  ctx.fillStyle = PALETTE.crateEdge;
  for (const [nx, ny] of [[8, 8], [crate.w - 8, 8], [8, crate.h - 8], [crate.w - 8, crate.h - 8]]) {
    ctx.beginPath();
    ctx.arc(crate.x + nx, crate.y + ny, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawWall(ctx, wall) {
  ctx.fillStyle = PALETTE.wallEdge;
  rect(ctx, wall.x + 2, wall.y + 3, wall.w, wall.h);
  ctx.fill();
  ctx.fillStyle = PALETTE.wall;
  rect(ctx, wall.x, wall.y, wall.w, wall.h);
  ctx.fill();
  // Light top edge so walls read as raised blocks from above.
  ctx.fillStyle = PALETTE.wallTop;
  if (wall.w >= wall.h) ctx.fillRect(wall.x, wall.y, wall.w, 5);
  else ctx.fillRect(wall.x, wall.y, 5, wall.h);
  // Rivets along long walls.
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  const step = 34;
  if (wall.w >= wall.h) {
    for (let x = wall.x + 14; x < wall.x + wall.w - 8; x += step) {
      ctx.fillRect(x, wall.y + wall.h / 2 - 1, 4, 2);
    }
  }
}

// --- vision cone ----------------------------------------------------------

// state: 'calm' | 'suspicious' | 'chase'. angle is radians, facing dir.
// halfAngleDeg is half of the cone's full angle.
export function drawVisionCone(ctx, x, y, angle, range, halfAngleDeg, state) {
  const half = (halfAngleDeg * Math.PI) / 180;
  const color =
    state === 'chase' ? '232, 74, 58' : state === 'suspicious' ? '232, 161, 58' : '232, 197, 58';
  const alpha = state === 'calm' ? 0.16 : 0.28;
  ctx.fillStyle = `rgba(${color}, ${alpha})`;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - half, angle + half);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(${color}, 0.45)`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - half, angle + half);
  ctx.closePath();
  ctx.stroke();
}

// --- figures ---------------------------------------------------------------

// Player: a small hooded figure, teal cloak, facing `angle`. When
// crouching the figure shrinks and hunches; when hidden it is drawn
// half-faded so the player can still find themselves in cover.
export function drawPlayer(ctx, x, y, angle, opts = {}) {
  const crouching = !!opts.crouching;
  const hidden = !!opts.hidden;
  const r = crouching ? 10 : 12;
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = hidden ? 0.55 : 1;
  // Soft ground shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.7, r, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cloak body.
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  // Hood + face direction tick.
  ctx.fillStyle = PALETTE.playerDark;
  ctx.beginPath();
  ctx.arc(Math.cos(angle) * r * 0.35, Math.sin(angle) * r * 0.35, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#eafff7';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(Math.cos(angle) * r * 0.5, Math.sin(angle) * r * 0.5);
  ctx.lineTo(Math.cos(angle) * (r + 7), Math.sin(angle) * (r + 7));
  ctx.stroke();
  if (crouching) {
    ctx.strokeStyle = 'rgba(234, 255, 247, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r + 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// Guard: amber uniform, dark cap, facing `angle`. A "?" floats above a
// suspicious guard and "!" above a chasing one; the exclamation pulses.
export function drawGuard(ctx, x, y, angle, state, time) {
  const r = 13;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.7, r, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = state === 'chase' ? PALETTE.alert : PALETTE.guard;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  // Cap brim pointing where the guard looks.
  ctx.fillStyle = PALETTE.guardDark;
  ctx.beginPath();
  ctx.arc(Math.cos(angle) * r * 0.3, Math.sin(angle) * r * 0.3, r * 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff3d6';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(angle) * (r + 6), Math.sin(angle) * (r + 6));
  ctx.stroke();
  ctx.restore();
  if (state === 'suspicious' || state === 'chase') {
    const bob = Math.sin(time * 6) * 2;
    const mark = state === 'chase' ? '!' : '?';
    const color = state === 'chase' ? PALETTE.alert : PALETTE.suspicious;
    ctx.save();
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(mark, x, y - 26 + bob);
    ctx.fillStyle = color;
    ctx.fillText(mark, x, y - 26 + bob);
    ctx.restore();
  }
}

// --- exit, intel, noise ----------------------------------------------------

// Exit: a green doorway with a pulsing chevron — the goal of every level.
export function drawExit(ctx, exitRect, time) {
  const pulse = 0.5 + Math.sin(time * 3) * 0.18;
  ctx.fillStyle = `rgba(70, 209, 124, ${0.22 + pulse * 0.2})`;
  rect(ctx, exitRect.x - 6, exitRect.y - 6, exitRect.w + 12, exitRect.h + 12);
  ctx.fill();
  ctx.fillStyle = '#123524';
  rect(ctx, exitRect.x, exitRect.y, exitRect.w, exitRect.h);
  ctx.fill();
  ctx.strokeStyle = PALETTE.exit;
  ctx.lineWidth = 3;
  ctx.strokeRect(exitRect.x + 1.5, exitRect.y + 1.5, exitRect.w - 3, exitRect.h - 3);
  ctx.fillStyle = PALETTE.exit;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', exitRect.x + exitRect.w / 2, exitRect.y + exitRect.h / 2);
  // Chevron pointing out of the door.
  const cx = exitRect.x + exitRect.w / 2;
  const cy = exitRect.y - 14 + Math.sin(time * 3) * 2;
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy + 5);
  ctx.lineTo(cx, cy - 5);
  ctx.lineTo(cx + 8, cy + 5);
  ctx.lineWidth = 3;
  ctx.strokeStyle = PALETTE.exit;
  ctx.stroke();
}

// Intel pickup: a small gold document that bobs and glints.
export function drawIntel(ctx, x, y, time, label) {
  const bob = Math.sin(time * 2.4 + x * 0.01) * 3;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = 'rgba(242, 201, 76, 0.18)';
  ctx.beginPath();
  ctx.arc(0, 0, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f7e6a2';
  ctx.fillRect(-7, -9, 14, 18);
  ctx.strokeStyle = PALETTE.intel;
  ctx.lineWidth = 2;
  ctx.strokeRect(-7, -9, 14, 18);
  ctx.strokeStyle = '#8a6d1f';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-4, -3);
  ctx.lineTo(4, -3);
  ctx.moveTo(-4, 1);
  ctx.lineTo(4, 1);
  ctx.moveTo(-4, 5);
  ctx.lineTo(1, 5);
  ctx.stroke();
  ctx.restore();
  if (label) {
    ctx.save();
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(242, 201, 76, 0.9)';
    ctx.fillText(label, x, y + 30 + bob);
    ctx.restore();
  }
}

// Expanding ring shown when the player makes noise (running / bumping).
export function drawNoiseRing(ctx, x, y, progress) {
  const radius = 12 + progress * 70;
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.55 * (1 - progress)})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
}

// --- HUD pieces (drawn in screen space, not world space) ------------------

// Detection meter: a horizontal bar that fills as the nearest guard's
// suspicion grows. 0 = unseen (green), 0.5 = suspicious (amber),
// 1 = spotted (red, flashing). The engine passes the highest current
// detection value across guards; the label names the state in words so
// the meter reads even at screenshot scale.
export function drawDetectionMeter(ctx, x, y, width, value, state) {
  const h = 16;
  const clamped = Math.max(0, Math.min(1, value));
  const fill =
    state === 'chase' ? PALETTE.alert : state === 'suspicious' ? PALETTE.suspicious : '#46d17c';
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(x - 8, y - 20, width + 16, h + 30);
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#dfe6ee';
  ctx.fillText('DETECTION', x, y - 6);
  ctx.fillStyle = '#1a2027';
  ctx.fillRect(x, y, width, h);
  ctx.fillStyle = fill;
  if (clamped > 0.01) ctx.fillRect(x, y, width * clamped, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, width - 1, h - 1);
  // Tick at the halfway mark: the point where guards turn suspicious.
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.moveTo(x + width / 2, y - 2);
  ctx.lineTo(x + width / 2, y + h + 2);
  ctx.stroke();
  ctx.textAlign = 'right';
  ctx.fillStyle = fill;
  const label = state === 'chase' ? 'SPOTTED!' : state === 'suspicious' ? 'SUSPICIOUS' : 'HIDDEN';
  ctx.fillText(label, x + width, y - 6);
  ctx.restore();
}

// Full-level convenience render used by the screenshot harness and by
// render.js for its background pass: floor, shadows, bushes, crates,
// walls, exit, intel. Guards, cones and the player are drawn by the
// engine on top, so they are not part of this pass.
export function drawLevelBase(ctx, level, time) {
  drawFloor(ctx, level, time);
  for (const zone of level.shadows) drawShadowZone(ctx, zone);
  for (const bush of level.bushes) drawBush(ctx, bush, time);
  for (const intel of level.intel) drawIntel(ctx, intel.x, intel.y, time, intel.label);
  drawExit(ctx, level.exit, time);
  for (const crate of level.crates) drawCrate(ctx, crate);
  for (const wall of level.walls) drawWall(ctx, wall);
}
