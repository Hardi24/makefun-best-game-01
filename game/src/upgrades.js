// Upgrade cards offered between waves. Three are drawn at random from
// the pool, duplicates excluded; the player picks one and its effect
// lands on the skiff immediately. One-time blessings (a second copy
// would do nothing) are never offered twice in one run.
import { UPGRADE_POOL } from './config.js';
import { shuffle } from './random.js';

const ONE_TIME = new Set(['piercing-lance', 'twin-lance', 'ricochet-lance', 'ember-trail', 'herald-bane', 'orb-magnet']);

export function drawUpgrades(rng, count, taken) {
  const owned = taken || [];
  const pool = shuffle(rng, UPGRADE_POOL.filter((c) => !ONE_TIME.has(c.id) || !owned.includes(c.id)));
  return pool.slice(0, count);
}

export function applyUpgrade(player, card) {
  card.apply(player);
}

export function describeUpgrades(cards) {
  return cards.map((c) => `${c.name} — ${c.desc}`);
}
