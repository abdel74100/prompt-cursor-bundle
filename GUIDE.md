# 📖 Guide Complet - Prompt Cursor Bundle

> **De l'idée au projet structuré en 2 commandes !** 🚀

---

## 🎯 Qu'est-ce que Prompt Cursor Bundle ?

Un outil qui transforme votre idée en projet professionnel structuré, en utilisant l'IA de Cursor pour générer toute la documentation nécessaire.

### 🌟 Le Workflow Prompt Cursor Bundle

```
┌─────────────────────────────────────────────────────────────┐
│  📝 Votre Idée (idea.md)                                    │
│  "Je veux créer une app de todo list avec React"            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ prompt-cursor generate
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  🎯 UN Prompt Intelligent (.prompt-cursor/prompts/)         │
│  Contient toutes les instructions pour Cursor AI            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ Copier/Coller dans Cursor AI
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  🤖 Cursor AI génère TOUT en 1 conversation                 │
│  • project-request.md (vision métier)                       │
│  • .cursorrules (standards de code)                         │
│  • spec.md (architecture technique)                         │
│  • implementation-plan.md (roadmap)                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ prompt-cursor build
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  📊 Workflow Intelligent Généré                             │
│  • .prompt-cursor/workflow/code-run.md                      │
│  • .prompt-cursor/workflow/Instructions/                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  🎉 Projet Prêt ! Commencez le développement                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Démarrage Rapide (2 minutes)

### 1️⃣ Créez votre idée

```bash
cat > idea.md << 'EOF'
# Application Todo List

Une app web moderne avec:
- Ajout/suppression de tâches
- Filtres (toutes, actives, complétées)
- Sauvegarde locale
- Interface moderne avec animations

Stack: React + TypeScript + TailwindCSS
EOF
```

### 2️⃣ Générez le prompt intelligent

```bash
prompt-cursor generate -i idea.md -o ./todo-app
# ou
pcb gen -i idea.md -o ./todo-app
```

**Résultat :** Un fichier `.prompt-cursor/prompts/prompt-generate.md` qui contient UN prompt optimisé

### 3️⃣ Utilisez dans Cursor AI

1. Ouvrez `./todo-app/.prompt-cursor/prompts/prompt-generate.md`
2. Copiez le contenu entre les ```
3. Collez dans Cursor AI
4. Sauvegardez les 4 fichiers dans `.prompt-cursor/docs/`:
   - `project-request.md`
   - `cursor-rules.md`
   - `spec.md`
   - `implementation-plan.md`

### 4️⃣ Build intelligent

```bash
cd ./todo-app
prompcore build
```

**✅ C'est tout !** Votre projet est structuré et prêt.

---

## 📚 Exemple Complet : Application Météo

### 🎬 Étape 1 : L'idée

```markdown
# Weather Suggest

Application météo moderne avec:
- Recherche par ville/pays
- Animations selon la météo (☀️ 🌧️ ❄️)
- Prévisions 5 jours
- Mode sombre

Stack: React + Vite + Framer Motion
```

### 🚀 Étape 2 : Generate

```bash
prompt-cursor generate -i weather-idea.md -o ./weather-app
```

**Ce qui se passe :**

```
📝 idea.md
    │
    ├─→ Lit votre idée
    ├─→ Applique un template intelligent
    └─→ Génère prompt-generate.md
```

### 🤖 Étape 3 : Cursor AI

**Dans Cursor, après avoir collé le prompt :**

```
🤖 Cursor: "Je vais créer les 4 fichiers de documentation..."

=== FILE: project-request.md ===
# Weather Suggest - Project Request

## Overview
Modern weather application with real-time data...

## Target Users
- Travelers planning trips
- Daily commuters...

=== FILE: .cursorrules ===
# Technology Stack
- React 18.3
- Vite 5.4
- TypeScript 5.6...

[Continue avec spec.md et implementation-plan.md]
```

### 🔨 Étape 4 : Build

```bash
prompcore build
```

**Résultat du parsing intelligent :**

```
📖 Parsing implementation plan...
✓ Found 15 steps in plan
✓ Grouped into 5 development phases

🎨 Generating code-run.md...
✓ Phase 1: Project Setup (3 tasks)
✓ Phase 2: Core Features (4 tasks)
✓ Phase 3: Weather Display (3 tasks)
✓ Phase 4: Animations (3 tasks)
✓ Phase 5: Testing & Deploy (2 tasks)
```

---

## 📊 Comprendre les Fichiers Générés

### Vue d'ensemble

```
mon-projet/
├── 📄 prompt-generate.md      ← Généré par 'generate'
├── 📄 project-request.md      ← Généré par Cursor (QUOI)
├── 📄 .cursorrules            ← Généré par Cursor (COMMENT)
├── 📄 spec.md                 ← Généré par Cursor (ARCHITECTURE)
├── 📄 implementation-plan.md  ← Généré par Cursor (QUAND)
├── 📄 code-run.md            ← Généré par 'build' (SUIVI)
└── 📁 Instructions/          ← Généré par 'build' (DÉTAILS)
    ├── instructions-step1.md
    ├── instructions-step2.md
    └── ...
```

### Rôle de chaque fichier

| Fichier | Rôle | Contient | Qui l'utilise |
|---------|------|----------|---------------|
| **project-request.md** | Vision métier | Objectifs, fonctionnalités, public | Product Owner |
| **.cursorrules** | Standards code | Stack, conventions, patterns | Développeurs |
| **spec.md** | Architecture | Schémas, API, DB, sécurité | Architecte |
| **implementation-plan.md** | Roadmap | Étapes, dépendances, temps | Chef de projet |
| **code-run.md** | Suivi | TODOs, tests, progression | Scrum Master |
| **Instructions/** | Guides | Tâches détaillées par étape | Développeurs |

---

## 📊 Dashboard de Progression

### Commande context

```bash
prompt-cursor context
```

**Affichage :**

```
📊 CLI Context & Project Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Project Information:
  Name: project name
  Created: 11/5/2025
  
🔄 Workflow Status:
  Type: ⭐ Generate (Recommended)
  Current Phase: development

📈 Progress:
  1. Prompt Generation: ✅
  2. Cursor AI Files: ✅
  3. Build Process: ✅
  4. Development: ████░░░░░░░░ 35%

📁 File Status:
  ✅ idea.md
  ✅ prompt-generate.md
  ✅ project-request.md
  ✅ .cursorrules
  ✅ spec.md
  ✅ implementation-plan.md
  ✅ code-run.md
  ✅ Instructions/

💡 Next Steps:
  ✅ Ready for development! Follow code-run.md
```

---

## 🛠️ Guide d'Implémentation Pratique

### Comment utiliser les fichiers générés pour développer

Une fois que vous avez tous vos fichiers, voici **exactement** comment procéder :

### 📂 Fichiers à utiliser pour développer

```
✅ À UTILISER                    ❌ NE PAS UTILISER
─────────────                    ──────────────────
.cursorrules                     implementation-plan.md (trop détaillé)
Instructions/instructions-stepX  code-run.md (juste pour votre suivi)
spec.md (au début seulement)     prompt-generate.md (déjà utilisé)
```

### 🎮 Exemple Concret : Implémenter l'Étape 1

#### 1️⃣ Ouvrez votre projet dans Cursor

```bash
cd ./weather-suggest
cursor .  # ou code . si vous utilisez Cursor comme VSCode
```

#### 2️⃣ Dans le chat Cursor, glissez les fichiers

```
1. Glissez .cursorrules (une seule fois au début)
2. Glissez Instructions/instructions-step1.md
```

#### 3️⃣ Donnez cette instruction à Cursor

```
En respectant les conventions définies dans .cursorrules, 
implémente les 3 tâches de l'étape 1 :

1. Initialize Vite + React + TypeScript project
2. Set up TailwindCSS, Axios, Framer Motion
3. Set up folder structure

Commence par la première tâche.
```

#### 4️⃣ Cursor va générer le code

**Exemple de réponse Cursor :**
```bash
# Je vais initialiser le projet Vite avec React et TypeScript

npm create vite@latest . -- --template react-ts
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  }
})
```

#### 5️⃣ Validez et continuez

```
✅ Task 1 complétée
Maintenant implémente la Task 2 : configure TailwindCSS
```

### 📋 Workflow Étape par Étape

```
ÉTAPE 1 (Project Setup)
├── 📎 Fichiers à donner: .cursorrules + instructions-step1.md
├── 💬 "Implémente l'étape 1 avec les 3 tâches"
├── ✅ Valider chaque tâche
└── 📝 Cocher dans code-run.md

ÉTAPE 2 (Core Features)  
├── 📎 Fichiers: instructions-step2.md (cursorrules déjà dans contexte)
├── 💬 "Implémente l'étape 2"
├── ✅ Tester les fonctionnalités
└── 📝 Cocher dans code-run.md

ÉTAPE 3...
```

### 💡 Exemples de Prompts Efficaces

**❌ Trop vague :**
```
Fais l'étape 1
```

**✅ Précis et efficace :**
```
En suivant les conventions de .cursorrules et les tâches définies 
dans instructions-step1.md, implémente le setup initial du projet.
Commence par créer le projet Vite avec React et TypeScript.
```

**✅ Pour continuer :**
```
La tâche 1 est terminée. Maintenant configure TailwindCSS 
et les autres dépendances listées dans la tâche 2.
```

**✅ Pour débugger :**
```
J'ai cette erreur lors du npm install: [erreur].
Comment la résoudre en respectant notre architecture?
```

### 🔄 Cycle de Développement

```
Pour chaque étape:
┌─────────────────────────┐
│ 1. Lire code-run.md     │ ← Voir quelle étape faire
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ 2. Ouvrir Instructions/ │ ← Voir les tâches détaillées
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ 3. Donner à Cursor      │ ← .cursorrules + instructions
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ 4. Implémenter          │ ← Cursor génère le code
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ 5. Tester & Valider     │ ← Vérifier que ça marche
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│ 6. Cocher dans code-run │ ← Marquer comme fait
└─────────────────────────┘
```

### ⚠️ Erreurs Courantes à Éviter

| Erreur | Conséquence | Solution |
|--------|-------------|----------|
| Donner tous les fichiers d'un coup | Cursor est confus | Donner seulement l'étape courante |
| Sauter des étapes | Dépendances manquantes | Suivre l'ordre de code-run.md |
| Ignorer .cursorrules | Code incohérent | Toujours l'inclure au début |
| Donner implementation-plan.md | Trop de détails | Utiliser Instructions/ à la place |

---

## 🔧 Fonctionnalités Avancées

### ⚙️ Vérification Automatique de Compatibilité

**Problème résolu** : Les erreurs de versions incompatibles (TailwindCSS v4 vs PostCSS, etc.)

**Comment ça marche :**

1. Le CLI **détecte votre stack** depuis `idea.md`
2. **Injecte automatiquement** les versions compatibles dans le prompt
3. **Ajoute les configurations** nécessaires (postcss.config.js, etc.)

**Exemple** :
```markdown
idea.md → "React + Vite + TailwindCSS"
          ↓
prompt généré inclut :
- TailwindCSS ^3.4.0 (pas v4 qui casse PostCSS)
- PostCSS ^8.4.31
- Fichiers de config corrects
- Notes de compatibilité
```

**Stacks supportés avec versions testées :**
- React + Vite + TailwindCSS
- Next.js + TailwindCSS
- Express.js + Node.js
- Prisma + SQLite
- JWT + bcrypt
- React Native + Expo
- NestJS

### ✅ Commande `complete` - Tracking de Progression

**Utilisation :**
```bash
prompt-cursor complete           # Mode interactif
pcb done --step 3             # Direct
```

**Effet :**
- Marque l'étape actuelle comme terminée (✅)
- Active automatiquement l'étape suivante (🟡)
- Met à jour le contexte et les statistiques
- Modifie `.prompt-cursor/workflow/code-run.md`

### 🧠 Parsing Intelligent

Le CLI analyse automatiquement le plan de Cursor pour :

```
implementation-plan.md          code-run.md
───────────────────            ──────────────
15 étapes détaillées    →      5 phases groupées
- [ ] Step 1: Setup...          ÉTAPE 1: Foundation
- [ ] Step 2: Install...        (regroupe steps 1-3)
- [ ] Step 3: Config...         
                                ÉTAPE 2: Core Features
- [ ] Step 4: API...            (regroupe steps 4-7)
- [ ] Step 5: Search...         
...                             ...
```

### 🎯 Tests Intelligents

Les critères de test sont générés selon le contexte :

```
Task: "Initialize Vite + React project"
→ Test: "Le projet est correctement initialisé avec tous les fichiers"

Task: "Set up API integration"
→ Test: "Les appels API fonctionnent et retournent les données attendues"

Task: "Add animations"
→ Test: "Les animations sont fluides et s'exécutent à 60 FPS"
```

---

---

## 💡 Tips & Astuces

### 📝 Écrire une bonne idée

**❌ Trop vague :**
```
Une app de todo
```

**✅ Bien détaillé :**
```markdown
# Todo App Moderne

Fonctionnalités:
- CRUD complet des tâches
- Filtres et recherche
- Tags et catégories
- Synchronisation cloud
- Mode hors-ligne

Stack: React + TypeScript + Supabase
UI: TailwindCSS + Framer Motion
```

### 🚀 Optimiser Cursor AI

1. **Soyez précis** dans vos réponses
2. **Donnez des exemples** quand possible
3. **Validez** chaque fichier avant de sauvegarder

### 🔨 Personnaliser le build

Le build s'adapte automatiquement à différents formats :
- Format français : `### Étape X:`
- Format anglais : `- [ ] Step X:`
- Format checkbox : `**Task**: description`

---

## 🐛 Troubleshooting

### "No response files found"
→ Assurez-vous d'avoir sauvegardé les 4 fichiers de Cursor

### "0 steps in plan"
→ Vérifiez le format de `implementation-plan.md`

### "Command not found"
→ Exécutez `npm link` dans le dossier du CLI

---

## 🎉 Résumé

**Le workflow ultra-simplifié en 4 étapes :**

1. 📝 **Idée** → Écrivez votre vision dans `idea.md`
2. 🎯 **Generate** → `prompt-cursor generate` crée un prompt intelligent avec versions compatibles
3. 🤖 **Cursor** → Une seule conversation génère tous les fichiers
4. 🔨 **Build** → `prompt-cursor build` parse et crée le workflow de développement

**Bonus :**
5. ✅ **Complete** → `prompt-cursor complete` marque vos étapes terminées automatiquement

**Résultat :** Un projet professionnel, structuré, sans erreurs de compatibilité, prêt à développer !

---

<p align="center">
  <b>Commencez maintenant :</b><br>
  <code>prompt-cursor generate -i idea.md -o ./mon-projet</code>
</p>
