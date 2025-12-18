/**
 * agents:status command - Display task progression
 */

const chalk = require('chalk');
const Orchestrator = require('../orchestrator');

/**
 * Generate progress bar
 */
function progressBar(percentage, width = 30) {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  return bar;
}

/**
 * Format status with color
 */
function formatStatus(status) {
  switch (status) {
    case 'completed':
      return chalk.green('✅ completed');
    case 'ready':
      return chalk.cyan('🔄 ready');
    case 'prompted':
      return chalk.yellow('📋 prompted');
    case 'pending':
      return chalk.gray('⏳ pending');
    default:
      return chalk.gray(status);
  }
}

/**
 * Format agent name with emoji
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
    'generic': '🤖'
  };
  return `${icons[agent] || '🤖'} ${agent}`;
}

/**
 * Main status command
 */
async function agentsStatus(options = {}) {
  const projectDir = options.output || process.cwd();
  
  try {
    const orchestrator = new Orchestrator(projectDir);
    orchestrator.load();

    const progress = orchestrator.getProgress();
    const byModule = orchestrator.getProgressByModule();
    const byAgent = orchestrator.getProgressByAgent();

    // Header
    console.log();
    console.log(chalk.blue.bold('┌' + '─'.repeat(62) + '┐'));
    console.log(chalk.blue.bold('│') + chalk.white.bold(`  📊 Progression: ${progress.completed}/${progress.total} steps (${progress.percentage}%)`.padEnd(61)) + chalk.blue.bold('│'));
    console.log(chalk.blue.bold('│') + `  ${progressBar(progress.percentage)}`.padEnd(70) + chalk.blue.bold('│'));
    console.log(chalk.blue.bold('├' + '─'.repeat(62) + '┤'));

    // Stats
    console.log(chalk.blue.bold('│') + chalk.green(`  ✅ Completed: ${progress.completed}`.padEnd(61)) + chalk.blue.bold('│'));
    console.log(chalk.blue.bold('│') + chalk.cyan(`  🔄 Ready:     ${progress.ready}  (peuvent être lancées maintenant)`.padEnd(61)) + chalk.blue.bold('│'));
    if (progress.prompted > 0) {
      console.log(chalk.blue.bold('│') + chalk.yellow(`  📋 Prompted:  ${progress.prompted}  (en attente de complétion)`.padEnd(61)) + chalk.blue.bold('│'));
    }
    console.log(chalk.blue.bold('│') + chalk.gray(`  ⏳ Pending:   ${progress.pending} (attendent des dépendances)`.padEnd(61)) + chalk.blue.bold('│'));

    // Ready tasks
    if (progress.readyTasks.length > 0) {
      console.log(chalk.blue.bold('├' + '─'.repeat(62) + '┤'));
      console.log(chalk.blue.bold('│') + chalk.white.bold('  🚀 Prochaines tâches disponibles:'.padEnd(61)) + chalk.blue.bold('│'));
      console.log(chalk.blue.bold('│') + ' '.repeat(61) + chalk.blue.bold('│'));

      const tasksToShow = options.all ? progress.readyTasks : progress.readyTasks.slice(0, 5);
      
      tasksToShow.forEach(task => {
        const line = `  Step ${String(task.step).padStart(2)} │ ${task.agent.padEnd(10)} │ ${task.title.substring(0, 35)}`;
        console.log(chalk.blue.bold('│') + chalk.white(line.padEnd(61)) + chalk.blue.bold('│'));
      });

      if (!options.all && progress.readyTasks.length > 5) {
        console.log(chalk.blue.bold('│') + chalk.gray(`  ... et ${progress.readyTasks.length - 5} autres (--all pour tout voir)`.padEnd(61)) + chalk.blue.bold('│'));
      }
    }

    // Progress by module (if --modules flag)
    if (options.modules) {
      console.log(chalk.blue.bold('├' + '─'.repeat(62) + '┤'));
      console.log(chalk.blue.bold('│') + chalk.white.bold('  📦 Progression par module:'.padEnd(61)) + chalk.blue.bold('│'));
      
      Object.entries(byModule).forEach(([mod, stats]) => {
        const pct = Math.round((stats.completed / stats.total) * 100);
        const line = `  ${mod.padEnd(12)} ${stats.completed}/${stats.total} (${pct}%)`;
        console.log(chalk.blue.bold('│') + chalk.white(line.padEnd(61)) + chalk.blue.bold('│'));
      });
    }

    // Progress by agent (if --agents flag)
    if (options.agents) {
      console.log(chalk.blue.bold('├' + '─'.repeat(62) + '┤'));
      console.log(chalk.blue.bold('│') + chalk.white.bold('  🤖 Progression par agent:'.padEnd(61)) + chalk.blue.bold('│'));
      
      Object.entries(byAgent).forEach(([agent, stats]) => {
        const pct = Math.round((stats.completed / stats.total) * 100);
        const line = `  ${formatAgent(agent).padEnd(14)} ${stats.completed}/${stats.total} (${pct}%)`;
        console.log(chalk.blue.bold('│') + chalk.white(line.padEnd(61)) + chalk.blue.bold('│'));
      });
    }

    // Footer with hint
    console.log(chalk.blue.bold('├' + '─'.repeat(62) + '┤'));
    console.log(chalk.blue.bold('│') + chalk.yellow('  💡 Utiliser: prompt-cursor agents:next --copy'.padEnd(61)) + chalk.blue.bold('│'));
    console.log(chalk.blue.bold('└' + '─'.repeat(62) + '┘'));
    console.log();

  } catch (error) {
    console.error(chalk.red('\n❌ Erreur:'), error.message);
    console.log(chalk.gray('\nAssurez-vous d\'avoir exécuté `prompt-cursor build` d\'abord.\n'));
    process.exit(1);
  }
}

module.exports = agentsStatus;
