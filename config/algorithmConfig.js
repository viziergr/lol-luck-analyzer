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
            weight: 18,              // Réduit de 20 à 18 (moins important pour supports)
            perfect: 10,
            assistWeight: 0.8,       // NOUVEAU : Poids des assists dans le KDA (80% d'un kill)
            description: 'Ratio (Kills + Assists) / Deaths. Pour supports : assists = 80% d\'un kill'
        },

        // Dégâts aux champions - Contribution offensive
        damageShare: {
            weight: 18,              // Réduit de 20 à 18
            perfect: 0.30,
            supportPerfect: 0.12,    // NOUVEAU : 12% des dégâts = excellent pour support
            description: 'Pourcentage des dégâts totaux de l\'équipe. Supports : 10-15% est normal'
        },

        // Kill Participation - Présence dans les combats
        killParticipation: {
            weight: 17,              // Augmenté de 15 à 17 (plus important pour supports)
            perfect: 1.0,
            description: 'Participation aux kills de l\'équipe. Crucial pour supports (assists comptent !)'
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
            kda: 0.9,                // KDA légèrement moins important (90%)
            csPerMin: 0.15,          // CS presque ignoré (15% d'importance)
            goldPerMin: 0.5,         // Or moins important
            damageShare: 0.5,        // Dégâts beaucoup moins importants
            visionScore: 2.0,        // Vision TRÈS importante
            killParticipation: 1.5,  // Présence très importante
            objectives: 1.3,         // Objectifs importants
            goldDiff15: 0.3,         // Gold diff peu pertinent
            xpDiff15: 0.2            // XP diff très peu pertinent
        },
        JUNGLE: {
            csPerMin: 0.6,
            visionScore: 1.4,
            objectives: 1.6,
            killParticipation: 1.2,
            goldDiff15: 0.4,
            xpDiff15: 0.3
        },
        LANER: {
            csPerMin: 1.0,
            damageShare: 1.0,
            goldPerMin: 1.0,
            visionScore: 1.0,
            killParticipation: 1.0,
            objectives: 1.0,
            goldDiff15: 1.3,
            xpDiff15: 1.2
        }
    }
};
