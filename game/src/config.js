// LUMEN DRIFT — tuning constants. One place for every number the game
// balances on, so a playtest tweak never means hunting through logic.
export const CFG = {
  arenaW: 1280,
  arenaH: 720,

  // The light-skiff the player flies.
  skiffSpeed: 260,
  skiffRadius: 16,
  startHearts: 3,
  maxHearts: 5,
  hitInvulnSec: 1.2,

  // Dash: a short burst through wisps with brief invulnerability.
  dashSpeed: 540,
  dashTimeSec: 0.18,
  dashCooldownSec: 2.2,
  dashInvulnSec: 0.35,

  // The lantern aura: a ring of light that burns wisps that drift too close.
  auraRadius: 92,
  auraDamagePerSec: 24,
  auraPulseSec: 2.4,

  // The lance: aimed shots toward the cursor, limited charges that refill.
  lanceDamage: 40,
  lanceSpeed: 640,
  lanceAmmo: 3,
  lanceMaxAmmo: 6,
  lanceRechargeSec: 1.8,
  lanceRadius: 5,

  // Wisps: the drifting dark. Four kinds, each with its own shape of
  // trouble — the wave director mixes them in as the nights deepen.
  wispRadius: 18,
  wispHp: 30,
  wispSpeed: 62,
  wispTouchDamage: 1,
  wispScore: 25,

  // Kind table: speed/hp/radius multipliers, hue, score, orbs on death.
  // Dart: quick and frail, lunges in from the dark. Bulwark: slow, huge,
  // shrugs off lance shots. Mote: splits into two sparks when it pops.
  // Spark: the mote's children, small and skittish.
  wispKinds: {
    drifter: { speed: 1, hp: 1, radius: 1, hue: 315, score: 25, orbs: 2 },
    dart: { speed: 1.55, hp: 0.5, radius: 0.8, hue: 32, score: 35, orbs: 1 },
    bulwark: { speed: 0.55, hp: 2.5, radius: 1.5, hue: 265, score: 75, orbs: 3 },
    mote: { speed: 0.9, hp: 0.8, radius: 0.9, hue: 150, score: 40, orbs: 1 },
    spark: { speed: 1.3, hp: 0.4, radius: 0.55, hue: 150, score: 15, orbs: 1 },
  },

  // The Gloom Herald: a big elite that shows up every fifth wave.
  heraldRadius: 52,
  heraldHpMult: 10,
  heraldSpeed: 42,
  heraldRadialSec: 5,
  heraldShardSpeed: 170,
  heraldShardRadius: 7,
  heraldScore: 500,

  // The Dusk Sovereign: the final night's master. Bigger than the
  // Herald, throws twelve shards at once and calls wisps to its side.
  sovereignRadius: 72,
  sovereignHpMult: 14,
  sovereignSpeed: 36,
  sovereignRadialSec: 4.5,
  sovereignShards: 12,
  sovereignSummonSec: 8,
  sovereignSummonCount: 2,
  sovereignScore: 1200,

  // Waves: 10 waves to dawn. Wave 1 opens with 6 wisps, then +3 each wave,
  // and every wave after the first is 6% faster and tougher than the last.
  totalWaves: 10,
  baseWisps: 6,
  wispsPerWave: 3,
  waveGrowth: 0.05,
  spawnIntervalSec: 1.05,
  waveClearBonus: 100,

  // Lumen orbs: dropped by fallen wisps, feed the combo and the lantern.
  orbRadius: 8,
  orbMagnetBase: 70,
  orbComboWindowSec: 4,
  orbScore: 10,
  comboMax: 5,
  heraldOrbs: 12,

  // Pickups and pacing.
  floatTextLifeSec: 0.9,
  particleLifeSec: 0.6,
  shakeDecay: 26,
  victoryHeartBonus: 250,

  // Cosmetic counts.
  starCount: 130,
  nebulaCount: 7,
};

export const UPGRADE_POOL = [
  { id: 'wide-lantern', name: 'WIDE LANTERN', desc: 'Lantern aura +25% radius.', apply: (p) => { p.auraRadius *= 1.25; } },
  { id: 'swift-dash', name: 'SWIFT DASH', desc: 'Dash recharges 25% faster.', apply: (p) => { p.dashCooldownSec *= 0.75; } },
  { id: 'orb-magnet', name: 'ORB MAGNET', desc: 'Orbs drift to you from 220 px away.', apply: (p) => { p.magnetRadius = 220; } },
  { id: 'sturdy-hull', name: 'STURDY HULL', desc: '+1 heart (max 5).', apply: (p) => { p.maxHearts = Math.min(5, p.maxHearts + 1); p.hearts = Math.min(p.maxHearts, p.hearts + 1); } },
  { id: 'spare-lance', name: 'SPARE LANCE', desc: '+1 lance charge (max 6).', apply: (p) => { p.lanceMaxAmmo = Math.min(6, p.lanceMaxAmmo + 1); p.lanceAmmo = Math.min(p.lanceMaxAmmo, p.lanceAmmo + 1); } },
  { id: 'piercing-lance', name: 'PIERCING LANCE', desc: 'Lance shots pierce through wisps.', apply: (p) => { p.lancePierce = true; } },
  { id: 'bright-pulse', name: 'BRIGHT PULSE', desc: 'Lantern aura deals +50% damage.', apply: (p) => { p.auraDamage *= 1.5; } },
  { id: 'quick-lance', name: 'QUICK LANCE', desc: 'Lance recharges 30% faster.', apply: (p) => { p.lanceRecharge *= 0.7; } },
  { id: 'twin-lance', name: 'TWIN LANCE', desc: 'Every lance shot fires two bolts in a fan.', apply: (p) => { p.twinLance = true; } },
  { id: 'ricochet-lance', name: 'RICOCHET LANCE', desc: 'Lance shots leap to one more wisp nearby.', apply: (p) => { p.ricochet = true; } },
  { id: 'ember-trail', name: 'EMBER TRAIL', desc: 'Your dash leaves burning embers that scorch wisps.', apply: (p) => { p.emberTrail = true; } },
  { id: 'herald-bane', name: 'HERALD BANE', desc: 'Double damage against Heralds and the Sovereign.', apply: (p) => { p.heraldBane = true; } },
];

// Four realms, one per three waves: the drift itself changes colour,
// light and mood as the nights deepen toward dawn.
export const REALMS = [
  { name: 'THE INDIGO DEEP', top: '#070a1d', mid: '#0b1030', bot: '#12082a', nebula: [262, 190] },
  { name: 'THE EMBER REACHES', top: '#160a12', mid: '#241026', bot: '#2e0f1e', nebula: [16, 340] },
  { name: 'THE VERDANT HOLLOW', top: '#071410', mid: '#0b2018', bot: '#0e2412', nebula: [150, 190] },
  { name: 'THE PALE DAWN', top: '#0e1226', mid: '#1a2038', bot: '#2c2a44', nebula: [45, 220] },
];

export function realmForWave(wave) {
  return REALMS[Math.min(REALMS.length - 1, Math.floor((wave - 1) / 3))];
}

export const WAVE_TITLES = [
  'THE DRIFT AWAKENS',
  'WHISPERS MULTIPLY',
  'THE DARK THICKENS',
  'COLD CURRENTS',
  'THE HERALD STIRS',
  'EMBER TIDE',
  'HOLLOW WINDS',
  'THE LONG NIGHT',
  'SHADOWS GATHER',
  'THE LAST NIGHT',
];
