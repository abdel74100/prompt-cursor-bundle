const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');
const { getPromptDirectory } = require('./aiProviders');

/**
 * Module definitions for complex projects
 */
const MODULE_DEFINITIONS = {
  frontend: {
    name: 'Frontend',
    icon: '🎨',
    description: 'User interface and client-side logic',
    defaultSteps: 5,
    techStack: ['React', 'Vue', 'Angular', 'Svelte', 'Next.js'],
    directories: ['src/components', 'src/pages', 'src/hooks', 'src/styles']
  },
  backend: {
    name: 'Backend',
    icon: '⚙️',
    description: 'Server-side logic and APIs',
    defaultSteps: 7,
    techStack: ['Node.js', 'Express', 'NestJS', 'Fastify', 'Django', 'FastAPI'],
    directories: ['src/controllers', 'src/services', 'src/models', 'src/routes']
  },
  api: {
    name: 'API',
    icon: '🔌',
    description: 'REST/GraphQL API endpoints',
    defaultSteps: 6,
    techStack: ['REST', 'GraphQL', 'gRPC', 'WebSocket'],
    directories: ['src/api', 'src/graphql', 'src/resolvers']
  },
  database: {
    name: 'Database',
    icon: '🗄️',
    description: 'Data storage and management',
    defaultSteps: 4,
    techStack: ['PostgreSQL', 'MongoDB', 'MySQL', 'Redis', 'Prisma'],
    directories: ['src/database', 'src/migrations', 'src/seeds']
  },
  infra: {
    name: 'Infrastructure',
    icon: '☁️',
    description: 'Cloud infrastructure and DevOps',
    defaultSteps: 3,
    techStack: ['AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform'],
    directories: ['infra', 'terraform', 'docker', 'k8s']
  },
  mobile: {
    name: 'Mobile',
    icon: '📱',
    description: 'Mobile application',
    defaultSteps: 5,
    techStack: ['React Native', 'Flutter', 'Swift', 'Kotlin'],
    directories: ['mobile/src', 'mobile/components', 'mobile/screens']
  },
  auth: {
    name: 'Authentication',
    icon: '🔐',
    description: 'Authentication and authorization',
    defaultSteps: 4,
    techStack: ['JWT', 'OAuth2', 'Passport', 'Auth0'],
    directories: ['src/auth', 'src/middleware']
  },
  testing: {
    name: 'Testing',
    icon: '🧪',
    description: 'Test suites and quality assurance',
    defaultSteps: 3,
    techStack: ['Jest', 'Cypress', 'Playwright', 'Vitest'],
    directories: ['tests', 'cypress', 'e2e']
  }
};

/**
 * Module Manager
 * Handles multi-module project structure
 */
class ModuleManager {
  constructor(projectDir, aiProvider = 'cursor') {
    this.projectDir = projectDir;
    this.aiProvider = aiProvider;
    this.promptDir = getPromptDirectory(aiProvider);
    this.modules = new Map();
    this.moduleSteps = new Map();
  }

  /**
   * Get available module definitions
   * @returns {Object} Module definitions
   */
  static getModuleDefinitions() {
    return MODULE_DEFINITIONS;
  }

  /**
   * Get module choices for CLI prompt
   * @returns {Object[]} Choices array for inquirer
   */
  static getModuleChoices() {
    return Object.entries(MODULE_DEFINITIONS).map(([key, config]) => ({
      name: `${config.icon} ${config.name} - ${config.description}`,
      value: key,
      short: config.name
    }));
  }

  /**
   * Initialize modules for a project
   * @param {string[]} moduleKeys - Array of module keys to initialize
   * @returns {Map} Initialized modules
   */
  initializeModules(moduleKeys) {
    for (const key of moduleKeys) {
      const definition = MODULE_DEFINITIONS[key];
      if (definition) {
        this.modules.set(key, {
          ...definition,
          key: key,
          steps: [],
          progress: 0,
          status: 'pending',
          completedSteps: []
        });
      }
    }
    return this.modules;
  }

  /**
   * Assign steps to modules
   * @param {Object[]} steps - All project steps
   * @param {Object} assignments - Step to module assignments {stepNumber: moduleKey}
   */
  assignStepsToModules(steps, assignments = {}) {
    // Auto-assign if no assignments provided
    if (Object.keys(assignments).length === 0) {
      assignments = this.autoAssignSteps(steps);
    }

    // Clear existing steps
    for (const module of this.modules.values()) {
      module.steps = [];
    }

    // Assign steps
    for (const step of steps) {
      const moduleKey = assignments[step.number];
      if (moduleKey && this.modules.has(moduleKey)) {
        this.modules.get(moduleKey).steps.push(step);
      }
    }

    return this.modules;
  }

  /**
   * Auto-assign steps to modules based on step names/content
   * @param {Object[]} steps - Steps to assign
   * @returns {Object} Assignments
   */
  autoAssignSteps(steps) {
    const assignments = {};
    const keywords = {
      frontend: ['ui', 'component', 'page', 'style', 'css', 'react', 'vue', 'interface', 'layout'],
      backend: ['server', 'controller', 'service', 'middleware', 'route', 'express', 'nest'],
      api: ['api', 'endpoint', 'rest', 'graphql', 'request', 'response'],
      database: ['database', 'db', 'schema', 'migration', 'model', 'prisma', 'mongo', 'sql'],
      infra: ['deploy', 'docker', 'kubernetes', 'aws', 'cloud', 'ci', 'cd', 'terraform'],
      auth: ['auth', 'login', 'register', 'jwt', 'oauth', 'permission', 'role'],
      testing: ['test', 'spec', 'cypress', 'jest', 'e2e', 'unit']
    };

    for (const step of steps) {
      const stepText = `${step.name} ${step.objective || ''}`.toLowerCase();
      let bestMatch = null;
      let bestScore = 0;

      for (const [moduleKey, moduleKeywords] of Object.entries(keywords)) {
        if (!this.modules.has(moduleKey)) continue;

        const score = moduleKeywords.filter(kw => stepText.includes(kw)).length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = moduleKey;
        }
      }

      // Default to first module if no match
      if (!bestMatch && this.modules.size > 0) {
        bestMatch = this.modules.keys().next().value;
      }

      if (bestMatch) {
        assignments[step.number] = bestMatch;
      }
    }

    return assignments;
  }

  /**
   * Update module progress
   * @param {number[]} completedSteps - Completed step numbers
   */
  updateProgress(completedSteps = []) {
    for (const module of this.modules.values()) {
      const moduleStepNums = module.steps.map(s => s.number);
      module.completedSteps = moduleStepNums.filter(n => completedSteps.includes(n));
      module.progress = moduleStepNums.length > 0
        ? Math.round((module.completedSteps.length / moduleStepNums.length) * 100)
        : 0;
      
      if (module.progress === 100) {
        module.status = 'completed';
      } else if (module.progress > 0) {
        module.status = 'in_progress';
      } else {
        module.status = 'pending';
      }
    }
  }

  /**
   * Get overall project progress
   * @returns {number} Progress percentage
   */
  getOverallProgress() {
    let totalSteps = 0;
    let completedSteps = 0;

    for (const module of this.modules.values()) {
      totalSteps += module.steps.length;
      completedSteps += module.completedSteps.length;
    }

    return totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  }

  /**
   * Create module directory structure
   * @returns {Promise<string[]>} Created directories
   */
  async createDirectoryStructure() {
    const created = [];
    const modulesDir = path.join(this.projectDir, this.promptDir, 'modules');

    // Create modules base directory
    await fs.mkdir(modulesDir, { recursive: true });
    created.push(modulesDir);

    // Create directory for each module
    for (const [key, module] of this.modules) {
      const moduleDir = path.join(modulesDir, key);
      const workflowDir = path.join(moduleDir, 'workflow');
      const instructionsDir = path.join(moduleDir, 'Instructions');

      await fs.mkdir(moduleDir, { recursive: true });
      await fs.mkdir(workflowDir, { recursive: true });
      await fs.mkdir(instructionsDir, { recursive: true });

      created.push(moduleDir, workflowDir, instructionsDir);
    }

    return created;
  }

  /**
   * Generate module-specific code-run.md
   * @param {string} moduleKey - Module key
   * @returns {string} Markdown content
   */
  generateModuleCodeRun(moduleKey) {
    const module = this.modules.get(moduleKey);
    if (!module) return '';

    const lines = [];
    lines.push(`# ${module.icon} ${module.name} - Code Run\n`);
    lines.push(`> ${module.description}\n`);
    lines.push('---\n');
    lines.push('## 📋 ÉTAPES DE DÉVELOPPEMENT\n');

    for (let i = 0; i < module.steps.length; i++) {
      const step = module.steps[i];
      const stepNum = i + 1;
      const isFirst = i === 0;
      const isCompleted = module.completedSteps.includes(step.number);
      const isCurrent = !isCompleted && (i === 0 || module.completedSteps.includes(module.steps[i - 1]?.number));

      const icon = isCompleted ? '✅' : isCurrent ? '🟡' : '⏳';
      const status = isCompleted ? '✅ Terminée' : isCurrent ? '🟡 En cours' : '⚪ En attente';

      lines.push(`### ${icon} ÉTAPE ${stepNum} : ${step.name}\n`);
      lines.push(`**Status:** ${status}`);
      lines.push(`**Global Step:** ${step.number}`);
      lines.push(`**Précondition:** ${isFirst ? 'Aucune' : `Étape ${stepNum - 1} terminée`}`);
      lines.push(`**Documentation:** \`Instructions/instructions-step${stepNum}.md\`\n`);
      lines.push('**TODO :**');
      lines.push(`- [ ] Voir détails dans \`Instructions/instructions-step${stepNum}.md\`\n`);
      lines.push('---\n');
    }

    lines.push('## 📊 STATISTIQUES\n');
    lines.push(`- **Étapes totales:** ${module.steps.length}`);
    lines.push(`- **Étapes terminées:** ${module.completedSteps.length}`);
    lines.push(`- **Progression:** ${module.progress}%\n`);

    return lines.join('\n');
  }

  /**
   * Generate master code-run.md with all modules
   * @returns {string} Markdown content
   */
  generateMasterCodeRun() {
    const lines = [];
    lines.push('# 📦 Master Code Run - Multi-Module Project\n');
    lines.push('---\n');
    lines.push('## 🗂️ MODULES\n');

    for (const [key, module] of this.modules) {
      const statusIcon = module.status === 'completed' ? '✅' : 
                        module.status === 'in_progress' ? '🟡' : '⏳';
      
      lines.push(`### ${module.icon} ${module.name}`);
      lines.push(`**Status:** ${statusIcon} ${module.progress}% complete`);
      lines.push(`**Steps:** ${module.completedSteps.length}/${module.steps.length}`);
      lines.push(`**Code Run:** \`modules/${key}/workflow/code-run.md\`\n`);
    }

    lines.push('---\n');
    lines.push('## 📊 OVERALL PROGRESS\n');
    lines.push(`**Total Progress:** ${this.getOverallProgress()}%\n`);

    // Progress bars for each module
    for (const [key, module] of this.modules) {
      const bar = this.createProgressBar(module.progress, 20);
      lines.push(`${module.icon} ${module.name.padEnd(15)} ${bar} ${module.progress}%`);
    }

    lines.push('\n---\n');
    lines.push('## 🔄 WORKFLOW\n');
    lines.push('1. Check each module\'s code-run.md');
    lines.push('2. Complete steps in dependency order');
    lines.push('3. Run `prompt-cursor complete` after each step');
    lines.push('4. Check master progress here\n');

    return lines.join('\n');
  }

  /**
   * Create progress bar
   * @param {number} percentage - Progress percentage
   * @param {number} width - Bar width
   * @returns {string} Progress bar
   */
  createProgressBar(percentage, width = 20) {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Generate ASCII summary for dashboard
   * @returns {string} ASCII visualization
   */
  toAscii() {
    const lines = [];
    lines.push('');
    lines.push('┌─────────────────────────────────────────────────────────┐');
    lines.push('│  📦 MODULES                                             │');
    lines.push('├─────────────────────────────────────────────────────────┤');

    for (const [key, module] of this.modules) {
      const statusIcon = module.status === 'completed' ? '✅' : 
                        module.status === 'in_progress' ? '🟡' : '⏳';
      const bar = this.createProgressBar(module.progress, 15);
      const name = `${module.icon} ${module.name}`.padEnd(20);
      const stats = `[${module.completedSteps.length}/${module.steps.length}]`.padStart(6);

      lines.push(`│  ${statusIcon} ${name} ${bar} ${module.progress.toString().padStart(3)}% ${stats} │`);
    }

    lines.push('├─────────────────────────────────────────────────────────┤');
    const overall = this.getOverallProgress();
    const overallBar = this.createProgressBar(overall, 25);
    lines.push(`│  📊 Overall: ${overallBar} ${overall}%           │`);
    lines.push('└─────────────────────────────────────────────────────────┘');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Save modules configuration
   * @returns {Promise<void>}
   */
  async saveConfig() {
    const configPath = path.join(this.projectDir, this.promptDir, 'modules-config.json');
    const config = {
      modules: Array.from(this.modules.entries()).map(([key, module]) => ({
        key,
        name: module.name,
        steps: module.steps.map(s => s.number),
        completedSteps: module.completedSteps,
        progress: module.progress,
        status: module.status
      })),
      lastUpdated: new Date().toISOString()
    };

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }

  /**
   * Load modules configuration
   * @returns {Promise<boolean>} Success
   */
  async loadConfig() {
    try {
      const configPath = path.join(this.projectDir, this.promptDir, 'modules-config.json');
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);

      for (const moduleConfig of config.modules) {
        if (this.modules.has(moduleConfig.key)) {
          const module = this.modules.get(moduleConfig.key);
          module.completedSteps = moduleConfig.completedSteps || [];
          module.progress = moduleConfig.progress || 0;
          module.status = moduleConfig.status || 'pending';
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = ModuleManager;

