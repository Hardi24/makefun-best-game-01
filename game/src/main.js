// LUMEN DRIFT — game loop and state machine. States: title, playing,
// upgrade, paused, victory, gameover. The loop reads the input, steps
// the world, keeps score and combo, and hands every frame to render.js.
import { CFG, WAVE_TITLES } from './config.js';
import { makeRng, clamp } from './random.js';
import { makeInput, attachInput, takePresses, takeClick, isDown } from './input.js';
import { makeAudio, unlockAudio, toggleMute, sfx } from './audio.js';
import { makeWorld, stepWorld } from './world.js';
import { makeDirector, startWave, stepDirector, isHeraldWave } from './waves.js';
import { drawUpgrades, applyUpgrade } from './upgrades.js';
import { makeBackdrop, render } from './render.js';

export function makeCombo() {
  return {
    mult: 1,
    lastPickup: -999,
    bump(now) {
      if (now - this.lastPickup > CFG.orbComboWindowSec) this.mult = 1;
      else this.mult = Math.min(CFG.comboMax, this.mult + 1);
      this.lastPickup = now;
      return this.mult;
    },
    decay(now) {
      if (this.mult > 1 && now - this.lastPickup > CFG.orbComboWindowSec) this.mult = 1;
    },
  };
}

export function makeGame(seed) {
  const rng = makeRng(seed);
  const world = makeWorld(rng);
  const game = {
    rng,
    world,
    director: makeDirector(),
    audio: makeAudio(),
    input: makeInput(),
    combo: makeCombo(),
    state: 'title',
    score: 0,
    upgradeCards: [],
    takenUpgrades: [],
    hoverCard: -1,
    seed,
    backdrop: makeBackdrop(seed),
    autopilot: null,
    shotMode: null,
  };
  return game;
}

function startRun(game) {
  const seed = game.seed;
  // A fresh run resets the world, but keeps the driver attached to it:
  // the screenshot autopilot (and its shot mode) must survive the reset,
  // or the skiff would stand still and die. The input and audio objects
  // must survive too: the DOM listeners were attached to them once at
  // boot, and a new object would silently drop every key and click.
  const keepAutopilot = game.autopilot;
  const keepShotMode = game.shotMode;
  const keepInput = game.input;
  const keepAudio = game.audio;
  const fresh = makeGame(seed);
  Object.assign(game, fresh, {
    state: 'playing',
    autopilot: keepAutopilot,
    shotMode: keepShotMode,
    input: keepInput,
    audio: keepAudio,
  });
  startWave(game.director, 1, `WAVE 1 — ${WAVE_TITLES[0]}`);
  sfx.waveHorn(game.audio);
}

function openUpgrade(game) {
  game.upgradeCards = drawUpgrades(game.rng, 3, game.takenUpgrades);
  game.hoverCard = -1;
  game.state = 'upgrade';
  sfx.upgrade(game.audio);
}

function chooseUpgrade(game, index) {
  const card = game.upgradeCards[index];
  if (!card) return;
  applyUpgrade(game.world.player, card);
  game.takenUpgrades.push(card.id);
  const next = game.director.wave + 1;
  if (next > CFG.totalWaves) {
    endRun(game, true);
    return;
  }
  game.state = 'playing';
  startWave(game.director, next, `WAVE ${next} — ${WAVE_TITLES[next - 1]}`);
  if (isHeraldWave(next)) sfx.heraldHorn(game.audio);
  else sfx.waveHorn(game.audio);
}

function endRun(game, won) {
  game.state = won ? 'victory' : 'gameover';
  if (won) {
    game.score += CFG.victoryHeartBonus * game.world.player.hearts;
    sfx.victory(game.audio);
  } else {
    sfx.defeat(game.audio);
  }
}

function onEvent(game) {
  return (kind, arg) => {
    const a = game.audio;
    if (kind === 'hit') sfx.hit(a);
    else if (kind === 'shoot') sfx.shoot(a);
    else if (kind === 'wisp-down') sfx.wispDown(a);
    else if (kind === 'pickup') sfx.pickup(a, arg || 1);
    else if (kind === 'dash') sfx.dash(a);
    else if (kind === 'herald-shot') sfx.hit(a);
    else if (kind === 'defeat') endRun(game, false);
  };
}

// Build the per-frame input view from keyboard, mouse and autopilot.
// `presses` is this frame's edge-triggered key set (already consumed).
function readControls(game, presses) {
  const input = game.input;
  const ap = game.autopilot;
  const p = game.world.player;
  if (ap) {
    return ap(game, input);
  }
  return {
    left: isDown(input, 'a', 'arrowleft'),
    right: isDown(input, 'd', 'arrowright'),
    up: isDown(input, 'w', 'arrowup'),
    down: isDown(input, 's', 'arrowdown'),
    dash: presses.has(' ') || presses.has('shift'),
    fire: input.mouseDown,
    aimX: input.mouseX,
    aimY: input.mouseY,
    onEvent: onEvent(game),
  };
}

function stepGame(game, dt) {
  const input = game.input;
  const presses = takePresses(input);
  const clicked = takeClick(input);

  if (presses.has('m')) toggleMute(game.audio);
  if (presses.has('enter') && (game.state === 'title' || game.state === 'victory' || game.state === 'gameover')) {
    unlockAudio(game.audio);
    startRun(game);
    return;
  }
  if (presses.has('r') && (game.state === 'victory' || game.state === 'gameover')) {
    unlockAudio(game.audio);
    startRun(game);
    return;
  }
  if (game.state === 'title') {
    if (clicked) {
      unlockAudio(game.audio);
      startRun(game);
    }
    game.world.time += dt;
    return;
  }
  if (game.state === 'upgrade') {
    if (presses.has('1')) chooseUpgrade(game, 0);
    else if (presses.has('2')) chooseUpgrade(game, 1);
    else if (presses.has('3')) chooseUpgrade(game, 2);
    else if (clicked) {
      const idx = game.hoverCard;
      if (idx >= 0) chooseUpgrade(game, idx);
    }
    return;
  }
  if (game.state === 'victory' || game.state === 'gameover') {
    game.world.time += dt;
    return;
  }
  if (presses.has('p') || presses.has('escape')) {
    game.state = game.state === 'paused' ? 'playing' : 'paused';
    return;
  }
  if (game.state === 'paused') return;

  // Playing.
  const controls = readControls(game, presses);
  const gained = stepWorld(game.world, controls, dt, game.combo);
  game.score += gained;
  game.combo.decay(game.world.time);
  if (game.world.player.dead) {
    endRun(game, false);
    return;
  }
  const cleared = stepDirector(game.director, game.world, dt);
  if (cleared) {
    game.score += CFG.waveClearBonus * game.director.wave;
    if (game.director.wave >= CFG.totalWaves) {
      endRun(game, true);
    } else {
      openUpgrade(game);
    }
  }
}

// Upgrade-card hover tracking for mouse users.
function trackHover(game, canvas) {
  canvas.addEventListener('mousemove', (e) => {
    if (game.state !== 'upgrade') { game.hoverCard = -1; return; }
    const r = canvas.getBoundingClientRect();
    const mx = (e.clientX - r.left) * (canvas.width / r.width);
    const my = (e.clientY - r.top) * (canvas.height / r.height);
    const cw = 300;
    const ch = 210;
    const gap = 36;
    const total = game.upgradeCards.length * cw + (game.upgradeCards.length - 1) * gap;
    const x0 = (CFG.arenaW - total) / 2;
    const y0 = 210;
    game.hoverCard = -1;
    game.upgradeCards.forEach((_, i) => {
      const x = x0 + i * (cw + gap);
      if (mx >= x && mx <= x + cw && my >= y0 && my <= y0 + ch) game.hoverCard = i;
    });
  });
}

export function boot(canvas, options) {
  const opts = options || {};
  const seed = opts.seed || 1;
  const game = makeGame(seed);
  game.shotMode = opts.shotMode || null;
  const ctx = canvas.getContext('2d');
  attachInput(game.input, canvas);
  trackHover(game, canvas);
  canvas.addEventListener('mousedown', () => unlockAudio(game.audio));
  window.addEventListener('keydown', () => unlockAudio(game.audio));

  if (opts.shot) {
    // Screenshot driver owns the loop (see shots.js).
    return { game, ctx, canvas };
  }
  let last = performance.now();
  let acc = 0;
  function tick(now) {
    const elapsed = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += elapsed;
    const step = 1 / 60;
    let n = 0;
    while (acc >= step && n < 5) {
      stepGame(game, step);
      acc -= step;
      n += 1;
    }
    render(ctx, game, game.backdrop);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return { game, ctx, canvas };
}

// Exposed for the screenshot driver and for headless tests.
export { stepGame, startRun, chooseUpgrade, endRun };
