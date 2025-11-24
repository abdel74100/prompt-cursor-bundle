# {{PROJECT_NAME}} - Standard Code Run

## Règles de développement

1. ✅ Chaque étape doit être complètement terminée avant de passer à la suivante
2. 🧪 Un fichier de test `step{N}_test` doit être créé pour chaque étape
3. ✅ Les tests doivent passer avant de pouvoir marquer l'étape comme terminée
4. 📝 Chaque étape a un TODO détaillé avec critères de validation
5. 🔒 Pas de saut d'étape - progression séquentielle obligatoire
6. 📋 Les détails de chaque étape sont dans `Instructions/instructions-step{N}.md`

---

## 📋 ÉTAPES DE DÉVELOPPEMENT

### ✅ ÉTAPE 1 : {{STEP_1_NAME}}

**Status:** 🟡 En cours  
**Précondition:** Aucune  
**Test requis:** `tests/step1_test.{{EXT}}`  
**Documentation:** `Instructions/instructions-step1.md`

**TODO :**
- [ ] Voir détails dans `Instructions/instructions-step1.md`

**Critères de validation :**
- Tous les TODOs de `instructions-step1.md` complétés
- Tests step1_test passent à 100%
- Build OK
- Runtime OK

---

### ⏳ ÉTAPE 2 : {{STEP_2_NAME}}

**Status:** ⚪ En attente  
**Précondition:** Étape 1 terminée + tests OK + build ok + runtime ok  
**Test requis:** `tests/step2_test.{{EXT}}`  
**Documentation:** `Instructions/instructions-step2.md`

**TODO :**
- [ ] Voir détails dans `Instructions/instructions-step2.md`

**Critères de validation :**
- Tous les TODOs de `instructions-step2.md` complétés
- Tests step2_test passent à 100%
- Build OK
- Runtime OK

---

### ⏳ ÉTAPE 3 : {{STEP_3_NAME}}

**Status:** ⚪ En attente  
**Précondition:** Étape 2 terminée + tests OK + build ok + runtime ok  
**Test requis:** `tests/step3_test.{{EXT}}`  
**Documentation:** `Instructions/instructions-step3.md`

**TODO :**
- [ ] Voir détails dans `Instructions/instructions-step3.md`

**Critères de validation :**
- Tous les TODOs de `instructions-step3.md` complétés
- Tests step3_test passent à 100%
- Build OK
- Runtime OK

---

### ⏳ ÉTAPE 4 : {{STEP_4_NAME}}

**Status:** ⚪ En attente  
**Précondition:** Étape 3 terminée + tests OK + build ok + runtime ok  
**Test requis:** `tests/step4_test.{{EXT}}`  
**Documentation:** `Instructions/instructions-step4.md`

**TODO :**
- [ ] Voir détails dans `Instructions/instructions-step4.md`

**Critères de validation :**
- Tous les TODOs de `instructions-step4.md` complétés
- Tests step4_test passent à 100%
- Build OK
- Runtime OK

---

### ⏳ ÉTAPE 5 : {{STEP_5_NAME}}

**Status:** ⚪ En attente  
**Précondition:** Étape 4 terminée + tests OK + build ok + runtime ok  
**Test requis:** `tests/step5_test.{{EXT}}`  
**Documentation:** `Instructions/instructions-step5.md`

**TODO :**
- [ ] Voir détails dans `Instructions/instructions-step5.md`

**Critères de validation :**
- Tous les TODOs de `instructions-step5.md` complétés
- Tests step5_test passent à 100%
- Build OK
- Runtime OK

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
6. Marquer étape comme "TERMINÉE ✅"
7. Passer à l'étape suivante

**⚠️ IMPORTANT:** Aucune étape ne peut être sautée ou marquée terminée sans que ses tests passent à 100%.

---

## 📝 NOTES

*Ajoutez ici des notes importantes sur le développement...*

