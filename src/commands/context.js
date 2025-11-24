const chalk = require('chalk');
const path = require('path');
const { loadContext, getWorkflowStatus, clearContext, CONTEXT_FILE_NAME } = require('../utils/contextTrackerV2');

/**
 * Context command - Show and manage CLI context
 */
async function contextCommand(options) {
  const workingDir = options.path || process.cwd();
  
  // Handle clear option
  if (options.clear) {
    clearContext(workingDir);
    console.log(chalk.green('✅ Context cleared successfully'));
    return;
  }
  
  // Load and display context
  const context = loadContext(workingDir);
  const status = getWorkflowStatus(context);
  
  console.log(chalk.blue.bold('\n📊 CLI Context & Project Status\n'));
  console.log(chalk.gray('━'.repeat(50)));
  
  // Basic Info
  console.log(chalk.cyan('\n📋 Project Information:'));
  console.log(chalk.white(`  Name: ${context.projectName || chalk.gray('Not set')}`));
  console.log(chalk.white(`  Directory: ${workingDir}`));
  console.log(chalk.white(`  Created: ${context.createdAt ? new Date(context.createdAt).toLocaleDateString() : 'Unknown'}`));
  console.log(chalk.white(`  Last Activity: ${status.lastActivity ? new Date(status.lastActivity).toLocaleString() : 'Never'}`));
  
  // Workflow Status
  console.log(chalk.cyan('\n🔄 Workflow Status:'));
  console.log(chalk.white(`  Type: ${chalk.bold(status.workflow === 'generate' ? '⭐ Generate (Recommended)' : status.workflow === 'legacy' ? '📝 Legacy (Step-by-step)' : '❓ Not determined')}`));
  console.log(chalk.white(`  Current Phase: ${chalk.yellow(status.phase)}`));
  
  // Progress Indicators
  console.log(chalk.cyan('\n📈 Progress:'));
  console.log(chalk.white(`  1. Prompt Generation: ${status.progress.prompt}`));
  console.log(chalk.white(`  2. Cursor AI Files: ${status.progress.cursor}`));
  console.log(chalk.white(`  3. Build Process: ${status.progress.build}`));
  console.log(chalk.white(`  4. Development: ${status.progress.development}`));
  
  // File Status
  console.log(chalk.cyan('\n📁 File Status:'));
  const fileStatus = {
    'idea.md': context.projectState.hasIdea ? '✅' : '❌',
    'prompt-generate.md': context.projectState.hasPromptGenerate ? '✅' : '❌',
    'project-request.md': context.projectState.hasProjectRequest ? '✅' : '❌',
    '.cursorrules': context.projectState.hasCursorRules ? '✅' : '❌',
    'spec.md': context.projectState.hasSpec ? '✅' : '❌',
    'implementation-plan.md': context.projectState.hasImplementationPlan ? '✅' : '❌',
    'code-run.md': context.projectState.hasCodeRun ? '✅' : '❌',
    'Instructions/': context.projectState.hasInstructions ? '✅' : '❌'
  };
  
  Object.entries(fileStatus).forEach(([file, status]) => {
    console.log(chalk.white(`  ${status} ${file}`));
  });
  
  // Statistics
  console.log(chalk.cyan('\n📊 Statistics:'));
  console.log(chalk.white(`  Total Commands Run: ${context.statistics.totalCommands}`));
  console.log(chalk.white(`  Files Generated: ${status.files.total}`));
  console.log(chalk.white(`    - By CLI: ${status.files.byCategory.generated}`));
  console.log(chalk.white(`    - By Build: ${status.files.byCategory.build}`));
  console.log(chalk.white(`  Estimated Time: ${context.statistics.estimatedTimeSpent} minutes`));
  
  // Development Progress (if available)
  if (context.development.totalSteps) {
    console.log(chalk.cyan('\n🚀 Development Progress:'));
    console.log(chalk.white(`  Total Steps: ${context.development.totalSteps}`));
    console.log(chalk.white(`  Completed: ${context.development.completedSteps.length}`));
    console.log(chalk.white(`  Current Step: ${context.development.currentStep || 'None'}`));
    console.log(chalk.white(`  Progress: ${createProgressBar(context.development.progress)}`));
  }
  
  // Next Steps Suggestions
  console.log(chalk.cyan('\n💡 Next Steps:'));
  if (!context.projectState.hasIdea) {
    console.log(chalk.yellow('  1. Create an idea.md file with your project concept'));
  }
  if (!context.projectState.hasPromptGenerate) {
    console.log(chalk.yellow('  2. Run: prompt-cursor generate -i idea.md'));
  }
  if (context.projectState.hasPromptGenerate && !context.projectState.cursorPhaseComplete) {
    console.log(chalk.yellow('  3. Use prompt-generate.md in Cursor AI'));
    console.log(chalk.yellow('  4. Save the 4 files Cursor generates'));
  }
  if (context.projectState.cursorPhaseComplete && !context.projectState.buildPhaseComplete) {
    console.log(chalk.yellow('  5. Run: prompt-cursor build'));
  }
  if (context.projectState.buildPhaseComplete) {
    console.log(chalk.green('  ✅ Ready for development! Follow code-run.md'));
  }
  
  // Command History (recent)
  if (options.verbose && context.statistics.commandHistory.length > 0) {
    console.log(chalk.cyan('\n📜 Recent Commands:'));
    context.statistics.commandHistory.slice(-5).forEach(cmd => {
      const time = new Date(cmd.timestamp).toLocaleTimeString();
      console.log(chalk.gray(`  [${time}] ${cmd.command}`));
        });
      }
  
  // Notes (if any)
  if (options.verbose && context.notes && context.notes.length > 0) {
    console.log(chalk.cyan('\n📝 Notes:'));
    context.notes.slice(-3).forEach(note => {
      console.log(chalk.gray(`  • ${note.content}`));
    });
  }
  
  console.log(chalk.gray('\n━'.repeat(50)));
  console.log(chalk.gray(`\nContext file: ${path.join(workingDir, CONTEXT_FILE_NAME)}`));
  console.log(chalk.gray('Use --verbose for more details, --clear to reset\n'));
}

/**
 * Create a visual progress bar
 */
function createProgressBar(percentage) {
  const width = 20;
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `${bar} ${percentage}%`;
}

module.exports = contextCommand;