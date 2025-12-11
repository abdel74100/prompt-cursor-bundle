const fs = require('fs');
const path = require('path');
const { getDirs } = require('../utils/directoryManager');
const PlanParser = require('../utils/planParser');
const ModuleManager = require('../utils/moduleManager');
const CodeRunGenerator = require('../utils/codeRunGenerator');

function loadIfExists(targetPath) {
  if (!targetPath) return null;
  if (!fs.existsSync(targetPath)) return null;
  return fs.readFileSync(targetPath, 'utf-8');
}

function loadAgentContext(projectDir, aiProvider) {
  const dirs = getDirs(aiProvider);
  const ideaPath = path.join(projectDir, 'idea.md');
  const specPath = path.join(projectDir, dirs.DOCS, 'spec.md');
  const planPath = path.join(projectDir, dirs.DOCS, 'implementation-plan.md');

  return {
    idea: loadIfExists(ideaPath),
    spec: loadIfExists(specPath),
    plan: loadIfExists(planPath),
    paths: { ideaPath, specPath, planPath }
  };
}

async function parsePlanSteps(planPath) {
  if (!planPath || !fs.existsSync(planPath)) return [];
  try {
    return await PlanParser.parsePlanFile(planPath);
  } catch {
    return [];
  }
}

function assignModules(steps, projectDir, aiProvider) {
  const moduleManager = new ModuleManager(projectDir, aiProvider);
  moduleManager.initializeModules(Object.keys(ModuleManager.getModuleDefinitions()));
  const assignments = moduleManager.autoAssignSteps(steps);
  return steps.map((step) => {
    const moduleValue = assignments[step.number];
    const moduleKey = Array.isArray(moduleValue) ? moduleValue[0] : moduleValue;
    return { ...step, module: moduleKey || step.module };
  });
}

async function prepareAgentTasks({ projectDir, aiProvider, fallbackCount = 10 }) {
  const context = loadAgentContext(projectDir, aiProvider);
  const parsedSteps = await parsePlanSteps(context.paths.planPath);
  const steps = parsedSteps.length > 0
    ? parsedSteps
    : CodeRunGenerator.generateDefaultSteps(fallbackCount);

  const enrichedSteps = assignModules(steps, projectDir, aiProvider);

  return {
    context,
    steps: enrichedSteps
  };
}

module.exports = {
  loadAgentContext,
  prepareAgentTasks
};

