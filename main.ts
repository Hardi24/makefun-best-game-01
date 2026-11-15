// LUMEN DRIFT — entry program for make.fun best-game-01 (Node 22,
// standard library only).
//
// What it does: take this repository's game/ (the playable static game)
// and screenshots/ (its four real renders) and hand them to the grader
// as /output, plus /output/dossier.json — the summary the judge reads —
// written by the kit's vendored library.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for
// /output, e.g.:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps for this competition (see the kit's gate): the game
// must stay small and self-contained, screenshots few and light, and the
// dossier text capped so the judge's view fits its token budget.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyTree(src, dest) {
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}

function countFiles(dir) {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    n += entry.isDirectory() ? countFiles(p) : 1;
  }
  return n;
}

mkdirSync(outDir, { recursive: true });

const gameSrc = join(repoRoot, 'game');
copyTree(gameSrc, join(outDir, 'game'));

const shotsSrc = join(repoRoot, 'screenshots');
if (existsSync(shotsSrc)) {
  copyTree(shotsSrc, join(outDir, 'screenshots'));
}

const dossier = buildDossier(outDir, DOSSIER_CAPS);
writeFileSync(join(outDir, 'dossier.json'), dossier);

const shotNames = existsSync(shotsSrc) ? readdirSync(shotsSrc).sort() : [];
const gameBytes = statSync(gameSrc).isDirectory()
  ? countFiles(gameSrc)
  : 0;
console.log(JSON.stringify({
  output: outDir,
  gameFiles: gameBytes,
  screenshots: shotNames,
  dossierBytes: Buffer.byteLength(dossier, 'utf8'),
}));
