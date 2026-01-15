# 🆕 Gold Diff & XP Diff à 15min

## Nouvelles métriques ajoutées

### 1. **Gold Diff at 15min** (7 points)

**Qu'est-ce que c'est ?**
- Différence d'or à 15 minutes entre vous et votre adversaire de lane direct

**Pourquoi c'est important ?**
- Indique si vous avez gagné ou perdu votre lane
- +1000 gold à 15min = vous dominez votre lane
- -1000 gold à 15min = vous êtes en difficulté

**Exemples :**
```
Top Laner vs Top Laner:
Vous: 5200 gold à 15min
Ennemi: 4300 gold à 15min
→ Gold Diff = +900 → ~6.3/7 points ✅

Mid Laner vs Mid Laner:
Vous: 4800 gold à 15min
Ennemi: 5700 gold à 15min
→ Gold Diff = -900 → ~-6.3 points ❌
```

### 2. **XP Diff at 15min** (5 points)

**Qu'est-ce que c'est ?**
- Différence d'expérience à 15 minutes entre vous et votre adversaire de lane

**Pourquoi c'est important ?**
- XP = level = puissance en lane
- +1500 XP = environ 1 level d'avance
- Domination claire de la lane

**Exemples :**
```
ADC vs ADC:
Vous: 9800 XP (level 10)
Ennemi: 8500 XP (level 9)
→ XP Diff = +1300 → ~4.3/5 points ✅

Support vs Support:
Vous: 7200 XP
Ennemi: 7100 XP
→ XP Diff = +100 → ~0.3 points (mais weight = 0.3 donc peu important)
```

---

## Ajustements par rôle

### Laners (Top, Mid, ADC) :
```javascript
goldDiff15: 1.3x  // 130% d'importance - TRÈS important !
xpDiff15: 1.2x    // 120% d'importance - Important
```

**Résultat :**
- Gold Diff 15 vaut **9.1 points** au lieu de 7
- XP Diff 15 vaut **6 points** au lieu de 5
- **Total possible de 15 points** si vous écrasez votre lane !

### Supports :
```javascript
goldDiff15: 0.5x  // 50% d'importance
xpDiff15: 0.3x    // 30% d'importance
```

**Pourquoi ?**
- Les supports partagent la lane (duo)
- Le gold diff n'est pas aussi pertinent qu'en solo lane
- L'XP diff encore moins (souvent sous-level)

### Junglers :
```javascript
goldDiff15: 0.4x  // 40% d'importance
xpDiff15: 0.3x    // 30% d'importance
```

**Pourquoi ?**
- Pas vraiment de "lane opponent" fixe
- Le matchup jungle vs jungle est plus complexe

---

## Source des données

**API Riot Match Timeline V5 :**
```
GET /lol/match/v5/matches/{matchId}/timeline
```

**Données utilisées :**
- `frames[15min].participantFrames[X].totalGold`
- `frames[15min].participantFrames[X].xp`

**Détection du lane opponent :**
- Même `teamPosition` (TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY)
- Team adverse

---

## Impact sur le scoring

### Exemple concret : Top Laner qui domine

**Avant (sans diff) :**
```
KDA: 5/2/4 → 14/20
Damage: 25% → 16.7/20
CS: 7.2/min → 13.5/15
Gold/min: 380 → 9.5/10
...
Total: 68/100
```

**Maintenant (avec diff) :**
```
KDA: 5/2/4 → 14/20
Damage: 25% → 16.7/20
CS: 7.2/min → 13.5/15
Gold/min: 380 → 7.6/8
Gold Diff 15: +1200 → 8.4/7 (plafonné à 7) ✅
XP Diff 15: +1400 → 5.6/5 (plafonné à 5) ✅
...
Total: 79/110 → Normalisé à ~72/100
```

**Gain :** +4 points pour avoir dominé la lane !

---

## Cache et Performance

Les timelines sont **aussi mises en cache** :
- Cache mémoire 10 min
- Cache disque 7 jours

**Impact :**
- Première analyse : ~40 requêtes API (20 matchs + 20 timelines)
- Analyses suivantes : 0 requête API ✅

---

## Fichiers modifiés

1. **`services/riotApi.js`** - Ajout de `getMatchTimeline()`
2. **`config/algorithmConfig.js`** - Ajout des métriques goldDiff15 et xpDiff15
3. **`services/analyzer.js`** - Calcul des diffs dans `calculatePerformanceScore()`
4. **`server.js`** - Récupération timeline et calcul des diffs par participant

---

## Déploiement

```bash
cd /chemin/vers/lol-luck-analyzer
# Copier les fichiers modifiés
pkill node
npm start
```

**Les diffs seront calculées automatiquement pour chaque partie ! 📊**
