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
    rulesFile: '.prompt-rules/architecture-rules.md',
    description: 'Pilote la vision globale'
  },
  backend: {
    name: 'Backend',
    rulesFile: '.prompt-rules/backend-rules.md',
    description: 'Services, API, sécurité'
  },
  frontend: {
    name: 'Frontend',
    rulesFile: '.prompt-rules/frontend-rules.md',
    description: 'UI/UX, accessibilité'
  },
  devops: {
    name: 'DevOps/Infra',
    rulesFile: '.prompt-rules/devops-rules.md',
    description: 'CI/CD, infra, observabilité'
  },
  database: {
    name: 'Database',
    rulesFile: '.prompt-rules/database-rules.md',
    description: 'Schéma, migrations, perfs'
  },
  qa: {
    name: 'QA/Testing',
    rulesFile: '.prompt-rules/qa-rules.md',
    description: 'Tests et qualité'
  },
  mobile: {
    name: 'Mobile',
    rulesFile: '.prompt-rules/mobile-rules.md',
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

function buildAgentRulesContent(agent, projectName) {
  const base = [
    `# Règles ${agent.name}`,
    '',
    `Projet: ${projectName || 'Projet'}`,
    '',
    '## Rôle',
    `- ${agent.description}`,
    '',
    '## Livrables',
    '- Code prêt à intégrer (patchs cohérents).',
    '- Courte note de validation (risques, tests).',
    '',
    '## Entrées',
    '- spec.md (architecture/contrats).',
    '- implementation-plan.md (ordre & dépendances).',
    '- Instructions stepX (détails de la tâche).',
    '',
    '## Contraintes globales',
    '- Ne pas casser l’existant, respecter conventions.',
    '- Gérer erreurs & validations en priorité.',
    '- Tests à jour si périmètre modifié.'
  ];

  const bestPractices = {
    backend: [
      'Validation stricte des inputs (DTO/schema).',
      'Gestion d’erreurs normalisée (codes, payload).',
      'Logs utiles et non verbeux (pas de données sensibles).',
      'Sécurité: authN/authZ, rate limiting, protections injection.',
      'Tests unitaires sur la logique métier, e2e sur endpoints.',
      'Architecture en couches (handlers/controllers -> services -> repos).',
      'Secrets et configs via env/secret manager, jamais en dur.',
      'Timeouts, retries, circuit breakers sur IO externes.',
      'Monitoring/metrics (latence, erreurs) et traces corrélées.',
      'Paginer/filtrer/retrier proprement les endpoints.'
    ],
    frontend: [
      'Accessibilité (ARIA, focus, clavier).',
      'États UX complets (loading, error, empty).',
      'Composants réutilisables, styles cohérents.',
      'Appels API typés, gestion des erreurs réseau.',
      'Tests UI (composants) et e2e sur parcours critiques.',
      'Optimiser le rendu (memo, suspense) et limiter le sur-fetch.',
      'TypeScript strict, props immutables, hooks simples et purs.',
      'Structure déclarative: composants purs, éviter setState inutile.',
      'Styling: Tailwind/shadcn, pas de styles inline superflus.',
      'Accessibilité by default (roles, aria-*, focus trap si modal).',
      'Performances: code splitting, lazy, éviter re-render (memo).',
      'Data: éviter useEffect pour le fetching si possible, mutualiser cache.',
      'Tests: coverage sur composants critiques et interactions clavier.'
    ],
    devops: [
      'CI reproductible, commandes idempotentes.',
      'Secrets via env/gestionnaire, jamais en clair.',
      'Observabilité: logs structurés, métriques, alertes.',
      'Sécurité supply-chain (lockfiles, scans).',
      'Déploiements progressifs/rollbacks sécurisés.',
      'Images/minutes CI minimalistes, cache maîtrisé.'
    ],
    database: [
      'Migrations idempotentes, rollback documenté.',
      'Contraintes d’intégrité, index ciblés.',
      'Accès principle of least privilege.',
      'Plans d’explain si requêtes lourdes.',
      'Transactions cohérentes et isolation adaptée.'
    ],
    qa: [
      'Pyramide de tests: unit > intégration > e2e.',
      'Données de test déterministes, fixtures propres.',
      'Couverture des chemins d’erreur et edge cases.',
      'Critères d’acceptation alignés avec les specs.'
    ],
    mobile: [
      'Performance (render, mémoire), navigation fluide.',
      'Gestion offline/réseau, permissions minimales.',
      'Respect guidelines plateforme.',
      'Tests sur device réel et gestion des tailles d’écran.'
    ],
    devopsInfra: [
      'Infra as Code idempotente.',
      'Pipelines avec artefacts versionnés.',
      'Monitoring/alerting sur chemins critiques.',
      'Scans sécurité et conformité sur les pipelines.'
    ],
    architecture: [
      'Cohérence modulaire, séparation des responsabilités.',
      'Dépendances explicites, éviter le couplage fort.',
      'Risques identifiés et mitigations proposées.',
      'Alignement sur les contraintes non-fonctionnelles (perf, sécu, coût).'
    ],
    api: [
      'Contrats stables (OpenAPI/GraphQL schema).',
      'Gestion erreurs/retours cohérente.',
      'Versioning et compat ascendante.',
      'Idempotence sur endpoints sensibles, rate limiting.'
    ],
    auth: [
      'Flux auth sécurisés (tokens courts, rafraîchissement).',
      'Scopes/roles explicites, moindre privilège.',
      'Protection contre attaques usuelles (replay, brute force).',
      'Rotation des secrets/keys, revocation paths.'
    ]
  };

  const agentKey = Object.keys(AGENT_DEFINITIONS).find(
    (k) => AGENT_DEFINITIONS[k].name === agent.name
  );

  const pick = (key) => (bestPractices[key] || []).map((p) => `- ${p}`);

  switch (agentKey) {
    case 'backend':
      base.push('\n## Bonnes pratiques backend', ...pick('backend'));
      base.push('\n## Bonnes pratiques API', ...pick('api'));
      base.push('\n## Bonnes pratiques Auth', ...pick('auth'));
      break;
    case 'frontend':
      base.push('\n## Bonnes pratiques frontend', ...pick('frontend'));
      break;
    case 'devops':
      base.push('\n## Bonnes pratiques infra/CI', ...pick('devops'), ...pick('devopsInfra'));
      break;
    case 'database':
      base.push('\n## Bonnes pratiques base de données', ...pick('database'));
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

function buildAgentTemplateContent(agent) {
  return [
    `# Template ${agent.name}`,
    '',
    'Contexte:',
    '- {{context}}',
    '',
    'Règles:',
    `- Voir ${agent.rulesFile}`,
    '',
    'Tâches:',
    '- {{tasks}}',
    ''
  ].join('\n');
}

async function ensureAgentBase(outputDir, projectName) {
  const configDir = path.join(outputDir, '.prompt-config');
  const rulesDir = path.join(outputDir, '.prompt-rules');
  const agentsDir = path.join(outputDir, '.prompt-agents');
  const templatesDir = path.join(agentsDir, 'templates');
  const runDir = path.join(agentsDir, 'run');

  [configDir, rulesDir, templatesDir, runDir].forEach(ensureDirectoryExists);

  const rulesWrites = Object.entries(AGENT_DEFINITIONS).map(async ([, agent]) => {
    const target = path.join(outputDir, agent.rulesFile);
    await fs.writeFile(target, buildAgentRulesContent(agent, projectName), 'utf-8');
  });

  const templateWrites = Object.entries(AGENT_DEFINITIONS).map(async ([key, agent]) => {
    const target = path.join(templatesDir, `${key}-template.md`);
    await fs.writeFile(target, buildAgentTemplateContent(agent), 'utf-8');
  });

  const agentsConfig = {
    project: projectName || 'Projet',
    generatedAt: new Date().toISOString(),
    agents: Object.entries(AGENT_DEFINITIONS).map(([key, agent]) => ({
      id: key,
      name: agent.name,
      description: agent.description,
      rules: agent.rulesFile,
      template: `.prompt-agents/templates/${key}-template.md`
    }))
  };

  const configPath = path.join(configDir, 'agents.json');

  await Promise.all([...rulesWrites, ...templateWrites, fs.writeFile(configPath, JSON.stringify(agentsConfig, null, 2), 'utf-8')]);

  return { runDir };
}

function extractStepTitle(content) {
  const titleLine = content.split('\n').find((line) => line.startsWith('#'));
  if (!titleLine) return null;
  const clean = titleLine.replace(/^#+\s*/, '').trim();
  const match = clean.match(/Étape\s+\d+\s*:\s*(.*)/i);
  if (match && match[1]) return match[1].trim();
  return clean;
}

async function collectSteps(planPath, instructionsDir) {
  if (planPath && fsSync.existsSync(planPath)) {
    try {
      const parsed = await PlanParser.parsePlanFile(planPath);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (error) {
      // Ignore parse errors, fallback to instructions
    }
  }

  const files = fsSync.readdirSync(instructionsDir).filter((f) => f.endsWith('.md'));
  const steps = [];

  for (const file of files) {
    const stepMatch = file.match(/instructions-step(\d+)\.md/i);
    if (!stepMatch) continue;
    const number = parseInt(stepMatch[1], 10);
    const content = fsSync.readFileSync(path.join(instructionsDir, file), 'utf-8');
    const title = extractStepTitle(content) || `Étape ${number}`;
    steps.push({ number, name: title });
  }

  return steps.sort((a, b) => (a.number || 0) - (b.number || 0));
}

function buildAgentRunContent({ agent, instructionsPath, rulesPath, specPath, projectName, step }) {
  return [
    '🚀 START',
    '',
    `Tu es l’agent : ${agent.name.toUpperCase()}`,
    '',
    '🎯 Mission :',
    `Suivre les instructions: ${instructionsPath}`,
    specPath ? `Spec: ${specPath}` : '',
    '',
    '📘 Règles :',
    rulesPath,
    '',
    '🧩 Détails :',
    `- Étape: ${step.number}`,
    `- Titre: ${step.name || 'Sans titre'}`,
    `- Projet: ${projectName || 'Projet'}`,
    '',
    '🧱 Contraintes :',
    '- Respecter les règles agent.',
    '- Ne pas casser la structure existante.',
    '- Livrer du code valide uniquement.',
    '',
    '🏁 END',
    ''
  ].filter(Boolean).join('\n');
}

async function generateAgentsArtifacts({ outputDir, aiProvider, projectName, steps = [], modules = [] }) {
  const dirs = getDirs(aiProvider);
  const instructionsDir = path.join(outputDir, dirs.INSTRUCTIONS);
  if (!fsSync.existsSync(instructionsDir)) {
    console.log(chalk.yellow('⚠ Pas d’Instructions/ détecté, agents ignorés.'));
    return;
  }

  const instructionFiles = fsSync
    .readdirSync(instructionsDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const match = f.match(/instructions-step(\d+)\.md/i);
      return { file: f, step: match ? parseInt(match[1], 10) : null };
    })
    .filter((e) => e.step !== null)
    .sort((a, b) => a.step - b.step);
  if (instructionFiles.length === 0) {
    console.log(chalk.yellow('⚠ Instructions vides, agents ignorés.'));
    return;
  }

  let effectiveSteps = steps;
  if (!effectiveSteps || effectiveSteps.length === 0) {
    const planPath = fsSync.existsSync(path.join(outputDir, dirs.DOCS, 'implementation-plan.md'))
      ? path.join(outputDir, dirs.DOCS, 'implementation-plan.md')
      : null;
    effectiveSteps = await collectSteps(planPath, instructionsDir);
  }

  if (!effectiveSteps || effectiveSteps.length === 0) {
    console.log(chalk.yellow('⚠ Aucune étape détectée, agents ignorés.'));
    return;
  }

  const moduleManager = new ModuleManager(outputDir, aiProvider);
  const moduleKeys = modules && modules.length > 0
    ? modules
    : Object.keys(ModuleManager.getModuleDefinitions());
  moduleManager.initializeModules(moduleKeys);
  const moduleAssignments = moduleManager.autoAssignSteps(effectiveSteps);

  const { runDir } = await ensureAgentBase(outputDir, projectName);

  const tasksMap = [];
  const specPath = fsSync.existsSync(path.join(outputDir, dirs.DOCS, 'spec.md'))
    ? path.relative(outputDir, path.join(outputDir, dirs.DOCS, 'spec.md'))
    : null;

  for (const { file, step } of instructionFiles) {
    const stepData = effectiveSteps.find((s) => s.number === step) || { number: step, name: `Étape ${step}` };
    const agentKey = resolveAgentKey(stepData, moduleAssignments);
    const agent = AGENT_DEFINITIONS[agentKey] || AGENT_DEFINITIONS.architecture;

    const instructionsPath = path.relative(outputDir, path.join(instructionsDir, file));
    const runFilePath = path.join(runDir, `${agentKey}-step${step}.md`);

    const runContent = buildAgentRunContent({
      agent,
      instructionsPath,
      rulesPath: agent.rulesFile,
      specPath,
      projectName,
      step: stepData
    });

    await fs.writeFile(runFilePath, runContent, 'utf-8');

    tasksMap.push({
      step,
      instruction: instructionsPath,
      agent: agentKey,
      runPrompt: path.relative(outputDir, runFilePath)
    });
  }

  const tasksMapPath = path.join(outputDir, '.prompt-agents', 'tasks-map.json');
  const mapPayload = {
    generatedAt: new Date().toISOString(),
    entries: tasksMap
  };
  await fs.writeFile(tasksMapPath, JSON.stringify(mapPayload, null, 2), 'utf-8');

  // Index lisible des prompts de run
  const indexLines = [];
  indexLines.push('# Index des prompts agents\n');
  indexLines.push('| Step | Agent | Run prompt | Instruction |');
  indexLines.push('|------|-------|------------|-------------|');
  tasksMap
    .sort((a, b) => a.step - b.step)
    .forEach((entry) => {
      indexLines.push(`| ${entry.step} | ${entry.agent} | ${entry.runPrompt} | ${entry.instruction} |`);
    });
  await fs.writeFile(path.join(runDir, 'README.md'), indexLines.join('\n'), 'utf-8');

  console.log(chalk.green(`✓ Agents générés (${tasksMap.length} tâches)`));
}

module.exports = {
  generateAgentsArtifacts
};

