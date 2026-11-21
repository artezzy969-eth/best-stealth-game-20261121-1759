// guard.js — the Warden: a patrolling guard with a vision cone.
// States: patrol -> suspicious (investigate last-seen point) -> chase
// (move toward the player) -> return (walk back to the patrol route).
// Rendering of the cone and the guard sprite lives in render.js; this file
// owns only behaviour, so the state machine can be tested without a canvas.

export function angleDiff(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function angleTo(x0, y0, x1, y1) {
  return Math.atan2(y1 - y0, x1 - x0);
}

export function clampAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export class Warden {
  // def follows the level-data shape: waypoints are [tx, ty] tile pairs
  // (objects {x, y} are also accepted), speed is px/s, range is px,
  // halfAngle is half the vision cone in radians, pause is the wait in
  // seconds at each waypoint. `phase` is already encoded by the level
  // author rotating the waypoint list, so the guard simply starts at
  // waypoints[0] facing the next stop.
  constructor(def, tile) {
    this.tile = tile;
    const raw = def.waypoints && def.waypoints.length ? def.waypoints : [[2, 2]];
    this.waypoints = raw.map((wp) => {
      if (Array.isArray(wp)) return { x: (wp[0] + 0.5) * tile, y: (wp[1] + 0.5) * tile };
      return { x: (wp.x + 0.5) * tile, y: (wp.y + 0.5) * tile };
    });
    this.x = this.waypoints[0].x;
    this.y = this.waypoints[0].y;
    this.wpIndex = 1 % this.waypoints.length;
    const next = this.waypoints[this.wpIndex];
    this.dir = def.facing !== undefined ? def.facing : angleTo(this.x, this.y, next.x, next.y);
    this.speed = def.speed || 55; // px/s on patrol
    this.chaseSpeed = def.chaseSpeed || this.speed * 1.75;
    this.range = def.coneRange || def.range || 180; // vision range, px
    this.halfAngle = def.halfAngle !== undefined
      ? def.halfAngle
      : (def.coneAngleDeg !== undefined ? ((def.coneAngleDeg / 2) * Math.PI) / 180 : 0.6);
    this.pauseTime = def.pauseMs !== undefined ? def.pauseMs / 1000 : (def.pause || 1.1);
    this.state = 'patrol';
    this.detection = 0; // 0..1, per-guard meter
    this.lastSeen = null; // {x, y} of the player when last spotted
    this.loseTimer = 0; // seconds since the player was last visible (chase)
    this.lookTimer = 0; // seconds spent looking around while suspicious
    this.pauseTimer = 0;
    this.scanPhase = def.seed ? def.seed * 0.7 : 0;
    this.stepPhase = 0; // walk-cycle phase, used by the renderer
    this.suspicionPoint = null;
  }

  get alertLevel() {
    if (this.state === 'chase') return 2;
    if (this.state === 'suspicious') return 1;
    return 0;
  }

  // Move toward a point without passing through solids. `moveCircle` is
  // injected from engine.js to avoid a circular import.
  stepToward(tx, ty, speed, dt, moveCircle) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return true;
    const nx = dx / dist;
    const ny = dy / dist;
    const arrived = moveCircle(this, nx * speed * dt, ny * speed * dt);
    this.dir = angleTo(0, 0, nx, ny);
    this.stepPhase += dt * speed * 0.08;
    return arrived;
  }

  update(dt, game, moveCircle) {
    const player = game.player;
    const canSee = game.canSeePlayer ? game.canSeePlayer(this) : false;

    if (canSee) {
      this.lastSeen = { x: player.x, y: player.y };
      this.loseTimer = 0;
    }

    if (this.state === 'patrol') {
      this.patrolStep(dt, moveCircle);
      // A full meter flips the guard straight into a chase.
      if (this.detection >= 1) this.state = 'chase';
      else if (this.detection > 0.45 && this.lastSeen) this.becomeSuspicious();
    } else if (this.state === 'suspicious') {
      this.suspiciousStep(dt, moveCircle);
      if (this.detection >= 1) this.state = 'chase';
    } else if (this.state === 'chase') {
      this.chaseStep(dt, game, moveCircle);
    } else if (this.state === 'return') {
      this.returnStep(dt, moveCircle);
      if (this.detection >= 1) this.state = 'chase';
    }
  }

  patrolStep(dt, moveCircle) {
    if (this.pauseTimer > 0) {
      this.pauseTimer -= dt;
      // Idle scan: slowly sweep the cone while waiting at a waypoint.
      this.scanPhase += dt;
      this.dir = clampAngle(this.dir + Math.sin(this.scanPhase * 0.9) * dt * 0.55);
      return;
    }
    const target = this.waypoints[this.wpIndex];
    const arrived = this.stepToward(target.x, target.y, this.speed, dt, moveCircle);
    if (arrived || Math.hypot(target.x - this.x, target.y - this.y) < 6) {
      this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      this.pauseTimer = this.pauseTime;
    }
  }

  becomeSuspicious() {
    if (this.state === 'chase') return;
    this.state = 'suspicious';
    this.suspicionPoint = this.lastSeen
      ? { x: this.lastSeen.x, y: this.lastSeen.y }
      : { x: this.x, y: this.y };
    this.lookTimer = 0;
  }

  suspiciousStep(dt, moveCircle) {
    const point = this.suspicionPoint || this.lastSeen;
    if (!point) {
      this.state = 'return';
      return;
    }
    const dist = Math.hypot(point.x - this.x, point.y - this.y);
    if (dist > 10) {
      this.stepToward(point.x, point.y, this.speed * 1.25, dt, moveCircle);
      return;
    }
    // Arrived: look around for a while, then give up.
    this.lookTimer += dt;
    this.dir = clampAngle(this.dir + dt * 1.6);
    if (this.lookTimer > 2.6) {
      this.state = 'return';
      this.suspicionPoint = null;
      this.lookTimer = 0;
    }
  }

  chaseStep(dt, game, moveCircle) {
    const player = game.player;
    if (game.canSeePlayer && game.canSeePlayer(this)) {
      this.loseTimer = 0;
      this.stepToward(player.x, player.y, this.chaseSpeed, dt, moveCircle);
    } else {
      this.loseTimer += dt;
      if (this.lastSeen) {
        this.stepToward(this.lastSeen.x, this.lastSeen.y, this.chaseSpeed * 0.85, dt, moveCircle);
      }
      if (this.loseTimer > 3) {
        // Lost the trail: fall back to suspicious at the last-seen point.
        this.state = 'suspicious';
        this.suspicionPoint = this.lastSeen ? { ...this.lastSeen } : null;
        this.lookTimer = 0;
        this.loseTimer = 0;
      }
    }
  }

  returnStep(dt, moveCircle) {
    // Walk to the nearest waypoint, then resume the patrol.
    let best = this.waypoints[0];
    let bestDist = Infinity;
    for (const wp of this.waypoints) {
      const d = Math.hypot(wp.x - this.x, wp.y - this.y);
      if (d < bestDist) {
        bestDist = d;
        best = wp;
      }
    }
    const arrived = this.stepToward(best.x, best.y, this.speed * 1.15, dt, moveCircle);
    if (arrived || bestDist < 8) {
      this.wpIndex = this.waypoints.indexOf(best);
      this.state = 'patrol';
      this.pauseTimer = 0.4;
    }
  }
}
