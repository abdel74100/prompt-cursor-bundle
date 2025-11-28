# 📦 Guide de Publication - Prompt CursorBundle

## 🚀 Publication sur NPM

### Prérequis
1. Compte npm : https://www.npmjs.com/signup
2. Node.js et npm installés
3. Git repository configuré (optionnel mais recommandé)

### Étapes de publication

```bash
# 1. Se connecter à npm
npm login

# 2. Vérifier la connexion
npm whoami

# 3. (Optionnel) Tester localement
npm link
prompt-cursor --version

# 4. Publier sur npm
npm publish --access public

# 5. Vérifier la publication
npm view @abdel-akh/prompt-cursor-bundle
```

### Installation pour les utilisateurs

```bash
# Installation globale
npm install -g @abdel-akh/prompt-cursor-bundle

# Utilisation
prompt-cursor generate -i idea.md
pcb build
```

---

## 🔒 Checklist avant publication

### Vérifications automatiques
```bash
# Lance toutes les vérifications
npm run prepublishOnly

# Ou manuellement :
npm audit               # Vérifier les vulnérabilités
npm pack --dry-run      # Voir ce qui sera publié
```

### Checklist manuelle
- [ ] Pas de secrets/tokens dans le code
- [ ] Pas de chemins absolus hardcodés
- [ ] Dependencies à jour
- [ ] Tests fonctionnels effectués
- [ ] Documentation complète (README.md)
- [ ] LICENSE file présent
- [ ] Version sémantique correcte

---

## 📈 Gestion des versions

### Versioning sémantique (SemVer)

```bash
# Patch (1.0.0 → 1.0.1) - Bug fixes
npm version patch

# Minor (1.0.0 → 1.1.0) - Nouvelles fonctionnalités
npm version minor

# Major (1.0.0 → 2.0.0) - Breaking changes
npm version major

# Après chaque version, publier
npm publish --access public
```

### Exemple de workflow
```bash
# Faire des changements
git add .
git commit -m "Add new feature"

# Incrémenter la version
npm version minor  # Crée un tag git automatiquement

# Publier
npm publish --access public

# Pousser sur GitHub (si configuré)
git push && git push --tags
```

---

## 🌐 Après la publication

### Vérification
1. Visitez : https://www.npmjs.com/package/@abdel-akh/prompt-cursor-bundle
2. Testez l'installation : `npm install -g @abdel-akh/prompt-cursor-bundle`
3. Vérifiez les statistiques de téléchargement

### Maintenance
1. Suivre les issues (si GitHub configuré)
2. Mettre à jour régulièrement les dépendances
3. Respecter le versioning sémantique
4. Documenter les changements

### Promotion (optionnel)
1. Partager sur Twitter/LinkedIn
2. Écrire un article de blog
3. Créer une démo vidéo
4. Documenter sur Dev.to

---

## 🛠️ Commandes utiles

```bash
# Voir les informations du package
npm view @abdel-akh/prompt-cursor-bundle

# Voir toutes les versions publiées
npm view @abdel-akh/prompt-cursor-bundle versions

# Dépublier une version (attention !)
npm unpublish @abdel-akh/prompt-cursor-bundle@1.0.0

# Voir qui peut publier
npm owner ls @abdel-akh/prompt-cursor-bundle

# Ajouter un collaborateur
npm owner add <username> @abdel-akh/prompt-cursor-bundle
```

---

## ⚠️ Important

### Dépublication
- Vous avez 72h pour dépublier après publication
- Après 72h, impossible de dépublier une version téléchargée
- Ne jamais dépublier une version utilisée en production

### Scoped packages (@abdel-akh/prompt-cursor-bundle)
- Nécessite `--access public` pour la publication
- Gratuit pour les packages publics
- Organisé sous votre scope (@prompt-cursor)

### Sécurité
- Ne jamais commiter de secrets
- Activer 2FA sur votre compte npm (recommandé)
- Utiliser des tokens d'accès pour CI/CD

---

## 🎉 Félicitations !

Votre package est maintenant disponible pour la communauté ! 

Lien npm : https://www.npmjs.com/package/@abdel-akh/prompt-cursor-bundle