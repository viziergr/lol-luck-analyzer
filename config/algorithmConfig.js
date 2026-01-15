/**
 * Configuration de l'algorithme d'analyse de performances
 * Vous pouvez modifier ces valeurs pour ajuster le scoring
 */

module.exports = {
    // ===== NORMALISATION PAR PARTIE (Percentile-based) =====
    normalization: {
        enabled: true,
        type: 'percentile',  // 'percentile' ou 'minmax'
        description: 'Normalisation par percentile : Top performers peuvent tous avoir 100/100'
    },

    // ===== SCORE DE PERFORMANCE (0-110 points au total) =====
    performance: {
        // KDA Ratio - Mesure l'efficacité en combat
        kda: {
            weight: 20,
            perfect: 10,
            description: 'Ratio (Kills + Assists) / Deaths. Un KDA de 10+ est exceptionnel'
        },

        // Dégâts aux champions - Contribution offensive
        damageShare: {
            weight: 20,
            perfect: 0.30,
            description: 'Pourcentage des dégâts totaux de l\\'équipe'
        },

        // Kill Participation - Présence dans les combats
        killParticipation: {
            weight: 15,
            perfect: 1.0,
            description: 'Participation aux kills de l\\'équipe. 75% + est très bon'
        },

        // Vision Score - Contrôle de la map
        visionScore: {
            weight: 10,
            perfectPerMin: 3,
            description: 'Score de vision par minute. Important pour Supports et Junglers'
        },

        // CS/min - Farm et économie
        csPerMin: {
            weight: 15,
            perfect: 8,
            description: 'Creep Score par minute. Crucial pour ADC/Mid/Top'
        },

        // Gold/min - Efficacité économique
        goldPerMin: {
            weight: 8,               // Réduit à 8 (compensé par goldDiff15)
            perfect: 400,
            description: 'Or généré par minute'
        },

        // Gold Diff à 15min - Domination lane
        goldDiff15: {
            weight: 7,               // NOUVEAU : 7 points
            perfect: 1000,           // +1000 gold à 15min = excellente lane
            description: 'Avance d\'or à 15min vs adversaire direct. Crucial pour laners.'
        },

        // XP Diff à 15min - Domination lane (niveau)
        xpDiff15: {
            weight: 5,               // NOUVEAU : 5 points
            perfect: 1500,           // +1500 XP à 15min = excellente lane
            description: 'Avance d\'XP à 15min vs adversaire direct. Indique domination en lane.'
        },

        // Objectifs - Impact stratégique
        objectives: {
            weight: 10,
            turretValue: 1,
            inhibitorValue: 2,
            baronValue: 3,
            dragonValue: 2,
            multiplier: 0.5,
            description: 'Contribution aux objectifs majeurs'
        }
    },

    // ===== SCORE DE CHANCE (-100 à +100) =====
    luck: {
        thresholds: {
            goodPerformance: 70,
            badPerformance: 40,
            carrying: 15,
            beingCarried: -15
        },

        scenarios: {
            goodPerfLoss: -3,
            carryingLoss: -5,
            badPerfWin: 3,
            beingCarriedWin: 5,
            winWithWeakTeam: -1,
            loseWithStrongTeam: 1
        },

        normalizationFactor: 10
    },

    // ===== AJUSTEMENTS PAR RÔLE =====
    roleAdjustments: {
        enabled: true,

        detection: {
            supportMaxCS: 2.5,
            supportMinVision: 2.0,
            jungleNeutralPercent: 0.4
        },

        SUPPORT: {
            csPerMin: 0.2,
            goldPerMin: 0.6,
            damageShare: 0.7,
            visionScore: 1.8,
            killParticipation: 1.3,
            objectives: 1.2,
            goldDiff15: 0.5,      // Gold diff moins pertinent (duo lane)
            xpDiff15: 0.3         // XP diff très peu pertinent
        },
        JUNGLE: {
            csPerMin: 0.6,
            visionScore: 1.4,
            objectives: 1.6,
            killParticipation: 1.2,
            goldDiff15: 0.4,      // Pas vraiment de lane opponent
            xpDiff15: 0.3         // Pas de lane phase
        },
        LANER: {
            csPerMin: 1.0,
            damageShare: 1.0,
            goldPerMin: 1.0,
            visionScore: 1.0,
            killParticipation: 1.0,
            objectives: 1.0,
            goldDiff15: 1.3,      // TRÈS important pour laners !
            xpDiff15: 1.2         // Important pour laners
        }
    }
};
