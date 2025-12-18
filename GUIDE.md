# Guide

Complete guide for Prompt Cursor Bundle.

## Overview

Prompt Cursor Bundle transforms your project idea into a structured development workflow by:

1. Generating an intelligent prompt for your AI assistant
2. Parsing the AI-generated plan into actionable steps
3. Providing a task management system with specialized agents

## Workflow Diagram

```
┌──────────────────────────────────────────────────────────────┐
│  idea.md                                                      │
│  "Todo app with React + TypeScript"                          │
└─────────────────────────┬────────────────────────────────────┘
                          │ prompt-cursor generate
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  .ai/prompts/prompt-generate.md                              │
│  Intelligent prompt with compatibility checks                │
└─────────────────────────┬────────────────────────────────────┘
                          │ Copy to AI assistant
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  AI generates 4 files in .ai/docs/                           │
│  • project-request.md  (what to build)                       │
│  • ai-rules.md         (coding standards)                    │
│  • spec.md             (architecture)                        │
│  • implementation-plan.md (roadmap)                          │
└─────────────────────────┬────────────────────────────────────┘
                          │ prompt-cursor build
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  Workflow generated                                          │
│  • .ai/workflow.md     (overview)                            │
│  • .ai/steps/          (step-1.md, step-2.md...)            │
│  • .ai/tasks.json      (machine-readable)                    │
│  • .ai/rules/          (agent rules)                         │
└─────────────────────────┬────────────────────────────────────┘
                          │ prompt-cursor agents:next
                          ▼
┌──────────────────────────────────────────────────────────────┐
│  Development loop                                            │
│  next → run → complete → repeat                              │
└──────────────────────────────────────────────────────────────┘
```

## Step-by-Step Usage

### 1. Create Your Idea

Create a markdown file describing your project:

```markdown
# Weather App

Features:
- Search by city
- 5-day forecast
- Weather animations
- Dark mode

Stack: React + Vite + TailwindCSS + OpenWeather API
```

### 2. Generate the Prompt

```bash
prompt-cursor generate -i idea.md -o ./weather-app
```

This creates `.ai/prompts/prompt-generate.md` containing:
- Your idea
- Compatible package versions
- Instructions for the AI

### 3. Use Your AI Assistant

1. Open `.ai/prompts/prompt-generate.md`
2. Copy content between `🚀 START` and `🏁 END`
3. Paste into your AI assistant (Cursor, Claude, etc.)
4. Save the 4 generated files in `.ai/docs/`

### 4. Build the Workflow

```bash
cd ./weather-app
prompt-cursor build
```

Output:
```
📖 Parsing implementation plan...
✓ Found 12 steps in plan
✓ Complexity: complex (non-linear dependencies)

🎨 Generating workflow...
✓ workflow.md created
✓ 12 step files created
✓ tasks.json created

🤖 Generating agent rules...
✓ Agent rules generated
  Modules: frontend, backend, infra
```

### 5. Development Loop

```bash
# Check status
prompt-cursor agents:status

# Get next task
prompt-cursor agents:next --copy

# Mark as complete
prompt-cursor agents:complete -s 1
```

## Agent Commands

### `agents:status`

Shows overall progress and ready tasks:

```
📊 Project Status: Weather App
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Progress: ██████░░░░░░░░░░ 35% (4/12)

Ready tasks:
  → Step 5: API Integration (backend)
  → Step 6: Weather Display (frontend)

Blocked:
  ⏳ Step 7: Animations (depends on 5, 6)
```

### `agents:next`

Displays the next available task with full prompt:

```bash
prompt-cursor agents:next --copy  # Copy to clipboard
```

Output:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Step 5: API Integration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Agent: backend
Module: api
Dependencies: Step 3, Step 4

📋 Tasks:
- [ ] Create API service
- [ ] Add error handling
- [ ] Write tests

📎 Files: .ai/steps/step-5.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### `agents:run -s <N>`

Generate prompt for a specific step:

```bash
prompt-cursor agents:run -s 5 --copy
```

### `agents:complete -s <N>`

Mark a step as completed and update dependencies:

```bash
prompt-cursor agents:complete -s 5
```

## Complex Mode

For larger projects with multiple modules:

```bash
prompt-cursor generate -i idea.md -o ./project --complex
```

### Available Modules

| Module | Agent | Description |
|--------|-------|-------------|
| frontend | frontend | UI, components, pages |
| backend | backend | Services, controllers |
| api | backend | REST/GraphQL endpoints |
| database | database | Schema, migrations |
| infra | devops | CI/CD, Docker, cloud |
| auth | backend | Authentication, JWT |
| testing | qa | Unit, e2e tests |
| mobile | mobile | React Native, Flutter |

### Dependency Management

Steps can have non-linear dependencies:

```markdown
Step 5: API Integration
- **Depends on**: Step 2, Step 3
- **Module**: backend
```

The CLI automatically:
- Tracks which steps are blocked
- Identifies parallel-ready tasks
- Updates status when dependencies complete

## File Reference

### Generated Files

| File | Purpose |
|------|---------|
| `.ai/prompts/prompt-generate.md` | Initial prompt for AI |
| `.ai/docs/project-request.md` | Business requirements |
| `.ai/docs/ai-rules.md` | Coding standards |
| `.ai/docs/spec.md` | Technical architecture |
| `.ai/docs/implementation-plan.md` | Development roadmap |
| `.ai/workflow.md` | Visual progress overview |
| `.ai/steps/step-N.md` | Detailed task files |
| `.ai/tasks.json` | Machine-readable task map |
| `.ai/rules/*.md` | Agent-specific rules |

### Rule Files by Provider

| Provider | Main Rules | Scoped Rules |
|----------|------------|--------------|
| Cursor | `.cursorrules` | `.cursor/rules/*.mdc` |
| Claude | `CLAUDE.md` | - |
| Windsurf | `.windsurfrules` | - |
| Copilot | `.github/copilot-instructions.md` | - |

## Tips

### Writing Good Ideas

**Bad:**
```
A todo app
```

**Good:**
```markdown
# Todo App

Features:
- CRUD tasks with priorities
- Filter by status, search
- Tags and categories
- Cloud sync with offline support

Stack: React + TypeScript + Supabase
UI: TailwindCSS + Framer Motion
```

### Effective Prompts

When using step instructions with your AI:

```
Following the rules in .cursorrules and the tasks in .ai/steps/step-1.md,
implement the project setup. Start with task 1.
```

### Development Cycle

```
1. prompt-cursor agents:next    # See what to do
2. Copy prompt to AI            # Get implementation
3. Review and apply code        # Validate changes
4. prompt-cursor agents:complete # Mark done
5. Repeat
```

## Troubleshooting

### Common Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| "No response files" | Files not saved | Save AI output in `.ai/docs/` |
| "0 steps in plan" | Wrong format | Use `### Step X:` or `- [ ] Step X:` |
| Steps not detected | Parsing failed | Check implementation-plan.md format |
| Wrong module assigned | Auto-detection | Add `- **Module**: frontend` to step |

### Supported Plan Formats

The parser recognizes these formats:

```markdown
### Step 1: Setup Project
### Étape 1: Configuration
#### Step 1: Initialize
- [ ] Step 1: Create structure
```

### Debug Mode

```bash
DEBUG=1 prompt-cursor build
```
