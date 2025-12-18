const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const chalk = require('chalk');
const { getDirs } = require('./directoryManager');
const ModuleManager = require('./moduleManager');
const PlanParser = require('./planParser');

const AGENT_DEFINITIONS = {
  architecture: {
    name: 'Architecture',
    rulesFile: '.ai/rules/architecture-rules.md',
    description: 'Pilote la vision globale'
  },
  backend: {
    name: 'Backend',
    rulesFile: '.ai/rules/backend-rules.md',
    description: 'Services, API, securite'
  },
  frontend: {
    name: 'Frontend',
    rulesFile: '.ai/rules/frontend-rules.md',
    description: 'UI/UX, accessibilite'
  },
  devops: {
    name: 'DevOps/Infra',
    rulesFile: '.ai/rules/devops-rules.md',
    description: 'CI/CD, infra, observabilite'
  },
  database: {
    name: 'Database',
    rulesFile: '.ai/rules/database-rules.md',
    description: 'Schema, migrations, perfs'
  },
  qa: {
    name: 'QA/Testing',
    rulesFile: '.ai/rules/qa-rules.md',
    description: 'Tests et qualite'
  },
  mobile: {
    name: 'Mobile',
    rulesFile: '.ai/rules/mobile-rules.md',
    description: 'Apps mobiles'
  }
};

const MODULE_AGENT_MAP = {
  backend: 'backend',
  api: 'backend',
  auth: 'backend',
  frontend: 'frontend',
  infra: 'devops',
  database: 'database',
  testing: 'qa',
  mobile: 'mobile'
};

function ensureDirectoryExists(dirPath) {
  if (!fsSync.existsSync(dirPath)) {
    fsSync.mkdirSync(dirPath, { recursive: true });
  }
}

function resolveAgentKey(step, moduleAssignments) {
  const moduleValue = moduleAssignments[step.number] || step.module;
  const moduleKey = Array.isArray(moduleValue) ? moduleValue[0] : moduleValue;
  if (moduleKey && MODULE_AGENT_MAP[moduleKey]) {
    return MODULE_AGENT_MAP[moduleKey];
  }
  return 'architecture';
}

let cachedBundle = null;
function loadRulesBundle() {
  if (cachedBundle !== null) return cachedBundle;
  const bundlePath = path.join(__dirname, '..', '..', 'vendor', 'rules-bundle.json');
  if (!fsSync.existsSync(bundlePath)) {
    cachedBundle = null;
    return null;
  }
  try {
    const raw = fsSync.readFileSync(bundlePath, 'utf-8');
    cachedBundle = JSON.parse(raw);
    return cachedBundle;
  } catch {
    cachedBundle = null;
    return null;
  }
}

function dedupe(list = []) {
  return [...new Set(list.filter(Boolean))];
}

const AGENT_BUNDLE_KEYS = {
  architecture: ['architecture', 'typescript', 'node', 'monorepo', 'design-system'],
  backend: ['backend', 'api', 'auth', 'node', 'node-express', 'fastify', 'fastapi', 'python', 'go', 'rails', 'laravel', 'php', 'symfony', 'nestjs', 'graphql', 'grpc', 'typescript', 'queue', 'redis', 'websocket'],
  frontend: ['react', 'nextjs', 'tailwind', 'shadcn', 'a11y', 'typescript', 'vue', 'svelte', 'angular', 'design-system', 'storybook', 'tanstack', 'zustand'],
  devops: ['terraform', 'terragrunt', 'kubernetes', 'aws', 'gcp', 'azure', 'docker', 'ci', 'cd', 'observability'],
  database: ['database', 'prisma', 'postgres', 'mysql', 'mongodb', 'sql'],
  qa: ['cypress', 'playwright', 'vitest', 'testing', 'jest'],
  mobile: ['react-native', 'expo', 'flutter']
};

function collectBundleRules(agentKey, bundle) {
  if (!bundle) return [];
  const keys = AGENT_BUNDLE_KEYS[agentKey] || [];
  const collected = [];
  for (const k of keys) {
    if (bundle[k]?.rules) collected.push(...bundle[k].rules);
  }
  return dedupe(collected);
}

function buildAgentRulesContent(agent, projectName, rulesOverride = []) {
  const base = [
    `# Regles ${agent.name}`,
    '',
    `Projet: ${projectName || 'Projet'}`,
    '',
    '## Role',
    `- ${agent.description}`,
    '',
    '## Livrables',
    '- Code pret a integrer (patchs coherents).',
    '- Courte note de validation (risques, tests).',
    '',
    '## Entrees',
    '- spec.md (architecture/contrats).',
    '- implementation-plan.md (ordre & dependances).',
    '- Instructions stepX (details de la tache).',
    '',
    '## Contraintes globales',
    '- Ne pas casser existant, respecter conventions.',
    '- Gerer erreurs & validations en priorite.',
    '- Tests a jour si perimetre modifie.'
  ];

  const extra = dedupe(rulesOverride);
  if (extra.length > 0) {
    base.push('\n## Regles bundle');
    base.push(...extra.map((r) => `- ${r}`));
    base.push('');
    return base.join('\n');
  }

  const bestPractices = {
    backend: [
      'Validation stricte des inputs (DTO/schema).',
      'Gestion erreurs normalisee (codes, payload).',
      'Logs utiles et non verbeux.',
      'Securite: authN/authZ, rate limiting.',
      'Tests unitaires sur logique metier.'
    ],
    frontend: [
      'Accessibilite (ARIA, focus, clavier).',
      'Etats UX complets (loading, error, empty).',
      'Composants reutilisables.',
      'TypeScript strict.'
    ],
    devops: [
      'CI reproductible, commandes idempotentes.',
      'Secrets via env/gestionnaire.',
      'Observabilite: logs structures, metriques.'
    ],
    database: [
      'Migrations idempotentes, rollback documente.',
      'Contraintes integrite, index cibles.',
      'Transactions coherentes.'
    ],
    qa: [
      'Pyramide de tests: unit > integration > e2e.',
      'Donnees de test deterministes.'
    ],
    mobile: [
      'Performance (render, memoire).',
      'Gestion offline/reseau.'
    ],
    architecture: [
      'Coherence modulaire.',
      'Dependances explicites.'
    ]
  };

  const agentKey = Object.keys(AGENT_DEFINITIONS).find(
    (k) => AGENT_DEFINITIONS[k].name === agent.name
  );

  const pick = (key) => (bestPractices[key] || []).map((p) => `- ${p}`);

  switch (agentKey) {
    case 'backend':
      base.push('\n## Bonnes pratiques backend', ...pick('backend'));
      break;
    case 'frontend':
      base.push('\n## Bonnes pratiques frontend', ...pick('frontend'));
      break;
    case 'devops':
      base.push('\n## Bonnes pratiques infra/CI', ...pick('devops'));
      break;
    case 'database':
      base.push('\n## Bonnes pratiques base de donnees', ...pick('database'));
      break;
    case 'qa':
      base.push('\n## Bonnes pratiques QA', ...pick('qa'));
      break;
    case 'mobile':
      base.push('\n## Bonnes pratiques mobile', ...pick('mobile'));
      break;
    case 'architecture':
      base.push('\n## Bonnes pratiques architecture', ...pick('architecture'));
      break;
    default:
      break;
  }

  base.push('');
  return base.join('\n');
}

async function ensureAgentBase(outputDir, projectName) {
  const aiDir = path.join(outputDir, '.ai');
  const rulesDir = path.join(aiDir, 'rules');

  [aiDir, rulesDir].forEach(ensureDirectoryExists);

  const bundle = loadRulesBundle();

  // Only generate rules files (no templates, no config)
  const rulesWrites = Object.entries(AGENT_DEFINITIONS).map(async ([key, agent]) => {
    const bundleRules = collectBundleRules(key, bundle);
    const target = path.join(outputDir, agent.rulesFile);
    await fs.writeFile(target, buildAgentRulesContent(agent, projectName, bundleRules), 'utf-8');
  });

  await Promise.all(rulesWrites);

  return { aiDir };
}

function extractStepTitle(content) {
  const titleLine = content.split('\n').find((line) => line.startsWith('#'));
  if (!titleLine) return null;
  const clean = titleLine.replace(/^#+\s*/, '').trim();
  const match = clean.match(/Etape\s+\d+\s*:\s*(.*)/i);
  if (match && match[1]) return match[1].trim();
  return clean;
}

async function collectSteps(planPath, instructionsDir) {
  if (planPath && fsSync.existsSync(planPath)) {
    try {
      const parsed = await PlanParser.parsePlanFile(planPath);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (error) {
      // Ignore parse errors
    }
  }

  const files = fsSync.readdirSync(instructionsDir).filter((f) => f.endsWith('.md'));
  const steps = [];

  for (const file of files) {
    const stepMatch = file.match(/instructions-step(\d+)\.md/i);
    if (!stepMatch) continue;
    const number = parseInt(stepMatch[1], 10);
    const content = fsSync.readFileSync(path.join(instructionsDir, file), 'utf-8');
    const title = extractStepTitle(content) || `Etape ${number}`;
    steps.push({ number, name: title });
  }

  return steps.sort((a, b) => (a.number || 0) - (b.number || 0));
}

function buildAgentRunContent({ agent, instructionsPath, rulesPath, specPath, projectName, step, moduleLabel }) {
  return [
    '🚀 START',
    '',
    `Tu es l'agent : ${agent.name.toUpperCase()}`,
    '',
    '🎯 Mission :',
    `Suivre les instructions: ${instructionsPath}`,
    specPath ? `Spec: ${specPath}` : '',
    '',
    '📘 Regles :',
    rulesPath,
    '',
    '🧩 Details :',
    `- Tache: ${step.name || 'Sans titre'}`,
    moduleLabel ? `- Module: ${moduleLabel}` : '',
    `- ID interne: step-${step.number}`,
    `- Projet: ${projectName || 'Projet'}`,
    '',
    '🧱 Contraintes :',
    '- Respecter les regles agent.',
    '- Ne pas casser la structure existante.',
    '- Livrer du code valide uniquement.',
    '',
    '🏁 END',
    ''
  ].filter(Boolean).join('\n');
}

async function generateAgentsArtifacts({ outputDir, aiProvider, projectName, steps = [], modules = [], skipRunPrompts = false }) {
  const dirs = getDirs(aiProvider);
  
  // In skipRunPrompts mode (new simplified), only generate rules
  let effectiveSteps = steps;
  let instructionFiles = [];
  
  if (skipRunPrompts) {
    // New simplified mode: use provided steps directly, only generate rules
    if (!effectiveSteps || effectiveSteps.length === 0) {
      console.log(chalk.yellow('⚠ Aucune etape fournie, regles ignorees.'));
      return { tasks: 0, modules: [] };
    }
  } else {
    // Legacy mode: read from Instructions/ directory
    const instructionsDir = path.join(outputDir, dirs.INSTRUCTIONS);
    if (!fsSync.existsSync(instructionsDir)) {
      console.log(chalk.yellow('⚠ Pas de Instructions/ detecte, agents ignores.'));
      return { tasks: 0, modules: [] };
    }

    instructionFiles = fsSync
      .readdirSync(instructionsDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => {
        const match = f.match(/instructions-step(\d+)\.md/i);
        return { file: f, step: match ? parseInt(match[1], 10) : null };
      })
      .filter((e) => e.step !== null)
      .sort((a, b) => a.step - b.step);
      
    if (instructionFiles.length === 0) {
      console.log(chalk.yellow('⚠ Instructions vides, agents ignores.'));
      return { tasks: 0, modules: [] };
    }

    if (!effectiveSteps || effectiveSteps.length === 0) {
      const planPath = fsSync.existsSync(path.join(outputDir, dirs.DOCS, 'implementation-plan.md'))
        ? path.join(outputDir, dirs.DOCS, 'implementation-plan.md')
        : null;
      const instructionsDir2 = path.join(outputDir, dirs.INSTRUCTIONS);
      effectiveSteps = await collectSteps(planPath, instructionsDir2);
    }
  }

  if (!effectiveSteps || effectiveSteps.length === 0) {
    console.log(chalk.yellow('⚠ Aucune etape detectee, agents ignores.'));
    return { tasks: 0, modules: [] };
  }

  const moduleManager = new ModuleManager(outputDir, aiProvider);
  const moduleKeys = modules && modules.length > 0
    ? modules
    : Object.keys(ModuleManager.getModuleDefinitions());
  moduleManager.initializeModules(moduleKeys);
  const moduleAssignments = moduleManager.autoAssignSteps(effectiveSteps);

  // Generate rules (always needed)
  const { aiDir } = await ensureAgentBase(outputDir, projectName);

  // Build module summary from steps
  const moduleSummary = Array.from(
    new Set(
      effectiveSteps.flatMap((step) => {
        const moduleValue = moduleAssignments[step.number] || step.module;
        if (typeof moduleValue === 'string') {
          return moduleValue.split(',').map((m) => m.trim()).filter(Boolean);
        }
        if (Array.isArray(moduleValue)) {
          return moduleValue;
        }
        return [];
      })
    )
  );

  // Skip run prompts and tasks-map in simplified mode
  if (skipRunPrompts) {
    console.log(chalk.green('✓ Regles agents generees'));
    if (moduleSummary.length > 0) {
      console.log(chalk.gray(`  Modules couverts: ${moduleSummary.join(', ')}`));
    }
    return {
      tasks: effectiveSteps.length,
      modules: moduleSummary
    };
  }

  // Legacy mode: generate run prompts and tasks-map
  const runDir = path.join(aiDir, 'run');
  ensureDirectoryExists(runDir);
  
  const tasksMap = [];
  const specPath = fsSync.existsSync(path.join(outputDir, dirs.DOCS, 'spec.md'))
    ? path.relative(outputDir, path.join(outputDir, dirs.DOCS, 'spec.md'))
    : null;
  const instructionsDir = path.join(outputDir, dirs.INSTRUCTIONS);

  for (const { file, step } of instructionFiles) {
    const stepData = effectiveSteps.find((s) => s.number === step) || { number: step, name: `Etape ${step}` };
    const agentKey = resolveAgentKey(stepData, moduleAssignments);
    const agent = AGENT_DEFINITIONS[agentKey] || AGENT_DEFINITIONS.architecture;
    const moduleValue = moduleAssignments[stepData.number] ?? stepData.module;
    const moduleLabel = Array.isArray(moduleValue) ? moduleValue.join(', ') : moduleValue;

    const instructionsPath = path.relative(outputDir, path.join(instructionsDir, file));
    const runFilePath = path.join(runDir, `${agentKey}-step${step}.md`);

    const runContent = buildAgentRunContent({
      agent,
      instructionsPath,
      rulesPath: agent.rulesFile,
      specPath,
      projectName,
      step: stepData,
      moduleLabel
    });

    await fs.writeFile(runFilePath, runContent, 'utf-8');

    tasksMap.push({
      step,
      title: stepData.name || `Etape ${step}`,
      instruction: instructionsPath,
      agent: agentKey,
      module: moduleLabel || null,
      runPrompt: path.relative(outputDir, runFilePath)
    });
  }

  const tasksMapPath = path.join(aiDir, 'tasks.json');
  const mapPayload = {
    generatedAt: new Date().toISOString(),
    entries: tasksMap
  };
  await fs.writeFile(tasksMapPath, JSON.stringify(mapPayload, null, 2), 'utf-8');

  const indexLines = [];
  indexLines.push('# Index des prompts agents\n');
  indexLines.push('| Step | Module | Agent | Run prompt | Instruction |');
  indexLines.push('|------|--------|-------|------------|-------------|');
  tasksMap
    .sort((a, b) => a.step - b.step)
    .forEach((entry) => {
      indexLines.push(`| ${entry.step} | ${entry.module || ''} | ${entry.agent} | ${entry.runPrompt} | ${entry.instruction} |`);
    });
  await fs.writeFile(path.join(runDir, 'README.md'), indexLines.join('\n'), 'utf-8');

  console.log(chalk.green(`✓ Agents generes (${tasksMap.length} taches)`));
  if (moduleSummary.length > 0) {
    console.log(chalk.gray(`  Modules couverts: ${moduleSummary.join(', ')}`));
  }

  return {
    tasks: tasksMap.length,
    modules: moduleSummary
  };
}

module.exports = {
  generateAgentsArtifacts
};
