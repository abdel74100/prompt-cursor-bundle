# Orchestration multi-agents (vue synthétique)

Ce pipeline décrit le flux complet en mode complex : génération du prompt, production des docs, build du workflow et génération des artefacts agents.

```mermaid
flowchart TD
  idea[idea.md] --> gen[generate --complex]
  gen --> docs[.prompt-{provider}/docs/<4 fichiers>]
  docs --> build[prompt-cursor build --complex]
  build --> codeRun[workflow/code-run.md]
  build --> instructions[workflow/Instructions/stepX.md]
  build --> modules[modules/*]
  build --> deps[workflow/dependency-graph.md]
  build --> agentsConfig[.prompt-config/agents.json]
  build --> agentsRules[.prompt-rules/*-rules.md]
  build --> agentsTemplates[.prompt-agents/templates/*.md]
  build --> agentsRun[.prompt-agents/run/*-stepX.md]
  build --> tasksMap[.prompt-agents/tasks-map.json]
  tasksMap --> execution[Agents (run prompts)]
```

Étapes clés :
- `generate --complex` : crée le prompt-generate.md et la structure `.prompt-{provider}/`.
- Sauvegarder `project-request.md`, `ai-rules.md`, `spec.md`, `implementation-plan.md` dans `.prompt-{provider}/docs/`.
- `build --complex` : génère `code-run.md`, `Instructions/`, `modules/`, `dependency-graph.md` et tous les artefacts agents (rules, templates, run prompts, tasks-map).

