// Importer la configuration de l'algorithme
// Vous pouvez modifier les paramètres dans config/algorithmConfig.js
const config = require('../config/algorithmConfig');

/**
 * Normalise les scores de performance d'une partie (Min-Max)
 * Le MEILLEUR joueur obtient 100/100
 * Le PIRE joueur obtient 0/100
 * Les autres sont proportionnellement répartis entre 0 et 100
 * @param {Array} playersWithScores - [{participant, rawScore}, ...]
 * @returns {Array} - Scores normalisés
 */
function normalizePerformanceScores(playersWithScores) {
    if (!config.normalization.enabled) {
        // Retourner les scores bruts si normalisation désactivée
        return playersWithScores.map(p => p.rawScore);
    }

    // Trouver le score maximum et minimum de la partie
    const scores = playersWithScores.map(p => p.rawScore);
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    // Si tous les scores sont identiques ou si max <= 0
    if (maxScore === minScore || maxScore <= 0) {
        // Tout le monde a le même score, on retourne 50 pour tous
        return playersWithScores.map(() => 50);
    }

    // Normalisation Min-Max : (score - min) / (max - min) × 100
    return playersWithScores.map(p => {
        const normalizedScore = ((p.rawScore - minScore) / (maxScore - minScore)) * 100;
        return Math.round(normalizedScore);
    });
}

/**
 * Calcule le score de performance d'un joueur sur une partie (0-100)
 * Basé sur plusieurs métriques clés configurables
 */
function calculatePerformanceScore(playerStats) {
    let score = 0;
    const perfConfig = config.performance;

    // 1. KDA Ratio
    const kills = playerStats.kills || 0;
    const deaths = playerStats.deaths || 1; // Éviter division par 0
    const assists = playerStats.assists || 0;
    const kda = (kills + assists) / deaths;

    const kdaScore = Math.min(
        perfConfig.kda.weight,
        (kda / perfConfig.kda.perfect) * perfConfig.kda.weight
    );
    score += kdaScore;

    // 2. Dégâts infligés relatifs
    const damageDealt = playerStats.totalDamageDealtToChampions || 0;
    const teamDamage = playerStats.teamTotalDamage || 1;
    const damagePercent = damageDealt / teamDamage;

    const damageScore = Math.min(
        perfConfig.damageShare.weight,
        (damagePercent / perfConfig.damageShare.perfect) * perfConfig.damageShare.weight
    );
    score += damageScore;

    // 3. Participation aux kills
    const killParticipation = playerStats.challenges?.killParticipation || 0;
    const participationScore = killParticipation * perfConfig.killParticipation.weight;
    score += participationScore;

    // 4. Vision Score
    const visionScore = playerStats.visionScore || 0;
    const gameDuration = playerStats.gameDuration || 1800; // 30 min par défaut
    const visionPerMin = (visionScore / gameDuration) * 60;

    const visionPoints = Math.min(
        perfConfig.visionScore.weight,
        (visionPerMin / perfConfig.visionScore.perfectPerMin) * perfConfig.visionScore.weight
    );
    score += visionPoints;

    // 5. CS/min
    const cs = (playerStats.totalMinionsKilled || 0) + (playerStats.neutralMinionsKilled || 0);
    const csPerMin = (cs / gameDuration) * 60;

    const csScore = Math.min(
        perfConfig.csPerMin.weight,
        (csPerMin / perfConfig.csPerMin.perfect) * perfConfig.csPerMin.weight
    );
    score += csScore;

    // 6. Gold/min
    const gold = playerStats.goldEarned || 0;
    const goldPerMin = (gold / gameDuration) * 60;

    const goldScore = Math.min(
        perfConfig.goldPerMin.weight,
        (goldPerMin / perfConfig.goldPerMin.perfect) * perfConfig.goldPerMin.weight
    );
    score += goldScore;

    // 7. Objectifs
    const turretKills = playerStats.turretKills || 0;
    const inhibitorKills = playerStats.inhibitorKills || 0;
    const baronKills = playerStats.challenges?.baronKills || 0;
    const dragonKills = playerStats.challenges?.dragonKills || 0;

    const objConfig = perfConfig.objectives;
    const objectivesScore = Math.min(
        objConfig.weight,
        (turretKills * objConfig.turretValue +
            inhibitorKills * objConfig.inhibitorValue +
            baronKills * objConfig.baronValue +
            dragonKills * objConfig.dragonValue) * objConfig.multiplier
    );
    score += objectivesScore;

    return Math.round(score);
}

/**
 * Calcule le score de "chance" d'un joueur basé sur son historique
 * Score positif = chanceux, score négatif = malchanceux
 */
function calculateLuckScore(matchHistory) {
    let luckScore = 0;
    let carriedWins = 0;      // Victoires où il a porté
    let carriedLosses = 0;    // Défaites où il a porté
    let carriedWins3 = 0;     // Victoires où il était faible
    let badPerformances = 0;  // Mauvaises performances totales

    const luckConfig = config.luck;
    const thresholds = luckConfig.thresholds;
    const scenarios = luckConfig.scenarios;

    matchHistory.forEach(match => {
        const playerPerf = match.playerPerformance;
        const teammates = match.teammates || [];

        // Calculer la moyenne de l'équipe (sans le joueur)
        const teammatesPerf = teammates.map(t => t.performance);
        const avgTeamPerf = teammatesPerf.length > 0
            ? teammatesPerf.reduce((a, b) => a + b, 0) / teammatesPerf.length
            : 50;

        const performanceDiff = playerPerf - avgTeamPerf;
        const won = match.won;

        // Classification des performances
        const isGoodPerf = playerPerf >= thresholds.goodPerformance;
        const isBadPerf = playerPerf < thresholds.badPerformance;
        const isCarrying = performanceDiff > thresholds.carrying;
        const isBeingCarried = performanceDiff < thresholds.beingCarried;

        if (isBadPerf) badPerformances++;

        // Cas 1: Bonne perf + Défaite = Malchanceux
        if (isGoodPerf && !won) {
            luckScore += scenarios.goodPerfLoss;
            if (isCarrying) {
                carriedLosses++;
                luckScore += scenarios.carryingLoss;
            }
        }

        // Cas 2: Mauvaise perf + Victoire = Chanceux
        if (isBadPerf && won) {
            luckScore += scenarios.badPerfWin;
            if (isBeingCarried) {
                carriedWins3++;
                luckScore += scenarios.beingCarriedWin;
            }
        }

        // Cas 3: Bonne perf + Victoire + Carrying = Mérité (neutre mais compté)
        if (isGoodPerf && won && isCarrying) {
            carriedWins++;
        }

        // Cas 4: Performance moyenne = Ajustement selon teammates
        if (playerPerf >= thresholds.badPerformance && playerPerf < thresholds.goodPerformance) {
            if (won && avgTeamPerf < 50) {
                luckScore += scenarios.winWithWeakTeam;
            } else if (!won && avgTeamPerf > 60) {
                luckScore += scenarios.loseWithStrongTeam;
            }
        }
    });

    // Normalisation du score de chance sur une échelle -100 à +100
    const totalGames = matchHistory.length || 1;
    const normalizedLuck = Math.max(
        -100,
        Math.min(100, (luckScore / totalGames) * luckConfig.normalizationFactor)
    );

    return {
        luckScore: Math.round(normalizedLuck),
        stats: {
            totalGames,
            carriedWins,        // Victoires portées
            carriedLosses,      // Défaites alors qu'on portait
            carriedByTeam: carriedWins3, // Victoires portées par la team
            badPerformances
        }
    };
}

/**
 * Génère un classement de joueurs par score de chance
 */
function generateLeaderboard(players) {
    // Trier par score de chance (du plus malchanceux au plus chanceux)
    const sorted = [...players].sort((a, b) => a.luckScore - b.luckScore);

    return {
        unluckiest: sorted.slice(0, 3),
        luckiest: sorted.slice(-3).reverse(),
        all: sorted
    };
}

/**
 * Analyse complète d'un joueur
 */
function analyzePlayer(playerName, matches, puuid) {
    const matchHistory = [];
    let totalPerformance = 0;
    let wins = 0;
    let losses = 0;

    matches.forEach(matchData => {
        const participant = matchData.info.participants.find(p => p.puuid === puuid);
        if (!participant) return;

        // Calculer le dégât total de l'équipe pour les dégâts relatifs
        const teamId = participant.teamId;
        const teamParticipants = matchData.info.participants.filter(p => p.teamId === teamId);
        const teamTotalDamage = teamParticipants.reduce((sum, p) => sum + (p.totalDamageDealtToChampions || 0), 0);

        // ===== ÉTAPE 1: Calculer les scores BRUTS de TOUS les joueurs de la partie =====
        const allPlayersWithScores = matchData.info.participants.map(p => {
            // Recalculer le dégât total de l'équipe de ce joueur
            const pTeamId = p.teamId;
            const pTeamParticipants = matchData.info.participants.filter(tp => tp.teamId === pTeamId);
            const pTeamTotalDamage = pTeamParticipants.reduce((sum, tp) => sum + (tp.totalDamageDealtToChampions || 0), 0);

            const statsWithTeam = {
                ...p,
                teamTotalDamage: pTeamTotalDamage,
                gameDuration: matchData.info.gameDuration
            };

            return {
                participant: p,
                rawScore: calculatePerformanceScore(statsWithTeam)
            };
        });

        // ===== ÉTAPE 2: Normaliser les scores (le meilleur = 100) =====
        const normalizedScores = normalizePerformanceScores(allPlayersWithScores);

        // ===== ÉTAPE 3: Retrouver le score normalisé du joueur analysé =====
        const playerIndex = allPlayersWithScores.findIndex(p => p.participant.puuid === puuid);
        const performance = normalizedScores[playerIndex];

        const won = participant.win;
        if (won) wins++;
        else losses++;

        totalPerformance += performance;

        // ===== ÉTAPE 4: Calculer les scores normalisés des teammates =====
        const teammates = teamParticipants
            .filter(p => p.puuid !== puuid)
            .map(p => {
                const tIndex = allPlayersWithScores.findIndex(ap => ap.participant.puuid === p.puuid);
                return {
                    name: p.riotIdGameName || p.summonerName,
                    performance: normalizedScores[tIndex]
                };
            });

        // ===== ÉTAPE 5: Ajouter tous les joueurs de la partie pour le détail =====
        const allPlayers = allPlayersWithScores.map((p, idx) => {
            const participant = p.participant;
            return {
                summonerName: participant.riotIdGameName || participant.summonerName,
                tagLine: participant.riotIdTagLine || '',
                champion: participant.championName,
                teamId: participant.teamId,
                performance: normalizedScores[idx],
                kills: participant.kills,
                deaths: participant.deaths,
                assists: participant.assists,
                cs: (participant.totalMinionsKilled || 0) + (participant.neutralMinionsKilled || 0),
                gold: participant.goldEarned,
                damage: participant.totalDamageDealtToChampions,
                visionScore: participant.visionScore,
                items: [
                    participant.item0,
                    participant.item1,
                    participant.item2,
                    participant.item3,
                    participant.item4,
                    participant.item5,
                    participant.item6
                ].filter(item => item !== 0),
                win: participant.win
            };
        });

        matchHistory.push({
            matchId: matchData.metadata.matchId,
            champion: participant.championName,
            playerPerformance: performance,
            won,
            kda: `${participant.kills}/${participant.deaths}/${participant.assists}`,
            teammates,
            allPlayers,  // Nouveau : tous les joueurs de la partie
            gameDuration: Math.floor(matchData.info.gameDuration / 60), // En minutes
            gameMode: matchData.info.gameMode
        });
    });

    const avgPerformance = matchHistory.length > 0
        ? Math.round(totalPerformance / matchHistory.length)
        : 0;

    const luck = calculateLuckScore(matchHistory);

    return {
        playerName,
        avgPerformance,
        totalGames: matchHistory.length,
        wins,
        losses,
        winRate: matchHistory.length > 0 ? Math.round((wins / matchHistory.length) * 100) : 0,
        luckScore: luck.luckScore,
        luckStats: luck.stats,
        matchHistory
    };
}

module.exports = {
    calculatePerformanceScore,
    calculateLuckScore,
    generateLeaderboard,
    analyzePlayer
};
