Voici **la méthode la plus propre et efficace** pour intégrer **cursor-memory-bank** dans ton bundle **Prompt Cursor Bundle**, sans casser ton architecture actuelle et en le transformant en *mémoire intelligente interne* utilisée automatiquement par tes agents.

pour que ton bundle devienne compatible immédiatement.

---

# ✅ 1. Constat : ton bundle + cursor-memory-bank = complément idéal

Ton bundle fournit déjà :

* génération d’idées → fichiers → workflow
* parsing → code-run → modules
* dashboard → bug tracker

Mais il manque une **mémoire persistante structurée** entre les étapes et entre les runs d’agents.

cursor-memory-bank fournit exactement cela :

* un ensemble de fichiers “mémoire projet”
* un système de phases
* un contexte partagé
* un modèle de “long term memory” adapté à Cursor

👉 **L’intégration parfaite :
Ton bundle devient le moteur agentique.
cursor-memory-bank devient la mémoire project-wide.**

---

# 🎯 2. Objectif de l’intégration

Ton bundle doit :

1. **Créer automatiquement** la structure `memory-bank/` lors du `generate`
2. **Maintenir les fichiers mémoire** lors du `build`, `complete`, `bug`, etc.
3. Fournir **une API interne** :

   * `loadMemory()`
   * `updateMemory()`
   * `appendHistory()`
4. Injecter automatiquement cette mémoire dans **les prompts des agents**
5. Ajouter une commande :

   ```
   prompt-cursor memory --sync
   ```

✨ Résultat :
Ton orchestrateur multi-agents devient **stateful, context-aware, et auto-améliorant**.

---

# 🧱 3. Arborescence à générer automatiquement

Ajoute ceci à chaque projet créé :

```
memory-bank/
├── projectbrief.md
├── productContext.md
├── techContext.md
├── tasks.md
├── progress.md
├── systemPatterns.md
├── activeContext.md
├── reflection/
│   └── history.md
├── creative/
│   └── design-decisions.md
└── archive/
    └── session-001.md
```

---

# ⚙️ 4. Code TypeScript pour intégrer la mémoire

## 4.1. API centrale : `memory.ts`

```ts
import fs from "fs";
import path from "path";

export class MemoryBank {
  constructor(private root: string) {}

  file(name: string) {
    return path.join(this.root, "memory-bank", name);
  }

  load(name: string): string {
    const file = this.file(name);
    return fs.existsSync(file) ? fs.readFileSync(file, "utf-8") : "";
  }

  write(name: string, content: string) {
    fs.writeFileSync(this.file(name), content, "utf-8");
  }

  append(name: string, block: string) {
    const file = this.file(name);
    fs.appendFileSync(file, `\n\n${block}`, "utf-8");
  }

  loadAll() {
    return {
      projectbrief: this.load("projectbrief.md"),
      productContext: this.load("productContext.md"),
      techContext: this.load("techContext.md"),
      tasks: this.load("tasks.md"),
      progress: this.load("progress.md"),
      patterns: this.load("systemPatterns.md"),
      active: this.load("activeContext.md"),
    };
  }
}
```

---

# 🔗 5. Intégration dans l’orchestrateur d’agents

Modifie ton orchestrateur :

```ts
const memory = new MemoryBank(context.root);

const mem = memory.loadAll();

const agentInput = {
  ...task,
  memory: mem,
  idea: context.idea,
  spec: context.spec,
  implementation: context.implementationPlan,
};
```

👉 Maintenant **chaque agent reçoit automatiquement toute la mémoire persistante**.

---

# 🧩 6. Mise à jour de la mémoire après chaque agent run

Après un agent :

```ts
memory.append(
  "activeContext.md",
  `### Update (${agent.id} - ${task.id})
${output.summary || "(no summary)"}
`
);

memory.write(
  "progress.md",
  context.generateProgressMarkdown() // ton code existe déjà
);
```

---

# 🧠 7. Intégration dans les prompts d’agents

Tu ajoutes dans TOUTES les prompts :

```txt
[LONG TERM MEMORY]
PROJECT BRIEF:
{{memory.projectbrief}}

TECH CONTEXT:
{{memory.techContext}}

ACTIVE CONTEXT:
{{memory.active}}

TASK HISTORY:
{{memory.tasks}}
```

👉 Tu viens d’ajouter un **système de mémoire longue durée** à tes agents.

---

# 🧰 8. Ajout d'une commande CLI : `prompt-cursor memory`

Dans `cli/commands/memory.ts` :

```ts
import { MemoryBank } from "../core/memory";

export const memory = {
  command: "memory",
  describe: "Synchronise et gère la mémoire persistante",
  builder: y => y.option("sync", { type: "boolean" }),
  handler: async argv => {
    const context = loadProjectContext();
    const mem = new MemoryBank(context.root);

    if (argv.sync) {
      console.log("Memory synced with project context.");
      mem.write("progress.md", context.generateProgressMarkdown());
      mem.append("reflection/history.md", context.generateHistoryEntry());
    }
  }
};
```

---

# 🎁 9. Standard minimal des fichiers mémoire à générer

### projectbrief.md

```
# Project Brief

Generated automatically by Prompt Cursor Bundle.

## Idea
{{idea}}

## Goals
(to be filled by Architect agent)
```

### progress.md

```
# Progress Overview

Generated and updated by Orchestrator.
```

### tasks.md

```
# Tasks Overview

Imported from implementation-plan.md
```

---

# 🚀 10. Intégration recommandée dans ton workflow existant

## Étape 1 — Au `generate`

* créer dossier `memory-bank/`
* générer les fichiers vierges ou semi-remplis
* copier idea.md → projectbrief.md

## Étape 2 — Au `build`

* parser implementation-plan → tasks.md
* générer progress.md
* mettre activeContext sur la step en cours

## Étape 3 — Au `complete`

* mettre la step comme terminée dans progress.md
* écrire un résumé dans history.md

## Étape 4 — Au `agents:run`

* injecter la mémoire dans le prompt de tous les agents

👉 **La mémoire devient le cœur de ton système agentique.**
