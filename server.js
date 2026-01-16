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

// Nettoyer le cache au démarrage (supprime les entrées expirées)
riotApi.persistentCache.cleanup().then(() => {
    console.log('🧹 Cache cleanup completed');
});

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


        // 3. Récupérer les détails de chaque match SEQUENTIEL LEMENT (rate limiting)
        console.log(`Fetching ${matchIds.length} matches...`);
        const matches = [];
        for (let i = 0; i < matchIds.length; i++) {
            const matchData = await riotApi.getMatchDetails(matchIds[i]);

            // Récupérer aussi la timeline pour gold/xp diff à 15min
            const timeline = await riotApi.getMatchTimeline(matchIds[i]);

            // Calculer gold diff et XP diff à 15min pour chaque joueur
            if (timeline && timeline.info && timeline.info.frames) {
                const frame15min = timeline.info.frames.find(f => f.timestamp >= 900000) || null; // 15min = 900000ms

                if (frame15min) {
                    // Pour chaque participant, calculer la diff avec son opponent de lane
                    matchData.info.participants.forEach(p => {
                        const participantId = p.participantId;
                        const participantFrame = frame15min.participantFrames[participantId];

                        if (participantFrame) {
                            // Trouver l'opponent de lane (même role mais team adverse)
                            const opponentTeamId = p.teamId === 100 ? 200 : 100;
                            const sameRole = matchData.info.participants.find(
                                opp => opp.teamId === opponentTeamId &&
                                    opp.teamPosition === p.teamPosition &&
                                    opp.participantId !== participantId
                            );

                            if (sameRole) {
                                const opponentFrame = frame15min.participantFrames[sameRole.participantId];
                                if (opponentFrame) {
                                    p.goldDiff15 = participantFrame.totalGold - opponentFrame.totalGold;
                                    p.xpDiff15 = participantFrame.xp - opponentFrame.xp;
                                } else {
                                    p.goldDiff15 = 0;
                                    p.xpDiff15 = 0;
                                }
                            } else {
                                p.goldDiff15 = 0;
                                p.xpDiff15 = 0;
                            }
                        } else {
                            p.goldDiff15 = 0;
                            p.xpDiff15 = 0;
                        }
                    });
                }
            }

            matches.push(matchData);

            // Log progress
            if ((i + 1) % 5 === 0 || i === matchIds.length - 1) {
                console.log(`Progress: ${i + 1}/${matchIds.length} matches fetched`);
            }
        }

        // 4. Analyser les performances
        const analysis = analyzer.analyzePlayer(
            `${summoner.gameName}#${summoner.tagLine}`,
            matches,
            summoner.puuid
        );

        // 5. Calculer les stats par champion
        const championStats = analyzer.getChampionStats(analysis.matchHistory);

        res.json({
            summoner,
            analysis,
            championStats
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

                // Récupérer les matchs séquentiellement
                const matches = [];
                for (const matchId of matchIds) {
                    const matchData = await riotApi.getMatchDetails(matchId);
                    matches.push(matchData);
                }

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

// Endpoint: Statistiques du cache
app.get('/api/cache/stats', async (req, res) => {
    try {
        const stats = await riotApi.persistentCache.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Error getting cache stats:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint: Nettoyer le cache
app.post('/api/cache/cleanup', async (req, res) => {
    try {
        await riotApi.persistentCache.cleanup();
        const stats = await riotApi.persistentCache.getStats();
        res.json({ message: 'Cache cleaned', stats });
    } catch (error) {
        console.error('Error cleaning cache:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`🎮 LoL Luck Analyzer running on http://localhost:${PORT}`);
    console.log(`📊 Ready to analyze League of Legends performances!`);
});
