// Hand-in program for the best-stealth-game entry (Node 22, standard library only).
//
// What it does, in plain terms: it takes the finished game (the static files in
// game/) and the screenshots (in screenshots/) that sit next to this file, copies
// both folders into the hand-in directory, and writes dossier.json there — the
// summary the judge reads — using the vendored make.fun library.
//
// The hand-in directory is /output inside the grader. Anywhere else, the
// MAKEFUN_OUTPUT_DIR environment variable stands in for it:
//
//   MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The copy is deliberately additive: the destination folder is created if it is
// missing and existing files are simply overwritten. Nothing is ever deleted, so
// a second run over the same directory produces exactly the same bytes.

import { cpSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The folder this file lives in is the repository root.
const repoRoot = dirname(fileURLToPath(import.meta.url));

// Where the finished entry goes. The grader supplies /output; a local run
// points MAKEFUN_OUTPUT_DIR at a scratch folder instead.
const handInDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');

function copyFolderIntoHandIn(name) {
  const from = join(repoRoot, name);
  // Fail fast with a readable message when a source folder is missing, instead
  // of letting the copy throw a bare filesystem error halfway through.
  if (!existsSync(from)) {
    throw new Error(`missing source folder next to main.ts: ${name}/`);
  }
  const to = join(handInDir, name);
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

// Copy the playable game first, then its screenshots.
copyFolderIntoHandIn('game');
copyFolderIntoHandIn('screenshots');

// The caps the scorer enforces (see the kit's gate): the judge's text is capped
// at 160 KiB; at most 4 screenshots, each at most 256 KiB; the game holds at
// most 993 files and directories totalling at most 48 MiB, and no path inside
// it may run longer than 1000 UTF-8 bytes. buildDossier refuses anything the
// scorer would refuse, so a dossier it writes is one the gate accepts.
const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

const dossierText = buildDossier(handInDir, dossierCaps);
const dossierPath = join(handInDir, 'dossier.json');
writeFileSync(dossierPath, dossierText);

// One short line on stdout so a local run shows what landed; the grader
// ignores stdout, and the line carries no timestamp, so a repeat run stays
// byte-identical.
console.log(
  `hand-in ready in ${handInDir}: game/ + screenshots/ copied, dossier.json ${statSync(dossierPath).size} bytes`,
);
