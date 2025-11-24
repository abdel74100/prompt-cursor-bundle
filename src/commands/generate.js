const inquirer = require('inquirer').default;
const chalk = require('chalk');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { loadContext, saveContext, recordCommand, trackFile, updateWorkflowPhase } = require('../utils/contextTrackerV2');
const { ensureDirectoryStructure, getFilePath } = require('../utils/directoryManager');
const { generateVersionsSection } = require('../utils/versionCompatibility');

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
 */
async function generateCommand(options) {
  console.log(chalk.blue.bold('\n🚀 Generate - One Prompt to Rule Them All\n'));
  console.log(chalk.gray('This creates a single intelligent prompt that Cursor AI will use to generate all your project files.\n'));

  try {
    let projectName = options.name;
    let ideaFile = options.ideaFile;
    let outputDir = options.output;
    
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
    
    if (questions.length > 0) {
      const answers = await inquirer.prompt(questions);
      projectName = projectName || answers.projectName;
      ideaFile = ideaFile || answers.ideaFile;
      outputDir = outputDir || answers.outputDir;
    }
    
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
    
    // Ensure output directory and .prompt-cursor structure exist
    ensureDirectoryExists(outputDir);
    await ensureDirectoryStructure(outputDir);
    
    // Load template
    const templatePath = path.join(__dirname, '../prompts/prompt-generate-template.txt');
    let template = await fs.readFile(templatePath, 'utf-8');
    
    // Generate compatibility section based on idea content
    const versionsSection = generateVersionsSection(ideaContent);
    
    // Replace {{IDEA}} with actual idea content and add versions section
    let promptContent = template.replace('{{IDEA}}', ideaContent);
    
    // Insert versions section after the idea
    if (versionsSection) {
      promptContent = promptContent.replace(
        '---\n\n# Your Task',
        `---\n${versionsSection}\n---\n\n# Your Task`
      );
    }
    
    // Generate the prompt file in .prompt-cursor/prompts/
    const promptFilePath = getFilePath(outputDir, 'PROMPT_GENERATE');
    
    let fileContent = `# 🎯 ${projectName} - Prompt pour Cursor AI\n\n`;
    fileContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    fileContent += `## 📋 Instructions (3 étapes)\n\n`;
    fileContent += `1️⃣ **Copier** le prompt entre 🚀 START et 🏁 END  \n`;
    fileContent += `2️⃣ **Coller** dans Cursor AI  \n`;
    fileContent += `3️⃣ **Sauvegarder** les 4 fichiers dans \`.prompt-cursor/docs/\`  \n`;
    fileContent += `4️⃣ **Lancer** : \`prompt-cursor build\`\n\n`;
    fileContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    fileContent += `## 🚀 START - COPIER TOUT CE QUI SUIT\n\n`;
    fileContent += promptContent;
    fileContent += `\n\n## 🏁 END - ARRÊTER DE COPIER\n\n`;
    fileContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    fileContent += `## 📁 Où sauvegarder les fichiers de Cursor\n\n`;
    fileContent += `Cursor va générer 4 fichiers. Sauvegardez-les dans \`.prompt-cursor/docs/\` :\n\n`;
    fileContent += `\`\`\`\n`;
    fileContent += `.prompt-cursor/docs/project-request.md\n`;
    fileContent += `.prompt-cursor/docs/cursor-rules.md\n`;
    fileContent += `.prompt-cursor/docs/spec.md\n`;
    fileContent += `.prompt-cursor/docs/implementation-plan.md\n`;
    fileContent += `\`\`\`\n\n`;
    fileContent += `## ⚡ Ensuite\n\n`;
    fileContent += `\`\`\`bash\n`;
    fileContent += `prompt-cursor build  # Génère code-run.md + Instructions/\n`;
    fileContent += `\`\`\`\n`;
    
    await fs.writeFile(promptFilePath, fileContent, 'utf-8');
      
    console.log(chalk.green.bold('✅ Prompt generated successfully!\n'));
      console.log(chalk.green(`File: .prompt-cursor/prompts/prompt-generate.md\n`));
      
    // Load/update context
      const context = loadContext(outputDir);
    context.projectName = projectName;
    context.outputDir = outputDir;
    context.workflow.type = 'generate';
    recordCommand(context, 'generate', options);
    trackFile(context, '.prompt-cursor/prompts/prompt-generate.md', 'generated');
    updateWorkflowPhase(context, 'prompt');
      saveContext(context, outputDir);
      
      // Instructions
      console.log(chalk.cyan.bold('📋 Next Steps:\n'));
    console.log(chalk.white('  1. Open .prompt-cursor/prompts/prompt-generate.md'));
    console.log(chalk.white('  2. Copy the prompt and paste it into Cursor AI'));
    console.log(chalk.white('  3. Save each file in .prompt-cursor/docs/:'));
    console.log(chalk.gray('     - .prompt-cursor/docs/project-request.md'));
    console.log(chalk.gray('     - .prompt-cursor/docs/cursor-rules.md'));
    console.log(chalk.gray('     - .prompt-cursor/docs/spec.md'));
    console.log(chalk.gray('     - .prompt-cursor/docs/implementation-plan.md'));
    console.log(chalk.white('  4. Run: prompt-cursor build'));
    console.log(chalk.gray('     → This generates code-run.md + Instructions/\n'));
      
    console.log(chalk.green('✨ All files will be in:'), chalk.bold(outputDir + '/\n'));
    
  } catch (error) {
    console.error(chalk.red.bold('\n❌ Error:'));
    console.error(chalk.red(error.message));
    
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

module.exports = generateCommand;
