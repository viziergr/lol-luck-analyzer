// Importer la configuration de l'algorithme
// Vous pouvez modifier les paramètres dans config/algorithmConfig.js
const config = require('../config/algorithmConfig');
const dataDragon = require('./dataDragon');

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
 * Détecte le rôle d'un joueur basé sur ses stats
 * @param {Object} playerStats - Statistiques du joueur
 * @returns {string} - 'SUPPORT', 'JUNGLE', ou 'LANER'
 */
function detectRole(playerStats) {
    if (!config.roleAdjustments.enabled) {
        return 'LANER';  // Pas d'ajustement si désactivé
    }

    const detection = config.roleAdjustments.detection;
    const gameDuration = playerStats.gameDuration || 1800;

    // Calculer CS/min
    const cs = (playerStats.totalMinionsKilled || 0) + (playerStats.neutralMinionsKilled || 0);
    const csPerMin = (cs / gameDuration) * 60;

    // Calculer vision/min
    const visionScore = playerStats.visionScore || 0;
    const visionPerMin = (visionScore / gameDuration) * 60;

    // Calculer % de neutral CS
    const neutralCS = playerStats.neutralMinionsKilled || 0;
    const laneCS = playerStats.totalMinionsKilled || 0;
    const neutralPercent = cs > 0 ? neutralCS / cs : 0;

    // Détection Support : Très peu de CS + beaucoup de vision
    if (csPerMin < detection.supportMaxCS && visionPerMin > detection.supportMinVision) {
        return 'SUPPORT';
    }

    // Détection Jungle : Beaucoup de neutral CS
    if (neutralPercent > detection.jungleNeutralPercent) {
        return 'JUNGLE';
    }

    // Par défaut : Laner (Top, Mid, ADC)
    return 'LANER';
}

/**
 * Calcule le score de performance d'un joueur sur une partie (0-100)
 * Basé sur plusieurs métriques clés configurables
 */
function calculatePerformanceScore(playerStats) {
    let score = 0;
    const perfConfig = config.performance;

    // Détecter le rôle du joueur
    const role = detectRole(playerStats);
    const roleMultipliers = config.roleAdjustments.enabled
        ? config.roleAdjustments[role] || config.roleAdjustments.LANER
        : {};

    // Helper pour appliquer le multiplicateur de rôle
    const applyRoleMultiplier = (baseWeight, metricName) => {
        if (!config.roleAdjustments.enabled) return baseWeight;
        const multiplier = roleMultipliers[metricName] || 1.0;
        return baseWeight * multiplier;
    };

    // 1. KDA Ratio
    const kills = playerStats.kills || 0;
    const deaths = playerStats.deaths || 1; // Éviter division par 0
    const assists = playerStats.assists || 0;

    // Pour les supports, valoriser davantage les assists
    let kda;
    if (role === 'SUPPORT') {
        const assistWeight = perfConfig.kda.assistWeight || 0.8;
        kda = (kills + (assists * assistWeight)) / deaths;
    } else {
        kda = (kills + assists) / deaths;
    }

    const kdaWeight = applyRoleMultiplier(perfConfig.kda.weight, 'kda');
    const kdaScore = Math.min(
        kdaWeight,
        (kda / perfConfig.kda.perfect) * kdaWeight
    );
    score += kdaScore;

    // 2. Dégâts infligés relatifs
    const damageDealt = playerStats.totalDamageDealtToChampions || 0;
    const teamDamage = playerStats.teamTotalDamage || 1;
    const damagePercent = damageDealt / teamDamage;

    // Pour les supports, utiliser un seuil "parfait" différent
    const damagePerfect = role === 'SUPPORT' && perfConfig.damageShare.supportPerfect
        ? perfConfig.damageShare.supportPerfect
        : perfConfig.damageShare.perfect;

    const damageWeight = applyRoleMultiplier(perfConfig.damageShare.weight, 'damageShare');
    const damageScore = Math.min(
        damageWeight,
        (damagePercent / damagePerfect) * damageWeight
    );
    score += damageScore;

    // 3. Participation aux kills
    const killParticipation = playerStats.challenges?.killParticipation || 0;
    const kpWeight = applyRoleMultiplier(perfConfig.killParticipation.weight, 'killParticipation');
    const participationScore = killParticipation * kpWeight;
    score += participationScore;

    // 4. Vision Score
    const visionScore = playerStats.visionScore || 0;
    const gameDuration = playerStats.gameDuration || 1800; // 30 min par défaut
    const visionPerMin = (visionScore / gameDuration) * 60;

    const visionWeight = applyRoleMultiplier(perfConfig.visionScore.weight, 'visionScore');
    const visionPoints = Math.min(
        visionWeight,
        (visionPerMin / perfConfig.visionScore.perfectPerMin) * visionWeight
    );
    score += visionPoints;

    // 5. CS/min
    const cs = (playerStats.totalMinionsKilled || 0) + (playerStats.neutralMinionsKilled || 0);
    const csPerMin = (cs / gameDuration) * 60;

    const csWeight = applyRoleMultiplier(perfConfig.csPerMin.weight, 'csPerMin');
    const csScore = Math.min(
        csWeight,
        (csPerMin / perfConfig.csPerMin.perfect) * csWeight
    );
    score += csScore;

    // 6. Gold/min
    const gold = playerStats.goldEarned || 0;
    const goldPerMin = (gold / gameDuration) * 60;

    const goldWeight = applyRoleMultiplier(perfConfig.goldPerMin.weight, 'goldPerMin');
    const goldScore = Math.min(
        goldWeight,
        (goldPerMin / perfConfig.goldPerMin.perfect) * goldWeight
    );
    score += goldScore;

    // 8. Gold Diff à 15min (early game domination)
    const goldDiff15 = playerStats.goldDiff15 || 0;
    const goldDiffWeight = applyRoleMultiplier(perfConfig.goldDiff15.weight, 'goldDiff15');

    // Score basé sur la diff (peut être négatif si en retard)
    // +1000 gold = +7 points, -1000 gold = -7 points
    let goldDiffScore = (goldDiff15 / perfConfig.goldDiff15.perfect) * goldDiffWeight;
    goldDiffScore = Math.max(-goldDiffWeight, Math.min(goldDiffWeight, goldDiffScore));
    score += goldDiffScore;

    // 9. XP Diff à 15min (level advantage)
    const xpDiff15 = playerStats.xpDiff15 || 0;
    const xpDiffWeight = applyRoleMultiplier(perfConfig.xpDiff15.weight, 'xpDiff15');

    // Score basé sur la diff
    let xpDiffScore = (xpDiff15 / perfConfig.xpDiff15.perfect) * xpDiffWeight;
    xpDiffScore = Math.max(-xpDiffWeight, Math.min(xpDiffWeight, xpDiffScore));
    score += xpDiffScore;

    // 10. Objectifs
    const turretKills = playerStats.turretKills || 0;
    const inhibitorKills = playerStats.inhibitorKills || 0;
    const baronKills = playerStats.challenges?.baronKills || 0;
    const dragonKills = playerStats.challenges?.dragonKills || 0;

    const objConfig = perfConfig.objectives;
    const objWeight = applyRoleMultiplier(objConfig.weight, 'objectives');
    const objectivesScore = Math.min(
        objWeight,
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

        // NOUVEAU : Détecter les parties 1v9 perdues
        // Si défaite ET au moins 25 points de plus que le 2ème de la team
        if (!won && teammatesPerf.length > 0) {
            const secondBestTeammate = Math.max(...teammatesPerf);
            const diffVsSecondBest = playerPerf - secondBestTeammate;

            // Si au moins 25 points de plus que le 2ème meilleur
            if (diffVsSecondBest >= 25) {
                stats.oneVsNineLosses++;
                luckScore += scenarios.carryingLoss * 2; // Double malchance !
            }
        }

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

        // ===== NOUVEAU: Récupérer la timeline pour gold/xp diff à 15min =====
        // On stocke temporairement, sera calculé plus tard de manière async
        matchData._timeline = null; // Placeholder

        // ===== ÉTAPE 1: Calculer les scores BRUTS de TOUS les joueurs de la partie =====
        const allPlayersWithScores = matchData.info.participants.map(p => {
            // Recalculer le dégât total de l'équipe de ce joueur
            const pTeamId = p.teamId;
            const pTeamParticipants = matchData.info.participants.filter(tp => tp.teamId === pTeamId);
            const pTeamTotalDamage = pTeamParticipants.reduce((sum, tp) => sum + (tp.totalDamageDealtToChampions || 0), 0);

            const statsWithTeam = {
                ...p,
                teamTotalDamage: pTeamTotalDamage,
                gameDuration: matchData.info.gameDuration,
                goldDiff15: 0,  // Sera calculé après avec timeline
                xpDiff15: 0     // Sera calculé après avec timeline
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
            championIcon: dataDragon.getChampionIconUrl(participant.championName),
            playerPerformance: performance,
            riotGrade: participant.challenges?.skillScore || null,  // Grade Riot (0-10 → S/A/B/C/D)
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

/**
 * Agrège les statistiques par champion
 * @param {Array} matchHistory - Historique des matchs
 * @returns {Array} Statistiques par champion
 */
function getChampionStats(matchHistory) {
    const championMap = {};

    matchHistory.forEach(match => {
        const champion = match.champion;

        if (!championMap[champion]) {
            championMap[champion] = {
                champion: champion,
                championIcon: match.championIcon,
                games: 0,
                wins: 0,
                totalPerformance: 0,
                performances: []
            };
        }

        championMap[champion].games++;
        if (match.won) championMap[champion].wins++;
        championMap[champion].totalPerformance += match.playerPerformance;
        championMap[champion].performances.push(match.playerPerformance);
    });

    // Calculer les moyennes et formater
    const championStats = Object.values(championMap).map(champ => ({
        champion: champ.champion,
        championIcon: champ.championIcon,
        games: champ.games,
        wins: champ.wins,
        losses: champ.games - champ.wins,
        winRate: Math.round((champ.wins / champ.games) * 100),
        avgPerformance: Math.round(champ.totalPerformance / champ.games),
        bestPerformance: Math.max(...champ.performances),
        worstPerformance: Math.min(...champ.performances)
    }));

    // Trier par nombre de parties (décroissant)
    return championStats.sort((a, b) => b.games - a.games);
}

module.exports = {
    calculatePerformanceScore,
    calculateLuckScore,
    generateLeaderboard,
    analyzePlayer,
    getChampionStats
};
