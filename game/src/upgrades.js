// Upgrade cards offered between waves. Three are drawn at random from
// the pool, duplicates excluded; the player picks one and its effect
// lands on the skiff immediately.
import { UPGRADE_POOL } from './config.js';
import { shuffle } from './random.js';

export function drawUpgrades(rng, count) {
  const pool = shuffle(rng, UPGRADE_POOL);
  return pool.slice(0, count);
}

export function applyUpgrade(player, card) {
  card.apply(player);
}

export function describeUpgrades(cards) {
  return cards.map((c) => `${c.name} — ${c.desc}`);
}
