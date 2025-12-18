/**
 * agents:run command - Generate and display prompt for a step
 */

const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const Orchestrator = require('../orchestrator');

/**
 * Copy to clipboard (cross-platform)
 */
async function copyToClipboard(text) {
  try {
    const { exec } = require('child_process');
    const platform = process.platform;
    
    return new Promise((resolve, reject) => {
      let cmd;
      if (platform === 'darwin') {
        cmd = 'pbcopy';
      } else if (platform === 'win32') {
        cmd = 'clip';
      } else {
        cmd = 'xclip -selection clipboard';
      }

      const proc = exec(cmd, (error) => {
        if (error) reject(error);
        else resolve();
      });
      
      proc.stdin.write(text);
      proc.stdin.end();
    });
  } catch (error) {
    throw new Error('Clipboard not available');
  }
}

/**
 * Format agent with emoji
 */
function formatAgent(agent) {
  const icons = {
    'devops': '🔧',
    'frontend': '🎨',
    'backend': '⚙️',
    'database': '🗄️',
    'api': '🔌',
    'testing': '🧪',
    'architect': '🏗️',
    'qa': '🔍'
  };
  return `${icons[agent] || '🤖'} ${agent}`;
}

/**
 * Main run command
 */
async function agentsRun(options = {}) {
  const projectDir = options.output || process.cwd();
  const stepNumber = parseInt(options.step, 10);

  if (!stepNumber || isNaN(stepNumber)) {
    console.error(chalk.red('\n❌ Erreur: --step <number> est requis'));
    console.log(chalk.gray('Exemple: prompt-cursor agents:run --step 1\n'));
    process.exit(1);
  }

  try {
    const orchestrator = new Orchestrator(projectDir);
    orchestrator.load();

    const task = orchestrator.getTask(stepNumber);
    if (!task) {
      console.error(chalk.red(`\n❌ Step ${stepNumber} non trouvé`));
      process.exit(1);
    }

    // Read step file content
    const stepContent = orchestrator.readStepContent(stepNumber);

    // Check dependencies
    const unmetDeps = task.dependsOn.filter(dep => {
      const depTask = orchestrator.getTask(dep);
      return !depTask || depTask.status !== 'completed';
    });

    // Display header
    console.log();
    console.log(chalk.blue.bold('┌' + '─'.repeat(62) + '┐'));
    console.log(chalk.blue.bold('│') + chalk.white.bold(`  📋 Step ${stepNumber}: ${task.title}`.substring(0, 60).padEnd(61)) + chalk.blue.bold('│'));
    console.log(chalk.blue.bold('├' + '─'.repeat(62) + '┤'));
    console.log(chalk.blue.bold('│') + chalk.cyan(`  Agent:  ${formatAgent(task.agent)}`.padEnd(61)) + chalk.blue.bold('│'));
    console.log(chalk.blue.bold('│') + chalk.cyan(`  Module: ${task.module}`.padEnd(61)) + chalk.blue.bold('│'));
    
    if (task.dependsOn.length > 0) {
      const depsStr = task.dependsOn.join(', ');
      console.log(chalk.blue.bold('│') + chalk.cyan(`  Dépend: Step ${depsStr}`.padEnd(61)) + chalk.blue.bold('│'));
    }

    // Warning if dependencies not met
    if (unmetDeps.length > 0) {
      console.log(chalk.blue.bold('├' + '─'.repeat(62) + '┤'));
      console.log(chalk.blue.bold('│') + chalk.yellow(`  ⚠️  Dépendances non complétées: Step ${unmetDeps.join(', ')}`.padEnd(61)) + chalk.blue.bold('│'));
    }

    console.log(chalk.blue.bold('└' + '─'.repeat(62) + '┘'));
    console.log();

    // If --copy flag, copy to clipboard
    if (options.copy) {
      try {
        await copyToClipboard(stepContent);
        console.log(chalk.green('✅ Prompt copié dans le clipboard !'));
        console.log();
        console.log(chalk.gray('Collez ce prompt dans votre IDE (Cursor, Claude Code, Windsurf...)'));
        console.log(chalk.gray(`Puis exécutez: ${chalk.cyan(`prompt-cursor agents:complete --step ${stepNumber}`)}`));
        console.log();

        // Mark as prompted
        orchestrator.markAsPrompted(stepNumber);
      } catch (error) {
        console.log(chalk.yellow('⚠️  Impossible de copier dans le clipboard'));
        console.log(chalk.gray('Copiez manuellement le contenu ci-dessous:'));
        console.log();
        console.log(chalk.gray('─'.repeat(64)));
        console.log(stepContent);
        console.log(chalk.gray('─'.repeat(64)));
      }
    } else {
      // Display the prompt content
      console.log(chalk.gray('─'.repeat(64)));
      console.log(stepContent);
      console.log(chalk.gray('─'.repeat(64)));
      console.log();
      console.log(chalk.yellow('💡 Tip: Utilisez --copy pour copier directement dans le clipboard'));
      console.log(chalk.gray(`   prompt-cursor agents:run --step ${stepNumber} --copy`));
      console.log();
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Erreur:'), error.message);
    process.exit(1);
  }
}

module.exports = agentsRun;
