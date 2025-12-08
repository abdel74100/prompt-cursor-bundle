const chalk = require('chalk');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const inquirer = require('inquirer').default;
const AgentManager = require('../utils/agentManager');
const { detectProvider, DEFAULT_PROVIDER } = require('../utils/directoryManager');
const { getPromptDirectory } = require('../utils/aiProviders');
const { copyToClipboard } = require('../utils/fileWatcher');

/**
 * Run command - Execute agent pipeline (manual assisted)
 * 
 * Usage:
 *   pcb run backend step=1
 *   pcb run --step=1
 *   pcb run --agent=backend --step=1
 */
async function runCommand(agentIdOrStep, options) {
  console.log(chalk.blue.bold('\n🚀 Run - Agent Pipeline Execution\n'));

  try {
    const projectDir = path.resolve(options.path || process.cwd());
    const aiProvider = await detectProvider(projectDir) || DEFAULT_PROVIDER;
    const promptDir = getPromptDirectory(aiProvider);
    
    // Initialize agent manager
    const manager = new AgentManager(projectDir, aiProvider);
    await manager.initializeAgents();
    await manager.loadTasksMap();

    // Parse arguments
    let agentId = options.agent || null;
    let stepNum = options.step ? parseInt(options.step) : null;
    
    // Handle "pcb run backend step=1" format
    if (agentIdOrStep) {
      if (agentIdOrStep.startsWith('step=')) {
        stepNum = parseInt(agentIdOrStep.replace('step=', ''));
      } else if (manager.agents.has(agentIdOrStep)) {
        agentId = agentIdOrStep;
      } else if (!isNaN(parseInt(agentIdOrStep))) {
        stepNum = parseInt(agentIdOrStep);
      }
    }

    // If no step specified, ask
    if (!stepNum) {
      const byStep = manager.getTasksByStep();
      const availableSteps = Object.keys(byStep).map(Number).sort((a, b) => a - b);
      
      if (availableSteps.length === 0) {
        console.log(chalk.yellow('⚠ No tasks mapped to agents.'));
        console.log(chalk.gray('Run "pcb assign" first to map tasks.\n'));
        return;
      }
      
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'stepNum',
          message: 'Select a step to run:',
          choices: availableSteps.map(s => ({
            name: `Step ${s}`,
            value: s
          }))
        }
      ]);
      stepNum = answers.stepNum;
    }

    console.log(chalk.cyan(`📌 Step ${stepNum}\n`));

    // Get tasks for this step
    const byStep = manager.getTasksByStep();
    const stepTasks = byStep[stepNum];
    
    if (!stepTasks || Object.keys(stepTasks).length === 0) {
      console.log(chalk.yellow(`⚠ No tasks found for Step ${stepNum}`));
      console.log(chalk.gray('Run "pcb assign" to map tasks to agents.\n'));
      return;
    }

    // Filter by agent if specified
    let agentsToRun = Object.keys(stepTasks);
    if (agentId) {
      if (!stepTasks[agentId]) {
        console.log(chalk.yellow(`⚠ Agent "${agentId}" has no tasks in Step ${stepNum}`));
        console.log(chalk.gray('\nAvailable agents for this step:'));
        for (const id of Object.keys(stepTasks)) {
          const agent = manager.agents.get(id);
          console.log(chalk.gray(`  - ${agent?.icon || '📦'} ${id}`));
        }
        console.log('');
        return;
      }
      agentsToRun = [agentId];
    }

    // Show what will be run
    console.log(chalk.white('Agents to run:'));
    for (const id of agentsToRun) {
      const agent = manager.agents.get(id);
      const tasks = stepTasks[id];
      console.log(chalk.cyan(`  ${agent?.icon || '📦'} ${id}: ${tasks.length} task(s)`));
    }
    console.log('');

    // Generate prompts
    const runDir = path.join(projectDir, promptDir, 'agents', 'run');
    await fs.mkdir(runDir, { recursive: true });
    
    const generatedPrompts = [];
    
    for (const id of agentsToRun) {
      const agent = manager.agents.get(id);
      const tasks = stepTasks[id];
      
      for (const taskPath of tasks) {
        const prompt = await manager.generateAgentPrompt(id, taskPath);
        
        const taskName = path.basename(taskPath, '.md').replace(/[^a-z0-9]/gi, '-');
        const promptFileName = `run-step${stepNum}-${id}-${taskName}.md`;
        const promptPath = path.join(runDir, promptFileName);
        
        let fileContent = `# 🚀 Run: Step ${stepNum} - ${agent?.name || id}\n\n`;
        fileContent += `**Agent:** ${agent?.icon || '📦'} ${agent?.name || id}\n`;
        fileContent += `**Task:** ${taskPath}\n`;
        fileContent += `**Step:** ${stepNum}\n`;
        fileContent += `**Generated:** ${new Date().toISOString()}\n\n`;
        fileContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        fileContent += `## 📋 Instructions\n\n`;
        fileContent += `1️⃣ Copy the prompt below (between 🚀 START and 🏁 END)\n`;
        fileContent += `2️⃣ Paste it into your AI assistant\n`;
        fileContent += `3️⃣ Implement the generated code\n`;
        fileContent += `4️⃣ Run \`pcb complete --step=${stepNum}\` when done\n\n`;
        fileContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        fileContent += prompt;
        fileContent += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        
        await fs.writeFile(promptPath, fileContent, 'utf-8');
        
        generatedPrompts.push({
          agent: id,
          agentName: agent?.name || id,
          agentIcon: agent?.icon || '📦',
          task: taskPath,
          file: promptFileName,
          path: promptPath,
          prompt: prompt
        });
      }
    }

    console.log(chalk.green.bold(`✅ Generated ${generatedPrompts.length} prompt(s)\n`));
    
    // Show generated files
    console.log(chalk.cyan('📁 Generated files:'));
    for (const p of generatedPrompts) {
      console.log(chalk.white(`   ${p.agentIcon} ${p.file}`));
    }
    console.log(chalk.gray(`\n   Location: ${promptDir}/agents/run/\n`));

    // Interactive mode - offer to copy first prompt
    if (generatedPrompts.length > 0 && !options.noCopy) {
      const firstPrompt = generatedPrompts[0];
      
      const answers = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'copyFirst',
          message: `Copy first prompt (${firstPrompt.agentIcon} ${firstPrompt.agentName}) to clipboard?`,
          default: true
        }
      ]);
      
      if (answers.copyFirst) {
        const copied = await copyToClipboard(firstPrompt.prompt);
        if (copied) {
          console.log(chalk.green('\n✅ Prompt copied to clipboard!'));
          console.log(chalk.gray(`   ${firstPrompt.agentIcon} ${firstPrompt.agentName}: ${firstPrompt.task}\n`));
        } else {
          console.log(chalk.yellow('\n⚠ Could not copy to clipboard.'));
          console.log(chalk.gray('   Open the file manually and copy the prompt.\n'));
        }
      }
    }

    // Next steps
    console.log(chalk.cyan('📋 Next steps:'));
    console.log(chalk.white(`   1. Open the prompt file(s) in ${promptDir}/agents/run/`));
    console.log(chalk.white('   2. Copy the prompt between 🚀 START and 🏁 END'));
    console.log(chalk.white('   3. Paste into your AI assistant and implement'));
    console.log(chalk.white(`   4. Run: pcb complete --step=${stepNum}`));
    
    if (stepNum < Math.max(...Object.keys(byStep).map(Number))) {
      console.log(chalk.white(`   5. Continue with: pcb run --step=${stepNum + 1}`));
    }
    
    console.log('');

    // Return generated prompts for programmatic use
    return generatedPrompts;

  } catch (error) {
    console.error(chalk.red.bold('\n❌ Error:'));
    console.error(chalk.red(error.message));
    
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

module.exports = runCommand;
