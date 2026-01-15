# 💾 Système de Cache Persistant

## 🎯 Vue d'ensemble

Un système de cache à **2 niveaux** a été implémenté pour optimiser les performances et réduire les appels API :

### Architecture du cache :

```
┌─────────────────────────────────────┐
│  1. Cache Mémoire (NodeCache)      │  ← Très rapide
│     TTL: 10 minutes                 │
└─────────────────────────────────────┘
              ↓ Si absent
┌─────────────────────────────────────┐
│  2. Cache Disque (Fichiers JSON)   │  ← Persistant
│     TTL: 7 jours                    │
└─────────────────────────────────────┘
              ↓ Si absent
┌─────────────────────────────────────┐
│  3. API Riot Games                  │  ← Requête réseau
└─────────────────────────────────────┘
```

---

## 🚀 Avantages

### Avant (cache mémoire uniquement) :
- ✅ Rapide pendant 10 minutes
- ❌ Perd tout au redémarrage
- ❌ Re-télécharge les mêmes matchs après 10 min

### Maintenant (cache à 2 niveaux) :
- ✅ Ultra-rapide en mémoire (10 min)
- ✅ **Persistant sur disque (7 jours)**
- ✅ **Survit aux redémarrages du serveur**
- ✅ Économise énormément d'appels API
- ✅ Respecte mieux les rate limits

---

## 📁 Structure du cache

### Dossier de cache :
```
lol-luck-analyzer/
└── cache/
    ├── match_EUW1_6821234567.json
    ├── match_EUW1_6821234568.json
    ├── match_EUW1_6821234569.json
    └── ...
```

### Format d'un fichier cache :
```json
{
  "timestamp": 1705327800000,
  "data": {
    "metadata": { ... },
    "info": {
      "participants": [ ... ],
      "gameDuration": 1800,
      ...
    }
  }
}
```

---

## ⚙️ Configuration

### Durée de vie du cache (TTL)

Dans [`services/riotApi.js`](file:///c:/Users/grego/Documents/Git/lol-luck-analyzer/services/riotApi.js) :

```javascript
const persistentCache = new PersistentCache('./cache', 7); // 7 jours
```

**Pour changer la durée :**
```javascript
const persistentCache = new PersistentCache('./cache', 14); // 14 jours
const persistentCache = new PersistentCache('./cache', 1);  // 1 jour
const persistentCache = new PersistentCache('./cache', 30); // 30 jours
```

### Emplacement du cache

**Par défaut :** `./cache` (à la racine du projet)

**Pour changer :**
```javascript
const persistentCache = new PersistentCache('/var/cache/lol-analyzer', 7);
```

---

## 📊 Fonctionnalité de cache

### 1. Lecture automatique
Quand vous analysez un joueur :
1. ✅ Vérifie d'abord la **mémoire** (ultra-rapide)
2. ✅ Si absent, vérifie le **disque** (rapide)
3. ✅ Si absent, appelle l'**API** et sauvegarde

### 2. Cleanup automatique au démarrage
Au lancement du serveur :
```
🧹 Cache cleanup completed
```
→ Supprime automatiquement les fichiers expirés (> 7 jours)

### 3. Logs informatifs
Dans la console :
```
📦 Cache hit (disk): EUW1_6821234567
📦 Cache hit (disk): EUW1_6821234568
🌐 API call: EUW1_6821234569  ← Nouveau match
📦 Cache hit (disk): EUW1_6821234567
```

---

## 🔍 API Endpoints pour gérer le cache

### 1. Voir les statistiques du cache

**Endpoint :** `GET /api/cache/stats`

**Exemple :**
```bash
curl http://localhost:3000/api/cache/stats
```

**Réponse :**
```json
{
  "totalEntries": 245,
  "validEntries": 238,
  "expiredEntries": 7,
  "totalSizeKB": 15360,
  "totalSizeMB": "15.00"
}
```

### 2. Nettoyer le cache (supprimer les entrées expirées)

**Endpoint :** `POST /api/cache/cleanup`

**Exemple :**
```bash
curl -X POST http://localhost:3000/api/cache/cleanup
```

**Réponse :**
```json
{
  "message": "Cache cleaned",
  "stats": {
    "totalEntries": 238,
    "validEntries": 238,
    "expiredEntries": 0,
    "totalSizeKB": 14920,
    "totalSizeMB": "14.57"
  }
}
```

---

## 📈 Impact sur les performances

### Exemple concret :

**Analyser un joueur avec 20 parties :**

#### Sans cache persistant :
```
Première analyse :
- 20 appels API → ~20 secondes
- Rate limit: 20 requêtes

Deuxième analyse (après 15 min) :
- 20 appels API → ~20 secondes  ❌
- Rate limit: 20 requêtes  ❌
```

#### Avec cache persistant :
```
Première analyse :
- 20 appels API → ~20 secondes
- Sauvegarde sur disque ✅

Deuxième analyse (même après redémarrage) :
- 0 appel API → ~0.5 seconde  ✅
- Cache hit: 20/20  ✅
- Rate limit: 0 requête  ✅
```

**Gain :** 40x plus rapide + 0 requête API !

---

## 🗑️ Gestion du cache

### Voir la taille du cache
```bash
du -sh ./cache
# Résultat: 15M ./cache
```

### Nombre de fichiers
```bash
ls -1 ./cache | wc -l
# Résultat: 245
```

### Supprimer manuellement tout le cache
```bash
rm -rf ./cache/*
```

**Ou via API :**
```javascript
// Dans le code
await riotApi.persistentCache.clear();
```

---

## ⚠️ Considérations

### 1. Espace disque
- Chaque match ≈ 60-80 KB
- 1000 matchs ≈ 60-80 MB
- Pas de souci pour un VPS classique

### 2. Données potentiellement obsolètes
- Les matchs **ne changent jamais** après leur fin
- Cache de 7 jours est largement suffisant
- Peut être augmenté à 30 jours sans problème

### 3. Synchronisation multi-serveurs
- Si vous avez plusieurs instances du serveur
- Partagez le dossier `/cache` entre elles
- Ou utilisez un cache Redis pour la production

---

## 🔧 Maintenance

### Cleanup automatique quotidien (optionnel)

Ajoutez dans `server.js` :

```javascript
// Cleanup quotidien à 3h du matin
const schedule = require('node-schedule');

schedule.scheduleJob('0 3 * * *', async () => {
    console.log('🧹 Daily cache cleanup...');
    await riotApi.persistentCache.cleanup();
    const stats = await riotApi.persistentCache.getStats();
    console.log(`📊 Cache stats: ${stats.validEntries} entries, ${stats.totalSizeMB} MB`);
});
```

---

## 📊 Monitoring

### Ajouter des métriques (optionnel)

```javascript
// Compteurs de cache hits/misses
let cacheHits = 0;
let cacheMisses = 0;

// Dans getMatchDetails:
if (cachedOnDisk) {
    cacheHits++;
} else {
    cacheMisses++;
}

// Endpoint de stats
app.get('/api/metrics', (req, res) => {
    res.json({
        cacheHits,
        cacheMisses,
        hitRate: ((cacheHits / (cacheHits + cacheMisses)) * 100).toFixed(2) + '%'
    });
});
```

---

## 🎯 Cas d'utilisation typiques

### Cas 1 : Analyse répétée du même joueur
```
T+0   : Analyse → 20 API calls
T+5min: Analyse → 0 API call  (mémoire)
T+1h  : Analyse → 0 API call  (disque)
T+1j  : Analyse → 0 API call  (disque)
T+8j  : Analyse → 20 API calls (expiré)
```

### Cas 2 : Redémarrage du serveur
```
Avant redémarrage: 238 matchs en mémoire
Après redémarrage: 0 en mémoire, 238 sur disque
Première requête  : Cache hit disque → 0 API call ✅
```

### Cas 3 : Comparaison de joueurs
```
Joueur A: 20 parties
Joueur B: 20 parties (dont 5 en commun avec A)

Total API calls: 35 au lieu de 40
Les 5 parties communes sont déjà en cache!
```

---

## 📝 Fichiers modifiés

1. **[`services/persistentCache.js`](file:///c:/Users/grego/Documents/Git/lol-luck-analyzer/services/persistentCache.js)** - Nouveau service de cache
2. **[`services/riotApi.js`](file:///c:/Users/grego/Documents/Git/lol-luck-analyzer/services/riotApi.js)** - Intégration du cache persistant
3. **[`server.js`](file:///c:/Users/grego/Documents/Git/lol-luck-analyzer/server.js)** - Cleanup au démarrage + endpoints

---

## 🚀 Déploiement

### Transférer les fichiers :
```bash
cd /chemin/vers/lol-luck-analyzer
# Copier les nouveaux fichiers
```

### Créer le dossier cache :
```bash
mkdir -p cache
chmod 755 cache
```

### Redémarrer :
```bash
pkill node
npm start
```

**Le cache commence à se remplir automatiquement ! 📦**

Regardez les logs pour voir les cache hits :
```
📦 Cache hit (disk): EUW1_6821234567
```

---

## ✨ Résumé

✅ **Cache à 2 niveaux** (mémoire + disque)
✅ **Persiste 7 jours** sur le disque
✅ **Survit aux redémarrages**
✅ **0 requête API** pour les matchs déjà analysés
✅ **Cleanup automatique** des entrées expirées
✅ **API endpoints** pour monitoring

**Résultat :** Application ultra-rapide + économie massive d'appels API ! 🚀
