/**
 * agents:next command - Display and optionally copy the next available step
 */

const chalk = require('chalk');
const Orchestrator = require('../orchestrator');
const agentsRun = require('./agents-run');

/**
 * Main next command
 */
async function agentsNext(options = {}) {
  const projectDir = options.output || process.cwd();

  try {
    const orchestrator = new Orchestrator(projectDir);
    orchestrator.load();

    const nextTask = orchestrator.getNextTask();

    if (!nextTask) {
      const progress = orchestrator.getProgress();
      
      if (progress.completed === progress.total) {
        console.log();
        console.log(chalk.green.bold('🎉 Félicitations ! Toutes les tâches sont terminées !'));
        console.log(chalk.gray(`   ${progress.total} steps complétés avec succès.`));
        console.log();
      } else {
        console.log();
        console.log(chalk.yellow('⚠️  Aucune tâche disponible pour le moment.'));
        console.log(chalk.gray('   Vérifiez les dépendances avec: prompt-cursor agents:status'));
        console.log();
      }
      return;
    }

    // Delegate to agents:run with the next step
    await agentsRun({
      ...options,
      step: nextTask.step.toString()
    });

  } catch (error) {
    console.error(chalk.red('\n❌ Erreur:'), error.message);
    process.exit(1);
  }
}

module.exports = agentsNext;
