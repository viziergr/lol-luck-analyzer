# ⚖️ Normalisation Min-Max - Mise à jour

## 🎯 Nouveau système : Normalisation complète (Min-Max)

Le système a été amélioré pour une normalisation **bidirectionnelle** :

### Principe :
- **Meilleur joueur** de la partie = **100/100**
- **Pire joueur** de la partie = **0/100**
- **Tous les autres** sont **proportionnellement répartis** entre 0 et 100

---

## 📊 Comment ça marche ?

### Formule Min-Max :
```
Score normalisé = ((Score brut - Score min) / (Score max - Score min)) × 100
```

### Exemple concret :

**Partie avec scores variés :**
```
Scores bruts:
- Carry: 85/100 ← Meilleur
- Joueur2: 68/100
- Joueur3: 52/100
- Joueur4: 40/100
- Feeder: 18/100 ← Pire

Normalisation Min-Max:
Min = 18, Max = 85
Range = 85 - 18 = 67

- Carry: ((85-18)/67) × 100 = 100/100 ✅
- Joueur2: ((68-18)/67) × 100 = 75/100
- Joueur3: ((52-18)/67) × 100 = 51/100
- Joueur4: ((40-18)/67) × 100 = 33/100
- Feeder: ((18-18)/67) × 100 = 0/100 ✅
```

---

## 🆚 Comparaison avec l'ancien système

### Ancien système (normalisation max uniquement) :
```
Scores bruts: Max = 85

- Carry: (85/85) × 100 = 100/100
- Joueur2: (68/85) × 100 = 80/100
- Feeder: (18/85) × 100 = 21/100 ← Pas 0
```

❌ Le pire joueur avait encore 21/100

### Nouveau système (Min-Max) :
```
Min = 18, Max = 85

- Carry: 100/100
- Joueur2: 75/100 ← Plus bas qu'avant
- Feeder: 0/100 ← VRAIMENT nul
```

✅ Le pire joueur a maintenant 0/100
✅ L'écart entre joueurs est mieux visible

---

## 📈 Avantages

### 1. **Écart plus visible**
Avant, difficile de distinguer un joueur moyen (60/100 brut) d'un feeder (25/100 brut).
Maintenant, l'écart est claire : 60 vs 10 après normalisation.

### 2. **Score de chance plus précis**
- **100/100** = Vous étiez objectivement le **meilleur** de la partie
- **0/100** = Vous étiez objectivement le **pire** de la partie
- **50/100** = Vous étiez dans la moyenne

### 3. **Détection du carry**
Si vous avez 100/100 régulièrement, vous carry vraiment vos games.

### 4. **Détection du feed**
Si vous avez des 0/100, vous êtes le maillon faible.

---

## 🎮 Exemples d'utilisation

### Exemple 1 : Partie équilibrée
```
10 joueurs, tous entre 60-75 brut

Après normalisation:
- Meilleur (75): 100/100
- Moyenne (67): 50/100
- Pire (60): 0/100
```

→ Même en partie équilibrée, on voit qui était le meilleur/pire

### Exemple 2 : Un carry + 9 nuls
```
Scores bruts:
- Carry: 92/100
- 9 autres: entre 25-35/100

Après normalisation:
- Carry: 100/100
- Autres: entre 0-15/100
```

→ Le carry se démarque VRAIMENT

### Exemple 3 : Deux teams équilibrées
```
Team 1: 70, 68, 65, 62, 60
Team 2: 69, 67, 64, 61, 58

Après normalisation:
- Meilleur (70): 100/100
- Milieu (64): 50/100
- Pire (58): 0/100
```

→ Distribution équitable sur toute l'échelle

---

## 🍀 Impact sur le score de chance

### Avant (normalisation max uniquement) :
- Seuil "bonne perf": >= 70/100
- Difficile d'atteindre 70 si le meilleur était à 80 brut

### Maintenant (Min-Max) :
- **70/100** = Vous étiez dans les **30% meilleurs** de la partie
- **30/100** = Vous étiez dans les **30% pires** de la partie
- Plus facile d'interpréter le rang relatif

### Scénarios de chance mis à jour :

**Très malchanceux :**
- **100/100** (meilleur de la partie) + **Loss**
- Vous étiez le carry mais avez perdu

**Très chanceux :**
- **0-20/100** (pire de la partie) + **Win**
- Vous étiez le feeder mais avez gagné

**Neutre :**
- **50/100** + résultat cohérent avec la team

---

## ⚙️ Configuration

Dans [`config/algorithmConfig.js`](file:///c:/Users/grego/Documents/Git/lol-luck-analyzer/config/algorithmConfig.js) :

```javascript
normalization: {
    enabled: true,  // true = Min-Max, false = scores bruts
    description: 'Normalisation Min-Max : Meilleur = 100, Pire = 0'
}
```

**Pour désactiver complètement :**
```javascript
enabled: false
```

---

## 📊 Cas particuliers gérés

### Cas 1 : Tous les joueurs ont le même score
```
10 joueurs à 60/100 brut (partie très équilibrée ou bug)

→ Tous mis à 50/100
```

### Cas 2 : Scores négatifs ou nuls
```
Tous < 0

→ Tous mis à 50/100
```

---

## 🔍 Interprétation des scores

| Score | Signification | Exemple |
|-------|--------------|---------|
| **90-100** | Top performer | Carry de la partie |
| **70-89** | Très bonne perf | Contributeur majeur |
| **50-69** | Performance correcte | Milieu de tableau |
| **30-49** | Perf faible | En difficulté |
| **10-29** | Très mauvaise perf | Feedeur |
| **0-9** | Catastrophique | Le pire de la partie |

---

## 📈 Statistiques affectées

### Moyennes globales plus équilibrées
Avec Min-Max, votre moyenne sur 20 parties sera proche de 50/100 si vous êtes toujours au milieu du classement.

**Avant :** Moyenne souvent ~60-65
**Maintenant :** Moyenne ~45-55 si vous êtes moyen

### Score de chance plus sensible
Avec une échelle 0-100 complète, les écarts de performance ont plus d'impact.

---

## 🚀 Mise en production

Fichiers modifiés :
```
config/algorithmConfig.js    # Description mise à jour
services/analyzer.js          # Fonction normalizePerformanceScores
```

Transférez et redémarrez :
```bash
cd /chemin/vers/lol-luck-analyzer
# Copier les fichiers modifiés
pkill node
npm start
```

---

## ✨ Résumé

**Avant :** Meilleur = 100, Pire = ~20-30
**Maintenant :** Meilleur = 100, Pire = 0

✅ Écart plus visible
✅ Score de chance plus précis
✅ Détection claire du carry et du feeder
✅ Utilisation complète de l'échelle 0-100

**C'est plus juste et plus lisible ! 🎯**
