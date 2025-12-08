const chalk = require('chalk');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const inquirer = require('inquirer').default;
const AgentManager = require('../utils/agentManager');
const { detectProvider, DEFAULT_PROVIDER } = require('../utils/directoryManager');
const { getPromptDirectory } = require('../utils/aiProviders');

/**
 * Agent command - Execute tasks with specific agents
 * 
 * Usage:
 *   pcb agent backend --task instructions/backend/step1.md
 *   pcb agent run step=2
 *   pcb agent list
 */
async function agentCommand(agentId, options) {
  console.log(chalk.blue.bold('\n🤖 Agent Command\n'));

  try {
    const projectDir = path.resolve(options.path || process.cwd());
    const aiProvider = await detectProvider(projectDir) || DEFAULT_PROVIDER;
    const promptDir = getPromptDirectory(aiProvider);
    
    // Initialize agent manager
    const manager = new AgentManager(projectDir, aiProvider);
    await manager.initializeAgents();
    await manager.loadTasksMap();

    // Handle subcommands
    if (agentId === 'list') {
      return await listAgents(manager);
    }
    
    if (agentId === 'run') {
      return await runStep(manager, options, projectDir, promptDir);
    }

    // Execute specific agent task
    if (!agentId) {
      // Interactive mode
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'agentId',
          message: 'Select an agent:',
          choices: AgentManager.getAgentChoices()
        }
      ]);
      agentId = answers.agentId;
    }

    // Validate agent exists
    if (!manager.agents.has(agentId)) {
      console.log(chalk.red(`\n❌ Agent not found: ${agentId}`));
      console.log(chalk.yellow('\nAvailable agents:'));
      for (const [id, agent] of manager.agents) {
        console.log(chalk.gray(`  - ${agent.icon} ${id}: ${agent.description}`));
      }
      process.exit(1);
    }

    const agent = manager.agents.get(agentId);
    console.log(chalk.cyan(`${agent.icon} Agent: ${agent.name}`));
    console.log(chalk.gray(`   ${agent.description}\n`));

    // Get task file
    let taskPath = options.task;
    
    if (!taskPath) {
      // List available tasks for this agent
      const tasks = manager.getTasksForAgent(agentId);
      
      if (tasks.length === 0) {
        // Try to auto-map tasks first
        await manager.autoMapFromProject();
        const newTasks = manager.getTasksForAgent(agentId);
        
        if (newTasks.length === 0) {
          console.log(chalk.yellow(`⚠ No tasks assigned to ${agent.name}`));
          console.log(chalk.gray('Run "pcb assign" to map tasks to agents.\n'));
          return;
        }
      }
      
      const updatedTasks = manager.getTasksForAgent(agentId);
      
      if (updatedTasks.length > 0) {
        const answers = await inquirer.prompt([
          {
            type: 'list',
            name: 'taskPath',
            message: 'Select a task:',
            choices: updatedTasks.map(t => ({
              name: t,
              value: t
            }))
          }
        ]);
        taskPath = answers.taskPath;
      }
    }

    if (!taskPath) {
      console.log(chalk.red('❌ No task specified. Use --task <path> or select from list.'));
      process.exit(1);
    }

    // Generate agent prompt
    console.log(chalk.cyan(`\n📝 Generating prompt for: ${taskPath}\n`));
    
    const prompt = await manager.generateAgentPrompt(agentId, taskPath);
    
    // Save prompt to file
    const runDir = path.join(projectDir, promptDir, 'agents', 'run');
    await fs.mkdir(runDir, { recursive: true });
    
    const taskName = path.basename(taskPath, '.md').replace(/[^a-z0-9]/gi, '-');
    const promptFileName = `${agentId}-${taskName}.md`;
    const promptPath = path.join(runDir, promptFileName);
    
    // Create full prompt file
    let fileContent = `# 🤖 ${agent.name} - Task Prompt\n\n`;
    fileContent += `**Agent:** ${agent.icon} ${agent.name}\n`;
    fileContent += `**Task:** ${taskPath}\n`;
    fileContent += `**Generated:** ${new Date().toISOString()}\n\n`;
    fileContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    fileContent += `## 📋 Instructions\n\n`;
    fileContent += `1️⃣ **Copier** le prompt entre 🚀 START et 🏁 END\n`;
    fileContent += `2️⃣ **Coller** dans votre assistant AI\n`;
    fileContent += `3️⃣ **Implémenter** le code généré\n\n`;
    fileContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    fileContent += prompt;
    fileContent += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    
    await fs.writeFile(promptPath, fileContent, 'utf-8');
    
    console.log(chalk.green.bold(`✅ Prompt generated!\n`));
    console.log(chalk.white(`📁 File: ${promptDir}/agents/run/${promptFileName}`));
    console.log(chalk.gray(`\nCopy the content between 🚀 START and 🏁 END to your AI assistant.\n`));
    
    // Show preview
    if (options.preview) {
      console.log(chalk.cyan('━'.repeat(60)));
      console.log(chalk.cyan('Preview:\n'));
      console.log(prompt.substring(0, 500) + '...\n');
      console.log(chalk.cyan('━'.repeat(60)));
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
 * List all agents and their assigned tasks
 */
async function listAgents(manager) {
  console.log(chalk.cyan('📋 Available Agents:\n'));
  
  for (const [id, agent] of manager.agents) {
    const tasks = manager.getTasksForAgent(id);
    const taskCount = tasks.length;
    
    console.log(chalk.white.bold(`${agent.icon} ${agent.name} (${id})`));
    console.log(chalk.gray(`   ${agent.description}`));
    console.log(chalk.gray(`   Rules: ${agent.rules}`));
    console.log(chalk.gray(`   Tasks: ${taskCount} assigned`));
    
    if (taskCount > 0 && taskCount <= 5) {
      for (const task of tasks) {
        console.log(chalk.gray(`     - ${task}`));
      }
    } else if (taskCount > 5) {
      for (const task of tasks.slice(0, 3)) {
        console.log(chalk.gray(`     - ${task}`));
      }
      console.log(chalk.gray(`     ... and ${taskCount - 3} more`));
    }
    
    console.log('');
  }
}

/**
 * Run prompts for a specific step
 */
async function runStep(manager, options, projectDir, promptDir) {
  const stepArg = options.step || options._step;
  
  if (!stepArg) {
    console.log(chalk.red('❌ No step specified. Use: pcb agent run --step=2'));
    process.exit(1);
  }
  
  const stepNum = parseInt(stepArg);
  console.log(chalk.cyan(`📦 Generating prompts for Step ${stepNum}...\n`));
  
  // Get tasks by step
  const byStep = manager.getTasksByStep();
  const stepTasks = byStep[stepNum];
  
  if (!stepTasks || Object.keys(stepTasks).length === 0) {
    console.log(chalk.yellow(`⚠ No tasks found for Step ${stepNum}`));
    console.log(chalk.gray('Run "pcb assign" to map tasks to agents.\n'));
    return;
  }
  
  // Generate prompts for each agent with tasks in this step
  const runDir = path.join(projectDir, promptDir, 'agents', 'run');
  await fs.mkdir(runDir, { recursive: true });
  
  const generated = [];
  
  for (const [agentId, tasks] of Object.entries(stepTasks)) {
    const agent = manager.agents.get(agentId);
    if (!agent) continue;
    
    console.log(chalk.white(`${agent.icon} ${agent.name}: ${tasks.length} task(s)`));
    
    for (const taskPath of tasks) {
      const prompt = await manager.generateAgentPrompt(agentId, taskPath);
      
      const taskName = path.basename(taskPath, '.md').replace(/[^a-z0-9]/gi, '-');
      const promptFileName = `step${stepNum}-${agentId}-${taskName}.md`;
      const promptPath = path.join(runDir, promptFileName);
      
      let fileContent = `# 🤖 Step ${stepNum} - ${agent.name}\n\n`;
      fileContent += `**Agent:** ${agent.icon} ${agent.name}\n`;
      fileContent += `**Task:** ${taskPath}\n`;
      fileContent += `**Step:** ${stepNum}\n\n`;
      fileContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      fileContent += prompt;
      fileContent += `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      
      await fs.writeFile(promptPath, fileContent, 'utf-8');
      generated.push(promptFileName);
      console.log(chalk.gray(`   ✓ ${promptFileName}`));
    }
  }
  
  console.log(chalk.green.bold(`\n✅ Generated ${generated.length} prompt(s)\n`));
  console.log(chalk.white(`📁 Location: ${promptDir}/agents/run/`));
  console.log(chalk.gray('\nCopy each prompt to your AI assistant to implement the tasks.\n'));
}

module.exports = agentCommand;
