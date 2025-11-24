const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

/**
 * Directory structure for Prompt Cursor Bundle
 */
const PROMPTCORE_DIR = '.promptcore';
const DIRS = {
  ROOT: PROMPTCORE_DIR,
  PROMPTS: path.join(PROMPTCORE_DIR, 'prompts'),
  DOCS: path.join(PROMPTCORE_DIR, 'docs'),
  WORKFLOW: path.join(PROMPTCORE_DIR, 'workflow'),
  INSTRUCTIONS: path.join(PROMPTCORE_DIR, 'workflow', 'Instructions')
};

/**
 * File paths mapping
 */
const FILE_PATHS = {
  // Context file
  CONTEXT: path.join(PROMPTCORE_DIR, '.promptcore-context.json'),
  
  // Prompts
  PROMPT_GENERATE: path.join(DIRS.PROMPTS, 'prompt-generate.md'),
  STEP1_PROMPT: path.join(DIRS.PROMPTS, 'step1-prompt.md'),
  STEP2_PROMPT: path.join(DIRS.PROMPTS, 'step2-prompt.md'),
  STEP3_PROMPT: path.join(DIRS.PROMPTS, 'step3-prompt.md'),
  STEP4_PROMPT: path.join(DIRS.PROMPTS, 'step4-prompt.md'),
  
  // Documentation (from Cursor)
  PROJECT_REQUEST: path.join(DIRS.DOCS, 'project-request.md'),
  CURSOR_RULES_DOC: path.join(DIRS.DOCS, 'cursor-rules.md'),
  SPEC: path.join(DIRS.DOCS, 'spec.md'),
  IMPLEMENTATION_PLAN: path.join(DIRS.DOCS, 'implementation-plan.md'),
  
  // Workflow
  CODE_RUN: path.join(DIRS.WORKFLOW, 'code-run.md'),
  
  // Root files (need to be at root for Cursor)
  CURSORRULES: '.cursorrules'
};

/**
 * Ensure directory structure exists
 * @param {string} projectDir - Project directory path
 */
async function ensureDirectoryStructure(projectDir) {
  const dirsToCreate = [
    path.join(projectDir, DIRS.ROOT),
    path.join(projectDir, DIRS.PROMPTS),
    path.join(projectDir, DIRS.DOCS),
    path.join(projectDir, DIRS.WORKFLOW),
    path.join(projectDir, DIRS.INSTRUCTIONS)
  ];
  
  for (const dir of dirsToCreate) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
}

/**
 * Get full path for a file
 * @param {string} projectDir - Project directory
 * @param {string} fileKey - Key from FILE_PATHS
 * @returns {string} Full file path
 */
function getFilePath(projectDir, fileKey) {
  const relativePath = FILE_PATHS[fileKey];
  if (!relativePath) {
    throw new Error(`Unknown file key: ${fileKey}`);
  }
  return path.join(projectDir, relativePath);
}

/**
 * Clean up .promptcore directory
 * @param {string} projectDir - Project directory
 * @param {boolean} keepContext - Whether to keep context file
 */
async function cleanDirectory(projectDir, keepContext = false) {
  const promptcoreDir = path.join(projectDir, PROMPTCORE_DIR);
  
  try {
    const stats = await fs.stat(promptcoreDir);
    if (!stats.isDirectory()) {
      return false;
    }
    
    if (keepContext) {
      // Save context file
      const contextPath = path.join(promptcoreDir, '.promptcore-context.json');
      let contextData = null;
      try {
        contextData = await fs.readFile(contextPath, 'utf-8');
      } catch (e) {
        // Context doesn't exist
      }
      
      // Remove directory
      await fs.rm(promptcoreDir, { recursive: true, force: true });
      
      // Recreate with context if it existed
      if (contextData) {
        await ensureDirectoryStructure(projectDir);
        await fs.writeFile(contextPath, contextData);
      }
    } else {
      // Remove everything
      await fs.rm(promptcoreDir, { recursive: true, force: true });
    }
    
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/**
 * Check if .promptcore directory exists
 * @param {string} projectDir - Project directory
 * @returns {boolean}
 */
async function promptcoreExists(projectDir) {
  try {
    const stats = await fs.stat(path.join(projectDir, PROMPTCORE_DIR));
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
}

/**
 * Get directory info for display
 * @param {string} projectDir - Project directory
 * @returns {object} Directory information
 */
async function getDirectoryInfo(projectDir) {
  const info = {
    exists: false,
    prompts: { count: 0, files: [] },
    docs: { count: 0, files: [] },
    workflow: { count: 0, files: [] },
    instructions: { count: 0, files: [] },
    totalSize: 0
  };
  
  try {
    info.exists = await promptcoreExists(projectDir);
    if (!info.exists) return info;
    
    // Count files in each directory
    const dirs = [
      { key: 'prompts', path: path.join(projectDir, DIRS.PROMPTS) },
      { key: 'docs', path: path.join(projectDir, DIRS.DOCS) },
      { key: 'workflow', path: path.join(projectDir, DIRS.WORKFLOW) },
      { key: 'instructions', path: path.join(projectDir, DIRS.INSTRUCTIONS) }
    ];
    
    for (const dir of dirs) {
      try {
        const files = await fs.readdir(dir.path);
        const validFiles = files.filter(f => !f.startsWith('.') && f.endsWith('.md'));
        info[dir.key].count = validFiles.length;
        info[dir.key].files = validFiles;
      } catch (e) {
        // Directory doesn't exist
      }
    }
    
    return info;
  } catch (error) {
    return info;
  }
}

/**
 * Display directory structure
 * @param {string} projectDir - Project directory
 */
async function displayStructure(projectDir) {
  const info = await getDirectoryInfo(projectDir);
  
  if (!info.exists) {
    console.log(chalk.yellow('📁 .promptcore/ directory not found'));
    return;
  }
  
  console.log(chalk.cyan('\n📁 .promptcore/ Structure:'));
  console.log(chalk.gray('├── ') + chalk.blue('prompts/') + chalk.gray(` (${info.prompts.count} files)`));
  info.prompts.files.forEach(f => {
    console.log(chalk.gray('│   ├── ') + f);
  });
  
  console.log(chalk.gray('├── ') + chalk.blue('docs/') + chalk.gray(` (${info.docs.count} files)`));
  info.docs.files.forEach(f => {
    console.log(chalk.gray('│   ├── ') + f);
  });
  
  console.log(chalk.gray('├── ') + chalk.blue('workflow/') + chalk.gray(` (${info.workflow.count} files)`));
  info.workflow.files.forEach(f => {
    if (f !== 'Instructions') {
      console.log(chalk.gray('│   ├── ') + f);
    }
  });
  
  if (info.instructions.count > 0) {
    console.log(chalk.gray('│   └── ') + chalk.blue('Instructions/') + chalk.gray(` (${info.instructions.count} files)`));
    info.instructions.files.forEach((f, i) => {
      const isLast = i === info.instructions.files.length - 1;
      console.log(chalk.gray('│       ' + (isLast ? '└── ' : '├── ')) + f);
    });
  }
  
  console.log(chalk.gray('└── ') + '.promptcore-context.json\n');
}

module.exports = {
  PROMPTCORE_DIR,
  DIRS,
  FILE_PATHS,
  ensureDirectoryStructure,
  getFilePath,
  cleanDirectory,
  promptcoreExists,
  getDirectoryInfo,
  displayStructure
};


