# 🎯 Guide de l'Algorithme de Performance & Chance

## Vue d'ensemble

L'algorithme calcule 2 scores distincts :
1. **Score de Performance** (0-100) : Qualité de jeu individuelle
2. **Score de Chance** (-100 à +100) : Corrélation performance vs résultats

---

## 📊 Score de Performance (0-100)

### Calcul global

Le score de performance évalue **7 métriques** pondérées pour un total de **100 points**.

### Métriques détaillées

#### 1. **KDA Ratio** (20 points)
```
KDA = (Kills + Assists) / Deaths
Score = min(20, (KDA / 10) × 20)
```

**Barème indicatif :**
- KDA < 2 : ⭐ Faible (< 4 pts)
- KDA 2-4 : ⭐⭐ Moyen (4-8 pts)
- KDA 4-7 : ⭐⭐⭐ Bon (8-14 pts)
- KDA 7-10 : ⭐⭐⭐⭐ Excellent (14-20 pts)
- KDA 10+ : ⭐⭐⭐⭐⭐ Parfait (20 pts max)

**Pourquoi c'est important :**
- Mesure l'efficacité en combat
- Mourir moins = jouer plus safe et efficace
- Participer aux kills = contribution à l'équipe

---

#### 2. **Dégâts Relatifs** (20 points)
```
DamageShare = Vos dégâts / Dégâts totaux équipe
Score = min(20, (DamageShare / 0.30) × 20)
```

**Barème indicatif :**
- < 15% : ⭐ Faible contribution
- 15-20% : ⭐⭐ Moyen
- 20-25% : ⭐⭐⭐ Bon
- 25-30% : ⭐⭐⭐⭐ Excellent
- 30%+ : ⭐⭐⭐⭐⭐ Carry

**Note :** Varie selon le rôle
- ADC/Mid : Attendu 25-35%
- Top : 20-30%
- Jungle : 15-25%
- Support : 10-20%

---

#### 3. **Kill Participation** (15 points)
```
KP = (Kills + Assists) / Kills totaux équipe
Score = KP × 15
```

**Barème :**
- < 40% : Absent des combats
- 40-60% : Présence moyenne
- 60-75% : Bonne présence
- 75%+ : Partout sur la map

**Importance :**
- Montre si vous êtes présent aux moments clés
- 100% = vous avez participé à TOUS les kills

---

#### 4. **Vision Score** (10 points)
```
VisionPerMin = VisionScore / (Durée en minutes)
Score = min(10, (VisionPerMin / 3) × 10)
```

**Barème :**
- < 1/min : Très faible
- 1-2/min : Acceptable (laners)
- 2-3/min : Bon (jungle/support)
- 3+/min : Excellent

**Impact :**
- Contrôle de la map
- Wards = vision = sécurité = victoire

---

#### 5. **CS/min** (15 points)
```
CSperMin = (Minions + Jungle) / Minutes
Score = min(15, (CSperMin / 8) × 15)
```

**Barème (laners) :**
- < 5 CS/min : Problème de farm
- 5-6 : En difficulté
- 6-7 : Correct
- 7-8 : Bon
- 8+ : Excellent

**Note :** Moins important pour Support (attendu ~1-2 CS/min)

---

#### 6. **Gold/min** (10 points)
```
GoldPerMin = GoldTotal / Minutes
Score = min(10, (GoldPerMin / 400) × 10)
```

**Barème :**
- < 250 : Très en retard
- 250-300 : En difficulté
- 300-350 : Normal
- 350-400 : Bon
- 400+ : Excellent

**Corrélation :** CS + Kills + Objectifs = Gold

---

#### 7. **Objectifs** (10 points)
```
ObjScore = Tours×1 + Inhibs×2 + Barons×3 + Dragons×2
Score = min(10, ObjScore × 0.5)
```

**Importance :**
- Tours = pression et contrôle
- Dragons/Barons = game changers
- Inhibs = pression ultime

---

## 🍀 Score de Chance (-100 à +100)

### Philosophie

Le score de chance compare **votre performance individuelle** vs **le résultat de la partie**.

**Principe :**
- Bonne perf + Win = Normal (neutre)
- Mauvaise perf + Loss = Normal (neutre)
- **Bonne perf + Loss = MALCHANCEUX** ❌
- **Mauvaise perf + Win = CHANCEUX** ✅

### Scénarios détaillés

#### 1. **Malchance** (score négatif)

**Scénario 1 : Bonne perf mais défaite** (-3 points)
```
Si perf >= 70 ET loss
→ Luck -= 3
```
Vous jouez bien mais perdez quand même.

**Scénario 2 : Carry solo mais défaite** (-5 points)
```
Si perf >= 70 ET loss ET (perf - avgTeam) > 15
→ Luck -= 5
```
Vous êtes le meilleur de votre team de loin mais perdez. **Très malchanceux**.

**Scénario 3 : Win avec team faible** (-1 point)
```
Si win ET avgTeam < 50
→ Luck -= 1
```
Vous gagnez mais avec une team qui joue mal = vous avez skill.

---

#### 2. **Chance** (score positif)

**Scénario 1 : Mauvaise perf mais victoire** (+3 points)
```
Si perf < 40 ET win
→ Luck += 3
```
Vous jouez mal mais gagnez quand même.

**Scénario 2 : Porté par la team** (+5 points)
```
Si perf < 40 ET win ET (perf - avgTeam) < -15
→ Luck += 5
```
Vous jouez très mal, votre team est bien meilleure, mais vous gagnez. **Très chanceux**.

**Scénario 3 : Loss avec bonne team** (+1 point)
```
Si loss ET avgTeam > 60
→ Luck += 1
```
Votre équipe joue bien mais perd quand même = malchance.

---

### Normalisation finale

```
Score final = (Score brut / Nb parties) × 10
Limité entre -100 et +100
```

**Interprétation :**
- **-100 à -30** : 😢 Très malchanceux (bonnes perfs, défaites)
- **-30 à -10** : 😐 Légèrement malchanceux
- **-10 à +10** : ⚖️ Équilibré (résultats = performances)
- **+10 à +30** : 🙂 Légèrement chanceux
- **+30 à +100** : 🍀 Très chanceux (mauvaises perfs, victoires)

---

## ⚙️ Personnalisation de l'algorithme

### Fichier de configuration

Un fichier [`config/algorithmConfig.js`](file:///c:/Users/grego/Documents/Git/lol-luck-analyzer/config/algorithmConfig.js) a été créé pour vous permettre d'ajuster tous les paramètres.

### Exemples d'ajustements

#### Valoriser plus le farm
```javascript
csPerMin: {
    weight: 20,        // Au lieu de 15
    perfect: 9         // Au lieu de 8
}
```

#### Réduire l'importance de la vision
```javascript
visionScore: {
    weight: 5,         // Au lieu de 10
    perfectPerMin: 2.5
}
```

#### Rendre les critères de chance plus stricts
```javascript
thresholds: {
    goodPerformance: 75,   // Au lieu de 70
    badPerformance: 35,    // Au lieu de 40
}
```

---

## 📈 Statistiques supplémentaires calculées

Au-delà du score de chance, l'algorithme calcule :

1. **Carried Wins** : Victoires où vous avez porté l'équipe (perf > 70, diff > +15)
2. **Carried Losses** : Défaites alors que vous portiez (perf > 70, carrying, loss)
3. **Carried by Team** : Victoires où vous étiez porté (perf < 40, diff < -15, win)
4. **Bad Performances** : Nombre total de parties avec perf < 40

Ces stats donnent du contexte au score de chance.

---

## 🎮 Exemples concrets

### Exemple 1 : Joueur "Carry"
```
20 parties:
- 15 wins, 5 losses
- Perf moyenne: 78/100
- 12 parties où il carry
- 3 défaites en portant (malchance)

Score de chance: -8 (légèrement malchanceux)
→ Il mérite ses victoires, quelques défaites injustes
```

### Exemple 2 : Joueur "Chanceux"
```
20 parties:
- 14 wins, 6 losses  
- Perf moyenne: 52/100
- Souvent porté par la team
- 8 victoires avec perf < 50

Score de chance: +35 (chanceux)
→ Winrate élevé malgré performances moyennes
```

### Exemple 3 : Joueur "Malchanceux"
```
20 parties:
- 8 wins, 12 losses
- Perf moyenne: 71/100
- 9 défaites avec bonne perf
- Souvent meilleur de sa team

Score de chance: -42 (très malchanceux)
→ Joue bien mais perd souvent, team faible
```

---

## 🔧 Limites actuelles et améliorations possibles

### Limites

1. **Pas d'ajustement par rôle** : Un support avec 3 CS/min est normal, pas un ADC
2. **Pas de prise en compte de l'ennemi** : Jouer vs Challenger ou Bronze n'est pas pareil
3. **Durée de partie** : Une partie de 20min vs 50min n'est pas évaluée différemment
4. **Contexte de la game** : Comeback ou stomp n'est pas distingué

### Améliorations possibles

1. ✅ **Ajustements par rôle** : Déjà prévu dans le config (à implémenter)
2. ⏳ **Détection du rôle** : Analyser les items/position pour détecter auto
3. ⏳ **Prise en compte du temps** : Pondérer selon durée partie
4. ⏳ **Analyse des comebacks** : Détecter si c'était un comeback ou stomp

---

## 📝 Comment modifier l'algorithme

### Option 1 : Modifier le fichier de config (recommandé)

Éditez [`config/algorithmConfig.js`](file:///c:/Users/grego/Documents/Git/lol-luck-analyzer/config/algorithmConfig.js) et ajustez les valeurs selon vos préférences.

### Option 2 : Modifier directement le code

Le code de l'algorithme est dans [`services/analyzer.js`](file:///c:/Users/grego/Documents/Git/lol-luck-analyzer/services/analyzer.js).

**Fonctions principales :**
- `calculatePerformanceScore(playerStats)` : Calcul du score 0-100
- `calculateLuckScore(matchHistory)` : Calcul de la chance

---

## 🎯 Conseils pour personnaliser

**Pour valoriser le carry solo :**
→ Augmentez les malus pour "carrying loss" et réduisez les bonus "being carried win"

**Pour être plus indulgent :**
→ Descendez les seuils de `goodPerformance` et montez `badPerformance`

**Pour les supports :**
→ Activez `roleAdjustments` et réduisez le poids du CS

**Pour les ADC :**
→ Augmentez le poids de `csPerMin` et `damageShare`

---

Testez différentes configurations et trouvez celle qui reflète le mieux la réalité selon vous ! 🚀
