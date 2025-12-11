# # 📘 **Interactive Generate Mode – Specification**

## 🎯 Objectif
La commande `pcb generate` doit être entièrement interactive.
Elle doit permettre de générer un projet basé sur :

* un mode **Simple**
* un mode **Complex** (avec agents obligatoires)

La sélection du mode définit le workflow de génération ainsi que les fichiers créés automatiquement.

---

# # 🧭 1. Flow Utilisateur – Mode Interactif

Lors de l'exécution :

```bash
pcb generate
```

Commandes essentielles :

* Simple : `prompt-cursor generate --simple -i idea.md -o . --name "Projet" --provider cursor`
* Complex : `prompt-cursor generate --complex -i idea.md -o . --name "Projet" --provider cursor`
* Build simple : `prompt-cursor build`
* Build complex : `prompt-cursor build --complex`

Le CLI affiche :

```
🚀 Prompt Cursor Bundle - Mode Interactif

Quel type de projet souhaitez-vous générer ?

1) Simple
2) Complex (avec agents)

Votre choix : 
```

L'utilisateur entre :

* `1` → simple
* `2` → complex (agents activés automatiquement)

Le CLI génère le prompt. Ensuite :
- tu colles le prompt dans ton assistant AI,
- tu sauvegardes les 4 fichiers IA dans `.prompt-{provider}/docs/`,
- puis tu lances `prompt-cursor build` (simple) ou `prompt-cursor build --complex` (complex + agents).

---

# # 🏗️ 2. Détails des modes
## 🎉 **Mode 1 : Simple Project**
📌 Commande :

```
pcb generate  → choix : 1
```

### ✔️ Ce qui est généré :

* lecture de `idea.md`
* génération de `.prompt-{provider}/prompts/prompt-generate.md`
* l’utilisateur copie-colle ce prompt dans son assistant AI
* l’IA génère :

  * `project-request.md`
  * `ai-rules.md`
  * `spec.md`
  * `implementation-plan.md`

### ❌ **Pas de :**

* agents
* rules par agent
* mapping des tâches
* workflow intelligent (`code-run.md`, `Instructions/`)

Mode idéal pour projets simples.

---

## 🚀 **Mode 2 : Complex Project (avec agents par défaut)**
📌 Commande :

```
pcb generate  → choix : 2
```

⚠️ **IMPORTANT**
Dans ce mode, les agents sont activés automatiquement.
Impossible de faire un “complex sans agents”.

---

### ✔️ Ce qui est généré :
#### 1️⃣ Génération standard (simple)

* prompt-generate.md
* project-request.md
* ai-rules.md
* spec.md
* implementation-plan.md

#### 2️⃣ Parsing du plan → workflow intelligent
Le CLI génère :

* `.prompt-{provider}/workflow/code-run.md`
* `.prompt-{provider}/workflow/Instructions/stepX.md`

#### 3️⃣ Mise en place du système d’agents
Génération automatique de :

```
.prompt-config/agents.json
.prompt-rules/*-rules.md
.prompt-agents/run/
.prompt-agents/templates/
.prompt-agents/tasks-map.json
```

#### 4️⃣ Mapping automatique des tâches vers agents
Grâce à l’analyse du contenu d’`implementation-plan.md` et `Instructions/*`.

#### 5️⃣ Build
- `prompt-cursor build --complex` génère code-run, Instructions, modules, dependency-graph et les artefacts agents.

---

# # 🤖 3. Pourquoi Complex = Agents Obligatoires ?
Voici la logique validée :

### ✔️ 1. Complex Project demande architecture, workflow, parsing
→ nécessite coordination
→ nécessite agents

### ✔️ 2. Complex Project implique plusieurs modules (frontend, backend, realtime, db...)
→ chaque module doit être pris en charge par un agent spécialisé

### ✔️ 3. Complex Project = système multi-fichiers
→ gestion manuelle trop lourde
→ agents nécessaires pour automatiser le développement via AI assistants

### Donc :

> **Si l’utilisateur choisit Complex, il obtient d’office les agents.**

Aucun choix supplémentaire n’est demandé.

---

# # 🧩 4. Flow technique du CLI
Pseudo-code du mode interactif :

```
pcb generate:

  afficher menu interactif:
    1) Simple
    2) Complex (avec agents)

  si choix == 1:
      run generateSimple()
  
  si choix == 2:
      run generateComplex()
      run generateAgents()
      run mapTasksToAgents()
```

### Fonctions attendues
#### ✔️ `generateSimple()`

* créer dossier
* copier prompt template
* insérer contenu de idea.md
* aucun agent

#### ✔️ `generateComplex()`

* tout ce que simple génère
* * parsing implementation-plan
* * workflow complet

#### ✔️ `generateAgents()`

* créer agents.json
* créer rules par agent
* créer templates de prompts agents

#### ✔️ `mapTasksToAgents()`

* lire instructions/
* détecter keywords
* créer tasks-map.json

---

# # 📁 5. Structure générée en Mode Complex
```
my-project/
├── idea.md
├── .prompt-cursor/
│   ├── prompts/
│   ├── docs/
│   ├── workflow/
│   │   ├── code-run.md
│   │   └── Instructions/
│   └── agents/
│       ├── agents.json
│       ├── tasks-map.json
│       ├── templates/
│       └── run/
└── .prompt-rules/
    ├── backend-rules.md
    ├── frontend-rules.md
    ├── devops-rules.md
    └── architecture-rules.md
```

---

# # 🔥 6. Exemple de Prompt Agent auto-généré
Fichier : `.prompt-agents/run/backend-step1.md`

```
🚀 START

Tu es l’agent : BACKEND

🎯 Mission :
Implémenter les tâches définies dans :
workflow/Instructions/backend-step1.md

📘 Règles Backend :
(contient .prompt-rules/backend-rules.md)

📐 Architecture globale :
(contient spec.md)

🧩 Tâches à réaliser :
(contenu du fichier d’instructions)

🧱 Contraintes :
- respecter les conventions backend
- ne jamais modifier la structure existante
- retourner uniquement du code valide

🏁 END
```

