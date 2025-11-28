const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * Files required for build
 */
const REQUIRED_FILES = [
  'project-request.md',
  'ai-rules.md',
  'spec.md',
  'implementation-plan.md'
];

/**
 * Check if all required files exist
 * @param {string} docsDir - Path to docs directory
 * @returns {Object} Status of each file
 */
function checkFiles(docsDir) {
  const status = {};
  let allPresent = true;
  
  for (const file of REQUIRED_FILES) {
    const filePath = path.join(docsDir, file);
    const exists = fs.existsSync(filePath);
    status[file] = exists;
    if (!exists) allPresent = false;
  }
  
  return { status, allPresent };
}

/**
 * Display file status
 * @param {Object} status - File status object
 */
function displayStatus(status) {
  console.log(chalk.cyan('\n📁 Fichiers attendus:'));
  for (const [file, exists] of Object.entries(status)) {
    const icon = exists ? chalk.green('✅') : chalk.gray('⬜');
    console.log(`   ${icon} ${file}`);
  }
}

/**
 * Watch directory for required files
 * @param {string} docsDir - Path to docs directory
 * @param {Function} onComplete - Callback when all files are present
 * @param {number} interval - Check interval in ms (default: 2000)
 */
function watchForFiles(docsDir, onComplete, interval = 2000) {
  console.log(chalk.yellow(`\n⏳ En attente des fichiers dans: ${docsDir}`));
  
  // Initial check
  let { status, allPresent } = checkFiles(docsDir);
  displayStatus(status);
  
  if (allPresent) {
    console.log(chalk.green('\n✅ Tous les fichiers sont présents !'));
    onComplete();
    return null;
  }
  
  console.log(chalk.gray('\n   Surveillant les changements... (Ctrl+C pour annuler)\n'));
  
  // Polling watcher
  const watcher = setInterval(() => {
    const result = checkFiles(docsDir);
    
    // Check for new files
    let hasChanges = false;
    for (const file of REQUIRED_FILES) {
      if (result.status[file] && !status[file]) {
        console.log(chalk.green(`   ✅ ${file} détecté !`));
        hasChanges = true;
      }
    }
    
    status = result.status;
    
    if (result.allPresent) {
      clearInterval(watcher);
      console.log(chalk.green.bold('\n🎉 Tous les fichiers sont présents !'));
      onComplete();
    }
  }, interval);
  
  return watcher;
}

/**
 * Extract prompt content between START and END markers
 * @param {string} content - Full file content
 * @returns {string} Content between markers
 */
function extractPromptContent(content) {
  const startMarker = '## 🚀 START - COPIER TOUT CE QUI SUIT';
  const endMarker = '## 🏁 END - ARRÊTER DE COPIER';
  
  const startIndex = content.indexOf(startMarker);
  const endIndex = content.indexOf(endMarker);
  
  if (startIndex === -1 || endIndex === -1) {
    return null;
  }
  
  // Get content after START marker (skip the marker line itself)
  const afterStart = content.indexOf('\n', startIndex) + 1;
  
  return content.substring(afterStart, endIndex).trim();
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
async function copyToClipboard(text) {
  try {
    // Try using native commands (no external dependency)
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const platform = process.platform;
    
    if (platform === 'darwin') {
      // macOS
      await execAsync('pbcopy', { input: text });
      const child = require('child_process').spawn('pbcopy');
      child.stdin.write(text);
      child.stdin.end();
      return new Promise((resolve) => {
        child.on('close', () => resolve(true));
        child.on('error', () => resolve(false));
      });
    } else if (platform === 'win32') {
      // Windows
      const child = require('child_process').spawn('clip');
      child.stdin.write(text);
      child.stdin.end();
      return new Promise((resolve) => {
        child.on('close', () => resolve(true));
        child.on('error', () => resolve(false));
      });
    } else {
      // Linux - try xclip or xsel
      try {
        const child = require('child_process').spawn('xclip', ['-selection', 'clipboard']);
        child.stdin.write(text);
        child.stdin.end();
        return new Promise((resolve) => {
          child.on('close', () => resolve(true));
          child.on('error', () => resolve(false));
        });
      } catch {
        return false;
      }
    }
  } catch (error) {
    return false;
  }
}

module.exports = {
  REQUIRED_FILES,
  checkFiles,
  displayStatus,
  watchForFiles,
  extractPromptContent,
  copyToClipboard
};

