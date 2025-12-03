#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const generateCommand = require('../src/commands/generate');
const contextCommand = require('../src/commands/context');
const buildCommand = require('../src/commands/build');
const cleanCommand = require('../src/commands/clean');
const completeCommand = require('../src/commands/complete');
const bugCommand = require('../src/commands/bug');
const dashboardCommand = require('../src/commands/dashboard');

const program = new Command();
const packageJson = require('../package.json');

program
  .name('prompt-cursor')
  .description('Prompt Cursor Bundle (Multi-AI) - Works with Cursor, Claude, Windsurf & Copilot')
  .version(packageJson.version);

// Generate command
program
  .command('generate')
  .alias('gen')
  .description('🌟 Generate intelligent prompt with compatibility checks')
  .option('-n, --name <name>', 'Project name')
  .option('-i, --idea-file <path>', 'Path to your idea file (required)')
  .option('-o, --output <path>', 'Output directory', './my-project')
  .option('-p, --provider <provider>', 'AI provider (cursor, claude, windsurf, copilot)')
  .option('-a, --auto', 'Auto mode: watch for files and run build automatically')
  .option('-c, --complex', '📦 Enable complex project mode (modules, milestones, dependencies)')
  .option('-m, --modules <modules>', 'Comma-separated list of modules (frontend,backend,api,database,infra,auth,testing)')
  .option('--simple', 'Force simple mode (disable complex features)')
  .action(async (options) => {
    await generateCommand(options);
  });

// Context command
program
  .command('context')
  .alias('ctx')
  .description('Show and manage CLI context (tracking information)')
  .option('-c, --clear', 'Clear/reset context')
  .option('-v, --verbose', 'Show detailed information')
  .option('-p, --path <path>', 'Path to project directory', '.')
  .option('--note <message>', 'Add a note to the context')
  .option('-d, --dashboard', '📊 Show enhanced dashboard with graphs')
  .action(async (options) => {
    await contextCommand(options);
  });

// Build command
program
  .command('build')
  .description('Generate intelligent code-run.md from saved responses')
  .option('-o, --output <path>', 'Project directory', process.cwd())
  .option('-c, --complex', '📦 Enable complex project mode')
  .option('-m, --modules <modules>', 'Comma-separated list of modules')
  .action(async (options) => {
    await buildCommand(options);
  });

// Clean command
program
  .command('clean')
  .description('Remove generated files directory (.prompt-cursor/, .prompt-claude/, etc.)')
  .option('-p, --path <path>', 'Path to project directory', '.')
  .option('-f, --force', 'Skip confirmation prompt')
  .option('-k, --keep-context', 'Keep context file')
  .action(async (options) => {
    await cleanCommand(options);
  });

// Complete command
program
  .command('complete')
  .alias('done')
  .description('✅ Mark a step as completed and update code-run.md')
  .option('-s, --step <number>', 'Step number to complete')
  .option('-m, --module <module>', 'Module name (for complex projects)')
  .action(async (options) => {
    await completeCommand(options);
  });

// Bug command
program
  .command('bug')
  .description('🐛 Manage bug journal - track bugs and solutions')
  .option('-p, --path <path>', 'Path to project directory', '.')
  .option('-a, --add', 'Add a new bug interactively')
  .option('-s, --solve [bugId]', 'Add solution to a bug')
  .option('--search <query>', 'Search bugs by keyword or error message')
  .option('--check <error>', 'Check if error has known solution')
  .option('-l, --list', 'List all bugs')
  .option('--resolved', 'Show only resolved bugs (with --list)')
  .option('--open', 'Show only open bugs (with --list)')
  .option('-t, --tag <tag>', 'Filter by tag (with --list)')
  .action(async (options) => {
    await bugCommand(options);
  });

// Dashboard command
program
  .command('dashboard')
  .alias('dash')
  .description('📊 Interactive development dashboard')
  .option('-p, --path <path>', 'Path to project directory', '.')
  .option('-w, --watch', 'Watch mode - auto-refresh dashboard')
  .option('-i, --interval <ms>', 'Refresh interval in ms (default: 5000)', '5000')
  .action(async (options) => {
    options.interval = parseInt(options.interval);
    await dashboardCommand(options);
  });

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  console.log(chalk.blue.bold('\n🚀 Prompt Cursor Bundle - Multi-AI Project Generator\n'));
  console.log(chalk.gray('Supports: Cursor, Claude, Windsurf, GitHub Copilot\n'));
  
  console.log(chalk.cyan('Quick Start:'));
  console.log(chalk.white('  1. Create idea.md with your project concept'));
  console.log(chalk.white('  2. Run: prompt-cursor generate -i idea.md'));
  console.log(chalk.white('  3. Copy prompt to your AI assistant'));
  console.log(chalk.white('  4. Save generated files'));
  console.log(chalk.white('  5. Run: prompt-cursor build\n'));
  
  console.log(chalk.cyan('Complex Projects:'));
  console.log(chalk.white('  prompt-cursor generate -i idea.md --complex'));
  console.log(chalk.gray('  → Enables modules, milestones, and dependency tracking\n'));
  
  console.log(chalk.cyan('Bug Tracking:'));
  console.log(chalk.white('  prompt-cursor bug --add        Add a bug'));
  console.log(chalk.white('  prompt-cursor bug --check "error message"'));
  console.log(chalk.gray('  → Check if error has known solution\n'));
  
  console.log(chalk.cyan('Dashboard:'));
  console.log(chalk.white('  prompt-cursor dashboard        View project status'));
  console.log(chalk.white('  prompt-cursor dash --watch     Live dashboard\n'));
  
  program.outputHelp();
}
