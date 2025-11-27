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
      if (context.version === '1.0.0') {
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
  
  return context;
}

/**
 * Create a new enhanced context structure
 * @param {string} providerKey - Provider key
 */
function createContext(providerKey = DEFAULT_PROVIDER) {
  return {
    version: '2.0.0',
    aiProvider: providerKey,
    projectName: null,
    outputDir: null,
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    
    // Workflow tracking
    workflow: {
      type: null, // 'generate' or 'legacy'
      currentPhase: 'initialization', // 'initialization', 'prompt', 'cursor', 'build', 'development'
      startedAt: new Date().toISOString(),
      completedPhases: []
    },
    
    // File tracking
    files: {
      generated: [],      // Files created by CLI
      cursorCreated: [],  // Files created by AI
      buildCreated: [],   // Files created by build command
      detected: []        // Files detected but not tracked
    },
    
    // Project state
    projectState: {
      // Files presence
      hasIdea: false,
      hasPromptGenerate: false,
      hasProjectRequest: false,
      hasAiRules: false,
      hasSpec: false,
      hasImplementationPlan: false,
      hasCodeRun: false,
      hasInstructions: false,
      
      // Workflow completion
      promptPhaseComplete: false,
      cursorPhaseComplete: false,
      buildPhaseComplete: false,
      
      // Development tracking
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
      lastActivity: null
    },
    
    // Development progress (from code-run.md)
    development: {
      totalSteps: null,
      completedSteps: [],
      currentStep: null,
      progress: 0,
      estimatedCompletion: null
    },
    
    // Sessions history
    sessions: [],
    
    // Issues and notes
    issues: [],
    notes: []
  };
}

/**
 * Detect project status from existing files
 * @param {Object} context - Context object
 * @param {string} workingDir - Working directory
 * @param {string} providerKey - Provider key
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
  
  // Check individual files
  Object.entries(fileChecks).forEach(([file, stateKey]) => {
    const filePath = path.join(workingDir, file);
    const exists = fs.existsSync(filePath);
    context.projectState[stateKey] = exists;
    
    // Track detected files
    if (exists && !context.files.detected.includes(file)) {
      context.files.detected.push(file);
    }
  });
  
  // Check Instructions directory
  const instructionsPath = path.join(workingDir, dirs.INSTRUCTIONS);
  context.projectState.hasInstructions = fs.existsSync(instructionsPath);
  
  // Detect workflow phases completion
  context.projectState.promptPhaseComplete = context.projectState.hasPromptGenerate;
  
  context.projectState.cursorPhaseComplete = 
    context.projectState.hasProjectRequest && 
    context.projectState.hasAiRules && 
    context.projectState.hasSpec && 
    context.projectState.hasImplementationPlan;
  
  context.projectState.buildPhaseComplete = 
    context.projectState.hasCodeRun && 
    context.projectState.hasInstructions;
  
  // Auto-detect workflow type
  if (!context.workflow.type) {
    if (context.projectState.hasPromptGenerate) {
      context.workflow.type = 'generate';
    } else if (context.projectState.hasProjectRequest || 
               context.files.generated.some(f => f.includes('step'))) {
      context.workflow.type = 'legacy';
    }
  }
  
  // Update current phase
  if (context.projectState.buildPhaseComplete) {
    context.workflow.currentPhase = 'development';
  } else if (context.projectState.cursorPhaseComplete) {
    context.workflow.currentPhase = 'build';
  } else if (context.projectState.promptPhaseComplete) {
    context.workflow.currentPhase = 'cursor';
  } else if (context.projectState.hasIdea || context.files.generated.length > 0) {
    context.workflow.currentPhase = 'prompt';
  }
  
  // Parse code-run.md if exists to get development progress
  if (context.projectState.hasCodeRun) {
    const codeRunPath = path.join(workingDir, dirs.WORKFLOW, 'code-run.md');
    try {
      const content = fs.readFileSync(codeRunPath, 'utf-8');
      context.development = parseCodeRunProgress(content, context.development);
    } catch (error) {
      // Ignore parsing errors
    }
  }
  
  return context;
}

/**
 * Parse code-run.md to extract development progress
 */
function parseCodeRunProgress(content, currentDev = {}) {
  const dev = { ...currentDev };
  
  // Count total steps
  const stepMatches = content.match(/### .* ÉTAPE \d+/g);
  if (stepMatches) {
    dev.totalSteps = stepMatches.length;
  }
  
  // Find completed steps (✅)
  const completedMatches = content.match(/### ✅ ÉTAPE \d+/g);
  if (completedMatches) {
    dev.completedSteps = completedMatches.map(m => {
      const num = m.match(/\d+/);
      return num ? parseInt(num[0]) : null;
    }).filter(n => n !== null);
  }
  
  // Find current step (🟡 En cours)
  const currentMatch = content.match(/### .* ÉTAPE (\d+) .* \(EN COURS\)/);
  if (currentMatch) {
    dev.currentStep = parseInt(currentMatch[1]);
  }
  
  // Calculate progress
  if (dev.totalSteps > 0) {
    dev.progress = Math.round((dev.completedSteps.length / dev.totalSteps) * 100);
  }
  
  return dev;
}

/**
 * Save context to file
 * @param {Object} context - Context object
 * @param {string} workingDir - Working directory
 * @param {string} providerKey - Provider key
 */
function saveContext(context, workingDir = process.cwd(), providerKey = null) {
  // Use provider from context or default
  providerKey = providerKey || context.aiProvider || DEFAULT_PROVIDER;
  
  const dirs = getDirs(providerKey);
  const contextFileName = getContextFileName(providerKey);
  
  // Ensure prompt directory exists
  const promptDir = path.join(workingDir, dirs.ROOT);
  if (!fs.existsSync(promptDir)) {
    fs.mkdirSync(promptDir, { recursive: true });
  }
  
  const contextPath = path.join(promptDir, contextFileName);
  context.lastUpdated = new Date().toISOString();
  context.aiProvider = providerKey;
  
  // Update statistics
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
  // Update statistics
  context.statistics.totalCommands++;
  context.statistics.lastActivity = new Date().toISOString();
  
  // Add to command history
  const commandEntry = {
    command,
    options,
    timestamp: new Date().toISOString()
  };
  
  context.statistics.commandHistory.push(commandEntry);
  
  // Keep only last 20 commands
  if (context.statistics.commandHistory.length > 20) {
    context.statistics.commandHistory = context.statistics.commandHistory.slice(-20);
  }
  
  // Estimate time (5 min per command average)
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
  
  // Keep only last 50 notes
  if (context.notes.length > 50) {
    context.notes = context.notes.slice(-50);
  }
  
  return context;
}

/**
 * Get workflow status summary
 */
function getWorkflowStatus(context) {
  const status = {
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
    lastActivity: context.statistics.lastActivity
  };
  
  return status;
}

/**
 * Migrate old context to new format
 */
function migrateContext(oldContext) {
  const newContext = createContext(oldContext.aiProvider || DEFAULT_PROVIDER);
  
  // Migrate basic info
  newContext.projectName = oldContext.projectName;
  newContext.createdAt = oldContext.createdAt;
  
  // Migrate files
  if (oldContext.currentState?.generatedFiles) {
    newContext.files.generated = oldContext.currentState.generatedFiles;
  }
  
  // Migrate sessions
  if (oldContext.sessions) {
    newContext.sessions = oldContext.sessions;
  }
  
  // Detect workflow type
  if (oldContext.currentState?.lastAction === 'generate') {
    newContext.workflow.type = 'generate';
  }
  
  return newContext;
}

/**
 * Clear context
 * @param {string} workingDir - Working directory
 * @param {string} providerKey - Provider key
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

// Maintain backward compatibility
function updateState(context, updates) {
  // Map old updateState calls to new structure
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
  getContext: loadContext,      // Alias for clarity
  updateContext: saveContext,   // Alias for clarity
  
  // Tracking functions
  recordCommand,
  trackFile,
  updateWorkflowPhase,
  addNote,
  
  // Status functions
  detectProjectStatus,
  getWorkflowStatus,
  
  // Backward compatibility
  updateState,
  recordSession: recordCommand,
  
  // Helpers
  getContextFileName
};
