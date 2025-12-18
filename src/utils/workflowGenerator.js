const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const chalk = require('chalk');
const { ensureDirectoryStructure, getDirs, DEFAULT_PROVIDER } = require('./directoryManager');
const { getPromptDirectory } = require('./aiProviders');
const ModuleManager = require('./moduleManager');
const DependencyGraph = require('./dependencyGraph');

/**
 * Simplified Workflow Generator
 * Generates: workflow.md + steps/step-N.md + tasks-map.json
 * Replaces: code-run.md + master-code-run.md + Instructions/ + .prompt-agents/run/
 */
class WorkflowGenerator {
  constructor(options = {}) {
    this.projectName = options.projectName || 'MyProject';
    this.outputDir = options.outputDir || process.cwd();
    this.steps = options.steps || [];
    this.aiProvider = options.aiProvider || DEFAULT_PROVIDER;
    this.promptDir = getPromptDirectory(this.aiProvider);
    this.dirs = getDirs(this.aiProvider);
    this.projectContext = options.projectContext || {};
    this.complexMode = options.complexMode || false;
    this.modules = options.modules || [];
    
    // Initialize module manager
    if (this.modules.length > 0 || this.complexMode) {
      this.moduleManager = new ModuleManager(this.outputDir, this.aiProvider);
      const moduleKeys = this.modules.length > 0 
        ? this.modules 
        : Object.keys(ModuleManager.getModuleDefinitions());
      this.moduleManager.initializeModules(moduleKeys);
      this.moduleAssignments = this.moduleManager.autoAssignSteps(this.steps);
    }
    
    // Initialize dependency graph
    if (this.steps.length > 0) {
      this.dependencyGraph = new DependencyGraph(this.steps);
      this.dependencyGraph.build();
    }
  }

  /**
   * Main generate method
   */
  async generate() {
    console.log(chalk.cyan('\n🚀 Génération du workflow simplifié...\n'));
    
    await ensureDirectoryStructure(this.outputDir, this.aiProvider);
    
    // Create steps directory
    const stepsDir = path.join(this.outputDir, this.promptDir, 'steps');
    await fs.mkdir(stepsDir, { recursive: true });
    
    // Generate workflow.md
    const workflowPath = await this.generateWorkflowFile();
    
    // Generate step files
    const stepFiles = await this.generateStepFiles(stepsDir);
    
    // Generate tasks-map.json
    const tasksMapPath = await this.generateTasksMap();
    
    // Generate rules (reuse existing logic)
    await this.generateRules();
    
    console.log(chalk.green('\n✨ Workflow généré avec succès!\n'));
    console.log(chalk.cyan('Fichiers créés:'));
    console.log(chalk.white(`  ✓ ${this.promptDir}/workflow.md`));
    console.log(chalk.white(`  ✓ ${this.promptDir}/steps/ (${stepFiles.length} fichiers)`));
    console.log(chalk.white(`  ✓ ${this.promptDir}/tasks.json`));
    
    return { workflowPath, stepFiles, tasksMapPath };
  }

  /**
   * Generate workflow.md
   */
  async generateWorkflowFile() {
    const templatePath = path.join(__dirname, '../prompts/workflow-template.md');
    let template = await fs.readFile(templatePath, 'utf-8');
    
    const replacements = {
      PROJECT_NAME: this.projectName,
      TOTAL_STEPS: this.steps.length.toString(),
      COMPLETED_STEPS: '0',
      CURRENT_STEP: this.steps.length > 0 ? '1' : '0',
      PROGRESS_PERCENTAGE: '0',
      PROGRESS_BAR: this.generateProgressBar(0, this.steps.length),
      MODULES_SUMMARY: this.generateModulesSummary(),
      STEPS_TABLE: this.generateStepsTable(),
      DEPENDENCY_GRAPH: this.dependencyGraph ? this.dependencyGraph.toMermaid() : 'Aucune dépendance',
      GENERATED_AT: new Date().toISOString()
    };
    
    let content = template;
    for (const [key, value] of Object.entries(replacements)) {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    
    const outputPath = path.join(this.outputDir, this.promptDir, 'workflow.md');
    await fs.writeFile(outputPath, content, 'utf-8');
    console.log(chalk.green(`✓ workflow.md créé`));
    
    return outputPath;
  }

  /**
   * Generate progress bar
   */
  generateProgressBar(completed, total, width = 30) {
    if (total === 0) return '░'.repeat(width) + ' 0%';
    const percent = Math.round((completed / total) * 100);
    const filled = Math.round((completed / total) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty) + ` ${percent}%`;
  }

  /**
   * Generate modules summary
   */
  generateModulesSummary() {
    if (!this.moduleManager) return 'Aucun module défini';
    
    const moduleDefs = ModuleManager.getModuleDefinitions();
    const moduleStepCount = {};
    
    // Count steps per module
    for (const step of this.steps) {
      const moduleValue = this.moduleAssignments?.[step.number] || step.module;
      const moduleKey = Array.isArray(moduleValue) ? moduleValue[0] : moduleValue;
      if (moduleKey) {
        moduleStepCount[moduleKey] = (moduleStepCount[moduleKey] || 0) + 1;
      }
    }
    
    const lines = [];
    for (const [key, count] of Object.entries(moduleStepCount)) {
      const def = moduleDefs[key];
      const icon = def?.icon || '📁';
      const name = def?.name || key;
      lines.push(`- ${icon} **${name}**: ${count} étapes`);
    }
    
    return lines.length > 0 ? lines.join('\n') : 'Aucun module détecté';
  }

  /**
   * Generate steps table
   */
  generateStepsTable() {
    const lines = [];
    
    for (const step of this.steps) {
      const moduleValue = this.moduleAssignments?.[step.number] || step.module;
      const moduleKey = Array.isArray(moduleValue) ? moduleValue[0] : moduleValue;
      const agent = this.resolveAgent(moduleKey);
      const status = step.number === 1 ? '🟡 En cours' : '⏳ En attente';
      
      lines.push(`| ${step.number} | ${step.name} | ${moduleKey || '-'} | ${agent} | ${status} |`);
    }
    
    return lines.join('\n');
  }

  /**
   * Resolve agent from module
   */
  resolveAgent(moduleKey) {
    const moduleAgentMap = {
      frontend: 'frontend',
      backend: 'backend',
      api: 'backend',
      auth: 'backend',
      database: 'database',
      infra: 'devops',
      testing: 'qa',
      mobile: 'mobile'
    };
    return moduleAgentMap[moduleKey] || 'architecture';
  }

  inferUiTestFromFiles(files) {
    if (!Array.isArray(files)) return null;

    for (const rawFile of files) {
      if (typeof rawFile !== 'string') continue;
      const file = rawFile.replace(/\\/g, '/');

      const rootMatch = file.match(/^apps\/([^/]+)\/app\/page\.(tsx|jsx|ts|js)$/);
      if (rootMatch) {
        const app = rootMatch[1];
        return {
          app,
          route: '/',
          baseUrlEnv: `E2E_${app.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_BASE_URL`
        };
      }

      const pageMatch = file.match(/^apps\/([^/]+)\/app\/(.+)\/page\.(tsx|jsx|ts|js)$/);
      if (!pageMatch) continue;

      const app = pageMatch[1];
      const rawRoute = pageMatch[2];
      if (rawRoute.includes('[')) continue;

      const segments = rawRoute
        .split('/')
        .filter(seg => !(seg.startsWith('(') && seg.endsWith(')')));
      const route = `/${segments.join('/')}` || '/';

      return {
        app,
        route: route === '/' ? '/' : route,
        baseUrlEnv: `E2E_${app.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_BASE_URL`
      };
    }

    return null;
  }

  /**
   * Generate step files (simplified format)
   */
  async generateStepFiles(stepsDir) {
    const templatePath = path.join(__dirname, '../prompts/step-template.md');
    const template = await fs.readFile(templatePath, 'utf-8');
    const createdFiles = [];
    
    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      const stepNumber = step.number || (i + 1);
      const moduleValue = this.moduleAssignments?.[stepNumber] || step.module;
      const moduleKey = Array.isArray(moduleValue) ? moduleValue[0] : moduleValue;
      const agent = this.resolveAgent(moduleKey);

      const uiTest = agent === 'frontend' ? this.inferUiTestFromFiles(step.files) : null;
      const e2eTestFile = uiTest ? `tests/e2e/step-${stepNumber}.spec.ts` : null;
      const e2eTestCommand = uiTest ? `pnpm exec playwright test ${e2eTestFile}` : null;
      const e2eSection = uiTest
        ? [
          '## 🧪 Test E2E',
          '',
          `- **Fichier:** \`${e2eTestFile}\``,
          `- **Commande:** \`${e2eTestCommand}\``,
          `- **Base URL:** \`${uiTest.baseUrlEnv}\` (ex: \`http://localhost:3000\`)`,
          `- **Route:** \`${uiTest.route}\``
        ].join('\n')
        : [
          '## 🧪 Test E2E',
          '',
          '- Aucun test E2E (non UI)',
        ].join('\n');
      
      const replacements = {
        STEP_NUMBER: stepNumber.toString(),
        STEP_TITLE: step.name || `Étape ${stepNumber}`,
        AGENT: agent,
        MODULE: moduleKey || 'generic',
        DEPENDENCIES: this.formatDependencies(step, stepNumber),
        ESTIMATION: step.estimatedTime || '2-4h',
        OBJECTIVE: step.objective || step.name || `Compléter l'étape ${stepNumber}`,
        TODO_LIST: this.generateTodoList(step, stepNumber, Boolean(uiTest)),
        E2E_SECTION: e2eSection,
        NEXT_STEP: this.generateNextStepSimple(i)
      };
      
      let content = template;
      for (const [key, value] of Object.entries(replacements)) {
        content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }
      
      const filePath = path.join(stepsDir, `step-${stepNumber}.md`);
      await fs.writeFile(filePath, content, 'utf-8');
      createdFiles.push(filePath);
    }
    
    console.log(chalk.green(`✓ ${createdFiles.length} fichiers step créés`));
    return createdFiles;
  }
  
  /**
   * Generate next step info (simplified)
   */
  generateNextStepSimple(currentIndex) {
    if (currentIndex >= this.steps.length - 1) {
      return '🎉 **Projet terminé !**';
    }
    const nextStep = this.steps[currentIndex + 1];
    const nextNumber = nextStep.number || (currentIndex + 2);
    return `Step ${nextNumber} - ${nextStep.name || 'Étape suivante'}`;
  }

  /**
   * Format dependencies
   */
  formatDependencies(step, stepNumber) {
    if (step.dependsOn && step.dependsOn.length > 0) {
      return step.dependsOn.map(d => `Step ${d}`).join(', ');
    }
    if (stepNumber === 1) return 'Aucune';
    return `Step ${stepNumber - 1}`;
  }

  /**
   * Generate instructions content
   */
  generateInstructionsContent(step, stepNumber) {
    const lines = [];
    lines.push(`### Objectif`);
    lines.push('');
    lines.push(step.objective || step.name || `Compléter l'étape ${stepNumber}`);
    lines.push('');
    
    if (step.tasks && step.tasks.length > 0) {
      lines.push('### Tâches détaillées');
      lines.push('');
      for (const task of step.tasks) {
        if (task.description) {
          lines.push(`- ${task.description}`);
        }
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Generate agent prompt (ready to copy to IDE)
   */
  generateAgentPrompt(step, stepNumber, agent, moduleKey) {
    const agentNames = {
      frontend: 'DÉVELOPPEUR FRONTEND SENIOR',
      backend: 'DÉVELOPPEUR BACKEND SENIOR',
      database: 'INGÉNIEUR BASE DE DONNÉES',
      devops: 'INGÉNIEUR DEVOPS/INFRA',
      qa: 'INGÉNIEUR QA/TESTING',
      mobile: 'DÉVELOPPEUR MOBILE',
      architecture: 'ARCHITECTE LOGICIEL'
    };
    
    const agentName = agentNames[agent] || 'DÉVELOPPEUR';
    const rulesFile = `.prompt-rules/${agent}-rules.md`;
    
    return `Tu es ${agentName}.

MISSION: ${step.name || `Étape ${stepNumber}`}

CONTEXTE:
- Projet: ${this.projectName}
- Module: ${moduleKey || 'général'}
- Étape: ${stepNumber}/${this.steps.length}

RÈGLES À SUIVRE:
Voir ${rulesFile}

SPEC DU PROJET:
Voir .prompt-cursor/docs/spec.md

OBJECTIF:
${step.objective || step.name || 'Implémenter cette étape'}

LIVRABLES ATTENDUS:
- Code fonctionnel et testé
- Respect des conventions du projet
- Aucune régression

CONTRAINTES:
- Ne pas casser l'existant
- Respecter l'architecture définie
- Gérer les erreurs proprement`;
  }

  /**
   * Generate target files
   */
  generateTargetFiles(step, moduleKey) {
    const defaults = {
      frontend: ['src/components/', 'src/pages/', 'src/styles/'],
      backend: ['src/services/', 'src/controllers/', 'src/dto/'],
      database: ['prisma/schema.prisma', 'src/migrations/'],
      devops: ['infra/', '.github/workflows/', 'docker/'],
      api: ['src/api/', 'src/routes/'],
      auth: ['src/auth/', 'src/guards/']
    };
    
    const files = step.files || defaults[moduleKey] || ['src/'];
    return files.map(f => `- \`${f}\``).join('\n');
  }

  /**
   * Generate commands
   */
  generateCommands(step, moduleKey) {
    const defaults = {
      frontend: 'npm run lint\nnpm run test:ui\nnpm run dev',
      backend: 'npm run lint\nnpm run test\nnpm run start:dev',
      database: 'npx prisma migrate dev\nnpx prisma generate',
      devops: 'terraform plan\nterraform apply',
      default: 'npm run lint\nnpm test\nnpm run build'
    };
    
    return defaults[moduleKey] || defaults.default;
  }

  /**
   * Generate todo list
   */
  generateTodoList(step, stepNumber, includeE2E = false) {
    const todos = [];
    
    if (step.tasks && step.tasks.length > 0) {
      for (const task of step.tasks.slice(0, 5)) {
        if (task.description) {
          todos.push(`- [ ] ${task.description}`);
        }
      }
    }
    
    if (includeE2E) {
      todos.push(`- [ ] Ajouter ${`tests/e2e/step-${stepNumber}.spec.ts`}`);
    }
    
    // Add default todos if not enough
    if (todos.length < 3) {
      todos.push(`- [ ] Implémenter ${step.name || 'la fonctionnalité'}`);
      todos.push('- [ ] Écrire les tests');
      todos.push('- [ ] Valider le build');
    }
    
    return todos.join('\n');
  }

  /**
   * Generate test expectations
   */
  generateTestExpectations(step) {
    const lines = [];
    lines.push('1. **Fonctionnalité principale**');
    lines.push(`   - Vérifie que: ${step.name || 'l\'implémentation'} fonctionne correctement`);
    lines.push('');
    lines.push('2. **Gestion des erreurs**');
    lines.push('   - Vérifie que: Les erreurs sont gérées proprement');
    
    return lines.join('\n');
  }

  /**
   * Get test command for module
   */
  getTestCommand(moduleKey) {
    const commands = {
      frontend: 'npm run test:ui',
      backend: 'npm run test',
      database: 'npm run test:db',
      devops: 'npm run test:infra',
      default: 'npm test'
    };
    return commands[moduleKey] || commands.default;
  }

  /**
   * Generate validation checklist
   */
  generateValidationChecklist(step, stepNumber) {
    const items = [
      '- [ ] Tous les TODOs complétés',
      `- [ ] Tests \`tests/step${stepNumber}_test.js\` passent`,
      '- [ ] Build sans erreur',
      '- [ ] Application démarre correctement',
      '- [ ] Aucune régression'
    ];
    return items.join('\n');
  }

  /**
   * Generate next step info
   */
  generateNextStep(currentIndex) {
    const nextStep = this.steps[currentIndex + 1];
    if (nextStep) {
      return `**Step ${nextStep.number || currentIndex + 2}: ${nextStep.name}**`;
    }
    return '🎉 **Dernière étape du projet !**';
  }

  /**
   * Generate tasks.json
   */
  async generateTasksMap() {
    const aiDir = path.join(this.outputDir, '.ai');
    await fs.mkdir(aiDir, { recursive: true });
    
    const entries = this.steps.map((step, index) => {
      const stepNumber = step.number || (index + 1);
      const moduleValue = this.moduleAssignments?.[stepNumber] || step.module;
      const moduleKey = Array.isArray(moduleValue) ? moduleValue[0] : moduleValue;
      const agent = this.resolveAgent(moduleKey);
      const uiTest = agent === 'frontend' ? this.inferUiTestFromFiles(step.files) : null;
      const e2eFile = uiTest ? `tests/e2e/step-${stepNumber}.spec.ts` : null;
      
      const entry = {
        step: stepNumber,
        title: step.name || `Étape ${stepNumber}`,
        file: `.ai/steps/step-${stepNumber}.md`,
        agent,
        module: moduleKey || null,
        files: step.files || [],
        dependsOn: step.dependsOn || (stepNumber > 1 ? [stepNumber - 1] : []),
        status: 'pending'
      };

      if (uiTest && e2eFile) {
        entry.e2e = {
          type: 'ui',
          file: e2eFile,
          command: `pnpm exec playwright test ${e2eFile}`,
          baseUrlEnv: uiTest.baseUrlEnv,
          route: uiTest.route
        };
      }

      return entry;
    });
    
    // Mark first step as ready
    if (entries.length > 0) {
      entries[0].status = 'ready';
    }
    
    const tasksMap = {
      generatedAt: new Date().toISOString(),
      project: this.projectName,
      totalSteps: this.steps.length,
      entries
    };
    
    const outputPath = path.join(aiDir, 'tasks.json');
    await fs.writeFile(outputPath, JSON.stringify(tasksMap, null, 2), 'utf-8');
    console.log(chalk.green(`✓ tasks.json créé`));
    
    return outputPath;
  }

  /**
   * Generate rules files
   */
  async generateRules() {
    // Reuse existing rules generation from agentsGenerator
    // This is handled separately by build command
    console.log(chalk.gray('  ℹ Règles générées via agentsGenerator'));
  }

  /**
   * Generate default steps
   */
  static generateDefaultSteps(numSteps) {
    const defaultNames = [
      'Configuration et architecture',
      'Authentification et sécurité',
      'Fonctionnalités principales',
      'Interface utilisateur',
      'Tests et validation',
      'Optimisation et performance',
      'Déploiement et monitoring'
    ];

    return Array.from({ length: numSteps }, (_, i) => ({
      number: i + 1,
      name: defaultNames[i] || `Étape ${i + 1}`,
      objective: 'À définir selon votre projet',
      dependsOn: i > 0 ? [i] : []
    }));
  }
}

module.exports = WorkflowGenerator;

