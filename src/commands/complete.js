const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { getContext, updateContext } = require('../utils/contextTrackerV2');

// Dynamic import for inquirer (ESM module in version 9+)
let inquirer;
async function getInquirer() {
  if (!inquirer) {
    inquirer = await import('inquirer');
  }
  return inquirer.default;
}

/**
 * Mark a step as completed and update code-run.md
 */
async function completeCommand(options = {}) {
  console.log(chalk.blue('✅ Complete Step - Update Progress\n'));

  try {
    // Get context
    const context = await getContext();
    
    if (!context.projectName) {
      console.log(chalk.yellow('⚠ No project found. Run "prompt-cursor generate" first.'));
      return;
    }

    const outputDir = context.outputDir || process.cwd();
    const codeRunPath = path.join(outputDir, '.prompt-cursor', 'workflow', 'code-run.md');

    // Check if code-run.md exists
    try {
      await fs.access(codeRunPath);
    } catch {
      console.log(chalk.yellow('⚠ code-run.md not found. Run "prompt-cursor build" first.'));
      return;
    }

    // Read code-run.md
    let codeRunContent = await fs.readFile(codeRunPath, 'utf-8');
    
    // Extract all steps
    const stepRegex = /###\s+(✅|⏳|🟡)\s+ÉTAPE\s+(\d+)\s+:\s+([^\n]+)/g;
    const steps = [];
    let match;
    
    while ((match = stepRegex.exec(codeRunContent)) !== null) {
      steps.push({
        number: parseInt(match[2]),
        title: match[3].trim(),
        status: match[1],
        fullMatch: match[0]
      });
    }

    if (steps.length === 0) {
      console.log(chalk.yellow('⚠ No steps found in code-run.md'));
      return;
    }

    // Ask which step to complete
    let stepNumber = options.step;
    
    if (!stepNumber) {
      const choices = steps.map(s => ({
        name: `${s.status} Étape ${s.number}: ${s.title}`,
        value: s.number,
        disabled: s.status === '✅' ? 'Déjà complétée' : false
      }));

      const inquirerInstance = await getInquirer();
      const answer = await inquirerInstance.prompt([
        {
          type: 'list',
          name: 'stepNumber',
          message: 'Quelle étape avez-vous terminée ?',
          choices: choices
        }
      ]);
      
      stepNumber = answer.stepNumber;
    }

    const selectedStep = steps.find(s => s.number === parseInt(stepNumber));
    
    if (!selectedStep) {
      console.log(chalk.red(`✗ Étape ${stepNumber} introuvable`));
      return;
    }

    if (selectedStep.status === '✅') {
      console.log(chalk.yellow(`⚠ L'étape ${stepNumber} est déjà marquée comme complétée`));
      return;
    }

    // Update the step status
    const oldStatus = selectedStep.fullMatch;
    const newStatus = oldStatus
      .replace(/###\s+(⏳|🟡)/, '### ✅')
      .replace(/\*\*Status:\*\*\s+(🟡 En cours|⚪ En attente)/, '**Status:** ✅ Terminée');

    codeRunContent = codeRunContent.replace(oldStatus, newStatus);

    // Update the status line in the step details
    const statusLineRegex = new RegExp(
      `(###\\s+✅\\s+ÉTAPE\\s+${stepNumber}[^]*?\\*\\*Status:\\*\\*)\\s+(🟡 En cours|⚪ En attente)`,
      'g'
    );
    codeRunContent = codeRunContent.replace(statusLineRegex, `$1 ✅ Terminée`);

    // Mark next step as "En cours" (🟡)
    const nextStep = steps.find(s => s.number === selectedStep.number + 1);
    if (nextStep && nextStep.status === '⏳') {
      const nextOldStatus = nextStep.fullMatch;
      const nextNewStatus = nextOldStatus.replace(/###\s+⏳/, '### 🟡');
      codeRunContent = codeRunContent.replace(nextOldStatus, nextNewStatus);
      
      // Update next step's status line
      const nextStatusLineRegex = new RegExp(
        `(###\\s+🟡\\s+ÉTAPE\\s+${nextStep.number}[^]*?\\*\\*Status:\\*\\*)\\s+⚪ En attente`,
        'g'
      );
      codeRunContent = codeRunContent.replace(nextStatusLineRegex, `$1 🟡 En cours`);
    }

    // Save updated code-run.md
    await fs.writeFile(codeRunPath, codeRunContent, 'utf-8');

    // Update context
    const updatedContext = await getContext();
    updatedContext.development = updatedContext.development || {};
    updatedContext.development.lastCompletedStep = stepNumber;
    updatedContext.development.currentStep = nextStep ? nextStep.number : stepNumber;
    updatedContext.lastUpdated = new Date().toISOString();
    await updateContext(updatedContext);

    console.log(chalk.green(`✓ Étape ${stepNumber} marquée comme terminée !`));
    
    if (nextStep) {
      console.log(chalk.blue(`→ Étape ${nextStep.number} est maintenant en cours`));
    } else {
      console.log(chalk.green('🎉 Toutes les étapes sont terminées !'));
    }
    
    console.log(chalk.gray(`\nMis à jour: ${codeRunPath}`));

  } catch (error) {
    console.error(chalk.red('✗ Erreur lors de la mise à jour:'), error.message);
    throw error;
  }
}

module.exports = completeCommand;
