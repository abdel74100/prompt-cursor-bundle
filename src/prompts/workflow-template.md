# {{PROJECT_NAME}} - Workflow

> **Mode IDE-first** : Copiez les prompts dans votre IDE (Cursor, Claude Code, Windsurf)

---

## 📊 Progression

- **Total:** {{TOTAL_STEPS}} étapes
- **Terminées:** {{COMPLETED_STEPS}}
- **En cours:** {{CURRENT_STEP}}
- **Progression:** {{PROGRESS_PERCENTAGE}}%

```
{{PROGRESS_BAR}}
```

---

## 🗂️ Modules

{{MODULES_SUMMARY}}

---

## 📋 Étapes

| # | Titre | Module | Agent | Status |
|---|-------|--------|-------|--------|
{{STEPS_TABLE}}

---

## 🔄 Workflow

```bash
# Voir la progression
prompt-cursor agents:status

# Obtenir le prochain prompt à exécuter
prompt-cursor agents:next --copy

# Marquer une étape comme terminée
prompt-cursor agents:complete --step N
```

### Cycle de travail

1. `agents:next` → Affiche le prochain prompt
2. Copiez le prompt dans votre IDE
3. L'IDE génère le code via son LLM
4. Validez et testez le code
5. `agents:complete --step N` → Marque comme fait
6. Répétez

---

## 📁 Structure

```
.prompt-cursor/
├── workflow.md          ← Ce fichier (vue d'ensemble)
├── steps/
│   ├── step-1.md        ← Instructions + prompt agent
│   ├── step-2.md
│   └── ...
└── docs/
    ├── spec.md
    └── implementation-plan.md

.prompt-agents/
└── tasks-map.json       ← État des tâches (status, timestamps)

.prompt-rules/
├── frontend-rules.md
├── backend-rules.md
└── ...
```

---

## 🔗 Dépendances

{{DEPENDENCY_GRAPH}}

---

*Généré le {{GENERATED_AT}}*
