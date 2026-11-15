// The wave director: how many wisps each wave brings, when the Herald
// arrives, and when a wave is done. It only counts and spawns; the world
// owns movement and combat.
import { CFG } from './config.js';
import { spawnWisp } from './world.js';

export function makeDirector() {
  return {
    wave: 0,
    toSpawn: 0,
    spawned: 0,
    spawnTimer: 0,
    heraldSpawned: false,
    banner: '',
    bannerTimer: 0,
    betweenWaves: false,
  };
}

export function waveSize(wave) {
  return CFG.baseWisps + (wave - 1) * CFG.wispsPerWave;
}

export function waveGrowth(wave) {
  return 1 + (wave - 1) * CFG.waveGrowth;
}

export function isHeraldWave(wave) {
  return wave % 5 === 0;
}

export function startWave(director, wave, title) {
  director.wave = wave;
  director.toSpawn = waveSize(wave);
  director.spawned = 0;
  director.spawnTimer = 0.4;
  director.heraldSpawned = false;
  director.betweenWaves = false;
  director.banner = title;
  director.bannerTimer = 2.6;
}

export function stepDirector(director, world, dt) {
  if (director.bannerTimer > 0) director.bannerTimer -= dt;
  if (director.betweenWaves) return false;

  // The Herald arrives halfway through its wave.
  if (isHeraldWave(director.wave) && !director.heraldSpawned && director.spawned >= Math.floor(director.toSpawn / 2)) {
    director.heraldSpawned = true;
    spawnWisp(world, 'herald', CFG.heraldHpMult * waveGrowth(director.wave), 0.7);
    director.banner = 'THE GLOOM HERALD';
    director.bannerTimer = 2.6;
  }

  if (director.spawned < director.toSpawn) {
    director.spawnTimer -= dt;
    if (director.spawnTimer <= 0) {
      director.spawnTimer = CFG.spawnIntervalSec;
      director.spawned += 1;
      const g = waveGrowth(director.wave);
      spawnWisp(world, 'wisp', g, g);
    }
  }

  // Wave ends when everything spawned has been cleared.
  const done = director.spawned >= director.toSpawn && world.wisps.length === 0 && world.shards.length === 0;
  if (done) director.betweenWaves = true;
  return done;
}
