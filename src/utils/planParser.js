const fs = require('fs').promises;
const path = require('path');

/**
 * Parse implementation-plan.md to extract steps
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
      
      steps.push({
        number: stepNumber,
        name: stepTitle,
        tasks: tasks,
        objective: this.extractObjective(stepContent),
        estimatedTime: this.extractEstimatedTime(stepContent, content)
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
        
        steps.push({
          number: stepNumber,
          name: stepTitle,
          tasks: tasks,
          objective: this.extractObjective(stepContent),
          estimatedTime: this.extractEstimatedTime(stepContent, content)
        });
      }
    }
    
    // Try format 3: "- [ ] Step X:" (English checkbox format)
    if (steps.length === 0) {
      // Match from "- [ ] Step X:" to next "- [ ] Step" or end
      const checkboxRegex = /-\s+\[\s*\]\s+Step\s+(\d+):\s+([^\n]+)([\s\S]*?)(?=\n-\s+\[\s*\]\s+Step|\n##\s+Phase|$)/g;
      
      while ((match = checkboxRegex.exec(content)) !== null) {
        const stepNumber = parseInt(match[1]);
        const stepTitle = match[2].trim();
        const stepContent = match[0];
        
        const tasks = this.extractTasksFromCheckboxFormat(stepContent);
        
        steps.push({
          number: stepNumber,
          name: stepTitle,
          tasks: tasks,
          objective: tasks[0]?.description || stepTitle,
          estimatedTime: this.extractEstimatedTime(stepContent, content)
        });
      }
    }
    
    return steps;
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
   * Typically groups of 2-3 steps become one code-run step
   */
  static groupIntoPhases(steps, targetPhases = 5) {
    if (steps.length <= targetPhases) {
      return steps.map(step => ({
        name: step.name,
        objective: step.objective,
        tasks: step.tasks
      }));
    }
    
    // Group steps into phases
    const stepsPerPhase = Math.ceil(steps.length / targetPhases);
    const phases = [];
    
    for (let i = 0; i < steps.length; i += stepsPerPhase) {
      const group = steps.slice(i, i + stepsPerPhase);
      const phaseName = group.map(s => s.name).join(' + ');
      const allTasks = group.flatMap(s => s.tasks);
      
      phases.push({
        name: phaseName.length > 50 ? group[0].name + ' (Phase)' : phaseName,
        objective: group[0].objective,
        tasks: allTasks.slice(0, 7) // Max 7 tasks per phase
      });
    }
    
    return phases.slice(0, targetPhases);
  }
}

module.exports = PlanParser;

