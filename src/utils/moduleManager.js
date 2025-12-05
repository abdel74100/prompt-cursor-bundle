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
 * Module dependencies - defines the order of development
 * A module can only start after its dependencies are complete
 */
const MODULE_DEPENDENCIES = {
  'infra': [],                    // First - project setup, no dependencies
  'database': ['infra'],          // After infra - needs project structure
  'auth': ['database'],           // After database - needs user tables
  'backend': ['database', 'auth'], // After db + auth
  'api': ['backend'],             // After backend - exposes services
  'frontend': ['auth'],           // After auth - needs auth flow
  'mobile': ['auth', 'api'],      // After auth + api
  'testing': ['backend', 'frontend'] // After features are built
};

/**
 * Module processing order (priority - lower = first)
 */
const MODULE_PRIORITY = {
  'infra': 1,      // Setup first
  'database': 2,   // Then database
  'auth': 3,       // Then auth
  'backend': 4,    // Then backend logic
  'api': 5,        // Then API layer
  'frontend': 6,   // Then UI
  'mobile': 7,     // Then mobile
  'testing': 8     // Finally tests
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
   * Enhanced V2: Support multi-module assignment (step can belong to multiple modules)
   * @param {Object[]} steps - All project steps
   * @param {Object} assignments - Step to module assignments {stepNumber: moduleKey or [moduleKey1, moduleKey2]}
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

    // Assign steps - support multi-module
    for (const step of steps) {
      const moduleAssignment = assignments[step.number];
      if (!moduleAssignment) continue;
      
      // Handle both single module and array of modules
      const moduleKeys = Array.isArray(moduleAssignment) ? moduleAssignment : [moduleAssignment];
      
      for (const moduleKey of moduleKeys) {
        if (this.modules.has(moduleKey)) {
          this.modules.get(moduleKey).steps.push(step);
        }
      }
    }

    return this.modules;
  }

  /**
   * Auto-assign steps to modules based on step names/content
   * Enhanced V3: Support multi-module assignment
   * @param {Object[]} steps - Steps to assign
   * @returns {Object} Assignments - {stepNumber: moduleKey} or {stepNumber: [moduleKey1, moduleKey2]}
   */
  autoAssignSteps(steps) {
    const assignments = {};
    
    // Enhanced keywords with weighted scores
    const keywords = {
      backend: {
        high: ['nestjs', 'backend', 'controller', 'service', 'module.ts', 'gateway', 
               'apps/api', 'api/src', '.service.ts', '.controller.ts', 'pricing module',
               'rides module', 'admin module', 'users module', 'drivers module',
               'matching algorithm', 'stripe integration backend', 'admin backend',
               'websocket gateway', 'driver registration backend'],
        medium: ['server', 'middleware', 'route', 'express', 'endpoint'],
        low: ['webhook']
      },
      frontend: {
        high: ['frontend', 'ui', 'page.tsx', 'component.tsx', 'dashboard ui', 
               'booking ui', 'payment ui', 'registration ui', 'apps/web', 
               'web/app', 'form.tsx', 'modal.tsx', 'shadcn', 'interface'],
        medium: ['react', 'next.js', 'tailwind', 'component', 'page'],
        low: ['style', 'css', 'layout']
      },
      api: {
        high: ['api endpoint', 'rest api', 'graphql', 'api route', 'route.ts'],
        medium: ['api', 'endpoint'],
        low: []
      },
      infra: {
        high: ['terraform', 'infrastructure', 'ci/cd', 'pipeline', 'monitoring',
               'alerting', 'performance optimization', 'security audit', 
               'docker environment', 'docker configuration', 'production deployment'],
        medium: ['docker', 'kubernetes', 'aws', 'deploy', 'cloud'],
        low: ['build', 'config']
      },
      auth: {
        high: ['auth module', 'authentication', 'jwt strategy', 'auth middleware',
               'protected routes', 'auth tests', 'create auth', 'nextauth'],
        medium: ['auth', 'login', 'passport', 'guard'],
        low: ['permission', 'role', 'session']
      },
      database: {
        high: ['setup database', 'prisma schema', 'migration', 'database schema', 'database setup'],
        medium: ['database', 'prisma', 'postgresql', 'mongodb'],
        low: ['db', 'schema', 'seed']
      },
      testing: {
        high: ['e2e testing', 'write tests', 'auth tests', 'cypress', 'unit tests', 'e2e tests'],
        medium: ['test', 'spec.ts', 'playwright', 'jest'],
        low: ['unit', 'coverage']
      }
    };

    for (const step of steps) {
      // First check if step already has module(s) assigned from parser
      if (step.module) {
        const moduleKeys = Array.isArray(step.module) ? step.module : [step.module];
        // Filter to only modules that exist
        const validModules = moduleKeys.filter(k => this.modules.has(k));
        if (validModules.length > 0) {
          // Store all valid modules for this step
          assignments[step.number] = validModules.length === 1 ? validModules[0] : validModules;
          continue;
        }
      }
      
      const stepText = `${step.name} ${step.objective || ''}`.toLowerCase();
      const scores = {};

      for (const [moduleKey, keywordGroups] of Object.entries(keywords)) {
        if (!this.modules.has(moduleKey)) continue;

        let score = 0;
        // High priority keywords (weight: 3)
        score += (keywordGroups.high || []).filter(kw => stepText.includes(kw)).length * 3;
        // Medium priority keywords (weight: 2)
        score += (keywordGroups.medium || []).filter(kw => stepText.includes(kw)).length * 2;
        // Low priority keywords (weight: 1)
        score += (keywordGroups.low || []).filter(kw => stepText.includes(kw)).length * 1;

        scores[moduleKey] = score;
      }

      // Special rules for disambiguation
      // Rule 1: If "backend" is explicitly in name, prefer backend
      if (stepText.includes('backend') && this.modules.has('backend')) {
        scores.backend = (scores.backend || 0) + 5;
      }
      
      // Rule 2: If "ui" or "frontend" is explicitly in name, prefer frontend
      if ((stepText.includes(' ui') || stepText.includes('frontend')) && this.modules.has('frontend')) {
        scores.frontend = (scores.frontend || 0) + 5;
      }
      
      // Rule 3: Module/Service/Controller patterns are backend
      if (/\b(module|service|controller|gateway)\b/.test(stepText) && 
          !stepText.includes('ui') && !stepText.includes('frontend')) {
        if (this.modules.has('backend')) {
          scores.backend = (scores.backend || 0) + 3;
        }
      }

      // Find highest score
      let bestMatch = null;
      let bestScore = 0;
      for (const [moduleKey, score] of Object.entries(scores)) {
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
   * Only creates directories for modules that have steps
   * @returns {Promise<string[]>} Created directories
   */
  async createDirectoryStructure() {
    const created = [];
    const modulesDir = path.join(this.projectDir, this.promptDir, 'modules');

    // Create modules base directory
    await fs.mkdir(modulesDir, { recursive: true });
    created.push(modulesDir);

    // Create directory for each module ONLY if it has steps
    for (const [key, module] of this.modules) {
      // Skip modules with no steps
      if (!module.steps || module.steps.length === 0) {
        continue;
      }
      
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
   * Clean up empty module directories
   * @returns {Promise<string[]>} Removed directories
   */
  async cleanupEmptyModules() {
    const removed = [];
    const modulesDir = path.join(this.projectDir, this.promptDir, 'modules');
    
    try {
      const entries = await fs.readdir(modulesDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        
        const moduleDir = path.join(modulesDir, entry.name);
        const isEmpty = await this.isDirectoryEmpty(moduleDir);
        
        if (isEmpty) {
          await fs.rm(moduleDir, { recursive: true, force: true });
          removed.push(entry.name);
        }
      }
    } catch (error) {
      // Ignore if modules dir doesn't exist
    }
    
    return removed;
  }
  
  /**
   * Check if a directory is empty (recursively)
   * @param {string} dirPath - Directory to check
   * @returns {Promise<boolean>} True if empty
   */
  async isDirectoryEmpty(dirPath) {
    try {
      const entries = await fs.readdir(dirPath);
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        const stat = await fs.stat(fullPath);
        
        if (stat.isFile()) {
          return false;
        }
        
        if (stat.isDirectory()) {
          const subEmpty = await this.isDirectoryEmpty(fullPath);
          if (!subEmpty) return false;
        }
      }
      
      return true;
    } catch (error) {
      return true;
    }
  }
  
  /**
   * Remove empty modules from the manager
   * @returns {number} Number of modules removed
   */
  removeEmptyModules() {
    let removed = 0;
    for (const [key, module] of this.modules) {
      if (module.steps.length === 0) {
        this.modules.delete(key);
        removed++;
      }
    }
    return removed;
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
   * Get module dependencies
   * @returns {Object} Dependencies map
   */
  static getModuleDependencies() {
    return MODULE_DEPENDENCIES;
  }

  /**
   * Get module priority order
   * @returns {Object} Priority map
   */
  static getModulePriority() {
    return MODULE_PRIORITY;
  }

  /**
   * Sort modules by dependency order
   * @param {string[]} moduleKeys - Module keys to sort
   * @returns {string[]} Sorted module keys
   */
  sortByDependencies(moduleKeys) {
    return moduleKeys.slice().sort((a, b) => {
      return (MODULE_PRIORITY[a] || 99) - (MODULE_PRIORITY[b] || 99);
    });
  }

  /**
   * Get modules that have all dependencies satisfied
   * @param {string[]} completedModules - Already completed modules
   * @returns {string[]} Available modules
   */
  getAvailableModules(completedModules = []) {
    const available = [];
    
    for (const [key, module] of this.modules) {
      if (module.steps.length === 0) continue;
      if (completedModules.includes(key)) continue;
      
      const deps = MODULE_DEPENDENCIES[key] || [];
      const depsAreSatisfied = deps.every(dep => 
        completedModules.includes(dep) || !this.modules.has(dep) || this.modules.get(dep).steps.length === 0
      );
      
      if (depsAreSatisfied) {
        available.push(key);
      }
    }
    
    return this.sortByDependencies(available);
  }

  /**
   * Get recommended module order based on dependencies
   * @returns {Object[]} Ordered modules with reasons
   */
  getRecommendedOrder() {
    const orderedModules = [];
    
    // Module descriptions
    const moduleReasons = {
      'infra': 'Configuration initiale du projet et environnement',
      'database': 'Définir le schéma de données',
      'auth': 'Authentification nécessaire pour sécuriser les APIs',
      'backend': 'Logique métier et services',
      'api': 'Endpoints pour le frontend',
      'frontend': 'Interface utilisateur',
      'mobile': 'Application mobile',
      'testing': 'Tests après les fonctionnalités principales'
    };
    
    // Sort modules by priority
    const sortedKeys = Array.from(this.modules.keys()).sort((a, b) => {
      return (MODULE_PRIORITY[a] || 99) - (MODULE_PRIORITY[b] || 99);
    });

    for (const key of sortedKeys) {
      const module = this.modules.get(key);
      if (!module || module.steps.length === 0) continue;
      
      const deps = MODULE_DEPENDENCIES[key] || [];
      const activeDeps = deps.filter(d => this.modules.has(d) && this.modules.get(d).steps.length > 0);
      
      orderedModules.push({
        key,
        module,
        reason: moduleReasons[key] || 'Module personnalisé',
        dependencies: activeDeps,
        canParallel: ['frontend', 'mobile'].includes(key),
        priority: MODULE_PRIORITY[key] || 99
      });
    }

    return orderedModules;
  }

  /**
   * Generate master code-run.md with all modules
   * Enhanced with recommended order
   * @returns {string} Markdown content
   */
  generateMasterCodeRun() {
    const lines = [];
    lines.push('# 📦 Master Code Run - Multi-Module Project\n');
    lines.push('---\n');
    
    // Add recommended order section
    const orderedModules = this.getRecommendedOrder();
    if (orderedModules.length > 0) {
      lines.push('## 🎯 ORDRE RECOMMANDÉ DES MODULES\n');
      lines.push('> Suivez cet ordre pour un développement optimal\n');
      
      let orderNum = 1;
      for (const item of orderedModules) {
        const parallelNote = item.canParallel ? ' *(peut être parallèle)*' : '';
        lines.push(`${orderNum}. **${item.module.icon} ${item.module.name}**${parallelNote}`);
        lines.push(`   - ${item.reason}`);
        lines.push(`   - Code Run: \`modules/${item.key}/workflow/code-run.md\`\n`);
        orderNum++;
      }
      lines.push('---\n');
    }
    
    lines.push('## 🗂️ MODULES\n');

    for (const [key, module] of this.modules) {
      // Skip empty modules in the module list
      if (module.steps.length === 0) continue;
      
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

    // Progress bars for each module (skip empty)
    for (const [key, module] of this.modules) {
      if (module.steps.length === 0) continue;
      const bar = this.createProgressBar(module.progress, 20);
      lines.push(`${module.icon} ${module.name.padEnd(15)} ${bar} ${module.progress}%`);
    }

    lines.push('\n---\n');
    lines.push('## 🔄 WORKFLOW\n');
    lines.push('1. Suivre l\'ordre recommandé ci-dessus');
    lines.push('2. Consulter le code-run.md de chaque module');
    lines.push('3. Compléter les étapes dans l\'ordre des dépendances');
    lines.push('4. Exécuter `prompt-cursor complete` après chaque étape');
    lines.push('5. Vérifier la progression globale ici\n');

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

