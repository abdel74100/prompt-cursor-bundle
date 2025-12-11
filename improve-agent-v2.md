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

* Ajouter un système de configuration des agents
* Créer un agent générique capable de lire :

  * idea.md
  * spec.md
  * implementation-plan.md
* Ajouter commandes :

  * `prompt-cursor agents:init`
  * `prompt-cursor agents:run`
* Support providers : OpenAI, Claude, DeepSeek

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

* Graphe de dépendances automatique à partir de :

  * modules-config.json
  * dependency-graph.md
* Scheduler dynamique
* Commande :

  * `prompt-cursor agents:run --complex`

## Phase 4 — Reviewer & Fixer (v1.4.x)

* Agents reviewer + fixer
* Patches auto :

  * `.prompt-{provider}/patches/`
  * `.prompt-{provider}/reviews/`
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

# 2️⃣ Architecture Technique

## Structure des dossiers

```
/cli
/core
/workflow
/agents
/orchestrator
/providers
/telemetry
/ui
```

## Interfaces TypeScript (extrait)

```ts
export interface ProviderConfig {
  name: "openai" | "anthropic" | "deepseek" | "ollama";
  model: string;
  apiKeyEnv: string;
  baseUrl?: string;
}

export interface AgentDefinition {
  id: string;
  role: string;
  description: string;
  provider: ProviderConfig;
  promptTemplate: string;
  capabilities: string[];
  inputSelector: (context: ProjectContext, task: Task) => AgentInput;
  outputHandler: (context: ProjectContext, task: Task, output: AgentOutput) => Promise<void>;
}

export interface Task {
  id: string;
  type: "architecture" | "planning" | "implementation" | "review" | "fix";
  module?: string;
  milestone?: string;
  stepId?: string;
  dependsOn: string[];
  status: "pending" | "running" | "completed" | "failed";
  assignedAgentId?: string;
}
```

---

# 3️⃣ Système d’Orchestration

## Construction du graphe de tâches (DAG)

* Parser implementation-plan.md
* Générer un `Task` par step
* Ajouter dépendances selon :

  * modules
  * milestones
  * dependency-graph.md

## Scheduler Dynamique (TypeScript)

```ts
export class Orchestrator {
  async runAll(tasks: Task[]) {
    const pending = new Map(tasks.map(t => [t.id, t]));
    const running = new Set<string>();

    while (pending.size > 0) {
      const ready = [...pending.values()].filter(t =>
        t.status === "pending" &&
        t.dependsOn.every(d => this.context.getTaskStatus(d) === "completed")
      );

      const availableSlots = this.config.maxParallelAgents - running.size;
      const toLaunch = ready.slice(0, availableSlots);

      for (const task of toLaunch) {
        running.add(task.id);
        task.status = "running";
        this.runTask(task)
          .then(() => (task.status = "completed"))
          .catch(() => (task.status = "failed"))
          .finally(() => running.delete(task.id));
        pending.delete(task.id);
      }

      await new Promise(r => setTimeout(r, 500));
    }
  }

  private async runTask(task: Task) {
    const agent = this.selectAgentForTask(task);
    const input = agent.inputSelector(this.context, task);
    const output = await callProvider(agent, input);
    await agent.outputHandler(this.context, task, output);
  }
}
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

```