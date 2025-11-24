const fs = require("fs").promises;
const path = require("path");
const chalk = require("chalk");
const { ensureDirectoryStructure, getFilePath, DIRS } = require('./directoryManager');

/**
 * Generate code-run.md and Instructions directory with step files
 */
class CodeRunGenerator {
	constructor(options = {}) {
		this.projectName = options.projectName || "MyProject";
		this.outputDir = options.outputDir || process.cwd();
		this.steps = options.steps || [];
		this.fileExtension = options.fileExtension || "js";
		this.language = options.language || "javascript";
	}

	/**
	 * Generate default steps based on project complexity
	 * @param {number} numSteps - Number of steps (3, 5, or 7)
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
		];

		return Array.from({ length: numSteps }, (_, i) => ({
			name: defaultNames[i] || `Étape ${i + 1}`,
			objective: "À définir selon votre projet"
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
	 * Generate code-run.md file
	 */
	async generateCodeRunFile() {
		// Ensure .promptcore directory structure exists
		await ensureDirectoryStructure(this.outputDir);

		const templatePath = path.join(
			__dirname,
			"../prompts/code-run-template.md",
		);
		const template = await fs.readFile(templatePath, "utf-8");

		const replacements = {
			PROJECT_NAME: this.projectName,
			EXT: this.fileExtension,
			TOTAL_STEPS: this.steps.length.toString(),
			COMPLETED_STEPS: "0",
			CURRENT_STEP: "1",
			PROGRESS_PERCENTAGE: "0",
		};

		// Replace step names
		this.steps.forEach((step, index) => {
			const stepKey = `STEP_${index + 1}_NAME`;
			replacements[stepKey] = step.name || `Étape ${index + 1}`;
		});

		// Fill missing steps with placeholder
		for (let i = this.steps.length; i < 5; i++) {
			replacements[`STEP_${i + 1}_NAME`] = `Étape ${i + 1} (À définir)`;
		}

		const content = this.replacePlaceholders(template, replacements);
		const outputPath = getFilePath(this.outputDir, 'CODE_RUN');

		await fs.writeFile(outputPath, content, "utf-8");
		console.log(chalk.green(`✓ Fichier code-run.md créé: .promptcore/workflow/code-run.md`));

		return outputPath;
	}

	/**
	 * Generate Instructions directory and step files
	 */
	async generateInstructionsFiles() {
		const instructionsDir = path.join(this.outputDir, DIRS.INSTRUCTIONS);

		// Create Instructions directory
		try {
			await fs.mkdir(instructionsDir, { recursive: true });
			console.log(
				chalk.green(`✓ Dossier Instructions créé: ${instructionsDir}`),
			);
		} catch (error) {
			if (error.code !== "EEXIST") throw error;
		}

		// Use simple template if steps have tasks array
		const hasTasksArray = this.steps.some(s => Array.isArray(s.tasks));
		const templateName = hasTasksArray ? "instructions-template-simple.md" : "instructions-template.md";
		
		const templatePath = path.join(
			__dirname,
			`../prompts/${templateName}`,
		);
		const template = await fs.readFile(templatePath, "utf-8");

		// Generate a file for each step
		const createdFiles = [];
		for (let i = 0; i < this.steps.length; i++) {
			const step = this.steps[i];
			const stepNumber = i + 1;
			
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
			if (Array.isArray(step.tasks) && step.tasks.length > 0) {
				step.tasks.slice(0, 5).forEach((task, idx) => {
					testsList += `${idx + 1}. **Test:** ${task.description}\n`;
					
					// Generate specific test criteria based on task description
					const taskLower = task.description.toLowerCase();
					let testCriteria = '';
					
					if (taskLower.includes('initialize') || taskLower.includes('setup') && !taskLower.includes('set up')) {
						testCriteria = 'Le projet est correctement initialisé avec tous les fichiers de configuration';
					} else if (taskLower.includes('install') || taskLower.includes('configure') || taskLower.includes('set up')) {
						testCriteria = 'Toutes les dépendances sont installées et configurées correctement';
					} else if (taskLower.includes('folder') || taskLower.includes('structure')) {
						testCriteria = 'La structure de dossiers est créée selon les spécifications';
					} else if (taskLower.includes('api') || taskLower.includes('service')) {
						testCriteria = 'Les appels API fonctionnent et retournent les données attendues';
					} else if (taskLower.includes('component')) {
						testCriteria = 'Le composant s\'affiche correctement et répond aux interactions';
					} else if (taskLower.includes('state') || taskLower.includes('context')) {
						testCriteria = 'L\'état est géré correctement et les mises à jour sont propagées';
					} else if (taskLower.includes('test')) {
						testCriteria = 'Les tests passent avec une couverture minimale de 80%';
					} else if (taskLower.includes('animation')) {
						testCriteria = 'Les animations sont fluides et s\'exécutent à 60 FPS';
					} else if (taskLower.includes('responsive')) {
						testCriteria = 'L\'interface s\'adapte correctement à toutes les tailles d\'écran';
					} else if (taskLower.includes('storage') || taskLower.includes('localstorage')) {
						testCriteria = 'Les données sont correctement sauvegardées et récupérées';
					} else if (taskLower.includes('error')) {
						testCriteria = 'Les erreurs sont gérées gracieusement avec des messages clairs';
					} else if (taskLower.includes('build') || taskLower.includes('deploy')) {
						testCriteria = 'Le build se compile sans erreur et l\'application se déploie correctement';
					} else {
						// Default more specific than before
						testCriteria = `L'implémentation de "${task.description}" est complète et fonctionnelle`;
					}
					
					testsList += `   - Vérifie que: ${testCriteria}\n\n`;
				});
			} else {
				testsList = '1. **Test de base:** À définir selon les fonctionnalités\n';
			}

			const replacements = {
				STEP_NUMBER: stepNumber.toString(),
				STEP_NAME: step.name || `Étape ${stepNumber}`,
				STEP_OBJECTIVE: step.objective || "À définir",
				STEP_DEPENDENCIES:
					step.dependencies ||
					(stepNumber === 1 ? "Aucune" : `Étape ${stepNumber - 1} complétée`),
				TASKS_LIST: tasksList,
				TESTS_LIST: testsList,
				EXT: this.fileExtension,
				TEST_COMMAND: step.testCommand || "npm test",
				NEXT_STEP_NUMBER: (stepNumber + 1).toString(),
				NEXT_STEP_NAME: this.steps[stepNumber]?.name || "Prochaine étape",
				
				// For old template compatibility (keep these even if using simple template)
				OBJECTIVE_1: step.objectives?.[0] || "Objectif 1 à définir",
				OBJECTIVE_2: step.objectives?.[1] || "Objectif 2 à définir",
				OBJECTIVE_3: step.objectives?.[2] || "Objectif 3 à définir",

				PHASE_1_NAME: step.phases?.[0]?.name || "Configuration initiale",
				PHASE_2_NAME: step.phases?.[1]?.name || "Implémentation",
				PHASE_3_NAME: step.phases?.[2]?.name || "Tests et validation",

				// Tasks (with defaults)
				TASK_1_1_DESCRIPTION:
					step.tasks?.["1.1"]?.description || "Tâche 1.1 à définir",
				TASK_1_1_DETAILS: step.tasks?.["1.1"]?.details || "Détails à compléter",
				TASK_1_1_FILES: step.tasks?.["1.1"]?.files || "Fichiers à spécifier",

				TASK_1_2_DESCRIPTION:
					step.tasks?.["1.2"]?.description || "Tâche 1.2 à définir",
				TASK_1_2_DETAILS: step.tasks?.["1.2"]?.details || "Détails à compléter",
				TASK_1_2_FILES: step.tasks?.["1.2"]?.files || "Fichiers à spécifier",

				TASK_1_3_DESCRIPTION:
					step.tasks?.["1.3"]?.description || "Tâche 1.3 à définir",
				TASK_1_3_DETAILS: step.tasks?.["1.3"]?.details || "Détails à compléter",
				TASK_1_3_FILES: step.tasks?.["1.3"]?.files || "Fichiers à spécifier",

				TASK_2_1_DESCRIPTION:
					step.tasks?.["2.1"]?.description || "Tâche 2.1 à définir",
				TASK_2_1_DETAILS: step.tasks?.["2.1"]?.details || "Détails à compléter",
				TASK_2_1_FILES: step.tasks?.["2.1"]?.files || "Fichiers à spécifier",

				TASK_2_2_DESCRIPTION:
					step.tasks?.["2.2"]?.description || "Tâche 2.2 à définir",
				TASK_2_2_DETAILS: step.tasks?.["2.2"]?.details || "Détails à compléter",
				TASK_2_2_FILES: step.tasks?.["2.2"]?.files || "Fichiers à spécifier",

				TASK_3_1_DESCRIPTION:
					step.tasks?.["3.1"]?.description || "Tâche 3.1 à définir",
				TASK_3_1_DETAILS: step.tasks?.["3.1"]?.details || "Détails à compléter",
				TASK_3_1_FILES: step.tasks?.["3.1"]?.files || "Fichiers à spécifier",

				TASK_3_2_DESCRIPTION:
					step.tasks?.["3.2"]?.description || "Tâche 3.2 à définir",
				TASK_3_2_DETAILS: step.tasks?.["3.2"]?.details || "Détails à compléter",
				TASK_3_2_FILES: step.tasks?.["3.2"]?.files || "Fichiers à spécifier",

				// Tests
				EXT: this.fileExtension,
				LANGUAGE: this.language,
				TEST_1_NAME: step.tests?.[0]?.name || "Test de base",
				TEST_1_DESCRIPTION:
					step.tests?.[0]?.description || "Description du test à définir",
				TEST_1_VERIFICATION:
					step.tests?.[0]?.verification || "Ce qui doit être vérifié",

				TEST_2_NAME: step.tests?.[1]?.name || "Test d'intégration",
				TEST_2_DESCRIPTION:
					step.tests?.[1]?.description || "Description du test à définir",
				TEST_2_VERIFICATION:
					step.tests?.[1]?.verification || "Ce qui doit être vérifié",

				TEST_3_NAME: step.tests?.[2]?.name || "Test de validation",
				TEST_3_DESCRIPTION:
					step.tests?.[2]?.description || "Description du test à définir",
				TEST_3_VERIFICATION:
					step.tests?.[2]?.verification || "Ce qui doit être vérifié",

				TEST_COMMAND: step.testCommand || "npm test",

				// Files
				FILE_TO_CREATE_1: step.filesToCreate?.[0] || "fichier1.js",
				FILE_TO_CREATE_2: step.filesToCreate?.[1] || "fichier2.js",
				FILE_TO_CREATE_3: step.filesToCreate?.[2] || "fichier3.js",
				FILE_TO_MODIFY_1: step.filesToModify?.[0] || "fichier_existant1.js",
				FILE_TO_MODIFY_2: step.filesToModify?.[1] || "fichier_existant2.js",

				// Validation criteria
				VALIDATION_CRITERIA_1:
					step.validationCriteria?.[0]?.name || "Critère 1",
				VALIDATION_CRITERIA_1_DETAIL_1:
					step.validationCriteria?.[0]?.details?.[0] || "Détail 1",
				VALIDATION_CRITERIA_1_DETAIL_2:
					step.validationCriteria?.[0]?.details?.[1] || "Détail 2",
				VALIDATION_CRITERIA_1_DETAIL_3:
					step.validationCriteria?.[0]?.details?.[2] || "Détail 3",

				VALIDATION_CRITERIA_2:
					step.validationCriteria?.[1]?.name || "Critère 2",
				VALIDATION_CRITERIA_2_DETAIL_1:
					step.validationCriteria?.[1]?.details?.[0] || "Détail 1",
				VALIDATION_CRITERIA_2_DETAIL_2:
					step.validationCriteria?.[1]?.details?.[1] || "Détail 2",

				VALIDATION_CRITERIA_3:
					step.validationCriteria?.[2]?.name || "Critère 3",
				VALIDATION_CRITERIA_3_DETAIL_1:
					step.validationCriteria?.[2]?.details?.[0] || "Détail 1",
				VALIDATION_CRITERIA_3_DETAIL_2:
					step.validationCriteria?.[2]?.details?.[1] || "Détail 2",

				COVERAGE_THRESHOLD: step.coverageThreshold || "80",

				// Tips and resources
				TIP_1: step.tips?.[0] || "Conseil 1 à définir",
				TIP_2: step.tips?.[1] || "Conseil 2 à définir",
				TIP_3: step.tips?.[2] || "Conseil 3 à définir",

				RESOURCE_1_NAME: step.resources?.[0]?.name || "Documentation",
				RESOURCE_1_URL: step.resources?.[0]?.url || "#",
				RESOURCE_2_NAME: step.resources?.[1]?.name || "Tutoriel",
				RESOURCE_2_URL: step.resources?.[1]?.url || "#",
				RESOURCE_3_NAME: step.resources?.[2]?.name || "Référence API",
				RESOURCE_3_URL: step.resources?.[2]?.url || "#",

				IMPLEMENTATION_NOTES: step.implementationNotes || "Notes à ajouter...",

				PITFALL_1: step.pitfalls?.[0] || "Piège 1 à identifier",
				PITFALL_2: step.pitfalls?.[1] || "Piège 2 à identifier",
				PITFALL_3: step.pitfalls?.[2] || "Piège 3 à identifier",

				NEXT_STEP_NUMBER: (stepNumber + 1).toString(),
				NEXT_STEP_NAME: this.steps[stepNumber]?.name || "Prochaine étape",
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
	 * Generate all files
	 */
	async generate() {
		console.log(chalk.cyan("\n🚀 Génération des fichiers Code Run...\n"));

		const codeRunPath = await this.generateCodeRunFile();
		const instructionFiles = await this.generateInstructionsFiles();

		console.log(chalk.green("\n✨ Génération terminée avec succès!\n"));
		console.log(chalk.cyan("Fichiers créés:"));
		console.log(chalk.white(`  - ${codeRunPath}`));
		console.log(
			chalk.white(`  - ${path.join(this.outputDir, "Instructions")}/`),
		);
		instructionFiles.forEach((file) => {
			console.log(chalk.white(`    - ${path.basename(file)}`));
		});

		return {
			codeRunPath,
			instructionFiles,
		};
	}
}

module.exports = CodeRunGenerator;
