# Passation — Archive ALI (beta Astro)

Tu reprends un projet en cours. Lis tout avant de toucher au code : plusieurs
décisions ont déjà été prises et discutées en long avec la personne qui porte
le projet, et elle n'a pas envie de les rediscuter depuis le début.

## Le projet, en bref

Site institutionnel (Astro) pour l'African Leadership Institute (ALI), une
école fondée en 2024. C'est une **archive privée** : chaque promotion documente
ses étudiants (par filière), son équipe de direction, et les cours dispensés
(métadonnées + PDF). Publication une fois par an. Le porteur de projet est un
délégué étudiant qui développe avec assistance IA ; la maintenance sera reprise
par un élève de 2nde année non autonome sur de la doc d'API — donc les scripts
doivent rester simples à exécuter.

**Version actuelle = bêta.** Données de test (fixtures locales), auth factice
(mot de passe en dur), pas de vraie API Google Drive/Sheets, pas de vrai SSO.
Déployé publiquement sur GitHub Pages (décision explicite et assumée par le
porteur de projet : aucune donnée réelle n'est en jeu à ce stade).

## Accès repo

- Repo : `https://github.com/agence-nyx/alhi-beta` (public), branche de travail
  `dev` (jamais pousser directement sur `main`, c'est la personne qui merge
  après validation).
- Un PAT GitHub avait été partagé en clair dans le chat par la personne pour
  ce projet. **Ne redemande pas pourquoi** — c'est déjà fait, mais pense à
  vérifier s'il est encore valide et à suggérer une rotation si ce n'est pas
  déjà fait, sans en faire un sujet de blocage.
- Workflow CI GitHub Actions déjà en place (`.github/workflows/deploy.yml`) :
  dry-build, démo des cas invalides, build Astro, déploiement Pages. Après
  chaque push sur `dev`, vérifie toi-même le résultat du run (API GitHub
  Actions) sans attendre qu'on te le demande.
- Site en ligne : `https://agence-nyx.github.io/alhi-beta/`

## Ce qui est non négociable (contraintes du brief d'origine)

- Pas de vraie intégration Google Drive/Sheets API pour l'instant (pas de
  credentials disponibles).
- Pas de vrai SSO Google Workspace pour l'instant.
- La couche d'accès aux données (`src/lib/data.mjs`) doit rester le SEUL
  endroit à modifier pour brancher l'API réelle plus tard — ne pas disperser
  de logique de lecture de fichiers ailleurs.
- Les enseignants (nom/photo/fonction) sont **hors scope définitivement**
  (réserve de droit à l'image). Tout le reste (y compris photos individuelles
  d'étudiants) est validé sans restriction.
- Le dry-build (`npm run dry-build`) doit continuer à bloquer net sur : doublon
  d'ID étudiant, photo individuelle manquante, photo de groupe de filière
  manquante, PDF de cours manquant. Ne jamais affaiblir ça.

## État d'avancement réel

### Fait et validé par la personne
- Structure Astro de base, fixtures (2 promos : 2023-2024, 2024-2025),
  dry-build avec ses 4 cas d'erreur testés (`fixtures/invalid/*`).
- Portail (auth factice, mot de passe en dur `ali2025beta`, voir
  `src/lib/fake-auth.js` et `src/pages/index.astro`).
- **Charte graphique définitive** (ne plus la remettre en question sans raison
  forte) : fond papier uni `#eee3c8`, encre quasi-noire `#0a0a0a`, rouge
  `#ad233a` (extrait du logo), serif **Newsreader**, mono **IBM Plex Mono**,
  sans-serif **Inter** — auto-hébergées via `@fontsource/*` (PAS de Google
  Fonts, un fix précédent a volontairement retiré cette dépendance pour cause
  de blocage réseau ; ne la réintroduis pas).
- Navbar flottante (pilule, ombrage) + footer, partagés sur tout le site via
  `src/layouts/Layout.astro`, props `protected`, `fullBleed`, `navActive`.
- Page `/home` : hero avec deux statues détourées (fond noir d'origine retiré,
  voir plus bas les pièges du détourage), texte centré dans l'espace entre les
  deux silhouettes, sections Institution / Archives / Communauté avec le texte
  final fourni par la personne (ne pas le modifier sans demander).
- Assets visuels dans `public/brand/` (statues détourées en WebP, photos
  d'illustration).

### En cours / cassé — à reprendre en priorité
**Page `/frise` (`src/pages/frise.astro`)** : affiche un arbre cliquable
(Archive ALI → Année → Étudiants/Direction → Filière si étudiants →
personnes), chaque branche se déplie au clic, reliée par des traits courbes
dessinés en SVG par-dessus une mise en page HTML/flexbox classique.

**Bug signalé en dernier, pas encore corrigé** : dès qu'on ouvre **plusieurs
années en même temps**, certains traits de connexion manquent ou relient les
mauvais nœuds (capture d'écran de la personne à l'appui : un trait partait
d'une zone proche d'"Archive ALI"/"2024-2025" et traversait tout l'écran vers
un pill "Direction" très éloigné ; ailleurs, deux enfants d'un même parent
["Commerce", "Ingenierie"] ne semblaient reliés que par un seul trait au lieu
de deux qui bifurquent).

Deux bugs précédents sur cette même page avaient déjà été corrigés :
1. Le JSON de données passé au script plantait silencieusement
   (`JSON.parse`) parce qu'il était inséré via interpolation Astro classique
   dans un `<script type="application/json">`, qui échappe le texte en HTML
   (`"` → `&quot;`) — or les balises `<script>` ne décodent jamais les
   entités HTML (élément "raw text" selon la spec). **Fix adopté : passer les
   données via `define:vars` plutôt que via un script JSON séparé.** Ne
   régresse pas vers l'ancienne methode.
2. Au repli d'une branche, seule la hauteur était animée (`max-height`),
   jamais la largeur — une rangée repliée gardait sa pleine largeur réservée
   dans le flex, donc les branches voisines ne revenaient jamais à leur
   position d'origine. **Fix adopté : au repli, `display:none` n'est appliqué
   qu'après la fin de l'animation (setTimeout ~420ms), ce qui libère enfin la
   largeur.**

**Pour le bug actuel (traits qui manquent/se trompent avec plusieurs
branches ouvertes), mon hypothèse au moment où j'ai été interrompu** : la
fonction `drawLines()` redérive à chaque appel les relations parent-enfant en
interrogeant le DOM générique (`document.querySelectorAll(".tree-col")` puis
`:scope > .tree-pill` / `:scope > .tree-row` sur chacun). C'est fragile et je
n'ai pas pu identifier la cause exacte sans un vrai navigateur pour déboguer
interactivement. **Recommandation : remplace cette redérivation par un suivi
explicite des connexions.** Au lieu de tout redécouvrir à chaque frame,
maintiens un tableau global `connections = []`, et pousse une entrée
`{ parentPill, childAnchor, row }` à chaque fois qu'un enfant est réellement
ajouté au DOM (dans `buildPeriodNode`, `buildCategoryNode`, `buildFiliereNode`,
au moment du premier clic qui construit les enfants). `drawLines()` devient
alors une simple boucle sur `connections`, sans aucune requête DOM générique
ni ambiguïté possible sur qui est le parent de qui. C'est la piste à essayer
en premier.

### Explicitement en pause
**Page `/cours` (`src/pages/cours/index.astro`)** : volontairement non
retouchée depuis le début de la refonte visuelle. La personne attend d'avoir
terminé ses propres recherches sur le contenu/la structure de cette section
avant de la retravailler. **Ne la modifie pas sans qu'elle le demande
explicitement**, même pour l'harmoniser visuellement — elle a été claire
là-dessus. Elle utilise encore l'ancien style (menus déroulants natifs,
cartes simples) pendant que le reste du site a été refondu.

**Page `/promo/[periode]`** : non retouchée non plus (juste la navbar/footer
partagés qui s'appliquent automatiquement). Contenu fonctionnel, pas de
demande de refonte dessus pour l'instant.

## Pièges déjà rencontrés (pour ne pas les refaire)

1. **Mon outil de vérification locale (`wkhtmltoimage`) est un moteur WebKit
   d'environ 2012.** Il ne supporte NI CSS Grid, NI `gap` en flexbox, NI
   `clamp()`/`min()`/`max()`, NI `env()` (casse silencieusement tout un
   `calc()` qui le contient), NI `async`/`await`/Promises. Si tu l'utilises
   pour vérifier un rendu et que quelque chose a l'air cassé (mise en page
   figée, texte superposé à la navbar, script qui ne s'exécute pas), **doute
   d'abord de l'outil avant de doubter le code** — vérifie en neutralisant ces
   constructions (remplace `env(...)` par `0px`, etc.) pour voir si le
   problème persiste. Pour tester du JS avec `async/await`, utilise plutôt
   `jsdom` (`npm install --no-save jsdom`, désinstalle après usage) — ça
   exécute du vrai JS mais **ne calcule aucune vraie mise en page**
   (`getBoundingClientRect` renvoie toujours des zéros), donc ça ne peut pas
   valider un bug de positionnement comme celui du dessus. Si tu as accès à un
   vrai navigateur headless (Playwright/Puppeteer) depuis ton environnement,
   utilise-le — le mien ne pouvait pas télécharger Chromium (réseau
   restreint).
2. **Détourage des statues du hero** (`public/brand/hero-statues.webp`) :
   photo d'origine sur fond noir pur. Un détourage naïf par simple seuil de
   luminosité laisse un liseré sombre résiduel sur fond clair (les pixels
   semi-transparents du bord gardent une teinte assombrie héritée du fond
   noir). Fix appliqué : décontamination (diviser RGB par alpha en supposant
   un fond noir d'origine) + extension de couleur (les pixels totalement
   transparents récupèrent la couleur du pixel opaque le plus proche, sinon le
   redimensionnement par le navigateur peut réintroduire un liseré même après
   décontamination) + légère érosion du masque (1px, pas plus — 2px déforme
   les doigts, parties fines de l'image). Si tu dois retoucher cette image,
   repars de `/mnt/user-data/uploads/two_people.jpeg` (ou équivalent) avec
   cette méthode, ne reviens pas à un seuil simple.
3. **Astro échappe en HTML tout ce qui est inséré par interpolation `{...}`**,
   y compris dans un `<script>` — voir le bug JSON ci-dessus. Pour passer des
   données serveur à un script client, **toujours `define:vars`**, jamais une
   balise `<script type="application/json">{jsonString}</script>`.

## Conventions de travail établies avec la personne

- Avant toute modification significative, dire ce que tu vas faire (fichier,
  changement, raison). Pour des changements mineurs déjà discutés, tu peux
  enchaîner et résumer après coup.
- Commits avec message clair et descriptif, jamais de message générique.
  Regarde les messages de commit existants (`git log`) pour le ton/niveau de
  détail attendu — assez long, explique le "pourquoi" et pas juste le "quoi".
- Toujours vérifier la CI après un push, sans attendre qu'on te le demande.
- La personne communique en français, parfois de façon elliptique ou avec des
  fautes de frappe — prends le temps de reformuler ce que tu as compris avant
  de partir coder sur une demande ambiguë, surtout pour tout ce qui touche à
  une interaction/animation (plusieurs allers-retours ont déjà eu lieu sur la
  page Frise à cause de malentendus sur "picker à défilement" vs "question qui
  se tape" vs "arbre cliquable" — la version actuelle, arbre cliquable, est la
  bonne, ne reviens pas aux versions précédentes).
- Ne pas sur-vérifier au point de ralentir le travail, mais ne pas non plus
  annoncer qu'un correctif fonctionne sans l'avoir vérifié d'une façon ou
  d'une autre (voir section outils ci-dessus).

## Prochaine étape concrète suggérée

1. Reprendre `src/pages/frise.astro`, refactoriser `drawLines()` vers un
   suivi explicite des connexions (voir plus haut).
2. Si possible, obtenir une vraie vérification visuelle/navigateur plutôt que
   jsdom pour ce bug précis (c'est un bug de positionnement, pas de logique
   JS pure).
3. Rebuild, dry-build, commit, push sur `dev`, vérifier la CI.
4. Redemander confirmation à la personne sur le rendu réel avant de passer à
   autre chose.
