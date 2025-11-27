const chalk = require('chalk');
const path = require('path');
const { loadContext, getWorkflowStatus, clearContext, getContextFileName } = require('../utils/contextTrackerV2');
const { detectProvider, getDirs, DEFAULT_PROVIDER } = require('../utils/directoryManager');
const { getProvider, getPromptDirectory } = require('../utils/aiProviders');

/**
 * Context command - Show and manage CLI context
 */
async function contextCommand(options) {
  const workingDir = options.path || process.cwd();
  
  // Auto-detect provider
  const detectedProvider = await detectProvider(workingDir) || DEFAULT_PROVIDER;
  
  // Handle clear option
  if (options.clear) {
    clearContext(workingDir, detectedProvider);
    console.log(chalk.green('✅ Context cleared successfully'));
    return;
  }
  
  // Load and display context
  const context = await loadContext(workingDir, detectedProvider);
  const status = getWorkflowStatus(context);
  const aiProviderKey = context.aiProvider || detectedProvider;
  const provider = getProvider(aiProviderKey);
  const promptDir = getPromptDirectory(aiProviderKey);
  const dirs = getDirs(aiProviderKey);
  
  console.log(chalk.blue.bold('\n📊 CLI Context & Project Status\n'));
  console.log(chalk.gray('━'.repeat(50)));
  
  // Basic Info
  console.log(chalk.cyan('\n📋 Project Information:'));
  console.log(chalk.white(`  Name: ${context.projectName || chalk.gray('Not set')}`));
  console.log(chalk.white(`  Directory: ${workingDir}`));
  console.log(chalk.white(`  AI Provider: ${provider.icon} ${provider.name}`));
  console.log(chalk.white(`  Prompt Directory: ${promptDir}/`));
  console.log(chalk.white(`  Created: ${context.createdAt ? new Date(context.createdAt).toLocaleDateString() : 'Unknown'}`));
  console.log(chalk.white(`  Last Activity: ${status.lastActivity ? new Date(status.lastActivity).toLocaleString() : 'Never'}`));
  
  // Workflow Status
  console.log(chalk.cyan('\n🔄 Workflow Status:'));
  console.log(chalk.white(`  Type: ${chalk.bold(status.workflow === 'generate' ? '⭐ Generate (Recommended)' : status.workflow === 'legacy' ? '📝 Legacy (Step-by-step)' : '❓ Not determined')}`));
  console.log(chalk.white(`  Current Phase: ${chalk.yellow(status.phase)}`));
  
  // Progress Indicators
  console.log(chalk.cyan('\n📈 Progress:'));
  console.log(chalk.white(`  1. Prompt Generation: ${status.progress.prompt}`));
  console.log(chalk.white(`  2. AI Files: ${status.progress.cursor}`));
  console.log(chalk.white(`  3. Build Process: ${status.progress.build}`));
  console.log(chalk.white(`  4. Development: ${status.progress.development}`));
  
  // File Status
  console.log(chalk.cyan('\n📁 File Status:'));
  const fileStatus = {
    'idea.md': context.projectState.hasIdea ? '✅' : '❌',
    [`${promptDir}/prompts/prompt-generate.md`]: context.projectState.hasPromptGenerate ? '✅' : '❌',
    [`${promptDir}/docs/project-request.md`]: context.projectState.hasProjectRequest ? '✅' : '❌',
    [`${promptDir}/docs/ai-rules.md`]: context.projectState.hasAiRules ? '✅' : '❌',
    [`${promptDir}/docs/spec.md`]: context.projectState.hasSpec ? '✅' : '❌',
    [`${promptDir}/docs/implementation-plan.md`]: context.projectState.hasImplementationPlan ? '✅' : '❌',
    [`${promptDir}/workflow/code-run.md`]: context.projectState.hasCodeRun ? '✅' : '❌',
    [`${promptDir}/workflow/Instructions/`]: context.projectState.hasInstructions ? '✅' : '❌',
    [provider.rulesFile]: context.projectState.hasAiRules ? '✅' : '❌'
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
    console.log(chalk.yellow(`  3. Use ${promptDir}/prompts/prompt-generate.md in ${provider.name}`));
    console.log(chalk.yellow(`  4. Save the 4 files in ${promptDir}/docs/`));
  }
  if (context.projectState.cursorPhaseComplete && !context.projectState.buildPhaseComplete) {
    console.log(chalk.yellow('  5. Run: prompt-cursor build'));
  }
  if (context.projectState.buildPhaseComplete) {
    console.log(chalk.green(`  ✅ Ready for development! Follow ${promptDir}/workflow/code-run.md`));
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
  const contextFileName = getContextFileName(aiProviderKey);
  console.log(chalk.gray(`\nContext file: ${path.join(workingDir, promptDir, contextFileName)}`));
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
