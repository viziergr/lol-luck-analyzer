const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const riotApi = require('./services/riotApi');
const analyzer = require('./services/analyzer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Route principale - Servir le fichier HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Endpoint: Récupérer les infos d'un invocateur
app.get('/api/summoner/:gameName/:tagLine', async (req, res) => {
    try {
        const { gameName, tagLine } = req.params;
        const summoner = await riotApi.getSummonerByRiotId(gameName, tagLine);
        res.json(summoner);
    } catch (error) {
        console.error('Error fetching summoner:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint: Récupérer l'historique de matchs
app.get('/api/matches/:puuid', async (req, res) => {
    try {
        const { puuid } = req.params;
        const count = parseInt(req.query.count) || 20;

        // Season 1 2026 commence le 8 janvier 2026
        const season2026Start = Math.floor(new Date('2026-01-08').getTime() / 1000);

        const matchIds = await riotApi.getMatchHistory(puuid, count, season2026Start);
        res.json({ matchIds, count: matchIds.length });
    } catch (error) {
        console.error('Error fetching match history:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint: Analyser un joueur complet
app.post('/api/analyze', async (req, res) => {
    try {
        const { gameName, tagLine, matchCount } = req.body;

        if (!gameName || !tagLine) {
            return res.status(400).json({ error: 'gameName et tagLine sont requis' });
        }

        console.log(`Analyzing player: ${gameName}#${tagLine}`);

        // 1. Récupérer les infos du joueur
        const summoner = await riotApi.getSummonerByRiotId(gameName, tagLine);

        // 2. Récupérer l'historique
        const season2026Start = Math.floor(new Date('2026-01-08').getTime() / 1000);
        const matchIds = await riotApi.getMatchHistory(summoner.puuid, matchCount || 20, season2026Start);

        if (matchIds.length === 0) {
            return res.json({
                error: 'Aucune partie classée trouvée pour la saison 2026',
                summoner
            });
        }

        // 3. Récupérer les détails de chaque match
        console.log(`Fetching ${matchIds.length} matches...`);
        const matchesPromises = matchIds.map(id => riotApi.getMatchDetails(id));
        const matches = await Promise.all(matchesPromises);

        // 4. Analyser les performances
        const analysis = analyzer.analyzePlayer(
            `${summoner.gameName}#${summoner.tagLine}`,
            matches,
            summoner.puuid
        );

        res.json({
            summoner,
            analysis
        });

    } catch (error) {
        console.error('Error analyzing player:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint: Comparer plusieurs joueurs
app.post('/api/compare', async (req, res) => {
    try {
        const { players, matchCount } = req.body;

        if (!players || !Array.isArray(players) || players.length === 0) {
            return res.status(400).json({ error: 'Liste de joueurs requise (array)' });
        }

        console.log(`Comparing ${players.length} players...`);

        const results = [];

        for (const player of players) {
            try {
                const { gameName, tagLine } = player;

                // Récupérer et analyser chaque joueur
                const summoner = await riotApi.getSummonerByRiotId(gameName, tagLine);
                const season2026Start = Math.floor(new Date('2026-01-08').getTime() / 1000);
                const matchIds = await riotApi.getMatchHistory(summoner.puuid, matchCount || 20, season2026Start);

                if (matchIds.length === 0) {
                    results.push({
                        summoner,
                        error: 'Aucune partie trouvée'
                    });
                    continue;
                }

                const matchesPromises = matchIds.map(id => riotApi.getMatchDetails(id));
                const matches = await Promise.all(matchesPromises);

                const analysis = analyzer.analyzePlayer(
                    `${summoner.gameName}#${summoner.tagLine}`,
                    matches,
                    summoner.puuid
                );

                results.push({
                    summoner,
                    analysis
                });
            } catch (error) {
                console.error(`Error analyzing ${player.gameName}:`, error.message);
                results.push({
                    player,
                    error: error.message
                });
            }
        }

        // Générer le classement
        const validResults = results.filter(r => r.analysis && !r.error);
        const leaderboard = analyzer.generateLeaderboard(
            validResults.map(r => ({
                ...r.analysis,
                summoner: r.summoner
            }))
        );

        res.json({
            results,
            leaderboard
        });

    } catch (error) {
        console.error('Error comparing players:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`🎮 LoL Luck Analyzer running on http://localhost:${PORT}`);
    console.log(`📊 Ready to analyze League of Legends performances!`);
});
