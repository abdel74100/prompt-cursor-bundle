const fs = require('fs').promises;
const path = require('path');

/**
 * Parse implementation-plan.md to extract steps
 * Supports complex projects with non-linear dependencies
 * V2: Enhanced extraction of files, commands, and rich metadata
 */
class PlanParser {
  /**
   * Normalize module name to standard key
   * @param {string} name - Module name (e.g., "Backend", "API", "Infrastructure")
   * @returns {string} Normalized module key
   */
  static normalizeModuleName(name) {
    const normalized = name.toLowerCase().trim();
    
    // Map common variations to standard keys
    const moduleMap = {
      'frontend': 'frontend',
      'front-end': 'frontend',
      'front end': 'frontend',
      'ui': 'frontend',
      'client': 'frontend',
      'web': 'frontend',
      'backend': 'backend',
      'back-end': 'backend',
      'back end': 'backend',
      'server': 'backend',
      'api': 'api',
      'rest': 'api',
      'graphql': 'api',
      'database': 'database',
      'db': 'database',
      'data': 'database',
      'infra': 'infra',
      'infrastructure': 'infra',
      'devops': 'infra',
      'cloud': 'infra',
      'mobile': 'mobile',
      'app': 'mobile',
      'ios': 'mobile',
      'android': 'mobile',
      'auth': 'auth',
      'authentication': 'auth',
      'authorization': 'auth',
      'security': 'auth',
      'testing': 'testing',
      'test': 'testing',
      'tests': 'testing',
      'qa': 'testing'
    };
    
    return moduleMap[normalized] || normalized;
  }

  /**
   * Parse a plan file and extract structured steps
   * @param {string} filePath - Path to implementation-plan.md
   * @returns {Promise<Array>} Array of step objects
   */
  static async parsePlanFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.parsePlan(content);
    } catch (error) {
      throw new Error(`Failed to parse plan file: ${error.message}`);
    }
  }

  /**
   * Parse plan content
   * @param {string} content - Plan markdown content
   * @returns {Array} Array of step objects with rich metadata
   */
  static parsePlan(content) {
    const steps = [];
    
    // Try format 1: "### Étape X:" (French format)
    const frenchRegex = /###\s+Étape\s+(\d+(?:\.\d+)?):\s+(.+?)(?=###|\n##|$)/gs;
    let match;
    
    while ((match = frenchRegex.exec(content)) !== null) {
      const rawNumber = match[1].trim();
      const rawTitle = match[2].trim();
      const stepTitle = rawTitle.split('\n')[0].trim();
      const stepContent = match[0];
      
      const tasks = this.extractTasks(stepContent);
      const dependencies = this.extractDependencies(stepContent, rawNumber);
      
      steps.push({
        rawNumber,
        number: steps.length + 1,
        displayNumber: rawNumber,
        name: stepTitle,
        tasks: tasks,
        objective: this.extractObjective(stepContent),
        estimatedTime: this.extractEstimatedTime(stepContent, content),
        dependsOnRaw: dependencies.dependsOnRaw,
        dependsOn: [],
        parallel: dependencies.parallel,
        module: this.extractModule(stepContent),
        files: this.extractFiles(stepContent),
        userCommands: this.extractUserCommands(stepContent),
        techDetails: this.extractTechDetails(stepContent)
      });
    }
    
    // Try format 2: "#### Step X:" (English format with ####)
    if (steps.length === 0) {
      const englishHeaderRegex = /####\s+Step\s+(\d+(?:\.\d+)?):\s+(.+?)\n([\s\S]*?)(?=####\s+Step|###\s+|##\s+|$)/gs;
      
      while ((match = englishHeaderRegex.exec(content)) !== null) {
        const rawNumber = match[1].trim();
        const stepTitle = match[2].trim();
        const stepContent = match[3];
        
        const tasks = this.extractTasksFromStepFormat(stepContent);
        const dependencies = this.extractDependencies(stepContent, rawNumber);
        
        steps.push({
          rawNumber,
          number: steps.length + 1,
          displayNumber: rawNumber,
          name: stepTitle,
          tasks: tasks,
          objective: this.extractTaskDescription(stepContent) || stepTitle,
          estimatedTime: this.extractEstimatedTime(stepContent, content),
          dependsOnRaw: dependencies.dependsOnRaw,
          dependsOn: [],
          parallel: dependencies.parallel,
          module: this.extractModule(stepContent),
          files: this.extractFiles(stepContent),
          userCommands: this.extractUserCommands(stepContent),
          techDetails: this.extractTechDetails(stepContent)
        });
      }
    }
    
    // Try format 3: "### Step X:" (English format with ###)
    if (steps.length === 0) {
      const englishHeaderRegex2 = /###\s+Step\s+(\d+(?:\.\d+)?):\s+(.+?)\n([\s\S]*?)(?=###\s+Step|##\s+Phase|##\s+\w|$)/gs;
      
      while ((match = englishHeaderRegex2.exec(content)) !== null) {
        const rawNumber = match[1].trim();
        const stepTitle = match[2].trim();
        const stepContent = match[3];
        
        const tasks = this.extractTasksFromStepFormat(stepContent);
        const dependencies = this.extractDependencies(stepContent, rawNumber);
        
        steps.push({
          rawNumber,
          number: steps.length + 1,
          displayNumber: rawNumber,
          name: stepTitle,
          tasks: tasks,
          objective: this.extractTaskDescription(stepContent) || stepTitle,
          estimatedTime: this.extractEstimatedTime(stepContent, content),
          dependsOnRaw: dependencies.dependsOnRaw,
          dependsOn: [],
          parallel: dependencies.parallel,
          module: this.extractModule(stepContent),
          files: this.extractFiles(stepContent),
          userCommands: this.extractUserCommands(stepContent),
          techDetails: this.extractTechDetails(stepContent)
        });
      }
    }
    
    // Try format 4: "- [ ] Step X:" (English checkbox format)
    if (steps.length === 0) {
      const checkboxRegex = /-\s+\[\s*\]\s+Step\s+(\d+(?:\.\d+)?):\s+([^\n]+)([\s\S]*?)(?=\n-\s+\[\s*\]\s+Step|\n##\s+Phase|$)/g;
      
      while ((match = checkboxRegex.exec(content)) !== null) {
        const rawNumber = match[1].trim();
        const stepTitle = match[2].trim();
        const stepContent = match[0];
        
        const tasks = this.extractTasksFromCheckboxFormat(stepContent);
        const dependencies = this.extractDependencies(stepContent, rawNumber);
        
        steps.push({
          rawNumber,
          number: steps.length + 1,
          displayNumber: rawNumber,
          name: stepTitle,
          tasks: tasks,
          objective: tasks[0]?.description || stepTitle,
          estimatedTime: this.extractEstimatedTime(stepContent, content),
          dependsOnRaw: dependencies.dependsOnRaw,
          dependsOn: [],
          parallel: dependencies.parallel,
          module: this.extractModule(stepContent),
          files: this.extractFiles(stepContent),
          userCommands: this.extractUserCommands(stepContent),
          techDetails: this.extractTechDetails(stepContent)
        });
      }
    }
    
    // Map raw step numbers (1.1, 2.3…) to sequential integers for internal usage
    const rawNumberMap = {};
    steps.forEach((step, idx) => {
      const seq = idx + 1;
      step.number = seq;
      if (step.rawNumber) {
        rawNumberMap[step.rawNumber] = seq;
        // Also map integer part if it matches
        const intPart = step.rawNumber.split('.')[0];
        if (intPart) {
          rawNumberMap[intPart] = rawNumberMap[intPart] || seq;
        }
      } else {
        rawNumberMap[String(seq)] = seq;
      }
    });
    
    // Convert raw dependencies to mapped integers
    steps.forEach((step, idx) => {
      const mappedDeps = (step.dependsOnRaw || []).map(rawDep => {
        const cleaned = rawDep.trim();
        if (rawNumberMap[cleaned] !== undefined) return rawNumberMap[cleaned];
        const noLeadingZeros = cleaned.replace(/^0+/, '') || cleaned;
        if (rawNumberMap[noLeadingZeros] !== undefined) return rawNumberMap[noLeadingZeros];
        const asFloat = parseFloat(cleaned);
        if (!Number.isNaN(asFloat) && rawNumberMap[String(asFloat)]) return rawNumberMap[String(asFloat)];
        const asInt = parseInt(cleaned, 10);
        if (!Number.isNaN(asInt) && rawNumberMap[String(asInt)]) return rawNumberMap[String(asInt)];
        if (!Number.isNaN(asInt)) return asInt;
        return null;
      }).filter((n) => n !== null);
      step.dependsOn = mappedDeps;
      delete step.dependsOnRaw;
    });
    
    // Only set linear dependencies if NO step has explicit dependencies
    const hasAnyExplicitDeps = steps.some(s => s.dependsOn && s.dependsOn.length > 0);
    if (steps.length > 0 && !hasAnyExplicitDeps) {
      for (let i = 1; i < steps.length; i++) {
        steps[i].dependsOn = [steps[i - 1].number];
      }
    }
    
    return steps;
  }

  /**
   * Extract files to create from step content
   * @param {string} content - Step content
   * @returns {Array} Array of file paths
   */
  static extractFiles(content) {
    const files = [];
    
    // Format: "- **Files**:" followed by list
    const filesMatch = content.match(/-\s*\*\*Files?\*\*\s*:\s*\n([\s\S]*?)(?=\n-\s*\*\*|\n####|\n###|\n##|$)/i);
    if (filesMatch) {
      const fileLines = filesMatch[1].split('\n');
      for (const line of fileLines) {
        const trimmed = line.trim();
        // Match "- `path/to/file`" or "- path/to/file:" patterns
        const fileMatch = trimmed.match(/^-\s*`?([^`:\n]+)`?\s*:?.*$/);
        if (fileMatch) {
          files.push(fileMatch[1].trim());
        }
      }
    }
    
    // Also look for inline file references
    const inlineFiles = content.match(/`([^`]+\.(ts|tsx|js|jsx|json|md|yml|yaml|prisma|sql|css|scss))`/g);
    if (inlineFiles) {
      for (const f of inlineFiles) {
        const cleanFile = f.replace(/`/g, '');
        if (!files.includes(cleanFile)) {
          files.push(cleanFile);
        }
      }
    }
    
    return files;
  }

  /**
   * Extract user commands/instructions from step content
   * @param {string} content - Step content
   * @returns {Array} Array of commands
   */
  static extractUserCommands(content) {
    const commands = [];
    
    // Format: "- **User Instructions**:" followed by code block
    const instructionsMatch = content.match(/-\s*\*\*User Instructions?\*\*\s*:\s*\n\s*```(?:bash)?\n([\s\S]*?)```/i);
    if (instructionsMatch) {
      const cmdLines = instructionsMatch[1].split('\n');
      for (const line of cmdLines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          commands.push(trimmed);
        }
      }
    }
    
    // Also look for standalone code blocks with bash commands
    const codeBlocks = content.match(/```bash\n([\s\S]*?)```/g);
    if (codeBlocks) {
      for (const block of codeBlocks) {
        const cmdContent = block.replace(/```bash\n|```/g, '');
        const cmdLines = cmdContent.split('\n');
        for (const line of cmdLines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#') && !commands.includes(trimmed)) {
            commands.push(trimmed);
          }
        }
      }
    }
    
    return commands;
  }

  /**
   * Extract task description from "- **Task**:" format
   * @param {string} content - Step content
   * @returns {string|null} Task description
   */
  static extractTaskDescription(content) {
    const taskMatch = content.match(/-\s*\*\*Task\*\*\s*:\s*(.+)/i);
    if (taskMatch) {
      return taskMatch[1].trim();
    }
    return null;
  }

  /**
   * Extract technical details (estimated time, etc.)
   * @param {string} content - Step content
   * @returns {Object} Technical details
   */
  static extractTechDetails(content) {
    const details = {};
    
    // Estimated time: "- **Estimated**: 4 hours"
    const estimatedMatch = content.match(/-\s*\*\*Estimated\*\*\s*:\s*(.+)/i);
    if (estimatedMatch) {
      details.estimatedTime = estimatedMatch[1].trim();
    }
    
    // Tech stack hints
    const techKeywords = ['React', 'Next.js', 'NestJS', 'Prisma', 'TypeScript', 'Tailwind', 
                          'Socket.io', 'Stripe', 'Google Maps', 'Firebase', 'PostgreSQL', 'Redis'];
    details.techStack = techKeywords.filter(tech => content.includes(tech));
    
    return details;
  }

  /**
   * Extract dependencies from step content
   * Enhanced V2: Better parsing of "- **Depends on**:" format
   * @param {string} content - Step content
   * @param {number} stepNumber - Current step number
   * @returns {Object} Dependencies info
   */
  static extractDependencies(content, stepNumber) {
    const result = {
      dependsOnRaw: [],
      parallel: false
    };
    
    // Check for parallel flag
    result.parallel = /\(parallel\)|\(parallèle\)|can\s+run\s+in\s+parallel|peut\s+s'exécuter\s+en\s+parallèle/i.test(content);
    
    // Format 1: "- **Depends on**: Step 1, Step 3" (bold markdown format)
    const boldDepMatch = content.match(/-\s*\*\*Depends?\s*on\*\*\s*:\s*([^\n]+)/i);
    if (boldDepMatch) {
      const depStr = boldDepMatch[1].toLowerCase();
      
      // Check for "none"
      if (depStr.includes('none') || depStr.includes('aucun')) {
        return result;
      }
      
      // Extract step numbers (keep raw to support decimals)
      const depNums = depStr.match(/\d+(?:\.\d+)?/g);
      if (depNums) {
        result.dependsOnRaw = [...new Set(depNums.map(n => n.trim()))];
        return result;
      }
    }
    
    // Format 2: "Depends on: Step 1, Step 2" or "Dépend de: Étape 1" (non-bold)
    const depMatch = content.match(/(?:depends?\s+on|dépend\s+de|requires?|nécessite|prérequis)\s*:\s*([^\n]+)/i);
    if (depMatch && result.dependsOnRaw.length === 0) {
      const depStr = depMatch[1].toLowerCase();
      
      // Check for "none" or "aucune"
      if (depStr.includes('none') || depStr.includes('aucun')) {
        return result;
      }
      
      // Extract step numbers
      const depNums = depStr.match(/\d+(?:\.\d+)?/g);
      if (depNums) {
        result.dependsOnRaw = [...new Set(depNums.map(n => n.trim()))];
      }
    }
    
    // Format 3: "Step Dependencies: Step 1 completed"
    const stepDepMatch = content.match(/step\s+dependencies?\s*:\s*([^\n]+)/i);
    if (stepDepMatch && result.dependsOnRaw.length === 0) {
      const depStr = stepDepMatch[1].toLowerCase();
      if (!depStr.includes('none') && !depStr.includes('aucun')) {
        const depNums = depStr.match(/\d+(?:\.\d+)?/g);
        if (depNums) {
          result.dependsOnRaw = [...new Set(depNums.map(n => n.trim()))];
        }
      }
    }
    
    // Format 4: "After: Step 1 AND Step 2" (requires both)
    const afterMatch = content.match(/after\s*:\s*([^\n]+)/i);
    if (afterMatch && result.dependsOnRaw.length === 0) {
      const depNums = afterMatch[1].match(/\d+(?:\.\d+)?/g);
      if (depNums) {
        result.dependsOnRaw = [...new Set(depNums.map(n => n.trim()))];
      }
    }
    
    return result;
  }

  /**
   * Extract module assignment from step content
   * Enhanced V3: Better keywords with priority rules
   * @param {string} content - Step content
   * @returns {string[]|string|null} Module key(s)
   */
  static extractModule(content) {
    // Format 1: "- **Module**: frontend" or "- **Module**: backend, frontend"
    const moduleMatch = content.match(/-\s*\*\*Module\*\*\s*:\s*([^\n]+)/i);
    if (moduleMatch) {
      const moduleStr = moduleMatch[1].trim().toLowerCase();
      if (moduleStr.includes(',')) {
        const modules = moduleStr.split(',').map(m => this.normalizeModuleName(m.trim())).filter(m => m);
        return modules.length === 1 ? modules[0] : modules;
      }
      return this.normalizeModuleName(moduleStr);
    }
    
    // Format 2: "Module: xxx" without bold
    const simpleMatch = content.match(/(?:^|\n)\s*module\s*:\s*([^\n]+)/im);
    if (simpleMatch) {
      const moduleStr = simpleMatch[1].trim().toLowerCase();
      if (moduleStr.includes(',')) {
        const modules = moduleStr.split(',').map(m => this.normalizeModuleName(m.trim())).filter(m => m);
        return modules.length === 1 ? modules[0] : modules;
      }
      return this.normalizeModuleName(moduleStr);
    }
    
    // Intelligent detection based on content analysis
    const lowerContent = content.toLowerCase();
    const stepName = (content.match(/Step\s+\d+:\s*([^\n]+)/i) || ['', ''])[1].toLowerCase();
    const combinedText = `${stepName} ${lowerContent}`;
    
    // PRIORITY RULES: Check step name for high-priority patterns first
    // These patterns override keyword scoring
    
    // INFRA priority patterns (setup, config, deploy, production)
    const infraPriorityPatterns = [
      /configuration\s+(du\s+)?projet/i,
      /project\s+(setup|config|init)/i,
      /infrastructure/i,
      /déploiement|deploy/i,
      /production/i,
      /monitoring/i,
      /analytics/i,
      /ci\/cd|pipeline/i,
      /docker\s+(setup|config|environment)/i,
      /serverless/i,
      /cloudformation/i,
      /environment\s+(config|setup|variable)/i,
      /\.env/i
    ];
    
    for (const pattern of infraPriorityPatterns) {
      if (pattern.test(stepName)) {
        return 'infra';
      }
    }
    
    // DATABASE priority patterns
    const dbPriorityPatterns = [
      /architecture\s+(base\s+de\s+données|database)/i,
      /database\s+(setup|schema|design)/i,
      /prisma\s+(setup|schema|init)/i,
      /schema\s+(design|definition)/i,
      /migration/i
    ];
    
    for (const pattern of dbPriorityPatterns) {
      if (pattern.test(stepName)) {
        return 'database';
      }
    }
    
    // AUTH priority patterns
    const authPriorityPatterns = [
      /authentification/i,
      /authentication/i,
      /auth\s+(de\s+)?base/i,
      /jwt\s+(setup|impl)/i,
      /login\s+system/i
    ];
    
    for (const pattern of authPriorityPatterns) {
      if (pattern.test(stepName)) {
        return 'auth';
      }
    }
    
    // TESTING priority patterns
    const testPriorityPatterns = [
      /tests?\s+(et\s+)?qa/i,
      /e2e\s+test/i,
      /unit\s+test/i,
      /integration\s+test/i,
      /quality\s+assurance/i
    ];
    
    for (const pattern of testPriorityPatterns) {
      if (pattern.test(stepName)) {
        return 'testing';
      }
    }
    
    // Keyword-based scoring with improved indicators
    const keywords = {
      infra: {
        high: ['infrastructure', 'aws', 'terraform', 'ci/cd', 'pipeline', 'déploiement',
               'deploy', 'production', 'monitoring', 'analytics', 'docker', 'kubernetes',
               'serverless', 'cloudformation', '.env', 'environment', 'devops',
               'configuration du projet', 'project setup', 'initialiser le projet'],
        medium: ['cloud', 'heroku', 'vercel', 'netlify', 'github actions'],
        low: ['config', 'setup']
      },
      database: {
        high: ['base de données', 'database', 'prisma', 'schema.prisma', 'migration',
               'postgresql', 'mysql', 'mongodb', 'redis', 'rds', 'sql'],
        medium: ['data model', 'entity', 'table', 'relation'],
        low: ['db', 'storage']
      },
      auth: {
        high: ['authentification', 'authentication', 'jwt', 'passport', 'oauth',
               'login', 'register', 'bcrypt', 'session', 'token'],
        medium: ['auth', 'guard', 'middleware auth', 'protected'],
        low: ['permission', 'role', 'access']
      },
      backend: {
        high: ['nestjs', 'express', 'fastify', 'controller', 'service',
               '.service.ts', '.controller.ts', 'gateway', 'api route',
               'matching', 'stripe', 'webhook', 'websocket', 'socket.io'],
        medium: ['api', 'endpoint', 'route', 'server', 'module.ts'],
        low: ['backend', 'server-side']
      },
      frontend: {
        high: ['interface passager', 'interface chauffeur', 'dashboard', 'ui',
               'react', 'next.js', 'vue', 'angular', 'component', 'page.tsx',
               'géolocalisation', 'booking', 'reservation', 'maps', 'form'],
        medium: ['frontend', 'client', 'web app', 'spa', 'composant'],
        low: ['tailwind', 'css', 'style', 'design']
      },
      testing: {
        high: ['tests et qa', 'e2e', 'cypress', 'playwright', 'jest', 'vitest',
               'unit test', 'integration test', 'quality assurance'],
        medium: ['test', 'spec.ts', 'spec.js', 'testing'],
        low: ['coverage', 'assert']
      },
      api: {
        high: ['rest api', 'graphql', 'api endpoint', 'swagger', 'openapi'],
        medium: ['api', 'endpoint'],
        low: []
      },
      mobile: {
        high: ['react native', 'flutter', 'expo', 'ios', 'android', 'mobile app'],
        medium: ['mobile', 'app store', 'play store'],
        low: []
      }
    };
    
    // Calculate scores
    const scores = {};
    for (const [moduleKey, keywordGroups] of Object.entries(keywords)) {
      let score = 0;
      score += (keywordGroups.high || []).filter(kw => combinedText.includes(kw)).length * 3;
      score += (keywordGroups.medium || []).filter(kw => combinedText.includes(kw)).length * 2;
      score += (keywordGroups.low || []).filter(kw => combinedText.includes(kw)).length * 1;
      scores[moduleKey] = score;
    }
    
    // Disambiguation rules
    // Rule 1: If both frontend and backend match, check step name
    if (scores.frontend > 0 && scores.backend > 0) {
      if (stepName.includes('interface') || stepName.includes('ui') || stepName.includes('dashboard')) {
        scores.frontend += 5;
      }
      if (stepName.includes('api') || stepName.includes('service') || stepName.includes('module')) {
        scores.backend += 5;
      }
    }
    
    // Rule 2: Temps réel / WebSocket -> backend (server-side)
    if (combinedText.includes('temps réel') || combinedText.includes('websocket')) {
      if (!stepName.includes('interface') && !stepName.includes('ui')) {
        scores.backend += 3;
      }
    }
    
    // Rule 3: Stripe / Payment -> backend
    if (combinedText.includes('stripe') || combinedText.includes('payment')) {
      if (!stepName.includes('ui') && !stepName.includes('interface')) {
        scores.backend += 3;
      }
    }
    
    // Find highest score
    let bestModule = null;
    let bestScore = 0;
    for (const [module, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestModule = module;
      }
    }
    
    // Default to infra if no good match (setup steps)
    if (bestScore === 0 && stepName.includes('setup')) {
      return 'infra';
    }
    
    return bestModule;
  }

  /**
   * Extract tasks from step content (bullet list format)
   */
  static extractTasks(content) {
    const tasks = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') && !trimmed.startsWith('- **') && !trimmed.startsWith('- [ ]')) {
        tasks.push({
          description: trimmed.substring(2),
          completed: false
        });
      }
    }
    
    return tasks;
  }

  /**
   * Extract tasks from "### Step X:" or "#### Step X:" format
   * Enhanced to create detailed, actionable tasks
   */
  static extractTasksFromStepFormat(content) {
    const tasks = [];
    const files = this.extractFiles(content);
    const commands = this.extractUserCommands(content);
    
    // Extract main task description
    const taskMatch = content.match(/-\s*\*\*Task\*\*\s*:\s*(.+)/i);
    if (taskMatch) {
      const mainTask = {
        description: taskMatch[1].trim(),
        completed: false,
        type: 'main'
      };
      tasks.push(mainTask);
    }
    
    // Create tasks from files to create
    if (files.length > 0) {
      // Group files by directory for better organization
      const filesByDir = {};
      for (const file of files) {
        const dir = file.split('/').slice(0, -1).join('/');
        if (!filesByDir[dir]) filesByDir[dir] = [];
        filesByDir[dir].push(file);
      }
      
      // Create a task for each group of files
      for (const [dir, dirFiles] of Object.entries(filesByDir)) {
        if (dirFiles.length === 1) {
          tasks.push({
            description: `Créer le fichier \`${dirFiles[0]}\``,
            completed: false,
            type: 'file',
            file: dirFiles[0]
          });
        } else if (dirFiles.length <= 3) {
          for (const file of dirFiles) {
            tasks.push({
              description: `Créer \`${file}\``,
              completed: false,
              type: 'file',
              file: file
            });
          }
        } else {
          tasks.push({
            description: `Créer les fichiers dans \`${dir}/\` (${dirFiles.length} fichiers)`,
            completed: false,
            type: 'files',
            files: dirFiles,
            details: dirFiles.map(f => `- \`${f}\``).join('\n')
          });
        }
      }
    }
    
    // Create tasks from commands
    if (commands.length > 0) {
      const cmdGroup = commands.slice(0, 5); // Limit to 5 commands per task
      tasks.push({
        description: `Exécuter les commandes d'installation/configuration`,
        completed: false,
        type: 'commands',
        commands: cmdGroup,
        details: cmdGroup.map(c => `\`${c}\``).join('\n')
      });
    }
    
    // If still no tasks, create one from title
    if (tasks.length === 0) {
      const titleMatch = content.match(/Step\s+\d+:\s*([^\n]+)/i);
      if (titleMatch) {
        tasks.push({
          description: titleMatch[1].trim(),
          completed: false,
          type: 'main'
        });
      }
    }
    
    // Add validation task at the end
    tasks.push({
      description: 'Vérifier que tout fonctionne (build + runtime)',
      completed: false,
      type: 'validation'
    });
    
    return tasks;
  }

  /**
   * Extract tasks from checkbox format "- [ ] Step X:"
   */
  static extractTasksFromCheckboxFormat(content) {
    const tasks = [];
    
    // First, try to get the main task from **Task**: line
    const taskMatch = content.match(/\*\*Task\*\*:\s*(.+)/);
    if (taskMatch) {
      tasks.push({
        description: taskMatch[1].trim(),
        completed: false
      });
    }
    
    // Extract User Instructions which contain actionable steps
    const userInstructionsMatch = content.match(/\*\*User Instructions\*\*:\s*\n([\s\S]*?)(?=\n\s*-\s+\[\s*\]|\n##|$)/);
    if (userInstructionsMatch) {
      const instructionsText = userInstructionsMatch[1];
      const instructionLines = instructionsText.split('\n');
      
      for (const line of instructionLines) {
        const trimmed = line.trim();
        // Match lines like "- Run: ...", "- Install: ...", etc.
        if (trimmed.startsWith('- ')) {
          const cleanDesc = trimmed.substring(2).trim();
          // Only include if it has action keywords
          if (cleanDesc.match(/^(Run|Install|Create|Initialize|Configure|Add|Test|Setup|Navigate|Copy|Choose|Get|Build):/i)) {
            tasks.push({
              description: cleanDesc,
              completed: false
            });
          }
        }
      }
    }
    
    // If still no tasks, use the step title
    if (tasks.length === 0) {
      const stepMatch = content.match(/-\s+\[\s*\]\s+Step\s+\d+:\s+(.+)/);
      if (stepMatch) {
        tasks.push({
          description: stepMatch[1].trim(),
          completed: false
        });
      }
    }
    
    return tasks;
  }

  /**
   * Extract objective from step content
   */
  static extractObjective(content) {
    // Look for explicit objective
    const objectiveMatch = content.match(/(?:\*\*)?(?:objective|objectif|goal|but)(?:\*\*)?\s*:\s*([^\n]+)/i);
    if (objectiveMatch) {
      return objectiveMatch[1].trim();
    }
    
    const lines = content.split('\n');
    // First real task line is often a good objective
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) {
        return trimmed.substring(2);
      }
    }
    return 'Voir détails dans le plan d\'implémentation';
  }

  /**
   * Extract estimated time from phase or overall plan
   */
  static extractEstimatedTime(stepContent, fullContent) {
    // Look for explicit time estimate
    const timeMatch = stepContent.match(/(?:estimated|estimé|durée|time)\s*:\s*([^\n]+)/i);
    if (timeMatch) {
      return timeMatch[1].trim();
    }
    
    // Look for "Semaine X" or "(Semaine X)" patterns
    const weekMatch = stepContent.match(/Semaine\s+(\d+)/i) || 
                     fullContent.match(/Semaine\s+(\d+)/i);
    
    if (weekMatch) {
      return `Semaine ${weekMatch[1]}`;
    }
    
    return '2-4 heures';
  }

  /**
   * Group steps into phases for code-run
   * Now supports unlimited steps (no more hard limit)
   * @param {Array} steps - Steps to group
   * @param {number} targetPhases - Target number of phases (0 = no grouping)
   * @returns {Array} Grouped steps
   */
  static groupIntoPhases(steps, targetPhases = 0) {
    // If targetPhases is 0 or steps are fewer, return as-is
    if (targetPhases === 0 || steps.length <= targetPhases) {
      return steps.map((step, index) => ({
        number: step.number || (index + 1),
        name: step.name,
        objective: step.objective,
        estimatedTime: step.estimatedTime,
        tasks: step.tasks,
        dependsOn: step.dependsOn || [],
        parallel: step.parallel || false,
        module: step.module,
        files: step.files || [],
        userCommands: step.userCommands || [],
        techDetails: step.techDetails || {}
      }));
    }
    
    // Group steps into phases
    const stepsPerPhase = Math.ceil(steps.length / targetPhases);
    const phases = [];
    
    for (let i = 0; i < steps.length; i += stepsPerPhase) {
      const group = steps.slice(i, i + stepsPerPhase);
      const phaseNumber = phases.length + 1;
      
      // Combine names if multiple steps
      let phaseName;
      if (group.length === 1) {
        phaseName = group[0].name;
      } else {
        const names = group.map(s => s.name);
        phaseName = names.length > 2 
          ? `${names[0]} + ${names.length - 1} autres`
          : names.join(' + ');
      }
      
      // Combine all tasks
      const allTasks = group.flatMap(s => s.tasks || []);
      
      // Combine dependencies (from first step in group)
      const dependsOn = group[0].dependsOn || [];
      
      phases.push({
        number: phaseNumber,
        name: phaseName.length > 60 ? phaseName.substring(0, 57) + '...' : phaseName,
        objective: group[0].objective,
        tasks: allTasks,
        dependsOn: dependsOn,
        parallel: group.some(s => s.parallel),
        module: group[0].module,
        originalSteps: group.map(s => s.number || s.name)
      });
    }
    
    return phases;
  }

  /**
   * Parse milestones from plan content
   * @param {string} content - Plan content
   * @returns {Array} Milestones
   */
  static parseMilestones(content) {
    const milestones = [];
    
    // Match milestone/phase headers
    const milestoneRegex = /##\s+(?:Phase|Milestone|Jalon|Sprint)\s*(\d*):\s*([^\n]+)([\s\S]*?)(?=##\s+(?:Phase|Milestone|Jalon|Sprint)|$)/gi;
    
    let match;
    let index = 0;
    while ((match = milestoneRegex.exec(content)) !== null) {
      const name = match[2].trim();
      const milestoneContent = match[3];

      // Extract steps in this milestone
      const stepNums = [];
      const stepMatches = milestoneContent.match(/(?:Step|Étape)\s+(\d+)/gi);
      if (stepMatches) {
        for (const sm of stepMatches) {
          const num = sm.match(/\d+/);
          if (num) stepNums.push(parseInt(num[0]));
        }
      }

      // Extract deadline
      let deadline = null;
      const deadlineMatch = milestoneContent.match(/(?:deadline|échéance|semaine|week)\s*:?\s*(\d+|[^\n]+)/i);
      if (deadlineMatch) {
        deadline = deadlineMatch[1].trim();
      }

      milestones.push({
        name: name,
        steps: [...new Set(stepNums)],
        deadline: deadline || `Semaine ${(index + 1) * 2}`
      });

      index++;
    }

    return milestones;
  }

  /**
   * Detect project complexity
   * @param {Array} steps - Parsed steps
   * @returns {Object} Complexity info
   */
  static detectComplexity(steps) {
    const numSteps = steps.length;
    const hasNonLinearDeps = steps.some(s => s.dependsOn && s.dependsOn.length > 1);
    const hasParallel = steps.some(s => s.parallel);
    const hasModules = steps.some(s => s.module);
    const moduleValues = steps
      .filter((s) => s.module)
      .flatMap((s) =>
        Array.isArray(s.module) ? s.module : [s.module]
      )
      .map((m) => m.toString().trim())
      .filter(Boolean);
    const uniqueModules = [...new Set(moduleValues)];
    
    let level = 'simple';
    if (numSteps > 10 || hasNonLinearDeps || hasParallel || uniqueModules.length > 2) {
      level = 'complex';
    } else if (numSteps > 5 || hasModules) {
      level = 'medium';
    }
    
    return {
      level,
      numSteps,
      hasNonLinearDeps,
      hasParallel,
      modules: uniqueModules,
      recommendation: level === 'complex' 
        ? 'Utilisez le mode --complex pour une meilleure gestion'
        : level === 'medium'
          ? 'Considérez le mode --complex si le projet grandit'
          : 'Mode simple recommandé'
    };
  }
}

module.exports = PlanParser;
