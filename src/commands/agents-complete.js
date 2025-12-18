/**
 * agents:complete command - Mark a step as completed
 */

const chalk = require('chalk');
const Orchestrator = require('../orchestrator');
const fs = require('fs');
const path = require('path');

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
 * Main complete command
 */
async function agentsComplete(options = {}) {
  const projectDir = options.output || process.cwd();
  const stepNumber = parseInt(options.step, 10);

  if (!stepNumber || isNaN(stepNumber)) {
    console.error(chalk.red('\n❌ Erreur: --step <number> est requis'));
    console.log(chalk.gray('Exemple: prompt-cursor agents:complete --step 1\n'));
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

    // Check if already completed
    if (task.status === 'completed') {
      console.log();
      console.log(chalk.yellow(`⚠️  Step ${stepNumber} est déjà marqué comme complété`));
      console.log(chalk.gray(`   Complété le: ${task.completedAt}`));
      console.log();
      return;
    }

    // Mark as completed
    orchestrator.markAsCompleted(stepNumber);

    // Get updated progress
    const progress = orchestrator.getProgress();

    console.log();
    console.log(chalk.green.bold('✅ Step complété !'));
    console.log();
    console.log(chalk.blue.bold('┌' + '─'.repeat(62) + '┐'));
    console.log(chalk.blue.bold('│') + chalk.white(`  Step ${stepNumber}: ${task.title}`.substring(0, 60).padEnd(61)) + chalk.blue.bold('│'));
    console.log(chalk.blue.bold('│') + chalk.cyan(`  Agent: ${formatAgent(task.agent)} | Module: ${task.module}`.padEnd(61)) + chalk.blue.bold('│'));
    console.log(chalk.blue.bold('├' + '─'.repeat(62) + '┤'));
    console.log(chalk.blue.bold('│') + chalk.green(`  📊 Progression: ${progress.completed}/${progress.total} (${progress.percentage}%)`.padEnd(61)) + chalk.blue.bold('│'));
    
    // Show newly ready tasks
    if (progress.readyTasks.length > 0) {
      console.log(chalk.blue.bold('├' + '─'.repeat(62) + '┤'));
      console.log(chalk.blue.bold('│') + chalk.cyan('  🔓 Nouvelles tâches disponibles:'.padEnd(61)) + chalk.blue.bold('│'));
      
      progress.readyTasks.slice(0, 3).forEach(readyTask => {
        const line = `     Step ${String(readyTask.step).padStart(2)} │ ${readyTask.agent.padEnd(10)} │ ${readyTask.title.substring(0, 30)}`;
        console.log(chalk.blue.bold('│') + chalk.white(line.padEnd(61)) + chalk.blue.bold('│'));
      });

      if (progress.readyTasks.length > 3) {
        console.log(chalk.blue.bold('│') + chalk.gray(`     ... et ${progress.readyTasks.length - 3} autres`.padEnd(61)) + chalk.blue.bold('│'));
      }
    }

    console.log(chalk.blue.bold('├' + '─'.repeat(62) + '┤'));
    
    if (progress.readyTasks.length > 0) {
      console.log(chalk.blue.bold('│') + chalk.yellow('  💡 Prochaine: prompt-cursor agents:next --copy'.padEnd(61)) + chalk.blue.bold('│'));
    } else if (progress.completed === progress.total) {
      console.log(chalk.blue.bold('│') + chalk.green.bold('  🎉 Toutes les tâches sont terminées !'.padEnd(61)) + chalk.blue.bold('│'));
    } else {
      console.log(chalk.blue.bold('│') + chalk.gray('  ⏳ En attente de dépendances...'.padEnd(61)) + chalk.blue.bold('│'));
    }
    
    console.log(chalk.blue.bold('└' + '─'.repeat(62) + '┘'));
    console.log();

    const e2eFile = task.e2e?.file;
    const e2eCommand = task.e2e?.command;
    const e2eExists = e2eFile
      ? fs.existsSync(path.join(projectDir, e2eFile))
      : false;

    if (e2eFile && e2eCommand && e2eExists) {
      console.log(chalk.cyan('🧪 Test E2E:') + chalk.white(` ${e2eFile}`));
      console.log(chalk.cyan('▶ Commande:') + chalk.white(` ${e2eCommand}`));

      if (task.e2e?.type === 'ui') {
        if (task.e2e.baseUrlEnv) {
          console.log(chalk.cyan('🌐 Base URL:') + chalk.white(` ${task.e2e.baseUrlEnv}`));
        }
        if (task.e2e.route) {
          console.log(chalk.cyan('➡️ Route:') + chalk.white(` ${task.e2e.route}`));
        }
      }
      console.log();
    } else {
      console.log(chalk.gray('🧪 Test E2E: aucun (non UI)'));
      console.log();
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Erreur:'), error.message);
    process.exit(1);
  }
}

module.exports = agentsComplete;
