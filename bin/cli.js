#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const generateCommand = require('../src/commands/generate');
const buildCommand = require('../src/commands/build');
const agentsStatusCommand = require('../src/commands/agents-status');
const agentsRunCommand = require('../src/commands/agents-run');
const agentsNextCommand = require('../src/commands/agents-next');
const agentsCompleteCommand = require('../src/commands/agents-complete');

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
  .option('-c, --complex', '📦 Enable complex project mode')
  .option('--simple', 'Force simple mode (disable complex features)')
  .action(async (options) => {
    await generateCommand(options);
  });

// Build command
program
  .command('build')
  .description('Generate workflow and step files from saved responses')
  .option('-o, --output <path>', 'Project directory', process.cwd())
  .option('-c, --complex', '📦 Enable complex project mode (modules, dependencies)')
  .action(async (options) => {
    await buildCommand(options);
  });

// Agents status command
program
  .command('agents:status')
  .alias('status')
  .description('📊 Display task progression and ready tasks')
  .option('-o, --output <path>', 'Project directory', process.cwd())
  .option('-a, --all', 'Show all ready tasks (not just first 5)')
  .option('-m, --modules', 'Show progress by module')
  .option('--agents', 'Show progress by agent')
  .action(async (options) => {
    await agentsStatusCommand(options);
  });

// Agents run command
program
  .command('agents:run')
  .alias('run')
  .description('🚀 Generate and display prompt for a specific step')
  .option('-o, --output <path>', 'Project directory', process.cwd())
  .option('-s, --step <number>', 'Step number to run')
  .option('-c, --copy', 'Copy prompt to clipboard')
  .action(async (options) => {
    await agentsRunCommand(options);
  });

// Agents next command
program
  .command('agents:next')
  .alias('next')
  .description('➡️ Display the next available step (first ready task)')
  .option('-o, --output <path>', 'Project directory', process.cwd())
  .option('-c, --copy', 'Copy prompt to clipboard')
  .action(async (options) => {
    await agentsNextCommand(options);
  });

// Agents complete command
program
  .command('agents:complete')
  .alias('done')
  .description('✅ Mark a step as completed')
  .option('-o, --output <path>', 'Project directory', process.cwd())
  .option('-s, --step <number>', 'Step number to complete')
  .action(async (options) => {
    await agentsCompleteCommand(options);
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
