const axios = require('axios');
const NodeCache = require('node-cache');
const RateLimiter = require('./rateLimiter');
const PersistentCache = require('./persistentCache');
require('dotenv').config();

const cache = new NodeCache({ stdTTL: 600 }); // Cache mémoire : 10 minutes
const rateLimiter = new RateLimiter(18); // 18 requêtes/seconde (marge de sécurité)
const persistentCache = new PersistentCache('./cache', 7); // Cache disque : 7 jours

const RIOT_API_KEY = process.env.RIOT_API_KEY;
const REGION = process.env.REGION || 'euw1';
const ROUTING_REGION = getRoutingRegion(REGION);

// Mapping des régions vers les régions de routage
function getRoutingRegion(region) {
    const mapping = {
        'euw1': 'europe',
        'eun1': 'europe',
        'tr1': 'europe',
        'ru': 'europe',
        'na1': 'americas',
        'br1': 'americas',
        'la1': 'americas',
        'la2': 'americas',
        'kr': 'asia',
        'jp1': 'asia',
        'oc1': 'sea',
        'ph2': 'sea',
        'sg2': 'sea',
        'th2': 'sea',
        'tw2': 'sea',
        'vn2': 'sea'
    };
    return mapping[region] || 'europe';
}

/**
 * Récupère les informations d'un invocateur par son Riot ID
 * @param {string} gameName - Nom du joueur (ex: "Faker")
 * @param {string} tagLine - Tag (ex: "KR1")
 * @returns {Object} Données du compte avec PUUID
 */
async function getSummonerByRiotId(gameName, tagLine) {
    const cacheKey = `summoner_${gameName}_${tagLine}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        // Étape 1: Récupérer le PUUID via ACCOUNT-V1 avec rate limiting
        const accountUrl = `https://${ROUTING_REGION}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
        const accountResponse = await rateLimiter.execute(() =>
            axios.get(accountUrl, {
                headers: { 'X-Riot-Token': RIOT_API_KEY }
            })
        );

        const { puuid, gameName: name, tagLine: tag } = accountResponse.data;

        // Étape 2: Récupérer les infos d'invocateur via SUMMONER-V4 avec rate limiting
        const summonerUrl = `https://${REGION}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
        const summonerResponse = await rateLimiter.execute(() =>
            axios.get(summonerUrl, {
                headers: { 'X-Riot-Token': RIOT_API_KEY }
            })
        );

        const result = {
            puuid,
            gameName: name,
            tagLine: tag,
            summonerId: summonerResponse.data.id,
            summonerLevel: summonerResponse.data.summonerLevel,
            profileIconId: summonerResponse.data.profileIconId
        };

        cache.set(cacheKey, result);
        return result;
    } catch (error) {
        if (error.response) {
            throw new Error(`Riot API Error ${error.response.status}: ${error.response.statusText}`);
        }
        throw error;
    }
}

/**
 * Récupère l'historique des matchs d'un joueur
 * @param {string} puuid - PUUID du joueur
 * @param {number} count - Nombre de matchs à récupérer (max 100)
 * @param {number} startTime - Timestamp de début (epoch en secondes)
 * @returns {Array} Liste des IDs de matchs
 */
async function getMatchHistory(puuid, count = 100, startTime = null) {
    const cacheKey = `matches_${puuid}_${count}_${startTime}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        let url = `https://${ROUTING_REGION}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}`;

        // Filtrer pour la saison actuelle (Season 1 2026 commence le 8 janvier 2026)
        if (startTime) {
            url += `&startTime=${startTime}`;
        }

        // Filtrer uniquement les parties classées (420 = Solo/Duo, 440 = Flex)
        url += '&queue=420'; // On peut aussi ajouter &queue=440 si besoin

        const response = await rateLimiter.execute(() =>
            axios.get(url, {
                headers: { 'X-Riot-Token': RIOT_API_KEY }
            })
        );

        cache.set(cacheKey, response.data);
        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(`Riot API Error ${error.response.status}: ${error.response.statusText}`);
        }
        throw error;
    }
}

/**
 * Récupère les détails d'un match
 * @param {string} matchId - ID du match
 * @returns {Object} Détails complets du match
 */
async function getMatchDetails(matchId) {
    // 1. Vérifier le cache mémoire (rapide)
    const memoryCacheKey = `match_${matchId}`;
    const cachedInMemory = cache.get(memoryCacheKey);
    if (cachedInMemory) {
        return cachedInMemory;
    }

    // 2. Vérifier le cache persistant (disque)
    const persistentCacheKey = `match_${matchId}`;
    const cachedOnDisk = await persistentCache.get(persistentCacheKey);
    if (cachedOnDisk) {
        // Remettre en cache mémoire pour les prochains appels
        cache.set(memoryCacheKey, cachedOnDisk);
        console.log(`📦 Cache hit (disk): ${matchId}`);
        return cachedOnDisk;
    }

    // 3. Si pas en cache, récupérer via l'API
    try {
        const url = `https://${ROUTING_REGION}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
        const response = await rateLimiter.execute(() =>
            axios.get(url, {
                headers: { 'X-Riot-Token': RIOT_API_KEY }
            })
        );

        const matchData = response.data;

        // 4. Sauvegarder dans les deux caches
        cache.set(memoryCacheKey, matchData); // Mémoire
        await persistentCache.set(persistentCacheKey, matchData); // Disque

        console.log(`🌐 API call: ${matchId}`);
        return matchData;
    } catch (error) {
        if (error.response) {
            throw new Error(`Riot API Error ${error.response.status}: ${error.response.statusText}`);
        }
        throw error;
    }
}

/**
 * Récupère la timeline d'un match (pour gold diff, xp diff à 15min)
 * @param {string} matchId - ID du match
 * @returns {Object} Timeline du match
 */
async function getMatchTimeline(matchId) {
    // Cache mémoire
    const memoryCacheKey = `timeline_${matchId}`;
    const cachedInMemory = cache.get(memoryCacheKey);
    if (cachedInMemory) {
        return cachedInMemory;
    }

    // Cache persistant
    const persistentCacheKey = `timeline_${matchId}`;
    const cachedOnDisk = await persistentCache.get(persistentCacheKey);
    if (cachedOnDisk) {
        cache.set(memoryCacheKey, cachedOnDisk);
        return cachedOnDisk;
    }

    // API call
    try {
        const url = `https://${ROUTING_REGION}.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline`;
        const response = await rateLimiter.execute(() =>
            axios.get(url, {
                headers: { 'X-Riot-Token': RIOT_API_KEY }
            })
        );

        const timeline = response.data;
        cache.set(memoryCacheKey, timeline);
        await persistentCache.set(persistentCacheKey, timeline);

        return timeline;
    } catch (error) {
        // Timeline pas toujours disponible, retourner null
        return null;
    }
}

module.exports = {
    getSummonerByRiotId,
    getMatchHistory,
    getMatchDetails,
    getMatchTimeline,  // Export timeline
    persistentCache // Export pour accès externe (stats, cleanup, etc.)
};
