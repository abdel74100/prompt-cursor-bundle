const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const { loadContext, getWorkflowStatus, clearContext, getContextFileName, getBugJournalSummary } = require('../utils/contextTrackerV2');
const { detectProvider, getDirs, DEFAULT_PROVIDER } = require('../utils/directoryManager');
const { getProvider, getPromptDirectory } = require('../utils/aiProviders');
const DependencyGraph = require('../utils/dependencyGraph');
const MilestoneManager = require('../utils/milestoneManager');
const ModuleManager = require('../utils/moduleManager');

/**
 * Context command - Show and manage CLI context
 * Enhanced with dashboard mode for complex projects
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
  
  // Check if complex mode
  const isComplexMode = context.complexMode || false;
  const modules = context.modules || [];
  
  // Enhanced dashboard mode
  if (options.dashboard || isComplexMode) {
    await displayEnhancedDashboard(context, workingDir, aiProviderKey, options);
    return;
  }
  
  // Standard context display
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
  console.log(chalk.gray('Use --verbose for more details, --clear to reset'));
  console.log(chalk.gray('Use --dashboard for enhanced view (complex projects)\n'));
}

/**
 * Display enhanced dashboard for complex projects
 */
async function displayEnhancedDashboard(context, workingDir, aiProviderKey, options) {
  const provider = getProvider(aiProviderKey);
  const promptDir = getPromptDirectory(aiProviderKey);
  const dirs = getDirs(aiProviderKey);
  
  console.log('');
  console.log(chalk.blue.bold('┌─────────────────────────────────────────────────────────────────┐'));
  console.log(chalk.blue.bold(`│  📊 PROJECT DASHBOARD - ${(context.projectName || 'My Project').padEnd(36)} │`));
  console.log(chalk.blue.bold('├─────────────────────────────────────────────────────────────────┤'));
  
  // Project info
  console.log(chalk.white(`│  ${provider.icon} Provider: ${provider.name.padEnd(20)} Mode: ${context.complexMode ? '📦 Complex' : '📋 Simple'}       │`));
  console.log(chalk.blue.bold('├─────────────────────────────────────────────────────────────────┤'));
  
  // Try to load steps from code-run.md
  let steps = [];
  let completedSteps = context.development.completedSteps || [];
  
  const codeRunPath = path.join(workingDir, dirs.WORKFLOW, 'code-run.md');
  if (fs.existsSync(codeRunPath)) {
    const content = fs.readFileSync(codeRunPath, 'utf-8');
    steps = parseStepsFromCodeRun(content);
    completedSteps = steps.filter(s => s.status === 'completed').map(s => s.number);
  }
  
  // Milestones section
  if (context.complexMode || steps.length > 5) {
    console.log(chalk.cyan.bold('│  🏁 MILESTONES                                                  │'));
    console.log(chalk.gray('│  ' + '─'.repeat(61) + '  │'));
    
    // Create milestone manager
    const milestoneManager = new MilestoneManager(steps);
    milestoneManager.createMilestones();
    milestoneManager.updateProgress(completedSteps);
    
    for (const milestone of milestoneManager.milestones) {
      const bar = createProgressBar(milestone.progress, 15);
      const statusIcon = milestone.status === 'completed' ? '✅' : 
                        milestone.status === 'in_progress' ? '🟡' : '⏳';
      const name = `${milestone.icon} ${milestone.name}`.padEnd(20);
      const stats = `[${milestone.completedSteps.length}/${milestone.steps.length}]`.padStart(6);
      
      console.log(chalk.white(`│  ${statusIcon} ${name} ${bar} ${milestone.progress.toString().padStart(3)}% ${stats}   │`));
    }
    
    console.log(chalk.blue.bold('├─────────────────────────────────────────────────────────────────┤'));
  }
  
  // Modules section (if complex mode with modules)
  const modules = context.modules || [];
  if (modules.length > 0) {
    console.log(chalk.cyan.bold('│  📦 MODULES                                                     │'));
    console.log(chalk.gray('│  ' + '─'.repeat(61) + '  │'));
    
    const moduleManager = new ModuleManager(workingDir, aiProviderKey);
    moduleManager.initializeModules(modules);
    moduleManager.assignStepsToModules(steps);
    moduleManager.updateProgress(completedSteps);
    
    for (const [key, module] of moduleManager.modules) {
      const bar = createProgressBar(module.progress, 15);
      const statusIcon = module.status === 'completed' ? '✅' : 
                        module.status === 'in_progress' ? '🟡' : '⏳';
      const name = `${module.icon} ${module.name}`.padEnd(20);
      const stats = `[${module.completedSteps.length}/${module.steps.length}]`.padStart(6);
      
      console.log(chalk.white(`│  ${statusIcon} ${name} ${bar} ${module.progress.toString().padStart(3)}% ${stats}   │`));
    }
    
    console.log(chalk.blue.bold('├─────────────────────────────────────────────────────────────────┤'));
  }
  
  // Overall progress
  const totalSteps = steps.length || context.development.totalSteps || 0;
  const completedCount = completedSteps.length;
  const overallProgress = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  
  console.log(chalk.cyan.bold('│  📊 OVERALL PROGRESS                                            │'));
  console.log(chalk.gray('│  ' + '─'.repeat(61) + '  │'));
  
  const overallBar = createProgressBar(overallProgress, 35);
  console.log(chalk.white(`│  ${overallBar} ${overallProgress.toString().padStart(3)}%            │`));
  console.log(chalk.white(`│  Steps: ${completedCount}/${totalSteps} completed                                        │`));
  
  // Estimated time
  const hoursRemaining = (totalSteps - completedCount) * 2; // 2h per step estimate
  const hoursCompleted = completedCount * 2;
  console.log(chalk.gray(`│  ⏱️  Time: ~${hoursCompleted}h done, ~${hoursRemaining}h remaining                            │`));
  
  console.log(chalk.blue.bold('├─────────────────────────────────────────────────────────────────┤'));
  
  // Bug tracking section
  const bugSummary = getBugJournalSummary(workingDir, aiProviderKey);
  if (bugSummary.totalBugs > 0) {
    console.log(chalk.cyan.bold('│  🐛 BUG TRACKING                                                │'));
    console.log(chalk.gray('│  ' + '─'.repeat(61) + '  │'));
    
    const bugBar = createProgressBar(
      bugSummary.totalBugs > 0 ? (bugSummary.resolved / bugSummary.totalBugs) * 100 : 0, 
      15
    );
    console.log(chalk.white(`│  Bugs: ${bugSummary.unresolved} open, ${bugSummary.resolved} resolved  ${bugBar}       │`));
    
    // Show recent unresolved bugs
    const unresolvedBugs = bugSummary.recentBugs.filter(b => !b.resolved);
    if (unresolvedBugs.length > 0) {
      unresolvedBugs.slice(0, 2).forEach(bug => {
        const title = bug.title.length > 40 ? bug.title.substring(0, 37) + '...' : bug.title;
        console.log(chalk.red(`│  ❌ ${title.padEnd(52)} │`));
      });
    }
    
    console.log(chalk.blue.bold('├─────────────────────────────────────────────────────────────────┤'));
  }
  
  // Next actions
  console.log(chalk.cyan.bold('│  💡 NEXT ACTIONS                                                │'));
  console.log(chalk.gray('│  ' + '─'.repeat(61) + '  │'));
  
  // Find next available steps
  if (steps.length > 0) {
    const depGraph = new DependencyGraph(steps);
    depGraph.build();
    const availableSteps = depGraph.getAvailableSteps(completedSteps);
    
    if (availableSteps.length > 0) {
      const nextSteps = availableSteps.slice(0, 3);
      nextSteps.forEach((step, i) => {
        const prefix = i === 0 ? '→' : ' ';
        const name = step.name.length > 45 ? step.name.substring(0, 42) + '...' : step.name;
        console.log(chalk.white(`│  ${prefix} Step ${step.number}: ${name.padEnd(48)}│`));
      });
      
      if (availableSteps.length > 1) {
        console.log(chalk.gray(`│    (${availableSteps.length - 1} more steps can run in parallel)                      │`));
      }
    } else if (completedCount === totalSteps) {
      console.log(chalk.green(`│  🎉 All steps completed! Project is done!                       │`));
    }
  } else {
    console.log(chalk.yellow(`│  Run 'prompt-cursor build' to generate steps                    │`));
  }
  
  console.log(chalk.blue.bold('└─────────────────────────────────────────────────────────────────┘'));
  
  // Commands hint
  console.log('');
  console.log(chalk.gray('Commands:'));
  console.log(chalk.gray('  prompt-cursor complete     Mark step as done'));
  console.log(chalk.gray('  prompt-cursor context -v   Verbose view'));
  console.log(chalk.gray('  prompt-cursor context -c   Clear context'));
  console.log('');
}

/**
 * Parse steps from code-run.md content
 */
function parseStepsFromCodeRun(content) {
  const steps = [];
  
  // Match step headers
  const stepRegex = /###\s+(✅|⏳|🟡)\s+ÉTAPE\s+(\d+)\s+:\s+([^\n]+)/g;
  let match;
  
  while ((match = stepRegex.exec(content)) !== null) {
    const statusIcon = match[1];
    const number = parseInt(match[2]);
    const name = match[3].trim();
    
    let status = 'pending';
    if (statusIcon === '✅') status = 'completed';
    else if (statusIcon === '🟡') status = 'in_progress';
    
    steps.push({
      number,
      name,
      status,
      dependsOn: number > 1 ? [number - 1] : []
    });
  }
  
  return steps;
}

/**
 * Create a visual progress bar
 */
function createProgressBar(percentage, width = 20) {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `${bar} ${percentage}%`;
}

module.exports = contextCommand;
