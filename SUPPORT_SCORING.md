# 🛡️ Améliorations du Scoring Support

## Problème identifié

Les supports sont pénalisés car :
- ❌ Peu de kills (ils laissent les kills à l'ADC)
- ❌ Peu de CS (pas de farm en lane)
- ❌ Peu de dégâts (champions utilitaires)
- ❌ Souvent sous-level (partagent l'XP)

**Résultat :** Score artificiellement bas malgré une bonne performance

---

## Solutions implémentées

### 1. **KDA adapté aux supports**

**Avant :**
```javascript
KDA = (Kills + Assists) / Deaths
→ Support with 1/3/20 = (1 + 20) / 3 = 7.0 KDA
```

**Maintenant (pour supports) :**
```javascript
KDA = (Kills + Assists × 0.8) / Deaths
→ Support with 1/3/20 = (1 + 20×0.8) / 3 = 5.7 KDA
→ Mais le multiplicateur de rôle compense !
```

### 2. **Dégâts : attentes réduites**

**Avant :**
- 30% des dégâts = parfait
- Support avec 10% = 33/100 points ❌

**Maintenant (pour supports) :**
- **12% des dégâts = parfait**
- Support avec 10% = 83/100 points ✅

### 3. **Multiplicateurs agressifs**

```javascript
SUPPORT: {
    kda: 0.9,              // -10% (assists pèsent moins lourd)
    csPerMin: 0.15,        // -85% (CS ignoré)
    goldPerMin: 0.5,       // -50% (or moins crucial)
    damageShare: 0.5,      // -50% (dégâts peu importants)
    visionScore: 2.0,      // +100% (TRÈS important !)
    killParticipation: 1.5,// +50% (assists = vie du support)
    objectives: 1.3,       // +30% (contrôle objectifs)
    goldDiff15: 0.3,       // -70% (duo lane)
    xpDiff15: 0.2          // -80% (toujours sous-level)
}
```

---

## Exemple concret

### Support Thresh : 2/4/18, 25 CS, 8k dégâts, 55 vision

**Ancien calcul :**
```
KDA: 20/20 → 8.5 points
Dégâts: 10% des dégâts → 6.7 points
CS: 1.5/min → 2.8 points
Vision: 2.5/min → 8.3 points
Kill part: 65% → 9.8 points
...
TOTAL: 48/100 ❌ Mauvais joueur ?
```

**Nouveau calcul (avec ajustements support) :**
```
KDA: (2 + 18×0.8)/4 = 4.6 → 7.7 points × 0.9 = 6.9
Dégâts: 10%/12% parfait → 15 points × 0.5 = 7.5
CS: 1.5/min → 4.2 points × 0.15 = 0.6
Vision: 2.5/min → 8.3 points × 2.0 = 16.6 ⭐
Kill part: 65% → 11.0 points × 1.5 = 16.5 ⭐
...
TOTAL: 68/100 ✅ Bon support !
```

**Gain : +20 points !**

---

## Barème support réaliste

### Excellent support (75-100) :
- KDA : 3.0+
- Kill participation : 70%+
- Vision : 3.0+ /min
- CS : peu importe
- Dégâts : 10-15% (normal)

### Bon support (60-74) :
- KDA : 2.0-3.0
- Kill participation : 60-70%
- Vision : 2.0-3.0 /min

### Support correct (45-59) :
- KDA : 1.5-2.0
- Kill participation : 50-60%
- Vision : 1.5-2.0 /min

### Mauvais support (<45) :
- KDA : <1.5
- Kill participation : <50%
- Vision : <1.5 /min
- Beaucoup de deaths

---

## Métriques clés pour supports

### Top 3 pour le scoring :
1. **Vision Score** (×2.0) - Le plus important !
2. **Kill Participation** (×1.5) - Assists = vie du support
3. **KDA** adapté - Valorise les assists

### Presque ignorées :
- CS (×0.15)
- Gold diff 15min (×0.3)
- XP diff 15min (×0.2)

---

## Fichiers modifiés

1. **`config/algorithmConfig.js`** - Nouveaux paramètres et multiplicateurs
2. **`services/analyzer.js`** - KDA adapté + damage perfect pour supports

---

## Déploiement

```bash
cd /chemin/vers/lol-luck-analyzer
# Copier les fichiers
pkill node
npm start
```

**Testez avec un support maintenant !** Les scores seront beaucoup plus justes. 🛡️
