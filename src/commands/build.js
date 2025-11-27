const chalk = require('chalk');
const path = require('path');
const fs = require('fs').promises;
const { loadContext, saveContext, recordCommand, trackFile, updateWorkflowPhase } = require('../utils/contextTrackerV2');
const CodeRunGenerator = require('../utils/codeRunGenerator');
const PlanParser = require('../utils/planParser');
const { ensureDirectoryStructure, getFilePath, getDirs, detectProvider, DEFAULT_PROVIDER } = require('../utils/directoryManager');
const { getProvider, getRulesPath, getRulesDir, getPromptDirectory } = require('../utils/aiProviders');

/**
 * Build command - Generate intelligent code-run from saved responses
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
    
    console.log(chalk.gray(`Using ${provider.icon} ${provider.name} (${promptDir}/)\n`));
    
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
    
    if (foundFiles['implementation-plan.md']) {
      console.log(chalk.cyan('\n📖 Parsing implementation plan...'));
      
      try {
        const planSteps = await PlanParser.parsePlanFile(foundFiles['implementation-plan.md']);
        console.log(chalk.green(`✓ Found ${planSteps.length} steps in plan`));
        
        // Group into phases (typically 5-7 main phases)
        steps = PlanParser.groupIntoPhases(planSteps, 5);
        console.log(chalk.green(`✓ Grouped into ${steps.length} development phases`));
        
      } catch (error) {
        console.log(chalk.yellow(`⚠ Could not parse plan: ${error.message}`));
        console.log(chalk.yellow('Using default steps instead...'));
        steps = CodeRunGenerator.generateDefaultSteps(5);
      }
    } else {
      console.log(chalk.yellow('\n⚠ No implementation plan found, using default steps'));
      steps = CodeRunGenerator.generateDefaultSteps(5);
    }
    
    // Generate code-run
    console.log(chalk.cyan('\n🎨 Generating code-run.md...\n'));
    
    const generator = new CodeRunGenerator({
      projectName: projectName,
      outputDir: outputDir,
      steps: steps,
      fileExtension: 'js',
      language: 'javascript',
      aiProvider: aiProviderKey
    });
    
    await generator.generate();
    
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
    if (foundFiles['ai-rules.md']) {
      console.log(chalk.white(`  ✓ ${provider.rulesFile} (${provider.name})`));
    }
    
    console.log(chalk.cyan('\n📋 Next steps:'));
    console.log(chalk.white(`  1. Open ${promptDir}/workflow/code-run.md`));
    console.log(chalk.white(`  2. Review ${promptDir}/workflow/Instructions/instructions-step1.md`));
    console.log(chalk.white('  3. Customize the TODOs for your project'));
    console.log(chalk.white('  4. Start development! 🚀\n'));
    
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
