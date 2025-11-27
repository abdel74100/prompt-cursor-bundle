# Instructions - Étape {{STEP_NUMBER}} : {{STEP_NAME}}

## 📋 Vue d'ensemble

**Objectif:** {{STEP_OBJECTIVE}}

**Dépendances:** {{STEP_DEPENDENCIES}}

---

## ✅ TODO Liste

{{TASKS_LIST}}

---

## 🧪 Tests requis

### Tests unitaires: `tests/step{{STEP_NUMBER}}_test.{{EXT}}`

**Tests à implémenter:**

{{TESTS_LIST}}

**Commande pour exécuter les tests:**
```bash
{{TEST_COMMAND}}
```

### 🎯 Tests E2E Cypress (optionnel)

**Dossier:** `cypress/e2e/step{{STEP_NUMBER}}/`

**Fichier de test:** `cypress/e2e/step{{STEP_NUMBER}}/step{{STEP_NUMBER}}.cy.js`

**Tests Cypress à créer:**

```javascript
describe('Étape {{STEP_NUMBER}}: {{STEP_NAME}}', () => {
  beforeEach(() => {
    // Setup avant chaque test
    cy.visit('http://localhost:3000');
  });

  {{CYPRESS_TESTS}}

  it('Validation complète de l\'étape {{STEP_NUMBER}}', () => {
    // Vérifier que toutes les fonctionnalités de l'étape fonctionnent
    cy.log('✅ Étape {{STEP_NUMBER}} complète et fonctionnelle');
  });
});
```

**Lancer les tests Cypress:**
```bash
# Tests en mode interactif
npx cypress open

# Tests en mode headless
npx cypress run --spec "cypress/e2e/step{{STEP_NUMBER}}/**"
```

---

## 🔍 Critères de validation

- [ ] Tous les TODOs ci-dessus complétés
- [ ] Tests step{{STEP_NUMBER}}_test passent à 100%
- [ ] Build s'exécute sans erreur
- [ ] Application démarre correctement
- [ ] Aucune régression sur les étapes précédentes

---

## 🔄 Prochaine étape

Une fois cette étape validée, vous pourrez passer à:
**Étape {{NEXT_STEP_NUMBER}}: {{NEXT_STEP_NAME}}**

