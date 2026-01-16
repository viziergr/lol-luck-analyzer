/**
 * Service pour gérer les assets Riot (icônes de champions, etc.)
 * Utilise Data Dragon CDN
 */

// Version de Data Dragon (à mettre à jour régulièrement)
const DDRAGON_VERSION = '14.1.1'; // Version actuelle de LoL
const DDRAGON_CDN = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}`;

/**
 * Récupère l'URL de l'icône d'un champion
 * @param {string} championName - Nom du champion (ex: "Yasuo", "MonkeyKing")
 * @returns {string} URL de l'icône
 */
function getChampionIconUrl(championName) {
    if (!championName) return null;

    // Data Dragon utilise des noms spéciaux pour certains champions
    const championMapping = {
        'FiddleSticks': 'Fiddlesticks',
        'MonkeyKing': 'MonkeyKing', // Wukong
        'Nunu&Willump': 'Nunu',
        'RenataGlasc': 'Renata',
    };

    const mappedName = championMapping[championName] || championName;
    return `${DDRAGON_CDN}/img/champion/${mappedName}.png`;
}

/**
 * Récupère l'URL de l'icône d'un item
 * @param {number} itemId - ID de l'item
 * @returns {string} URL de l'icône
 */
function getItemIconUrl(itemId) {
    if (!itemId || itemId === 0) return null;
    return `${DDRAGON_CDN}/img/item/${itemId}.png`;
}

/**
 * Récupère l'URL d'une icône de summoner spell
 * @param {number} spellId - ID du sort d'invocateur
 * @returns {string} URL de l'icône
 */
function getSummonerSpellIconUrl(spellId) {
    if (!spellId) return null;

    // Mapping des IDs vers les noms de fichiers
    const spellMapping = {
        1: 'SummonerBoost',      // Cleanse
        3: 'SummonerExhaust',    // Exhaust
        4: 'SummonerFlash',      // Flash
        6: 'SummonerHaste',      // Ghost
        7: 'SummonerHeal',       // Heal
        11: 'SummonerSmite',     // Smite
        12: 'SummonerTeleport',  // Teleport
        14: 'SummonerIgnite',    // Ignite
        21: 'SummonerBarrier',   // Barrier
        32: 'SummonerSnowball',  // Mark (ARAM)
    };

    const spellName = spellMapping[spellId];
    if (!spellName) return null;

    return `${DDRAGON_CDN}/img/spell/${spellName}.png`;
}

/**
 * Récupère l'URL de l'icône de profil
 * @param {number} profileIconId - ID de l'icône de profil
 * @returns {string} URL de l'icône
 */
function getProfileIconUrl(profileIconId) {
    if (!profileIconId) return null;
    return `${DDRAGON_CDN}/img/profileicon/${profileIconId}.png`;
}

module.exports = {
    getChampionIconUrl,
    getItemIconUrl,
    getSummonerSpellIconUrl,
    getProfileIconUrl,
    DDRAGON_VERSION
};
