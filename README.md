# Archive ALI — version beta

Site institutionnel (Astro) qui documente chaque promotion de l'African
Leadership Higher Institute : etudiants, equipe de direction, cours.

**Cette version beta tourne entierement sur des fixtures locales**
(`fixtures/`) qui imitent la structure du Google Drive qui sera utilise en
production. Aucune connexion a un vrai compte Google, aucun vrai SSO, et
aucune vraie donnee d'eleve dans ce repo.

> Site public sur GitHub Pages pour cette phase beta (decision explicite du
> porteur de projet : aucune donnee reelle a proteger a ce stade). L'auth
> "portail" ci-dessous est donc un simple placeholder d'UI, **pas une
> protection reelle** — voir la section Auth plus bas.

## Lancer le projet en local

```bash
npm install

# 1. Valider les fixtures (s'arrete net au premier probleme)
npm run dry-build

# 2. Demontrer que le dry-build bloque bien les 4 cas invalides prepares
npm run dry-build:demo

# 3. Lancer le site en dev
npm run dev
# -> http://localhost:4321/alhi-beta/   (mot de passe portail : ali2025beta)

# 4. Build de production (relance automatiquement le dry-build avant)
npm run build
npm run preview
```

## Arborescence du projet

```
fixtures/                  <- donnees de test, imitent le Drive (voir plus bas)
scripts/
  dry-build.mjs             <- validation, s'arrete au 1er probleme detecte
  copy-assets.mjs           <- copie photos/PDF des fixtures vers public/data/
src/
  lib/data.mjs               <- COUCHE D'ACCES AUX DONNEES (voir section dediee)
  lib/fake-auth.js            <- auth factice (mot de passe en dur)
  layouts/Layout.astro
  pages/
    index.astro               <- portail (login factice)
    home.astro                <- accueil : frise + entree section cours
    promo/[periode].astro      <- page promo d'une annee
    cours/index.astro          <- section cours + selecteur simple
.github/workflows/deploy.yml  <- CI : dry-build + build Astro + deploy Pages
```

## Fixtures : structure simulee

```
fixtures/
  2024-2025/
    sheet_etudiant.json       (colonnes: Nom, Prenom, Filiere, Description, ID)
    sheet_admin.json          (colonnes: Nom, Prenom, Poste, Periode, Description)
    cours/[Filiere]/[NomCours]/[Annee]/support.pdf
    cours/[Filiere]/[NomCours]/[Annee]/metadata.json   <- intitule + volumeHoraire
    photo/[Filiere]/photo_group.png
    photo/[Filiere]/[ID].jpg
  2023-2024/  ... (meme structure, promotion independante)
  invalid/    <- 4 jeux de fixtures cassees, un par cas d'erreur du dry-build
    doublon-id/
    photo-manquante/
    photo-groupe-manquante/
    pdf-manquant/
```

Les fichiers sont en `.json` plutot qu'en `.xlsx`/`.csv` pour la beta
(plus simple a lire/ecrire a la main sans dependance supplementaire) — le
format exact importe peu puisque toute la lecture passe par une seule
fonction (voir plus bas), qui sera remplacee par les vrais appels Sheets/Drive.

### Decision documentee : metadata des cours

Le brief ne precise pas ou stocker `intitule` et `volumeHoraire` d'un cours
(ces infos ne sont pas dans l'arborescence de dossiers elle-meme). Pour la
beta, chaque dossier `[Annee]/` contient un `metadata.json` a cote du
`support.pdf`. A brancher sur l'API reelle, ces deux champs viendront sans
doute d'un onglet Google Sheet dedie aux cours plutot que d'un fichier par
dossier — a confirmer avec l'equipe ALI quand le Sheet reel existera.

## Ou brancher l'API Google Drive/Sheets plus tard

**Un seul fichier a modifier : `src/lib/data.mjs`.**

Toutes les pages Astro (et le dry-build) passent exclusivement par les
fonctions exportees de ce fichier (`loadPeriods`, `loadPeriodData`,
`loadAllCourses`) — aucune page ne touche au systeme de fichiers
directement. Pour brancher les vraies donnees :

1. Remplacer le corps de ces fonctions par des appels a `googleapis`
   (Drive pour les fichiers/photos/PDF, Sheets pour les tableaux
   etudiants/admin), en gardant exactement la meme forme de donnees en
   sortie (memes champs).
2. Remplacer `scripts/copy-assets.mjs` par un telechargement des fichiers
   Drive vers `public/data/` au moment du build (au lieu d'une copie
   depuis `fixtures/`).
3. Le script `scripts/dry-build.mjs` devra lire depuis la meme source
   (idealement en reutilisant `data.mjs` plutot que de dupliquer la
   logique de lecture de fichiers — a refactoriser a ce moment-la si le
   temps le permet).
4. Ajouter les credentials Google (compte de service ou OAuth) en secret
   GitHub Actions, jamais committes.

## Auth : factice pour la beta, SSO reel plus tard

- **Beta (actuel)** : mot de passe unique en dur (`ali2025beta`, voir
  `src/lib/fake-auth.js` et `src/pages/index.astro`), verifie cote client,
  flag stocke en `sessionStorage`. Aucune securite reelle — le site est
  public sur GitHub Pages pour cette phase, ce mecanisme sert uniquement a
  materialiser le parcours "portail -> home".
- **Production (a faire)** : SSO Google Workspace for Education
  (`@africaleadershipinstitute.net`), active en toute derniere etape du
  projet reel (activation admin en attente). A ce moment-la, il faudra
  aussi passer le site en prive (Google Workspace ne suffit pas a lui
  seul a empecher l'acces a une page GitHub Pages publique — voir avec
  l'hebergement final choisi pour la prod).

## CI / Deploiement

Le workflow `.github/workflows/deploy.yml` se declenche sur push vers
`main` ou `dev` :
1. `npm run dry-build` (bloque le build si les fixtures sont invalides)
2. `npm run dry-build:demo` (verifie que les 4 cas casses sont bien
   detectes)
3. Copie des assets, build Astro, deploiement sur GitHub Pages

## Ce qui reste hors scope de cette beta (rappel)

- Vraie API Google Drive/Sheets (credentials pas encore disponibles)
- Vrai SSO Google Workspace (activation admin en attente)
- Design final de la frise/section cours (Figma en cours, separement)
