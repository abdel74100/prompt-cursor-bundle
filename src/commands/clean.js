const inquirer = require('inquirer').default;
const chalk = require('chalk');
const path = require('path');
const { cleanDirectory, getDirectoryInfo, displayStructure } = require('../utils/directoryManager');

/**
 * Clean command - Remove .promptcore directory
 */
async function cleanCommand(options) {
  console.log(chalk.blue.bold('\n🧹 Clean - Remove Prompt Cursor Files\n'));
  
  try {
    const outputDir = path.resolve(options.path || process.cwd());
    
    // Get directory info
    const info = await getDirectoryInfo(outputDir);
    
    if (!info.exists) {
      console.log(chalk.yellow('📁 No .promptcore/ directory found'));
      console.log(chalk.gray(`   Checked in: ${outputDir}\n`));
      return;
    }
    
    // Show what will be deleted
    console.log(chalk.cyan('📊 Current .promptcore/ contents:'));
    await displayStructure(outputDir);
    
    // Confirm deletion unless force flag is set
    if (!options.force) {
      const totalFiles = info.prompts.count + info.docs.count + 
                        info.workflow.count + info.instructions.count;
      
      console.log(chalk.yellow(`⚠️  This will delete ${totalFiles} files and the .promptcore/ directory`));
      
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: 'Are you sure you want to delete all Prompt Cursor files?',
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
    const deleted = await cleanDirectory(outputDir, keepContext);
    
    if (deleted) {
      console.log(chalk.green('\n✅ Successfully cleaned .promptcore/ directory'));
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


