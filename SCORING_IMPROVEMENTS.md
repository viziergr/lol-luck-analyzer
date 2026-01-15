# 🎯 Améliorations du Système de Scoring

## Changements majeurs

### 1. ✅ Normalisation Percentile (plusieurs 100/100 possibles)

**Avant (Min-Max) :**
- 1 seul joueur à 100/100 (le meilleur)
- 1 seul joueur à 0/100 (le pire)

**Maintenant (Percentile) :**
- **Plusieurs joueurs peuvent avoir 100/100** s'ils sont exceptionnels
- Basé sur la moyenne et l'écart-type de la partie
- Plus juste : récompense les vraies bonnes performances

#### Comment ça marche :
```
Score Z = (Score brut - Moyenne) / Écart-type

Si Z > +1.5σ  → 100/100  ✅ Exceptionnel
Si Z > +1.0σ  → 80-100   ⭐ Excellent
Si Z ≈ 0      → 50       ➡️ Moyen
Si Z < -1.0σ  → 0-20     ❌ Mauvais
Si Z < -1.5σ  → 0/100    💀 Catastrophique
```

#### Exemple concret :
```
Partie avec 2 carries dominants:

Carry 1: 12/2/8, 8 CS/min, 30k damage → Score brut: 88
Carry 2: 10/3/10, 7.5 CS/min, 28k damage → Score brut: 85
Joueur 3: 6/5/12, 6 CS/min, 20k damage → Score brut: 65
...

Moyenne = 67, Écart-type = 15

Carry 1: Z = (88-67)/15 = 1.4 → 98/100
Carry 2: Z = (85-67)/15 = 1.2 → 94/100
Joueur 3: Z = (65-67)/15 = -0.13 → 47/100
```

**Résultat : Les 2 carries sont reconnus comme excellents !**

---

### 2. ✅ Détection automatique des rôles + Ajustements

**Rôles détectés :**
- **SUPPORT** : CS/min < 2.5 ET Vision/min > 2.0
- **JUNGLE** : Neutral CS > 40% du total
- **LANER** : Tous les autres (Top, Mid, ADC)

**Ajustements pour SUPPORT :**
```javascript
{
    csPerMin: 0.2,        // 20% d'importance (au lieu de 100%)
    goldPerMin: 0.6,      // 60% d'importance
    damageShare: 0.7,     // 70% d'importance
    visionScore: 1.8,     // 180% d'importance ⬆️
    killParticipation: 1.3, // 130% d'importance ⬆️
    objectives: 1.2       // 120% d'importance
}
```

**Exemple :**
```
Support Thresh:
- 1.5 CS/min (très faible, mais normal pour support)
- 4.2 Vision/min (excellent !)
- 15% damage share (faible, mais normal)

AVANT: Score = 42/100 ❌ (pénalisé par CS et damage)
MAINTENANT: Score = 78/100 ✅ (vision et présence valorisées)
```

**Ajustements pour JUNGLE :**
```javascript
{
    csPerMin: 0.6,        // Farm moins important
    visionScore: 1.4,     // Vision importante ⬆️
    objectives: 1.6,      // Objectifs TRÈS importants ⬆️
    killParticipation: 1.2
}
```

**Ajustements pour LANER :**
```javascript
{
    // Tous les poids restent à 1.0 (normal)
}
```

---

## Configuration

Dans [`config/algorithmConfig.js`](file:///c:/Users/grego/Documents/Git/lol-luck-analyzer/config/algorithmConfig.js) :

```javascript
normalization: {
    enabled: true,
    type: 'percentile',  // ou 'minmax' pour l'ancien système
}

roleAdjustments: {
    enabled: true,  // Détection et ajustements activés
}
```

**Pour revenir à l'ancien système :**
```javascript
normalization: {
    type: 'minmax'  // Un seul 100/100
}

roleAdjustments: {
    enabled: false  // Pas d'ajustement par rôle
}
```

---

## Résumé des bénéfices

### Normalisation Percentile :
✅ Plusieurs joueurs exceptionnels reconnus
✅ Plus juste lors de stomp games
✅ Basé sur la distribution statistique réelle

### Détection de rôle :
✅ Supports correctement évalués
✅ Junglers récompensés pour objectifs
✅ Laners gardent le scoring normal

---

## Fichiers modifiés

1. **[`config/algorithmConfig.js`](file:///c:/Users/grego/Documents/Git/lol-luck-analyzer/config/algorithmConfig.js)** - Config normalization + role adjustments
2. **[`services/analyzer.js`](file:///c:/Users/grego/Documents/Git/lol-luck-analyzer/services/analyzer.js)** - Fonction normalize + detectRole + multipliers

---

## Déploiement

Transférez et redémarrez :
```bash
cd /chemin/vers/lol-luck-analyzer
# Copier les fichiers
pkill node
npm start
```

**Testez avec un support pour voir la différence !** 🎯
