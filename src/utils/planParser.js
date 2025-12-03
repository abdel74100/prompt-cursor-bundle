const fs = require('fs').promises;
const path = require('path');

/**
 * Parse implementation-plan.md to extract steps
 * Supports complex projects with non-linear dependencies
 */
class PlanParser {
  /**
   * Parse a plan file and extract structured steps
   * @param {string} filePath - Path to implementation-plan.md
   * @returns {Promise<Array>} Array of step objects
   */
  static async parsePlanFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return this.parsePlan(content);
    } catch (error) {
      throw new Error(`Failed to parse plan file: ${error.message}`);
    }
  }

  /**
   * Parse plan content
   * @param {string} content - Plan markdown content
   * @returns {Array} Array of step objects
   */
  static parsePlan(content) {
    const steps = [];
    
    // Try format 1: "### Étape X:" (French format)
    const frenchRegex = /###\s+Étape\s+(\d+):\s+(.+?)(?=###|\n##|$)/gs;
    let match;
    
    while ((match = frenchRegex.exec(content)) !== null) {
      const stepNumber = parseInt(match[1]);
      const stepTitle = match[2].trim();
      const stepContent = match[0];
      
      const tasks = this.extractTasks(stepContent);
      const dependencies = this.extractDependencies(stepContent, stepNumber);
      
      steps.push({
        number: stepNumber,
        name: stepTitle,
        tasks: tasks,
        objective: this.extractObjective(stepContent),
        estimatedTime: this.extractEstimatedTime(stepContent, content),
        dependsOn: dependencies.dependsOn,
        parallel: dependencies.parallel,
        module: this.extractModule(stepContent)
      });
    }
    
    // Try format 2: "### Step X:" (English format)
    if (steps.length === 0) {
      const englishHeaderRegex = /###\s+Step\s+(\d+):\s+(.+?)\n([\s\S]*?)(?=###\s+Step|##\s+Phase|##\s+\w|$)/gs;
      
      while ((match = englishHeaderRegex.exec(content)) !== null) {
        const stepNumber = parseInt(match[1]);
        const stepTitle = match[2].trim();
        const stepContent = match[3];
        
        const tasks = this.extractTasksFromStepFormat(stepContent);
        const dependencies = this.extractDependencies(stepContent, stepNumber);
        
        steps.push({
          number: stepNumber,
          name: stepTitle,
          tasks: tasks,
          objective: this.extractObjective(stepContent),
          estimatedTime: this.extractEstimatedTime(stepContent, content),
          dependsOn: dependencies.dependsOn,
          parallel: dependencies.parallel,
          module: this.extractModule(stepContent)
        });
      }
    }
    
    // Try format 3: "- [ ] Step X:" (English checkbox format)
    if (steps.length === 0) {
      const checkboxRegex = /-\s+\[\s*\]\s+Step\s+(\d+):\s+([^\n]+)([\s\S]*?)(?=\n-\s+\[\s*\]\s+Step|\n##\s+Phase|$)/g;
      
      while ((match = checkboxRegex.exec(content)) !== null) {
        const stepNumber = parseInt(match[1]);
        const stepTitle = match[2].trim();
        const stepContent = match[0];
        
        const tasks = this.extractTasksFromCheckboxFormat(stepContent);
        const dependencies = this.extractDependencies(stepContent, stepNumber);
        
        steps.push({
          number: stepNumber,
          name: stepTitle,
          tasks: tasks,
          objective: tasks[0]?.description || stepTitle,
          estimatedTime: this.extractEstimatedTime(stepContent, content),
          dependsOn: dependencies.dependsOn,
          parallel: dependencies.parallel,
          module: this.extractModule(stepContent)
        });
      }
    }
    
    // If no explicit dependencies found, set linear dependencies
    if (steps.length > 0 && steps.every(s => !s.dependsOn || s.dependsOn.length === 0)) {
      for (let i = 1; i < steps.length; i++) {
        steps[i].dependsOn = [steps[i - 1].number];
      }
    }
    
    return steps;
  }

  /**
   * Extract dependencies from step content
   * @param {string} content - Step content
   * @param {number} stepNumber - Current step number
   * @returns {Object} Dependencies info
   */
  static extractDependencies(content, stepNumber) {
    const result = {
      dependsOn: [],
      parallel: false
    };
    
    // Check for parallel flag
    result.parallel = /\(parallel\)|\(parallèle\)|can\s+run\s+in\s+parallel|peut\s+s'exécuter\s+en\s+parallèle/i.test(content);
    
    // Format: "Depends on: Step 1, Step 2" or "Dépend de: Étape 1"
    const depMatch = content.match(/(?:depends?\s+on|dépend\s+de|requires?|nécessite|prérequis)\s*:\s*([^\n]+)/i);
    if (depMatch) {
      const depStr = depMatch[1].toLowerCase();
      
      // Check for "none" or "aucune"
      if (depStr.includes('none') || depStr.includes('aucun')) {
        return result;
      }
      
      // Extract step numbers
      const depNums = depStr.match(/\d+/g);
      if (depNums) {
        result.dependsOn = [...new Set(depNums.map(n => parseInt(n)))];
      }
    }
    
    // Format: "Step Dependencies: Step 1 completed"
    const stepDepMatch = content.match(/step\s+dependencies?\s*:\s*([^\n]+)/i);
    if (stepDepMatch && result.dependsOn.length === 0) {
      const depStr = stepDepMatch[1].toLowerCase();
      if (!depStr.includes('none') && !depStr.includes('aucun')) {
        const depNums = depStr.match(/\d+/g);
        if (depNums) {
          result.dependsOn = [...new Set(depNums.map(n => parseInt(n)))];
        }
      }
    }
    
    // Format: "After: Step 1 AND Step 2" (requires both)
    const afterMatch = content.match(/after\s*:\s*([^\n]+)/i);
    if (afterMatch && result.dependsOn.length === 0) {
      const depNums = afterMatch[1].match(/\d+/g);
      if (depNums) {
        result.dependsOn = [...new Set(depNums.map(n => parseInt(n)))];
      }
    }
    
    return result;
  }

  /**
   * Extract module assignment from step content
   * @param {string} content - Step content
   * @returns {string|null} Module key
   */
  static extractModule(content) {
    const moduleMatch = content.match(/(?:module|composant)\s*:\s*(\w+)/i);
    if (moduleMatch) {
      return moduleMatch[1].toLowerCase();
    }
    
    // Try to detect from keywords
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('frontend') || lowerContent.includes('ui') || lowerContent.includes('interface')) {
      return 'frontend';
    }
    if (lowerContent.includes('backend') || lowerContent.includes('server') || lowerContent.includes('api')) {
      return 'backend';
    }
    if (lowerContent.includes('database') || lowerContent.includes('db') || lowerContent.includes('schema')) {
      return 'database';
    }
    if (lowerContent.includes('infra') || lowerContent.includes('deploy') || lowerContent.includes('docker')) {
      return 'infra';
    }
    if (lowerContent.includes('auth') || lowerContent.includes('login') || lowerContent.includes('security')) {
      return 'auth';
    }
    if (lowerContent.includes('test') || lowerContent.includes('cypress') || lowerContent.includes('jest')) {
      return 'testing';
    }
    
    return null;
  }

  /**
   * Extract tasks from step content (bullet list format)
   */
  static extractTasks(content) {
    const tasks = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') && !trimmed.startsWith('- **') && !trimmed.startsWith('- [ ]')) {
        tasks.push({
          description: trimmed.substring(2),
          completed: false
        });
      }
    }
    
    return tasks;
  }

  /**
   * Extract tasks from "### Step X:" format
   */
  static extractTasksFromStepFormat(content) {
    const tasks = [];
    const lines = content.split('\n');
    
    let inTask = false;
    let currentTask = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Look for "- **Task**:" pattern
      if (trimmed.startsWith('- **Task**:')) {
        if (currentTask) tasks.push(currentTask);
        currentTask = {
          description: trimmed.replace('- **Task**:', '').trim(),
          completed: false
        };
        inTask = true;
      }
      // Look for "- **Files**:" or other sections to extract info
      else if (trimmed.startsWith('- **') && currentTask) {
        const key = trimmed.match(/\*\*([^*]+)\*\*:/)?.[1]?.toLowerCase();
        if (key && !['files', 'dependencies', 'instructions'].includes(key)) {
          currentTask.description += ` (${trimmed.replace(/^-\s*\*\*[^*]+\*\*:\s*/, '')})`;
        }
      }
      // Regular task items
      else if (trimmed.startsWith('- ') && !trimmed.startsWith('- **')) {
        if (!currentTask) {
          currentTask = {
            description: trimmed.substring(2),
            completed: false
          };
          tasks.push(currentTask);
          currentTask = null;
        }
      }
    }
    
    if (currentTask) tasks.push(currentTask);
    
    // If no tasks found, create one from the title
    if (tasks.length === 0) {
      const titleMatch = content.match(/^([^\n]+)/);  
      if (titleMatch) {
        tasks.push({
          description: titleMatch[1].trim(),
          completed: false
        });
      }
    }
    
    return tasks;
  }

  /**
   * Extract tasks from checkbox format "- [ ] Step X:"
   */
  static extractTasksFromCheckboxFormat(content) {
    const tasks = [];
    
    // First, try to get the main task from **Task**: line
    const taskMatch = content.match(/\*\*Task\*\*:\s*(.+)/);
    if (taskMatch) {
      tasks.push({
        description: taskMatch[1].trim(),
        completed: false
      });
    }
    
    // Extract User Instructions which contain actionable steps
    const userInstructionsMatch = content.match(/\*\*User Instructions\*\*:\s*\n([\s\S]*?)(?=\n\s*-\s+\[\s*\]|\n##|$)/);
    if (userInstructionsMatch) {
      const instructionsText = userInstructionsMatch[1];
      const instructionLines = instructionsText.split('\n');
      
      for (const line of instructionLines) {
        const trimmed = line.trim();
        // Match lines like "- Run: ...", "- Install: ...", etc.
        if (trimmed.startsWith('- ')) {
          const cleanDesc = trimmed.substring(2).trim();
          // Only include if it has action keywords
          if (cleanDesc.match(/^(Run|Install|Create|Initialize|Configure|Add|Test|Setup|Navigate|Copy|Choose|Get|Build):/i)) {
            tasks.push({
              description: cleanDesc,
              completed: false
            });
          }
        }
      }
    }
    
    // If still no tasks, use the step title
    if (tasks.length === 0) {
      const stepMatch = content.match(/-\s+\[\s*\]\s+Step\s+\d+:\s+(.+)/);
      if (stepMatch) {
        tasks.push({
          description: stepMatch[1].trim(),
          completed: false
        });
      }
    }
    
    return tasks;
  }

  /**
   * Extract objective from step content
   */
  static extractObjective(content) {
    // Look for explicit objective
    const objectiveMatch = content.match(/(?:objective|objectif|goal|but)\s*:\s*([^\n]+)/i);
    if (objectiveMatch) {
      return objectiveMatch[1].trim();
    }
    
    const lines = content.split('\n');
    // First real task line is often a good objective
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ')) {
        return trimmed.substring(2);
      }
    }
    return 'Voir détails dans le plan d\'implémentation';
  }

  /**
   * Extract estimated time from phase or overall plan
   */
  static extractEstimatedTime(stepContent, fullContent) {
    // Look for explicit time estimate
    const timeMatch = stepContent.match(/(?:estimated|estimé|durée|time)\s*:\s*([^\n]+)/i);
    if (timeMatch) {
      return timeMatch[1].trim();
    }
    
    // Look for "Semaine X" or "(Semaine X)" patterns
    const weekMatch = stepContent.match(/Semaine\s+(\d+)/i) || 
                     fullContent.match(/Semaine\s+(\d+)/i);
    
    if (weekMatch) {
      return `Semaine ${weekMatch[1]}`;
    }
    
    return '2-4 heures';
  }

  /**
   * Group steps into phases for code-run
   * Now supports unlimited steps (no more hard limit)
   * @param {Array} steps - Steps to group
   * @param {number} targetPhases - Target number of phases (0 = no grouping)
   * @returns {Array} Grouped steps
   */
  static groupIntoPhases(steps, targetPhases = 0) {
    // If targetPhases is 0 or steps are fewer, return as-is
    if (targetPhases === 0 || steps.length <= targetPhases) {
      return steps.map((step, index) => ({
        number: step.number || (index + 1),
        name: step.name,
        objective: step.objective,
        tasks: step.tasks,
        dependsOn: step.dependsOn || [],
        parallel: step.parallel || false,
        module: step.module
      }));
    }
    
    // Group steps into phases
    const stepsPerPhase = Math.ceil(steps.length / targetPhases);
    const phases = [];
    
    for (let i = 0; i < steps.length; i += stepsPerPhase) {
      const group = steps.slice(i, i + stepsPerPhase);
      const phaseNumber = phases.length + 1;
      
      // Combine names if multiple steps
      let phaseName;
      if (group.length === 1) {
        phaseName = group[0].name;
      } else {
        const names = group.map(s => s.name);
        phaseName = names.length > 2 
          ? `${names[0]} + ${names.length - 1} autres`
          : names.join(' + ');
      }
      
      // Combine all tasks
      const allTasks = group.flatMap(s => s.tasks || []);
      
      // Combine dependencies (from first step in group)
      const dependsOn = group[0].dependsOn || [];
      
      phases.push({
        number: phaseNumber,
        name: phaseName.length > 60 ? phaseName.substring(0, 57) + '...' : phaseName,
        objective: group[0].objective,
        tasks: allTasks,
        dependsOn: dependsOn,
        parallel: group.some(s => s.parallel),
        module: group[0].module,
        originalSteps: group.map(s => s.number || s.name)
      });
    }
    
    return phases;
  }

  /**
   * Parse milestones from plan content
   * @param {string} content - Plan content
   * @returns {Array} Milestones
   */
  static parseMilestones(content) {
    const milestones = [];
    
    // Match milestone/phase headers
    const milestoneRegex = /##\s+(?:Phase|Milestone|Jalon|Sprint)\s*(\d*):\s*([^\n]+)([\s\S]*?)(?=##\s+(?:Phase|Milestone|Jalon|Sprint)|$)/gi;
    
    let match;
    let index = 0;
    while ((match = milestoneRegex.exec(content)) !== null) {
      const name = match[2].trim();
      const milestoneContent = match[3];

      // Extract steps in this milestone
      const stepNums = [];
      const stepMatches = milestoneContent.match(/(?:Step|Étape)\s+(\d+)/gi);
      if (stepMatches) {
        for (const sm of stepMatches) {
          const num = sm.match(/\d+/);
          if (num) stepNums.push(parseInt(num[0]));
        }
      }

      // Extract deadline
      let deadline = null;
      const deadlineMatch = milestoneContent.match(/(?:deadline|échéance|semaine|week)\s*:?\s*(\d+|[^\n]+)/i);
      if (deadlineMatch) {
        deadline = deadlineMatch[1].trim();
      }

      milestones.push({
        name: name,
        steps: [...new Set(stepNums)],
        deadline: deadline || `Semaine ${(index + 1) * 2}`
      });

      index++;
    }

    return milestones;
  }

  /**
   * Detect project complexity
   * @param {Array} steps - Parsed steps
   * @returns {Object} Complexity info
   */
  static detectComplexity(steps) {
    const numSteps = steps.length;
    const hasNonLinearDeps = steps.some(s => s.dependsOn && s.dependsOn.length > 1);
    const hasParallel = steps.some(s => s.parallel);
    const hasModules = steps.some(s => s.module);
    const uniqueModules = [...new Set(steps.filter(s => s.module).map(s => s.module))];
    
    let level = 'simple';
    if (numSteps > 10 || hasNonLinearDeps || hasParallel || uniqueModules.length > 2) {
      level = 'complex';
    } else if (numSteps > 5 || hasModules) {
      level = 'medium';
    }
    
    return {
      level,
      numSteps,
      hasNonLinearDeps,
      hasParallel,
      modules: uniqueModules,
      recommendation: level === 'complex' 
        ? 'Utilisez le mode --complex pour une meilleure gestion'
        : level === 'medium'
          ? 'Considérez le mode --complex si le projet grandit'
          : 'Mode simple recommandé'
    };
  }
}

module.exports = PlanParser;
