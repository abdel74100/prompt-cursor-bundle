const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { loadContext, getBugJournalSummary, loadBugJournal } = require('../utils/contextTrackerV2');
const { detectProvider, getDirs, DEFAULT_PROVIDER } = require('../utils/directoryManager');
const { getProvider, getPromptDirectory } = require('../utils/aiProviders');

/**
 * Dashboard command - Interactive development dashboard
 */
async function dashboardCommand(options) {
  const workingDir = path.resolve(options.path || process.cwd());
  const aiProviderKey = await detectProvider(workingDir) || DEFAULT_PROVIDER;
  
  // Check if project exists
  const context = await loadContext(workingDir, aiProviderKey);
  if (!context.projectName && !context.projectState.hasCodeRun) {
    console.log(chalk.yellow('\n⚠️  No project found in this directory.'));
    console.log(chalk.gray('Run: prompt-cursor generate -i idea.md\n'));
    return;
  }
  
  // Create dashboard instance
  const dashboard = new Dashboard(workingDir, aiProviderKey, options);
  
  if (options.watch) {
    // Watch mode - refresh automatically
    await dashboard.startWatchMode();
  } else {
    // One-shot mode
    await dashboard.render();
  }
}

/**
 * Dashboard class
 */
class Dashboard {
  constructor(workingDir, aiProviderKey, options = {}) {
    this.workingDir = workingDir;
    this.aiProviderKey = aiProviderKey;
    this.options = options;
    this.provider = getProvider(aiProviderKey);
    this.promptDir = getPromptDirectory(aiProviderKey);
    this.dirs = getDirs(aiProviderKey);
    this.refreshInterval = options.interval || 5000;
    this.isRunning = false;
  }

  /**
   * Load all dashboard data
   */
  async loadData() {
    const context = await loadContext(this.workingDir, this.aiProviderKey);
    const bugSummary = getBugJournalSummary(this.workingDir, this.aiProviderKey);
    const steps = this.parseCodeRun();
    const currentStepTodos = this.parseCurrentStepTodos(steps);
    const recentFiles = this.getRecentFiles();
    
    return {
      context,
      bugSummary,
      steps,
      currentStepTodos,
      recentFiles
    };
  }

  /**
   * Parse code-run.md to get steps
   */
  parseCodeRun() {
    const codeRunPath = path.join(this.workingDir, this.dirs.WORKFLOW, 'code-run.md');
    
    if (!fs.existsSync(codeRunPath)) {
      return [];
    }
    
    const content = fs.readFileSync(codeRunPath, 'utf-8');
    const steps = [];
    
    const stepRegex = /###\s+(✅|⏳|🟡)\s+ÉTAPE\s+(\d+)\s+:\s+([^\n]+)/g;
    let match;
    
    while ((match = stepRegex.exec(content)) !== null) {
      const statusIcon = match[1];
      const number = parseInt(match[2]);
      const name = match[3].trim();
      
      let status = 'pending';
      if (statusIcon === '✅') status = 'completed';
      else if (statusIcon === '🟡') status = 'current';
      
      steps.push({ number, name, status });
    }
    
    return steps;
  }

  /**
   * Parse TODOs from current step's instruction file
   */
  parseCurrentStepTodos(steps) {
    const currentStep = steps.find(s => s.status === 'current');
    if (!currentStep) return [];
    
    const instructionPath = path.join(
      this.workingDir, 
      this.dirs.INSTRUCTIONS, 
      `instructions-step${currentStep.number}.md`
    );
    
    if (!fs.existsSync(instructionPath)) {
      return [];
    }
    
    const content = fs.readFileSync(instructionPath, 'utf-8');
    const todos = [];
    
    // Match checkbox items
    const todoRegex = /- \[([ x])\]\s+(.+)/g;
    let match;
    
    while ((match = todoRegex.exec(content)) !== null) {
      const completed = match[1] === 'x';
      const text = match[2].trim();
      todos.push({ text, completed });
    }
    
    return todos.slice(0, 8); // Limit to 8 items
  }

  /**
   * Get recently modified files
   */
  getRecentFiles() {
    const srcDir = path.join(this.workingDir, 'src');
    if (!fs.existsSync(srcDir)) {
      return [];
    }
    
    const files = [];
    
    const walkDir = (dir, depth = 0) => {
      if (depth > 3) return; // Limit depth
      
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          if (item.startsWith('.') || item === 'node_modules') continue;
          
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory()) {
            walkDir(fullPath, depth + 1);
          } else if (stat.isFile()) {
            files.push({
              path: path.relative(this.workingDir, fullPath),
              mtime: stat.mtime
            });
          }
        }
      } catch (e) {
        // Ignore errors
      }
    };
    
    walkDir(srcDir);
    
    // Sort by modification time and take top 5
    return files
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 5)
      .map(f => f.path);
  }

  /**
   * Render the dashboard
   */
  async render() {
    const data = await this.loadData();
    const width = Math.min(process.stdout.columns || 80, 90);
    
    // Clear screen
    if (this.options.watch) {
      console.clear();
    }
    
    const lines = [];
    
    // Header
    lines.push('');
    lines.push(this.renderBox('top', width));
    lines.push(this.renderLine(`🚀 PROMPT-CURSOR DASHBOARD`, width, 'center', chalk.blue.bold));
    lines.push(this.renderLine(`${this.provider.icon} ${data.context.projectName || 'Project'} | ${this.provider.name}`, width, 'center', chalk.gray));
    lines.push(this.renderBox('separator', width));
    
    // Progress section
    const completedSteps = data.steps.filter(s => s.status === 'completed').length;
    const totalSteps = data.steps.length;
    const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
    const progressBar = this.createProgressBar(progress, 20);
    
    const hoursSpent = completedSteps * 2;
    const hoursRemaining = (totalSteps - completedSteps) * 2;
    
    lines.push(this.renderLine('', width));
    lines.push(this.renderThreeColumns(
      `📊 PROGRESSION`,
      `🐛 BUGS`,
      `⏱️  TEMPS`,
      width
    ));
    lines.push(this.renderThreeColumns(
      `${progressBar} ${progress}%`,
      `${data.bugSummary.unresolved} ouverts`,
      `~${hoursSpent}h passées`,
      width
    ));
    lines.push(this.renderThreeColumns(
      `Step ${completedSteps}/${totalSteps}`,
      `${data.bugSummary.resolved} résolus`,
      `~${hoursRemaining}h restantes`,
      width
    ));
    lines.push(this.renderLine('', width));
    
    // Workflow visualization
    lines.push(this.renderBox('separator', width));
    lines.push(this.renderLine('🔄 WORKFLOW', width, 'left', chalk.cyan.bold));
    lines.push(this.renderLine('', width));
    lines.push(this.renderWorkflow(data.steps, width));
    lines.push(this.renderLine('', width));
    
    // Current step TODOs
    const currentStep = data.steps.find(s => s.status === 'current');
    if (currentStep) {
      lines.push(this.renderBox('separator', width));
      lines.push(this.renderLine(`📋 ÉTAPE ${currentStep.number}: ${currentStep.name}`, width, 'left', chalk.cyan.bold));
      lines.push(this.renderLine('', width));
      
      if (data.currentStepTodos.length > 0) {
        data.currentStepTodos.forEach(todo => {
          const icon = todo.completed ? chalk.green('☑') : chalk.yellow('☐');
          const text = todo.completed ? chalk.gray(todo.text) : chalk.white(todo.text);
          const truncatedText = todo.text.length > width - 10 
            ? todo.text.substring(0, width - 13) + '...' 
            : todo.text;
          lines.push(this.renderLine(`  ${icon} ${truncatedText}`, width, 'left'));
        });
      } else {
        lines.push(this.renderLine(chalk.gray('  Voir instructions-step' + currentStep.number + '.md'), width, 'left'));
      }
      lines.push(this.renderLine('', width));
    }
    
    // Bugs section (if any open)
    if (data.bugSummary.unresolved > 0) {
      lines.push(this.renderBox('separator', width));
      lines.push(this.renderLine('🐛 BUGS OUVERTS', width, 'left', chalk.red.bold));
      lines.push(this.renderLine('', width));
      
      const journal = loadBugJournal(this.workingDir, this.aiProviderKey);
      const openBugs = journal.bugs.filter(b => !b.resolved).slice(0, 3);
      
      openBugs.forEach(bug => {
        const tags = bug.tags.slice(0, 3).map(t => chalk.gray(`[${t}]`)).join(' ');
        const title = bug.title.length > width - 20 
          ? bug.title.substring(0, width - 23) + '...' 
          : bug.title;
        lines.push(this.renderLine(`  ${chalk.red('❌')} ${title}`, width, 'left'));
        lines.push(this.renderLine(`     ${tags}`, width, 'left'));
      });
      
      if (data.bugSummary.unresolved > 3) {
        lines.push(this.renderLine(chalk.gray(`  ... et ${data.bugSummary.unresolved - 3} autres`), width, 'left'));
      }
      lines.push(this.renderLine('', width));
    }
    
    // Two columns: Recent files + Quick actions
    lines.push(this.renderBox('separator', width));
    lines.push(this.renderTwoColumns(
      '📁 FICHIERS RÉCENTS',
      '💡 COMMANDES',
      width
    ));
    lines.push(this.renderLine('', width));
    
    const recentFilesCol = data.recentFiles.length > 0 
      ? data.recentFiles.map(f => `  • ${f}`).slice(0, 4)
      : ['  (aucun fichier src/)'];
    
    const actionsCol = [
      '  prompt-cursor complete',
      '  prompt-cursor bug --add',
      '  prompt-cursor bug --solve',
      '  prompt-cursor context'
    ];
    
    for (let i = 0; i < 4; i++) {
      lines.push(this.renderTwoColumns(
        recentFilesCol[i] || '',
        actionsCol[i] || '',
        width,
        chalk.gray
      ));
    }
    
    lines.push(this.renderLine('', width));
    lines.push(this.renderBox('bottom', width));
    
    // Watch mode footer
    if (this.options.watch) {
      lines.push(chalk.gray(`  Rafraîchissement: ${this.refreshInterval / 1000}s | Ctrl+C pour quitter`));
    }
    
    lines.push('');
    
    // Output
    console.log(lines.join('\n'));
  }

  /**
   * Render box borders
   */
  renderBox(type, width) {
    const w = width - 2;
    switch (type) {
      case 'top':
        return chalk.blue('┌' + '─'.repeat(w) + '┐');
      case 'bottom':
        return chalk.blue('└' + '─'.repeat(w) + '┘');
      case 'separator':
        return chalk.blue('├' + '─'.repeat(w) + '┤');
      default:
        return '';
    }
  }

  /**
   * Render a line with borders
   */
  renderLine(content, width, align = 'left', colorFn = null) {
    const innerWidth = width - 4;
    const plainContent = content.replace(/\x1b\[[0-9;]*m/g, ''); // Strip ANSI
    const contentLength = plainContent.length;
    
    let paddedContent;
    if (align === 'center') {
      const leftPad = Math.floor((innerWidth - contentLength) / 2);
      const rightPad = innerWidth - contentLength - leftPad;
      paddedContent = ' '.repeat(leftPad) + content + ' '.repeat(rightPad);
    } else {
      paddedContent = content + ' '.repeat(Math.max(0, innerWidth - contentLength));
    }
    
    if (colorFn && !content.includes('\x1b')) {
      paddedContent = colorFn(paddedContent);
    }
    
    return chalk.blue('│') + ' ' + paddedContent + ' ' + chalk.blue('│');
  }

  /**
   * Render three columns
   */
  renderThreeColumns(col1, col2, col3, width) {
    const innerWidth = width - 4;
    const colWidth = Math.floor(innerWidth / 3);
    
    const pad = (str, w) => {
      const plain = str.replace(/\x1b\[[0-9;]*m/g, '');
      return str + ' '.repeat(Math.max(0, w - plain.length));
    };
    
    const content = pad(col1, colWidth) + pad(col2, colWidth) + pad(col3, colWidth);
    return chalk.blue('│') + ' ' + content.substring(0, innerWidth) + ' ' + chalk.blue('│');
  }

  /**
   * Render two columns
   */
  renderTwoColumns(col1, col2, width, colorFn = null) {
    const innerWidth = width - 4;
    const colWidth = Math.floor(innerWidth / 2);
    
    const pad = (str, w) => {
      const plain = str.replace(/\x1b\[[0-9;]*m/g, '');
      const padded = str + ' '.repeat(Math.max(0, w - plain.length));
      return padded;
    };
    
    let c1 = pad(col1, colWidth);
    let c2 = pad(col2, colWidth);
    
    if (colorFn) {
      c1 = colorFn(c1);
      c2 = colorFn(c2);
    }
    
    return chalk.blue('│') + ' ' + c1 + c2 + ' ' + chalk.blue('│');
  }

  /**
   * Render workflow visualization
   */
  renderWorkflow(steps, width) {
    if (steps.length === 0) {
      return this.renderLine(chalk.gray('  Aucune étape - lancez: prompt-cursor build'), width, 'left');
    }
    
    const innerWidth = width - 6;
    const maxSteps = Math.min(steps.length, 7); // Show max 7 steps
    const stepWidth = Math.floor(innerWidth / maxSteps);
    
    // Find range to show (centered on current)
    const currentIndex = steps.findIndex(s => s.status === 'current');
    let startIndex = 0;
    
    if (steps.length > maxSteps) {
      if (currentIndex >= 0) {
        startIndex = Math.max(0, currentIndex - Math.floor(maxSteps / 2));
        startIndex = Math.min(startIndex, steps.length - maxSteps);
      }
    }
    
    const visibleSteps = steps.slice(startIndex, startIndex + maxSteps);
    
    // Build workflow line
    let workflow = '  ';
    visibleSteps.forEach((step, i) => {
      const icon = step.status === 'completed' ? chalk.green('✅') 
                 : step.status === 'current' ? chalk.yellow('🟡')
                 : chalk.gray('⏳');
      
      const label = `S${step.number}`;
      const connector = i < visibleSteps.length - 1 ? '──►' : '';
      
      workflow += `${icon}${label}${connector}`;
    });
    
    // Add ellipsis if truncated
    if (startIndex > 0) {
      workflow = '  ...' + workflow.substring(4);
    }
    if (startIndex + maxSteps < steps.length) {
      workflow += '...';
    }
    
    return this.renderLine(workflow, width, 'left');
  }

  /**
   * Create progress bar
   */
  createProgressBar(percentage, width = 20) {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  }

  /**
   * Start watch mode with auto-refresh
   */
  async startWatchMode() {
    this.isRunning = true;
    
    // Setup keyboard listener
    if (process.stdin.isTTY) {
      readline.emitKeypressEvents(process.stdin);
      process.stdin.setRawMode(true);
      
      process.stdin.on('keypress', (str, key) => {
        if (key.ctrl && key.name === 'c') {
          this.stop();
          process.exit();
        }
        if (key.name === 'r') {
          this.render();
        }
        if (key.name === 'q') {
          this.stop();
          process.exit();
        }
      });
    }
    
    // Initial render
    await this.render();
    
    // Refresh loop
    while (this.isRunning) {
      await this.sleep(this.refreshInterval);
      if (this.isRunning) {
        await this.render();
      }
    }
  }

  /**
   * Stop watch mode
   */
  stop() {
    this.isRunning = false;
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    console.log(chalk.gray('\n👋 Dashboard fermé\n'));
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = dashboardCommand;

