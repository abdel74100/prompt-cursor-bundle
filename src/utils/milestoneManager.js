const chalk = require('chalk');

/**
 * Milestone Manager
 * Groups steps into milestones with deadlines and progress tracking
 */
class MilestoneManager {
  constructor(steps = [], config = {}) {
    this.steps = steps;
    this.milestones = [];
    this.config = {
      autoGroup: config.autoGroup !== false,
      defaultMilestones: config.defaultMilestones || ['MVP', 'Beta', 'Production'],
      stepsPerMilestone: config.stepsPerMilestone || null,
      ...config
    };
  }

  /**
   * Create milestones from steps
   * @param {Object[]} customMilestones - Optional custom milestone definitions
   * @returns {Object[]} Array of milestone objects
   */
  createMilestones(customMilestones = null) {
    if (customMilestones) {
      this.milestones = this.createFromCustom(customMilestones);
    } else if (this.config.autoGroup) {
      this.milestones = this.autoGroupMilestones();
    }

    return this.milestones;
  }

  /**
   * Auto-group steps into milestones based on step count
   * @returns {Object[]} Milestones
   */
  autoGroupMilestones() {
    const milestones = [];
    const totalSteps = this.steps.length;
    const milestoneNames = this.config.defaultMilestones;
    const numMilestones = milestoneNames.length;

    // Calculate steps per milestone
    const stepsPerMilestone = this.config.stepsPerMilestone || 
      Math.ceil(totalSteps / numMilestones);

    let stepIndex = 0;
    for (let i = 0; i < numMilestones && stepIndex < totalSteps; i++) {
      const milestoneSteps = this.steps.slice(stepIndex, stepIndex + stepsPerMilestone);
      
      if (milestoneSteps.length === 0) break;

      const milestone = {
        id: i + 1,
        name: milestoneNames[i],
        icon: this.getMilestoneIcon(milestoneNames[i]),
        steps: milestoneSteps.map(s => s.number),
        stepDetails: milestoneSteps,
        deadline: this.calculateDeadline(i, numMilestones),
        status: 'pending',
        progress: 0,
        completedSteps: [],
        estimatedHours: milestoneSteps.length * 4 // 4h per step estimate
      };

      milestones.push(milestone);
      stepIndex += stepsPerMilestone;
    }

    // Handle remaining steps
    if (stepIndex < totalSteps && milestones.length > 0) {
      const remaining = this.steps.slice(stepIndex);
      const lastMilestone = milestones[milestones.length - 1];
      lastMilestone.steps.push(...remaining.map(s => s.number));
      lastMilestone.stepDetails.push(...remaining);
      lastMilestone.estimatedHours += remaining.length * 4;
    }

    return milestones;
  }

  /**
   * Create milestones from custom definitions
   * @param {Object[]} customDefs - Custom milestone definitions
   * @returns {Object[]} Milestones
   */
  createFromCustom(customDefs) {
    return customDefs.map((def, index) => {
      const milestoneSteps = this.steps.filter(s => 
        def.steps ? def.steps.includes(s.number) : false
      );

      return {
        id: index + 1,
        name: def.name,
        icon: def.icon || this.getMilestoneIcon(def.name),
        steps: def.steps || [],
        stepDetails: milestoneSteps,
        deadline: def.deadline || this.calculateDeadline(index, customDefs.length),
        status: 'pending',
        progress: 0,
        completedSteps: [],
        estimatedHours: def.estimatedHours || milestoneSteps.length * 4
      };
    });
  }

  /**
   * Get icon for milestone based on name
   * @param {string} name - Milestone name
   * @returns {string} Emoji icon
   */
  getMilestoneIcon(name) {
    const icons = {
      'mvp': '🎯',
      'beta': '🧪',
      'production': '🚀',
      'alpha': '🔬',
      'release': '📦',
      'launch': '🎉',
      'phase': '📋',
      'sprint': '🏃'
    };

    const lowerName = name.toLowerCase();
    for (const [key, icon] of Object.entries(icons)) {
      if (lowerName.includes(key)) return icon;
    }
    return '🏁';
  }

  /**
   * Calculate deadline based on milestone position
   * @param {number} index - Milestone index
   * @param {number} total - Total milestones
   * @returns {string} Deadline string
   */
  calculateDeadline(index, total) {
    const weeksPerMilestone = Math.ceil(6 / total); // 6 weeks total project
    const week = (index + 1) * weeksPerMilestone;
    return `Semaine ${week}`;
  }

  /**
   * Update milestone progress based on completed steps
   * @param {number[]} completedSteps - Array of completed step numbers
   * @returns {Object[]} Updated milestones
   */
  updateProgress(completedSteps = []) {
    for (const milestone of this.milestones) {
      milestone.completedSteps = milestone.steps.filter(s => completedSteps.includes(s));
      milestone.progress = milestone.steps.length > 0
        ? Math.round((milestone.completedSteps.length / milestone.steps.length) * 100)
        : 0;

      // Update status
      if (milestone.progress === 100) {
        milestone.status = 'completed';
      } else if (milestone.progress > 0) {
        milestone.status = 'in_progress';
      } else {
        milestone.status = 'pending';
      }
    }

    return this.milestones;
  }

  /**
   * Get current milestone (first incomplete)
   * @returns {Object|null} Current milestone
   */
  getCurrentMilestone() {
    return this.milestones.find(m => m.status !== 'completed') || null;
  }

  /**
   * Get next milestone
   * @returns {Object|null} Next milestone
   */
  getNextMilestone() {
    const current = this.getCurrentMilestone();
    if (!current) return null;

    const currentIndex = this.milestones.indexOf(current);
    return this.milestones[currentIndex + 1] || null;
  }

  /**
   * Get overall progress
   * @returns {number} Progress percentage (0-100)
   */
  getOverallProgress() {
    const totalSteps = this.milestones.reduce((sum, m) => sum + m.steps.length, 0);
    const completedSteps = this.milestones.reduce((sum, m) => sum + m.completedSteps.length, 0);
    return totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  }

  /**
   * Generate milestone summary for code-run.md
   * @returns {string} Markdown content
   */
  toMarkdown() {
    const lines = [];
    lines.push('## 🏁 MILESTONES\n');

    for (const milestone of this.milestones) {
      const statusIcon = milestone.status === 'completed' ? '✅' : 
                        milestone.status === 'in_progress' ? '🟡' : '⏳';
      
      lines.push(`### ${milestone.icon} ${milestone.name} (${milestone.deadline})`);
      lines.push(`**Status:** ${statusIcon} ${milestone.progress}% complete`);
      lines.push(`**Estimated:** ${milestone.estimatedHours}h\n`);

      for (const stepNum of milestone.steps) {
        const step = this.steps.find(s => s.number === stepNum);
        const stepStatus = milestone.completedSteps.includes(stepNum) ? '✅' : '⏳';
        const stepName = step ? step.name : `Step ${stepNum}`;
        lines.push(`- ${stepStatus} Step ${stepNum}: ${stepName}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate ASCII progress visualization
   * @returns {string} ASCII visualization
   */
  toAscii() {
    const lines = [];
    lines.push('');
    lines.push('┌─────────────────────────────────────────────────────────┐');
    lines.push('│  🏁 MILESTONES                                          │');
    lines.push('├─────────────────────────────────────────────────────────┤');

    for (const milestone of this.milestones) {
      const progressBar = this.createProgressBar(milestone.progress, 20);
      const statusIcon = milestone.status === 'completed' ? '✅' : 
                        milestone.status === 'in_progress' ? '🟡' : '⏳';
      
      const name = `${milestone.icon} ${milestone.name}`.padEnd(18);
      const deadline = `(${milestone.deadline})`.padEnd(12);
      const stats = `[${milestone.completedSteps.length}/${milestone.steps.length}]`;

      lines.push(`│  ${statusIcon} ${name} ${progressBar} ${milestone.progress.toString().padStart(3)}% ${stats.padStart(6)} │`);
    }

    lines.push('├─────────────────────────────────────────────────────────┤');
    
    const overallProgress = this.getOverallProgress();
    const overallBar = this.createProgressBar(overallProgress, 30);
    lines.push(`│  📊 Overall: ${overallBar} ${overallProgress}%          │`);
    
    lines.push('└─────────────────────────────────────────────────────────┘');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Create ASCII progress bar
   * @param {number} percentage - Progress percentage
   * @param {number} width - Bar width
   * @returns {string} Progress bar
   */
  createProgressBar(percentage, width = 20) {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Parse milestones from implementation plan
   * @param {string} content - Plan content
   * @returns {Object[]} Parsed milestones
   */
  static parseMilestones(content) {
    const milestones = [];
    
    // Match milestone/phase headers
    const milestoneRegex = /##\s+(?:Phase|Milestone|Jalon)\s*(\d*):\s*([^\n]+)([\s\S]*?)(?=##\s+(?:Phase|Milestone|Jalon)|$)/gi;
    
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
      const deadlineMatch = milestoneContent.match(/(?:deadline|échéance|semaine)\s*:?\s*(\d+|[^\n]+)/i);
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
}

module.exports = MilestoneManager;

