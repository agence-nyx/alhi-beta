#!/usr/bin/env node
// =============================================================================
// Copie les fichiers binaires (photos, PDF) des fixtures vers public/data/
// en conservant la structure relative, pour qu'Astro puisse les servir
// tels quels (public/ est copie tel quel dans le build final).
//
// En production (API Google Drive), cette etape sera remplacee par un
// telechargement des fichiers depuis Drive vers public/data/ au moment du
// build — le reste du site (chemins relatifs) ne change pas.
// =============================================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const FIXTURES_ROOT = path.join(PROJECT_ROOT, "fixtures");
const PUBLIC_DATA = path.join(PROJECT_ROOT, "public", "data");

function copyRecursive(src, dest, filter) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry), filter);
    }
  } else if (stat.isFile()) {
    if (!filter || filter(src)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
  }
}

function main() {
  if (fs.existsSync(PUBLIC_DATA)) {
    fs.rmSync(PUBLIC_DATA, { recursive: true, force: true });
  }
  fs.mkdirSync(PUBLIC_DATA, { recursive: true });

  const periods = fs
    .readdirSync(FIXTURES_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "invalid")
    .map((d) => d.name);

  // Ne copier que les images et PDF (pas les .json, pas metadata.json)
  const isAsset = (filePath) => /\.(jpe?g|png|pdf)$/i.test(filePath);

  for (const period of periods) {
    const src = path.join(FIXTURES_ROOT, period);
    const dest = path.join(PUBLIC_DATA, period);
    copyRecursive(src, dest, isAsset);
  }

  console.log(`Assets copies vers ${path.relative(PROJECT_ROOT, PUBLIC_DATA)}/ pour ${periods.length} periode(s).`);
}

main();
