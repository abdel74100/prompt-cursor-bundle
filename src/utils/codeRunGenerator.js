const fs = require("fs").promises;
const path = require("path");
const chalk = require("chalk");
const { ensureDirectoryStructure, getFilePath, getDirs, DEFAULT_PROVIDER } = require('./directoryManager');
const { getPromptDirectory } = require('./aiProviders');
const DependencyGraph = require('./dependencyGraph');
const MilestoneManager = require('./milestoneManager');
const ModuleManager = require('./moduleManager');

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

		// Use simple template if steps have tasks array
		const hasTasksArray = this.steps.some(s => Array.isArray(s.tasks));
		const templateName = hasTasksArray ? "instructions-template-simple.md" : "instructions-template-simple.md";
		
		const templatePath = path.join(
			__dirname,
			`../prompts/${templateName}`,
		);
		const template = await fs.readFile(templatePath, "utf-8");

		// Generate a file for each step
		const createdFiles = [];
		for (let i = 0; i < this.steps.length; i++) {
			const step = this.steps[i];
			const stepNumber = step.number || (i + 1);
			
			// Generate tasks list if tasks array exists
			let tasksList = '';
			if (Array.isArray(step.tasks) && step.tasks.length > 0) {
				step.tasks.forEach((task, idx) => {
					tasksList += `- [ ] **Task ${idx + 1}:** ${task.description}\n`;
					if (task.details) {
						tasksList += `  - Détails: ${task.details}\n`;
					}
					if (task.files) {
						tasksList += `  - Fichiers: ${task.files}\n`;
					}
					tasksList += '\n';
				});
			} else {
				tasksList = '- [ ] Voir le plan d\'implémentation pour les tâches détaillées\n';
			}
			
			// Generate tests list with specific criteria
			let testsList = '';
			let cypressTests = '';
			
			if (Array.isArray(step.tasks) && step.tasks.length > 0) {
				step.tasks.slice(0, 5).forEach((task, idx) => {
					testsList += `${idx + 1}. **Test:** ${task.description}\n`;
					
					// Generate specific test criteria based on task description
					const taskLower = task.description.toLowerCase();
					let testCriteria = '';
					let cypressTest = '';
					
					if (taskLower.includes('initialize') || taskLower.includes('setup') && !taskLower.includes('set up')) {
						testCriteria = 'Le projet est correctement initialisé avec tous les fichiers de configuration';
						cypressTest = `  it('devrait avoir tous les fichiers de configuration', () => {\n    cy.exec('ls package.json').its('code').should('eq', 0);\n  });\n\n`;
					} else if (taskLower.includes('install') || taskLower.includes('configure') || taskLower.includes('set up')) {
						testCriteria = 'Toutes les dépendances sont installées et configurées correctement';
						cypressTest = `  it('devrait avoir toutes les dépendances installées', () => {\n    cy.exec('npm list').its('code').should('eq', 0);\n  });\n\n`;
					} else if (taskLower.includes('folder') || taskLower.includes('structure')) {
						testCriteria = 'La structure de dossiers est créée selon les spécifications';
						cypressTest = `  it('devrait avoir la structure de dossiers correcte', () => {\n    cy.task('checkFolderStructure').should('be.true');\n  });\n\n`;
					} else if (taskLower.includes('api') || taskLower.includes('service')) {
						testCriteria = 'Les appels API fonctionnent et retournent les données attendues';
						cypressTest = `  it('devrait effectuer les appels API avec succès', () => {\n    cy.request('/api/endpoint').its('status').should('eq', 200);\n  });\n\n`;
					} else if (taskLower.includes('component')) {
						testCriteria = 'Le composant s\'affiche correctement et répond aux interactions';
						cypressTest = `  it('devrait afficher le composant correctement', () => {\n    cy.get('[data-testid="component"]').should('be.visible');\n    cy.get('[data-testid="component"]').click();\n  });\n\n`;
					} else if (taskLower.includes('state') || taskLower.includes('context')) {
						testCriteria = 'L\'état est géré correctement et les mises à jour sont propagées';
						cypressTest = `  it('devrait gérer l\'état correctement', () => {\n    cy.window().its('store.getState').should('exist');\n  });\n\n`;
					} else if (taskLower.includes('test')) {
						testCriteria = 'Les tests passent avec une couverture minimale de 80%';
					} else if (taskLower.includes('animation')) {
						testCriteria = 'Les animations sont fluides et s\'exécutent à 60 FPS';
						cypressTest = `  it('devrait avoir des animations fluides', () => {\n    cy.get('[data-testid="animated-element"]').should('have.css', 'transition');\n  });\n\n`;
					} else if (taskLower.includes('responsive')) {
						testCriteria = 'L\'interface s\'adapte correctement à toutes les tailles d\'écran';
						cypressTest = `  it('devrait être responsive', () => {\n    cy.viewport('iphone-6');\n    cy.get('[data-testid="main"]').should('be.visible');\n    cy.viewport('macbook-15');\n    cy.get('[data-testid="main"]').should('be.visible');\n  });\n\n`;
					} else if (taskLower.includes('storage') || taskLower.includes('localstorage')) {
						testCriteria = 'Les données sont correctement sauvegardées et récupérées';
						cypressTest = `  it('devrait sauvegarder dans localStorage', () => {\n    cy.window().its('localStorage').invoke('getItem', 'key').should('exist');\n  });\n\n`;
					} else if (taskLower.includes('error')) {
						testCriteria = 'Les erreurs sont gérées gracieusement avec des messages clairs';
						cypressTest = `  it('devrait gérer les erreurs', () => {\n    cy.get('[data-testid="error"]').should('contain', 'Error');\n  });\n\n`;
					} else if (taskLower.includes('build') || taskLower.includes('deploy')) {
						testCriteria = 'Le build se compile sans erreur et l\'application se déploie correctement';
						cypressTest = `  it('devrait builder sans erreur', () => {\n    cy.exec('npm run build').its('code').should('eq', 0);\n  });\n\n`;
					} else {
						// Default more specific than before
						testCriteria = `L'implémentation de "${task.description}" est complète et fonctionnelle`;
						cypressTest = `  it('devrait valider: ${task.description}', () => {\n    // TODO: Ajouter les assertions spécifiques\n  });\n\n`;
					}
					
					testsList += `   - Vérifie que: ${testCriteria}\n\n`;
					cypressTests += cypressTest;
				});
			} else {
				testsList = '1. **Test de base:** À définir selon les fonctionnalités\n';
				cypressTests = '  it(\'devrait valider l\\\'étape\', () => {\n    // TODO: Ajouter les tests\n  });\n';
			}

			// Determine dependencies text
			let dependenciesText = 'Aucune';
			if (stepNumber > 1) {
				if (step.dependsOn && step.dependsOn.length > 0) {
					dependenciesText = step.dependsOn.map(d => `Étape ${d}`).join(', ') + ' complétée(s)';
				} else {
					dependenciesText = `Étape ${stepNumber - 1} complétée`;
				}
			}

			const replacements = {
				STEP_NUMBER: stepNumber.toString(),
				STEP_NAME: step.name || `Étape ${stepNumber}`,
				STEP_OBJECTIVE: step.objective || "À définir",
				STEP_DEPENDENCIES: dependenciesText,
				TASKS_LIST: tasksList,
				TESTS_LIST: testsList,
				CYPRESS_TESTS: cypressTests || '  // Tests Cypress à ajouter ici',
				EXT: this.fileExtension,
				TEST_COMMAND: step.testCommand || "npm test",
				NEXT_STEP_NUMBER: (stepNumber + 1).toString(),
				NEXT_STEP_NAME: this.steps[i + 1]?.name || "Prochaine étape",
			};

			const content = this.replacePlaceholders(template, replacements);
			const fileName = `instructions-step${stepNumber}.md`;
			const filePath = path.join(instructionsDir, fileName);

			await fs.writeFile(filePath, content, "utf-8");
			console.log(chalk.green(`  ✓ ${fileName} créé`));
			createdFiles.push(filePath);
		}

		return createdFiles;
	}

	/**
	 * Generate module-specific files (for complex mode)
	 */
	async generateModuleFiles() {
		if (!this.moduleManager || this.modules.length === 0) return [];
		
		const createdFiles = [];
		
		// Create module directory structure
		await this.moduleManager.createDirectoryStructure();
		
		// Generate code-run for each module
		for (const [key, module] of this.moduleManager.modules) {
			const moduleDir = path.join(this.outputDir, this.promptDir, 'modules', key);
			const workflowDir = path.join(moduleDir, 'workflow');
			const instructionsDir = path.join(moduleDir, 'Instructions');
			
			// Generate module code-run.md
			const codeRunContent = this.moduleManager.generateModuleCodeRun(key);
			const codeRunPath = path.join(workflowDir, 'code-run.md');
			await fs.writeFile(codeRunPath, codeRunContent, 'utf-8');
			createdFiles.push(codeRunPath);
			console.log(chalk.green(`  ✓ modules/${key}/workflow/code-run.md créé`));
			
			// Generate instruction files for module steps
			for (let i = 0; i < module.steps.length; i++) {
				const step = module.steps[i];
				const localStepNum = i + 1;
				
				const instructionContent = this.generateModuleInstructionContent(step, localStepNum, module);
				const instructionPath = path.join(instructionsDir, `instructions-step${localStepNum}.md`);
				await fs.writeFile(instructionPath, instructionContent, 'utf-8');
				createdFiles.push(instructionPath);
			}
		}
		
		// Generate master code-run.md
		const masterContent = this.moduleManager.generateMasterCodeRun();
		const masterPath = path.join(this.outputDir, this.promptDir, 'workflow', 'master-code-run.md');
		await fs.writeFile(masterPath, masterContent, 'utf-8');
		createdFiles.push(masterPath);
		console.log(chalk.green(`✓ master-code-run.md créé`));
		
		// Save module config
		await this.moduleManager.saveConfig();
		
		return createdFiles;
	}

	/**
	 * Generate instruction content for a module step
	 */
	generateModuleInstructionContent(step, localStepNum, module) {
		return `# ${module.icon} ${module.name} - Instructions Étape ${localStepNum}

## 📋 ${step.name}

**Module:** ${module.name}
**Global Step:** ${step.number}
**Objectif:** ${step.objective || 'À définir'}

---

## ✅ TODO Liste

${Array.isArray(step.tasks) && step.tasks.length > 0 
	? step.tasks.map((t, i) => `- [ ] **Task ${i + 1}:** ${t.description}`).join('\n')
	: '- [ ] Voir le plan d\'implémentation pour les tâches détaillées'}

---

## 🧪 Tests requis

**Fichier:** \`tests/${module.key}/step${localStepNum}_test.${this.fileExtension}\`

---

## 🔍 Critères de validation

- [ ] Tous les TODOs complétés
- [ ] Tests passent à 100%
- [ ] Build OK
- [ ] Aucune régression

---

## 🔄 Prochaine étape

Une fois cette étape validée, continuez avec l'étape suivante du module ou passez au prochain module.
`;
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

		return {
			codeRunPath,
			instructionFiles,
			moduleFiles
		};
	}
}

module.exports = CodeRunGenerator;
