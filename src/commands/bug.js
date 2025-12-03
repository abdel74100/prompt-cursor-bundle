const chalk = require('chalk');
const path = require('path');
const inquirer = require('inquirer').default;
const { 
  loadBugJournal, 
  addBug, 
  addSolution, 
  searchBugs, 
  checkKnownSolution,
  getBugJournalSummary,
  loadContext
} = require('../utils/contextTrackerV2');
const { detectProvider, getDirs, DEFAULT_PROVIDER } = require('../utils/directoryManager');
const { getPromptDirectory } = require('../utils/aiProviders');

/**
 * Bug command - Manage bug journal
 */
async function bugCommand(options) {
  const workingDir = options.path || process.cwd();
  const aiProviderKey = await detectProvider(workingDir) || DEFAULT_PROVIDER;
  const promptDir = getPromptDirectory(aiProviderKey);
  
  // Handle subcommands
  if (options.add) {
    await addBugInteractive(workingDir, aiProviderKey);
    return;
  }
  
  if (options.solve) {
    await solveBugInteractive(workingDir, aiProviderKey, options.solve);
    return;
  }
  
  if (options.search) {
    await searchBugsCommand(workingDir, aiProviderKey, options.search);
    return;
  }
  
  if (options.check) {
    await checkErrorCommand(workingDir, aiProviderKey, options.check);
    return;
  }
  
  if (options.list) {
    await listBugsCommand(workingDir, aiProviderKey, options);
    return;
  }
  
  // Default: show bug journal summary
  await showBugSummary(workingDir, aiProviderKey);
}

/**
 * Show bug journal summary
 */
async function showBugSummary(workingDir, aiProviderKey) {
  const summary = getBugJournalSummary(workingDir, aiProviderKey);
  const promptDir = getPromptDirectory(aiProviderKey);
  
  console.log('');
  console.log(chalk.blue.bold('┌─────────────────────────────────────────────────────────────────┐'));
  console.log(chalk.blue.bold('│  🐛 BUG JOURNAL                                                 │'));
  console.log(chalk.blue.bold('├─────────────────────────────────────────────────────────────────┤'));
  
  // Statistics
  const resolvedBar = createProgressBar(
    summary.totalBugs > 0 ? (summary.resolved / summary.totalBugs) * 100 : 0, 
    20
  );
  
  console.log(chalk.white(`│  📊 Statistics                                                  │`));
  console.log(chalk.white(`│     Total bugs: ${summary.totalBugs.toString().padEnd(5)} Resolved: ${summary.resolved.toString().padEnd(5)} Open: ${summary.unresolved.toString().padEnd(5)}   │`));
  console.log(chalk.white(`│     Resolution: ${resolvedBar}                        │`));
  
  // Most common tags
  if (summary.mostCommonTags.length > 0) {
    console.log(chalk.blue.bold('├─────────────────────────────────────────────────────────────────┤'));
    console.log(chalk.white(`│  🏷️  Common Tags                                                │`));
    const tagsStr = summary.mostCommonTags.slice(0, 5).map(t => `${t.tag}(${t.count})`).join(', ');
    console.log(chalk.gray(`│     ${tagsStr.padEnd(55)} │`));
  }
  
  // Recent bugs
  if (summary.recentBugs.length > 0) {
    console.log(chalk.blue.bold('├─────────────────────────────────────────────────────────────────┤'));
    console.log(chalk.white(`│  📋 Recent Bugs                                                 │`));
    
    summary.recentBugs.forEach(bug => {
      const status = bug.resolved ? chalk.green('✅') : chalk.red('❌');
      const title = bug.title.length > 45 ? bug.title.substring(0, 42) + '...' : bug.title;
      console.log(chalk.white(`│     ${status} ${title.padEnd(50)} │`));
    });
  }
  
  console.log(chalk.blue.bold('├─────────────────────────────────────────────────────────────────┤'));
  console.log(chalk.gray(`│  Commands:                                                      │`));
  console.log(chalk.gray(`│    prompt-cursor bug --add          Add a new bug               │`));
  console.log(chalk.gray(`│    prompt-cursor bug --solve <id>   Add solution to bug         │`));
  console.log(chalk.gray(`│    prompt-cursor bug --search <q>   Search bugs                 │`));
  console.log(chalk.gray(`│    prompt-cursor bug --check <err>  Check for known solution    │`));
  console.log(chalk.gray(`│    prompt-cursor bug --list         List all bugs               │`));
  console.log(chalk.blue.bold('└─────────────────────────────────────────────────────────────────┘'));
  console.log('');
}

/**
 * Add bug interactively
 */
async function addBugInteractive(workingDir, aiProviderKey) {
  console.log(chalk.blue.bold('\n🐛 Add New Bug\n'));
  
  const context = await loadContext(workingDir, aiProviderKey);
  
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'title',
      message: 'Bug title (short description):',
      validate: input => input.trim().length > 0 || 'Title is required'
    },
    {
      type: 'editor',
      name: 'errorMessage',
      message: 'Error message (paste the error):',
    },
    {
      type: 'input',
      name: 'description',
      message: 'Additional context (optional):'
    },
    {
      type: 'input',
      name: 'step',
      message: `Current step (1-${context.development.totalSteps || '?'}):`,
      default: context.development.currentStep?.toString() || ''
    },
    {
      type: 'list',
      name: 'severity',
      message: 'Severity:',
      choices: [
        { name: '🟢 Low - Minor issue', value: 'low' },
        { name: '🟡 Medium - Blocks progress', value: 'medium' },
        { name: '🟠 High - Major blocker', value: 'high' },
        { name: '🔴 Critical - System down', value: 'critical' }
      ],
      default: 'medium'
    },
    {
      type: 'input',
      name: 'tags',
      message: 'Tags (comma-separated, e.g. react,api,auth):',
      filter: input => input.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0)
    }
  ]);
  
  const bug = addBug(workingDir, aiProviderKey, {
    title: answers.title,
    description: answers.description,
    errorMessage: answers.errorMessage,
    step: answers.step ? parseInt(answers.step) : null,
    severity: answers.severity,
    tags: answers.tags
  });
  
  console.log(chalk.green(`\n✅ Bug added: ${bug.id}`));
  console.log(chalk.gray(`   Title: ${bug.title}`));
  console.log(chalk.gray(`   Tags: ${bug.tags.join(', ')}`));
  
  if (bug.relatedBugs.length > 0) {
    console.log(chalk.yellow(`\n💡 Related bugs found - check if solutions apply!`));
  }
  
  console.log('');
}

/**
 * Solve bug interactively
 */
async function solveBugInteractive(workingDir, aiProviderKey, bugId) {
  console.log(chalk.blue.bold('\n✅ Add Solution\n'));
  
  const journal = loadBugJournal(workingDir, aiProviderKey);
  
  // If no bugId provided, let user select
  if (!bugId || bugId === true) {
    const unresolvedBugs = journal.bugs.filter(b => !b.resolved);
    
    if (unresolvedBugs.length === 0) {
      console.log(chalk.green('🎉 No unresolved bugs!'));
      return;
    }
    
    const { selectedBug } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedBug',
        message: 'Select bug to solve:',
        choices: unresolvedBugs.map(b => ({
          name: `${b.id}: ${b.title}`,
          value: b.id
        }))
      }
    ]);
    
    bugId = selectedBug;
  }
  
  const bug = journal.bugs.find(b => b.id === bugId);
  if (!bug) {
    console.log(chalk.red(`❌ Bug ${bugId} not found`));
    return;
  }
  
  console.log(chalk.cyan(`Bug: ${bug.title}`));
  console.log(chalk.gray(`Error: ${bug.errorMessage.substring(0, 100)}...`));
  console.log('');
  
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'summary',
      message: 'Solution summary (one line):',
      validate: input => input.trim().length > 0 || 'Summary is required'
    },
    {
      type: 'editor',
      name: 'description',
      message: 'Detailed description (optional):'
    },
    {
      type: 'input',
      name: 'steps',
      message: 'Steps to fix (comma-separated):',
      filter: input => input.split(',').map(s => s.trim()).filter(s => s.length > 0)
    },
    {
      type: 'input',
      name: 'commands',
      message: 'Commands to run (comma-separated, optional):',
      filter: input => input.split(',').map(s => s.trim()).filter(s => s.length > 0)
    },
    {
      type: 'input',
      name: 'preventionTips',
      message: 'Prevention tips (comma-separated, optional):',
      filter: input => input.split(',').map(s => s.trim()).filter(s => s.length > 0)
    }
  ]);
  
  addSolution(workingDir, aiProviderKey, bugId, {
    summary: answers.summary,
    description: answers.description,
    steps: answers.steps,
    commands: answers.commands,
    preventionTips: answers.preventionTips
  });
  
  console.log(chalk.green(`\n✅ Solution added to ${bugId}`));
  console.log(chalk.gray('   This solution will be suggested for similar errors in the future.\n'));
}

/**
 * Search bugs command
 */
async function searchBugsCommand(workingDir, aiProviderKey, query) {
  console.log(chalk.blue.bold(`\n🔍 Searching for: "${query}"\n`));
  
  const results = searchBugs(workingDir, aiProviderKey, query);
  
  if (results.length === 0) {
    console.log(chalk.yellow('No bugs found matching your query.'));
    return;
  }
  
  console.log(chalk.green(`Found ${results.length} bug(s):\n`));
  
  results.forEach((bug, index) => {
    const status = bug.resolved ? chalk.green('✅ RESOLVED') : chalk.red('❌ OPEN');
    const severity = {
      low: chalk.green('LOW'),
      medium: chalk.yellow('MEDIUM'),
      high: chalk.red('HIGH'),
      critical: chalk.red.bold('CRITICAL')
    }[bug.severity] || 'UNKNOWN';
    
    console.log(chalk.cyan(`${index + 1}. ${bug.id}: ${bug.title}`));
    console.log(chalk.gray(`   Status: ${status}  Severity: ${severity}`));
    console.log(chalk.gray(`   Tags: ${bug.tags.join(', ')}`));
    
    if (bug.resolved && bug.solution) {
      console.log(chalk.green(`   Solution: ${bug.solution.summary}`));
    }
    
    console.log('');
  });
}

/**
 * Check for known solution
 */
async function checkErrorCommand(workingDir, aiProviderKey, errorMessage) {
  console.log(chalk.blue.bold('\n🔍 Checking for known solutions...\n'));
  
  const result = checkKnownSolution(workingDir, aiProviderKey, errorMessage);
  
  if (!result) {
    console.log(chalk.yellow('No known solutions found for this error.'));
    console.log(chalk.gray('\nWould you like to add this as a new bug?'));
    
    const { shouldAdd } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'shouldAdd',
        message: 'Add as new bug?',
        default: true
      }
    ]);
    
    if (shouldAdd) {
      const bug = addBug(workingDir, aiProviderKey, {
        title: errorMessage.substring(0, 50) + (errorMessage.length > 50 ? '...' : ''),
        errorMessage: errorMessage,
        severity: 'medium'
      });
      
      console.log(chalk.green(`\n✅ Bug added: ${bug.id}`));
    }
  }
}

/**
 * List all bugs
 */
async function listBugsCommand(workingDir, aiProviderKey, options) {
  const journal = loadBugJournal(workingDir, aiProviderKey);
  
  let bugs = journal.bugs;
  
  // Filter by status
  if (options.resolved) {
    bugs = bugs.filter(b => b.resolved);
  } else if (options.open) {
    bugs = bugs.filter(b => !b.resolved);
  }
  
  // Filter by tag
  if (options.tag) {
    bugs = bugs.filter(b => b.tags.includes(options.tag.toLowerCase()));
  }
  
  console.log(chalk.blue.bold(`\n📋 Bug List (${bugs.length} bugs)\n`));
  
  if (bugs.length === 0) {
    console.log(chalk.gray('No bugs found.'));
    return;
  }
  
  // Group by status
  const resolved = bugs.filter(b => b.resolved);
  const open = bugs.filter(b => !b.resolved);
  
  if (open.length > 0) {
    console.log(chalk.red.bold('❌ Open Bugs:\n'));
    open.forEach(bug => {
      const severity = {
        low: '🟢',
        medium: '🟡',
        high: '🟠',
        critical: '🔴'
      }[bug.severity] || '⚪';
      
      console.log(chalk.white(`  ${severity} ${bug.id}: ${bug.title}`));
      console.log(chalk.gray(`     Tags: ${bug.tags.join(', ')}`));
      console.log(chalk.gray(`     Attempts: ${bug.attempts.length}`));
      console.log('');
    });
  }
  
  if (resolved.length > 0 && !options.open) {
    console.log(chalk.green.bold('\n✅ Resolved Bugs:\n'));
    resolved.slice(-10).forEach(bug => {
      console.log(chalk.white(`  ✅ ${bug.id}: ${bug.title}`));
      if (bug.solution) {
        console.log(chalk.green(`     Solution: ${bug.solution.summary}`));
      }
      console.log('');
    });
    
    if (resolved.length > 10) {
      console.log(chalk.gray(`  ... and ${resolved.length - 10} more resolved bugs\n`));
    }
  }
}

/**
 * Create progress bar
 */
function createProgressBar(percentage, width = 20) {
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty) + ` ${Math.round(percentage)}%`;
}

module.exports = bugCommand;

