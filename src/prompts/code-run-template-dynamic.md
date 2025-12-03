# {{PROJECT_NAME}} - Code Run

{{#COMPLEX_MODE}}
{{MILESTONES_SECTION}}

{{MODULES_SECTION}}

{{DEPENDENCY_GRAPH}}
{{/COMPLEX_MODE}}

## Règles de développement

1. ✅ Chaque étape doit être complètement terminée avant de passer à la suivante
2. 🧪 Un fichier de test `step{N}_test` doit être créé pour chaque étape
3. ✅ Les tests doivent passer avant de pouvoir marquer l'étape comme terminée
4. 📝 Chaque étape a un TODO détaillé avec critères de validation
5. 🔒 Pas de saut d'étape - progression séquentielle obligatoire
6. 📋 Les détails de chaque étape sont dans `Instructions/instructions-step{N}.md`

---

## 📋 ÉTAPES DE DÉVELOPPEMENT

{{STEPS_CONTENT}}

---

## 📊 STATISTIQUES

- **Étapes totales:** {{TOTAL_STEPS}}
- **Étapes terminées:** {{COMPLETED_STEPS}}
- **Étape courante:** {{CURRENT_STEP}}
- **Progression:** {{PROGRESS_PERCENTAGE}}%

---

## 🔄 WORKFLOW

1. Marquer étape courante comme "EN COURS 🟡"
2. Consulter `Instructions/instructions-step{N}.md` pour les détails
3. Compléter tous les TODOs de l'étape
4. Créer/exécuter les tests step{N}_test
5. Valider tous les critères (tests, build, runtime)
6. Marquer étape comme "TERMINÉE ✅" avec `prompt-cursor complete`
7. Passer à l'étape suivante

**⚠️ IMPORTANT:** Aucune étape ne peut être sautée ou marquée terminée sans que ses tests passent à 100%.

---

## 📝 NOTES

*Ajoutez ici des notes importantes sur le développement...*

