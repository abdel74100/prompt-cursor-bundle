# 🤖 Agent Prompt Template

This template is used to generate prompts for specific agents.

---

## Prompt Structure

```
🚀 START

Tu es l'agent : {{AGENT_ICON}} {{AGENT_NAME}}

🎯 Mission :
Implémenter les tâches du fichier :
{{TASK_PATH}}

📘 Règles {{AGENT_NAME}} :
{{RULES_CONTENT}}

📐 Architecture générale :
{{SPEC_CONTENT}}

📄 Tâches à implémenter :
{{TASK_CONTENT}}

🧱 Contraintes :
- Respecter strictement les règles {{AGENT_NAME}}
- Utiliser la stack définie
- Retourner exclusivement le code et les fichiers modifiés
- Commenter en anglais
- Code propre et maintenable

🏁 END
```

---

## Variables

| Variable | Description |
|----------|-------------|
| `{{AGENT_ICON}}` | Agent emoji icon |
| `{{AGENT_NAME}}` | Agent display name |
| `{{TASK_PATH}}` | Path to the task file |
| `{{RULES_CONTENT}}` | Content of the agent's rules file |
| `{{SPEC_CONTENT}}` | Project specification content |
| `{{TASK_CONTENT}}` | Content of the task/instruction file |

---

## Usage

This template is automatically used by:
- `pcb agent <agent-id> --task <path>`
- `pcb agent run step=<n>`
- `pcb run <agent> step=<n>`
