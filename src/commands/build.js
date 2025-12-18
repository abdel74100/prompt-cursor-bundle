const chalk = require('chalk');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const CodeRunGenerator = require('../utils/codeRunGenerator');
const WorkflowGenerator = require('../utils/workflowGenerator');
const PlanParser = require('../utils/planParser');
const { ensureDirectoryStructure, getFilePath, getDirs, detectProvider, DEFAULT_PROVIDER } = require('../utils/directoryManager');
const { getProvider, getRulesPath, getRulesDir, getPromptDirectory } = require('../utils/aiProviders');
const MilestoneManager = require('../utils/milestoneManager');
const ModuleManager = require('../utils/moduleManager');
const SpecContext = require('../utils/specContext');
const { generateAgentsArtifacts } = require('../utils/agentsGenerator');

async function generateCursorMdcRules(outputDir) {
  const cursorDir = path.join(outputDir, '.cursor', 'rules');
  await fs.mkdir(cursorDir, { recursive: true });

  const scopeMaps = [
    {
      source: '.ai/rules/frontend-rules.md',
      target: 'frontend.mdc',
      files: [
        'apps/passenger-web/**',
        'apps/driver-web/**',
        'apps/admin-web/**',
        'packages/ui/**'
      ]
    },
    {
      source: '.ai/rules/backend-rules.md',
      target: 'backend.mdc',
      files: ['apps/api/**', 'packages/api-client/**']
    },
    {
      source: '.ai/rules/devops-rules.md',
      target: 'devops.mdc',
      files: ['infra/**', '.github/**', 'ops/**', 'Dockerfile', 'docker-compose.yml']
    },
    {
      source: '.ai/rules/database-rules.md',
      target: 'database.mdc',
      files: ['prisma/**', 'packages/database/**']
    },
    {
      source: '.ai/rules/qa-rules.md',
      target: 'qa.mdc',
      files: ['tests/**', 'e2e/**', 'cypress/**']
    },
    {
      source: '.ai/rules/mobile-rules.md',
      target: 'mobile.mdc',
      files: ['apps/mobile/**', 'apps/*-mobile/**']
    }
  ];

  let generalWritten = false;
  for (const scope of scopeMaps) {
    const absSource = path.join(outputDir, scope.source);
    if (!fsSync.existsSync(absSource)) continue;
    const content = await fs.readFile(absSource, 'utf-8');
    const header = [
      'files:',
      ...scope.files.map((f) => `  - "${f}"`),
      '---',
      ''
    ].join('\n');
    await fs.writeFile(path.join(cursorDir, scope.target), `${header}${content.trim()}\n`, 'utf-8');
    generalWritten = true;
  }

  const rootRulesPath = path.join(outputDir, '.cursorrules');
  if (fsSync.existsSync(rootRulesPath)) {
    const content = await fs.readFile(rootRulesPath, 'utf-8');
    const header = ['files:', '  - "**/*"', '---', ''].join('\n');
    await fs.writeFile(path.join(cursorDir, 'general.mdc'), `${header}${content.trim()}\n`, 'utf-8');
    generalWritten = true;
  }

  if (generalWritten) {
    console.log(chalk.green('✓ Generated Cursor MDC rules (.cursor/rules/)'));
  } else {
    console.log(chalk.gray('ℹ No MDC rules generated (sources missing)'));
  }
}

/**
 * Build command - Generate workflow and step files from saved responses
 * Supports simple mode (basic) and complex mode (modules, dependencies)
 */
async function buildCommand(options) {
  console.log(chalk.blue.bold('\n🔨 Build - Generate Workflow & Steps\n'));
  console.log(chalk.gray('Scanning project directory for saved responses...\n'));

  try {
    const outputDir = path.resolve(options.output || process.cwd());
    
    // Auto-detect provider from existing directory or use default
    let aiProviderKey = await detectProvider(outputDir) || DEFAULT_PROVIDER;
    
    // Use detected provider
    const provider = getProvider(aiProviderKey);
    const promptDir = getPromptDirectory(aiProviderKey);
    const dirs = getDirs(aiProviderKey);
    
    // Detect complex mode from options or config
    let complexMode = options.complex || false;
    let selectedModules = [];
    let projectName = 'MyProject';
    
    // Try to load project config (new unified config.json or legacy project-config.json)
    const configPath = path.join(outputDir, promptDir, 'config.json');
    const legacyConfigPath = path.join(outputDir, promptDir, 'project-config.json');
    const configFile = fsSync.existsSync(configPath) ? configPath : 
                       fsSync.existsSync(legacyConfigPath) ? legacyConfigPath : null;
    
    if (configFile) {
      try {
        const config = JSON.parse(fsSync.readFileSync(configFile, 'utf-8'));
        complexMode = complexMode || config.complexMode;
        selectedModules = selectedModules.length > 0 ? selectedModules : (config.modules || []);
        projectName = config.projectName || projectName;
      } catch (e) {
        // Ignore config parsing errors
      }
    }
    
    // In complex mode, automatically use ALL modules if none specified
    if (complexMode && selectedModules.length === 0) {
      selectedModules = Object.keys(ModuleManager.getModuleDefinitions());
    }
    
    console.log(chalk.gray(`Using ${provider.icon} ${provider.name} (${promptDir}/)`));
    if (complexMode) {
      console.log(chalk.blue(`📦 Complex mode enabled`));
      if (selectedModules.length > 0) {
        console.log(chalk.gray(`   Modules: ${selectedModules.join(', ')}`));
      }
    }
    console.log('');
    
    // Ensure directory structure exists
    await ensureDirectoryStructure(outputDir, aiProviderKey);
    
    // Check for required files in prompt directory docs/
    const filesToCheck = [
      'implementation-plan.md',
      'spec.md',
      'project-request.md',
      'ai-rules.md'
    ];
    
    const foundFiles = {};
    const missingFiles = [];
    
    for (const file of filesToCheck) {
      const filePath = path.join(outputDir, dirs.DOCS, file);
      try {
        await fs.access(filePath);
        foundFiles[file] = filePath;
        console.log(chalk.green(`✓ Found: ${promptDir}/docs/${file}`));
      } catch (error) {
        // Also check root directory for backward compatibility
        const rootPath = path.join(outputDir, file);
        try {
          await fs.access(rootPath);
          foundFiles[file] = rootPath;
          console.log(chalk.green(`✓ Found: ${file} (root)`));
        } catch (err) {
        missingFiles.push(file);
        console.log(chalk.yellow(`⚠ Missing: ${file}`));
        }
      }
    }
    
    if (missingFiles.length === filesToCheck.length) {
      console.log(chalk.red('\n❌ Error: No response files found!'));
      console.log(chalk.yellow(`\nPlease save your AI responses in ${promptDir}/docs/:`));
      console.log(chalk.white(`  - ${promptDir}/docs/project-request.md`));
      console.log(chalk.white(`  - ${promptDir}/docs/ai-rules.md`));
      console.log(chalk.white(`  - ${promptDir}/docs/spec.md`));
      console.log(chalk.white(`  - ${promptDir}/docs/implementation-plan.md`));
      console.log(chalk.cyan('\nThen run: prompt-cursor build\n'));
      process.exit(1);
    }
    
    // Parse implementation plan
    let steps = [];
    let milestones = null;
    let complexity = null;
    let projectContext = {};
    
    if (foundFiles['implementation-plan.md']) {
      console.log(chalk.cyan('\n📖 Parsing implementation plan...'));
      
      try {
        const planContent = await fs.readFile(foundFiles['implementation-plan.md'], 'utf-8');
        const planSteps = await PlanParser.parsePlanFile(foundFiles['implementation-plan.md']);
        console.log(chalk.green(`✓ Found ${planSteps.length} steps in plan`));
        
        // Detect complexity
        complexity = PlanParser.detectComplexity(planSteps);
        console.log(chalk.gray(`  Complexity: ${complexity.level} (${complexity.numSteps} steps)`));
        
        if (complexity.hasNonLinearDeps) {
          console.log(chalk.gray(`  → Non-linear dependencies detected`));
        }
        if (complexity.hasParallel) {
          console.log(chalk.gray(`  → Parallel steps detected`));
        }
        if (complexity.modules.length > 0) {
          console.log(chalk.gray(`  → Modules: ${complexity.modules.join(', ')}`));
        }
        
        // Suggest complex mode if not enabled but detected as complex
        if (!complexMode && complexity.level === 'complex') {
          console.log(chalk.yellow(`\n💡 ${complexity.recommendation}`));
          console.log(chalk.gray(`   Run: prompt-cursor build --complex\n`));
        }
        
        // Parse milestones if complex mode
        if (complexMode) {
          milestones = PlanParser.parseMilestones(planContent);
          if (milestones.length > 0) {
            console.log(chalk.green(`✓ Found ${milestones.length} milestones`));
          }
        }
        
        // Group into phases based on mode
        if (complexMode) {
          // In complex mode, keep all steps (no grouping)
          steps = PlanParser.groupIntoPhases(planSteps, 0);
          console.log(chalk.green(`✓ Using all ${steps.length} steps (complex mode)`));
        } else {
          // In simple mode, group into 5 phases
          steps = PlanParser.groupIntoPhases(planSteps, 5);
          console.log(chalk.green(`✓ Grouped into ${steps.length} development phases`));
        }
        
        if (steps.length === 0) {
          const fallbackCount = complexMode ? 10 : 5;
          steps = CodeRunGenerator.generateDefaultSteps(fallbackCount);
          console.log(chalk.yellow(`⚠ Plan vide, génération de ${fallbackCount} étapes par défaut`));
        }
        
      } catch (error) {
        console.log(chalk.yellow(`⚠ Could not parse plan: ${error.message}`));
        console.log(chalk.yellow('Using default steps instead...'));
        steps = CodeRunGenerator.generateDefaultSteps(complexMode ? 10 : 5);
      }
    } else {
      console.log(chalk.yellow('\n⚠ No implementation plan found, using default steps'));
      steps = CodeRunGenerator.generateDefaultSteps(complexMode ? 10 : 5);
    }

    try {
      projectContext = await SpecContext.buildContext({
        specPath: foundFiles['spec.md'],
        planPath: foundFiles['implementation-plan.md'],
      });
    } catch (error) {
      console.log(chalk.yellow(`⚠ Could not enrich context: ${error.message}`));
      projectContext = {};
    }
    
    // Generate workflow.md + steps/
    console.log(chalk.cyan('\n🎨 Generating workflow.md + steps/...\n'));
    
    const workflowGenerator = new WorkflowGenerator({
      projectName,
      outputDir,
      steps,
      aiProvider: aiProviderKey,
      complexMode,
      modules: selectedModules,
      projectContext
    });
    
    await workflowGenerator.generate();
    
    // Generate agent rules in complex mode
    let agentSummary = null;
    if (complexMode) {
      console.log(chalk.cyan('\n🤖 Génération des règles agents...\n'));
      agentSummary = await generateAgentsArtifacts({
        outputDir,
        aiProvider: aiProviderKey,
        projectName,
        steps,
        modules: selectedModules,
        skipRunPrompts: true
      });
    }
    
    // Copy rules file based on AI provider
    if (foundFiles['ai-rules.md']) {
      try {
        // Create directory if needed (e.g., .github for Copilot)
        const rulesDir = getRulesDir(aiProviderKey, outputDir);
        if (rulesDir) {
          await fs.mkdir(rulesDir, { recursive: true });
        }
        
        const rulesPath = getRulesPath(aiProviderKey, outputDir);
        const rulesContent = await fs.readFile(foundFiles['ai-rules.md'], 'utf-8');
        await fs.writeFile(rulesPath, rulesContent, 'utf-8');
        console.log(chalk.green(`✓ Generated ${provider.rulesFile} for ${provider.name}`));
      } catch (error) {
        console.log(chalk.yellow(`⚠ Could not copy rules: ${error.message}`));
      }
    }
    
    // Generate Cursor MDC rules when applicable
    if (aiProviderKey === 'cursor') {
      await generateCursorMdcRules(outputDir);
    }
    
    // Summary
    console.log(chalk.green.bold('\n✨ Build complete!\n'));
    console.log(chalk.cyan('📦 Generated files:'));
    console.log(chalk.white(`  ✓ ${promptDir}/workflow.md`));
    console.log(chalk.white(`  ✓ ${promptDir}/steps/ (${steps.length} fichiers)`));
    console.log(chalk.white(`  ✓ ${promptDir}/tasks.json`));
    
    if (complexMode && agentSummary && agentSummary.modules && agentSummary.modules.length > 0) {
      console.log(chalk.white(`  ✓ ${promptDir}/rules/ (${agentSummary.modules.length} modules)`));
      console.log(chalk.gray(`    Modules: ${agentSummary.modules.join(', ')}`));
    }
    if (foundFiles['ai-rules.md']) {
      console.log(chalk.white(`  ✓ ${provider.rulesFile} (${provider.name})`));
    }
    
    console.log(chalk.cyan('\n📋 Next steps:'));
    console.log(chalk.white(`  1. Open ${promptDir}/workflow.md`));
    console.log(chalk.white(`  2. Run: prompt-cursor agents:next --copy`));
    console.log(chalk.white(`  3. Paste prompt in your IDE (Cursor, Claude Code, etc.)`));
    console.log(chalk.white(`  4. Run: prompt-cursor agents:complete --step 1`));
    console.log(chalk.white(`  5. Repeat! 🚀\n`));
    
    // Show complexity recommendation
    if (complexity && !complexMode && complexity.level !== 'simple') {
      console.log(chalk.blue('━'.repeat(50)));
      console.log(chalk.blue(`💡 Tip: Your project seems ${complexity.level}.`));
      console.log(chalk.gray(`   Consider using: prompt-cursor build --complex`));
      console.log(chalk.blue('━'.repeat(50) + '\n'));
    }
    
  } catch (error) {
    console.error(chalk.red.bold('\n❌ Error:'));
    console.error(chalk.red(error.message));
    
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}


module.exports = buildCommand;
