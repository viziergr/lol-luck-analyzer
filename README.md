# 🎲 LoL Luck Analyzer

Une application web qui analyse vos performances League of Legends et détermine si vous êtes **chanceux** ou **malchanceux** !

## 🎮 Fonctionnalités

- ✅ Analyse détaillée des performances individuelles (score 0-100)
- 🍀 Calcul du score de chance basé sur :
  - Victoires/défaites par rapport à vos performances
  - Comparaison avec vos coéquipiers
  - Détection des "carries" et des défaites injustes
- 📊 Statistiques complètes (KDA, CS, Vision, Dégâts, etc.)
- 👥 Comparaison de plusieurs joueurs
- 🏆 Classement de chance entre amis
- 📜 Historique détaillé des matchs

## 🚀 Installation

### Prérequis

- Node.js (v14 ou supérieur)
- Une clé API Riot Games ([Obtenir une clé](https://developer.riotgames.com/))

### Étapes

1. **Cloner ou télécharger le projet**

2. **Installer les dépendances**
   ```bash
   cd lol-luck-analyzer
   npm install
   ```

3. **Configurer la clé API**
   
   Créez un fichier `.env` à la racine du projet (ou modifiez le fichier existant) :
   ```env
   RIOT_API_KEY=VOTRE_CLE_API_ICI
   REGION=euw1
   PORT=3000
   ```

   **Régions disponibles :**
   - `euw1` - Europe West
   - `eun1` - Europe Nordic & East
   - `na1` - North America
   - `kr` - Korea
   - `br1` - Brazil
   - `jp1` - Japan
   - etc.

4. **Démarrer l'application**
   ```bash
   npm start
   ```

5. **Ouvrir dans le navigateur**
   
   Accédez à `http://localhost:3000`

## 📖 Utilisation

### Analyser un joueur unique

1. Entrez le Riot ID du joueur (ex: `Faker#KR1`)
2. Choisissez le nombre de parties à analyser (5-100)
3. Cliquez sur **Analyser**

L'application va :
- Récupérer l'historique de matchs classés de la saison 2026
- Calculer le score de performance pour chaque partie
- Déterminer le score de chance global
- Afficher les statistiques détaillées

### Comparer plusieurs joueurs

1. Entrez le Riot ID d'un joueur
2. Cliquez sur **+ Ajouter un joueur à comparer**
3. Répétez pour chaque joueur (minimum 2)
4. Cliquez sur **Comparer les joueurs**

Vous obtiendrez :
- Un classement de chance (du plus malchanceux au plus chanceux)
- Les statistiques comparées de chaque joueur
- Une vue d'ensemble des performances

## 📊 Algorithme de Calcul

### Score de Performance (0-100)

Le score est calculé sur 7 métriques :

- **KDA Ratio** (20 points) - Kills + Assists / Deaths
- **Dégâts relatifs** (20 points) - % des dégâts de l'équipe
- **Participation aux kills** (15 points) - % des kills de l'équipe
- **Vision Score** (10 points) - Vision/min
- **CS/min** (15 points) - Farm
- **Gold/min** (10 points) - Or généré
- **Objectifs** (10 points) - Tours, Dragons, Barons

### Score de Chance (-100 à +100)

Le score de chance compare vos performances aux résultats :

**Score POSITIF (Chanceux) :**
- Victoires avec mauvaise performance
- Équipe qui vous porte souvent
- Victoires "faciles"

**Score NÉGATIF (Malchanceux) :**
- Bonnes performances mais défaites
- Vous devez carry seul souvent
- Défaites "injustes"

**Score NEUTRE :**
- Vos victoires correspondent à vos performances
- Équilibre entre carry et être porté

## 🛠️ Développement

### Structure du projet

```
lol-luck-analyzer/
├── server.js              # Serveur Express
├── package.json           # Dépendances
├── .env                   # Configuration (non versionné)
├── services/
│   ├── riotApi.js        # Intégration API Riot
│   └── analyzer.js       # Algorithmes de calcul
└── public/
    ├── index.html        # Page principale
    ├── css/
    │   └── style.css     # Styles
    └── js/
        └── app.js        # Logique frontend
```

### API Endpoints

- `GET /api/summoner/:gameName/:tagLine` - Infos d'un invocateur
- `GET /api/matches/:puuid?count=20` - Historique de matchs
- `POST /api/analyze` - Analyser un joueur
- `POST /api/compare` - Comparer plusieurs joueurs

## ⚠️ Limitations

- **Rate Limits Riot API** : 
  - Dev Key: 20 req/sec, 100 req/2min
  - Les données sont cachées 10 minutes
- **Saison 2026** : Seules les parties depuis le 8 janvier 2026 sont analysées
- **Ranked uniquement** : Solo/Duo queue (queue 420)

## 🔧 Dépannage

### "Riot API Error 403"
- Vérifiez que votre clé API est valide
- Assurez-vous qu'elle n'a pas expiré (les dev keys expirent après 24h)

### "Aucune partie trouvée"
- Vérifiez que le Riot ID est correct (GameName#TAG)
- Assurez-vous que le joueur a joué en ranked cette saison
- Vérifiez la région configurée dans `.env`

### "Rate limit exceeded"
- Attendez quelques minutes
- Réduisez le nombre de joueurs à comparer
- Le cache aide à éviter ce problème

## 📝 Notes

- Les clés API de développement expirent après 24h
- Pour une utilisation en production, demandez une clé de production
- L'application respecte les rate limits via un système de cache

## 🎯 Améliorations futures

- [ ] Support des parties ARAM et autres modes
- [ ] Graphiques Chart.js pour visualisation
- [ ] Export des résultats en image
- [ ] Historique des analyses
- [ ] Base de données pour stockage persistant
- [ ] Système de classement global

## 📜 Licence

MIT

## 💡 Crédits

Développé avec l'API Riot Games. Ce projet n'est pas affilié à Riot Games.

---

**Bon jeu et que la chance soit avec vous ! 🍀**
