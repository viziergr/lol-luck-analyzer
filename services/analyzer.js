/**
 * Calcule le score de performance d'un joueur sur une partie (0-100)
 * Basé sur plusieurs métriques clés
 */
function calculatePerformanceScore(playerStats) {
    let score = 0;

    // 1. KDA Ratio (20 points)
    const kills = playerStats.kills || 0;
    const deaths = playerStats.deaths || 1; // Éviter division par 0
    const assists = playerStats.assists || 0;
    const kda = (kills + assists) / deaths;

    const kdaScore = Math.min(20, (kda / 10) * 20);
    score += kdaScore;

    // 2. Dégâts infligés relatifs (20 points)
    const damageDealt = playerStats.totalDamageDealtToChampions || 0;
    const teamDamage = playerStats.teamTotalDamage || 1;
    const damagePercent = damageDealt / teamDamage;

    const damageScore = Math.min(20, (damagePercent / 0.30) * 20); // 30% = parfait
    score += damageScore;

    // 3. Participation aux kills (15 points)
    const killParticipation = playerStats.challenges?.killParticipation || 0;
    const participationScore = killParticipation * 15;
    score += participationScore;

    // 4. Vision Score (10 points)
    const visionScore = playerStats.visionScore || 0;
    const gameDuration = playerStats.gameDuration || 1800; // 30 min par défaut
    const visionPerMin = (visionScore / gameDuration) * 60;

    const visionPoints = Math.min(10, (visionPerMin / 3) * 10); // 3/min = parfait
    score += visionPoints;

    // 5. CS/min (15 points)
    const cs = (playerStats.totalMinionsKilled || 0) + (playerStats.neutralMinionsKilled || 0);
    const csPerMin = (cs / gameDuration) * 60;

    const csScore = Math.min(15, (csPerMin / 8) * 15); // 8 CS/min = parfait
    score += csScore;

    // 6. Gold/min (10 points)
    const gold = playerStats.goldEarned || 0;
    const goldPerMin = (gold / gameDuration) * 60;

    const goldScore = Math.min(10, (goldPerMin / 400) * 10); // 400 gold/min = parfait
    score += goldScore;

    // 7. Objectifs (10 points)
    const turretKills = playerStats.turretKills || 0;
    const inhibitorKills = playerStats.inhibitorKills || 0;
    const baronKills = playerStats.challenges?.baronKills || 0;
    const dragonKills = playerStats.challenges?.dragonKills || 0;

    const objectivesScore = Math.min(10, (turretKills + inhibitorKills * 2 + baronKills * 3 + dragonKills * 2) * 0.5);
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
        const isGoodPerf = playerPerf >= 70;
        const isBadPerf = playerPerf < 40;
        const isCarrying = performanceDiff > 15; // 15 points au-dessus de la team
        const isBeingCarried = performanceDiff < -15; // 15 points en-dessous de la team

        if (isBadPerf) badPerformances++;

        // Cas 1: Bonne perf + Défaite = Malchanceux
        if (isGoodPerf && !won) {
            luckScore -= 3;
            if (isCarrying) {
                carriedLosses++;
                luckScore -= 5; // Très malchanceux de perdre alors qu'on carry
            }
        }

        // Cas 2: Mauvaise perf + Victoire = Chanceux
        if (isBadPerf && won) {
            luckScore += 3;
            if (isBeingCarried) {
                carriedWins3++;
                luckScore += 5; // Très chanceux de gagner alors qu'on joue mal
            }
        }

        // Cas 3: Bonne perf + Victoire + Carrying = Mérité (neutre mais compté)
        if (isGoodPerf && won && isCarrying) {
            carriedWins++;
        }

        // Cas 4: Performance moyenne = Ajustement selon teammates
        if (playerPerf >= 40 && playerPerf < 70) {
            if (won && avgTeamPerf < 50) {
                luckScore -= 1; // A gagné avec une team faible = un peu de skill
            } else if (!won && avgTeamPerf > 60) {
                luckScore += 1; // A perdu avec une bonne team = un peu malchanceux
            }
        }
    });

    // Normalisation du score de chance sur une échelle -100 à +100
    const totalGames = matchHistory.length || 1;
    const normalizedLuck = Math.max(-100, Math.min(100, (luckScore / totalGames) * 10));

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

        const statsWithTeam = {
            ...participant,
            teamTotalDamage,
            gameDuration: matchData.info.gameDuration
        };

        const performance = calculatePerformanceScore(statsWithTeam);
        const won = participant.win;

        if (won) wins++;
        else losses++;

        totalPerformance += performance;

        // Récupérer les performances des teammates
        const teammates = teamParticipants
            .filter(p => p.puuid !== puuid)
            .map(p => ({
                name: p.riotIdGameName || p.summonerName,
                performance: calculatePerformanceScore({
                    ...p,
                    teamTotalDamage,
                    gameDuration: matchData.info.gameDuration
                })
            }));

        matchHistory.push({
            matchId: matchData.metadata.matchId,
            champion: participant.championName,
            playerPerformance: performance,
            won,
            kda: `${participant.kills}/${participant.deaths}/${participant.assists}`,
            teammates
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
