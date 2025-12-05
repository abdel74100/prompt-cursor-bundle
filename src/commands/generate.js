const inquirer = require('inquirer').default;
const chalk = require('chalk');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { loadContext, saveContext, recordCommand, trackFile, updateWorkflowPhase } = require('../utils/contextTrackerV2');
const { ensureDirectoryStructure, getFilePath, getDirs } = require('../utils/directoryManager');
const { generateVersionsSection } = require('../utils/versionCompatibility');
const { getProvider, getProviderChoices, getPromptDirectory } = require('../utils/aiProviders');
const { extractPromptContent, copyToClipboard, watchForFiles } = require('../utils/fileWatcher');
const ModuleManager = require('../utils/moduleManager');
const buildCommand = require('./build');

/**
 * Load content from file
 */
function loadFileContent(filePath) {
  if (!filePath) return null;
  
  const resolvedPath = path.resolve(filePath);
  if (!fsSync.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }
  
  return fsSync.readFileSync(resolvedPath, 'utf-8').trim();
}

/**
 * Ensure directory exists
 */
function ensureDirectoryExists(dirPath) {
  if (!fsSync.existsSync(dirPath)) {
    fsSync.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Generate command - Create a single intelligent prompt that generates all files
 * Now supports complex mode with modules
 */
async function generateCommand(options) {
  console.log(chalk.blue.bold('\n🚀 Generate - One Prompt to Rule Them All\n'));
  console.log(chalk.gray('This creates a single intelligent prompt for your AI assistant.\n'));

  try {
    let projectName = options.name;
    let ideaFile = options.ideaFile;
    let outputDir = options.output;
    let aiProvider = options.provider;
    let complexMode = options.complex || false;
    let selectedModules = options.modules ? options.modules.split(',') : [];
    
    // Ask for missing info
    const questions = [];
    
    if (!projectName) {
      questions.push({
        type: 'input',
        name: 'projectName',
        message: 'What is your project name?',
        default: 'My Project',
        validate: (input) => input.trim().length > 0 || 'Project name cannot be empty'
      });
    }
    
    if (!ideaFile) {
      questions.push({
        type: 'input',
        name: 'ideaFile',
        message: 'Path to your project idea file (markdown):',
        validate: (input) => input.trim().length > 0 || 'Idea file is required for generate command'
      });
    }
    
    if (!outputDir) {
      questions.push({
        type: 'input',
        name: 'outputDir',
        message: 'Output directory (where to create project):',
        default: './my-project',
        validate: (input) => input.trim().length > 0 || 'Output directory cannot be empty'
      });
    }
    
    // Ask for AI provider
    if (!aiProvider) {
      questions.push({
        type: 'list',
        name: 'aiProvider',
        message: 'Which AI assistant will you use?',
        choices: getProviderChoices(),
        default: 'cursor'
      });
    }
    
    // Ask for complex mode if not specified
    if (!options.complex && !options.simple) {
      questions.push({
        type: 'confirm',
        name: 'complexMode',
        message: '📦 Enable complex project mode? (modules, milestones, dependencies)',
        default: false
      });
    }
    
    if (questions.length > 0) {
      const answers = await inquirer.prompt(questions);
      projectName = projectName || answers.projectName;
      ideaFile = ideaFile || answers.ideaFile;
      outputDir = outputDir || answers.outputDir;
      aiProvider = aiProvider || answers.aiProvider;
      complexMode = complexMode || answers.complexMode || false;
    }
    
    // In complex mode, automatically use ALL modules (no interactive selection)
    if (complexMode && selectedModules.length === 0) {
      selectedModules = Object.keys(ModuleManager.getModuleDefinitions());
      console.log(chalk.blue(`📦 Mode complexe: tous les modules activés automatiquement`));
      console.log(chalk.gray(`   → ${selectedModules.join(', ')}`));
      console.log(chalk.gray(`   (L'IA structurera le plan selon les besoins du projet)\n`));
    }
    
    // Get provider configuration
    const provider = getProvider(aiProvider);
    
    outputDir = path.resolve(outputDir);
    
    // Load idea file
    let ideaContent;
    try {
      ideaContent = loadFileContent(ideaFile);
      console.log(chalk.cyan(`\n📄 Loaded idea from: ${ideaFile}\n`));
    } catch (error) {
      console.error(chalk.red(`\n❌ Error loading idea file: ${error.message}\n`));
      process.exit(1);
    }
    
    // Get the dynamic directory for this provider
    const promptDir = getPromptDirectory(aiProvider);
    const dirs = getDirs(aiProvider);
    
    // Ensure output directory and prompt structure exist
    ensureDirectoryExists(outputDir);
    await ensureDirectoryStructure(outputDir, aiProvider);
    
    // Load template (use complex template if in complex mode)
    const templateName = complexMode ? 'prompt-generate-template-complex.txt' : 'prompt-generate-template.txt';
    let templatePath = path.join(__dirname, '../prompts/', templateName);
    
    // Fallback to standard template if complex doesn't exist
    if (!fsSync.existsSync(templatePath)) {
      templatePath = path.join(__dirname, '../prompts/prompt-generate-template.txt');
    }
    
    let template = await fs.readFile(templatePath, 'utf-8');
    
    // Generate compatibility section based on idea content
    const versionsSection = generateVersionsSection(ideaContent);
    
    // Replace placeholders with actual content
    let promptContent = template
      .replace('{{IDEA}}', ideaContent)
      .replace(/\{\{PROMPT_DIR\}\}/g, promptDir);
    
    // Add complex mode instructions if enabled
    if (complexMode) {
      const complexInstructions = generateComplexModeInstructions(selectedModules);
      promptContent = promptContent.replace('# Your Task', `${complexInstructions}\n\n# Your Task`);
    }
    
    // Insert versions section after the idea
    if (versionsSection) {
      promptContent = promptContent.replace(
        '---\n\n# Your Task',
        `---\n${versionsSection}\n---\n\n# Your Task`
      );
    }
    
    // Generate the prompt file in dynamic prompts directory
    const promptFilePath = getFilePath(outputDir, 'PROMPT_GENERATE', aiProvider);
    
    let fileContent = `# 🎯 ${projectName} - Prompt pour ${provider.name}\n\n`;
    fileContent += `**Assistant AI:** ${provider.icon} ${provider.name}\n`;
    fileContent += `**Dossier:** \`${promptDir}/\`\n`;
    fileContent += `**Fichier de règles:** \`${provider.rulesFile}\`\n`;
    
    if (complexMode) {
      fileContent += `**Mode:** 📦 Complexe\n`;
      fileContent += `**Modules:** ${selectedModules.join(', ')}\n`;
    }
    
    fileContent += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    fileContent += `## 📋 Instructions (4 étapes)\n\n`;
    fileContent += `1️⃣ **Copier** le prompt entre 🚀 START et 🏁 END  \n`;
    fileContent += `2️⃣ **Coller** dans ${provider.name}  \n`;
    fileContent += `3️⃣ **Sauvegarder** les 4 fichiers dans \`${promptDir}/docs/\`  \n`;
    fileContent += `4️⃣ **Lancer** : \`prompt-cursor build${complexMode ? ' --complex' : ''}\`\n\n`;
    fileContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    fileContent += `## 🚀 START - COPIER TOUT CE QUI SUIT\n\n`;
    fileContent += promptContent;
    fileContent += `\n\n## 🏁 END - ARRÊTER DE COPIER\n\n`;
    fileContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    fileContent += `## 📁 Où sauvegarder les fichiers générés\n\n`;
    fileContent += `${provider.name} va générer 4 fichiers. Sauvegardez-les dans \`${promptDir}/docs/\` :\n\n`;
    fileContent += `\`\`\`\n`;
    fileContent += `${promptDir}/docs/project-request.md\n`;
    fileContent += `${promptDir}/docs/ai-rules.md\n`;
    fileContent += `${promptDir}/docs/spec.md\n`;
    fileContent += `${promptDir}/docs/implementation-plan.md\n`;
    fileContent += `\`\`\`\n\n`;
    fileContent += `## ⚡ Ensuite\n\n`;
    fileContent += `\`\`\`bash\n`;
    fileContent += `prompt-cursor build${complexMode ? ' --complex' : ''}  # Génère ${provider.rulesFile} + code-run.md + Instructions/\n`;
    fileContent += `\`\`\`\n`;
    
    await fs.writeFile(promptFilePath, fileContent, 'utf-8');
      
    console.log(chalk.green.bold(`✅ Prompt generated for ${provider.name}!\n`));
    console.log(chalk.green(`File: ${promptDir}/prompts/prompt-generate.md`));
    console.log(chalk.gray(`Directory: ${promptDir}/`));
    console.log(chalk.gray(`Rules file: ${provider.rulesFile}`));
    
    if (complexMode) {
      console.log(chalk.blue(`Mode: 📦 Complex`));
      console.log(chalk.gray(`Modules: ${selectedModules.join(', ')}`));
    }
    
    console.log('');
      
    // Load/update context
    const context = await loadContext(outputDir, aiProvider);
    context.projectName = projectName;
    context.outputDir = outputDir;
    context.aiProvider = aiProvider;
    context.workflow.type = 'generate';
    context.complexMode = complexMode;
    context.modules = selectedModules;
    recordCommand(context, 'generate', options);
    trackFile(context, `${promptDir}/prompts/prompt-generate.md`, 'generated');
    updateWorkflowPhase(context, 'prompt');
    saveContext(context, outputDir, aiProvider);
    
    // Save project config for complex mode
    if (complexMode) {
      const configPath = path.join(outputDir, promptDir, 'project-config.json');
      const config = {
        projectName,
        complexMode: true,
        modules: selectedModules,
        aiProvider,
        createdAt: new Date().toISOString()
      };
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
    }
      
    // Instructions
    console.log(chalk.cyan.bold('📋 Next Steps:\n'));
    console.log(chalk.white(`  1. Open ${promptDir}/prompts/prompt-generate.md`));
    console.log(chalk.white(`  2. Copy the prompt and paste it into ${provider.name}`));
    console.log(chalk.white(`  3. Save each file in ${promptDir}/docs/:`));
    console.log(chalk.gray(`     - ${promptDir}/docs/project-request.md`));
    console.log(chalk.gray(`     - ${promptDir}/docs/ai-rules.md`));
    console.log(chalk.gray(`     - ${promptDir}/docs/spec.md`));
    console.log(chalk.gray(`     - ${promptDir}/docs/implementation-plan.md`));
    console.log(chalk.white(`  4. Run: prompt-cursor build${complexMode ? ' --complex' : ''}`));
    console.log(chalk.gray(`     → This generates ${provider.rulesFile} + code-run.md + Instructions/\n`));
      
    console.log(chalk.green('✨ All files will be in:'), chalk.bold(outputDir + '/\n'));
    
    // Auto mode: copy to clipboard and watch for files
    if (options.auto) {
      console.log(chalk.blue.bold('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
      console.log(chalk.blue.bold('🤖 Mode Auto activé\n'));
      
      // Extract prompt content between START and END
      const promptToClipboard = extractPromptContent(fileContent);
      
      if (promptToClipboard) {
        const copied = await copyToClipboard(promptToClipboard);
        if (copied) {
          console.log(chalk.green('📋 Prompt copié dans le presse-papiers !'));
          console.log(chalk.gray('   (Contenu entre 🚀 START et 🏁 END uniquement)\n'));
        } else {
          console.log(chalk.yellow('⚠️  Impossible de copier dans le presse-papiers.'));
          console.log(chalk.gray('   Copiez manuellement le contenu du fichier.\n'));
        }
      }
      
      console.log(chalk.cyan(`👉 Collez le prompt dans ${provider.name} et sauvegardez les fichiers.\n`));
      
      // Watch for files
      const docsDir = path.join(outputDir, promptDir, 'docs');
      
      watchForFiles(docsDir, async () => {
        console.log(chalk.blue.bold('\n🔨 Lancement automatique de build...\n'));
        
        // Run build command with complex mode if enabled
        await buildCommand({ 
          output: outputDir,
          complex: complexMode,
          modules: selectedModules.join(',')
        });
        
        console.log(chalk.green.bold('\n✅ Mode auto terminé ! Votre projet est prêt.\n'));
      });
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
 * Generate complex mode instructions for the prompt
 */
function generateComplexModeInstructions(modules) {
  const moduleDescriptions = {
    frontend: '🎨 Frontend (UI, components, pages)',
    backend: '⚙️ Backend (server, controllers, services)',
    api: '🔌 API (REST/GraphQL endpoints)',
    database: '🗄️ Database (schema, migrations)',
    infra: '☁️ Infrastructure (Docker, CI/CD, cloud)',
    mobile: '📱 Mobile (React Native, Flutter)',
    auth: '🔐 Authentication (JWT, OAuth)',
    testing: '🧪 Testing (unit, e2e, integration)'
  };

  let instructions = `# 📦 Complex Project Mode\n\n`;
  instructions += `This is a complex project with multiple modules. Please structure your implementation plan accordingly.\n\n`;
  instructions += `## Selected Modules:\n\n`;
  
  for (const mod of modules) {
    instructions += `- ${moduleDescriptions[mod] || mod}\n`;
  }
  
  instructions += `\n## Additional Requirements for Complex Mode:\n\n`;
  instructions += `1. **Dependencies**: For each step, specify which other steps it depends on\n`;
  instructions += `   - Format: \`Depends on: Step 1, Step 3\` or \`Depends on: none\`\n`;
  instructions += `   - Mark steps that can run in parallel with \`(parallel)\`\n\n`;
  instructions += `2. **Modules**: Assign each step to a module\n`;
  instructions += `   - Format: \`Module: frontend\` or \`Module: backend\`\n\n`;
  instructions += `3. **Milestones**: Group steps into milestones (MVP, Beta, Production)\n`;
  instructions += `   - Use \`## Phase 1: MVP\` headers to define milestones\n\n`;
  instructions += `4. **Estimated Time**: Provide time estimates for each step\n`;
  instructions += `   - Format: \`Estimated: 4 hours\` or \`Estimated: 2 days\`\n\n`;
  
  return instructions;
}

module.exports = generateCommand;
