const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { getDirs, detectProvider, DEFAULT_PROVIDER } = require('./directoryManager');

/**
 * Get context file name for a provider
 * @param {string} providerKey - Provider key
 * @returns {string} Context file name
 */
function getContextFileName(providerKey = DEFAULT_PROVIDER) {
  return `.${providerKey}-context.json`;
}

/**
 * Get bug journal file name
 * @param {string} providerKey - Provider key
 * @returns {string} Bug journal file name
 */
function getBugJournalFileName(providerKey = DEFAULT_PROVIDER) {
  return `.${providerKey}-bug-journal.json`;
}

/**
 * Load context from file or create new one with auto-detection
 * @param {string} workingDir - Working directory
 * @param {string} providerKey - Provider key (optional, will auto-detect)
 */
async function loadContext(workingDir = process.cwd(), providerKey = null) {
  // Auto-detect provider if not specified
  if (!providerKey) {
    providerKey = await detectProvider(workingDir) || DEFAULT_PROVIDER;
  }
  
  const dirs = getDirs(providerKey);
  const contextFileName = getContextFileName(providerKey);
  const contextPath = path.join(workingDir, dirs.ROOT, contextFileName);
  
  let context;
  if (fs.existsSync(contextPath)) {
    try {
      const content = fs.readFileSync(contextPath, 'utf-8');
      context = JSON.parse(content);
      
      // Migrate old context to new format if needed
      if (context.version === '1.0.0' || context.version === '2.0.0') {
        context = migrateContext(context);
      }
    } catch (error) {
      console.error(chalk.yellow(`⚠️ Error reading context: ${error.message}`));
      context = createContext(providerKey);
    }
  } else {
    context = createContext(providerKey);
  }
  
  // Auto-detect project status from files
  context = detectProjectStatus(context, workingDir, providerKey);
  
  // Auto-save on load to keep updated
  saveContext(context, workingDir, providerKey);
  
  return context;
}

/**
 * Create a new enhanced context structure
 * @param {string} providerKey - Provider key
 */
function createContext(providerKey = DEFAULT_PROVIDER) {
  return {
    version: '3.0.0',
    aiProvider: providerKey,
    projectName: null,
    outputDir: null,
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    
    // Workflow tracking
    workflow: {
      type: null,
      currentPhase: 'initialization',
      startedAt: new Date().toISOString(),
      completedPhases: []
    },
    
    // File tracking
    files: {
      generated: [],
      cursorCreated: [],
      buildCreated: [],
      detected: []
    },
    
    // Project state
    projectState: {
      hasIdea: false,
      hasPromptGenerate: false,
      hasProjectRequest: false,
      hasAiRules: false,
      hasSpec: false,
      hasImplementationPlan: false,
      hasCodeRun: false,
      hasInstructions: false,
      promptPhaseComplete: false,
      cursorPhaseComplete: false,
      buildPhaseComplete: false,
      developmentStarted: false,
      currentDevelopmentStep: null,
      completedDevelopmentSteps: []
    },
    
    // Statistics
    statistics: {
      totalCommands: 0,
      commandHistory: [],
      estimatedTimeSpent: 0,
      filesGenerated: 0,
      lastActivity: null,
      bugsEncountered: 0,
      bugsResolved: 0
    },
    
    // Development progress
    development: {
      totalSteps: null,
      completedSteps: [],
      currentStep: null,
      progress: 0,
      estimatedCompletion: null
    },
    
    // Complex mode
    complexMode: false,
    modules: [],
    
    // Sessions history
    sessions: [],
    
    // Notes
    notes: [],
    
    // Bug tracking (quick reference - full journal is separate file)
    recentBugs: []
  };
}

/**
 * Load bug journal
 * @param {string} workingDir - Working directory
 * @param {string} providerKey - Provider key
 * @returns {Object} Bug journal
 */
function loadBugJournal(workingDir = process.cwd(), providerKey = DEFAULT_PROVIDER) {
  const dirs = getDirs(providerKey);
  const journalFileName = getBugJournalFileName(providerKey);
  const journalPath = path.join(workingDir, dirs.ROOT, journalFileName);
  
  if (fs.existsSync(journalPath)) {
    try {
      const content = fs.readFileSync(journalPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return createBugJournal();
    }
  }
  
  return createBugJournal();
}

/**
 * Create new bug journal
 */
function createBugJournal() {
  return {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    bugs: [],
    solutions: {},
    tags: {},
    statistics: {
      totalBugs: 0,
      resolved: 0,
      unresolved: 0,
      mostCommonTags: []
    }
  };
}

/**
 * Save bug journal
 * @param {Object} journal - Bug journal
 * @param {string} workingDir - Working directory
 * @param {string} providerKey - Provider key
 */
function saveBugJournal(journal, workingDir = process.cwd(), providerKey = DEFAULT_PROVIDER) {
  const dirs = getDirs(providerKey);
  const journalFileName = getBugJournalFileName(providerKey);
  
  const promptDir = path.join(workingDir, dirs.ROOT);
  if (!fs.existsSync(promptDir)) {
    fs.mkdirSync(promptDir, { recursive: true });
  }
  
  const journalPath = path.join(promptDir, journalFileName);
  journal.lastUpdated = new Date().toISOString();
  
  // Update statistics
  journal.statistics.totalBugs = journal.bugs.length;
  journal.statistics.resolved = journal.bugs.filter(b => b.resolved).length;
  journal.statistics.unresolved = journal.bugs.filter(b => !b.resolved).length;
  
  // Calculate most common tags
  const tagCounts = {};
  journal.bugs.forEach(bug => {
    (bug.tags || []).forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  journal.statistics.mostCommonTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));
  
  try {
    fs.writeFileSync(journalPath, JSON.stringify(journal, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(chalk.red(`❌ Error saving bug journal: ${error.message}`));
    return false;
  }
}

/**
 * Add a bug to the journal
 * @param {string} workingDir - Working directory
 * @param {string} providerKey - Provider key
 * @param {Object} bugInfo - Bug information
 * @returns {Object} Created bug entry
 */
function addBug(workingDir, providerKey, bugInfo) {
  const journal = loadBugJournal(workingDir, providerKey);
  
  const bug = {
    id: `BUG-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    title: bugInfo.title || 'Unknown bug',
    description: bugInfo.description || '',
    errorMessage: bugInfo.errorMessage || '',
    stackTrace: bugInfo.stackTrace || '',
    step: bugInfo.step || null,
    module: bugInfo.module || null,
    file: bugInfo.file || null,
    line: bugInfo.line || null,
    tags: bugInfo.tags || [],
    severity: bugInfo.severity || 'medium', // low, medium, high, critical
    resolved: false,
    solution: null,
    relatedBugs: [],
    attempts: []
  };
  
  // Auto-generate tags from error message
  const autoTags = extractTagsFromError(bug.errorMessage);
  bug.tags = [...new Set([...bug.tags, ...autoTags])];
  
  // Check for similar bugs
  const similarBugs = searchBugs(workingDir, providerKey, bug.errorMessage);
  if (similarBugs.length > 0) {
    bug.relatedBugs = similarBugs.slice(0, 5).map(b => b.id);
    
    // Show similar bugs found
    console.log(chalk.yellow(`\n🔍 Similar bugs found in journal:`));
    similarBugs.slice(0, 3).forEach(similar => {
      console.log(chalk.gray(`  • ${similar.title}`));
      if (similar.resolved && similar.solution) {
        console.log(chalk.green(`    ✅ Solution: ${similar.solution.summary}`));
      }
    });
    console.log('');
  }
  
  journal.bugs.push(bug);
  
  // Update tags index
  bug.tags.forEach(tag => {
    if (!journal.tags[tag]) {
      journal.tags[tag] = [];
    }
    journal.tags[tag].push(bug.id);
  });
  
  saveBugJournal(journal, workingDir, providerKey);
  
  // Update context
  updateContextBugStats(workingDir, providerKey, bug);
  
  return bug;
}

/**
 * Add a solution to a bug
 * @param {string} workingDir - Working directory
 * @param {string} providerKey - Provider key
 * @param {string} bugId - Bug ID
 * @param {Object} solutionInfo - Solution information
 */
function addSolution(workingDir, providerKey, bugId, solutionInfo) {
  const journal = loadBugJournal(workingDir, providerKey);
  
  const bugIndex = journal.bugs.findIndex(b => b.id === bugId);
  if (bugIndex === -1) {
    console.error(chalk.red(`❌ Bug ${bugId} not found`));
    return null;
  }
  
  const solution = {
    createdAt: new Date().toISOString(),
    summary: solutionInfo.summary || '',
    description: solutionInfo.description || '',
    steps: solutionInfo.steps || [],
    codeChanges: solutionInfo.codeChanges || [],
    commands: solutionInfo.commands || [],
    preventionTips: solutionInfo.preventionTips || [],
    references: solutionInfo.references || []
  };
  
  journal.bugs[bugIndex].solution = solution;
  journal.bugs[bugIndex].resolved = true;
  journal.bugs[bugIndex].updatedAt = new Date().toISOString();
  
  // Add to solutions index for quick lookup
  const errorKey = normalizeErrorMessage(journal.bugs[bugIndex].errorMessage);
  if (errorKey) {
    journal.solutions[errorKey] = {
      bugId: bugId,
      solution: solution
    };
  }
  
  saveBugJournal(journal, workingDir, providerKey);
  
  // Update context
  const context = loadContextSync(workingDir, providerKey);
  if (context) {
    context.statistics.bugsResolved++;
    saveContext(context, workingDir, providerKey);
  }
  
  console.log(chalk.green(`✅ Solution added to bug ${bugId}`));
  return solution;
}

/**
 * Add an attempt to fix a bug
 * @param {string} workingDir - Working directory
 * @param {string} providerKey - Provider key
 * @param {string} bugId - Bug ID
 * @param {Object} attemptInfo - Attempt information
 */
function addAttempt(workingDir, providerKey, bugId, attemptInfo) {
  const journal = loadBugJournal(workingDir, providerKey);
  
  const bugIndex = journal.bugs.findIndex(b => b.id === bugId);
  if (bugIndex === -1) {
    return null;
  }
  
  const attempt = {
    timestamp: new Date().toISOString(),
    description: attemptInfo.description || '',
    result: attemptInfo.result || 'failed', // success, failed, partial
    notes: attemptInfo.notes || ''
  };
  
  journal.bugs[bugIndex].attempts.push(attempt);
  journal.bugs[bugIndex].updatedAt = new Date().toISOString();
  
  saveBugJournal(journal, workingDir, providerKey);
  
  return attempt;
}

/**
 * Search bugs by error message or keywords
 * @param {string} workingDir - Working directory
 * @param {string} providerKey - Provider key
 * @param {string} query - Search query
 * @returns {Array} Matching bugs
 */
function searchBugs(workingDir, providerKey, query) {
  const journal = loadBugJournal(workingDir, providerKey);
  
  if (!query || journal.bugs.length === 0) {
    return [];
  }
  
  const normalizedQuery = query.toLowerCase();
  const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 3);
  
  // Score each bug by relevance
  const scoredBugs = journal.bugs.map(bug => {
    let score = 0;
    
    // Exact error message match (highest priority)
    if (bug.errorMessage && bug.errorMessage.toLowerCase().includes(normalizedQuery)) {
      score += 100;
    }
    
    // Normalized error key match
    const bugErrorKey = normalizeErrorMessage(bug.errorMessage);
    const queryErrorKey = normalizeErrorMessage(query);
    if (bugErrorKey && queryErrorKey && bugErrorKey === queryErrorKey) {
      score += 200;
    }
    
    // Word matches in title
    queryWords.forEach(word => {
      if (bug.title.toLowerCase().includes(word)) score += 10;
      if (bug.description.toLowerCase().includes(word)) score += 5;
      if (bug.errorMessage.toLowerCase().includes(word)) score += 15;
    });
    
    // Tag matches
    bug.tags.forEach(tag => {
      if (normalizedQuery.includes(tag.toLowerCase())) score += 20;
    });
    
    return { bug, score };
  });
  
  // Return bugs with score > 0, sorted by score
  return scoredBugs
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ bug }) => bug);
}

/**
 * Check for known solution when encountering an error
 * @param {string} workingDir - Working directory
 * @param {string} providerKey - Provider key
 * @param {string} errorMessage - Error message
 * @returns {Object|null} Solution if found
 */
function checkKnownSolution(workingDir, providerKey, errorMessage) {
  const journal = loadBugJournal(workingDir, providerKey);
  
  // Check solutions index first (fast lookup)
  const errorKey = normalizeErrorMessage(errorMessage);
  if (errorKey && journal.solutions[errorKey]) {
    const solutionEntry = journal.solutions[errorKey];
    const bug = journal.bugs.find(b => b.id === solutionEntry.bugId);
    
    if (bug && bug.resolved) {
      console.log(chalk.green.bold('\n🎉 Known solution found!'));
      console.log(chalk.cyan(`Bug: ${bug.title}`));
      console.log(chalk.white(`Solution: ${bug.solution.summary}`));
      
      if (bug.solution.steps && bug.solution.steps.length > 0) {
        console.log(chalk.cyan('\nSteps to fix:'));
        bug.solution.steps.forEach((step, i) => {
          console.log(chalk.white(`  ${i + 1}. ${step}`));
        });
      }
      
      if (bug.solution.commands && bug.solution.commands.length > 0) {
        console.log(chalk.cyan('\nCommands to run:'));
        bug.solution.commands.forEach(cmd => {
          console.log(chalk.gray(`  $ ${cmd}`));
        });
      }
      
      console.log('');
      
      return {
        bug,
        solution: bug.solution
      };
    }
  }
  
  // Search for similar bugs
  const similarBugs = searchBugs(workingDir, providerKey, errorMessage);
  const resolvedSimilar = similarBugs.filter(b => b.resolved && b.solution);
  
  if (resolvedSimilar.length > 0) {
    console.log(chalk.yellow('\n🔍 Similar resolved bugs found:'));
    resolvedSimilar.slice(0, 3).forEach(bug => {
      console.log(chalk.cyan(`  • ${bug.title}`));
      console.log(chalk.green(`    Solution: ${bug.solution.summary}`));
    });
    console.log('');
    
    return {
      similar: resolvedSimilar,
      exactMatch: false
    };
  }
  
  return null;
}

/**
 * Extract tags from error message
 */
function extractTagsFromError(errorMessage) {
  if (!errorMessage) return [];
  
  const tags = [];
  const lowerError = errorMessage.toLowerCase();
  
  // Common error patterns
  const patterns = {
    'syntax': /syntax\s*error|unexpected\s+token/i,
    'import': /cannot\s+find\s+module|import|require/i,
    'type': /type\s*error|is\s+not\s+a\s+function|undefined\s+is\s+not/i,
    'reference': /reference\s*error|is\s+not\s+defined/i,
    'network': /network|fetch|axios|http|econnrefused/i,
    'database': /database|sql|prisma|mongo|connection/i,
    'auth': /auth|token|jwt|unauthorized|forbidden/i,
    'permission': /permission|eacces|eperm/i,
    'memory': /heap|memory|out\s+of\s+memory/i,
    'timeout': /timeout|etimedout/i,
    'version': /version|incompatible|peer\s+dep/i,
    'build': /build|compile|webpack|vite|esbuild/i,
    'test': /test|jest|cypress|expect|assert/i,
    'react': /react|component|hook|render/i,
    'node': /node|npm|yarn|package/i,
    'typescript': /typescript|ts\d+|type\s+annotation/i
  };
  
  Object.entries(patterns).forEach(([tag, pattern]) => {
    if (pattern.test(lowerError)) {
      tags.push(tag);
    }
  });
  
  return tags;
}

/**
 * Normalize error message for comparison
 */
function normalizeErrorMessage(errorMessage) {
  if (!errorMessage) return '';
  
  return errorMessage
    .toLowerCase()
    // Remove line numbers
    .replace(/:\d+:\d+/g, '')
    // Remove file paths
    .replace(/[\/\\][\w\-\.\/\\]+\.(js|ts|jsx|tsx|json)/g, '[FILE]')
    // Remove specific values
    .replace(/'[^']+'/g, "'[VALUE]'")
    .replace(/"[^"]+"/g, '"[VALUE]"')
    // Remove timestamps
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '[TIMESTAMP]')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200);
}

/**
 * Update context bug statistics
 */
function updateContextBugStats(workingDir, providerKey, bug) {
  const context = loadContextSync(workingDir, providerKey);
  if (!context) return;
  
  context.statistics.bugsEncountered++;
  
  // Keep recent bugs in context for quick reference
  if (!context.recentBugs) context.recentBugs = [];
  context.recentBugs.unshift({
    id: bug.id,
    title: bug.title,
    timestamp: bug.createdAt,
    resolved: bug.resolved
  });
  
  // Keep only last 10
  context.recentBugs = context.recentBugs.slice(0, 10);
  
  saveContext(context, workingDir, providerKey);
}

/**
 * Synchronous context load (for internal use)
 */
function loadContextSync(workingDir, providerKey) {
  const dirs = getDirs(providerKey);
  const contextFileName = getContextFileName(providerKey);
  const contextPath = path.join(workingDir, dirs.ROOT, contextFileName);
  
  if (fs.existsSync(contextPath)) {
    try {
      const content = fs.readFileSync(contextPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }
  return null;
}

/**
 * Detect project status from existing files
 */
function detectProjectStatus(context, workingDir, providerKey = DEFAULT_PROVIDER) {
  const dirs = getDirs(providerKey);
  
  const fileChecks = {
    'idea.md': 'hasIdea',
    [`${dirs.PROMPTS}/prompt-generate.md`]: 'hasPromptGenerate',
    [`${dirs.DOCS}/project-request.md`]: 'hasProjectRequest',
    [`${dirs.DOCS}/ai-rules.md`]: 'hasAiRules',
    [`${dirs.DOCS}/spec.md`]: 'hasSpec',
    [`${dirs.DOCS}/implementation-plan.md`]: 'hasImplementationPlan',
    [`${dirs.WORKFLOW}/code-run.md`]: 'hasCodeRun'
  };
  
  Object.entries(fileChecks).forEach(([file, stateKey]) => {
    const filePath = path.join(workingDir, file);
    const exists = fs.existsSync(filePath);
    context.projectState[stateKey] = exists;
    
    if (exists && !context.files.detected.includes(file)) {
      context.files.detected.push(file);
    }
  });
  
  const instructionsPath = path.join(workingDir, dirs.INSTRUCTIONS);
  context.projectState.hasInstructions = fs.existsSync(instructionsPath);
  
  context.projectState.promptPhaseComplete = context.projectState.hasPromptGenerate;
  
  context.projectState.cursorPhaseComplete = 
    context.projectState.hasProjectRequest && 
    context.projectState.hasAiRules && 
    context.projectState.hasSpec && 
    context.projectState.hasImplementationPlan;
  
  context.projectState.buildPhaseComplete = 
    context.projectState.hasCodeRun && 
    context.projectState.hasInstructions;
  
  if (!context.workflow.type) {
    if (context.projectState.hasPromptGenerate) {
      context.workflow.type = 'generate';
    } else if (context.projectState.hasProjectRequest || 
               context.files.generated.some(f => f.includes('step'))) {
      context.workflow.type = 'legacy';
    }
  }
  
  if (context.projectState.buildPhaseComplete) {
    context.workflow.currentPhase = 'development';
  } else if (context.projectState.cursorPhaseComplete) {
    context.workflow.currentPhase = 'build';
  } else if (context.projectState.promptPhaseComplete) {
    context.workflow.currentPhase = 'cursor';
  } else if (context.projectState.hasIdea || context.files.generated.length > 0) {
    context.workflow.currentPhase = 'prompt';
  }
  
  if (context.projectState.hasCodeRun) {
    const codeRunPath = path.join(workingDir, dirs.WORKFLOW, 'code-run.md');
    try {
      const content = fs.readFileSync(codeRunPath, 'utf-8');
      context.development = parseCodeRunProgress(content, context.development);
    } catch (error) {
      // Ignore
    }
  }
  
  return context;
}

/**
 * Parse code-run.md to extract development progress
 */
function parseCodeRunProgress(content, currentDev = {}) {
  const dev = { ...currentDev };
  
  const stepMatches = content.match(/### .* ÉTAPE \d+/g);
  if (stepMatches) {
    dev.totalSteps = stepMatches.length;
  }
  
  const completedMatches = content.match(/### ✅ ÉTAPE \d+/g);
  if (completedMatches) {
    dev.completedSteps = completedMatches.map(m => {
      const num = m.match(/\d+/);
      return num ? parseInt(num[0]) : null;
    }).filter(n => n !== null);
  } else {
    dev.completedSteps = [];
  }
  
  const currentMatch = content.match(/### 🟡 ÉTAPE (\d+)/);
  if (currentMatch) {
    dev.currentStep = parseInt(currentMatch[1]);
  }
  
  if (dev.totalSteps > 0) {
    dev.progress = Math.round((dev.completedSteps.length / dev.totalSteps) * 100);
  }
  
  return dev;
}

/**
 * Save context to file
 */
function saveContext(context, workingDir = process.cwd(), providerKey = null) {
  providerKey = providerKey || context.aiProvider || DEFAULT_PROVIDER;
  
  const dirs = getDirs(providerKey);
  const contextFileName = getContextFileName(providerKey);
  
  const promptDir = path.join(workingDir, dirs.ROOT);
  if (!fs.existsSync(promptDir)) {
    fs.mkdirSync(promptDir, { recursive: true });
  }
  
  const contextPath = path.join(promptDir, contextFileName);
  context.lastUpdated = new Date().toISOString();
  context.aiProvider = providerKey;
  
  context.statistics.filesGenerated = 
    context.files.generated.length + 
    context.files.buildCreated.length;
  
  try {
    fs.writeFileSync(contextPath, JSON.stringify(context, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(chalk.red(`❌ Error saving context: ${error.message}`));
    return false;
  }
}

/**
 * Record a command execution
 */
function recordCommand(context, command, options = {}) {
  context.statistics.totalCommands++;
  context.statistics.lastActivity = new Date().toISOString();
  
  const commandEntry = {
    command,
    options,
    timestamp: new Date().toISOString()
  };
  
  context.statistics.commandHistory.push(commandEntry);
  
  if (context.statistics.commandHistory.length > 50) {
    context.statistics.commandHistory = context.statistics.commandHistory.slice(-50);
  }
  
  context.statistics.estimatedTimeSpent = context.statistics.totalCommands * 5;
  
  return context;
}

/**
 * Track file generation
 */
function trackFile(context, fileName, category = 'generated') {
  if (!context.files[category]) {
    context.files[category] = [];
  }
  
  if (!context.files[category].includes(fileName)) {
    context.files[category].push(fileName);
  }
  
  return context;
}

/**
 * Update workflow phase
 */
function updateWorkflowPhase(context, phase) {
  const validPhases = ['initialization', 'prompt', 'cursor', 'build', 'development'];
  
  if (validPhases.includes(phase)) {
    context.workflow.currentPhase = phase;
    
    if (!context.workflow.completedPhases.includes(phase)) {
      context.workflow.completedPhases.push(phase);
    }
  }
  
  return context;
}

/**
 * Add a note
 */
function addNote(context, note) {
  context.notes.push({
    timestamp: new Date().toISOString(),
    content: note
  });
  
  if (context.notes.length > 50) {
    context.notes = context.notes.slice(-50);
  }
  
  return context;
}

/**
 * Get workflow status summary
 */
function getWorkflowStatus(context) {
  return {
    workflow: context.workflow.type || 'Not started',
    phase: context.workflow.currentPhase,
    progress: {
      prompt: context.projectState.promptPhaseComplete ? '✅' : '⏳',
      cursor: context.projectState.cursorPhaseComplete ? '✅' : '⏳',
      build: context.projectState.buildPhaseComplete ? '✅' : '⏳',
      development: context.development.progress ? `${context.development.progress}%` : '⏳'
    },
    files: {
      total: context.statistics.filesGenerated,
      byCategory: {
        generated: context.files.generated.length,
        cursor: context.files.cursorCreated.length,
        build: context.files.buildCreated.length
      }
    },
    development: context.development,
    lastActivity: context.statistics.lastActivity,
    bugs: {
      encountered: context.statistics.bugsEncountered || 0,
      resolved: context.statistics.bugsResolved || 0
    }
  };
}

/**
 * Migrate old context to new format
 */
function migrateContext(oldContext) {
  const newContext = createContext(oldContext.aiProvider || DEFAULT_PROVIDER);
  
  // Copy existing data
  Object.keys(oldContext).forEach(key => {
    if (newContext.hasOwnProperty(key) && oldContext[key] !== null) {
      if (typeof oldContext[key] === 'object' && !Array.isArray(oldContext[key])) {
        newContext[key] = { ...newContext[key], ...oldContext[key] };
      } else {
        newContext[key] = oldContext[key];
      }
    }
  });
  
  // Ensure new fields exist
  if (!newContext.statistics.bugsEncountered) newContext.statistics.bugsEncountered = 0;
  if (!newContext.statistics.bugsResolved) newContext.statistics.bugsResolved = 0;
  if (!newContext.recentBugs) newContext.recentBugs = [];
  
  newContext.version = '3.0.0';
  
  return newContext;
}

/**
 * Clear context
 */
function clearContext(workingDir = process.cwd(), providerKey = DEFAULT_PROVIDER) {
  const dirs = getDirs(providerKey);
  const contextFileName = getContextFileName(providerKey);
  const contextPath = path.join(workingDir, dirs.ROOT, contextFileName);
  
  if (fs.existsSync(contextPath)) {
    fs.unlinkSync(contextPath);
  }
  return createContext(providerKey);
}

/**
 * Get bug journal summary
 */
function getBugJournalSummary(workingDir, providerKey) {
  const journal = loadBugJournal(workingDir, providerKey);
  
  return {
    totalBugs: journal.statistics.totalBugs,
    resolved: journal.statistics.resolved,
    unresolved: journal.statistics.unresolved,
    mostCommonTags: journal.statistics.mostCommonTags,
    recentBugs: journal.bugs.slice(-5).reverse()
  };
}

// Backward compatibility
function updateState(context, updates) {
  if (updates.projectName) context.projectName = updates.projectName;
  if (updates.outputDir) context.outputDir = updates.outputDir;
  if (updates.lastAction) recordCommand(context, updates.lastAction);
  if (updates.generatedFiles) {
    updates.generatedFiles.forEach(f => trackFile(context, f, 'generated'));
  }
  return context;
}

module.exports = {
  // Main functions
  loadContext,
  saveContext,
  createContext,
  clearContext,
  getContext: loadContext,
  updateContext: saveContext,
  
  // Tracking functions
  recordCommand,
  trackFile,
  updateWorkflowPhase,
  addNote,
  
  // Status functions
  detectProjectStatus,
  getWorkflowStatus,
  
  // Bug journal functions
  loadBugJournal,
  saveBugJournal,
  addBug,
  addSolution,
  addAttempt,
  searchBugs,
  checkKnownSolution,
  getBugJournalSummary,
  
  // Backward compatibility
  updateState,
  recordSession: recordCommand,
  
  // Helpers
  getContextFileName,
  getBugJournalFileName
};
