# 🚀 Prompt Cursor Bundle

> **Le bundle universel de structuration de projets pour assistants AI** ⚡
> 
> Transformez votre idée en projet structuré en 2 minutes avec Cursor, Claude, Windsurf ou Copilot !

[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)](https://github.com/abdel74100/prompt-cursor-bundle)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)
[![npm](https://img.shields.io/npm/v/@aakroh/prompt-cursor-bundle.svg)](https://www.npmjs.com/package/@aakroh/prompt-cursor-bundle)

---

## ✨ Qu'est-ce que Prompt Cursor Bundle ?

Un outil CLI universel qui :
- 🎯 **Génère UN prompt intelligent** qui crée TOUS vos fichiers projet
- 🤖 **Compatible multi-AI** : Cursor, Claude, Windsurf, GitHub Copilot
- 📊 **Parse automatiquement** vos plans pour créer un workflow de développement
- 🔍 **Track votre progression** avec un dashboard intelligent
- ⚙️ **Vérifie la compatibilité** des versions de packages (évite les erreurs)
- ✅ **Met à jour automatiquement** votre code-run.md quand vous complétez une étape

**Résultat :** De l'idée au projet structuré en **2 commandes** !

### 🤖 Assistants AI Supportés

| Assistant | Fichier de règles généré |
|-----------|--------------------------|
| 🎯 Cursor | `.cursorrules` |
| 🤖 Claude | `CLAUDE.md` |
| 🏄 Windsurf | `.windsurfrules` |
| 🐙 GitHub Copilot | `.github/copilot-instructions.md` |

---

## 🎬 Démo Rapide - En 3 Commandes

```bash
# 1. Générer le prompt intelligent (choisir votre AI assistant)
prompt-cursor generate -i idea.md -o ./mon-projet

# ? Which AI assistant will you use?
#   > 🎯 Cursor
#     🤖 Claude
#     🏄 Windsurf
#     🐙 GitHub Copilot

# 2. [Copier le prompt dans votre AI assistant]
#    Sauvegarder les 4 fichiers dans .prompt-cursor/docs/

# 3. Générer le workflow de développement
prompt-cursor build
# → Génère automatiquement le bon fichier de règles selon votre choix !

# 4. Suivre et marquer la progression
prompt-cursor complete

# C'est tout ! Projet prêt ! 🎉
```

---

## 📦 Installation

```bash
npm install -g @aakroh/prompt-cursor-bundle
```

---

## 🚦 Quick Start

```bash
# Créer idea.md
echo "Todo app avec React + TailwindCSS" > idea.md

# Générer (choisir votre AI assistant)
prompt-cursor generate -i idea.md -o ./projet

# [Copier prompt → Votre AI Assistant → Sauvegarder dans .prompt-cursor/docs/]

# Builder
cd ./projet && prompt-cursor build

# ✅ Suivre code-run.md
```

---

## 📖 Commandes

| Commande | Alias | Description |
|----------|-------|-------------|
| `prompt-cursor generate` | `pcb gen` | Génère prompt intelligent + versions compatibles |
| `prompt-cursor build` | `pcb build` | Parse et génère workflow |
| `prompt-cursor complete` | `pcb done` | Marque étape terminée |
| `prompt-cursor context` | `pcb ctx` | Affiche dashboard |
| `prompt-cursor clean` | - | Nettoie .prompt-cursor/ |

---

### Structure de Projet

```
mon-projet/
├── .prompt-cursor/               # 📦 Dossier dédié (caché)
│   ├── prompts/                  # Prompts générés
│   │   └── prompt-generate.md
│   ├── docs/                     # Documentation AI
│   │   ├── project-request.md
│   │   ├── ai-rules.md           # Règles génériques
│   │   ├── spec.md
│   │   └── implementation-plan.md
│   ├── workflow/                 # Workflow de développement
│   │   ├── code-run.md
│   │   └── Instructions/
│   └── .prompt-cursor-context.json
├── .cursorrules                  # Cursor
├── CLAUDE.md                     # ou Claude
├── .windsurfrules                # ou Windsurf
├── .github/copilot-instructions.md  # ou Copilot
└── src/                          # Votre code source
```

> **Note:** Un seul fichier de règles est généré selon l'assistant AI choisi.

---

## ⚙️ Versions Compatibles Automatiques

Évite les erreurs de compatibilité (TailwindCSS v4, PostCSS, etc.) grâce à la détection automatique du stack et injection des versions testées.

---

## 🤝 Contribution

Les contributions sont les bienvenues !

1. Fork le projet
2. Créez votre branche (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

---

## 📚 Documentation

- 📖 **[GUIDE.md](./GUIDE.md)** - Guide complet avec schémas et exemples
- 📖 **[example-idea.md](./example-idea.md)** - Exemple de fichier idée

---

## 🐛 Troubleshooting

### Problème : "Command not found"
```bash
npm link  # Dans le dossier du CLI
```

### Problème : "No response files found"
Assurez-vous d'avoir sauvegardé les fichiers générés par Cursor avant de lancer `build`.

### Problème : "0 steps in plan"
Vérifiez que votre `implementation-plan.md` suit le format attendu avec `- [ ] Step X:`.

---

---

## 📄 License

MIT © [Your Name]

---

<p align="center">
  Fait avec ❤️ pour les développeurs qui veulent aller vite
</p>

<p align="center">
  <a href="https://github.com/abdel74100/prompt-cursor-bundle">⭐ Star ce projet sur GitHub</a>
</p>