#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const generateCommand = require('../src/commands/generate');
const contextCommand = require('../src/commands/context');
const buildCommand = require('../src/commands/build');
const cleanCommand = require('../src/commands/clean');
const completeCommand = require('../src/commands/complete');

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
  .action(async (options) => {
    await contextCommand(options);
  });

// Build command
program
  .command('build')
  .description('Generate intelligent code-run.md from saved responses')
  .option('-o, --output <path>', 'Project directory', process.cwd())
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
  .action(async (options) => {
    await completeCommand(options);
  });

// Parse arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

