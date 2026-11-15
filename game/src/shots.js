// Screenshot driver: ?shot=start|play|upgrade|end&seed=N
//
// Each scene advances the real game rules from a fresh world with a
// simple autopilot (no cheats: same movement, lance, dash and upgrades
// a player has), fast-forwarding the fixed 60 Hz step until the scene
// is ready, then freezing one frame and raising window.__shotReady.
// Same seed, same pixels: the autopilot reads only game state.
import { CFG } from './config.js';
import { stepGame, startRun, chooseUpgrade } from './main.js';

// Steer the skiff: chase orbs, keep wisps at arm's length, dash out of
// a crowd, and fire the lance at the nearest wisp — the Herald first
// when one is on the field. Shards are dodged like wisps.
export function autopilot(game) {
  const world = game.world;
  const p = world.player;
  const aim = { x: p.x, y: p.y - 100 };
  let mx = 0;
  let my = 0;
  let dash = false;
  let fire = false;

  let near = null;
  let nearD = Infinity;
  let nearPriority = Infinity;
  let herald = null;
  let heraldD = Infinity;
  for (const w of world.wisps) {
    const d = Math.hypot(w.x - p.x, w.y - p.y);
    if (w.kind === 'herald' && d < heraldD) { heraldD = d; herald = w; }
    const priority = w.kind === 'herald' ? d * 0.5 : d;
    if (priority < nearPriority) { nearPriority = priority; nearD = d; near = w; }
  }
  // The Herald is the wave's gate: aim at it whenever it is on the
  // field and in lance range, even with wisps closer by.
  const target = herald && heraldD < 560 ? herald : near;
  const targetD = herald && heraldD < 560 ? heraldD : nearD;
  if (target) {
    // Lead the target: aim where it will be when the lance arrives,
    // not where it is now — wisps drift sideways as they chase.
    const flight = targetD / CFG.lanceSpeed;
    aim.x = target.x + target.vx * flight;
    aim.y = target.y + target.vy * flight;
    if (targetD < 560 && p.lanceAmmo > 0) fire = true;
  }

  // Movement: when the pack is near, run from its centroid — toward
  // open water. Wisps chasing in a line trail behind the skiff and
  // make clean lance targets, and the centroid moves slowly, so the
  // direction never flips frame to frame. Only when the field is
  // clear does the skiff fall back to a lazy orbit and chase orbs.
  const orbitAngle = world.time * 0.9;
  const orbitR = 280;
  const tx = CFG.arenaW / 2 + Math.cos(orbitAngle) * orbitR;
  const ty = CFG.arenaH / 2 + Math.sin(orbitAngle) * orbitR * 0.72;
  // The orbit point itself travels near skiff speed, so the skiff keeps
  // moving instead of waiting at a point for the wisps to arrive.
  let fx = (tx - p.x) / 160;
  let fy = (ty - p.y) / 160;

  let crowded = 0;
  let escX = 0;
  let escY = 0;
  let cenX = 0;
  let cenY = 0;
  let cenN = 0;
  for (const w of world.wisps) {
    const d = Math.hypot(w.x - p.x, w.y - p.y);
    if (d < 170) crowded += 1;
    if (d < 280) {
      const weight = (280 - d) / 280;
      escX += ((p.x - w.x) / (d || 1)) * weight;
      escY += ((p.y - w.y) / (d || 1)) * weight;
    }
    if (d < 500) {
      cenX += w.x;
      cenY += w.y;
      cenN += 1;
    }
  }
  const escMag = Math.hypot(escX, escY);
  if (escMag > 0.35) {
    game.apDir = { x: escX / escMag, y: escY / escMag };
  }
  if (cenN > 0) {
    // Flee the pack's centre of mass, not the fixed orbit.
    const awayX = p.x - cenX / cenN;
    const awayY = p.y - cenY / cenN;
    const awayLen = Math.hypot(awayX, awayY) || 1;
    fx = (awayX / awayLen) * 1.5;
    fy = (awayY / awayLen) * 1.5;
  }
  if (near && nearD < 170) {
    // Close threat: run for the gap — the weighted "away from every
    // nearby wisp" direction, remembered across frames so the skiff
    // commits to one gap instead of dithering.
    const dir = game.apDir || { x: 1, y: 0 };
    fx = dir.x * 1.6;
    fy = dir.y * 1.6;
    // Never let the escape pin the skiff in a corner: near an edge,
    // pull hard back toward open water, stronger the closer the edge.
    const edgePull = 2.4;
    if (p.x < 180) fx += edgePull * (1 - p.x / 180);
    if (p.x > CFG.arenaW - 180) fx -= edgePull * (1 - (CFG.arenaW - p.x) / 180);
    if (p.y < 180) fy += edgePull * (1 - p.y / 180);
    if (p.y > CFG.arenaH - 180) fy -= edgePull * (1 - (CFG.arenaH - p.y) / 180);
    if (nearD < 65 && p.dashCooldown <= 0) dash = true;
    if (crowded >= 3 && p.dashCooldown <= 0) dash = true;
  } else if (near && nearD < 260) {
    fx += ((p.x - near.x) / (nearD || 1)) * 0.4;
    fy += ((p.y - near.y) / (nearD || 1)) * 0.4;
  }
  for (const s of world.shards) {
    const d = Math.hypot(s.x - p.x, s.y - p.y);
    if (d < 130) {
      // Step sideways to the shard's path, not straight back.
      const nx = (s.x - p.x) / (d || 1);
      const ny = (s.y - p.y) / (d || 1);
      fx += -ny * 1.4;
      fy += nx * 1.4;
      if (d < 55 && p.dashCooldown <= 0) dash = true;
    }
  }
  // Drift toward the nearest orb otherwise.
  let orb = null;
  let orbD = Infinity;
  for (const o of world.orbs) {
    const d = Math.hypot(o.x - p.x, o.y - p.y);
    if (d < orbD) { orbD = d; orb = o; }
  }
  if (orb && (!near || nearD > 200)) {
    fx += ((orb.x - p.x) / (orbD || 1)) * 0.5;
    fy += ((orb.y - p.y) / (orbD || 1)) * 0.5;
  }

  mx = fx;
  my = fy;
  const len = Math.hypot(mx, my);
  if (len > 0.01) { mx /= len; my /= len; }

  return {
    left: mx < -0.25,
    right: mx > 0.25,
    up: my < -0.25,
    down: my > 0.25,
    dash,
    fire,
    aimX: aim.x,
    aimY: aim.y,
    onEvent: () => {},
  };
}

// Pick the upgrade the autopilot wants most right now.
function pickCard(game) {
  const p = game.world.player;
  const want = ['sturdy-hull', 'wide-lantern', 'piercing-lance', 'bright-pulse', 'spare-lance', 'swift-dash', 'orb-magnet', 'quick-lance'];
  for (const id of want) {
    const i = game.upgradeCards.findIndex((c) => c.id === id);
    if (i >= 0) {
      if (id === 'sturdy-hull' && p.hearts >= p.maxHearts) continue;
      if (id === 'spare-lance' && p.lanceMaxAmmo >= CFG.lanceMaxAmmo) continue;
      return i;
    }
  }
  return 0;
}

function runSteps(game, ctx, count) {
  for (let i = 0; i < count; i += 1) {
    if (game.state === 'upgrade') chooseUpgrade(game, pickCard(game));
    stepGame(game, 1 / 60);
    if (game.state === 'victory' || game.state === 'gameover') break;
  }
}

export function driveShot(game, ctx, mode) {
  game.autopilot = () => autopilot(game);
  game.shotMode = mode;

  if (mode === 'start') {
    // Five seconds of drifting dark behind the title screen.
    for (let i = 0; i < 300; i += 1) stepGame(game, 1 / 60);
  } else if (mode === 'play') {
    startRun(game);
    // 22 seconds in: wave 2 at its busiest — wisps, orbs and a lance
    // on screen, the skiff mid-arena (measured in the headless sim).
    runSteps(game, ctx, 22 * 60);
    if (game.state === 'upgrade') chooseUpgrade(game, pickCard(game));
  } else if (mode === 'upgrade') {
    startRun(game);
    // Play until the first wave is cleared and the cards appear.
    for (let i = 0; i < 150 * 60; i += 1) {
      stepGame(game, 1 / 60);
      if (game.state === 'upgrade') break;
      if (game.state === 'victory' || game.state === 'gameover') break;
    }
  } else if (mode === 'end') {
    startRun(game);
    // Play to the dawn (or the dark) — up to ten minutes of game time.
    for (let i = 0; i < 600 * 60; i += 1) {
      if (game.state === 'upgrade') chooseUpgrade(game, pickCard(game));
      stepGame(game, 1 / 60);
      if (game.state === 'victory' || game.state === 'gameover') break;
    }
  }

  // One frozen frame, then signal the screenshot tool.
  import('./render.js').then(({ render: paint }) => {
    paint(ctx, game, game.backdrop);
    window.__shotReady = true;
    window.__shotState = game.state;
    window.__shotScore = game.score;
    window.__shotWave = game.director.wave;
    window.__shotDebug = {
      hearts: game.world.player.hearts,
      kills: game.world.kills,
      wisps: game.world.wisps.length,
      orbs: game.world.orbs.length,
      time: game.world.time,
      x: Math.round(game.world.player.x),
      y: Math.round(game.world.player.y),
    };
  });
}
