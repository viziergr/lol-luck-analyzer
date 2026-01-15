# ⚖️ Normalisation Relative des Scores

## 🎯 Nouveau système implémenté

Le scoring a été modifié pour utiliser une **normalisation relative par partie** :

### Avant (Scoring Absolu) :
```
Partie 1:
- Joueur A: 85/100 (KDA 8, bon farm, bons dégâts)
- Joueur B: 72/100 (KDA 5, farm correct)
- Joueur C: 45/100 (KDA 2, feed)
```

**Problème** : Dans une partie très équilibrée, personne n'atteint 100.

---

### Maintenant (Scoring Relatif) :
```
Partie 1 (scores bruts):
- Joueur A: 85/100 ← Meilleur de la partie
- Joueur B: 72/100
- Joueur C: 45/100

Après normalisation:
- Joueur A: 100/100 ← Normalisé au max
- Joueur B: (72/85) × 100 = 85/100
- Joueur C: (45/85) × 100 = 53/100
```

**Avantage** : Le meilleur joueur de **chaque partie** obtient toujours 100/100, les autres sont relatifs à lui.

---

## 🔍 Comment ça marche ?

### Algorithme de normalisation :

1. **Calculer les scores bruts** de tous les 10 joueurs de la partie (selon les 7 métriques)
2. **Trouver le score maximum** de la partie
3. **Normaliser tous les scores** : `(score_brut / score_max) × 100`

### Exemple concret :

**Partie très serrée :**
```
Scores bruts:
- Joueur1: 78/100 (meilleur)
- Joueur2: 75/100
- Joueur3: 71/100
- ...

Après normalisation:
- Joueur1: 100/100 ← Il était le meilleur
- Joueur2: 96/100
- Joueur3: 91/100
```

**Partie avec un carry dominant :**
```
Scores bruts:
- Carry: 92/100 (monstre)
- Joueur2: 58/100
- Feeder: 22/100

Après normalisation:
- Carry: 100/100 ← Normalisé
- Joueur2: 63/100
- Feeder: 24/100
```

---

## 📊 Impact sur l'algorithme de chance

### Avant :
- Bonne perf =Score >= 70
- Mauvaise perf = Score < 40

Avec une normalisation absolue, difficile d'atteindre 70+ régulièrement.

### Maintenant :
Les seuils restent les mêmes (70 pour bonne perf), mais ils sont basés sur les **scores normalisés**.

**Résultat** : Plus facile d'être considéré comme "bon" si vous étiez le meilleur de votre partie, même si objectivement vous n'étiez pas parfait.

---

## ⚙️ Configuration

Dans [`config/algorithmConfig.js`](file:///c:/Users/grego/Documents/Git/lol-luck-analyzer/config/algorithmConfig.js) :

```javascript
normalization: {
    // Activer/désactiver la normalisation relative
    enabled: true,        // true = relatif, false = absolu
    
    // Score minimum après normalisation
    minScore: 0,
    
    description: 'Normalisation relative : le meilleur de la partie = 100'
}
```

**Pour revenir au scoring absolu :**
```javascript
enabled: false
```

---

## 🎮 Exemples d'utilisation

### Cas 1 : Déterminer qui a carry
Avec la normalisation, si vous avez **100/100** dans une partie, vous étiez **objectivement le meilleur joueur** de cette game.

### Cas 2 : Hard stuck Bronze mais bon relativement
Même en Bronze, si vous jouez mieux que les 9 autres joueurs systématiquement, vous aurez des scores élevés.

### Cas 3 : Carry perdu
Si vous avez **100/100** mais **loss**, votre chance descend fortement (vous étiez le meilleur mais avez perdu = malchance).

---

## 📈 Changements dans les statistiques

### Performance moyenne
- **Avant** : Rarement au-dessus de 75/100
- **Maintenant** : Si vous êtes souvent le meilleur, vous aurez des moyennes > 80

### Score de chance
Devient plus pertinent car :
- **100/100 + Loss** = Très malchanceux (vous étiez le meilleur)
- **50/100 + Win** = Chanceux (vous étiez moyen mais win quand même)

---

## ⚠️ Limitations

### 1. Pas de comparaison inter-parties
Vous ne pouvez plus comparer directement 2 performances de parties différentes :
- 100/100 partie 1 ≠ 100/100 partie 2

### 2. Stomp games
Dans une partie où votre équipe domine complètement (20-3), le "meilleur" peut avoir seulement 60/100 en brut mais sera normalisé à 100.

### 3. Scores moyens gonflés
Les moyennes globales seront plus élevées qu'avant.

---

## 💡 Recommandations

### Si vous jouez principalement en solo :
✅ **Activer la normalisation** (`enabled: true`)
→ Montre si vous êtes le meilleur de vos parties

### Si vous jouez en stack avec des amis de niveaux variés :
⚠️ **Peut-être désactiver** (`enabled: false`)
→ Scoring absolu plus représentatif du niveau réel

### Pour l'analyse de chance :
✅ **Activer** 
→ Détecte mieux les "carry solo" vs "porté par la team"

---

## 🔄 Migration

Les scores précédemment calculés étaient en mode absolu. Après l'update :
- Relancez une analyse pour recalculer avec le nouveau système
- Les scores seront différents (généralement plus élevés)

---

## 🚀 Mise en production

Transférez les fichiers modifiés sur votre VPS :
```bash
# Fichiers modifiés :
config/algorithmConfig.js   # Ajout de normalization
services/analyzer.js         # Logique de normalisation
```

Redémarrez le serveur :
```bash
pkill node
npm start
```

**Testez !** Cherchez un joueur et comparez les nouveaux scores. Le meilleur de chaque partie devrait avoir 100/100 ! 🎯
