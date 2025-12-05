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
		const lines = [];
		
		// Header
		lines.push(`# Instructions - Étape ${stepNumber} : ${step.name}`);
		lines.push('');
		
		// Overview section
		lines.push('## 📋 Vue d\'ensemble');
		lines.push('');
		
		// Module info
		const moduleDisplay = Array.isArray(step.module) ? step.module.join(', ') : (step.module || 'Non défini');
		lines.push(`**Module:** ${moduleDisplay}`);
		
		// Estimated time
		const estimatedTime = step.techDetails?.estimatedTime || step.estimatedTime || '2-4 heures';
		lines.push(`**Estimation:** ${estimatedTime}`);
		
		// Dependencies
		let dependenciesText = 'Aucune';
		if (stepNumber > 1) {
			if (step.dependsOn && step.dependsOn.length > 0) {
				dependenciesText = step.dependsOn.map(d => `Étape ${d}`).join(', ') + ' complétée(s)';
			} else {
				dependenciesText = `Étape ${stepNumber - 1} complétée`;
			}
		}
		lines.push(`**Dépendances:** ${dependenciesText}`);
		
		// Objective
		if (step.objective && step.objective !== step.name) {
			lines.push('');
			lines.push(`**Objectif:** ${step.objective}`);
		}
		
		lines.push('');
		lines.push('---');
		lines.push('');
		
		// Files to create section
		if (step.files && step.files.length > 0) {
			lines.push('## 📁 Fichiers à créer');
			lines.push('');
			for (const file of step.files) {
				lines.push(`- \`${file}\``);
			}
			lines.push('');
			lines.push('---');
			lines.push('');
		}
		
		// Commands to run section
		if (step.userCommands && step.userCommands.length > 0) {
			lines.push('## 💻 Commandes à exécuter');
			lines.push('');
			lines.push('```bash');
			for (const cmd of step.userCommands) {
				lines.push(cmd);
			}
			lines.push('```');
			lines.push('');
			lines.push('---');
			lines.push('');
		}
		
		// TODO List section
		lines.push('## ✅ TODO Liste');
		lines.push('');
		
		if (Array.isArray(step.tasks) && step.tasks.length > 0) {
			let taskIndex = 1;
			for (const task of step.tasks) {
				if (task.type === 'main') {
					lines.push(`- [ ] **${taskIndex}. ${task.description}**`);
				} else if (task.type === 'file') {
					lines.push(`- [ ] ${taskIndex}. Créer \`${task.file}\``);
				} else if (task.type === 'files') {
					lines.push(`- [ ] ${taskIndex}. ${task.description}`);
					if (task.files) {
						for (const f of task.files.slice(0, 5)) {
							lines.push(`  - \`${f}\``);
						}
						if (task.files.length > 5) {
							lines.push(`  - ... et ${task.files.length - 5} autres fichiers`);
						}
					}
				} else if (task.type === 'commands') {
					lines.push(`- [ ] ${taskIndex}. Exécuter les commandes d'installation`);
					if (task.commands) {
						for (const c of task.commands.slice(0, 3)) {
							lines.push(`  - \`${c}\``);
						}
					}
				} else if (task.type === 'validation') {
					lines.push(`- [ ] ${taskIndex}. ✅ Validation finale (build + runtime)`);
				} else {
					lines.push(`- [ ] ${taskIndex}. ${task.description}`);
				}
				taskIndex++;
			}
		} else {
			lines.push('- [ ] 1. Implémenter les fonctionnalités de cette étape');
			lines.push('- [ ] 2. Vérifier que le code compile');
			lines.push('- [ ] 3. Tester manuellement');
			lines.push('- [ ] 4. Écrire les tests automatisés');
		}
		
		lines.push('');
		lines.push('---');
		lines.push('');
		
		// Tech Stack hints
		if (step.techDetails?.techStack && step.techDetails.techStack.length > 0) {
			lines.push('## 🛠️ Technologies utilisées');
			lines.push('');
			lines.push(step.techDetails.techStack.map(t => `\`${t}\``).join(' • '));
			lines.push('');
			lines.push('---');
			lines.push('');
		}
		
		// Tests section
		lines.push('## 🧪 Tests requis');
		lines.push('');
		lines.push(`**Fichier:** \`tests/step${stepNumber}_test.${this.fileExtension}\``);
		lines.push('');
		lines.push('**Tests à implémenter:**');
		lines.push('');
		
		if (Array.isArray(step.tasks) && step.tasks.length > 0) {
			const testableTasks = step.tasks.filter(t => t.type !== 'validation' && t.type !== 'commands');
			for (let i = 0; i < Math.min(testableTasks.length, 5); i++) {
				const task = testableTasks[i];
				const testCriteria = this.generateTestCriteria(task.description);
				lines.push(`${i + 1}. **${task.description.substring(0, 50)}${task.description.length > 50 ? '...' : ''}**`);
				lines.push(`   - Vérifie que: ${testCriteria}`);
				lines.push('');
			}
		} else {
			lines.push('1. **Test de base**');
			lines.push('   - Vérifie que: L\'étape est correctement implémentée');
		}
		
		lines.push('');
		lines.push('**Commande:**');
		lines.push('```bash');
		lines.push('npm test');
		lines.push('```');
		lines.push('');
		lines.push('---');
		lines.push('');
		
		// Validation criteria
		lines.push('## 🔍 Critères de validation');
		lines.push('');
		lines.push('- [ ] Tous les TODOs ci-dessus complétés');
		lines.push(`- [ ] Tests step${stepNumber}_test passent à 100%`);
		lines.push('- [ ] Build s\'exécute sans erreur');
		lines.push('- [ ] Application démarre correctement');
		lines.push('- [ ] Aucune régression sur les étapes précédentes');
		lines.push('');
		lines.push('---');
		lines.push('');
		
		// Next step
		lines.push('## 🔄 Prochaine étape');
		lines.push('');
		const nextStep = this.steps[index + 1];
		if (nextStep) {
			lines.push(`Une fois cette étape validée, passez à:`);
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
	 * Enhanced V2: Rich instructions matching global format
	 */
	generateModuleInstructionContent(step, localStepNum, module) {
		const lines = [];
		
		// Header
		lines.push(`# ${module.icon} ${module.name} - Instructions Étape ${localStepNum}`);
		lines.push('');
		
		// Overview section
		lines.push('## 📋 Vue d\'ensemble');
		lines.push('');
		lines.push(`**Module:** ${module.name}`);
		lines.push(`**Global Step:** ${step.number}`);
		
		// Estimated time
		const estimatedTime = step.techDetails?.estimatedTime || step.estimatedTime || '2-4 heures';
		lines.push(`**Estimation:** ${estimatedTime}`);
		
		// Dependencies
		let dependenciesText = 'Aucune';
		if (localStepNum > 1) {
			if (step.dependsOn && step.dependsOn.length > 0) {
				// Map global deps to local context
				const localDeps = step.dependsOn.filter(d => 
					module.steps.some(s => s.number === d)
				);
				if (localDeps.length > 0) {
					dependenciesText = localDeps.map(d => `Étape globale ${d}`).join(', ') + ' complétée(s)';
				} else {
					dependenciesText = `Étape ${localStepNum - 1} du module complétée`;
				}
			} else {
				dependenciesText = `Étape ${localStepNum - 1} du module complétée`;
			}
		}
		lines.push(`**Dépendances:** ${dependenciesText}`);
		
		// Objective
		if (step.objective && step.objective !== step.name) {
			lines.push('');
			lines.push(`**Objectif:** ${step.objective}`);
		}
		
		lines.push('');
		lines.push('---');
		lines.push('');
		
		// Files to create section
		if (step.files && step.files.length > 0) {
			lines.push('## 📁 Fichiers à créer');
			lines.push('');
			for (const file of step.files) {
				lines.push(`- \`${file}\``);
			}
			lines.push('');
			lines.push('---');
			lines.push('');
		}
		
		// Commands to run section
		if (step.userCommands && step.userCommands.length > 0) {
			lines.push('## 💻 Commandes à exécuter');
			lines.push('');
			lines.push('```bash');
			for (const cmd of step.userCommands) {
				lines.push(cmd);
			}
			lines.push('```');
			lines.push('');
			lines.push('---');
			lines.push('');
		}
		
		// TODO List section - enhanced
		lines.push('## ✅ TODO Liste');
		lines.push('');
		
		if (Array.isArray(step.tasks) && step.tasks.length > 0) {
			let taskIndex = 1;
			for (const task of step.tasks) {
				if (task.type === 'main') {
					lines.push(`- [ ] **${taskIndex}. ${task.description}**`);
				} else if (task.type === 'file') {
					lines.push(`- [ ] ${taskIndex}. Créer \`${task.file}\``);
				} else if (task.type === 'files') {
					lines.push(`- [ ] ${taskIndex}. ${task.description}`);
					if (task.files) {
						for (const f of task.files.slice(0, 5)) {
							lines.push(`  - \`${f}\``);
						}
						if (task.files.length > 5) {
							lines.push(`  - ... et ${task.files.length - 5} autres fichiers`);
						}
					}
				} else if (task.type === 'commands') {
					lines.push(`- [ ] ${taskIndex}. Exécuter les commandes`);
					if (task.commands) {
						for (const c of task.commands.slice(0, 3)) {
							lines.push(`  - \`${c}\``);
						}
					}
				} else if (task.type === 'validation') {
					lines.push(`- [ ] ${taskIndex}. ✅ Validation (build + runtime)`);
				} else {
					lines.push(`- [ ] ${taskIndex}. ${task.description}`);
				}
				taskIndex++;
			}
		} else {
			// Fallback: use files to create as tasks
			if (step.files && step.files.length > 0) {
				lines.push(`- [ ] **1. ${step.objective || step.name}**`);
				let taskIdx = 2;
				for (const file of step.files.slice(0, 6)) {
					lines.push(`- [ ] ${taskIdx}. Créer \`${file}\``);
					taskIdx++;
				}
				if (step.userCommands && step.userCommands.length > 0) {
					lines.push(`- [ ] ${taskIdx}. Exécuter les commandes d'installation`);
					for (const cmd of step.userCommands.slice(0, 3)) {
						lines.push(`  - \`${cmd}\``);
					}
					taskIdx++;
				}
				lines.push(`- [ ] ${taskIdx}. ✅ Validation finale (build + runtime)`);
			} else {
				lines.push(`- [ ] **1. ${step.objective || step.name}**`);
				lines.push('- [ ] 2. Implémenter les fonctionnalités');
				lines.push('- [ ] 3. ✅ Validation finale (build + runtime)');
			}
		}
		
		lines.push('');
		lines.push('---');
		lines.push('');
		
		// Tests section
		lines.push('## 🧪 Tests requis');
		lines.push('');
		lines.push(`**Fichier:** \`tests/${module.key}/step${localStepNum}_test.${this.fileExtension}\``);
		lines.push('');
		lines.push('**Tests à implémenter:**');
		lines.push('');
		
		if (Array.isArray(step.tasks) && step.tasks.length > 0) {
			const testableTasks = step.tasks.filter(t => t.type !== 'validation' && t.type !== 'commands');
			for (let i = 0; i < Math.min(testableTasks.length, 5); i++) {
				const task = testableTasks[i];
				const testCriteria = this.generateTestCriteria(task.description);
				lines.push(`${i + 1}. **${task.description.substring(0, 50)}${task.description.length > 50 ? '...' : ''}**`);
				lines.push(`   - Vérifie que: ${testCriteria}`);
				lines.push('');
			}
		} else {
			lines.push(`1. **${step.name.substring(0, 50)}${step.name.length > 50 ? '...' : ''}**`);
			lines.push(`   - Vérifie que: L'implémentation est complète`);
		}
		
		lines.push('');
		lines.push('**Commande:**');
		lines.push('```bash');
		lines.push('npm test');
		lines.push('```');
		lines.push('');
		lines.push('---');
		lines.push('');
		
		// Validation criteria
		lines.push('## 🔍 Critères de validation');
		lines.push('');
		lines.push('- [ ] Tous les TODOs ci-dessus complétés');
		lines.push(`- [ ] Tests passent à 100%`);
		lines.push('- [ ] Build s\'exécute sans erreur');
		lines.push('- [ ] Application démarre correctement');
		lines.push('- [ ] Aucune régression');
		lines.push('');
		lines.push('---');
		lines.push('');
		
		// Next step
		lines.push('## 🔄 Prochaine étape');
		lines.push('');
		const nextStepIndex = module.steps.findIndex(s => s.number === step.number) + 1;
		const nextStep = module.steps[nextStepIndex];
		if (nextStep) {
			lines.push(`Une fois cette étape validée, passez à:`);
			lines.push(`**Étape ${nextStepIndex + 1}: ${nextStep.name}**`);
		} else {
			lines.push(`🎉 **C'est la dernière étape du module ${module.name} !**`);
			lines.push('');
			lines.push('Passez au prochain module dans `master-code-run.md`');
		}
		lines.push('');
		
		return lines.join('\n');
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
