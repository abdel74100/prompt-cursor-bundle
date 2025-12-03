const chalk = require('chalk');

/**
 * Dependency Graph Manager
 * Handles non-linear dependencies between steps
 */
class DependencyGraph {
  constructor(steps = []) {
    this.steps = steps;
    this.graph = new Map();
    this.reverseGraph = new Map();
  }

  /**
   * Build dependency graph from steps
   */
  build() {
    // Initialize graphs
    for (const step of this.steps) {
      this.graph.set(step.number, {
        step: step,
        dependsOn: step.dependsOn || [],
        enables: [],
        canRunParallel: step.parallel || false,
        status: step.status || 'pending'
      });
      this.reverseGraph.set(step.number, []);
    }

    // Build reverse graph (what each step enables)
    for (const step of this.steps) {
      const deps = step.dependsOn || [];
      for (const dep of deps) {
        if (this.graph.has(dep)) {
          this.graph.get(dep).enables.push(step.number);
        }
        if (this.reverseGraph.has(dep)) {
          this.reverseGraph.get(dep).push(step.number);
        }
      }
    }

    return this;
  }

  /**
   * Get steps that can run now (all dependencies completed)
   * @param {number[]} completedSteps - Array of completed step numbers
   * @returns {Object[]} Steps that can run
   */
  getAvailableSteps(completedSteps = []) {
    const available = [];

    for (const step of this.steps) {
      if (completedSteps.includes(step.number)) continue;

      const deps = step.dependsOn || [];
      const allDepsComplete = deps.length === 0 || deps.every(d => completedSteps.includes(d));

      if (allDepsComplete) {
        available.push(step);
      }
    }

    return available;
  }

  /**
   * Get steps that can run in parallel
   * @param {number[]} completedSteps - Completed step numbers
   * @returns {Object[]} Steps that can run in parallel
   */
  getParallelSteps(completedSteps = []) {
    const available = this.getAvailableSteps(completedSteps);
    return available.filter(step => {
      const node = this.graph.get(step.number);
      return node && node.canRunParallel;
    });
  }

  /**
   * Check if a step can be started
   * @param {number} stepNumber - Step number to check
   * @param {number[]} completedSteps - Completed step numbers
   * @returns {boolean}
   */
  canStartStep(stepNumber, completedSteps = []) {
    const node = this.graph.get(stepNumber);
    if (!node) return false;

    const deps = node.dependsOn || [];
    return deps.length === 0 || deps.every(d => completedSteps.includes(d));
  }

  /**
   * Get blocking dependencies for a step
   * @param {number} stepNumber - Step number
   * @param {number[]} completedSteps - Completed steps
   * @returns {number[]} Blocking step numbers
   */
  getBlockingDeps(stepNumber, completedSteps = []) {
    const node = this.graph.get(stepNumber);
    if (!node) return [];

    return (node.dependsOn || []).filter(d => !completedSteps.includes(d));
  }

  /**
   * Get critical path (longest dependency chain)
   * @returns {number[]} Step numbers in critical path
   */
  getCriticalPath() {
    const visited = new Set();
    const pathLengths = new Map();

    // Calculate path length for each step
    const calculatePathLength = (stepNum) => {
      if (pathLengths.has(stepNum)) return pathLengths.get(stepNum);
      if (visited.has(stepNum)) return 0;

      visited.add(stepNum);
      const node = this.graph.get(stepNum);
      if (!node) return 0;

      const deps = node.dependsOn || [];
      if (deps.length === 0) {
        pathLengths.set(stepNum, 1);
        return 1;
      }

      const maxDepLength = Math.max(...deps.map(d => calculatePathLength(d)));
      const length = maxDepLength + 1;
      pathLengths.set(stepNum, length);
      return length;
    };

    // Calculate for all steps
    for (const step of this.steps) {
      calculatePathLength(step.number);
    }

    // Find the step with longest path
    let maxLength = 0;
    let endStep = null;
    for (const [stepNum, length] of pathLengths) {
      if (length > maxLength) {
        maxLength = length;
        endStep = stepNum;
      }
    }

    // Reconstruct critical path
    const criticalPath = [];
    let current = endStep;
    while (current !== null) {
      criticalPath.unshift(current);
      const node = this.graph.get(current);
      if (!node || !node.dependsOn || node.dependsOn.length === 0) break;

      // Find the dependency with longest path
      let maxDepLength = 0;
      let nextDep = null;
      for (const dep of node.dependsOn) {
        const depLength = pathLengths.get(dep) || 0;
        if (depLength > maxDepLength) {
          maxDepLength = depLength;
          nextDep = dep;
        }
      }
      current = nextDep;
    }

    return criticalPath;
  }

  /**
   * Generate ASCII visualization of the graph
   * @param {number[]} completedSteps - Completed step numbers
   * @returns {string} ASCII representation
   */
  toAscii(completedSteps = []) {
    if (this.steps.length === 0) return 'No steps defined';

    const lines = [];
    lines.push('');
    lines.push('┌─────────────────────────────────────────────────────────┐');
    lines.push('│  🔗 DEPENDENCY GRAPH                                    │');
    lines.push('├─────────────────────────────────────────────────────────┤');

    // Group steps by their dependency depth
    const depths = new Map();
    const calculateDepth = (stepNum, visited = new Set()) => {
      if (depths.has(stepNum)) return depths.get(stepNum);
      if (visited.has(stepNum)) return 0;

      visited.add(stepNum);
      const node = this.graph.get(stepNum);
      if (!node || !node.dependsOn || node.dependsOn.length === 0) {
        depths.set(stepNum, 0);
        return 0;
      }

      const maxDepth = Math.max(...node.dependsOn.map(d => calculateDepth(d, visited)));
      const depth = maxDepth + 1;
      depths.set(stepNum, depth);
      return depth;
    };

    for (const step of this.steps) {
      calculateDepth(step.number);
    }

    // Group by depth
    const byDepth = new Map();
    for (const step of this.steps) {
      const depth = depths.get(step.number) || 0;
      if (!byDepth.has(depth)) byDepth.set(depth, []);
      byDepth.get(depth).push(step);
    }

    // Render each depth level
    const maxDepth = Math.max(...depths.values());
    for (let d = 0; d <= maxDepth; d++) {
      const stepsAtDepth = byDepth.get(d) || [];
      const stepStrs = stepsAtDepth.map(s => {
        const status = completedSteps.includes(s.number) ? '✅' : '⏳';
        const name = s.name.length > 15 ? s.name.substring(0, 12) + '...' : s.name;
        return `${status} S${s.number}: ${name}`;
      });

      const indent = '  '.repeat(d);
      const prefix = d === 0 ? '│  ' : '│  ' + '    '.repeat(d - 1) + '└──► ';

      for (const stepStr of stepStrs) {
        lines.push(`${prefix}${stepStr}`.padEnd(57) + '│');
      }

      // Draw arrows to next level
      if (d < maxDepth && stepsAtDepth.length > 0) {
        const nextSteps = byDepth.get(d + 1) || [];
        if (nextSteps.length > 1) {
          lines.push('│  ' + '    '.repeat(d) + '├──┬──────────────────────────────────────│');
        }
      }
    }

    lines.push('└─────────────────────────────────────────────────────────┘');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate Mermaid diagram
   * @returns {string} Mermaid diagram code
   */
  toMermaid() {
    const lines = ['```mermaid', 'graph LR'];

    for (const step of this.steps) {
      const node = this.graph.get(step.number);
      if (!node) continue;

      const stepId = `S${step.number}`;
      const label = step.name.replace(/"/g, "'");

      // Add node
      lines.push(`    ${stepId}["${stepId}: ${label}"]`);

      // Add edges
      for (const dep of node.dependsOn || []) {
        lines.push(`    S${dep} --> ${stepId}`);
      }
    }

    lines.push('```');
    return lines.join('\n');
  }

  /**
   * Parse dependencies from implementation plan content
   * @param {string} content - Plan content
   * @returns {Object[]} Steps with dependencies
   */
  static parseDependencies(content) {
    const steps = [];
    
    // Match step headers with various formats
    const stepRegex = /###\s+(?:Step|Étape)\s+(\d+):\s*([^\n]+)([\s\S]*?)(?=###\s+(?:Step|Étape)|##\s+|$)/gi;
    
    let match;
    while ((match = stepRegex.exec(content)) !== null) {
      const stepNumber = parseInt(match[1]);
      const stepName = match[2].trim();
      const stepContent = match[3];

      // Parse dependencies
      const deps = [];
      
      // Format: "Depends on: Step 1, Step 2" or "Dépend de: Étape 1"
      const depMatch = stepContent.match(/(?:depends?\s+on|dépend\s+de|requires?|nécessite)\s*:\s*([^\n]+)/i);
      if (depMatch) {
        const depStr = depMatch[1];
        const depNums = depStr.match(/\d+/g);
        if (depNums) {
          deps.push(...depNums.map(n => parseInt(n)));
        }
      }

      // Format: "Step Dependencies: Step 1 completed"
      const stepDepMatch = stepContent.match(/step\s+dependencies?\s*:\s*([^\n]+)/i);
      if (stepDepMatch) {
        const depStr = stepDepMatch[1];
        if (depStr.toLowerCase().includes('none') || depStr.toLowerCase().includes('aucune')) {
          // No dependencies
        } else {
          const depNums = depStr.match(/\d+/g);
          if (depNums) {
            deps.push(...depNums.map(n => parseInt(n)));
          }
        }
      }

      // Check for parallel flag
      const parallel = /\(parallel\)|\(parallèle\)|can\s+run\s+in\s+parallel/i.test(stepContent);

      steps.push({
        number: stepNumber,
        name: stepName,
        dependsOn: [...new Set(deps)], // Remove duplicates
        parallel: parallel
      });
    }

    // If no explicit dependencies found, assume linear
    if (steps.length > 0 && steps.every(s => s.dependsOn.length === 0)) {
      for (let i = 1; i < steps.length; i++) {
        steps[i].dependsOn = [steps[i - 1].number];
      }
    }

    return steps;
  }
}

module.exports = DependencyGraph;

