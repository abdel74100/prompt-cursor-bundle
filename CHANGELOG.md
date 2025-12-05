# Changelog - Prompt Cursor Bundle (Multi-AI)

Toutes les modifications notables de ce projet seront documentées ici.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet respecte le [Versioning Sémantique](https://semver.org/lang/fr/).

## [1.7.0] - 2024-12-04

### Ajouté
- 🎯 **Ordre recommandé des modules** dans `master-code-run.md`
  - Guide clair : Database → Auth → Backend → API → Frontend → Testing → Infra
  - Indications sur quels modules peuvent être parallélisés
- 🔧 **Support multi-modules** amélioré
  - Parser corrigé pour `"Module: Backend, API"` → assigne aux deux modules
  - Normalisation des noms de modules (Infrastructure → infra, etc.)

### Corrigé
- 🐛 **Module API vide** : Les étapes avec `Module: Backend, API` sont maintenant correctement assignées au module API
- 🐛 **Duplications milestones** : Chaque étape n'apparaît qu'une seule fois dans les milestones
- 🐛 **Modules vides créés** : Les modules sans étapes (API, Mobile) ne sont plus créés inutilement
- 📝 **Instructions modules enrichies** : Même niveau de détail que les instructions globales

### Changé
- 🚀 **Mode complex automatique** : `--complex` active automatiquement TOUS les modules
  - Plus de sélection interactive des modules
  - L'IA structure le plan selon les besoins du projet
  - L'utilisateur révise les fichiers avant `build`

---

## [1.5.0] - 2024-12-03

### Ajouté
- 📊 **Dashboard Interactif** : Nouvelle commande `dashboard` (alias `dash`)
  - Vue en temps réel de la progression du projet
  - Mode watch avec rafraîchissement automatique (`--watch`)
  - Affichage des bugs ouverts, fichiers récents, TODOs de l'étape courante
- 🐛 **Journal des Bugs** : Nouvelle commande `bug`
  - Ajouter des bugs (`--add`)
  - Résoudre des bugs (`--solve`)
  - Rechercher des bugs (`--search`)
  - Vérifier les solutions connues (`--check`)
  - Tags automatiques extraits des messages d'erreur
  - Index des solutions pour lookup rapide
- 📦 **Mode Complexe** : Support des projets multi-modules
  - Option `--complex` pour generate et build
  - Modules : frontend, backend, api, database, infra, mobile, auth, testing
  - Milestones (MVP, Beta, Production)
  - Graphe de dépendances non-linéaires
  - Dashboard amélioré avec progression par module
- 🔄 **Context Tracker V3** : Mise à jour automatique du contexte
  - Détection automatique de l'état du projet
  - Suivi des bugs et statistiques
  - Migration automatique des anciens contextes

### Changé
- 📄 **Template dynamique** : Nombre d'étapes illimité (plus de limite à 5)
- 📊 **Commande context** : Affichage amélioré avec stats bugs

---

## [1.4.1] - 2024-11-28

### Ajouté
- 🤖 **Mode Auto** : Nouvelle option `--auto` pour `generate`
  - Copie automatique du prompt dans le presse-papiers (entre START et END)
  - Surveillance du dossier docs pour détecter les fichiers sauvegardés
  - Lancement automatique de `build` quand les 4 fichiers sont présents
- 📋 **Clipboard natif** : Support macOS, Windows et Linux (pbcopy, clip, xclip)
- 📄 **example-idea.md** : Fichier d'exemple pour démarrer rapidement

### Changé
- 🏷️ **Branding** : Ajout de "(Multi-AI)" au nom pour clarifier le support multi-assistant

---

## [1.3.2] - 2024-11-28

### Changé
- 🏷️ **Branding** : Ajout de "(Multi-AI)" au nom pour clarifier le support multi-assistant
- 📄 **Documentation** : Mise à jour README, GUIDE, CHANGELOG avec le nouveau branding

---

## [1.3.1] - 2024-11-28

### Corrigé
- 🔧 **Standardisation des références** : Toutes les références hardcodées remplacées par des placeholders dynamiques
- 📄 **Template prompt** : Utilise maintenant `{{PROMPT_DIR}}` au lieu de `.prompt-cursor/` hardcodé
- 📚 **Documentation** : README et GUIDE mis à jour pour être génériques (multi-AI)
- 🔗 **Liens npm** : Correction des références `@aakroh` → `@abdel-akh`

---

## [1.3.0] - 2024-11-27

### Ajouté
- 🤖 **Support Multi-AI** : Compatible avec Cursor, Claude, Windsurf et GitHub Copilot
- 📁 **Dossiers dynamiques** : Chaque AI a son propre dossier
  - Cursor → `.prompt-cursor/`
  - Claude → `.prompt-claude/`
  - Windsurf → `.prompt-windsurf/`
  - Copilot → `.prompt-copilot/`
- 🎯 **Tests Cypress** : Génération automatique de tests E2E par étape
- ⚙️ **Option `--provider`** : Choisir l'AI directement en ligne de commande
- 🔍 **Auto-détection** : Le CLI détecte automatiquement le provider utilisé

### Changé
- 📄 **ai-rules.md** : Remplace `cursor-rules.md` pour être générique
- 📦 **Fichiers de règles dynamiques** :
  - Cursor → `.cursorrules`
  - Claude → `CLAUDE.md`
  - Windsurf → `.windsurfrules`
  - Copilot → `.github/copilot-instructions.md`
- 📊 **Context par provider** : Chaque AI a son propre fichier de contexte

---

## [1.2.0] - 2024-11-24

### Ajouté
- 🎯 **Marqueurs START/END** : Prompt plus intuitif avec limites claires
- 📝 **Instructions condensées** : Format 4 étapes simple et visuel

### Changé
- ⏱️ **Suppression des estimations de temps** : Plus de "2-4 heures", "Semaine 1", etc.
- 📄 **Fichier prompt-generate.md** : Format plus compact et clair
- 📋 **Instructions** : Visuellement améliorées avec emojis et séparations

### Supprimé
- ❌ **Workflow legacy** : Commandes step1-4 et init supprimées
- ❌ **Templates legacy** : step1-4.txt supprimés
- ❌ **Durées estimées** : Supprimées partout (prompts, instructions, code-run)
- ❌ **fileGenerator.js** : Fusionné dans les commandes
- ❌ **prompts.js** : Utilitaire legacy supprimé

## [1.1.0] - 2024-11-21

### Ajouté
- ✅ **Commande `complete`** : Marquer les étapes comme terminées automatiquement
- ⚙️ **Vérification de compatibilité** : Détection automatique des versions compatibles
- 📦 **Dossier `.promptcore/`** : Organisation propre de tous les fichiers générés
- 🧹 **Commande `clean`** : Supprimer les fichiers générés facilement
- 📊 **Vérification des versions** pour React, Vite, TailwindCSS, Express, Prisma, etc.
- 📝 **Configurations automatiques** : postcss.config.js, tailwind.config.js, vite.config.js

### Changé
- 📁 **Structure** : Tous les fichiers maintenant dans `.promptcore/` au lieu de la racine
  - `.promptcore/prompts/` pour les prompts générés
  - `.promptcore/docs/` pour les fichiers Cursor
  - `.promptcore/workflow/` pour code-run.md et Instructions/
- 🔍 **Parser amélioré** : Support du format `### Step X:` en plus des formats existants
- 📋 **Critères de test** : Génération intelligente basée sur le type de tâche

### Corrigé
- ❌ **Erreur TailwindCSS v4** : Force l'utilisation de v3 pour compatibilité PostCSS
- 🐛 **Parsing des étapes** : Détection améliorée de multiples formats
- 🔧 **Context tracking** : Sauvegarde dans `.promptcore/` au lieu de la racine

## [1.0.0] - 2024-11-21

### Ajouté
- 🚀 **Workflow "Generate"** : Un seul prompt pour tout générer
- 🔨 **Commande `build`** : Parse le plan et génère code-run.md intelligent
- 📊 **Commande `context`** : Dashboard de progression du projet
- 🧠 **Parser intelligent** : Extrait automatiquement les étapes du plan
- 📝 **Template simplifié** : Instructions détaillées avec vraies tâches
- 🎯 **Context V2** : Tracking avancé avec auto-détection

### Changé
- 📛 **Nom** : `cli-akh-cursor` → `Prompt Cursor Bundle`
- 🔄 **Workflow** : 5 commandes → 2 commandes (generate + build)
- 📚 **Documentation** : README et GUIDE fusionnés et améliorés

### Supprimé
- ❌ Génération automatique du code-run dans step1/init
- ❌ Questions répétitives (context réutilisé)
- ❌ Fichiers redondants de workflow

---

## [0.x.x] - Legacy

Versions antérieures du projet (cli-akh-cursor)

### Fonctionnalités initiales
- Génération de prompts step1-4 séparés
- Commande init pour workflow complet
- Context tracking basique
- Documentation simple

---

## Convention des versions

- **Major** (x.0.0) : Breaking changes
- **Minor** (1.x.0) : Nouvelles fonctionnalités
- **Patch** (1.0.x) : Corrections de bugs
