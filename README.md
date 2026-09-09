# Vault

**Vault** est un outil de documentation fonctionnelle assistée par IA, destiné aux Business Analysts.

## Objectif

Capturer, organiser et exploiter la connaissance fonctionnelle d'un logiciel :

1. **Capture** — Effectuer des captures d'écran du logiciel étudié.
2. **Extraction** — Extraire le texte contenu dans ces captures (OCR).
3. **Organisation** — Structurer et résumer les connaissances extraites de façon claire, professionnelle et concise.
4. **Exploitation** — Permettre au Business Analyst de :
   - Documenter le fonctionnement du logiciel de manière professionnelle ;
   - Générer automatiquement des user stories à partir des EDB (Expressions De Besoin) ;
   - Suivre toutes les étapes d'un projet d'évolution ;
   - Poser des questions à Claude sur le fonctionnement du logiciel documenté.

## Confidentialité

Les données capturées (captures d'écran, textes extraits, base de connaissances) sont **strictement locales** et ne sont jamais versionnées dans ce dépôt (voir `.gitignore`). Seul le code de l'application est versionné.

## Structure du projet

```
Vault/
├── data/           # Données locales (captures, OCR, connaissances) — non versionnées
│   ├── captures/   # Captures d'écran
│   ├── ocr/        # Textes extraits
│   └── knowledge/  # Base de connaissances organisée
├── src/            # Code source de l'application
└── docs/           # Documentation du projet Vault lui-même
```

## Inspiration

Ce projet reprend certaines fonctionnalités de [ProjectM](https://lublubisous.github.io/ProjectM/).
