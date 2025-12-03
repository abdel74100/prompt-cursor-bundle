const chalk = require('chalk');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { loadContext, saveContext, recordCommand, trackFile, updateWorkflowPhase } = require('../utils/contextTrackerV2');
const CodeRunGenerator = require('../utils/codeRunGenerator');
const PlanParser = require('../utils/planParser');
const { ensureDirectoryStructure, getFilePath, getDirs, detectProvider, DEFAULT_PROVIDER } = require('../utils/directoryManager');
const { getProvider, getRulesPath, getRulesDir, getPromptDirectory } = require('../utils/aiProviders');
const DependencyGraph = require('../utils/dependencyGraph');
const MilestoneManager = require('../utils/milestoneManager');
const ModuleManager = require('../utils/moduleManager');

/**
 * Build command - Generate intelligent code-run from saved responses
 * Now supports complex mode with modules, milestones, and dependencies
 */
async function buildCommand(options) {
  console.log(chalk.blue.bold('\n🔨 Build - Generate Intelligent Project Files\n'));
  console.log(chalk.gray('Scanning project directory for saved responses...\n'));

  try {
    const outputDir = path.resolve(options.output || process.cwd());
    
    // Auto-detect provider from existing directory or use default
    let aiProviderKey = await detectProvider(outputDir) || DEFAULT_PROVIDER;
    
    // Load context (will use detected provider)
    const context = await loadContext(outputDir, aiProviderKey);
    
    // Use provider from context if available
    aiProviderKey = context.aiProvider || aiProviderKey;
    const provider = getProvider(aiProviderKey);
    const promptDir = getPromptDirectory(aiProviderKey);
    const dirs = getDirs(aiProviderKey);
    
    // Detect complex mode from options or context
    let complexMode = options.complex || context.complexMode || false;
    let selectedModules = options.modules 
      ? options.modules.split(',') 
      : (context.modules || []);
    
    // Try to load project config
    const configPath = path.join(outputDir, promptDir, 'project-config.json');
    if (fsSync.existsSync(configPath)) {
      try {
        const config = JSON.parse(fsSync.readFileSync(configPath, 'utf-8'));
        complexMode = complexMode || config.complexMode;
        selectedModules = selectedModules.length > 0 ? selectedModules : (config.modules || []);
      } catch (e) {
        // Ignore config parsing errors
      }
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
    let projectName = context.projectName || 'MyProject';
    let milestones = null;
    let complexity = null;
    
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
        
      } catch (error) {
        console.log(chalk.yellow(`⚠ Could not parse plan: ${error.message}`));
        console.log(chalk.yellow('Using default steps instead...'));
        steps = CodeRunGenerator.generateDefaultSteps(complexMode ? 10 : 5);
      }
    } else {
      console.log(chalk.yellow('\n⚠ No implementation plan found, using default steps'));
      steps = CodeRunGenerator.generateDefaultSteps(complexMode ? 10 : 5);
    }
    
    // Generate code-run
    console.log(chalk.cyan('\n🎨 Generating code-run.md...\n'));
    
    const generatorOptions = {
      projectName: projectName,
      outputDir: outputDir,
      steps: steps,
      fileExtension: 'js',
      language: 'javascript',
      aiProvider: aiProviderKey,
      complexMode: complexMode,
      modules: selectedModules,
      milestones: milestones,
      autoGroupMilestones: true
    };
    
    const generator = new CodeRunGenerator(generatorOptions);
    
    await generator.generate();
    
    // Generate dependency graph visualization for complex mode
    if (complexMode && steps.length > 0) {
      console.log(chalk.cyan('\n🔗 Generating dependency graph...'));
      
      const depGraph = new DependencyGraph(steps);
      depGraph.build();
      
      // Save dependency graph as markdown
      const graphContent = generateDependencyGraphMarkdown(depGraph, steps);
      const graphPath = path.join(outputDir, promptDir, 'workflow', 'dependency-graph.md');
      await fs.writeFile(graphPath, graphContent, 'utf-8');
      console.log(chalk.green(`✓ dependency-graph.md created`));
      
      // Show critical path
      const criticalPath = depGraph.getCriticalPath();
      if (criticalPath.length > 0) {
        console.log(chalk.gray(`  Critical path: ${criticalPath.map(n => `Step ${n}`).join(' → ')}`));
      }
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
    
    // Update context
    recordCommand(context, 'build', options);
    trackFile(context, `${promptDir}/workflow/code-run.md`, 'buildCreated');
    trackFile(context, `${promptDir}/workflow/Instructions/`, 'buildCreated');
    updateWorkflowPhase(context, 'development');
    
    // Update context with complex mode info
    context.complexMode = complexMode;
    context.modules = selectedModules;
    context.development.totalSteps = steps.length;
    
    // Mark AI files as created
    if (foundFiles['implementation-plan.md']) trackFile(context, 'implementation-plan.md', 'cursorCreated');
    if (foundFiles['spec.md']) trackFile(context, 'spec.md', 'cursorCreated');
    if (foundFiles['project-request.md']) trackFile(context, 'project-request.md', 'cursorCreated');
    
    saveContext(context, outputDir, aiProviderKey);
    
    // Summary
    console.log(chalk.green.bold('\n✨ Build complete!\n'));
    console.log(chalk.cyan('📦 Generated files:'));
    console.log(chalk.white(`  ✓ ${promptDir}/workflow/code-run.md`));
    console.log(chalk.white(`  ✓ ${promptDir}/workflow/Instructions/ (${steps.length} files)`));
    if (complexMode) {
      console.log(chalk.white(`  ✓ ${promptDir}/workflow/dependency-graph.md`));
      if (selectedModules.length > 0) {
        console.log(chalk.white(`  ✓ ${promptDir}/workflow/master-code-run.md`));
        console.log(chalk.white(`  ✓ ${promptDir}/modules/ (${selectedModules.length} modules)`));
      }
    }
    if (foundFiles['ai-rules.md']) {
      console.log(chalk.white(`  ✓ ${provider.rulesFile} (${provider.name})`));
    }
    
    console.log(chalk.cyan('\n📋 Next steps:'));
    console.log(chalk.white(`  1. Open ${promptDir}/workflow/code-run.md`));
    console.log(chalk.white(`  2. Review ${promptDir}/workflow/Instructions/instructions-step1.md`));
    if (complexMode) {
      console.log(chalk.white(`  3. Check dependency-graph.md for step dependencies`));
      console.log(chalk.white(`  4. Use 'prompt-cursor context --dashboard' for progress`));
    } else {
      console.log(chalk.white('  3. Customize the TODOs for your project'));
    }
    console.log(chalk.white(`  ${complexMode ? '5' : '4'}. Start development! 🚀\n`));
    
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

/**
 * Generate dependency graph markdown content
 */
function generateDependencyGraphMarkdown(depGraph, steps) {
  const lines = [];
  
  lines.push('# 🔗 Dependency Graph\n');
  lines.push('This document shows the dependencies between steps.\n');
  lines.push('---\n');
  
  // Mermaid diagram
  lines.push('## Visual Graph\n');
  lines.push(depGraph.toMermaid());
  lines.push('');
  
  // Critical path
  lines.push('## 🎯 Critical Path\n');
  const criticalPath = depGraph.getCriticalPath();
  lines.push(`The longest dependency chain: **${criticalPath.length} steps**\n`);
  lines.push(criticalPath.map(n => {
    const step = steps.find(s => s.number === n);
    return `${n}. ${step ? step.name : `Step ${n}`}`;
  }).join(' → ') + '\n');
  
  // Step details
  lines.push('## 📋 Step Dependencies\n');
  lines.push('| Step | Name | Depends On | Can Parallel |');
  lines.push('|------|------|------------|--------------|');
  
  for (const step of steps) {
    const deps = step.dependsOn && step.dependsOn.length > 0 
      ? step.dependsOn.map(d => `Step ${d}`).join(', ')
      : 'None';
    const parallel = step.parallel ? '✅ Yes' : '❌ No';
    lines.push(`| ${step.number} | ${step.name} | ${deps} | ${parallel} |`);
  }
  
  lines.push('');
  
  // Available steps (what can run now)
  lines.push('## ⚡ Parallel Execution Guide\n');
  lines.push('Steps that can run in parallel after completing their dependencies:\n');
  
  const parallelGroups = findParallelGroups(steps);
  for (const [afterStep, parallelSteps] of Object.entries(parallelGroups)) {
    if (parallelSteps.length > 1) {
      lines.push(`\n**After Step ${afterStep}:**`);
      parallelSteps.forEach(s => {
        lines.push(`- Step ${s.number}: ${s.name}`);
      });
    }
  }
  
  lines.push('');
  
  return lines.join('\n');
}

/**
 * Find groups of steps that can run in parallel
 */
function findParallelGroups(steps) {
  const groups = {};
  
  for (const step of steps) {
    if (step.dependsOn && step.dependsOn.length > 0) {
      // Group by the maximum dependency
      const maxDep = Math.max(...step.dependsOn);
      if (!groups[maxDep]) groups[maxDep] = [];
      groups[maxDep].push(step);
    } else {
      // No dependencies - can start immediately
      if (!groups[0]) groups[0] = [];
      groups[0].push(step);
    }
  }
  
  return groups;
}

module.exports = buildCommand;
