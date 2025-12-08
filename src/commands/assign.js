const chalk = require('chalk');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const AgentManager = require('../utils/agentManager');
const { detectProvider, DEFAULT_PROVIDER } = require('../utils/directoryManager');
const { getPromptDirectory } = require('../utils/aiProviders');

/**
 * Assign command - Auto-assign tasks to agents
 * 
 * Usage:
 *   pcb assign
 *   pcb assign --force
 *   pcb assign --output ./assignments.md
 */
async function assignCommand(options) {
  console.log(chalk.blue.bold('\n🎯 Assign - Auto-map Tasks to Agents\n'));

  try {
    const projectDir = path.resolve(options.path || process.cwd());
    const aiProvider = await detectProvider(projectDir) || DEFAULT_PROVIDER;
    const promptDir = getPromptDirectory(aiProvider);
    
    console.log(chalk.gray(`Project: ${projectDir}`));
    console.log(chalk.gray(`Provider: ${aiProvider}`));
    console.log('');

    // Initialize agent manager
    const manager = new AgentManager(projectDir, aiProvider);
    
    // Try to load existing config or initialize defaults
    const configLoaded = await manager.loadConfig();
    
    if (!configLoaded) {
      console.log(chalk.yellow('⚠ No agents.json found. Detecting agents from project...\n'));
      
      // Try to detect agents from idea.md or spec.md
      let detectedAgents = [];
      
      const ideaPath = path.join(projectDir, 'idea.md');
      const specPath = path.join(projectDir, promptDir, 'docs', 'spec.md');
      
      if (fsSync.existsSync(ideaPath)) {
        const ideaContent = await fs.readFile(ideaPath, 'utf-8');
        detectedAgents = AgentManager.detectAgentsFromIdea(ideaContent);
        console.log(chalk.cyan(`✓ Detected ${detectedAgents.length} agents from idea.md`));
      } else if (fsSync.existsSync(specPath)) {
        const specContent = await fs.readFile(specPath, 'utf-8');
        detectedAgents = AgentManager.detectAgentsFromIdea(specContent);
        console.log(chalk.cyan(`✓ Detected ${detectedAgents.length} agents from spec.md`));
      } else {
        // Use default agents
        detectedAgents = ['backend', 'frontend', 'database', 'devops'];
        console.log(chalk.cyan('Using default agents (no idea.md or spec.md found)'));
      }
      
      await manager.initializeAgents(detectedAgents);
      
      // Show detected agents
      console.log(chalk.gray('\nDetected agents:'));
      for (const agentId of detectedAgents) {
        const agent = manager.agents.get(agentId);
        if (agent) {
          console.log(chalk.gray(`  ${agent.icon} ${agent.name}`));
        }
      }
      console.log('');
    } else {
      await manager.initializeAgents();
      console.log(chalk.cyan(`✓ Loaded ${manager.agents.size} agents from config\n`));
    }

    // Check for instructions directory
    const instructionsDir = path.join(projectDir, promptDir, 'workflow', 'Instructions');
    
    if (!fsSync.existsSync(instructionsDir)) {
      console.log(chalk.red('❌ Instructions directory not found!'));
      console.log(chalk.yellow(`\nExpected: ${promptDir}/workflow/Instructions/`));
      console.log(chalk.gray('\nRun "pcb build" first to generate instruction files.\n'));
      process.exit(1);
    }

    // Auto-map tasks to agents
    console.log(chalk.cyan('🔍 Scanning instructions and mapping to agents...\n'));
    
    const mapping = await manager.autoMapFromProject();
    const taskCount = Object.keys(mapping).length;
    
    if (taskCount === 0) {
      console.log(chalk.yellow('⚠ No instruction files found to map.'));
      console.log(chalk.gray('Run "pcb build" first to generate instruction files.\n'));
      return;
    }

    console.log(chalk.green(`✓ Mapped ${taskCount} tasks to agents\n`));

    // Show mapping summary
    const byStep = manager.getTasksByStep();
    const sortedSteps = Object.keys(byStep).map(Number).sort((a, b) => a - b);
    
    for (const stepNum of sortedSteps) {
      console.log(chalk.white.bold(`📌 Étape ${stepNum}`));
      
      const agents = byStep[stepNum];
      for (const [agentId, tasks] of Object.entries(agents)) {
        const agent = manager.agents.get(agentId);
        const icon = agent ? agent.icon : '📦';
        console.log(chalk.cyan(`   ${icon} ${agentId}`));
        for (const task of tasks) {
          console.log(chalk.gray(`      → ${task}`));
        }
      }
      console.log('');
    }

    // Create agents directory structure
    await manager.createDirectoryStructure();

    // Save configurations
    const configPath = await manager.saveConfig();
    console.log(chalk.green(`✓ Saved agents.json`));
    
    const mapPath = await manager.saveTasksMap();
    console.log(chalk.green(`✓ Saved tasks-map.json`));

    // Generate assignments markdown
    const assignmentsContent = manager.generateAssignmentsMarkdown();
    const assignmentsPath = path.join(projectDir, promptDir, 'agents', 'assignments.md');
    await fs.writeFile(assignmentsPath, assignmentsContent, 'utf-8');
    console.log(chalk.green(`✓ Generated assignments.md`));

    // Generate rules files if they don't exist
    if (options.generateRules !== false) {
      const rulesCreated = await manager.generateRulesFiles();
      if (rulesCreated.length > 0) {
        console.log(chalk.green(`✓ Generated ${rulesCreated.length} rules files`));
        for (const rulePath of rulesCreated) {
          console.log(chalk.gray(`   - ${path.relative(projectDir, rulePath)}`));
        }
      }
    }

    // Summary
    console.log(chalk.green.bold('\n✅ Assignment complete!\n'));
    
    console.log(chalk.cyan('📁 Generated files:'));
    console.log(chalk.white(`   .prompt-config/agents.json`));
    console.log(chalk.white(`   ${promptDir}/agents/tasks-map.json`));
    console.log(chalk.white(`   ${promptDir}/agents/assignments.md`));
    console.log(chalk.white(`   .prompt-rules/*.md (rules files)`));
    
    console.log(chalk.cyan('\n📋 Next steps:'));
    console.log(chalk.white('   1. Review assignments.md'));
    console.log(chalk.white('   2. Customize rules files in .prompt-rules/'));
    console.log(chalk.white('   3. Run agent tasks:'));
    console.log(chalk.gray('      pcb agent backend --task instructions-step1.md'));
    console.log(chalk.gray('      pcb agent run --step=1'));
    console.log('');

    // Agent summary table
    console.log(chalk.cyan('📊 Agent Summary:\n'));
    console.log(chalk.gray('   ┌─────────────────────┬────────────┐'));
    console.log(chalk.gray('   │ Agent               │ Tasks      │'));
    console.log(chalk.gray('   ├─────────────────────┼────────────┤'));
    
    for (const [agentId, agent] of manager.agents) {
      const tasks = manager.getTasksForAgent(agentId);
      const name = `${agent.icon} ${agentId}`.padEnd(19);
      const count = tasks.length.toString().padStart(10);
      console.log(chalk.gray(`   │ ${name} │ ${count} │`));
    }
    
    console.log(chalk.gray('   └─────────────────────┴────────────┘\n'));

  } catch (error) {
    console.error(chalk.red.bold('\n❌ Error:'));
    console.error(chalk.red(error.message));
    
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

module.exports = assignCommand;
