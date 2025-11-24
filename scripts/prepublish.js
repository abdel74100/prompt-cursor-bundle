#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

console.log(chalk.blue('🔍 Vérification avant publication...\n'));

// Vérifications
const checks = [
    {
        name: 'Node version',
        check: () => {
            const version = process.version;
            const major = parseInt(version.split('.')[0].substring(1));
            return major >= 14;
        },
        error: 'Node.js 14+ requis'
    },
    {
        name: 'Package.json valide',
        check: () => {
            const pkg = require('../package.json');
            return pkg.name && pkg.version && pkg.bin;
        },
        error: 'package.json incomplet'
    },
    {
        name: 'Fichiers requis',
        check: () => {
            const required = ['README.md', 'LICENSE', 'bin/cli.js'];
            return required.every(f => 
                fs.existsSync(path.join(__dirname, '..', f))
            );
        },
        error: 'Fichiers manquants'
    },
    {
        name: 'Pas de secrets',
        check: () => {
            const files = [
                'src/commands',
                'src/utils',
                'bin'
            ];
            
            for (const dir of files) {
                const fullPath = path.join(__dirname, '..', dir);
                if (!fs.existsSync(fullPath)) continue;
                
                const output = execSync(
                    `grep -r "password\\|secret\\|token\\|api_key" ${fullPath} || true`,
                    { encoding: 'utf-8' }
                );
                
                if (output.includes('=') && !output.includes('JWT')) {
                    return false;
                }
            }
            return true;
        },
        error: 'Secrets potentiels détectés'
    },
    {
        name: 'CLI exécutable',
        check: () => {
            try {
                execSync('node bin/cli.js --version', { 
                    cwd: path.join(__dirname, '..') 
                });
                return true;
            } catch {
                return false;
            }
        },
        error: 'CLI ne fonctionne pas'
    }
];

// Exécution des vérifications
let allPassed = true;

for (const check of checks) {
    process.stdout.write(`Vérification: ${check.name}... `);
    
    try {
        if (check.check()) {
            console.log(chalk.green('✓'));
        } else {
            console.log(chalk.red('✗'));
            console.log(chalk.yellow(`  → ${check.error}`));
            allPassed = false;
        }
    } catch (error) {
        console.log(chalk.red('✗'));
        console.log(chalk.yellow(`  → Erreur: ${error.message}`));
        allPassed = false;
    }
}

console.log();

// Résultat final
if (allPassed) {
    console.log(chalk.green('✅ Toutes les vérifications passées!'));
    console.log(chalk.blue('\n📦 Prêt pour la publication:'));
    console.log(chalk.gray('  npm login'));
    console.log(chalk.gray('  npm publish --access public'));
} else {
    console.log(chalk.red('❌ Des vérifications ont échoué.'));
    console.log(chalk.yellow('Corrigez les problèmes avant de publier.'));
    process.exit(1);
}

// Afficher les infos du package
const pkg = require('../package.json');
console.log(chalk.cyan('\n📋 Informations du package:'));
console.log(`  Nom: ${pkg.name}`);
console.log(`  Version: ${pkg.version}`);
console.log(`  Licence: ${pkg.license}`);

// Taille estimée
try {
    const output = execSync('npm pack --dry-run 2>&1', {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf-8'
    });
    
    const sizeMatch = output.match(/package size:\s+([^\n]+)/i);
    if (sizeMatch) {
        console.log(`  Taille: ${sizeMatch[1]}`);
    }
} catch (error) {
    // Ignorer si la commande échoue
}
