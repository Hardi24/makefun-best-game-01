// All drawing: the drifting dark, the skiff, wisps, orbs, the HUD and
// every screen (title, upgrade choice, victory, defeat, pause). Nothing
// here changes game state; it only paints what the world holds.
import { CFG, WAVE_TITLES } from './config.js';
import { makeRng } from './random.js';

const INK = '#e8f4ff';
const DIM = '#9db8d6';
const GOLD = '#ffd166';
const CYAN = '#7df3ff';
const MAGENTA = '#e08cff';
const RED = '#ff5d7a';

export function makeBackdrop(seed) {
  const rng = makeRng(seed);
  const stars = [];
  for (let i = 0; i < CFG.starCount; i += 1) {
    stars.push({
      x: rng() * CFG.arenaW,
      y: rng() * CFG.arenaH,
      r: 0.6 + rng() * 1.8,
      tw: rng() * Math.PI * 2,
      depth: 0.3 + rng() * 0.7,
    });
  }
  const nebulae = [];
  for (let i = 0; i < CFG.nebulaCount; i += 1) {
    nebulae.push({
      x: rng() * CFG.arenaW,
      y: rng() * CFG.arenaH,
      r: 140 + rng() * 220,
      hue: rng() < 0.5 ? 262 : 190,
      alpha: 0.05 + rng() * 0.06,
    });
  }
  return { stars, nebulae };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, backdrop, time, shakeX, shakeY) {
  ctx.save();
  ctx.translate(shakeX, shakeY);
  const g = ctx.createLinearGradient(0, 0, 0, CFG.arenaH);
  g.addColorStop(0, '#070a1d');
  g.addColorStop(0.55, '#0b1030');
  g.addColorStop(1, '#12082a');
  ctx.fillStyle = g;
  ctx.fillRect(-20, -20, CFG.arenaW + 40, CFG.arenaH + 40);

  for (const n of backdrop.nebulae) {
    const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    ng.addColorStop(0, `hsla(${n.hue}, 70%, 55%, ${n.alpha})`);
    ng.addColorStop(1, 'hsla(260, 70%, 50%, 0)');
    ctx.fillStyle = ng;
    ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
  }
  for (const s of backdrop.stars) {
    const a = 0.35 + 0.35 * Math.sin(time * 1.4 + s.tw);
    ctx.globalAlpha = a * s.depth;
    ctx.fillStyle = '#cfe6ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawAura(ctx, p, time) {
  const pulse = 1 + 0.04 * Math.sin(time * 3);
  const r = p.auraRadius * pulse;
  const g = ctx.createRadialGradient(p.x, p.y, r * 0.15, p.x, p.y, r);
  g.addColorStop(0, 'rgba(255, 233, 163, 0.20)');
  g.addColorStop(0.7, 'rgba(125, 243, 255, 0.07)');
  g.addColorStop(1, 'rgba(125, 243, 255, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 233, 163, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.stroke();
}

function drawSkiff(ctx, p, time) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.invuln > 0 && Math.floor(time * 14) % 2 === 0) ctx.globalAlpha = 0.45;
  ctx.rotate(p.angle);
  // Hull: a small dart with a glowing lantern at its heart.
  ctx.fillStyle = '#2b3a67';
  ctx.strokeStyle = CYAN;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-12, -11);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-12, 11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const lg = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
  lg.addColorStop(0, 'rgba(255, 233, 163, 1)');
  lg.addColorStop(0.5, 'rgba(255, 209, 102, 0.55)');
  lg.addColorStop(1, 'rgba(255, 209, 102, 0)');
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff6cf';
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  if (p.dashTime > 0) {
    ctx.strokeStyle = 'rgba(125, 243, 255, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-14, -6);
    ctx.lineTo(-34, 0);
    ctx.lineTo(-14, 6);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWisp(ctx, w, time) {
  ctx.save();
  ctx.translate(w.x, w.y);
  const breathe = 1 + 0.08 * Math.sin(time * 2.4 + w.wobble);
  const r = w.radius * breathe;
  const g = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 1.5);
  g.addColorStop(0, `hsla(${w.hue}, 85%, 62%, 0.55)`);
  g.addColorStop(0.6, `hsla(${w.hue}, 85%, 45%, 0.18)`);
  g.addColorStop(1, `hsla(${w.hue}, 85%, 45%, 0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `hsla(${w.hue}, 70%, 32%, 0.9)`;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `hsla(${w.hue}, 90%, 70%, 0.8)`;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Two pale eyes that watch the skiff.
  const ex = r * 0.34;
  const ey = -r * 0.18;
  ctx.fillStyle = '#f4ecff';
  ctx.beginPath();
  ctx.arc(-ex, ey, r * 0.16, 0, Math.PI * 2);
  ctx.arc(ex, ey, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a0b26';
  ctx.beginPath();
  ctx.arc(-ex, ey, r * 0.07, 0, Math.PI * 2);
  ctx.arc(ex, ey, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
  if (w.kind === 'herald') {
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, r + 9 + 3 * Math.sin(time * 3), 0, Math.PI * 2);
    ctx.stroke();
    // Health bar above the Herald.
    const bw = 90;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(-bw / 2, -r - 22, bw, 7);
    ctx.fillStyle = RED;
    ctx.fillRect(-bw / 2, -r - 22, bw * Math.max(0, w.hp / w.maxHp), 7);
  } else if (w.hp < w.maxHp) {
    const bw = 34;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(-bw / 2, -r - 12, bw, 4);
    ctx.fillStyle = MAGENTA;
    ctx.fillRect(-bw / 2, -r - 12, bw * Math.max(0, w.hp / w.maxHp), 4);
  }
  ctx.restore();
}

function drawOrb(ctx, o) {
  const bob = Math.sin(o.bob) * 2;
  const r = CFG.orbRadius * (o.value > 1 ? 1.5 : 1);
  const g = ctx.createRadialGradient(o.x, o.y + bob, 0, o.x, o.y + bob, r * 2.4);
  g.addColorStop(0, 'rgba(125, 243, 255, 0.85)');
  g.addColorStop(0.4, 'rgba(125, 243, 255, 0.25)');
  g.addColorStop(1, 'rgba(125, 243, 255, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(o.x, o.y + bob, r * 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = o.value > 1 ? GOLD : '#b8f6ff';
  ctx.beginPath();
  ctx.arc(o.x, o.y + bob, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
}

function drawLance(ctx, l) {
  ctx.save();
  ctx.strokeStyle = '#ffe9a3';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(l.x - l.vx * 0.03, l.y - l.vy * 0.03);
  ctx.lineTo(l.x, l.y);
  ctx.stroke();
  ctx.fillStyle = '#fff6cf';
  ctx.beginPath();
  ctx.arc(l.x, l.y, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHud(ctx, game) {
  const p = game.world.player;
  const w = CFG.arenaW;
  ctx.save();
  ctx.textBaseline = 'alphabetic';

  // Top-left: hearts + lantern meter.
  for (let i = 0; i < p.maxHearts; i += 1) {
    const x = 28 + i * 30;
    const y = 30;
    ctx.fillStyle = i < p.hearts ? RED : 'rgba(255,93,122,0.18)';
    ctx.beginPath();
    ctx.moveTo(x, y + 6);
    ctx.bezierCurveTo(x - 9, y - 3, x - 5, y - 11, x, y - 4);
    ctx.bezierCurveTo(x + 5, y - 11, x + 9, y - 3, x, y + 6);
    ctx.fill();
  }
  ctx.fillStyle = DIM;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('LANTERN', 28, 58);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  roundRect(ctx, 28, 64, 150, 10, 5);
  ctx.fill();
  ctx.fillStyle = GOLD;
  roundRect(ctx, 28, 64, 150 * (p.lantern / 100), 10, 5);
  ctx.fill();

  // Top-center: wave + score.
  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText(`WAVE ${Math.max(1, game.director.wave)} / ${CFG.totalWaves}`, w / 2, 34);
  ctx.font = '700 26px system-ui, sans-serif';
  ctx.fillStyle = GOLD;
  ctx.fillText(`${game.score}`, w / 2, 64);
  if (game.combo.mult > 1) {
    ctx.fillStyle = CYAN;
    ctx.font = '700 16px system-ui, sans-serif';
    ctx.fillText(`COMBO x${game.combo.mult}`, w / 2, 86);
  }

  // Top-right: kills + mute hint.
  ctx.textAlign = 'right';
  ctx.fillStyle = INK;
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText(`KILLS ${game.world.kills}`, w - 28, 32);
  ctx.fillStyle = DIM;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(game.audio.muted ? 'MUTED (M)' : 'M mute · P pause', w - 28, 52);

  // Bottom-left: dash + lance charges.
  ctx.textAlign = 'left';
  ctx.fillStyle = DIM;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('DASH', 28, CFG.arenaH - 44);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  roundRect(ctx, 28, CFG.arenaH - 38, 120, 9, 4);
  ctx.fill();
  const dashFrac = p.dashCooldown <= 0 ? 1 : 1 - p.dashCooldown / p.dashCooldownSec;
  ctx.fillStyle = CYAN;
  roundRect(ctx, 28, CFG.arenaH - 38, 120 * dashFrac, 9, 4);
  ctx.fill();
  ctx.fillStyle = DIM;
  ctx.fillText('LANCE', 28, CFG.arenaH - 14);
  for (let i = 0; i < p.lanceMaxAmmo; i += 1) {
    ctx.fillStyle = i < p.lanceAmmo ? GOLD : 'rgba(255,209,102,0.18)';
    ctx.beginPath();
    ctx.arc(96 + i * 20, CFG.arenaH - 18, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bottom-right: controls reminder.
  ctx.textAlign = 'right';
  ctx.fillStyle = DIM;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('WASD move · mouse aim · click lance · Space dash', w - 28, CFG.arenaH - 16);

  // Wave banner.
  if (game.director.bannerTimer > 0 && game.director.banner) {
    const a = Math.min(1, game.director.bannerTimer);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.fillStyle = GOLD;
    ctx.font = '700 34px system-ui, sans-serif';
    ctx.fillText(game.director.banner, w / 2, 150);
    if (game.director.wave > 0) {
      ctx.fillStyle = DIM;
      ctx.font = '16px system-ui, sans-serif';
      ctx.fillText(WAVE_TITLES[game.director.wave - 1] || '', w / 2, 178);
    }
    ctx.globalAlpha = 1;
  }

  // Low-health vignette.
  if (p.hearts === 1 && !p.dead) {
    const vg = ctx.createRadialGradient(w / 2, CFG.arenaH / 2, CFG.arenaH * 0.35, w / 2, CFG.arenaH / 2, CFG.arenaH * 0.75);
    vg.addColorStop(0, 'rgba(255, 40, 70, 0)');
    vg.addColorStop(1, `rgba(255, 40, 70, ${0.22 + 0.1 * Math.sin(game.world.time * 4)})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, CFG.arenaH);
  }
  if (game.world.flash > 0) {
    ctx.fillStyle = `rgba(255, 60, 80, ${game.world.flash * 0.35})`;
    ctx.fillRect(0, 0, w, CFG.arenaH);
  }
  ctx.restore();
}

function drawTitle(ctx, game) {
  const w = CFG.arenaW;
  const h = CFG.arenaH;
  ctx.save();
  ctx.fillStyle = 'rgba(4, 6, 20, 0.55)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('A LANTERN KEEPER SURVIVAL', w / 2, 128);
  ctx.fillStyle = INK;
  ctx.font = '700 84px system-ui, sans-serif';
  ctx.fillText('LUMEN DRIFT', w / 2, 216);
  ctx.fillStyle = DIM;
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('Gather lumen orbs. Burn the wisps. Survive 10 waves until dawn.', w / 2, 256);
  ctx.fillStyle = CYAN;
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('WASD / arrows — move      Mouse — aim      Click — lance shot', w / 2, 316);
  ctx.fillText('Space — dash      P — pause      M — mute', w / 2, 342);
  ctx.fillStyle = INK;
  ctx.font = '700 20px system-ui, sans-serif';
  const pulse = 0.75 + 0.25 * Math.sin(game.world.time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillText('— PRESS ENTER TO SET SAIL —', w / 2, 420);
  ctx.globalAlpha = 1;
  ctx.fillStyle = DIM;
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('3 hearts · lantern aura burns nearby wisps · pick 1 upgrade between waves', w / 2, 470);
  ctx.fillText('Win: see the dawn after wave 10. Lose: your hull breaks.', w / 2, 494);
  ctx.restore();
}

function drawUpgrade(ctx, game) {
  const w = CFG.arenaW;
  ctx.save();
  ctx.fillStyle = 'rgba(4, 6, 20, 0.72)';
  ctx.fillRect(0, 0, w, CFG.arenaH);
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD;
  ctx.font = '700 40px system-ui, sans-serif';
  ctx.fillText(`WAVE ${game.director.wave} CLEARED`, w / 2, 110);
  ctx.fillStyle = INK;
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('The drift quiets. Choose one blessing for the next wave.', w / 2, 146);
  const cards = game.upgradeCards;
  const cw = 300;
  const ch = 210;
  const gap = 36;
  const total = cards.length * cw + (cards.length - 1) * gap;
  const x0 = (w - total) / 2;
  const y0 = 210;
  cards.forEach((card, i) => {
    const x = x0 + i * (cw + gap);
    const hover = game.hoverCard === i;
    ctx.fillStyle = hover ? 'rgba(43, 58, 103, 0.95)' : 'rgba(20, 28, 58, 0.9)';
    roundRect(ctx, x, y0, cw, ch, 14);
    ctx.fill();
    ctx.strokeStyle = hover ? GOLD : 'rgba(125, 243, 255, 0.5)';
    ctx.lineWidth = hover ? 3 : 1.5;
    roundRect(ctx, x, y0, cw, ch, 14);
    ctx.stroke();
    ctx.fillStyle = GOLD;
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`[ ${i + 1} ]`, x + cw / 2, y0 + 40);
    ctx.fillStyle = INK;
    ctx.font = '700 21px system-ui, sans-serif';
    ctx.fillText(card.name, x + cw / 2, y0 + 78);
    ctx.fillStyle = DIM;
    ctx.font = '15px system-ui, sans-serif';
    wrapText(ctx, card.desc, x + cw / 2, y0 + 116, cw - 44, 22);
  });
  ctx.fillStyle = DIM;
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('Click a card, or press 1 / 2 / 3', w / 2, y0 + ch + 52);
  ctx.restore();
}

function wrapText(ctx, text, cx, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, yy);
      line = word;
      yy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, cx, yy);
}

function drawEnd(ctx, game, won) {
  const w = CFG.arenaW;
  const h = CFG.arenaH;
  ctx.save();
  ctx.fillStyle = won ? 'rgba(20, 26, 8, 0.62)' : 'rgba(20, 4, 12, 0.68)';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  if (won) {
    ctx.fillStyle = GOLD;
    ctx.font = '700 64px system-ui, sans-serif';
    ctx.fillText('DAWN BREAKS', w / 2, 210);
    ctx.fillStyle = INK;
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('The tenth wave breaks, the dark thins, and the Hollow Drift glows gold.', w / 2, 252);
  } else {
    ctx.fillStyle = RED;
    ctx.font = '700 64px system-ui, sans-serif';
    ctx.fillText('THE LIGHT FADES', w / 2, 210);
    ctx.fillStyle = INK;
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText(`The wisps take the lantern on wave ${Math.max(1, game.director.wave)}.`, w / 2, 252);
  }
  ctx.fillStyle = GOLD;
  ctx.font = '700 34px system-ui, sans-serif';
  ctx.fillText(`SCORE ${game.score}`, w / 2, 330);
  ctx.fillStyle = DIM;
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText(`Waves cleared: ${won ? CFG.totalWaves : Math.max(0, game.director.wave - 1)}   ·   Wisps burned: ${game.world.kills}   ·   Hearts left: ${Math.max(0, game.world.player.hearts)}`, w / 2, 372);
  const pulse = 0.75 + 0.25 * Math.sin(game.world.time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = INK;
  ctx.font = '700 20px system-ui, sans-serif';
  ctx.fillText('— PRESS R TO SAIL AGAIN —', w / 2, 448);
  ctx.globalAlpha = 1;
  ctx.fillStyle = DIM;
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('Enter starts a new run from the title screen.', w / 2, 486);
  ctx.restore();
}

function drawPause(ctx, game) {
  ctx.save();
  ctx.fillStyle = 'rgba(4, 6, 20, 0.6)';
  ctx.fillRect(0, 0, CFG.arenaW, CFG.arenaH);
  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = '700 48px system-ui, sans-serif';
  ctx.fillText('PAUSED', CFG.arenaW / 2, 330);
  ctx.fillStyle = DIM;
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('Press P or Esc to keep sailing', CFG.arenaW / 2, 372);
  ctx.restore();
}

// Paint one frame. game carries world, director, score, combo, audio,
// upgradeCards, hoverCard and the current state.
export function render(ctx, game, backdrop) {
  const world = game.world;
  const shakeMag = world.shake;
  // Deterministic shake: a hash of the frame number, never Math.random,
  // so the same seed always renders the same pixels.
  const frameNo = Math.floor(world.time * 60);
  const hash = (n) => {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const shakeX = shakeMag > 0 ? (hash(frameNo) - 0.5) * shakeMag : 0;
  const shakeY = shakeMag > 0 ? (hash(frameNo + 57) - 0.5) * shakeMag : 0;
  drawBackground(ctx, backdrop, world.time, shakeX, shakeY);
  ctx.save();
  ctx.translate(shakeX, shakeY);

  for (const o of world.orbs) drawOrb(ctx, o);
  for (const w of world.wisps) drawWisp(ctx, w, world.time);
  for (const s of world.shards) {
    ctx.fillStyle = '#ff8fb0';
    ctx.beginPath();
    ctx.arc(s.x, s.y, CFG.heraldShardRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  if (!world.player.dead) {
    drawAura(ctx, world.player, world.time);
    drawSkiff(ctx, world.player, world.time);
  }
  for (const l of world.lances) drawLance(ctx, l);
  for (const pt of world.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.max(0, f.life / CFG.floatTextLifeSec);
    ctx.fillStyle = f.color;
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  if (game.state === 'playing' || game.state === 'paused') drawHud(ctx, game);
  if (game.state === 'title') drawTitle(ctx, game);
  if (game.state === 'upgrade') { drawHud(ctx, game); drawUpgrade(ctx, game); }
  if (game.state === 'victory') drawEnd(ctx, game, true);
  if (game.state === 'gameover') drawEnd(ctx, game, false);
  if (game.state === 'paused') drawPause(ctx, game);
}
