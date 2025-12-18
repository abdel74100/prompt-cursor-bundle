/**
 * Orchestrator - Task progression
 */

const fs = require('fs');
const path = require('path');

class Orchestrator {
  constructor(projectDir = process.cwd()) {
    this.projectDir = projectDir;
    this.tasksFile = path.join(projectDir, '.ai', 'tasks.json');
    this.workflowFile = path.join(projectDir, '.ai', 'workflow.md');
    this.tasks = [];
    this.metadata = {};
  }

  /**
   * Load tasks from tasks.json
   */
  load() {
    if (!fs.existsSync(this.tasksFile)) {
      throw new Error(`tasks.json not found. Run 'prompt-cursor build' first.`);
    }

    const data = JSON.parse(fs.readFileSync(this.tasksFile, 'utf-8'));
    this.metadata = {
      generatedAt: data.generatedAt,
      project: data.project,
      totalSteps: data.totalSteps
    };
    this.tasks = data.entries || [];
    return this;
  }

  /**
   * Save tasks back to tasks.json
   */
  save() {
    const data = {
      ...this.metadata,
      totalSteps: this.tasks.length,
      entries: this.tasks
    };
    fs.writeFileSync(this.tasksFile, JSON.stringify(data, null, 2));
  }

  /**
   * Get a task by step number
   */
  getTask(stepNumber) {
    return this.tasks.find(t => t.step === stepNumber);
  }

  /**
   * Get all tasks with a specific status
   */
  getTasksByStatus(status) {
    return this.tasks.filter(t => t.status === status);
  }

  /**
   * Calculate which tasks are ready (dependencies satisfied)
   */
  calculateReadyTasks() {
    return this.tasks.filter(task => {
      if (task.status === 'completed') return false;
      if (task.status === 'ready') return true;
      
      // Check if all dependencies are completed
      const depsCompleted = task.dependsOn.every(depStep => {
        const depTask = this.getTask(depStep);
        return depTask && depTask.status === 'completed';
      });

      // Update status if newly ready
      if (depsCompleted && task.status === 'pending') {
        task.status = 'ready';
      }

      return depsCompleted;
    });
  }

  /**
   * Get the next available task (first ready task)
   */
  getNextTask() {
    const readyTasks = this.calculateReadyTasks();
    return readyTasks.length > 0 ? readyTasks[0] : null;
  }

  /**
   * Get progress statistics
   */
  getProgress() {
    const completed = this.tasks.filter(t => t.status === 'completed').length;
    const readyTasks = this.calculateReadyTasks();
    const pending = this.tasks.filter(t => t.status === 'pending').length;
    const prompted = this.tasks.filter(t => t.status === 'prompted').length;

    return {
      total: this.tasks.length,
      completed,
      ready: readyTasks.length,
      pending,
      prompted,
      percentage: this.tasks.length > 0 
        ? Math.round((completed / this.tasks.length) * 100) 
        : 0,
      readyTasks
    };
  }

  /**
   * Get progress grouped by module
   */
  getProgressByModule() {
    const modules = {};
    
    this.tasks.forEach(task => {
      const mod = task.module || 'other';
      if (!modules[mod]) {
        modules[mod] = { total: 0, completed: 0, ready: 0, pending: 0 };
      }
      modules[mod].total++;
      
      if (task.status === 'completed') {
        modules[mod].completed++;
      } else if (task.status === 'ready') {
        modules[mod].ready++;
      } else {
        modules[mod].pending++;
      }
    });

    return modules;
  }

  /**
   * Get progress grouped by agent
   */
  getProgressByAgent() {
    const agents = {};
    
    this.tasks.forEach(task => {
      const agent = task.agent || 'generic';
      if (!agents[agent]) {
        agents[agent] = { total: 0, completed: 0, ready: 0, pending: 0 };
      }
      agents[agent].total++;
      
      if (task.status === 'completed') {
        agents[agent].completed++;
      } else if (task.status === 'ready') {
        agents[agent].ready++;
      } else {
        agents[agent].pending++;
      }
    });

    return agents;
  }

  /**
   * Mark a task as prompted (user copied the prompt)
   */
  markAsPrompted(stepNumber) {
    const task = this.getTask(stepNumber);
    if (!task) {
      throw new Error(`Step ${stepNumber} not found`);
    }
    
    task.status = 'prompted';
    task.promptedAt = new Date().toISOString();
    this.save();
    return task;
  }

  /**
   * Mark a task as completed
   */
  markAsCompleted(stepNumber) {
    const task = this.getTask(stepNumber);
    if (!task) {
      throw new Error(`Step ${stepNumber} not found`);
    }

    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    this.save();

    // Recalculate ready tasks
    this.calculateReadyTasks();
    this.save();

    this.ensureE2ETest(stepNumber);

    // Update workflow.md
    this.updateWorkflow();

    return task;
  }

  /**
   * Reset a task to pending
   */
  resetTask(stepNumber) {
    const task = this.getTask(stepNumber);
    if (!task) {
      throw new Error(`Step ${stepNumber} not found`);
    }

    task.status = task.dependsOn.length === 0 ? 'ready' : 'pending';
    delete task.completedAt;
    delete task.promptedAt;
    this.save();

    return task;
  }

  /**
   * Get the step file path for a task
   */
  getStepFilePath(stepNumber) {
    const task = this.getTask(stepNumber);
    if (!task) return null;
    return path.join(this.projectDir, task.file);
  }

  /**
   * Read the step file content
   */
  readStepContent(stepNumber) {
    const filePath = this.getStepFilePath(stepNumber);
    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error(`Step file not found for step ${stepNumber}`);
    }
    return fs.readFileSync(filePath, 'utf-8');
  }

  inferUiTestFromFiles(files) {
    if (!Array.isArray(files)) return null;

    for (const rawFile of files) {
      if (typeof rawFile !== 'string') continue;
      const file = rawFile.replace(/\\/g, '/');

      const rootMatch = file.match(/^apps\/([^/]+)\/app\/page\.(tsx|jsx|ts|js)$/);
      if (rootMatch) {
        const app = rootMatch[1];
        return {
          app,
          route: '/',
          baseUrlEnv: `E2E_${app.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_BASE_URL`
        };
      }

      const pageMatch = file.match(/^apps\/([^/]+)\/app\/(.+)\/page\.(tsx|jsx|ts|js)$/);
      if (!pageMatch) continue;

      const app = pageMatch[1];
      const rawRoute = pageMatch[2];
      if (rawRoute.includes('[')) continue;

      const segments = rawRoute
        .split('/')
        .filter(seg => !(seg.startsWith('(') && seg.endsWith(')')));
      const route = `/${segments.join('/')}` || '/';

      return {
        app,
        route: route === '/' ? '/' : route,
        baseUrlEnv: `E2E_${app.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_BASE_URL`
      };
    }

    return null;
  }

  ensureE2ETest(stepNumber) {
    const task = this.getTask(stepNumber);
    if (!task) return null;

    if (task.agent !== 'frontend') return null;

    const uiTest = task.e2e?.type === 'ui'
      ? { baseUrlEnv: task.e2e.baseUrlEnv, route: task.e2e.route }
      : this.inferUiTestFromFiles(task.files);

    if (!uiTest?.route) return null;

    const relPath = task.e2e?.file || `tests/e2e/step-${stepNumber}.spec.ts`;
    const absPath = path.join(this.projectDir, relPath);
    const dir = path.dirname(absPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(absPath)) return relPath;

    const files = Array.isArray(task.files) ? task.files : [];
    const uniqFiles = Array.from(new Set(files)).filter(Boolean);
    const filesJson = JSON.stringify(uniqFiles, null, 2);
    const baseUrlEnv = uiTest.baseUrlEnv || 'E2E_BASE_URL';
    const route = uiTest.route || '/';

    const content = [
      `import { test, expect } from '@playwright/test';`,
      `import fs from 'node:fs';`,
      `import path from 'node:path';`,
      ``,
      `const projectRoot = path.resolve(__dirname, '../..');`,
      `const files = ${filesJson};`,
      ``,
      `const baseUrl = process.env.${baseUrlEnv};`,
      ``,
      `test.describe('step ${stepNumber}', () => {`,
      `  test('outputs exist', async () => {`,
      uniqFiles.length === 0
        ? `    expect(true).toBeTruthy();`
        : `    for (const f of files) {`,
      uniqFiles.length === 0
        ? null
        : `      expect(fs.existsSync(path.join(projectRoot, f))).toBeTruthy();`,
      uniqFiles.length === 0
        ? null
        : `    }`,
      `  });`,
      `});`,
      ``,
      `test.describe('ui', () => {`,
      `  test.skip(!baseUrl, '${baseUrlEnv} not set');`,
      ``,
      `  test('route loads', async ({ page }) => {`,
      `    const url = new URL(${JSON.stringify(route)}, baseUrl).toString();`,
      `    const response = await page.goto(url);`,
      `    expect(response?.ok()).toBeTruthy();`,
      `  });`,
      `});`,
      ``
    ].filter(Boolean).join('\n');

    fs.writeFileSync(absPath, content, 'utf-8');
    return relPath;
  }

  /**
   * Update workflow.md with current progress
   */
  updateWorkflow() {
    if (!fs.existsSync(this.workflowFile)) {
      return; // Skip if workflow.md doesn't exist
    }

    let content = fs.readFileSync(this.workflowFile, 'utf-8');
    const progress = this.getProgress();

    // Update progress section
    const progressRegex = /## 📊 Progression\n\n[\s\S]*?(?=\n---)/;
    const progressBar = this.generateProgressBar(progress.percentage);
    const newProgressSection = `## 📊 Progression

- **Total:** ${progress.total} étapes
- **Terminées:** ${progress.completed}
- **En cours:** ${progress.ready}
- **Progression:** ${progress.percentage}%

\`\`\`
${progressBar} ${progress.percentage}%
\`\`\`
`;
    content = content.replace(progressRegex, newProgressSection);

    // Update table rows
    this.tasks.forEach(task => {
      const statusIcon = this.getStatusIcon(task.status);
      const statusText = this.getStatusText(task.status);
      
      // Match the row by step number
      const rowRegex = new RegExp(
        `\\| ${task.step} \\| ${this.escapeRegex(task.title)} \\| [^|]+ \\| [^|]+ \\| [^|]+ \\|`,
        'g'
      );
      const newRow = `| ${task.step} | ${task.title} | ${task.module} | ${task.agent} | ${statusIcon} ${statusText} |`;
      content = content.replace(rowRegex, newRow);
    });

    // Update timestamp
    const timestampRegex = /\*(Généré|Mis à jour) le [^*]+\*/;
    content = content.replace(timestampRegex, `*Mis à jour le ${new Date().toISOString()}*`);

    fs.writeFileSync(this.workflowFile, content);
  }

  /**
   * Generate ASCII progress bar
   */
  generateProgressBar(percentage, width = 30) {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
  }

  /**
   * Get status icon
   */
  getStatusIcon(status) {
    switch (status) {
      case 'completed': return '✅';
      case 'ready': return '🟡';
      case 'prompted': return '📋';
      case 'pending': return '⏳';
      default: return '⏳';
    }
  }

  /**
   * Get status text
   */
  getStatusText(status) {
    switch (status) {
      case 'completed': return 'Terminé';
      case 'ready': return 'En cours';
      case 'prompted': return 'Prompt copié';
      case 'pending': return 'En attente';
      default: return 'En attente';
    }
  }

  /**
   * Escape special regex characters
   */
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

module.exports = Orchestrator;
