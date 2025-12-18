Voici ton **fichier Markdown complet**, prêt à être collé dans Cursor pour démarrer le refactor du bundle.
Il contient :

* Roadmap
* Architecture technique
* Système d’orchestration
* Prompts spécialisés pour les agents

---

# 📘 Prompt Cursor Bundle — Refactor vers Orchestrateur d’Agents IA

## **Blueprint Technique Complet**

Ce document définit la roadmap, l’architecture, le moteur d’orchestration, et les prompts des agents nécessaires pour transformer **Prompt Cursor Bundle** en un **orchestrateur multi-agents capable de générer, implémenter et valider un projet logiciel complet à partir d’une simple idée**.

---

# 1️⃣ Roadmap Complète

## Phase 1 — Agent Engine Minimal (v1.1.x)

* Générer des artefacts projet sous `.ai/` (docs, rules, steps, tasks, workflow)
* Orchestrateur **IDE-first** (pas d’appel LLM) basé sur l’état local (`.ai/tasks.json`)
* Créer un agent générique capable de lire :

  * idea.md
  * spec.md
  * implementation-plan.md
* Ajouter commandes :

  * `prompt-cursor agents:status` — Progression + tâches prêtes
  * `prompt-cursor agents:run` — Génère le prompt prêt à copier dans l'IDE
  * `prompt-cursor agents:next` — Affiche le prochain prompt à exécuter
  * `prompt-cursor agents:complete` — Marque une étape terminée
* **Mode IDE-first** : Pas de clé API requise, l'utilisateur utilise son IDE (Cursor, Claude Code, Windsurf) qui gère déjà la connexion LLM
* Bonus : **1 step = 1 test E2E** (Playwright) associé

## Phase 2 — Multi-Agents Séquentiels (v1.2.x)

* Agents intégrés :

  * architect
  * planner
  * dev-frontend
  * dev-backend
  * dev-api
* Pipeline : architect ➝ planner ➝ dev-*
* Commande : `prompt-cursor agents:pipeline`

## Phase 3 — DAG et Mode Complexe (v1.3.x)

* Graphe de dépendances (DAG) à partir de :

  * `.ai/tasks.json` (`dependsOn`)
  * `.ai/config.json` (modules/complexMode)
* Scheduler dynamique (à venir) basé sur `status` + `dependsOn`
* Pas de fichier `dependency-graph.md` séparé (dépendances stockées dans `tasks.json`)

## Phase 4 — Reviewer & Fixer (v1.4.x)

* Agents reviewer + fixer
* Patches auto :

  * `.ai/patches/`
  * `.ai/reviews/`
* Option `--auto-apply`

## Phase 5 — Dashboard Agents (v1.5.x)

* Vue agents dans dashboard :

  * stats / tokens / progression
* Commande :

  * `prompt-cursor agents:dashboard --watch`

## Phase 6 — Plugins externes (v2.0)

* Fichier `prompt-cursor.agents.js`
* Possibilité d’ajouter ses propres agents
* Connecteurs Git & CI

---

# 🧭 État actuel (implémenté) et prochaine cible

## Ce qui existe déjà (implémenté)

- `prompt-cursor generate` (IDE-first) crée :
  - `.ai/config.json`
  - `.ai/prompts/prompt-generate.md` (prompt à copier dans l’IDE)
- `prompt-cursor build --complex` génère :
  - `.ai/workflow.md` (vue globale + progression)
  - `.ai/steps/step-1..N.md` (1 step = 1 prompt à copier)
  - `.ai/tasks.json` (état des tasks : `status`, `dependsOn`, `agent`, `module`, `files`, `e2e`)
  - `.ai/rules/*-rules.md` (+ `.cursorrules` et `.cursor/rules/*.mdc` côté Cursor)
- Orchestration **IDE-first** (sans appels LLM) via commandes :
  - `prompt-cursor agents:status` : progression + tâches `ready`
  - `prompt-cursor agents:run --step N [--copy]` : affiche / copie `.ai/steps/step-N.md` (et marque `prompted` si `--copy`)
  - `prompt-cursor agents:next [--copy]` : sélectionne la première tâche prête
  - `prompt-cursor agents:complete --step N` : marque `completed`, met à jour `.ai/tasks.json` et synchronise `.ai/workflow.md`
- Qualité : **1 step = 1 test E2E** (manuel)
  - Référence visible dans chaque `step-N.md`
  - Champ `tasks.json.entries[].e2e`
  - À la complétion, la CLI crée (si absent) `tests/e2e/step-N.spec.ts` (Playwright) et affiche la commande :
    - `pnpm exec playwright test tests/e2e/step-N.spec.ts`
  - Prérequis projet : `pnpm add -D -w @playwright/test`

## Manques vs intention (à venir)

- `agents:pipeline` (architect → planner → dev-*)
- `agents:parallel` (tâches parallélisables)
- `agents:verify` / `agents:complete --verify` (exécution auto des tests)
- Reviewer/Fixer : `.ai/reviews/`, `.ai/patches/`, option `--auto-apply`
- Plugins externes (`prompt-cursor.agents.js`) + connecteurs Git/CI

### Mises à jour (12/12/2025)

- Migration des artefacts vers `.ai/` (structure unique, plus de `.prompt-*`)
- `tasks-map.json` → `.ai/tasks.json` (statuts + métadonnées `files` + `e2e`)
- Ajout des commandes `agents:status`, `agents:run`, `agents:next`, `agents:complete`
- Synchronisation automatique de `.ai/workflow.md` à chaque `agents:complete`
- Squelette Playwright généré par step (`tests/e2e/step-N.spec.ts`)

# 2️⃣ Architecture Technique

## Structure des dossiers

```
/cli              # Commandes CLI (generate, build, agents:*)
/core             # Logique métier
/workflow         # Gestion du workflow projet
/agents           # Définitions et moteur d'agents
/orchestrator     # Scheduler et gestion des dépendances
/ui               # Dashboard et affichage
```

> **Note** : Pas de `/providers` - l'utilisateur utilise son IDE (Cursor, Claude Code, etc.) qui gère la connexion LLM.

## Philosophie : Mode IDE-first (sans clé API)

L'utilisateur travaille dans son IDE (Cursor, Claude Code, Windsurf, Copilot) qui possède **déjà** sa propre connexion au LLM. La CLI ne fait **pas** d'appels API directs.

**Workflow :**
1. `agents:run --step 3` → Génère le prompt complet dans le terminal ou un fichier
2. L'utilisateur copie/colle ce prompt dans son IDE
3. L'IDE exécute via sa propre connexion LLM
4. L'utilisateur sauvegarde la réponse
5. `agents:complete --step 3` → Marque comme fait, passe au suivant

**Avantages :**
- Pas de gestion de clés API
- Fonctionne avec n'importe quel IDE/LLM
- L'utilisateur garde le contrôle total
- Pas de coûts API cachés

## Interfaces (extrait)

```ts
// IDE-first: l'IDE gère la connexion LLM
export interface IDEConfig {
  name: "cursor" | "claude-code" | "windsurf" | "copilot" | "other";
  promptOutputMode: "clipboard" | "file" | "terminal";
  responseInputDir: string; // Where user saves AI responses
}

export type TaskStatus = "pending" | "ready" | "prompted" | "completed" | "failed";

export interface TasksFile {
  generatedAt: string;
  project: string;
  totalSteps: number;
  entries: TaskEntry[];
}

export interface TaskEntry {
  step: number;
  title: string;
  file: string; // .ai/steps/step-N.md
  agent: string;
  module: string | null;
  files: string[]; // expected outputs
  dependsOn: number[];
  e2e: { file: string; command: string };
  status: TaskStatus;
  promptedAt?: string;
  completedAt?: string;
}
```

---

# 3️⃣ Système d’Orchestration

## Construction du graphe de tâches (DAG)

* Parser implementation-plan.md
* Générer un `Task` par step
* Stocker l’état dans `.ai/tasks.json`
* Ajouter dépendances selon :

  * `dependsOn` (extrait du plan)
  * modules (pour l’assignation d’agent)
  * milestones (optionnel)

## Orchestrateur Guidé (Mode IDE-first, pas d'appel API)

L'orchestrateur **ne fait pas d'appels LLM**. Il guide l'utilisateur à travers les steps :

```ts
export class Orchestrator {
  // Get next available tasks (dependencies satisfied)
  getReadyTasks(): TaskEntry[] {
    return this.tasks.filter(t =>
      t.status !== "completed" &&
      t.dependsOn.every(depId => this.getTask(depId)?.status === "completed")
    );
  }

  // Generate prompt for a step (user will copy to IDE)
  generatePrompt(step: number): string {
    const task = this.getTask(step);
    return this.readFile(task.file); // .ai/steps/step-N.md
  }

  // Mark task as prompted (user copied the prompt)
  markAsPrompted(step: number): void {
    const task = this.getTask(step);
    task.status = "prompted";
    task.promptedAt = new Date().toISOString();
    this.saveState();
  }

  // Mark task as complete (user saved AI response)
  markAsComplete(step: number): void {
    const task = this.getTask(step);
    task.status = "completed";
    task.completedAt = new Date().toISOString();
    this.saveState();
    this.ensureE2E(task);
    this.updateWorkflow();
  }

  // Show progress
  getProgress(): { completed: number; total: number; ready: TaskEntry[] } {
    const completed = this.tasks.filter(t => t.status === "completed").length;
    return { completed, total: this.tasks.length, ready: this.getReadyTasks() };
  }
}
```

## Commandes CLI (Mode IDE-first)

```bash
# Voir la progression et les tâches disponibles
prompt-cursor agents:status

# Afficher le prompt pour une tâche (copier dans IDE)
prompt-cursor agents:run --step 3
prompt-cursor agents:run --step 3 --copy  # Copie dans clipboard

# Afficher le prochain prompt disponible
prompt-cursor agents:next
prompt-cursor agents:next --copy

# Marquer une tâche comme terminée (met à jour tasks/workflow + crée le test)
prompt-cursor agents:complete --step 3

# Lancer le test E2E associé (manuel)
pnpm exec playwright test tests/e2e/step-3.spec.ts
```

---

# 4️⃣ Prompts Spécialisés pour les Agents

---

## 🧠 Agent Architect

```txt
[ROLE]
Tu es un architecte logiciel senior. Tu conçois l'architecture globale d'un projet.

[OBJECTIF]
Produire :
- Architecture générale
- Modules
- Dépendances
- Risques

[ENTRÉES]
IDEA:
{{idea}}

STACK:
{{stack}}

[FORMAT]
# Architecture Overview
...

# Modules
- frontend: ...
- backend: ...
- api: ...
- database: ...
- infra: ...

# Dependencies
- backend -> database
- api -> backend

# Risks
- ...
```

---

## 📋 Agent Planner

```txt
[ROLE]
Tu es un tech lead. Tu écris un plan d'implémentation complet.

[OBJECTIF]
Générer implementation-plan.md avec steps, milestones, modules.

[ENTRÉES]
IDEA:
{{idea}}

ARCHITECTURE:
{{architecture_md}}

[FORMAT]
# Milestones
- [ ] M1: MVP
- [ ] M2: Beta
- [ ] M3: Production

# Plan

## M1: MVP
- [ ] Step 1: ... (module: frontend)
- [ ] Step 2: ... (module: backend)
```

---

## 🧑‍💻 Agent Dev Frontend

````txt
[ROLE]
Tu es un développeur frontend senior.

[OBJECTIF]
Implémenter la step frontend donnée.

[ENTRÉES]
STEP:
{{step_text}}

SPEC:
{{spec_md}}

CODE PERTINENT:
{{snippet_frontend}}

[FORMAT]
```diff
<patch>
````

```md
# CHANGES
- ...
```

````

---

## 🧑‍💻 Agent Dev Backend

```txt
[ROLE]
Développeur backend senior.

[OBJECTIF]
Implémenter la step backend.

[FORMAT]
Même format : diff + CHANGES.
````

---

## 🔌 Agent Dev API

```txt
[ROLE]
Développeur API REST/GraphQL.

[OBJECTIF]
Implémenter les endpoints selon la step.

[CONTRAINTES]
- Respecter contrats
- Gérer erreurs
```

---

## 🧪 Agent Reviewer

```txt
[ROLE]
Tu es un reviewer de code senior.

[OBJECTIF]
Accepter ou rejeter un patch.

[ENTRÉES]
OLD CODE:
{{old}}

NEW CODE:
{{new}}

[FORMAT]
# DECISION
ACCEPT | REJECT

# REASONS
- ...

# REQUIRED CHANGES
- ...

# OPTIONAL IMPROVEMENTS
- ...
```

---

## 🛠️ Agent Fixer

````txt
[ROLE]
Tu es un expert en correction ciblée.

[OBJECTIF]
Corriger l'erreur ou la review.

[ENTRÉES]
ERREUR:
{{error}}

REVIEW:
{{review_md}}

[FORMAT]
```diff
<patch>
````

```md
# FIX SUMMARY
- ...
```

---

# 5️⃣ Structure générée (implémentée)

## Objectif

Réduire la redondance et tout regrouper dans un dossier unique, compatible IDE-first.

## Structure actuelle (implémentée)

```
.ai/
├── config.json
├── prompts/
│   └── prompt-generate.md
├── docs/
│   ├── project-request.md
│   ├── ai-rules.md
│   ├── spec.md
│   └── implementation-plan.md
├── rules/
│   ├── frontend-rules.md
│   ├── backend-rules.md
│   ├── database-rules.md
│   ├── devops-rules.md
│   └── qa-rules.md
├── workflow.md
├── tasks.json
└── steps/
    └── step-1..N.md

tests/
└── e2e/
    └── step-1..N.spec.ts   ← généré à la complétion
```

### Notes

- Plus de `.prompt-cursor/`, `.prompt-agents/`, `.prompt-rules/`
- `tasks-map.json` → `.ai/tasks.json`
- Plus de `run/<agent>-stepN.md` : **le step est le prompt**
- Pas de `dependency-graph.md` séparé : dépendances dans `tasks.json` (et affichage dans `workflow.md`)

## Format d’un `step-N.md`

```markdown
# Step N: <Titre>

**Agent:** <agent> | **Module:** <module> | **Dépend de:** <deps> | **~<estimation>**

## 🎯 Mission
<objectif>

## 📚 Références
- **Règles:** `.ai/rules/<agent>-rules.md`
- **Spec:** `.ai/docs/spec.md`
- **Plan:** `.ai/docs/implementation-plan.md` (Step N)

## ✅ Tâches
- [ ] ...

## 🧪 Test E2E
- **Fichier:** `tests/e2e/step-N.spec.ts`
- **Commande:** `pnpm exec playwright test tests/e2e/step-N.spec.ts`
```

## Format de `.ai/tasks.json` (extrait)

```json
{
  "generatedAt": "2025-12-12T...",
  "project": "my-project",
  "totalSteps": 76,
  "entries": [
    {
      "step": 1,
      "title": "Initialize Monorepo Structure",
      "file": ".ai/steps/step-1.md",
      "agent": "devops",
      "module": "infra",
      "files": ["package.json", "pnpm-workspace.yaml"],
      "dependsOn": [],
      "e2e": {
        "file": "tests/e2e/step-1.spec.ts",
        "command": "pnpm exec playwright test tests/e2e/step-1.spec.ts"
      },
      "status": "ready"
    }
  ]
}
```

---

# 6️⃣ Plan d'implémentation Phase 1

## Ordre d'implémentation (incluant simplification)

```
  0️⃣  Simplification structure    ← NOUVEAU (avant les commandes)
       │
       │  Modifier workflowGenerator.js et agentsGenerator.js
       │  Effort: ~4h
       │
       ▼
```

## Ordre des commandes à implémenter

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    ORDRE D'IMPLÉMENTATION - PHASE 1                          │
│                         (Du plus simple au plus complexe)                    │
└──────────────────────────────────────────────────────────────────────────────┘

  1️⃣  agents:status      ← Affiche la progression (lecture seule)
       │
       │  Dépend de: .ai/tasks.json (généré par build)
       │  Effort: ~2h
       │
       ▼
  2️⃣  agents:run         ← Affiche / copie le step (prompt)
       │
       │  Dépend de: agents:status (réutilise la lecture)
       │  Effort: ~3h
       │
       ▼
  3️⃣  agents:next        ← Affiche le prochain prompt disponible
       │
       │  Dépend de: agents:run (wrapper intelligent)
       │  Effort: ~1h
       │
       ▼
  4️⃣  agents:complete    ← Marque terminé + met à jour workflow + crée test E2E
       │
       │  Dépend de: agents:status (mise à jour du fichier)
       │  Effort: ~2h
       │
       ▼
  ✅  PHASE 1 COMPLÈTE (~8h de travail)
```

## Détail des commandes

### 1️⃣ `agents:status`
```bash
prompt-cursor agents:status
```
- Lit `.ai/tasks.json`
- Calcule les stats (completed, ready, pending)
- Affiche la progression avec barre visuelle

### 2️⃣ `agents:run`
```bash
prompt-cursor agents:run --step 3
prompt-cursor agents:run --step 3 --copy  # Copie dans clipboard
```
- Lit `.ai/steps/step-3.md`
- Affiche le prompt complet (markdown) dans le terminal
- Option `--copy` : copie dans le clipboard + marque le step en `prompted`

### 3️⃣ `agents:next`
```bash
prompt-cursor agents:next
prompt-cursor agents:next --copy
```
- Trouve la première tâche prête (dépendances satisfaites)
- Appelle `agents:run` avec ce step

### 4️⃣ `agents:complete`
```bash
prompt-cursor agents:complete --step 3
```
- Met à jour `.ai/tasks.json`
- Change `status: "pending"` → `status: "completed"`
- Ajoute `completedAt: timestamp`
- Met à jour `.ai/workflow.md` (progression + table)
- Crée (si absent) `tests/e2e/step-3.spec.ts` et affiche la commande Playwright

## Fichiers (implémentés)

```
/src/commands/
├── agents-status.js      ← 1️⃣
├── agents-run.js         ← 2️⃣
├── agents-next.js        ← 3️⃣
└── agents-complete.js    ← 4️⃣

/src/orchestrator/
└── index.js              ← Classe Orchestrator partagée
```

## Format `.ai/tasks.json`

```json
{
  "generatedAt": "2025-12-12T...",
  "project": "my-project",
  "totalSteps": 76,
  "entries": [
    {
      "step": 1,
      "title": "Initialize Monorepo Structure",
      "file": ".ai/steps/step-1.md",
      "agent": "devops",
      "module": "infra",
      "files": ["package.json", "pnpm-workspace.yaml"],
      "dependsOn": [],
      "e2e": {
        "file": "tests/e2e/step-1.spec.ts",
        "command": "pnpm exec playwright test tests/e2e/step-1.spec.ts"
      },
      "status": "completed",
      "promptedAt": "2025-12-12T10:10:00Z",
      "completedAt": "2025-12-12T10:15:00Z"
    },
    {
      "step": 2,
      "title": "Setup Passenger Web App",
      "file": ".ai/steps/step-2.md",
      "agent": "frontend",
      "module": "frontend",
      "dependsOn": [1],
      "status": "ready"
    },
    {
      "step": 3,
      "title": "Build Driver Login & Registration",
      "file": ".ai/steps/step-3.md",
      "agent": "frontend",
      "module": "frontend",
      "dependsOn": [2],
      "status": "pending"
    }
  ]
}
```

## Exemple d'affichage CLI

```
$ prompt-cursor agents:status

┌──────────────────────────────────────────────────────────────┐
│  📊 Progression: 12/76 steps (16%)                           │
│  ████░░░░░░░░░░░░░░░░░░░░░░░░░░                              │
├──────────────────────────────────────────────────────────────┤
│  ✅ Completed: 12                                            │
│  🔄 Ready:     3  (peuvent être lancées maintenant)          │
│  ⏳ Pending:   61 (attendent des dépendances)                │
├──────────────────────────────────────────────────────────────┤
│  🚀 Prochaines tâches disponibles:                           │
│                                                              │
│  Step 13 │ backend  │ API Endpoints Users                    │
│  Step 14 │ database │ Migration Roles                        │
│  Step 15 │ frontend │ Dashboard Layout                       │
├──────────────────────────────────────────────────────────────┤
│  💡 Utiliser: prompt-cursor agents:next --copy               │
└──────────────────────────────────────────────────────────────┘

$ prompt-cursor agents:next --copy

✅ Prompt copié dans le clipboard !

📋 Step 13: API Endpoints Users
🤖 Agent: backend
📁 Module: api

Collez ce prompt dans votre IDE (Cursor, Claude Code, Windsurf...)
Puis exécutez: prompt-cursor agents:complete --step 13
```

---

# 7️⃣ Résumé des phases

| Phase | Version | Livrables | Effort |
|-------|---------|-----------|--------|
| **0** | v1.0.x | **Simplification structure** (fusionner fichiers, workflow.md unique) | ~4h |
| **1** | v1.1.x | `agents:status`, `agents:run`, `agents:next`, `agents:complete` + E2E par step | ~8h |
| **2** | v1.2.x | `agents:pipeline`, `agents:parallel`, séquencement guidé | ~8h |
| **3** | v1.3.x | DAG runtime, scheduler avec dépendances | ~12h |
| **4** | v1.4.x | Agents Reviewer + Fixer (prompts spécialisés) | ~8h |
| **5** | v1.5.x | Dashboard progression, stats par module | ~8h |
| **6** | v2.0 | Plugins, hooks Git, export CI | ~16h |

---

# 8️⃣ Ordre complet d'implémentation (première itération)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      PREMIÈRE ITÉRATION COMPLÈTE                             │
└──────────────────────────────────────────────────────────────────────────────┘

  0️⃣  SIMPLIFICATION (Phase 0)
       │
       ├── Générer `.ai/workflow.md` + `.ai/steps/` (workflowGenerator)
       │
       ├── Générer `.ai/rules/` (agentsGenerator)
       │
       └── Mettre à jour `.ai/tasks.json`
           └── `file` + `files` + `e2e` + `status`
       │
       │  Effort: ~4h
       │
       ▼
  1️⃣  agents:status      (~2h)
       │
       ▼
  2️⃣  agents:run         (~3h)
       │
       ▼
  3️⃣  agents:next        (~1h)
       │
       ▼
  4️⃣  agents:complete    (~2h)
       │
       ▼
  ✅  PREMIÈRE ITÉRATION COMPLÈTE (~8h total)
```