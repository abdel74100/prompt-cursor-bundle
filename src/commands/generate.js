const inquirer = require('inquirer').default;
const chalk = require('chalk');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { ensureDirectoryStructure, getFilePath, getDirs } = require('../utils/directoryManager');
const { generateVersionsSection } = require('../utils/versionCompatibility');
const { getProvider, getProviderChoices, getPromptDirectory } = require('../utils/aiProviders');
const { extractPromptContent, copyToClipboard } = require('../utils/fileWatcher');
const ModuleManager = require('../utils/moduleManager');

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

async function resolveProjectMode(options) {
  if (options.simple) return 'simple';
  if (options.simple && options.complex) return 'simple';
  if (options.complex) return 'complex';

  const answer = await inquirer.prompt([{
    type: 'list',
    name: 'projectMode',
    message: 'Quel type de projet souhaitez-vous générer ?',
    choices: [
      { name: '1) Simple', value: 'simple', short: 'Simple' },
      { name: '2) Complex (avec agents)', value: 'complex', short: 'Complex' }
    ],
    default: 'complex'
  }]);

  return answer.projectMode;
}

/**
 * Generate command - Create a single intelligent prompt that generates all files
 * Now supports complex mode with modules
 */
async function generateCommand(options) {
  console.log(chalk.blue.bold('\n🚀 Generate - One Prompt to Rule Them All\n'));
  console.log(chalk.gray('This creates a single intelligent prompt for your AI assistant.\n'));

  try {
    const projectMode = await resolveProjectMode(options);
    const complexMode = projectMode === 'complex';
    
    let projectName = options.name;
    let ideaFile = options.ideaFile;
    let outputDir = options.output;
    let aiProvider = options.provider;
    const selectedModules = complexMode ? Object.keys(ModuleManager.getModuleDefinitions()) : [];
    
    console.log(chalk.cyan(`Mode sélectionné: ${projectMode === 'complex' ? 'Complex (agents auto)' : 'Simple'}`));
    
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
    
    if (questions.length > 0) {
      const answers = await inquirer.prompt(questions);
      projectName = projectName || answers.projectName;
      ideaFile = ideaFile || answers.ideaFile;
      outputDir = outputDir || answers.outputDir;
      aiProvider = aiProvider || answers.aiProvider;
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
      fileContent += `**Modules:** tous (activés par défaut)\n`;
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
      
    // Save unified project config
    const configPath = path.join(outputDir, promptDir, 'config.json');
    const config = {
      projectName,
      aiProvider,
      complexMode: complexMode || false,
      modules: selectedModules,
      createdAt: new Date().toISOString()
    };
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
      
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
    console.log(chalk.gray(`     → This generates ${provider.rulesFile} + code-run.md + Instructions/${complexMode ? ' + agents' : ''}\n`));
      
    console.log(chalk.green('✨ All files will be in:'), chalk.bold(outputDir + '/\n'));
    
    // Copy prompt to clipboard (best-effort)
    const promptToClipboard = extractPromptContent(fileContent);
    if (promptToClipboard) {
      const copied = await copyToClipboard(promptToClipboard);
      if (copied) {
        console.log(chalk.green('📋 Prompt copié dans le presse-papiers !'));
        console.log(chalk.gray('   (Contenu entre 🚀 START et 🏁 END uniquement)\n'));
      }
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
