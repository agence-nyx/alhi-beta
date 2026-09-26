#!/usr/bin/env node
// =============================================================================
// DRY-BUILD — validation de la coherence des donnees avant tout build reel.
// -----------------------------------------------------------------------------
// S'arrete net (exit code 1) avec un message explicite au PREMIER probleme
// detecte. Pas de build silencieux ou partiel.
//
// Usage :
//   node scripts/dry-build.mjs                  -> valide fixtures/ (toutes les periodes)
//   node scripts/dry-build.mjs --root <dossier>  -> valide un dossier donne
//   node scripts/dry-build.mjs --demo-invalid    -> demontre les 4 cas d'erreur
//                                                    sur fixtures/invalid/*
// =============================================================================

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

class ValidationError extends Error {}

/**
 * Valide une periode (un dossier [Periode]/) et leve une ValidationError
 * explicite au premier probleme trouve. Ne retourne rien si tout est valide.
 */
function validatePeriod(periodDir, periodLabel) {
  const etuPath = path.join(periodDir, "sheet_etudiant.json");
  if (!fs.existsSync(etuPath)) {
    throw new ValidationError(
      `[${periodLabel}] sheet_etudiant.json introuvable dans ${periodDir}`
    );
  }
  const students = JSON.parse(fs.readFileSync(etuPath, "utf-8"));

  // --- CAS 1 : doublon d'ID dans le sheet etudiant -------------------------
  const seenIds = new Map();
  for (const s of students) {
    if (seenIds.has(s.ID)) {
      throw new ValidationError(
        `[${periodLabel}] Doublon d'ID dans sheet_etudiant : "${s.ID}" apparait ` +
          `au moins deux fois (ex: ${seenIds.get(s.ID)} et ${s.Nom} ${s.Prenom}). ` +
          `Chaque ID doit etre unique au sein d'une periode.`
      );
    }
    seenIds.set(s.ID, `${s.Nom} ${s.Prenom}`);
  }

  const photoDir = path.join(periodDir, "photo");

  // --- CAS 2 : un ID sans photo individuelle correspondante ----------------
  for (const s of students) {
    const photoPath = path.join(photoDir, s.Filiere, `${s.ID}.jpg`);
    if (!fs.existsSync(photoPath)) {
      throw new ValidationError(
        `[${periodLabel}] Photo manquante pour l'etudiant "${s.ID}" ` +
          `(${s.Nom} ${s.Prenom}, filiere ${s.Filiere}). ` +
          `Fichier attendu : photo/${s.Filiere}/${s.ID}.jpg`
      );
    }
  }

  // --- CAS 3 : une filiere presente dans le sheet sans photo_group.png ----
  const filieresInSheet = [...new Set(students.map((s) => s.Filiere))];
  for (const filiere of filieresInSheet) {
    const groupPhotoPath = path.join(photoDir, filiere, "photo_group.png");
    if (!fs.existsSync(groupPhotoPath)) {
      throw new ValidationError(
        `[${periodLabel}] Photo de groupe manquante pour la filiere "${filiere}". ` +
          `Fichier attendu : photo/${filiere}/photo_group.png`
      );
    }
  }

  // --- CAS 4 : un cours liste (dossier Annee) sans support.pdf ------------
  const coursesRoot = path.join(periodDir, "cours");
  if (fs.existsSync(coursesRoot)) {
    for (const filiereDir of fs.readdirSync(coursesRoot, { withFileTypes: true })) {
      if (!filiereDir.isDirectory()) continue;
      const filierePath = path.join(coursesRoot, filiereDir.name);

      for (const coursDir of fs.readdirSync(filierePath, { withFileTypes: true })) {
        if (!coursDir.isDirectory()) continue;
        const coursPath = path.join(filierePath, coursDir.name);

        for (const anneeDir of fs.readdirSync(coursPath, { withFileTypes: true })) {
          if (!anneeDir.isDirectory()) continue;
          const anneePath = path.join(coursPath, anneeDir.name);
          const pdfPath = path.join(anneePath, "support.pdf");

          if (!fs.existsSync(pdfPath)) {
            throw new ValidationError(
              `[${periodLabel}] PDF manquant pour le cours ` +
                `"${filiereDir.name}/${coursDir.name}/${anneeDir.name}". ` +
                `Fichier attendu : cours/${filiereDir.name}/${coursDir.name}/${anneeDir.name}/support.pdf`
            );
          }
        }
      }
    }
  }
}

/**
 * Valide toutes les periodes trouvees sous `root` (hors dossier "invalid").
 */
function validateAll(root) {
  if (!fs.existsSync(root)) {
    throw new ValidationError(`Dossier de donnees introuvable : ${root}`);
  }
  const periods = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "invalid")
    .map((d) => d.name);

  if (periods.length === 0) {
    throw new ValidationError(`Aucune periode trouvee dans ${root}`);
  }

  for (const period of periods.sort()) {
    validatePeriod(path.join(root, period), period);
    console.log(`  OK  ${period}`);
  }
}

function runDemoInvalid() {
  const invalidRoot = path.join(PROJECT_ROOT, "fixtures", "invalid");
  const cases = fs
    .readdirSync(invalidRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  console.log("=== Demonstration du dry-build sur les 4 cas invalides ===\n");
  let allCaught = true;

  for (const caseName of cases) {
    const caseDir = path.join(invalidRoot, caseName);
    process.stdout.write(`Cas "${caseName}" : `);
    try {
      validatePeriod(caseDir, caseName);
      console.log("PAS D'ERREUR DETECTEE (probleme : ce cas aurait du echouer !)");
      allCaught = false;
    } catch (err) {
      if (err instanceof ValidationError) {
        console.log(`BLOQUE comme attendu\n    -> ${err.message}\n`);
      } else {
        throw err;
      }
    }
  }

  if (!allCaught) {
    console.error("\nCertains cas invalides n'ont PAS ete detectes. Voir ci-dessus.");
    process.exit(1);
  }
  console.log("Les 4 cas invalides sont correctement bloques par le dry-build.");
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes("--demo-invalid")) {
    runDemoInvalid();
    return;
  }

  const rootArgIndex = args.indexOf("--root");
  const root =
    rootArgIndex !== -1 && args[rootArgIndex + 1]
      ? path.resolve(args[rootArgIndex + 1])
      : path.join(PROJECT_ROOT, "fixtures");

  console.log(`Dry-build : validation des donnees dans ${root}\n`);
  try {
    validateAll(root);
    console.log("\nToutes les periodes sont valides. Le build peut continuer.");
  } catch (err) {
    if (err instanceof ValidationError) {
      console.error(`\nECHEC DU DRY-BUILD\n${err.message}\n`);
      console.error("Build interrompu : corrige le probleme ci-dessus avant de relancer.");
      process.exit(1);
    }
    throw err;
  }
}

main();
