const axios = require('axios');
const NodeCache = require('node-cache');
require('dotenv').config();

const cache = new NodeCache({ stdTTL: 600 }); // Cache pendant 10 minutes

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
        // Étape 1: Récupérer le PUUID via ACCOUNT-V1
        const accountUrl = `https://${ROUTING_REGION}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
        const accountResponse = await axios.get(accountUrl, {
            headers: { 'X-Riot-Token': RIOT_API_KEY }
        });

        const { puuid, gameName: name, tagLine: tag } = accountResponse.data;

        // Étape 2: Récupérer les infos d'invocateur via SUMMONER-V4
        const summonerUrl = `https://${REGION}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
        const summonerResponse = await axios.get(summonerUrl, {
            headers: { 'X-Riot-Token': RIOT_API_KEY }
        });

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

        const response = await axios.get(url, {
            headers: { 'X-Riot-Token': RIOT_API_KEY }
        });

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
    const cacheKey = `match_${matchId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        const url = `https://${ROUTING_REGION}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
        const response = await axios.get(url, {
            headers: { 'X-Riot-Token': RIOT_API_KEY }
        });

        cache.set(cacheKey, response.data);
        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(`Riot API Error ${error.response.status}: ${error.response.statusText}`);
        }
        throw error;
    }
}

module.exports = {
    getSummonerByRiotId,
    getMatchHistory,
    getMatchDetails
};
