# 🚀 Prompt Cursor Bundle (Multi-AI)

> **Le bundle universel de structuration de projets pour assistants AI** ⚡
> 
> Transformez votre idée en projet structuré en 2 minutes avec Cursor, Claude, Windsurf ou Copilot !

[![Version](https://img.shields.io/badge/version-1.5.0-blue.svg)](https://github.com/abdel74100/prompt-cursor-bundle)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/@abdel-akh/prompt-cursor-bundle.svg)](https://www.npmjs.com/package/@abdel-akh/prompt-cursor-bundle)

---

## ✨ Qu'est-ce que Prompt Cursor Bundle ?

Un outil CLI universel qui :
- 🎯 **Génère UN prompt intelligent** qui crée TOUS vos fichiers projet
- 🤖 **Compatible multi-AI** : Cursor, Claude, Windsurf, GitHub Copilot
- 📊 **Parse automatiquement** vos plans pour créer un workflow de développement
- 🔍 **Track votre progression** avec un dashboard intelligent
- ⚙️ **Vérifie la compatibilité** des versions de packages (évite les erreurs)
- ✅ **Met à jour automatiquement** votre code-run.md quand vous complétez une étape
- 📦 **Mode Complexe** : Support multi-modules, milestones et dépendances non-linéaires

**Résultat :** De l'idée au projet structuré en **2 commandes** !

### 🤖 Assistants AI Supportés

| Assistant | Fichier de règles généré |
|-----------|--------------------------|
| 🎯 Cursor | `.cursorrules` |
| 🤖 Claude | `CLAUDE.md` |
| 🏄 Windsurf | `.windsurfrules` |
| 🐙 GitHub Copilot | `.github/copilot-instructions.md` |

---

## 🎬 Démo Rapide - En 3 Commandes

```bash
# 🆕 Mode Auto (recommandé) - Une seule commande !
prompt-cursor generate -i idea.md -o ./mon-projet --auto

# Le CLI va :
# 1. Générer le prompt et le copier dans le presse-papiers 📋
# 2. Attendre que vous sauvegardez les 4 fichiers ⏳
# 3. Lancer build automatiquement 🚀

# OU Mode manuel (étape par étape)
prompt-cursor generate -i idea.md -o ./mon-projet
# [Copier prompt → AI → Sauvegarder fichiers]
prompt-cursor build

# C'est tout ! Projet prêt ! 🎉
```

---

## 📦 Mode Complexe (Nouveau !)

Pour les projets complexes avec plusieurs modules :

```bash
# Activer le mode complexe
prompt-cursor generate -i idea.md -o ./mon-projet --complex

# Avec modules spécifiques
prompt-cursor generate -i idea.md --complex --modules frontend,backend,api

# Build en mode complexe
prompt-cursor build --complex
```

### Fonctionnalités du Mode Complexe

| Fonctionnalité | Description |
|----------------|-------------|
| 📦 **Multi-Modules** | Sépare frontend, backend, API, infra, etc. |
| 🏁 **Milestones** | Regroupe les étapes en jalons (MVP, Beta, Production) |
| 🔗 **Dépendances** | Graphe de dépendances non-linéaires |
| ⚡ **Parallélisme** | Identifie les étapes exécutables en parallèle |
| 📊 **Dashboard** | Vue d'ensemble avec progression par module |

### Modules Disponibles

| Module | Description |
|--------|-------------|
| 🎨 `frontend` | Interface utilisateur, composants |
| ⚙️ `backend` | Logique serveur, contrôleurs |
| 🔌 `api` | Endpoints REST/GraphQL |
| 🗄️ `database` | Schéma, migrations |
| ☁️ `infra` | Docker, CI/CD, cloud |
| 📱 `mobile` | Applications mobiles |
| 🔐 `auth` | Authentification |
| 🧪 `testing` | Tests unitaires, e2e |

---

## 📦 Installation

```bash
npm install -g @abdel-akh/prompt-cursor-bundle
```

---

## 🚦 Quick Start

```bash
# Créer idea.md
echo "Todo app avec React + TailwindCSS" > idea.md

# Générer (choisir votre AI assistant)
prompt-cursor generate -i idea.md -o ./projet

# [Copier prompt → Votre AI Assistant → Sauvegarder dans .prompt-{provider}/docs/]

# Builder
cd ./projet && prompt-cursor build

# ✅ Suivre code-run.md
```

---

## 📖 Commandes

| Commande | Alias | Description |
|----------|-------|-------------|
| `prompt-cursor generate` | `pcb gen` | Génère prompt intelligent + versions compatibles |
| `prompt-cursor generate --auto` | `pcb gen -a` | Mode auto : copie + watch + build automatique |
| `prompt-cursor generate --complex` | `pcb gen -c` | 📦 Mode complexe avec modules |
| `prompt-cursor build` | `pcb build` | Parse et génère workflow |
| `prompt-cursor build --complex` | - | Build en mode complexe |
| `prompt-cursor complete` | `pcb done` | Marque étape terminée |
| `prompt-cursor context` | `pcb ctx` | Affiche contexte |
| `prompt-cursor dashboard` | `pcb dash` | 📊 Dashboard interactif |
| `prompt-cursor dashboard --watch` | `pcb dash -w` | Dashboard live |
| `prompt-cursor bug` | - | 🐛 Journal des bugs |
| `prompt-cursor bug --add` | - | Ajouter un bug |
| `prompt-cursor bug --check <error>` | - | Vérifier solution connue |
| `prompt-cursor clean` | - | Nettoie .prompt-{provider}/ |

---

## 📊 Dashboard Interactif (Nouveau !)

Visualisez l'état de votre projet en temps réel avec le nouveau dashboard terminal.

```bash
# Vue unique
prompt-cursor dashboard

# Mode watch (rafraîchissement auto toutes les 5s)
prompt-cursor dashboard --watch

# Intervalle personnalisé (2s)
prompt-cursor dashboard --watch --interval 2000
```

### Aperçu du Dashboard

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│  🚀 PROMPT-CURSOR DASHBOARD                                                        │
│  🎯 Mon Projet | Cursor                                                            │
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                    │
│  📊 PROGRESSION              🐛 BUGS                 ⏱️  TEMPS                      │
│  ████████████░░░░░░░░ 60%   2 ouverts              ~6h passées                     │
│  Step 3/5                    1 résolus              ~4h restantes                  │
│                                                                                    │
├────────────────────────────────────────────────────────────────────────────────────┤
│  🔄 WORKFLOW                                                                       │
│                                                                                    │
│  ✅S1──►✅S2──►🟡S3──►⏳S4──►⏳S5                                                    │
│                                                                                    │
├────────────────────────────────────────────────────────────────────────────────────┤
│  📋 ÉTAPE 3: Implement API endpoints                                               │
│                                                                                    │
│  ☐ Create REST routes                                                              │
│  ☐ Add authentication middleware                                                   │
│  ☑ Setup database connection                                                       │
│                                                                                    │
├────────────────────────────────────────────────────────────────────────────────────┤
│  📁 FICHIERS RÉCENTS                  💡 COMMANDES                                 │
│                                                                                    │
│  • src/api/routes.ts                  prompt-cursor complete                       │
│  • src/middleware/auth.ts             prompt-cursor bug --add                      │
│  • src/db/connection.ts               prompt-cursor bug --solve                    │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### Fonctionnalités

| Fonctionnalité | Description |
|----------------|-------------|
| 📊 **Progression visuelle** | Barre de progression + workflow graphique |
| 🔄 **Mode watch** | Rafraîchissement automatique |
| 📋 **TODOs de l'étape** | Affiche les tâches de l'étape courante |
| 🐛 **Bugs ouverts** | Liste des bugs non résolus |
| 📁 **Fichiers récents** | Derniers fichiers modifiés |
| 💡 **Commandes rapides** | Suggestions de commandes |

---

## 🐛 Journal des Bugs (Nouveau !)

Track automatiquement les bugs rencontrés et leurs solutions pour ne plus perdre de temps sur des problèmes déjà résolus.

```bash
# Voir le résumé du journal
prompt-cursor bug

# Ajouter un bug (interactif)
prompt-cursor bug --add

# Vérifier si une erreur a une solution connue
prompt-cursor bug --check "Cannot find module 'react'"

# Résoudre un bug
prompt-cursor bug --solve BUG-123456

# Rechercher des bugs
prompt-cursor bug --search "prisma"

# Lister les bugs
prompt-cursor bug --list
prompt-cursor bug --list --open      # Seulement les ouverts
prompt-cursor bug --list --tag react # Filtrer par tag
```

### Fonctionnalités

| Fonctionnalité | Description |
|----------------|-------------|
| 🔍 **Recherche intelligente** | Trouve les bugs similaires par score de pertinence |
| 🏷️ **Tags automatiques** | Extraction de tags depuis les messages d'erreur |
| 📚 **Index des solutions** | Lookup rapide pour les erreurs connues |
| 🔗 **Bugs liés** | Détection automatique des bugs similaires |
| 📊 **Statistiques** | Suivi des bugs résolus/ouverts |

### Workflow Bug Tracking

```
1. Tu rencontres une erreur
   ↓
2. prompt-cursor bug --check "Error message"
   ↓
┌─ Solution trouvée ? ─────────────────────┐
│  ✅ OUI → Affiche solution + commandes   │
│  ❌ NON → Propose d'ajouter comme bug    │
└──────────────────────────────────────────┘
   ↓
3. Tu résous le problème
   ↓
4. prompt-cursor bug --solve BUG-XXX
   → Solution indexée pour le futur !
```

---

### Structure de Projet (Mode Simple)

```
mon-projet/
├── .prompt-{provider}/           # 📦 Dossier dédié (cursor, claude, windsurf, copilot)
│   ├── prompts/                  # Prompts générés
│   │   └── prompt-generate.md
│   ├── docs/                     # Documentation AI
│   │   ├── project-request.md
│   │   ├── ai-rules.md
│   │   ├── spec.md
│   │   └── implementation-plan.md
│   ├── workflow/                 # Workflow de développement
│   │   ├── code-run.md
│   │   └── Instructions/
│   └── .{provider}-context.json
├── .cursorrules                  # Fichier de règles (selon provider)
└── src/                          # Votre code source
```

### Structure de Projet (Mode Complexe)

```
mon-projet/
├── .prompt-{provider}/
│   ├── prompts/
│   ├── docs/
│   ├── modules/                  # 📦 Modules séparés
│   │   ├── frontend/
│   │   │   ├── workflow/
│   │   │   │   └── code-run.md
│   │   │   └── Instructions/
│   │   ├── backend/
│   │   │   ├── workflow/
│   │   │   └── Instructions/
│   │   └── api/
│   ├── workflow/
│   │   ├── code-run.md           # Vue principale
│   │   ├── master-code-run.md    # Vue globale modules
│   │   ├── dependency-graph.md   # 🔗 Graphe dépendances
│   │   └── Instructions/
│   ├── project-config.json       # Config projet
│   └── modules-config.json       # Config modules
└── src/
```

---

## 📊 Dashboard Amélioré

```bash
prompt-cursor context --dashboard
```

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 PROJECT DASHBOARD - Mon Projet                              │
├─────────────────────────────────────────────────────────────────┤
│  🏁 MILESTONES                                                  │
│  ───────────────────────────────────────────────────────────    │
│  ✅ 🎯 MVP              ████████████████████ 100%  [5/5]        │
│  🟡 🧪 Beta             ████████░░░░░░░░░░░░  40%  [2/5]        │
│  ⏳ 🚀 Production       ░░░░░░░░░░░░░░░░░░░░   0%  [0/5]        │
├─────────────────────────────────────────────────────────────────┤
│  📦 MODULES                                                     │
│  ───────────────────────────────────────────────────────────    │
│  ✅ 🎨 Frontend         ████████████████████ 100%  [4/4]        │
│  🟡 ⚙️ Backend          ████████████░░░░░░░░  60%  [3/5]        │
│  ⏳ 🔌 API              ░░░░░░░░░░░░░░░░░░░░   0%  [0/3]        │
├─────────────────────────────────────────────────────────────────┤
│  📊 OVERALL PROGRESS                                            │
│  ███████████████░░░░░░░░░░░░░░░░░░░░░  47%                      │
│  Steps: 7/15 completed                                          │
│  ⏱️  Time: ~14h done, ~16h remaining                            │
├─────────────────────────────────────────────────────────────────┤
│  💡 NEXT ACTIONS                                                │
│  → Step 8: Implement API endpoints                              │
│    (2 more steps can run in parallel)                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Versions Compatibles Automatiques

Évite les erreurs de compatibilité (TailwindCSS v4, PostCSS, etc.) grâce à la détection automatique du stack et injection des versions testées.

---

## 🤝 Contribution

Les contributions sont les bienvenues !

1. Fork le projet
2. Créez votre branche (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

---

## 📚 Documentation

- 📖 **[GUIDE.md](./GUIDE.md)** - Guide complet avec schémas et exemples
- 📖 **[example-idea.md](./example-idea.md)** - Exemple de fichier idée

---

## 🐛 Troubleshooting

### Problème : "Command not found"
```bash
npm link  # Dans le dossier du CLI
```

### Problème : "No response files found"
Assurez-vous d'avoir sauvegardé les fichiers générés par votre AI avant de lancer `build`.

### Problème : "0 steps in plan"
Vérifiez que votre `implementation-plan.md` suit le format attendu avec `- [ ] Step X:`.

### Mode Complexe : "Modules not detected"
Assurez-vous d'utiliser `--complex` lors du generate ET du build.

---

## 📄 License

MIT © Abderrahim Akh

---

<p align="center">
  Fait avec ❤️ pour les développeurs qui veulent aller vite
</p>

<p align="center">
  <a href="https://github.com/abdel74100/prompt-cursor-bundle">⭐ Star ce projet sur GitHub</a>
</p>
