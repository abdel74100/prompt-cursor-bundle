const path = require('path');

/**
 * AI Providers Configuration
 * Defines rules file names and locations for each AI assistant
 */
// Universal AI directory - same for all providers
const AI_DIRECTORY = '.ai';

const AI_PROVIDERS = {
  cursor: {
    name: 'Cursor',
    rulesFile: '.cursorrules',
    rulesLocation: 'root',
    directory: AI_DIRECTORY,
    description: 'Cursor AI IDE',
    icon: '🎯'
  },
  claude: {
    name: 'Claude',
    rulesFile: 'CLAUDE.md',
    rulesLocation: 'root',
    directory: AI_DIRECTORY,
    description: 'Anthropic Claude (claude.ai)',
    icon: '🤖'
  },
  windsurf: {
    name: 'Windsurf',
    rulesFile: '.windsurfrules',
    rulesLocation: 'root',
    directory: AI_DIRECTORY,
    description: 'Windsurf AI IDE',
    icon: '🏄'
  },
  copilot: {
    name: 'GitHub Copilot',
    rulesFile: 'copilot-instructions.md',
    rulesLocation: '.github',
    directory: AI_DIRECTORY,
    description: 'GitHub Copilot',
    icon: '🐙'
  }
};

/**
 * Get provider configuration by name
 * @param {string} name - Provider name (cursor, claude, windsurf, copilot)
 * @returns {Object} Provider configuration
 */
function getProvider(name) {
  return AI_PROVIDERS[name?.toLowerCase()] || AI_PROVIDERS.cursor;
}

/**
 * Get all available providers
 * @returns {string[]} Array of provider keys
 */
function getAllProviders() {
  return Object.keys(AI_PROVIDERS);
}

/**
 * Get choices for inquirer prompt
 * @returns {Array} Formatted choices for inquirer
 */
function getProviderChoices() {
  return Object.entries(AI_PROVIDERS).map(([key, config]) => ({
    name: `${config.icon} ${config.name}`,
    value: key
  }));
}

/**
 * Get the full path for the rules file
 * @param {string} providerName - Provider name
 * @param {string} projectDir - Project directory
 * @returns {string} Full path to rules file
 */
function getRulesPath(providerName, projectDir) {
  const config = getProvider(providerName);
  if (config.rulesLocation === 'root') {
    return path.join(projectDir, config.rulesFile);
  }
  return path.join(projectDir, config.rulesLocation, config.rulesFile);
}

/**
 * Get the directory for the rules file (if not root)
 * @param {string} providerName - Provider name
 * @param {string} projectDir - Project directory
 * @returns {string|null} Directory path or null if root
 */
function getRulesDir(providerName, projectDir) {
  const config = getProvider(providerName);
  if (config.rulesLocation === 'root') {
    return null;
  }
  return path.join(projectDir, config.rulesLocation);
}

/**
 * Get the prompt directory name for a provider
 * @param {string} providerName - Provider key (cursor, claude, etc.)
 * @returns {string} Directory name (e.g., .prompt-cursor)
 */
function getPromptDirectory(providerName) {
  const config = getProvider(providerName);
  return config.directory;
}

/**
 * Get directory structure for a provider
 * @param {string} providerName - Provider key
 * @returns {Object} Directory paths
 */
function getProviderDirs(providerName) {
  const baseDir = AI_DIRECTORY;
  return {
    ROOT: baseDir,
    PROMPTS: path.join(baseDir, 'prompts'),
    DOCS: path.join(baseDir, 'docs'),
    STEPS: path.join(baseDir, 'steps'),
    RULES: path.join(baseDir, 'rules'),
    // Legacy paths for backward compatibility
    WORKFLOW: path.join(baseDir, 'workflow'),
    INSTRUCTIONS: path.join(baseDir, 'workflow', 'Instructions')
  };
}

module.exports = {
  AI_PROVIDERS,
  getProvider,
  getAllProviders,
  getProviderChoices,
  getRulesPath,
  getRulesDir,
  getPromptDirectory,
  getProviderDirs
};

