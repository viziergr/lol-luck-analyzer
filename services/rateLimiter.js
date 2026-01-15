/**
 * Utilitaire pour gérer les rate limits de l'API Riot
 * Dev Key: 20 req/sec, 100 req/2min
 */

class RateLimiter {
    constructor(requestsPerSecond = 18) { // 18 au lieu de 20 pour avoir de la marge
        this.requestsPerSecond = requestsPerSecond;
        this.minTimeBetweenRequests = 1000 / requestsPerSecond; // ms entre chaque requête
        this.lastRequestTime = 0;
        this.queue = [];
    }

    /**
     * Exécute une fonction avec rate limiting
     * @param {Function} fn - Fonction async à exécuter
     * @returns {Promise} Résultat de la fonction
     */
    async execute(fn) {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        // Si pas assez de temps écoulé, on attend
        if (timeSinceLastRequest < this.minTimeBetweenRequests) {
            const waitTime = this.minTimeBetweenRequests - timeSinceLastRequest;
            await this.sleep(waitTime);
        }

        this.lastRequestTime = Date.now();
        return await fn();
    }

    /**
     * Exécute un tableau de promesses avec rate limiting
     * @param {Array} promises - Tableau de fonctions qui retournent des promesses
     * @returns {Promise<Array>} Tableaux des résultats
     */
    async executeAll(promiseFunctions) {
        const results = [];

        for (const promiseFn of promiseFunctions) {
            const result = await this.execute(promiseFn);
            results.push(result);
        }

        return results;
    }

    /**
     * Batch execution: exécute par lots avec rate limiting
     * @param {Array} promiseFunctions - Fonctions qui retournent des promesses
     * @param {number} batchSize - Taille du lot (par défaut 10)
     */
    async executeBatch(promiseFunctions, batchSize = 10) {
        const results = [];

        for (let i = 0; i < promiseFunctions.length; i += batchSize) {
            const batch = promiseFunctions.slice(i, i + batchSize);

            // Exécuter le batch avec rate limiting
            const batchResults = await Promise.all(
                batch.map(fn => this.execute(fn))
            );

            results.push(...batchResults);

            // Petite pause entre les batches pour être sûr
            if (i + batchSize < promiseFunctions.length) {
                await this.sleep(100);
            }
        }

        return results;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = RateLimiter;
