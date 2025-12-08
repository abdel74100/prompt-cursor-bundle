Ce document décrit :

la vision globale

l’architecture agents

le fonctionnement des rules par module

les 3 modes de génération (simple / complexe / complexe + agents)

les spécifications CLI à implémenter

les fichiers et conventions

les prompts modèles

Tout est pensé pour être opérationnel dans ton bundle prompt-cursor-bundle.

# 📘 AI Agent System – Spécification Technique pour Prompt Cursor Bundle
✨ Objectif

Étendre @abdel-akh/prompt-cursor-bundle afin de :

Créer et orchestrer des agents IA spécialisés (backend, frontend, db, devops, architecture, realtime, etc.)

Associer automatiquement chaque tâche / module à son agent correspondant

Utiliser des fichiers de règles (rules.md) propres par agent

Générer un projet selon plusieurs modes :

Simple Project → pas d’agents

Complex Project → docs + workflow

Complex Project with Agents → docs + workflow + mapping agents + prompts préconfigurés

# 🏗️ 1. Architecture Agents IA
🔧 1.1. Structure des agents

Chaque agent est défini par un fichier de configuration central :

.prompt-config/
└── agents.json


Exemple :

{
  "agents": [
    {
      "id": "backend",
      "name": "Backend Agent",
      "rules": ".prompt-rules/backend-rules.md",
      "description": "Implémente les API, DB, WebSocket, business logic."
    },
    {
      "id": "frontend-passenger",
      "name": "Frontend Passenger Agent",
      "rules": ".prompt-rules/frontend-passenger-rules.md",
      "description": "Développe les interfaces Passenger côté Next.js"
    },
    {
      "id": "frontend-driver",
      "name": "Frontend Driver Agent",
      "rules": ".prompt-rules/frontend-driver-rules.md",
      "description": "Développe les interfaces Driver et UI mobile responsive."
    },
    {
      "id": "devops",
      "name": "DevOps Agent",
      "rules": ".prompt-rules/devops-rules.md",
      "description": "Génère Docker, CI/CD, pipelines, infrastructure AWS."
    }
  ]
}

# 📚 2. Rules Files – Règles par Agent
📁 Structure recommandée
.prompt-rules/
├── backend-rules.md
├── frontend-passenger-rules.md
├── frontend-driver-rules.md
├── devops-rules.md
└── architecture-rules.md


Chaque fichier contient tout le savoir technique, par exemple pour Backend :

# Backend Technical Rules

## Stack
- Fastify + TypeScript
- Prisma ORM
- PostgreSQL
- Zod Schemas
- WebSocket via Socket.io
- Redis GEO + Pub/Sub

## Conventions
- Endpoint naming
- File structure
- Repositories vs services
- Error handling
- Validation rules

## Models
- User
- Driver
- Passenger
- Ride
- PaymentIntent


L’utilisateur peut enrichir ces rules, et tous les agents backend les utiliseront automatiquement.

# 🧩 3. Modes de génération (nouvelle fonctionnalité)
🎯 Mode 1 — Simple Project

Commande :

pcb generate simple -i idea.md -o ./my-app


Résultat :

prompt-generate.md

les 4 fichiers générés par IA (project-request, ai-rules, spec, plan)

aucune notion d’agents

🚀 Mode 2 — Complex Project (workflow complet)
pcb generate complex -i idea.md -o ./my-app


Résultat :

✔️ Tout ce que génère le mode simple
+
✔️ build automatique → code-run.md + Instructions/**
✔️ Parsing intelligent du plan

Toujours sans agents.

🤖 Mode 3 — Complex Project with Agents
pcb generate agents -i idea.md -o ./my-app


Résultat :

✔️ Tout du mode complexe
✔️ agents.json auto-généré
✔️ rules files pré-remplis pour chaque agent
✔️ mapping automatique tâches ↔ agents
✔️ prompts agents générés automatiquement

# ⚙️ 4. Mapping automatique tâche → agent

Ton CLI doit analyser :

implementation-plan.md

Instructions/**/*

Pour détecter les mots-clés :

Agent	Keywords
backend	API, Fastify, Prisma, DB, model, schema
frontend-passenger	UI passenger, map, booking, ride request
frontend-driver	driver dashboard, status, tracking
devops	Docker, CI/CD, AWS, deploy
realtime	websocket, redis, pub/sub, streaming

Et générer :

.prompt-workflow/tasks-map.json


Exemple :

{
  "instructions/backend/step1.md": "backend",
  "instructions/frontend-passenger/step3.md": "frontend-passenger",
  "instructions/devops/step2.md": "devops"
}

# 🤖 5. Nouvelle commande CLI : pcb agent
5.1. Exécuter une tâche
pcb agent backend --task instructions/backend/step1.md


Résultat :

Génère un fichier :

.prompt-agents/run/backend-step1.md


Contenant un prompt exploitable :

📥 Modèle Prompt Agent
🚀 START

Tu es l’agent : BACKEND

🎯 Mission :
Implémenter les tâches du fichier :
instructions/backend/step1.md

📘 Règles Backend :
(contenu backend-rules.md)

📐 Architecture générale :
(contenu spec.md)

📄 Tâches à implémenter :
(contenu du fichier de l'étape)

🧱 Contraintes :
- Respecter strictement les règles Backend
- Utiliser la stack définie
- Retourner exclusivement le code et les fichiers modifiés

🏁 END

5.2. Exécuter une étape complète
pcb agent run step=2


Le CLI :

Trouve toutes les instructions liées à l’étape 2

Regroupe par agent

Génère un prompt par agent dans .prompt-agents/run/

# 🔄 6. Nouvelle commande CLI : pcb assign

Assigne automatiquement toutes les tâches aux agents :

pcb assign


Résultat :

génère un fichier .prompt-agents/assignments.md

écrit clairement :

Étape 1
- backend → instructions/backend/step1.md
- frontend-passenger → instructions/frontend-passenger/step1.md

Étape 2
- backend → step2.md
- devops → step2.md

# 🚀 7. Nouvelle commande CLI : pcb run

Exécution pipeline AI (manuel assisté)

pcb run backend step=1


Le CLI génère et ouvre le prompt correspondant.
Tu peux ensuite copier-coller dans ton assistant IA.

# 🧱 8. Structure complète d’un projet avec agents
my-project/
├── idea.md
├── .prompt-cursor/
│   ├── prompts/prompt-generate.md
│   ├── docs/
│   │   ├── project-request.md
│   │   ├── ai-rules.md
│   │   ├── spec.md
│   │   └── implementation-plan.md
│   ├── workflow/
│   │   ├── code-run.md
│   │   └── Instructions/
│   └── agents/
│       ├── agents.json
│       ├── tasks-map.json
│       ├── run/
│       └── templates/
└── .prompt-rules/
    ├── backend-rules.md
    ├── frontend-passenger-rules.md
    ├── frontend-driver-rules.md
    ├── devops-rules.md
    └── architecture-rules.md

# 🎁 9. Templates fournis par défaut (auto-générés)
9.1. Template backend-rules.md
# Backend Rules – Default Template

## Base Stack
- Fastify
- Prisma ORM
- PostgreSQL
- Zod
- JWT Auth

## File Structure
src/
 ├─ modules/
 ├─ routes/
 ├─ schemas/
 ├─ services/

## Principles
- Pas de logique dans les routes
- Validation systématique
- Services testables

9.2. Template agent prompt

Idem que plus haut.

# 📌 10. Suggestion d’évolution future
✔️ Agents auto-exécutables (mode autonome complet)
✔️ Génération automatique de tests (unité + e2e)
✔️ Lien avec ta roadmap GitHub (issues auto)
✔️ Support multi-LLM (OpenAI, Claude, Groq, DeepSeek)
