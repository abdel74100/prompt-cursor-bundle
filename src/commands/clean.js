const inquirer = require('inquirer').default;
const chalk = require('chalk');
const path = require('path');
const { cleanDirectory, getDirectoryInfo, displayStructure, detectProvider, DEFAULT_PROVIDER } = require('../utils/directoryManager');
const { getProvider, getPromptDirectory } = require('../utils/aiProviders');

/**
 * Clean command - Remove prompt directory
 */
async function cleanCommand(options) {
  console.log(chalk.blue.bold('\n🧹 Clean - Remove Prompt Files\n'));
  
  try {
    const outputDir = path.resolve(options.path || process.cwd());
    
    // Auto-detect provider
    const aiProviderKey = await detectProvider(outputDir) || DEFAULT_PROVIDER;
    const provider = getProvider(aiProviderKey);
    const promptDir = getPromptDirectory(aiProviderKey);
    
    // Get directory info
    const info = await getDirectoryInfo(outputDir, aiProviderKey);
    
    if (!info.exists) {
      console.log(chalk.yellow(`📁 No ${promptDir}/ directory found`));
      console.log(chalk.gray(`   Checked in: ${outputDir}\n`));
      return;
    }
    
    // Show what will be deleted
    console.log(chalk.cyan(`📊 Current ${promptDir}/ contents (${provider.icon} ${provider.name}):`));
    await displayStructure(outputDir, aiProviderKey);
    
    // Confirm deletion unless force flag is set
    if (!options.force) {
      const totalFiles = info.prompts.count + info.docs.count + 
                        info.workflow.count + info.instructions.count;
      
      console.log(chalk.yellow(`⚠️  This will delete ${totalFiles} files and the ${promptDir}/ directory`));
      
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to delete all prompt files?',
          default: false
        }
      ]);
      
      if (!confirm) {
        console.log(chalk.gray('\n✖ Clean cancelled\n'));
        return;
      }
    }
    
    // Perform cleanup
    const keepContext = options.keepContext || false;
    const deleted = await cleanDirectory(outputDir, aiProviderKey, keepContext);
    
    if (deleted) {
      console.log(chalk.green(`\n✅ Successfully cleaned ${promptDir}/ directory`));
      if (keepContext) {
        console.log(chalk.gray('   (Context file preserved)'));
      }
    } else {
      console.log(chalk.yellow('\n⚠️ Nothing to clean'));
    }
    
    console.log(chalk.gray(`\n   Location: ${outputDir}\n`));
    
  } catch (error) {
    console.error(chalk.red.bold('\n❌ Error:'));
    console.error(chalk.red(error.message));
    
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

module.exports = cleanCommand;
