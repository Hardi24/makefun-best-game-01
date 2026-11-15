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

  // Wisps: the drifting dark.
  wispRadius: 18,
  wispHp: 30,
  wispSpeed: 62,
  wispTouchDamage: 1,
  wispScore: 25,

  // The Gloom Herald: a big elite that shows up every fifth wave.
  heraldRadius: 52,
  heraldHpMult: 10,
  heraldSpeed: 42,
  heraldRadialSec: 5,
  heraldShardSpeed: 170,
  heraldShardRadius: 7,
  heraldScore: 500,

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
];

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
