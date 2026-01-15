/**
 * Configuration de l'algorithme d'analyse de performances
 * Vous pouvez modifier ces valeurs pour ajuster le scoring
 */

module.exports = {
    // ===== NORMALISATION PAR PARTIE =====
    normalization: {
        // Si true, normalise les scores pour que le meilleur joueur de chaque partie ait 100/100
        // Si false, utilise le scoring absolu (0-100 selon les critères parfaits)
        enabled: true,

        // Score minimum garanti après normalisation (évite les scores négatifs)
        minScore: 0,

        description: 'Normalisation relative : le meilleur de la partie = 100, les autres sont relatifs à lui'
    },

    // ===== SCORE DE PERFORMANCE (0-100) =====
    // Total doit faire 100 points
    performance: {
        // KDA Ratio - Mesure l'efficacité en combat
        kda: {
            weight: 20,              // Points max pour cette métrique
            perfect: 10,             // KDA considéré comme parfait (10 = excellent)
            description: 'Ratio (Kills + Assists) / Deaths. Un KDA de 10+ est exceptionnel'
        },

        // Dégâts aux champions - Contribution offensive
        damageShare: {
            weight: 20,
            perfect: 0.30,           // 30% des dégâts de l'équipe = excellent
            description: 'Pourcentage des dégâts totaux de l\'équipe. Varie selon le rôle (ADC/Mid plus élevé)'
        },

        // Kill Participation - Présence dans les combats
        killParticipation: {
            weight: 15,
            perfect: 1.0,            // 100% = participe à tous les kills
            description: 'Participation aux kills de l\'équipe. 75%+ est très bon'
        },

        // Vision Score - Contrôle de la map
        visionScore: {
            weight: 10,
            perfectPerMin: 3,        // 3 vision/min = excellent support/jungle
            description: 'Score de vision par minute. Important pour Supports et Junglers'
        },

        // CS/min - Farm et économie
        csPerMin: {
            weight: 15,
            perfect: 8,              // 8 CS/min = excellent (pour laners)
            description: 'Creep Score par minute. Crucial pour ADC/Mid/Top. Moins pour Support'
        },

        // Gold/min - Efficacité économique
        goldPerMin: {
            weight: 10,
            perfect: 400,            // 400 gold/min = excellent
            description: 'Or généré par minute. Corrèle avec le farm et les kills'
        },

        // Objectifs - Impact stratégique
        objectives: {
            weight: 10,
            turretValue: 1,          // Points par tour détruite
            inhibitorValue: 2,       // Points par inhibiteur
            baronValue: 3,           // Points par baron
            dragonValue: 2,          // Points par dragon
            multiplier: 0.5,         // Multiplicateur final
            description: 'Contribution aux objectifs majeurs (tours, dragons, barons)'
        }
    },

    // ===== SCORE DE CHANCE (-100 à +100) =====
    luck: {
        // Seuils de performance pour classification
        thresholds: {
            goodPerformance: 70,     // Score >= 70 = bonne performance
            badPerformance: 40,      // Score < 40 = mauvaise performance
            carrying: 15,            // Diff >= 15 points vs team = carrying
            beingCarried: -15        // Diff <= -15 points vs team = being carried
        },

        // Points de chance/malchance par scénario
        scenarios: {
            // Malchanceux : bonne perf mais défaite
            goodPerfLoss: -3,
            // Très malchanceux : carry hard mais défaite
            carryingLoss: -5,

            // Chanceux : mauvaise perf mais victoire
            badPerfWin: 3,
            // Très chanceux : porté par la team
            beingCarriedWin: 5,

            // Ajustements fins selon la team
            winWithWeakTeam: -1,     // Gagner avec team faible = skill
            loseWithStrongTeam: 1    // Perdre avec bonne team = malchance
        },

        // Normalisation sur échelle -100 à +100
        normalizationFactor: 10      // Multiplie le score brut
    },

    // ===== AJUSTEMENTS PAR RÔLE (optionnel, pas encore implémenté) =====
    // Permet de pondérer différemment selon le rôle
    roleAdjustments: {
        enabled: false,              // Activer les ajustements par rôle

        // Exemple d'ajustements possibles:
        TOP: {
            csPerMin: 1.0,           // Importance normale
            visionScore: 0.7,        // Moins important
            damageShare: 1.1         // Un peu plus important
        },
        JUNGLE: {
            csPerMin: 0.5,           // Moins important
            visionScore: 1.3,        // Plus important
            objectives: 1.5          // Beaucoup plus important
        },
        MIDDLE: {
            csPerMin: 1.2,           // Très important
            damageShare: 1.2,        // Très important
            killParticipation: 1.1
        },
        BOTTOM: {
            csPerMin: 1.3,           // Crucial
            damageShare: 1.3,        // Crucial
            visionScore: 0.8
        },
        UTILITY: {  // Support
            csPerMin: 0.3,           // Très peu important
            visionScore: 1.5,        // Crucial
            killParticipation: 1.2,
            objectives: 1.2
        }
    }
};
