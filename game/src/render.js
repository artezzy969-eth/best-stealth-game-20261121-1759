// render.js — all canvas drawing for Shadow Courier.
// Original canvas-drawn art only: no external images, fonts or assets.
// Palette: deep teal floor, amber light pools, red alert cones.
import { TILE } from './engine.js';

const FLOOR_A = '#17251f';
const FLOOR_B = '#1a2b23';
const WALL = '#3d4a55';
const WALL_TOP = '#5a6b7a';
const CRATE = '#7a5a33';
const CRATE_EDGE = '#a8844f';
const BUSH = '#1f4d2a';
const BUSH_LEAF = '#2f6b3c';
const SHADOW = 'rgba(8, 10, 26, 0.55)';
const EXIT = '#2fd67a';
const INTEL = '#ffd166';
const PLAYER = '#f2c14e';
const PLAYER_DARK = '#2b2113';

function drawFloor(ctx, game) {
  ctx.fillStyle = FLOOR_A;
  ctx.fillRect(0, 0, game.w, game.h);
  // Checkerboard tiles with a subtle grout line.
  for (let ty = 0; ty < game.rows; ty++) {
    for (let tx = 0; tx < game.cols; tx++) {
      if ((tx + ty) % 2 === 0) {
        ctx.fillStyle = FLOOR_B;
        ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      }
    }
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= game.cols; x++) {
    ctx.moveTo(x * TILE + 0.5, 0);
    ctx.lineTo(x * TILE + 0.5, game.h);
  }
  for (let y = 0; y <= game.rows; y++) {
    ctx.moveTo(0, y * TILE + 0.5);
    ctx.lineTo(game.w, y * TILE + 0.5);
  }
  ctx.stroke();
}

function drawShadows(ctx, game) {
  for (const s of game.shadows) {
    ctx.fillStyle = SHADOW;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = 'rgba(140,170,255,0.18)';
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
    ctx.setLineDash([]);
  }
}

function drawBushes(ctx, game, time) {
  for (const b of game.bushes) {
    ctx.fillStyle = BUSH;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    // Leafy blobs, gently swaying with time so the cover reads as alive.
    ctx.fillStyle = BUSH_LEAF;
    const cols = Math.max(1, Math.floor(b.w / 14));
    const rows = Math.max(1, Math.floor(b.h / 14));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const cx = b.x + 8 + i * 14 + Math.sin(time * 1.4 + i * 2.1 + j) * 1.5;
        const cy = b.y + 8 + j * 14 + Math.cos(time * 1.1 + j * 1.7) * 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawWalls(ctx, game) {
  for (const w of game.walls) {
    ctx.fillStyle = WALL;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = WALL_TOP;
    ctx.fillRect(w.x, w.y, w.w, 4);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.strokeRect(w.x + 0.5, w.y + 0.5, w.w - 1, w.h - 1);
  }
}

function drawCrates(ctx, game) {
  for (const c of game.crates) {
    ctx.fillStyle = CRATE;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = CRATE_EDGE;
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4);
    ctx.beginPath();
    ctx.moveTo(c.x, c.y);
    ctx.lineTo(c.x + c.w, c.y + c.h);
    ctx.moveTo(c.x + c.w, c.y);
    ctx.lineTo(c.x, c.y + c.h);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

function drawExit(ctx, game, time) {
  const e = game.exit;
  const pulse = 0.55 + Math.sin(time * 3) * 0.2;
  ctx.fillStyle = `rgba(47, 214, 122, ${pulse})`;
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.strokeStyle = EXIT;
  ctx.lineWidth = 3;
  ctx.strokeRect(e.x + 2, e.y + 2, e.w - 4, e.h - 4);
  ctx.lineWidth = 1;
  ctx.fillStyle = '#062b16';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('EXIT', e.x + e.w / 2, e.y + e.h / 2);
  if (game.intelCollected < game.intelTotal) {
    ctx.fillStyle = 'rgba(255,209,102,0.9)';
    ctx.font = '11px sans-serif';
    ctx.fillText(
      `need ${game.intelTotal - game.intelCollected} intel`,
      e.x + e.w / 2,
      e.y + e.h + 12,
    );
  }
}

function drawIntel(ctx, game, time) {
  for (const item of game.intel) {
    if (item.taken) continue;
    const bob = Math.sin(time * 2.5 + item.bob) * 3;
    ctx.save();
    ctx.translate(item.x, item.y + bob);
    ctx.fillStyle = INTEL;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3a2c00';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('i', 0, 0.5);
    ctx.restore();
  }
}

function coneColor(guard) {
  if (guard.state === 'chase') return 'rgba(255, 64, 64, 0.34)';
  if (guard.state === 'suspicious') return 'rgba(255, 190, 60, 0.28)';
  return 'rgba(255, 220, 90, 0.18)';
}

function drawCone(ctx, guard) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, guard.range, guard.dir - guard.halfAngle, guard.dir + guard.halfAngle);
  ctx.closePath();
  ctx.fillStyle = coneColor(guard);
  ctx.fill();
  ctx.strokeStyle = coneColor(guard).replace(/0\.\d+\)$/, '0.5)');
  ctx.stroke();
  ctx.restore();
}

function drawGuard(ctx, guard, time) {
  const bob = Math.sin(guard.stepPhase * 2) * 1.2;
  ctx.save();
  ctx.translate(guard.x, guard.y + bob * 0.3);
  // Body: a warden in a dark coat with a brass badge.
  ctx.fillStyle = guard.state === 'chase' ? '#a33327' : '#37415c';
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0d1220';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  // Facing tick.
  ctx.strokeStyle = '#e8ecf4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(Math.cos(guard.dir) * 12, Math.sin(guard.dir) * 12);
  ctx.lineTo(Math.cos(guard.dir) * 18, Math.sin(guard.dir) * 18);
  ctx.stroke();
  ctx.restore();

  // Per-guard detection meter above the head.
  if (guard.detection > 0.02) {
    const w = 30;
    const x = guard.x - w / 2;
    const y = guard.y - 24;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 1, y - 1, w + 2, 7);
    ctx.fillStyle = guard.detection > 0.66 ? '#ff4040' : '#ffbe3c';
    ctx.fillRect(x, y, w * guard.detection, 5);
  }
  // "?" while suspicious, "!" while chasing.
  if (guard.state === 'suspicious' || guard.state === 'chase') {
    ctx.fillStyle = guard.state === 'chase' ? '#ff5040' : '#ffbe3c';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(guard.state === 'chase' ? '!' : '?', guard.x, guard.y - 26);
  }
}

function drawPlayer(ctx, game) {
  const p = game.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  const bob = p.moving ? Math.sin(p.stepPhase * 2) * 1 : 0;
  ctx.translate(0, bob * 0.3);
  // Courier: amber cloak, hood, satchel strap.
  ctx.fillStyle = PLAYER;
  ctx.beginPath();
  ctx.arc(0, 0, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PLAYER_DARK;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = '#7a4d00';
  ctx.beginPath();
  ctx.moveTo(-p.r + 3, -3);
  ctx.lineTo(p.r - 3, 3);
  ctx.stroke();
  ctx.fillStyle = '#2b2113';
  ctx.beginPath();
  ctx.arc(Math.cos(p.dir) * 5, Math.sin(p.dir) * 5, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (p.crouched) {
    ctx.fillStyle = 'rgba(242,193,78,0.9)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SNEAK', p.x, p.y - 18);
  }
}

function drawNoiseRing(ctx, game) {
  if (game.noise <= 0) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.arc(game.noiseX, game.noiseY, game.noise, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawHud(ctx, game) {
  const barW = 220;
  const x = 12;
  const y = 12;
  ctx.save();
  ctx.fillStyle = 'rgba(6, 12, 10, 0.72)';
  ctx.fillRect(8, 8, 268, 64);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.strokeRect(8.5, 8.5, 268, 64);
  ctx.fillStyle = '#e8ecf4';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${game.levelName}  •  Intel ${game.intelCollected}/${game.intelTotal}`, x, y + 8);
  ctx.fillText(`Time ${formatTime(game.time)}  •  Score ${game.score}`, x, y + 26);
  // Global visibility meter.
  ctx.fillStyle = '#8a94a6';
  ctx.font = '11px sans-serif';
  ctx.fillText('VISIBILITY', x, y + 44);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(x + 72, y + 39, barW - 72, 9);
  ctx.fillStyle = game.visibility > 0.66 ? '#ff4040' : game.visibility > 0.33 ? '#ffbe3c' : '#2fd67a';
  ctx.fillRect(x + 72, y + 39, (barW - 72) * Math.min(1, game.visibility), 9);
  ctx.restore();
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function drawMinimap(ctx, game) {
  const scale = 0.14;
  const mw = game.w * scale;
  const mh = game.h * scale;
  const x0 = game.w - mw - 10;
  const y0 = game.h - mh - 10;
  ctx.save();
  ctx.fillStyle = 'rgba(6, 12, 10, 0.78)';
  ctx.fillRect(x0 - 4, y0 - 4, mw + 8, mh + 8);
  ctx.fillStyle = '#1a2b23';
  ctx.fillRect(x0, y0, mw, mh);
  ctx.fillStyle = '#3d4a55';
  for (const w of game.walls) ctx.fillRect(x0 + w.x * scale, y0 + w.y * scale, w.w * scale, w.h * scale);
  ctx.fillStyle = EXIT;
  ctx.fillRect(x0 + game.exit.x * scale, y0 + game.exit.y * scale, game.exit.w * scale, game.exit.h * scale);
  for (const item of game.intel) {
    if (item.taken) continue;
    ctx.fillStyle = INTEL;
    ctx.fillRect(x0 + item.x * scale - 2, y0 + item.y * scale - 2, 4, 4);
  }
  for (const g of game.guards) {
    ctx.fillStyle = g.state === 'chase' ? '#ff4040' : '#ffbe3c';
    ctx.beginPath();
    ctx.arc(x0 + g.x * scale, y0 + g.y * scale, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = PLAYER;
  ctx.beginPath();
  ctx.arc(x0 + game.player.x * scale, y0 + game.player.y * scale, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawOverlay(ctx, game, title, lines, accent) {
  ctx.save();
  ctx.fillStyle = 'rgba(4, 8, 7, 0.78)';
  ctx.fillRect(0, 0, game.w, game.h);
  ctx.fillStyle = accent || '#f2c14e';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, game.w / 2, game.h / 2 - 46);
  ctx.fillStyle = '#e8ecf4';
  ctx.font = '15px sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, game.w / 2, game.h / 2 - 6 + i * 24);
  });
  ctx.fillStyle = '#8a94a6';
  ctx.font = '13px sans-serif';
  ctx.fillText('Press R to restart  •  P to pause', game.w / 2, game.h / 2 + 78);
  ctx.restore();
}

// Draw one frame. `screen` is the main.js state machine value; the world
// is drawn underneath every overlay so screenshots stay readable.
export function renderGame(ctx, game, screen) {
  const time = game.time;
  drawFloor(ctx, game);
  drawShadows(ctx, game);
  drawBushes(ctx, game, time);
  drawExit(ctx, game, time);
  drawIntel(ctx, game, time);
  drawCrates(ctx, game);
  drawWalls(ctx, game);
  for (const guard of game.guards) drawCone(ctx, guard);
  drawNoiseRing(ctx, game);
  for (const guard of game.guards) drawGuard(ctx, guard, time);
  drawPlayer(ctx, game);
  drawHud(ctx, game);
  drawMinimap(ctx, game);

  if (game.flash > 0) {
    ctx.fillStyle = `rgba(255, 40, 40, ${Math.min(0.22, game.flash)})`;
    ctx.fillRect(0, 0, game.w, game.h);
  }

  if (screen === 'title') {
    drawOverlay(ctx, game, 'SHADOW COURIER', [
      'A top-down stealth run. Slip past the wardens,',
      'grab every intel satchel, then reach the EXIT unseen.',
      'WASD / arrows move  •  Shift or C sneak  •  P pause  •  R restart',
      'Crouch in bushes and shadows — running makes noise.',
    ], '#f2c14e');
  } else if (screen === 'paused') {
    drawOverlay(ctx, game, 'PAUSED', ['Take a breath. The wardens wait for no one.'], '#e8ecf4');
  } else if (screen === 'caught') {
    drawOverlay(ctx, game, 'CAUGHT', [
      game.statusReason || 'A warden caught you.',
      `Score ${game.score}  •  Time ${formatTime(game.time)}`,
    ], '#ff5040');
  } else if (screen === 'level-complete') {
    drawOverlay(ctx, game, 'LEVEL CLEAR', [
      game.statusReason || '',
      `Score ${game.score}  •  Time ${formatTime(game.time)}`,
      'Press Enter to slip into the next level.',
    ], '#2fd67a');
  } else if (screen === 'win') {
    drawOverlay(ctx, game, 'ALL DELIVERIES MADE', [
      'You crossed every ward and vanished into the night.',
      `Final score ${game.score}  •  Total time ${formatTime(game.time)}`,
    ], '#2fd67a');
  }
}
