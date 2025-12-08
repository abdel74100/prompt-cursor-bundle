const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { getProvider, getProviderDirs, getPromptDirectory } = require('./aiProviders');

/**
 * Default directory (cursor) for backward compatibility
 */
const DEFAULT_PROVIDER = 'cursor';

/**
 * Get directory structure for a provider
 * @param {string} providerKey - Provider key (cursor, claude, windsurf, copilot)
 * @returns {Object} Directory paths
 */
function getDirs(providerKey = DEFAULT_PROVIDER) {
  return getProviderDirs(providerKey);
}

/**
 * File paths mapping (dynamic based on provider)
 * @param {string} providerKey - Provider key
 * @returns {Object} File paths
 */
function getFilePaths(providerKey = DEFAULT_PROVIDER) {
  const dirs = getDirs(providerKey);
  const provider = getProvider(providerKey);
  
  return {
    // Context file
    CONTEXT: path.join(dirs.ROOT, `.${providerKey}-context.json`),
    
    // Prompts
    PROMPT_GENERATE: path.join(dirs.PROMPTS, 'prompt-generate.md'),
    STEP1_PROMPT: path.join(dirs.PROMPTS, 'step1-prompt.md'),
    STEP2_PROMPT: path.join(dirs.PROMPTS, 'step2-prompt.md'),
    STEP3_PROMPT: path.join(dirs.PROMPTS, 'step3-prompt.md'),
    STEP4_PROMPT: path.join(dirs.PROMPTS, 'step4-prompt.md'),
    
    // Documentation (from AI)
    PROJECT_REQUEST: path.join(dirs.DOCS, 'project-request.md'),
    AI_RULES_DOC: path.join(dirs.DOCS, 'ai-rules.md'),
    SPEC: path.join(dirs.DOCS, 'spec.md'),
    IMPLEMENTATION_PLAN: path.join(dirs.DOCS, 'implementation-plan.md'),
    
    // Workflow
    CODE_RUN: path.join(dirs.WORKFLOW, 'code-run.md'),
    
    // Root files (depends on provider)
    RULES_FILE: provider.rulesFile
  };
}

/**
 * Ensure directory structure exists
 * @param {string} projectDir - Project directory path
 * @param {string} providerKey - Provider key
 * @param {Object} options - Optional configuration
 * @param {boolean} options.skipInstructions - Skip creating Instructions folder in workflow
 */
async function ensureDirectoryStructure(projectDir, providerKey = DEFAULT_PROVIDER, options = {}) {
  const dirs = getDirs(providerKey);
  
  const dirsToCreate = [
    path.join(projectDir, dirs.ROOT),
    path.join(projectDir, dirs.PROMPTS),
    path.join(projectDir, dirs.DOCS),
    path.join(projectDir, dirs.WORKFLOW)
  ];
  
  // Only create Instructions folder if not skipped
  // (in complex mode with modules, each module has its own Instructions)
  if (!options.skipInstructions) {
    dirsToCreate.push(path.join(projectDir, dirs.INSTRUCTIONS));
  }
  
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
 * @param {string} providerKey - Provider key
 * @returns {string} Full file path
 */
function getFilePath(projectDir, fileKey, providerKey = DEFAULT_PROVIDER) {
  const filePaths = getFilePaths(providerKey);
  const relativePath = filePaths[fileKey];
  if (!relativePath) {
    throw new Error(`Unknown file key: ${fileKey}`);
  }
  return path.join(projectDir, relativePath);
}

/**
 * Clean up prompt directory
 * @param {string} projectDir - Project directory
 * @param {string} providerKey - Provider key
 * @param {boolean} keepContext - Whether to keep context file
 */
async function cleanDirectory(projectDir, providerKey = DEFAULT_PROVIDER, keepContext = false) {
  const dirs = getDirs(providerKey);
  const promptDir = path.join(projectDir, dirs.ROOT);
  
  try {
    const stats = await fs.stat(promptDir);
    if (!stats.isDirectory()) {
      return false;
    }
    
    if (keepContext) {
      // Save context file
      const contextPath = path.join(promptDir, `.${providerKey}-context.json`);
      let contextData = null;
      try {
        contextData = await fs.readFile(contextPath, 'utf-8');
      } catch (e) {
        // Context doesn't exist
      }
      
      // Remove directory
      await fs.rm(promptDir, { recursive: true, force: true });
      
      // Recreate with context if it existed
      if (contextData) {
        await ensureDirectoryStructure(projectDir, providerKey);
        await fs.writeFile(contextPath, contextData);
      }
    } else {
      // Remove everything
      await fs.rm(promptDir, { recursive: true, force: true });
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
 * Check if prompt directory exists
 * @param {string} projectDir - Project directory
 * @param {string} providerKey - Provider key
 * @returns {boolean}
 */
async function promptDirExists(projectDir, providerKey = DEFAULT_PROVIDER) {
  const dirs = getDirs(providerKey);
  try {
    const stats = await fs.stat(path.join(projectDir, dirs.ROOT));
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
}

/**
 * Detect which provider directory exists in project
 * @param {string} projectDir - Project directory
 * @returns {string|null} Provider key or null
 */
async function detectProvider(projectDir) {
  const providers = ['cursor', 'claude', 'windsurf', 'copilot'];
  
  for (const provider of providers) {
    if (await promptDirExists(projectDir, provider)) {
      return provider;
    }
  }
  
  return null;
}

/**
 * Get directory info for display
 * @param {string} projectDir - Project directory
 * @param {string} providerKey - Provider key
 * @returns {object} Directory information
 */
async function getDirectoryInfo(projectDir, providerKey = DEFAULT_PROVIDER) {
  const dirs = getDirs(providerKey);
  const info = {
    exists: false,
    provider: providerKey,
    directory: dirs.ROOT,
    prompts: { count: 0, files: [] },
    docs: { count: 0, files: [] },
    workflow: { count: 0, files: [] },
    instructions: { count: 0, files: [] },
    totalSize: 0
  };
  
  try {
    info.exists = await promptDirExists(projectDir, providerKey);
    if (!info.exists) return info;
    
    // Count files in each directory
    const directories = [
      { key: 'prompts', path: path.join(projectDir, dirs.PROMPTS) },
      { key: 'docs', path: path.join(projectDir, dirs.DOCS) },
      { key: 'workflow', path: path.join(projectDir, dirs.WORKFLOW) },
      { key: 'instructions', path: path.join(projectDir, dirs.INSTRUCTIONS) }
    ];
    
    for (const dir of directories) {
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
 * @param {string} providerKey - Provider key
 */
async function displayStructure(projectDir, providerKey = DEFAULT_PROVIDER) {
  const info = await getDirectoryInfo(projectDir, providerKey);
  const dirs = getDirs(providerKey);
  const provider = getProvider(providerKey);
  
  if (!info.exists) {
    console.log(chalk.yellow(`📁 ${dirs.ROOT}/ directory not found`));
    return;
  }
  
  console.log(chalk.cyan(`\n📁 ${dirs.ROOT}/ Structure (${provider.icon} ${provider.name}):`));
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
  
  console.log(chalk.gray('└── ') + `.${providerKey}-context.json\n`);
}

module.exports = {
  DEFAULT_PROVIDER,
  getDirs,
  getFilePaths,
  ensureDirectoryStructure,
  getFilePath,
  cleanDirectory,
  promptDirExists,
  detectProvider,
  getDirectoryInfo,
  displayStructure
};
