const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { ensureDirectoryStructure, getFilePath, PROMPTCORE_DIR } = require('./directoryManager');

const CONTEXT_FILE_NAME = '.prompt-cursor-context.json';

/**
 * Load context from file or create new one with auto-detection
 */
function loadContext(workingDir = process.cwd()) {
  const contextPath = path.join(workingDir, PROMPTCORE_DIR, CONTEXT_FILE_NAME);
  
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
      context = createContext();
    }
  } else {
    context = createContext();
  }
  
  // Auto-detect project status from files
  context = detectProjectStatus(context, workingDir);
  
  return context;
}

/**
 * Create a new enhanced context structure
 */
function createContext() {
  return {
    version: '2.0.0',
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
      cursorCreated: [],  // Files created by Cursor AI
      buildCreated: [],   // Files created by build command
      detected: []        // Files detected but not tracked
    },
    
    // Project state
    projectState: {
      // Files presence
      hasIdea: false,
      hasPromptGenerate: false,
      hasProjectRequest: false,
      hasCursorRules: false,
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
 */
function detectProjectStatus(context, workingDir) {
  const fileChecks = {
    'idea.md': 'hasIdea',
    'prompt-generate.md': 'hasPromptGenerate',
    'project-request.md': 'hasProjectRequest',
    '.cursorrules': 'hasCursorRules',
    'spec.md': 'hasSpec',
    'implementation-plan.md': 'hasImplementationPlan',
    'code-run.md': 'hasCodeRun'
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
  const instructionsPath = path.join(workingDir, 'Instructions');
  context.projectState.hasInstructions = fs.existsSync(instructionsPath);
  
  // Detect workflow phases completion
  context.projectState.promptPhaseComplete = context.projectState.hasPromptGenerate;
  
  context.projectState.cursorPhaseComplete = 
    context.projectState.hasProjectRequest && 
    context.projectState.hasCursorRules && 
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
    const codeRunPath = path.join(workingDir, 'code-run.md');
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
 */
function saveContext(context, workingDir = process.cwd()) {
  // Ensure .prompt-cursor directory exists
  if (!fs.existsSync(path.join(workingDir, PROMPTCORE_DIR))) {
    fs.mkdirSync(path.join(workingDir, PROMPTCORE_DIR), { recursive: true });
  }
  
  const contextPath = path.join(workingDir, PROMPTCORE_DIR, CONTEXT_FILE_NAME);
  context.lastUpdated = new Date().toISOString();
  
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
  const newContext = createContext();
  
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
 */
function clearContext(workingDir = process.cwd()) {
  const contextPath = path.join(workingDir, PROMPTCORE_DIR, CONTEXT_FILE_NAME);
  if (fs.existsSync(contextPath)) {
    fs.unlinkSync(contextPath);
  }
  return createContext();
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
  
  // Constants
  CONTEXT_FILE_NAME
};
