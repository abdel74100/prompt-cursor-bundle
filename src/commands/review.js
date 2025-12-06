const chalk = require('chalk');
const path = require('path');
const fs = require('fs').promises;
const { detectProvider, getDirs, DEFAULT_PROVIDER } = require('../utils/directoryManager');

const REQUIRED_SECTIONS = [
  { label: 'Contexte', pattern: /##\s+📋\s+Contexte/i },
  { label: 'TODO', pattern: /##\s+✅\s+TODO\s+Liste/i },
  { label: 'Fichiers', pattern: /##\s+📁\s+Fichiers\s+cibles/i },
  { label: 'Commandes', pattern: /##\s+💻\s+Commandes\s+à\s+exécuter/i },
  { label: 'Tests', pattern: /##\s+🧪\s+Tests\s+requis/i },
  { label: 'Validation', pattern: /##\s+🔍\s+Critères\s+de\s+validation/i },
];

const TODO_PLACEHOLDERS = [
  /à\s*définir/i,
  /\bTBD\b/i,
  /\bTODOs?\b/i,
  /voir\s+détails/i,
  /placeholder/i,
];

const CONTENT_PLACEHOLDERS = [
  /à\s*définir/i,
  /\bTBD\b/i,
  /voir\s+détails/i,
  /placeholder/i,
  /implémenter\s+les\s+fonctionnalités\s+de\s+cette\s+étape/i,
];

function analyzeInstruction(content) {
  const issues = [];
  const trimmed = content.trim();

  if (trimmed.length < 400) {
    issues.push('Instruction trop courte (<400 caractères)');
  }

  REQUIRED_SECTIONS.forEach((section) => {
    if (!section.pattern.test(content)) {
      issues.push(`Section "${section.label}" manquante`);
    }
  });

  const todoSectionMatch = content.match(/##\s+✅\s+TODO\s+Liste([\s\S]*?)(?=##\s+|$)/i);
  const todos = todoSectionMatch ? (todoSectionMatch[1].match(/- \[ \] [^\n]+/g) || []) : [];
  if (todos.length < 3) {
    issues.push('Moins de 3 TODOs actionnables');
  }
  if (todos.some((line) => TODO_PLACEHOLDERS.some((regex) => regex.test(line)))) {
    issues.push('TODOs contiennent des placeholders (TODO/À définir)');
  }

  const commandBlock = content.match(/```bash([\s\S]*?)```/i);
  if (!commandBlock) {
    issues.push('Commandes manquantes ou sans bloc bash');
  } else {
    const commands = commandBlock[1]
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
    if (commands.length === 0) {
      issues.push('Bloc commandes vide');
    }
  }

  const testsSectionMatch = content.match(/##\s+🧪\s+Tests\s+requis([\s\S]*?)(?=##\s+|$)/i);
  if (testsSectionMatch) {
    const testLines = testsSectionMatch[1].match(/\d+\.\s+\*\*/g);
    if (!testLines || testLines.length === 0) {
      issues.push('Tests requis listés sans scénarios numérotés');
    }
  } else {
    issues.push('Section tests introuvable');
  }

  const validationMatch = content.match(/##\s+🔍\s+Critères\s+de\s+validation([\s\S]*?)(?=##\s+|$)/i);
  if (validationMatch) {
    const checklist = validationMatch[1].match(/- \[ \] [^\n]+/g);
    if (!checklist || checklist.length < 3) {
      issues.push('Critères de validation insuffisants (<3)');
    }
  }

  if (CONTENT_PLACEHOLDERS.some((regex) => regex.test(content))) {
    issues.push('Texte contient encore des placeholders génériques');
  }

  return issues;
}

async function reviewCommand(options) {
  console.log(chalk.blue.bold('\n🕵️ Review - Contrôle qualité des instructions\n'));

  try {
    const outputDir = path.resolve(options.output || process.cwd());
    const provider = (await detectProvider(outputDir)) || DEFAULT_PROVIDER;
    const dirs = getDirs(provider);
    const instructionsDir = path.join(outputDir, dirs.INSTRUCTIONS);

    let files;
    try {
      files = await fs.readdir(instructionsDir);
    } catch (error) {
      console.log(chalk.red(`❌ Impossible de lire ${instructionsDir}`));
      console.log(chalk.gray('Générez d\'abord les instructions avec `prompt-cursor build`.'));
      process.exit(1);
    }

    const instructionFiles = files
      .filter((file) => file.startsWith('instructions-step') && file.endsWith('.md'))
      .sort();

    if (instructionFiles.length === 0) {
      console.log(chalk.red('❌ Aucun fichier d’instructions trouvé.'));
      process.exit(1);
    }

    let hasErrors = false;

    for (const file of instructionFiles) {
      const filePath = path.join(instructionsDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const issues = analyzeInstruction(content);

      if (issues.length === 0) {
        console.log(chalk.green(`✓ ${file}`));
      } else {
        hasErrors = true;
        console.log(chalk.red(`✗ ${file}`));
        issues.forEach((issue) => console.log(chalk.red(`   - ${issue}`)));
      }
    }

    if (hasErrors) {
      console.log(chalk.red.bold('\n❌ Review échouée : corrigez les instructions signalées.'));
      process.exit(1);
    }

    console.log(chalk.green.bold('\n✅ Review réussie : toutes les instructions sont complètes.'));
  } catch (error) {
    console.error(chalk.red.bold('\n❌ Error:'));
    console.error(chalk.red(error.message));
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

module.exports = reviewCommand;
