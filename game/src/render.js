// render.js — canvas composition for Shadow Courier.
// World art (floor, walls, crates, bushes, shadows, cones, figures, exit,
// intel) is drawn with the original canvas helpers in art.js; this file
// composes one frame per tick, adds the canvas HUD, the detection meter,
// the minimap, the noise ring and the red spotted flash. The DOM screens
// in index.html own the title / pause / win / caught text — this file
// never draws full-screen text overlays over them.
import {
  drawLevelBase,
  drawVisionCone,
  drawGuard,
  drawPlayer,
  drawNoiseRing,
  drawDetectionMeter,
} from './art.js';
import { playerConcealment } from './engine.js';

export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function guardDrawState(guard) {
  if (guard.state === 'chase') return 'chase';
  if (guard.state === 'suspicious') return 'suspicious';
  return 'calm';
}

function alertWord(game) {
  if (game.guards.some((g) => g.state === 'chase')) return 'chase';
  if (game.guards.some((g) => g.state === 'suspicious')) return 'suspicious';
  return 'calm';
}

function drawGuardMeter(ctx, guard) {
  if (guard.detection <= 0.02) return;
  const w = 30;
  const x = guard.x - w / 2;
  const y = guard.y - 26;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(x - 1, y - 1, w + 2, 7);
  ctx.fillStyle = guard.detection > 0.66 ? '#e84a3a' : '#e8a13a';
  ctx.fillRect(x, y, w * guard.detection, 5);
}

function drawCanvasHud(ctx, game) {
  // Compact top-left strip: level, parcels, time, score. The DOM HUD
  // below the canvas shows the same numbers; this strip keeps the game
  // readable when only the canvas is screenshotted.
  ctx.save();
  ctx.fillStyle = 'rgba(6, 12, 10, 0.72)';
  ctx.fillRect(8, 8, 300, 30);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.strokeRect(8.5, 8.5, 300, 30);
  ctx.fillStyle = '#e8ecf4';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    `${game.levelName}  •  Parcels ${game.intelCollected}/${game.intelTotal}  •  ${formatTime(game.time)}  •  ${game.score} pts`,
    16,
    24,
  );
  ctx.restore();
  // Global detection meter, bottom-left, with the worded state.
  drawDetectionMeter(ctx, 16, game.h - 34, 220, game.visibility, alertWord(game));
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
  ctx.fillStyle = '#20262f';
  ctx.fillRect(x0, y0, mw, mh);
  ctx.fillStyle = '#3a4354';
  for (const w of game.walls) ctx.fillRect(x0 + w.x * scale, y0 + w.y * scale, w.w * scale, w.h * scale);
  ctx.fillStyle = '#46d17c';
  ctx.fillRect(x0 + game.exit.x * scale, y0 + game.exit.y * scale, game.exit.w * scale, game.exit.h * scale);
  for (const item of game.intel) {
    if (item.taken) continue;
    ctx.fillStyle = '#f2c94c';
    ctx.fillRect(x0 + item.x * scale - 2, y0 + item.y * scale - 2, 4, 4);
  }
  for (const g of game.guards) {
    ctx.fillStyle = g.state === 'chase' ? '#e84a3a' : '#e8a13a';
    ctx.beginPath();
    ctx.arc(x0 + g.x * scale, y0 + g.y * scale, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#37c8a3';
  ctx.beginPath();
  ctx.arc(x0 + game.player.x * scale, y0 + game.player.y * scale, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Draw one frame. `screen` is the main.js state machine value; the world
// is drawn underneath every DOM screen so screenshots stay readable.
export function renderGame(ctx, game, screen) {
  const time = game.time;
  // art.js's floor is painted for a 960x600 sheet while the world is
  // 960x608; pre-fill the whole canvas so the bottom strip is floor,
  // not transparent page background.
  ctx.fillStyle = '#20262f';
  ctx.fillRect(0, 0, game.w, game.h);
  // F1 fix: art.js draws in raw PIXEL units, but game.levelDef stores
  // geometry in TILE units (30x19 tiles, TILE=32). Passing the raw
  // levelDef made every wall/crate/shadow/bush/exit draw ~32x too
  // small, clustered in the top-left corner — invisible in practice.
  // The engine already converted the level to pixels when it built
  // the game (game.walls, game.crates, game.bushes, game.shadows,
  // game.exit, game.intel), so hand drawLevelBase that converted
  // pixel geometry instead of the tile-format definition. Intel is
  // still filtered to the parcels remaining on the floor.
  const remaining = game.intel.filter((item) => !item.taken);
  const pixelLevel = {
    ...game.levelDef,
    walls: game.walls,
    crates: game.crates,
    bushes: game.bushes,
    shadows: game.shadows,
    exit: game.exit,
    intel: remaining,
  };
  drawLevelBase(ctx, pixelLevel, time);

  for (const guard of game.guards) {
    drawVisionCone(
      ctx,
      guard.x,
      guard.y,
      guard.dir,
      guard.range,
      (guard.halfAngle * 180) / Math.PI,
      guardDrawState(guard),
    );
  }
  if (game.noise > 0) {
    // Expanding ring while the courier's steps are loud.
    drawNoiseRing(ctx, game.noiseX, game.noiseY, (time * 1.4) % 1);
  }
  for (const guard of game.guards) {
    drawGuard(ctx, guard.x, guard.y, guard.dir, guardDrawState(guard), time);
    drawGuardMeter(ctx, guard);
  }
  const conceal = playerConcealment(game);
  drawPlayer(ctx, game.player.x, game.player.y, game.player.dir, {
    crouching: game.player.crouched,
    hidden: conceal < 0.6,
  });
  if (game.player.crouched) {
    ctx.fillStyle = 'rgba(234, 255, 247, 0.9)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SNEAK', game.player.x, game.player.y - 20);
  }

  drawCanvasHud(ctx, game);
  drawMinimap(ctx, game);

  if (game.flash > 0) {
    ctx.fillStyle = `rgba(232, 74, 58, ${Math.min(0.22, game.flash)})`;
    ctx.fillRect(0, 0, game.w, game.h);
  }
  void screen;
}
