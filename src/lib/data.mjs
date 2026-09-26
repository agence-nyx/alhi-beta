// =============================================================================
// COUCHE D'ACCES AUX DONNEES ("archive")
// -----------------------------------------------------------------------------
// Pour la beta, ce fichier lit des fixtures locales dans /fixtures qui imitent
// exactement l'arborescence du Google Drive decrite dans le brief.
//
// EN PRODUCTION : ce fichier sera le SEUL a modifier pour brancher l'API
// Google Drive/Sheets a la place du systeme de fichiers local. Toutes les
// pages Astro et le script de dry-build passent par les fonctions exportees
// ici (loadPeriods, loadPeriodData, loadAllCourses) — elles ne touchent
// jamais directement au systeme de fichiers. Remplacer le corps de ces
// fonctions par des appels a googleapis (Drive + Sheets) suffira, sans
// toucher au reste du site.
// =============================================================================

import fs from "node:fs";
import path from "node:path";

/**
 * Racine des donnees. En beta = dossier fixtures/.
 * En prod, cette notion de "racine" n'existera plus telle quelle : elle sera
 * remplacee par l'ID du dossier racine du Drive (variable d'env).
 */
export function getDataRoot() {
  return process.env.ARCHIVE_DATA_ROOT
    ? path.resolve(process.env.ARCHIVE_DATA_ROOT)
    : path.resolve(process.cwd(), "fixtures");
}

/**
 * Liste les periodes (promotions) disponibles, ex: ["2023-2024", "2024-2025"].
 * Ignore le dossier "invalid" qui sert uniquement a demontrer le dry-build.
 */
export function loadPeriods(root = getDataRoot()) {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "invalid")
    .map((d) => d.name)
    .sort(); // tri chronologique simple (format "YYYY-YYYY" trie bien en texte)
}

function readJsonOrEmpty(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

/**
 * Charge les cours d'une periode en parcourant cours/[Filiere]/[NomCours]/[Annee]/
 */
function loadCoursesForPeriod(periodDir) {
  const coursesRoot = path.join(periodDir, "cours");
  const courses = [];
  if (!fs.existsSync(coursesRoot)) return courses;

  for (const filiereDir of fs.readdirSync(coursesRoot, { withFileTypes: true })) {
    if (!filiereDir.isDirectory()) continue;
    const filiere = filiereDir.name;
    const filierePath = path.join(coursesRoot, filiere);

    for (const coursDir of fs.readdirSync(filierePath, { withFileTypes: true })) {
      if (!coursDir.isDirectory()) continue;
      const nomCours = coursDir.name;
      const coursPath = path.join(filierePath, nomCours);

      for (const anneeDir of fs.readdirSync(coursPath, { withFileTypes: true })) {
        if (!anneeDir.isDirectory()) continue;
        const annee = anneeDir.name;
        const anneePath = path.join(coursPath, annee);
        const pdfPath = path.join(anneePath, "support.pdf");
        const metaPath = path.join(anneePath, "metadata.json");
        const meta = fs.existsSync(metaPath)
          ? JSON.parse(fs.readFileSync(metaPath, "utf-8"))
          : {};

        courses.push({
          filiere,
          nomCours,
          annee,
          intitule: meta.intitule || nomCours,
          volumeHoraire: meta.volumeHoraire ?? null,
          hasPdf: fs.existsSync(pdfPath),
          pdfRelPath: fs.existsSync(pdfPath)
            ? path.relative(getDataRoot(), pdfPath)
            : null,
        });
      }
    }
  }
  return courses;
}

/**
 * Charge toutes les donnees d'une periode : etudiants, admins, cours, photos.
 */
export function loadPeriodData(period, root = getDataRoot()) {
  const periodDir = path.join(root, period);
  const students = readJsonOrEmpty(path.join(periodDir, "sheet_etudiant.json"));
  const admins = readJsonOrEmpty(path.join(periodDir, "sheet_admin.json"));
  const courses = loadCoursesForPeriod(periodDir);

  const photoDir = path.join(periodDir, "photo");
  const filieres = fs.existsSync(photoDir)
    ? fs
        .readdirSync(photoDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)
    : [];

  function photoPathFor(id, filiere) {
    const p = path.join(photoDir, filiere, `${id}.jpg`);
    return fs.existsSync(p) ? path.relative(root, p) : null;
  }
  function groupPhotoPathFor(filiere) {
    const p = path.join(photoDir, filiere, "photo_group.png");
    return fs.existsSync(p) ? path.relative(root, p) : null;
  }

  const studentsWithPhotos = students.map((s) => ({
    ...s,
    photoPath: photoPathFor(s.ID, s.Filiere),
  }));

  const filiereGroups = filieres.map((f) => ({
    filiere: f,
    groupPhotoPath: groupPhotoPathFor(f),
    students: studentsWithPhotos.filter((s) => s.Filiere === f),
  }));

  return {
    period,
    students: studentsWithPhotos,
    admins,
    courses,
    filiereGroups,
  };
}

/**
 * Agrege les cours de TOUTES les periodes pour la section Cours,
 * qui est transversale et independante des annees/promos.
 */
export function loadAllCourses(root = getDataRoot()) {
  const periods = loadPeriods(root);
  const all = [];
  for (const period of periods) {
    const { courses } = loadPeriodData(period, root);
    for (const c of courses) {
      all.push({ ...c, period });
    }
  }
  return all;
}
