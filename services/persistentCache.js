const fs = require('fs').promises;
const path = require('path');

/**
 * Cache persistant pour les données Riot API
 * Stocke les matchs sur le disque pour éviter les requêtes répétées
 */

class PersistentCache {
    constructor(cacheDir = './cache', ttlDays = 7) {
        this.cacheDir = cacheDir;
        this.ttl = ttlDays * 24 * 60 * 60 * 1000; // Convertir jours en ms
        this.ensureCacheDir();
    }

    /**
     * Crée le dossier de cache s'il n'existe pas
     */
    async ensureCacheDir() {
        try {
            await fs.mkdir(this.cacheDir, { recursive: true });
        } catch (error) {
            console.error('Error creating cache directory:', error);
        }
    }

    /**
     * Génère un nom de fichier sécurisé à partir d'une clé
     */
    getFilePath(key) {
        // Remplacer les caractères non valides pour un nom de fichier
        const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
        return path.join(this.cacheDir, `${safeKey}.json`);
    }

    /**
     * Récupère une entrée du cache
     * @param {string} key - Clé unique (ex: "match_EUW1_123456")
     * @returns {Object|null} - Données cachées ou null si expiré/inexistant
     */
    async get(key) {
        try {
            const filePath = this.getFilePath(key);
            const content = await fs.readFile(filePath, 'utf8');
            const cached = JSON.parse(content);

            // Vérifier si le cache est encore valide
            const now = Date.now();
            if (now - cached.timestamp > this.ttl) {
                // Cache expiré, on le supprime
                await this.delete(key);
                return null;
            }

            return cached.data;
        } catch (error) {
            // Fichier n'existe pas ou erreur de lecture
            return null;
        }
    }

    /**
     * Sauvegarde une entrée dans le cache
     * @param {string} key - Clé unique
     * @param {any} data - Données à cacher
     */
    async set(key, data) {
        try {
            const filePath = this.getFilePath(key);
            const cached = {
                timestamp: Date.now(),
                data: data
            };
            await fs.writeFile(filePath, JSON.stringify(cached), 'utf8');
        } catch (error) {
            console.error('Error writing to cache:', error);
        }
    }

    /**
     * Supprime une entrée du cache
     */
    async delete(key) {
        try {
            const filePath = this.getFilePath(key);
            await fs.unlink(filePath);
        } catch (error) {
            // Fichier n'existe pas, on ignore l'erreur
        }
    }

    /**
     * Efface tout le cache
     */
    async clear() {
        try {
            const files = await fs.readdir(this.cacheDir);
            await Promise.all(
                files.map(file => fs.unlink(path.join(this.cacheDir, file)))
            );
            console.log(`✅ Cache cleared: ${files.length} files deleted`);
        } catch (error) {
            console.error('Error clearing cache:', error);
        }
    }

    /**
     * Supprime les entrées expirées
     */
    async cleanup() {
        try {
            const files = await fs.readdir(this.cacheDir);
            const now = Date.now();
            let deletedCount = 0;

            for (const file of files) {
                try {
                    const filePath = path.join(this.cacheDir, file);
                    const content = await fs.readFile(filePath, 'utf8');
                    const cached = JSON.parse(content);

                    if (now - cached.timestamp > this.ttl) {
                        await fs.unlink(filePath);
                        deletedCount++;
                    }
                } catch (error) {
                    // Fichier corrompu ou erreur, on le supprime
                    await fs.unlink(path.join(this.cacheDir, file));
                    deletedCount++;
                }
            }

            if (deletedCount > 0) {
                console.log(`🧹 Cache cleanup: ${deletedCount} expired entries removed`);
            }
        } catch (error) {
            console.error('Error cleaning cache:', error);
        }
    }

    /**
     * Obtient des statistiques sur le cache
     */
    async getStats() {
        try {
            const files = await fs.readdir(this.cacheDir);
            const now = Date.now();
            let totalSize = 0;
            let validEntries = 0;
            let expiredEntries = 0;

            for (const file of files) {
                try {
                    const filePath = path.join(this.cacheDir, file);
                    const stats = await fs.stat(filePath);
                    totalSize += stats.size;

                    const content = await fs.readFile(filePath, 'utf8');
                    const cached = JSON.parse(content);

                    if (now - cached.timestamp > this.ttl) {
                        expiredEntries++;
                    } else {
                        validEntries++;
                    }
                } catch (error) {
                    expiredEntries++;
                }
            }

            return {
                totalEntries: files.length,
                validEntries,
                expiredEntries,
                totalSizeKB: Math.round(totalSize / 1024),
                totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2)
            };
        } catch (error) {
            return {
                totalEntries: 0,
                validEntries: 0,
                expiredEntries: 0,
                totalSizeKB: 0,
                totalSizeMB: '0.00'
            };
        }
    }
}

module.exports = PersistentCache;
