// The living world: the skiff, wisps, the Herald, orbs, lance shots and
// particles. Spawning, movement, collisions and deaths all live here;
// the wave director (waves.js) decides *when* things appear.
import { CFG } from './config.js';
import { clamp, dist2, range } from './random.js';

export function makePlayer() {
  return {
    x: CFG.arenaW / 2,
    y: CFG.arenaH / 2,
    vx: 0,
    vy: 0,
    angle: -Math.PI / 2,
    hearts: CFG.startHearts,
    maxHearts: CFG.maxHearts,
    invuln: 0,
    dashTime: 0,
    dashCooldown: 0,
    dashCooldownSec: CFG.dashCooldownSec,
    dashDirX: 0,
    dashDirY: -1,
    auraRadius: CFG.auraRadius,
    auraDamage: CFG.auraDamagePerSec,
    lanceAmmo: CFG.lanceAmmo,
    lanceMaxAmmo: CFG.lanceMaxAmmo,
    lanceRecharge: CFG.lanceRechargeSec,
    lanceTimer: 0,
    lancePierce: false,
    magnetRadius: CFG.orbMagnetBase,
    lantern: 0,
    dead: false,
  };
}

export function makeWorld(rng) {
  return {
    rng,
    player: makePlayer(),
    wisps: [],
    shards: [],
    orbs: [],
    lances: [],
    particles: [],
    floaters: [],
    time: 0,
    kills: 0,
    shake: 0,
    flash: 0,
  };
}

export function spawnWisp(world, kind, hpMult, speedMult) {
  const { rng } = world;
  const edge = Math.floor(rng() * 4);
  let x;
  let y;
  if (edge === 0) { x = range(rng, 0, CFG.arenaW); y = -30; }
  else if (edge === 1) { x = range(rng, 0, CFG.arenaW); y = CFG.arenaH + 30; }
  else if (edge === 2) { x = -30; y = range(rng, 0, CFG.arenaH); }
  else { x = CFG.arenaW + 30; y = range(rng, 0, CFG.arenaH); }
  const hp = CFG.wispHp * hpMult;
  world.wisps.push({
    kind: kind || 'wisp',
    x, y,
    vx: 0, vy: 0,
    hp,
    maxHp: hp,
    radius: kind === 'herald' ? CFG.heraldRadius : CFG.wispRadius * range(rng, 0.85, 1.25),
    speed: CFG.wispSpeed * speedMult * range(rng, 0.9, 1.1),
    wobble: range(rng, 0, Math.PI * 2),
    wobbleSpeed: range(rng, 1.2, 2.6),
    touchCd: 0,
    radialTimer: CFG.heraldRadialSec,
    hue: kind === 'herald' ? 288 : 315,
  });
}

export function spawnOrb(world, x, y, big) {
  world.orbs.push({
    x: clamp(x + range(world.rng, -14, 14), 12, CFG.arenaW - 12),
    y: clamp(y + range(world.rng, -14, 14), 12, CFG.arenaH - 12),
    vx: range(world.rng, -30, 30),
    vy: range(world.rng, -30, 30),
    value: big ? 3 : 1,
    life: 14,
    bob: range(world.rng, 0, Math.PI * 2),
  });
}

export function burst(world, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const a = world.rng() * Math.PI * 2;
    const s = range(world.rng, speed * 0.3, speed);
    world.particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: range(world.rng, 0.3, CFG.particleLifeSec),
      maxLife: CFG.particleLifeSec,
      size: range(world.rng, 2, 5),
      color,
    });
  }
}

export function floater(world, x, y, text, color) {
  world.floaters.push({ x, y, text, color: color || '#ffe9a3', life: CFG.floatTextLifeSec });
}

function hurtPlayer(world, dmg, onHit) {
  const p = world.player;
  if (p.invuln > 0 || p.dashTime > 0 || p.dead) return;
  p.hearts -= dmg;
  p.invuln = CFG.hitInvulnSec;
  world.shake = Math.max(world.shake, 9);
  world.flash = 0.55;
  burst(world, p.x, p.y, '#ff5d7a', 16, 220);
  if (onHit) onHit('hit');
  if (p.hearts <= 0) {
    p.dead = true;
    burst(world, p.x, p.y, '#7df3ff', 40, 320);
    burst(world, p.x, p.y, '#ffd166', 24, 240);
    if (onHit) onHit('defeat');
  }
}

function killWisp(world, index, onEvent) {
  const w = world.wisps[index];
  world.wisps.splice(index, 1);
  world.kills += 1;
  const orbs = w.kind === 'herald' ? CFG.heraldOrbs : (world.rng() < 0.6 ? 2 : 1);
  for (let i = 0; i < orbs; i += 1) spawnOrb(world, w.x, w.y, w.kind === 'herald');
  burst(world, w.x, w.y, '#e08cff', 14, 200);
  burst(world, w.x, w.y, '#7df3ff', 6, 140);
  floater(world, w.x, w.y - 10, `+${w.kind === 'herald' ? CFG.heraldScore : CFG.wispScore}`, '#c9f7ff');
  if (onEvent) onEvent('wisp-down', w);
  return w.kind === 'herald' ? CFG.heraldScore : CFG.wispScore;
}

// One fixed step of the world. input carries the movement keys, aim and
// firing; onEvent reports sounds the caller should play ('hit', 'shoot',
// 'wisp-down', 'pickup', 'dash', 'defeat'). Returns score earned this step.
export function stepWorld(world, input, dt, combo) {
  const p = world.player;
  world.time += dt;
  let gained = 0;

  // --- player movement ---
  let mx = 0;
  let my = 0;
  if (input.left) mx -= 1;
  if (input.right) mx += 1;
  if (input.up) my -= 1;
  if (input.down) my += 1;
  const moving = mx !== 0 || my !== 0;
  if (moving) {
    const len = Math.hypot(mx, my);
    mx /= len;
    my /= len;
  }
  p.angle = Math.atan2(input.aimY - p.y, input.aimX - p.x);

  if (p.dashTime > 0) {
    p.dashTime -= dt;
    p.x += p.dashDirX * CFG.dashSpeed * dt;
    p.y += p.dashDirY * CFG.dashSpeed * dt;
  } else {
    const accel = 1400;
    p.vx += mx * accel * dt;
    p.vy += my * accel * dt;
    const drag = Math.exp(-6 * dt);
    p.vx *= drag;
    p.vy *= drag;
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > CFG.skiffSpeed) {
      p.vx = (p.vx / sp) * CFG.skiffSpeed;
      p.vy = (p.vy / sp) * CFG.skiffSpeed;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  p.x = clamp(p.x, 20, CFG.arenaW - 20);
  p.y = clamp(p.y, 20, CFG.arenaH - 20);
  if (p.dashCooldown > 0) p.dashCooldown -= dt;
  if (p.invuln > 0) p.invuln -= dt;

  if (input.dash && p.dashCooldown <= 0 && p.dashTime <= 0) {
    p.dashTime = CFG.dashTimeSec;
    p.dashCooldown = p.dashCooldownSec;
    if (moving) { p.dashDirX = mx; p.dashDirY = my; }
    else { p.dashDirX = Math.cos(p.angle); p.dashDirY = Math.sin(p.angle); }
    p.invuln = Math.max(p.invuln, CFG.dashInvulnSec);
    burst(world, p.x, p.y, '#7df3ff', 10, 160);
    if (input.onEvent) input.onEvent('dash');
  }

  // --- lance recharge and firing ---
  if (p.lanceAmmo < p.lanceMaxAmmo) {
    p.lanceTimer += dt;
    while (p.lanceTimer >= p.lanceRecharge && p.lanceAmmo < p.lanceMaxAmmo) {
      p.lanceAmmo += 1;
      p.lanceTimer -= p.lanceRecharge;
    }
  } else {
    p.lanceTimer = 0;
  }
  if (input.fire && p.lanceAmmo > 0 && !p.dead) {
    p.lanceAmmo -= 1;
    world.lances.push({
      x: p.x + Math.cos(p.angle) * 22,
      y: p.y + Math.sin(p.angle) * 22,
      vx: Math.cos(p.angle) * CFG.lanceSpeed,
      vy: Math.sin(p.angle) * CFG.lanceSpeed,
      life: 1.1,
      pierce: p.lancePierce,
      hits: new Set(),
    });
    burst(world, p.x + Math.cos(p.angle) * 24, p.y + Math.sin(p.angle) * 24, '#ffe9a3', 4, 120);
    if (input.onEvent) input.onEvent('shoot');
  }

  // --- lantern aura burns nearby wisps ---
  const auraR2 = p.auraRadius * p.auraRadius;
  for (let i = world.wisps.length - 1; i >= 0; i -= 1) {
    const w = world.wisps[i];
    if (dist2(w.x, w.y, p.x, p.y) < auraR2) {
      w.hp -= p.auraDamage * dt;
      if (world.rng() < dt * 6) {
        world.particles.push({
          x: w.x + range(world.rng, -w.radius, w.radius),
          y: w.y + range(world.rng, -w.radius, w.radius),
          vx: range(world.rng, -20, 20), vy: range(world.rng, -40, -10),
          life: 0.4, maxLife: 0.4, size: 3, color: '#ffe9a3',
        });
      }
      if (w.hp <= 0) gained += killWisp(world, i, input.onEvent);
    }
  }

  // --- lance shots fly and hit ---
  for (let i = world.lances.length - 1; i >= 0; i -= 1) {
    const l = world.lances[i];
    l.x += l.vx * dt;
    l.y += l.vy * dt;
    l.life -= dt;
    let dead = l.life <= 0 || l.x < -20 || l.x > CFG.arenaW + 20 || l.y < -20 || l.y > CFG.arenaH + 20;
    if (!dead) {
      for (let j = world.wisps.length - 1; j >= 0; j -= 1) {
        const w = world.wisps[j];
        if (l.hits.has(w)) continue;
        const rr = w.radius + CFG.lanceRadius;
        if (dist2(l.x, l.y, w.x, w.y) < rr * rr) {
          w.hp -= CFG.lanceDamage;
          l.hits.add(w);
          burst(world, l.x, l.y, '#ffe9a3', 6, 160);
          if (w.hp <= 0) gained += killWisp(world, j, input.onEvent);
          if (!l.pierce) { dead = true; break; }
        }
      }
    }
    if (dead) world.lances.splice(i, 1);
  }

  // --- wisps drift toward the skiff with a wobble ---
  for (const w of world.wisps) {
    w.wobble += w.wobbleSpeed * dt;
    const dx = p.x - w.x;
    const dy = p.y - w.y;
    const d = Math.hypot(dx, dy) || 1;
    const wob = Math.sin(w.wobble) * 0.35;
    const px = -dy / d;
    const py = dx / d;
    w.vx = (dx / d + px * wob) * w.speed;
    w.vy = (dy / d + py * wob) * w.speed;
    w.x += w.vx * dt;
    w.y += w.vy * dt;
    if (w.touchCd > 0) w.touchCd -= dt;
    const rr = w.radius + CFG.skiffRadius;
    if (!p.dead && w.touchCd <= 0 && dist2(w.x, w.y, p.x, p.y) < rr * rr) {
      w.touchCd = 1;
      hurtPlayer(world, CFG.wispTouchDamage, input.onEvent);
    }
    // Herald radial burst.
    if (w.kind === 'herald') {
      w.radialTimer -= dt;
      if (w.radialTimer <= 0) {
        w.radialTimer = CFG.heraldRadialSec;
        for (let k = 0; k < 10; k += 1) {
          const a = (k / 10) * Math.PI * 2 + world.rng() * 0.3;
          world.shards.push({
            x: w.x, y: w.y,
            vx: Math.cos(a) * CFG.heraldShardSpeed,
            vy: Math.sin(a) * CFG.heraldShardSpeed,
            life: 4,
          });
        }
        world.shake = Math.max(world.shake, 5);
        if (input.onEvent) input.onEvent('herald-shot');
      }
    }
  }

  // --- herald shards ---
  for (let i = world.shards.length - 1; i >= 0; i -= 1) {
    const s = world.shards[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    let gone = s.life <= 0 || s.x < -20 || s.x > CFG.arenaW + 20 || s.y < -20 || s.y > CFG.arenaH + 20;
    if (!gone && !p.dead) {
      const rr = CFG.heraldShardRadius + CFG.skiffRadius;
      if (dist2(s.x, s.y, p.x, p.y) < rr * rr) {
        hurtPlayer(world, CFG.wispTouchDamage, input.onEvent);
        gone = true;
      }
    }
    if (gone) world.shards.splice(i, 1);
  }

  // --- orbs drift, magnetise, get collected ---
  for (let i = world.orbs.length - 1; i >= 0; i -= 1) {
    const o = world.orbs[i];
    o.life -= dt;
    o.bob += dt * 3;
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    o.vx *= Math.exp(-2 * dt);
    o.vy *= Math.exp(-2 * dt);
    const d2 = dist2(o.x, o.y, p.x, p.y);
    if (!p.dead && d2 < p.magnetRadius * p.magnetRadius) {
      const d = Math.sqrt(d2) || 1;
      const pull = 520 * dt;
      o.x += ((p.x - o.x) / d) * pull;
      o.y += ((p.y - o.y) / d) * pull;
    }
    const cr = CFG.orbRadius + CFG.skiffRadius;
    if (!p.dead && d2 < cr * cr) {
      world.orbs.splice(i, 1);
      const comboNow = combo.bump(world.time);
      const val = CFG.orbScore * o.value * comboNow;
      gained += val;
      p.lantern = Math.min(100, p.lantern + 2 * o.value);
      floater(world, o.x, o.y - 8, `+${val}`, '#7df3ff');
      burst(world, o.x, o.y, '#7df3ff', 5, 120);
      if (input.onEvent) input.onEvent('pickup', comboNow);
    } else if (o.life <= 0) {
      world.orbs.splice(i, 1);
    }
  }

  // --- particles, floaters, shake, flash ---
  for (let i = world.particles.length - 1; i >= 0; i -= 1) {
    const pt = world.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
    if (pt.life <= 0) world.particles.splice(i, 1);
  }
  for (let i = world.floaters.length - 1; i >= 0; i -= 1) {
    const f = world.floaters[i];
    f.y -= 34 * dt;
    f.life -= dt;
    if (f.life <= 0) world.floaters.splice(i, 1);
  }
  if (world.shake > 0) world.shake = Math.max(0, world.shake - CFG.shakeDecay * dt);
  if (world.flash > 0) world.flash = Math.max(0, world.flash - dt * 1.6);

  return gained;
}
