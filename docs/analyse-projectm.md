# Analyse de ProjectM

> Analyse du code source de [ProjectM](https://lublubisous.github.io/ProjectM/) (dépôt `LubluBisous/ProjectM`), réalisée le 09/09/2026 en vue de la conception de Vault.

## Vue d'ensemble

ProjectM est une **application monopage** (un seul fichier `index.html`, ~11 000 lignes, aucun framework) dédiée à la documentation de **procédures et requêtes SQL MX3 (Murex Trading System)**. Elle tourne entièrement dans le navigateur, sans serveur : toutes les données restent locales (localStorage + IndexedDB).

Fait notable : le titre de la page est déjà « Vault » — ProjectM en est en quelque sorte le prototype.

## Fonctionnalités identifiées

### 1. Capture d'écran (`getDisplayMedia`)
- Choix de la source : écran entier, fenêtre, ou onglet navigateur.
- Prise de captures multiples avec vignettes, réorganisation, suppression.
- **Flux « capture rapide »** (`quickCaptureAnalyze`) : un clic → capture → envoi automatique à Claude → import automatique du résultat. C'est le cœur de l'UX.

### 2. Analyse par Claude (vision = OCR + compréhension)
- Pas de bibliothèque OCR (pas de Tesseract) : **les captures sont envoyées à l'API Anthropic** qui extrait le texte ET le structure en une seule passe.
- Prétraitement des images côté client : redimensionnement, compression, option « optimisation texte » (binarisation pour améliorer la lisibilité).
- Deux modes d'analyse : « SQL » (extraction de procédures) et « Texte » (extraction libre).
- Choix du modèle (Haiku / Sonnet / Opus) selon coût/qualité.
- Réparation automatique du JSON tronqué en sortie (`_repairTruncatedJson`).
- Mode manuel de secours : copie du prompt pour l'utiliser sur claude.ai sans clé API.

### 3. Base de connaissances (procédures)
- Fiches structurées : nom, type, description, paramètres, corps, drapeaux (tags).
- Éditeur avec coloration SQL, rendu de tableaux Markdown, rechercher/remplacer.
- Recherche et filtrage par type, groupes dépliables.
- Import/export JSON (avec option d'inclure les captures encodées).

### 4. Questions à Claude sur la base (« Ask »)
- Chat intégré avec prompt système contenant un **index complet des procédures** (manifest).
- **Prompt caching Anthropic** : bouton « Indexer » qui chauffe le cache, compte à rebours de validité (4 min 30), ré-indexation détectée si le manifest change.
- Réponses formatées, historique de conversation, effaçable.

### 5. Visualiseur de schéma de base de données
- Canvas avec tables déplaçables, relations dessinées en SVG, zoom/molette, menus contextuels.
- Page autonome supplémentaire (`schema-visualizer.html`).

### 6. Stockage et réglages
- `localStorage` : clé API Claude, modèle choisi, schéma, préférences UI.
- `IndexedDB` : captures d'écran et procédures (pas de limite de taille), avec migration depuis l'ancien format.
- Thème sombre/clair, support mobile.

## Ce que Vault reprend, adapte ou abandonne

| Fonctionnalité ProjectM | Décision pour Vault |
|---|---|
| Capture d'écran multi-source + capture rapide | **Reprendre tel quel** — UX éprouvée |
| Analyse des captures par Claude (vision) | **Reprendre** — généraliser au-delà du SQL : écrans, formulaires, workflows |
| Prétraitement image (compression, optimisation texte) | **Reprendre** — réduit les coûts API |
| Mode « SQL » | **Adapter** — devient un type de connaissance parmi d'autres |
| Base de connaissances de procédures | **Généraliser** — modèle de « connaissance fonctionnelle » : écrans, règles de gestion, workflows, glossaire, EDB, user stories |
| Ask + prompt caching | **Reprendre et étendre** — Q&R sur tout le fonctionnement du logiciel |
| Visualiseur de schéma | **Reporter** — pas prioritaire pour la v1 ; pourrait devenir un visualiseur de workflows |
| Import/export JSON | **Reprendre** — sauvegarde/partage de la base |
| localStorage + IndexedDB | **Reprendre** — confidentialité par conception, aucune donnée ne quitte le poste (sauf appels API Anthropic) |
| Fichier HTML unique | **À discuter** — simple à déployer (GitHub Pages) mais difficile à maintenir à 11 000 lignes ; envisager une structure modulaire avec build |

## Nouvelles capacités propres à Vault (absentes de ProjectM)

1. **Organisation et synthèse des connaissances** : regroupement automatique par module/écran/processus, résumés générés, détection de doublons.
2. **Génération de livrables Business Analyst** :
   - User stories générées à partir des EDB (Expressions De Besoin) ;
   - Spécifications fonctionnelles structurées ;
   - Suivi des étapes d'un projet d'évolution (EDB → US → recette).
3. **Documentation professionnelle exportable** (Markdown, Word, PDF).
