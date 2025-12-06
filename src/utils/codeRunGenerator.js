const fs = require("fs").promises;
const path = require("path");
const chalk = require("chalk");
const { ensureDirectoryStructure, getFilePath, getDirs, DEFAULT_PROVIDER } = require('./directoryManager');
const { getPromptDirectory } = require('./aiProviders');
const DependencyGraph = require('./dependencyGraph');
const MilestoneManager = require('./milestoneManager');
const ModuleManager = require('./moduleManager');

const MODULE_TEMPLATES = {
	frontend: {
		key: 'frontend',
		contextFocus: 'Créer des écrans accessibles et responsives alignés sur le design system.',
		defaultVerb: 'Implémenter',
		defaultFiles: [
			'src/app/{{slug}}/page.tsx',
			'src/components/{{slug}}/{{slug}}.tsx',
			'src/styles/{{slug}}.css'
		],
		defaultTodos: [
			'Assembler les écrans {{objective}} avec les composants du design system',
			'Gérer les états de chargement et erreurs côté client pour {{objective}}',
			'Brancher les appels API requis pour {{objective}}'
		],
		defaultCommands: ['npm run lint', 'npm run test:ui', 'npm run dev -- --turbo'],
		testExpectations: [
			'Le rendu correspond aux maquettes sur desktop et mobile',
			'Les interactions clavier/souris fonctionnent',
			'Les appels API affichent les bons états'
		],
		validationChecklist: [
			'Les composants critiques sont couverts par des tests',
			'L’accessibilité de base (ARIA/tabs) est respectée',
			'Les performances Lighthouse restent vertes'
		],
		testCommand: 'npm run test:ui'
	},
	backend: {
		key: 'backend',
		contextFocus: 'Exposer des endpoints stables avec gestion d’erreurs et sécurité.',
		defaultVerb: 'Implémenter',
		defaultFiles: [
			'src/modules/{{slug}}/{{slug}}.controller.ts',
			'src/modules/{{slug}}/{{slug}}.service.ts',
			'src/modules/{{slug}}/{{slug}}.dto.ts'
		],
		defaultTodos: [
			'Définir les DTO et schémas de validation pour {{objective}}',
			'Implémenter {{slug}}Service avec la logique métier attendue',
			'Exposer les routes REST /api/{{slug}} sécurisées par middleware'
		],
		defaultCommands: ['npm run lint', 'npm run test:unit', 'npm run start:dev'],
		testExpectations: [
			'Les endpoints renvoient 2xx avec payload correct',
			'Les entrées invalides déclenchent une 4xx cohérente',
			'Les règles métier rejettent les scénarios interdits'
		],
		validationChecklist: [
			'Les endpoints critiques sont protégés (auth/roles)',
			'Les logs et métriques couvrent le flux',
			'La documentation API est mise à jour'
		],
		testCommand: 'npm run test:unit'
	},
	api: {
		key: 'api',
		contextFocus: 'Offrir des endpoints documentés (REST/GraphQL) prêts à consommer.',
		defaultVerb: 'Documenter',
		defaultFiles: [
			'src/api/{{slug}}/route.ts',
			'src/api/{{slug}}/schema.ts',
			'src/api/{{slug}}/tests/{{slug}}.spec.ts'
		],
		defaultTodos: [
			'Définir le contrat API (params + payload) pour {{objective}}',
			'Implémenter les handlers REST/GraphQL pour {{slug}}',
			'Documenter les endpoints dans OpenAPI/Swagger'
		],
		defaultCommands: ['npm run lint', 'npm run test:api', 'npm run start:dev'],
		testExpectations: [
			'Chaque route répond avec le status attendu',
			'Les schémas de validation rejettent les données invalides',
			'La documentation est synchronisée avec le code'
		],
		validationChecklist: [
			'La spec OpenAPI est générée/partagée',
			'Les limites de rate limiting sont configurées',
			'Les erreurs sont normalisées (codes + payload)'
		],
		testCommand: 'npm run test:api'
	},
	auth: {
		key: 'auth',
		contextFocus: 'Sécuriser les parcours d’identification et la gestion des sessions.',
		defaultVerb: 'Sécuriser',
		defaultFiles: [
			'src/auth/{{slug}}.strategy.ts',
			'src/auth/{{slug}}.controller.ts',
			'src/auth/guards/{{slug}}.guard.ts'
		],
		defaultTodos: [
			'Configurer le flux d’authentification pour {{objective}}',
			'Renforcer le stockage des secrets et variables',
			'Couverturer les scénarios d\'expiration et de révocation'
		],
		defaultCommands: ['npm run lint', 'npm run test:auth', 'npm run start:dev'],
		testExpectations: [
			'Les identifiants invalides sont rejetés systématiquement',
			'Les tokens expirés sont refusés',
			'Les routes protégées ne sont pas accessibles en anonyme'
		],
		validationChecklist: [
			'Les secrets sont chargés via le coffre prévu',
			'Les logs n’exposent aucune donnée sensible',
			'Les parcours multi-facteurs sont documentés'
		],
		testCommand: 'npm run test:auth'
	},
	infra: {
		key: 'infra',
		contextFocus: 'Automatiser l’infrastructure, le déploiement et les observabilités.',
		defaultVerb: 'Configurer',
		defaultFiles: [
			'infra/{{slug}}/main.tf',
			'.github/workflows/{{slug}}.yml',
			'ops/{{slug}}.md'
		],
		defaultTodos: [
			'Décrire l’architecture cible {{objective}} dans IaC',
			'Mettre en place la pipeline CI/CD pour {{slug}}',
			'Configurer les tableaux de bord/alertes pour {{objective}}'
		],
		defaultCommands: ['npx terraform fmt', 'npx terraform plan', 'npm run deploy:dev'],
		testExpectations: [
			'Les plans IaC sont idempotents',
			'La pipeline passe sans intervention manuelle',
			'Les alertes déclenchent les bonnes notifications'
		],
		validationChecklist: [
			'Les environnements sont reproductibles',
			'Les secrets sont injectés via le coffre',
			'Les coûts estimés sont conformes aux limites'
		],
		testCommand: 'npm run deploy:dev'
	},
	database: {
		key: 'database',
		contextFocus: 'Garantir un schéma fiable et des migrations traçables.',
		defaultVerb: 'Modéliser',
		defaultFiles: [
			'prisma/{{slug}}.prisma',
			'src/database/migrations/{{slug}}.sql',
			'src/database/seeds/{{slug}}.ts'
		],
		defaultTodos: [
			'Définir le modèle de données pour {{objective}}',
			'Écrire les migrations et seeds cohérents',
			'Valider les index/perfs pour {{objective}}'
		],
		defaultCommands: ['npx prisma migrate dev', 'npx prisma generate', 'npm run db:seed'],
		testExpectations: [
			'Les migrations appliquées sur une base vide fonctionnent',
			'Les contraintes empêchent les incohérences',
			'Les seeds chargent les données essentielles'
		],
		validationChecklist: [
			'Le rollback des migrations est documenté',
			'Les accès DB respectent le principe du moindre privilège',
			'Les sauvegardes automatiques sont vérifiées'
		],
		testCommand: 'npm run test'
	},
	testing: {
		key: 'testing',
		contextFocus: 'Renforcer la couverture et les scénarios critiques.',
		defaultVerb: 'Tester',
		defaultFiles: [
			'tests/{{slug}}.spec.ts',
			'e2e/{{slug}}.e2e.ts',
			'cypress/e2e/{{slug}}.cy.ts'
		],
		defaultTodos: [
			'Cartographier les cas critiques pour {{objective}}',
			'Automatiser les tests unitaires et e2e associés',
			'Brancher les tests dans la CI existante'
		],
		defaultCommands: ['npm run test', 'npm run test:e2e', 'npm run lint'],
		testExpectations: [
			'Les tests couvrent les chemins heureux et erreurs',
			'Les assertions protègent les régressions',
			'Les scénarios e2e reflètent les parcours métiers'
		],
		validationChecklist: [
			'La couverture reste supérieure au seuil cible',
			'Les snapshots sont mis à jour et vérifiés',
			'La CI échoue bien sur un test rouge'
		],
		testCommand: 'npm run test:e2e'
	},
	mobile: {
		key: 'mobile',
		contextFocus: 'Délivrer une expérience native fluide et conforme aux guidelines.',
		defaultVerb: 'Construire',
		defaultFiles: [
			'mobile/src/screens/{{slug}}.tsx',
			'mobile/src/components/{{slug}}.tsx',
			'mobile/src/hooks/use{{pascal}}.ts'
		],
		defaultTodos: [
			'Assembler les écrans mobile pour {{objective}}',
			'Gérer l’état/offline et la navigation',
			'Intégrer les SDK natifs nécessaires'
		],
		defaultCommands: ['npm run ios', 'npm run android', 'npm run test:mobile'],
		testExpectations: [
			'Les écrans respectent les guidelines iOS/Android',
			'Les interactions sont fluides sur device physique',
			'Les erreurs réseau sont gérées hors ligne'
		],
		validationChecklist: [
			'Les builds iOS/Android compilent sans avertissement',
			'Les permissions sensibles sont justifiées',
			'Les performances répondent aux budgets FPS/mémoire'
		],
		testCommand: 'npm run test:mobile'
	},
	generic: {
		key: 'generic',
		contextFocus: 'Livrer la valeur métier attendue sans dette technique.',
		defaultVerb: 'Compléter',
		defaultFiles: [
			'src/{{slug}}/index.ts',
			'docs/decisions/{{slug}}.md'
		],
		defaultTodos: [
			'Clarifier les hypothèses fonctionnelles de {{objective}}',
			'Produire une implémentation testable et documentée',
			'Aligner les critères de validation avec l’équipe produit'
		],
		defaultCommands: ['npm run lint', 'npm test', 'npm run build'],
		testExpectations: [
			'Les scénarios utilisateur clés fonctionnent',
			'Les erreurs sont loguées de façon exploitable',
			'La couverture minimale reste atteinte'
		],
		validationChecklist: [
			'Les parties prenantes valident le comportement',
			'Les métriques clés restent dans le vert',
			'La documentation est partagée'
		],
		testCommand: 'npm test'
	}
};

const STACK_KEYWORDS = {
	frontend: ['react', 'next', 'vue', 'tailwind', 'ui', 'component', 'svelte'],
	backend: ['node', 'nestjs', 'express', 'fastify', 'service', 'api'],
	auth: ['auth', 'jwt', 'oauth', 'passport', 'securité', 'security'],
	infra: ['aws', 'gcp', 'azure', 'terraform', 'docker', 'kubernetes'],
	database: ['postgres', 'mysql', 'mongodb', 'prisma', 'sql', 'redis'],
	testing: ['jest', 'cypress', 'playwright', 'vitest', 'tests'],
	mobile: ['react native', 'flutter', 'swift', 'kotlin', 'expo']
};

const ACTION_VERBS = ['Configurer', 'Implémenter', 'Construire', 'Tester', 'Documenter', 'Sécuriser', 'Optimiser', 'Superviser', 'Décrire', 'Déployer', 'Mettre', 'Créer', 'Valider'];

function slugify(value = '') {
	return value
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'etape';
}

function pascalCase(value = '') {
	return value
		.replace(/[\s_-]+/g, ' ')
		.split(' ')
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
		.join('') || 'Step';
}

function applyTokens(text, tokens) {
	if (!text) return '';
	return Object.entries(tokens).reduce((acc, [key, val]) => {
		const value = Array.isArray(val) ? val.join(', ') : val || '';
		const regex = new RegExp(`{{${key}}}`, 'g');
		return acc.replace(regex, value);
	}, text);
}

function uniqueList(list = []) {
	return [...new Set(list.filter(Boolean))];
}

/**
 * Generate code-run.md and Instructions directory with step files
 * Supports both simple and complex project modes
 */
class CodeRunGenerator {
	constructor(options = {}) {
		this.projectName = options.projectName || "MyProject";
		this.outputDir = options.outputDir || process.cwd();
		this.steps = options.steps || [];
		this.fileExtension = options.fileExtension || "js";
		this.language = options.language || "javascript";
		this.aiProvider = options.aiProvider || DEFAULT_PROVIDER;
		this.promptDir = getPromptDirectory(this.aiProvider);
		this.dirs = getDirs(this.aiProvider);
		this.projectContext = options.projectContext || {};
		
		// Complex mode options
		this.complexMode = options.complexMode || false;
		this.modules = options.modules || [];
		this.milestones = options.milestones || null;
		this.dependencyGraph = null;
		
		// Initialize managers for complex mode
		if (this.complexMode) {
			this.initializeComplexMode(options);
		}
	}

	/**
	 * Initialize complex mode managers
	 */
	initializeComplexMode(options) {
		// Initialize dependency graph
		if (this.steps.length > 0) {
			this.dependencyGraph = new DependencyGraph(this.steps);
			this.dependencyGraph.build();
		}
		
		// Initialize milestone manager
		this.milestoneManager = new MilestoneManager(this.steps, {
			autoGroup: options.autoGroupMilestones !== false,
			defaultMilestones: options.milestoneNames || ['MVP', 'Beta', 'Production']
		});
		
		// Initialize module manager if modules specified
		if (this.modules.length > 0) {
			this.moduleManager = new ModuleManager(this.outputDir, this.aiProvider);
			this.moduleManager.initializeModules(this.modules);
			this.moduleManager.assignStepsToModules(this.steps, options.moduleAssignments || {});
		}
	}

	/**
	 * Generate default steps based on project complexity
	 * @param {number} numSteps - Number of steps (3, 5, 7, or more)
	 * @returns {Array} Array of step objects
	 */
	static generateDefaultSteps(numSteps) {
		const defaultNames = [
			"Configuration et architecture",
			"Authentification et sécurité",
			"Fonctionnalités principales",
			"Interface utilisateur",
			"Tests et validation",
			"Optimisation et performance",
			"Déploiement et monitoring",
			"Documentation et maintenance",
			"Intégration continue",
			"Monitoring avancé"
		];

		return Array.from({ length: numSteps }, (_, i) => ({
			number: i + 1,
			name: defaultNames[i] || `Étape ${i + 1}`,
			objective: "À définir selon votre projet",
			dependsOn: i > 0 ? [i] : [] // Linear dependency by default
		}));
	}

	/**
	 * Replace placeholders in template
	 */
	replacePlaceholders(template, replacements) {
		let result = template;
		for (const [key, value] of Object.entries(replacements)) {
			const regex = new RegExp(`{{${key}}}`, "g");
			result = result.replace(regex, value);
		}
		return result;
	}

	/**
	 * Generate dynamic steps content (unlimited steps)
	 * @returns {string} Markdown content for all steps
	 */
	generateStepsContent() {
		const stepsContent = [];
		
		for (let i = 0; i < this.steps.length; i++) {
			const step = this.steps[i];
			const stepNumber = step.number || (i + 1);
			const isFirst = i === 0;
			
			// Determine status icon
			let statusIcon = '⏳';
			let status = '⚪ En attente';
			let headerIcon = '⏳';
			
			if (isFirst) {
				statusIcon = '🟡';
				status = '🟡 En cours';
				headerIcon = '✅';
			}
			
			// Determine precondition
			let precondition = 'Aucune';
			if (!isFirst) {
				if (step.dependsOn && step.dependsOn.length > 0) {
					if (step.dependsOn.length === 1) {
						precondition = `Étape ${step.dependsOn[0]} terminée`;
					} else {
						precondition = `Étapes ${step.dependsOn.join(', ')} terminées`;
					}
				} else {
					precondition = `Étape ${stepNumber - 1} terminée + tests OK + build ok + runtime ok`;
				}
			}
			
			const stepContent = `
### ${headerIcon} ÉTAPE ${stepNumber} : ${step.name}

**Status:** ${status}  
**Précondition:** ${precondition}  
**Test requis:** \`tests/step${stepNumber}_test.${this.fileExtension}\`  
**Documentation:** \`Instructions/instructions-step${stepNumber}.md\`

**TODO :**
- [ ] Voir détails dans \`Instructions/instructions-step${stepNumber}.md\`

**Critères de validation :**
- Tous les TODOs de \`instructions-step${stepNumber}.md\` complétés
- Tests step${stepNumber}_test passent à 100%
- Build OK
- Runtime OK

---`;
			
			stepsContent.push(stepContent);
		}
		
		return stepsContent.join('\n');
	}

	/**
	 * Generate milestones section for complex mode
	 * @returns {string} Markdown content
	 */
	generateMilestonesSection() {
		if (!this.milestoneManager) return '';
		
		this.milestoneManager.createMilestones(this.milestones);
		return this.milestoneManager.toMarkdown();
	}

	/**
	 * Generate modules section for complex mode
	 * @returns {string} Markdown content
	 */
	generateModulesSection() {
		if (!this.moduleManager || this.modules.length === 0) return '';
		
		const lines = [];
		lines.push('## 📦 MODULES\n');
		
		for (const [key, module] of this.moduleManager.modules) {
			// Skip modules without steps in the display
			if (!module.steps || module.steps.length === 0) {
				continue;
			}
			lines.push(`### ${module.icon} ${module.name}`);
			lines.push(`- **Steps:** ${module.steps.length}`);
			lines.push(`- **Code Run:** \`modules/${key}/workflow/code-run.md\``);
			lines.push('');
		}
		
		return lines.join('\n');
	}

	/**
	 * Generate dependency graph section
	 * @returns {string} Markdown content
	 */
	generateDependencyGraphSection() {
		if (!this.dependencyGraph) return '';
		
		const lines = [];
		lines.push('## 🔗 DEPENDENCY GRAPH\n');
		lines.push(this.dependencyGraph.toMermaid());
		lines.push('');
		lines.push('**Critical Path:** ' + this.dependencyGraph.getCriticalPath().map(n => `Step ${n}`).join(' → '));
		lines.push('');
		
		return lines.join('\n');
	}

	/**
	 * Generate code-run.md file (dynamic version)
	 */
	async generateCodeRunFile() {
		// Ensure prompt directory structure exists
		await ensureDirectoryStructure(this.outputDir, this.aiProvider);

		// Use dynamic template
		const templatePath = path.join(
			__dirname,
			"../prompts/code-run-template-dynamic.md",
		);
		
		let template;
		try {
			template = await fs.readFile(templatePath, "utf-8");
		} catch (error) {
			// Fallback to old template if dynamic doesn't exist
			const oldTemplatePath = path.join(__dirname, "../prompts/code-run-template.md");
			template = await fs.readFile(oldTemplatePath, "utf-8");
		}

		// Generate dynamic content
		const stepsContent = this.generateStepsContent();
		
		// Prepare replacements
		const replacements = {
			PROJECT_NAME: this.projectName,
			EXT: this.fileExtension,
			TOTAL_STEPS: this.steps.length.toString(),
			COMPLETED_STEPS: "0",
			CURRENT_STEP: "1",
			PROGRESS_PERCENTAGE: "0",
			STEPS_CONTENT: stepsContent
		};

		// Handle complex mode sections
		if (this.complexMode) {
			replacements.MILESTONES_SECTION = this.generateMilestonesSection();
			replacements.MODULES_SECTION = this.generateModulesSection();
			replacements.DEPENDENCY_GRAPH = this.generateDependencyGraphSection();
			
			// Remove complex mode markers
			template = template.replace(/\{\{#COMPLEX_MODE\}\}/g, '');
			template = template.replace(/\{\{\/COMPLEX_MODE\}\}/g, '');
		} else {
			// Remove complex mode sections entirely
			template = template.replace(/\{\{#COMPLEX_MODE\}\}[\s\S]*?\{\{\/COMPLEX_MODE\}\}/g, '');
		}

		const content = this.replacePlaceholders(template, replacements);
		const outputPath = getFilePath(this.outputDir, 'CODE_RUN', this.aiProvider);

		await fs.writeFile(outputPath, content, "utf-8");
		console.log(chalk.green(`✓ Fichier code-run.md créé: ${this.promptDir}/workflow/code-run.md`));
		console.log(chalk.gray(`  → ${this.steps.length} étapes générées`));

		return outputPath;
	}

	/**
	 * Generate Instructions directory and step files
	 * Enhanced V2: Rich instructions with files, commands, and detailed TODOs
	 */
	async generateInstructionsFiles() {
		const instructionsDir = path.join(this.outputDir, this.dirs.INSTRUCTIONS);

		// Create Instructions directory
		try {
			await fs.mkdir(instructionsDir, { recursive: true });
			console.log(
				chalk.green(`✓ Dossier Instructions créé: ${this.promptDir}/workflow/Instructions`),
			);
		} catch (error) {
			if (error.code !== "EEXIST") throw error;
		}

		// Generate a file for each step using enhanced template
		const createdFiles = [];
		for (let i = 0; i < this.steps.length; i++) {
			const step = this.steps[i];
			const stepNumber = step.number || (i + 1);
			
			// Generate rich instruction content
			const content = this.generateRichInstructionContent(step, stepNumber, i);
			const fileName = `instructions-step${stepNumber}.md`;
			const filePath = path.join(instructionsDir, fileName);

			await fs.writeFile(filePath, content, "utf-8");
			console.log(chalk.green(`  ✓ ${fileName} créé`));
			createdFiles.push(filePath);
		}

		return createdFiles;
	}

	/**
	 * Generate rich instruction content for a step
	 * Includes files to create, commands to run, and detailed TODOs
	 */
	generateRichInstructionContent(step, stepNumber, index) {
		const moduleInfo = this.resolveModuleTemplate(step);
		const slug = slugify(step.name || `step-${stepNumber}`);
		const tokens = this.buildTokenMap(step, moduleInfo, slug, stepNumber);
		const lines = [];
		
		lines.push(`# Instructions - Étape ${stepNumber} : ${step.name}`);
		lines.push('');
		
		lines.push(...this.buildCoreSections({
			step,
			stepNumber,
			moduleInfo,
			moduleMeta: null,
			slug,
			tokens,
			testPath: `tests/step${stepNumber}_test.${this.fileExtension}`
		}));
		
		lines.push('## 🔄 Prochaine étape');
		lines.push('');
		const nextStep = this.steps[index + 1];
		if (nextStep) {
			lines.push('Une fois cette étape validée, passez à:');
			lines.push(`**Étape ${nextStep.number || (index + 2)}: ${nextStep.name}**`);
		} else {
			lines.push('🎉 **C\'est la dernière étape du projet !**');
		}
		lines.push('');
		
		return lines.join('\n');
	}

	/**
	 * Generate test criteria based on task description
	 */
	generateTestCriteria(description) {
		const lower = description.toLowerCase();
		
		if (lower.includes('créer') && lower.includes('fichier')) {
			return 'Le fichier existe et contient le code attendu';
		}
		if (lower.includes('setup') || lower.includes('init') || lower.includes('configure')) {
			return 'Le projet/module est correctement configuré';
		}
		if (lower.includes('api') || lower.includes('endpoint')) {
			return 'L\'API répond avec le bon status et les bonnes données';
		}
		if (lower.includes('component') || lower.includes('ui') || lower.includes('interface')) {
			return 'Le composant s\'affiche correctement et est interactif';
		}
		if (lower.includes('auth') || lower.includes('login')) {
			return 'L\'authentification fonctionne avec les bons credentials';
		}
		if (lower.includes('database') || lower.includes('prisma') || lower.includes('migration')) {
			return 'Les données sont correctement persistées en base';
		}
		if (lower.includes('websocket') || lower.includes('realtime') || lower.includes('temps réel')) {
			return 'Les événements sont émis et reçus en temps réel';
		}
		if (lower.includes('test') || lower.includes('spec')) {
			return 'Tous les tests passent avec une couverture > 80%';
		}
		if (lower.includes('deploy') || lower.includes('build')) {
			return 'Le build/déploiement s\'exécute sans erreur';
		}
		if (lower.includes('validation') || lower.includes('vérifier')) {
			return 'L\'application fonctionne de bout en bout';
		}
		
		return `L'implémentation de "${description.substring(0, 40)}..." est complète`;
	}

	/**
	 * Sleep utility for visual delay
	 */
	sleep(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	/**
	 * Generate progress bar
	 */
	progressBar(current, total, width = 20) {
		const filled = Math.round((current / total) * width);
		const empty = width - filled;
		return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
	}

	/**
	 * Validate generated files for a module
	 */
	async validateModuleFiles(moduleKey, expectedFiles) {
		const results = { ok: 0, errors: [] };
		
		for (const filePath of expectedFiles) {
			try {
				const stat = await fs.stat(filePath);
				if (stat.size > 0) {
					results.ok++;
				} else {
					results.errors.push(`${path.basename(filePath)}: fichier vide`);
				}
			} catch (error) {
				results.errors.push(`${path.basename(filePath)}: non trouvé`);
			}
		}
		
		return results;
	}

	/**
	 * Generate module-specific files (for complex mode)
	 * Enhanced with visual progress and validation
	 */
	async generateModuleFiles() {
		if (!this.moduleManager || this.modules.length === 0) return [];
		
		const createdFiles = [];
		const validationResults = [];
		
		// Remove empty modules before processing
		const removedCount = this.moduleManager.removeEmptyModules();
		if (removedCount > 0) {
			console.log(chalk.gray(`  ℹ ${removedCount} module(s) vide(s) ignoré(s)\n`));
		}
		
		// Get modules sorted by dependency order
		const orderedModules = this.moduleManager.getRecommendedOrder();
		const totalModules = orderedModules.length;
		
		if (totalModules === 0) {
			console.log(chalk.yellow('  ⚠ Aucun module à générer'));
			return [];
		}
		
		console.log(chalk.cyan(`\n📦 Génération de ${totalModules} module(s) par ordre de dépendance\n`));
		console.log(chalk.gray('═'.repeat(50)));
		
		// Process each module in dependency order
		for (let idx = 0; idx < orderedModules.length; idx++) {
			const { key, module } = orderedModules[idx];
			const moduleNum = idx + 1;
			const moduleFiles = [];
			
			// Header for this module
			const paddedName = module.name.toUpperCase().padEnd(15);
			console.log(chalk.cyan(`\n[${moduleNum}/${totalModules}] ${module.icon} ${paddedName} ──────── progression...`));
			
			const moduleDir = path.join(this.outputDir, this.promptDir, 'modules', key);
			const workflowDir = path.join(moduleDir, 'workflow');
			const instructionsDir = path.join(moduleDir, 'Instructions');
			
			// Create directories
			await fs.mkdir(workflowDir, { recursive: true });
			await fs.mkdir(instructionsDir, { recursive: true });
			
			// Generate module code-run.md
			console.log(chalk.gray(`  ├─ Création code-run.md`));
			const codeRunContent = this.moduleManager.generateModuleCodeRun(key);
			const codeRunPath = path.join(workflowDir, 'code-run.md');
			await fs.writeFile(codeRunPath, codeRunContent, 'utf-8');
			createdFiles.push(codeRunPath);
			moduleFiles.push(codeRunPath);
			
			// Small delay for visual effect
			await this.sleep(100);
			
			// Generate instruction files for module steps
			console.log(chalk.gray(`  ├─ Création ${module.steps.length} instruction(s)`));
			for (let i = 0; i < module.steps.length; i++) {
				const step = module.steps[i];
				const localStepNum = i + 1;
				
				const instructionContent = this.generateModuleInstructionContent(step, localStepNum, module);
				const instructionPath = path.join(instructionsDir, `instructions-step${localStepNum}.md`);
				await fs.writeFile(instructionPath, instructionContent, 'utf-8');
				createdFiles.push(instructionPath);
				moduleFiles.push(instructionPath);
			}
			
			await this.sleep(100);
			
			// Validate files
			const validation = await this.validateModuleFiles(key, moduleFiles);
			const totalExpected = moduleFiles.length;
			
			console.log(chalk.gray(`  └─ Review: ${validation.ok}/${totalExpected} fichiers`));
			
			// Show result
			if (validation.errors.length === 0) {
				console.log(chalk.green(`[${moduleNum}/${totalModules}] ${module.icon} ${paddedName} ──────── VALIDÉ ✓`));
				validationResults.push({ module: key, status: 'OK', files: validation.ok });
			} else {
				console.log(chalk.red(`[${moduleNum}/${totalModules}] ${module.icon} ${paddedName} ──────── ERREUR ✗`));
				validation.errors.forEach(err => console.log(chalk.red(`      └─ ${err}`)));
				validationResults.push({ module: key, status: 'ERROR', errors: validation.errors });
			}
			
			// Delay between modules for readability
			await this.sleep(300);
		}
		
		console.log(chalk.gray('\n' + '═'.repeat(50)));
		
		// Generate master code-run.md
		console.log(chalk.cyan(`\n📋 Génération master-code-run.md...`));
		const masterContent = this.moduleManager.generateMasterCodeRun();
		const masterPath = path.join(this.outputDir, this.promptDir, 'workflow', 'master-code-run.md');
		await fs.writeFile(masterPath, masterContent, 'utf-8');
		createdFiles.push(masterPath);
		console.log(chalk.green(`✓ master-code-run.md créé`));
		
		// Cleanup empty module directories
		const cleanedUp = await this.moduleManager.cleanupEmptyModules();
		if (cleanedUp.length > 0) {
			console.log(chalk.gray(`  ℹ ${cleanedUp.length} dossier(s) vide(s) supprimé(s)`));
		}
		
		// Save module config
		await this.moduleManager.saveConfig();
		
		// Store validation results for later use
		this.validationResults = validationResults;
		
		return createdFiles;
	}

	/**
	 * Generate instruction content for a module step
	 * Enhanced with template-based sections
	 */
	generateModuleInstructionContent(step, localStepNum, module) {
		const moduleInfo = MODULE_TEMPLATES[module.key] || this.resolveModuleTemplate(step);
		const slug = slugify(step.name || `step-${localStepNum}`);
		const tokens = this.buildTokenMap(step, moduleInfo, slug, localStepNum);
		const lines = [];
		
		lines.push(`# ${module.icon} ${module.name} - Instructions Étape ${localStepNum}`);
		lines.push('');
		lines.push(`**Global Step:** ${step.number}`);
		lines.push(`**Module:** ${module.name}`);
		lines.push('');
		
		lines.push(...this.buildCoreSections({
			step,
			stepNumber: localStepNum,
			moduleInfo,
			moduleMeta: module,
			slug,
			tokens,
			testPath: `tests/${module.key}/step${localStepNum}_test.${this.fileExtension}`
		}));
		
		lines.push('## 🔄 Prochaine étape');
		lines.push('');
		const currentIndex = module.steps.findIndex((s) => s.number === step.number);
		const nextStep = currentIndex >= 0 ? module.steps[currentIndex + 1] : null;
		if (nextStep) {
			lines.push('Une fois cette étape validée, passez à:');
			lines.push(`**Étape ${currentIndex + 2}: ${nextStep.name}**`);
		} else {
			lines.push(`🎉 **C'est la dernière étape du module ${module.name} !**`);
			lines.push('');
			lines.push('Passez au prochain module dans `master-code-run.md`');
		}
		lines.push('');
		
		return lines.join('\n');
	}

	resolveModuleTemplate(step) {
		const moduleKeys = Array.isArray(step.module)
			? step.module
			: step.module
				? [step.module]
				: [];
		for (const key of moduleKeys) {
			if (MODULE_TEMPLATES[key]) {
				return MODULE_TEMPLATES[key];
			}
		}
		return MODULE_TEMPLATES.generic;
	}

	buildTokenMap(step, moduleInfo, slug, stepNumber) {
		return {
			slug,
			pascal: pascalCase(step.name || slug),
			objective: step.objective || step.name || `Étape ${stepNumber}`,
			module: moduleInfo.key,
			moduleName: Array.isArray(step.module) ? step.module.join(', ') : step.module || moduleInfo.key,
			stepNumber: step.number || stepNumber
		};
	}

		buildCoreSections({ step, stepNumber, moduleInfo, moduleMeta, slug, tokens, testPath }) {
		const sections = [];
			sections.push(...this.buildContextSection({ step, stepNumber, moduleInfo, moduleMeta, tokens }));
		sections.push(...this.buildFilesSection({ step, moduleInfo, moduleMeta, tokens }));
		sections.push(...this.buildCommandsSection({ step, moduleInfo }));
		sections.push(...this.buildTodoSection({ step, moduleInfo, tokens }));
		sections.push(...this.buildTestsSection({ step, moduleInfo, tokens, testPath }));
		sections.push(...this.buildValidationSection({ moduleInfo, tokens, testPath }));
		return sections;
	}

	buildContextSection({ step, stepNumber, moduleInfo, moduleMeta, tokens }) {
		const lines = [];
		const moduleLabel = moduleMeta?.name || tokens.moduleName || 'Non défini';
		const mission = this.projectContext.summary || `Livrer ${this.projectName}`;
		const objectives = (this.projectContext.keyObjectives || []).slice(0, 2);
		const deps = this.describeDependencies(step, stepNumber);
		const highlight = this.findPlanHighlight(step);
		const stack = this.getStackForModule(moduleInfo.key);
		const estimation = step.techDetails?.estimatedTime || step.estimatedTime || '2-4 heures';
		
		lines.push('## 📋 Contexte');
		lines.push('');
		lines.push(`- **Module:** ${moduleLabel}`);
		lines.push(`- **Focus:** ${moduleInfo.contextFocus}`);
		lines.push(`- **Objectif step:** ${tokens.objective}`);
		lines.push(`- **Estimation:** ${estimation}`);
		lines.push(`- **Dépendances:** ${deps}`);
		lines.push(`- **Mission produit:** ${mission}`);
		if (objectives.length > 0) {
			lines.push(`- **Objectifs liés:** ${objectives.join(' • ')}`);
		}
		if (highlight) {
			lines.push(`- **Lien plan:** ${highlight}`);
		}
		if (stack.length > 0) {
			lines.push(`- **Stack pressentie:** ${stack.join(', ')}`);
		}
		lines.push('');
		lines.push('---');
		lines.push('');
		return lines;
	}

	buildFilesSection({ step, moduleInfo, moduleMeta, tokens }) {
		const lines = [];
		const files = this.collectFileTargets(step, moduleInfo, moduleMeta, tokens);
		lines.push('## 📁 Fichiers cibles');
		lines.push('');
		files.forEach((file) => lines.push(`- \`${file}\``));
		lines.push('');
		lines.push('---');
		lines.push('');
		return lines;
	}

	buildCommandsSection({ step, moduleInfo }) {
		const lines = [];
		const commands = this.collectCommands(step, moduleInfo);
		lines.push('## 💻 Commandes à exécuter');
		lines.push('');
		lines.push('```bash');
		commands.forEach((cmd) => lines.push(cmd));
		lines.push('```');
		lines.push('');
		lines.push('---');
		lines.push('');
		return lines;
	}

	buildTodoSection({ step, moduleInfo, tokens }) {
		const lines = [];
		const todos = this.collectTodos(step, moduleInfo, tokens);
		lines.push('## ✅ TODO Liste');
		lines.push('');
		todos.forEach((todo, idx) => {
			lines.push(`- [ ] ${idx + 1}. ${todo}`);
		});
		lines.push('');
		lines.push('---');
		lines.push('');
		return lines;
	}

	buildTestsSection({ step, moduleInfo, tokens, testPath }) {
		const lines = [];
		const expectations = this.collectTestExpectations(step, moduleInfo, tokens);
		lines.push('## 🧪 Tests requis');
		lines.push('');
		lines.push(`**Fichier:** \`${testPath}\``);
		lines.push('');
		lines.push('**Tests à implémenter:**');
		lines.push('');
		if (expectations.length > 0) {
			expectations.forEach((item, index) => {
				lines.push(`${index + 1}. **${item.title.substring(0, 80)}**`);
				lines.push(`   - Vérifie que: ${item.criteria}`);
				lines.push('');
			});
		} else {
			lines.push('1. **Couverture minimale**');
			lines.push(`   - Vérifie que: ${moduleInfo.testExpectations?.[0] || 'La fonctionnalité répond aux critères métier'}`);
			lines.push('');
		}
		lines.push('**Commande:**');
		lines.push('```bash');
		lines.push(moduleInfo.testCommand || 'npm test');
		lines.push('```');
		lines.push('');
		lines.push('---');
		lines.push('');
		return lines;
	}

	buildValidationSection({ moduleInfo, tokens, testPath }) {
		const lines = [];
		const checklist = [
			'Tous les TODOs ci-dessus complétés',
			`Tests \`${testPath}\` verts`,
			'Build s\'exécute sans erreur',
			'Application démarre correctement',
			'Aucune régression fonctionnelle'
		];
		(moduleInfo.validationChecklist || []).forEach((item) => {
			checklist.unshift(applyTokens(item, tokens));
		});
		lines.push('## 🔍 Critères de validation');
		lines.push('');
		uniqueList(checklist).forEach((item) => lines.push(`- [ ] ${item}`));
		lines.push('');
		lines.push('---');
		lines.push('');
		return lines;
	}

	describeDependencies(step, stepNumber) {
		if (step.dependsOn && step.dependsOn.length > 0) {
			return step.dependsOn.map((d) => `Étape ${d}`).join(', ');
		}
		if (stepNumber === 1) {
			return 'Aucune';
		}
		return `Étape ${stepNumber - 1} validée + tests OK`;
	}

	findPlanHighlight(step) {
		const highlights = this.projectContext.planHighlights || [];
		if (!highlights.length) return null;
		const lowerName = (step.name || '').toLowerCase();
		const exact = highlights.find((item) => item.toLowerCase().includes(lowerName));
		return exact || highlights[0];
	}

	getStackForModule(moduleKey) {
		const stack = this.projectContext.techStack || [];
		if (!stack.length) return [];
		const keywords = STACK_KEYWORDS[moduleKey] || [];
		if (!keywords.length) {
			return stack.slice(0, 3);
		}
		const matches = stack.filter((item) => keywords.some((kw) => item.toLowerCase().includes(kw)));
		return (matches.length > 0 ? matches : stack).slice(0, 3);
	}

	collectFileTargets(step, moduleInfo, moduleMeta, tokens) {
		const fromPlan = Array.isArray(step.files) ? step.files : [];
		const templateFiles = (moduleInfo.defaultFiles || []).map((file) => applyTokens(file, tokens));
		const moduleDirs = moduleMeta?.directories || [];
		if (!templateFiles.length && moduleDirs.length > 0) {
			templateFiles.push(`${moduleDirs[0]}/${tokens.slug || 'index.ts'}`);
		}
		const fallback = [`docs/decisions/${tokens.slug}.md`];
		return uniqueList([...fromPlan, ...templateFiles, ...fallback]).slice(0, 8);
	}

	collectCommands(step, moduleInfo) {
		const userCommands = Array.isArray(step.userCommands) ? step.userCommands.map((cmd) => cmd.trim()).filter(Boolean) : [];
		const defaults = moduleInfo.defaultCommands || [];
		return uniqueList([...userCommands, ...defaults]).slice(0, 5);
	}

	collectTodos(step, moduleInfo, tokens) {
		const todos = [];
		const tasks = Array.isArray(step.tasks) ? step.tasks : [];
		for (const task of tasks) {
			const description = this.renderTaskDescription(task, moduleInfo, tokens);
			if (description) {
				todos.push(description);
			}
			if (todos.length >= 6) {
				break;
			}
		}
		if (todos.length < 3 && moduleInfo.defaultTodos) {
			moduleInfo.defaultTodos.forEach((templateTodo) => {
				const text = applyTokens(templateTodo, tokens);
				if (text) {
					todos.push(this.ensureActionable(text, moduleInfo.defaultVerb));
				}
			});
		}
		while (todos.length < 3) {
			todos.push(this.ensureActionable(`Compléter ${tokens.objective}`, moduleInfo.defaultVerb));
		}
		return todos.slice(0, 8);
	}

	renderTaskDescription(task, moduleInfo, tokens) {
		if (!task) return null;
		if (task.type === 'file' && task.file) {
			return this.ensureActionable(`Créer \`${task.file}\``, 'Créer');
		}
		if (task.type === 'files' && task.description) {
			return this.ensureActionable(applyTokens(task.description, tokens), moduleInfo.defaultVerb);
		}
		if (task.type === 'commands') {
			return this.ensureActionable('Exécuter les commandes listées', 'Exécuter');
		}
		if (task.type === 'validation') {
			return this.ensureActionable('Valider le build + runtime', 'Valider');
		}
		if (task.description) {
			return this.ensureActionable(applyTokens(task.description, tokens), moduleInfo.defaultVerb);
		}
		if (task.details) {
			return this.ensureActionable(applyTokens(task.details, tokens), moduleInfo.defaultVerb);
		}
		return null;
	}

	collectTestExpectations(step, moduleInfo, tokens) {
		const expectations = [];
		if (Array.isArray(step.tasks)) {
			const testableTasks = step.tasks.filter((task) => task.description && task.type !== 'commands');
			for (const task of testableTasks.slice(0, 4)) {
				const title = this.ensureActionable(applyTokens(task.description, tokens), moduleInfo.defaultVerb);
				const criteria = this.generateTestCriteria(task.description);
				expectations.push({ title, criteria });
			}
		}
		if (!expectations.length && moduleInfo.testExpectations) {
			moduleInfo.testExpectations.forEach((item) => {
				const text = applyTokens(item, tokens);
				expectations.push({ title: text, criteria: text });
			});
		}
		return expectations.slice(0, 5);
	}

	ensureActionable(text, fallbackVerb = 'Implémenter') {
		if (!text) return '';
		const cleaned = text.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, '').trim();
		const startsWithVerb = ACTION_VERBS.some((verb) => cleaned.toLowerCase().startsWith(verb.toLowerCase()));
		if (startsWithVerb) {
			return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
		}
		const sentence = `${fallbackVerb} ${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)}`;
		return sentence;
	}

	/**
	 * Validate overall coherence of generated files
	 * @returns {Object} Coherence report
	 */
	async validateCoherence() {
		const report = {
			totalSteps: this.steps.length,
			totalInstructions: 0,
			moduleBreakdown: {},
			errors: [],
			warnings: [],
			score: 0
		};
		
		// Check global instructions
		const globalInstructionsDir = path.join(this.outputDir, this.dirs.INSTRUCTIONS);
		try {
			const files = await fs.readdir(globalInstructionsDir);
			report.totalInstructions = files.filter(f => f.startsWith('instructions-')).length;
		} catch (error) {
			report.errors.push('Dossier Instructions global non trouvé');
		}
		
		// Check module consistency
		if (this.complexMode && this.moduleManager) {
			for (const [key, module] of this.moduleManager.modules) {
				if (!module.steps || module.steps.length === 0) continue;
				
				const moduleDir = path.join(this.outputDir, this.promptDir, 'modules', key);
				const instructionsDir = path.join(moduleDir, 'Instructions');
				
				let instructionCount = 0;
				try {
					const files = await fs.readdir(instructionsDir);
					instructionCount = files.filter(f => f.startsWith('instructions-')).length;
				} catch (error) {
					report.errors.push(`Module ${key}: dossier Instructions non trouvé`);
				}
				
				report.moduleBreakdown[key] = {
					expectedSteps: module.steps.length,
					generatedInstructions: instructionCount,
					match: module.steps.length === instructionCount
				};
				
				if (module.steps.length !== instructionCount) {
					report.warnings.push(`Module ${key}: ${instructionCount}/${module.steps.length} instructions`);
				}
			}
		}
		
		// Calculate coherence score
		let totalExpected = report.totalSteps;
		let totalGenerated = report.totalInstructions;
		
		if (this.complexMode) {
			for (const [key, data] of Object.entries(report.moduleBreakdown)) {
				totalExpected += data.expectedSteps;
				totalGenerated += data.generatedInstructions;
			}
		}
		
		report.score = totalExpected > 0 
			? Math.round((totalGenerated / totalExpected) * 100) 
			: 0;
		
		return report;
	}

	/**
	 * Display coherence report
	 */
	displayCoherenceReport(report) {
		console.log(chalk.cyan('\n' + '═'.repeat(50)));
		console.log(chalk.cyan.bold('📊 RAPPORT DE COHÉRENCE'));
		console.log(chalk.cyan('═'.repeat(50)));
		
		// Global stats
		console.log(chalk.white(`\n📋 Instructions globales: ${report.totalInstructions}/${report.totalSteps}`));
		
		// Module breakdown
		if (Object.keys(report.moduleBreakdown).length > 0) {
			const moduleDefs = ModuleManager.getModuleDefinitions();
			console.log(chalk.white('\n📦 Modules:'));
			for (const [key, data] of Object.entries(report.moduleBreakdown)) {
				const status = data.match ? chalk.green('✓') : chalk.red('✗');
				const icon = moduleDefs[key]?.icon || '📁';
				console.log(chalk.white(`  ${status} ${icon} ${key.padEnd(12)} ${data.generatedInstructions}/${data.expectedSteps} instructions`));
			}
		}
		
		// Errors
		if (report.errors.length > 0) {
			console.log(chalk.red('\n❌ Erreurs:'));
			report.errors.forEach(err => console.log(chalk.red(`  - ${err}`)));
		}
		
		// Warnings
		if (report.warnings.length > 0) {
			console.log(chalk.yellow('\n⚠️ Avertissements:'));
			report.warnings.forEach(warn => console.log(chalk.yellow(`  - ${warn}`)));
		}
		
		// Score display
		console.log(chalk.cyan('\n' + '─'.repeat(50)));
		const scoreColor = report.score >= 100 ? chalk.green : 
						   report.score >= 80 ? chalk.yellow : chalk.red;
		const progressBar = this.progressBar(report.score, 100, 30);
		console.log(`${chalk.white('Score de cohérence:')} ${progressBar} ${scoreColor.bold(`${report.score}%`)}`);
		
		if (report.score >= 100) {
			console.log(chalk.green.bold('\n✨ Cohérence parfaite ! Prêt pour le développement.'));
		} else if (report.score >= 80) {
			console.log(chalk.yellow('\n⚠️ Cohérence acceptable. Vérifiez les avertissements.'));
		} else {
			console.log(chalk.red('\n❌ Cohérence insuffisante. Corrigez les erreurs.'));
		}
		
		console.log(chalk.cyan('═'.repeat(50) + '\n'));
	}

	/**
	 * Generate all files
	 */
	async generate() {
		console.log(chalk.cyan("\n🚀 Génération des fichiers Code Run...\n"));
		
		if (this.complexMode) {
			console.log(chalk.blue("📦 Mode Complexe activé"));
			if (this.modules.length > 0) {
				console.log(chalk.gray(`   Modules: ${this.modules.join(', ')}`));
			}
			console.log('');
		}

		const codeRunPath = await this.generateCodeRunFile();
		const instructionFiles = await this.generateInstructionsFiles();
		
		let moduleFiles = [];
		if (this.complexMode && this.modules.length > 0) {
			moduleFiles = await this.generateModuleFiles();
		}

		console.log(chalk.green("\n✨ Génération terminée avec succès!\n"));
		console.log(chalk.cyan("Fichiers créés:"));
		console.log(chalk.white(`  - ${codeRunPath}`));
		console.log(
			chalk.white(`  - ${path.join(this.outputDir, this.dirs.INSTRUCTIONS)}/`),
		);
		instructionFiles.forEach((file) => {
			console.log(chalk.white(`    - ${path.basename(file)}`));
		});
		
		if (moduleFiles.length > 0) {
			console.log(chalk.white(`  - Module files: ${moduleFiles.length} fichiers`));
		}

		// Validate and display coherence report
		if (this.complexMode) {
			const coherenceReport = await this.validateCoherence();
			this.displayCoherenceReport(coherenceReport);
		}

		return {
			codeRunPath,
			instructionFiles,
			moduleFiles
		};
	}
}

module.exports = CodeRunGenerator;
