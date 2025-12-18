# Prompt Cursor Bundle

> Transform your idea into a structured project in 2 commands.

[![npm](https://img.shields.io/npm/v/@abdel-akh/prompt-cursor-bundle.svg)](https://www.npmjs.com/package/@abdel-akh/prompt-cursor-bundle)
[![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-green.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

A universal CLI that generates intelligent prompts for AI assistants (Cursor, Claude, Windsurf, GitHub Copilot) and creates a structured development workflow.

## Installation

```bash
npm install -g @abdel-akh/prompt-cursor-bundle
```

## Quick Start

```bash
# 1. Create your idea file
echo "Todo app with React + TypeScript + TailwindCSS" > idea.md

# 2. Generate the prompt
prompt-cursor generate -i idea.md -o ./my-project

# 3. Copy prompt to your AI assistant, save the 4 generated files

# 4. Build the workflow
cd ./my-project && prompt-cursor build

# 5. Start developing with agents
prompt-cursor agents:next --copy
```

## Supported AI Assistants

| Assistant | Rules File |
|-----------|------------|
| Cursor | `.cursorrules` + `.cursor/rules/*.mdc` |
| Claude | `CLAUDE.md` |
| Windsurf | `.windsurfrules` |
| GitHub Copilot | `.github/copilot-instructions.md` |

## Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `generate -i <file>` | `gen` | Generate intelligent prompt |
| `build` | - | Parse plan and generate workflow |
| `agents:status` | `status` | Show task progression |
| `agents:next` | `next` | Get next available task |
| `agents:run -s <N>` | `run` | Generate prompt for step N |
| `agents:complete -s <N>` | `done` | Mark step N as completed |

### Options

```bash
# Generate with complex mode (multi-module, dependencies)
prompt-cursor generate -i idea.md -o ./project --complex

# Specify AI provider
prompt-cursor generate -i idea.md -p cursor

# Copy prompt to clipboard
prompt-cursor agents:next --copy
```

## Project Modes

### Simple Mode (default)
Linear step-by-step workflow. Best for small projects.

### Complex Mode (`--complex`)
- **Multi-module**: frontend, backend, api, database, infra, mobile, auth, testing
- **Non-linear dependencies**: Step 5 can depend on Steps 2 AND 3
- **Parallelism**: Identifies steps that can run simultaneously
- **Specialized agents**: Each module has dedicated rules

## Generated Structure

```
my-project/
├── .ai/
│   ├── prompts/
│   │   └── prompt-generate.md    # Initial prompt to copy
│   ├── docs/                      # AI-generated docs
│   │   ├── project-request.md
│   │   ├── ai-rules.md
│   │   ├── spec.md
│   │   └── implementation-plan.md
│   ├── steps/                     # Step files (step-1.md, step-2.md...)
│   ├── rules/                     # Agent rules by module
│   ├── workflow.md                # Overview
│   └── tasks.json                 # Machine-readable task map
├── .cursorrules                   # AI rules (varies by provider)
└── src/                           # Your code
```

## Workflow

```
idea.md
    │
    ▼  prompt-cursor generate
prompt-generate.md
    │
    ▼  Copy to AI assistant
4 docs (project-request, ai-rules, spec, implementation-plan)
    │
    ▼  prompt-cursor build
workflow.md + steps/ + tasks.json
    │
    ▼  prompt-cursor agents:next
Development loop (next → run → complete → repeat)
```

## Documentation

See [GUIDE.md](./GUIDE.md) for detailed usage and examples.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Command not found | Run `npm link` in CLI folder |
| No response files found | Save AI-generated files in `.ai/docs/` |
| 0 steps in plan | Check `implementation-plan.md` format |

## License

MIT © Abderrahim Akh
