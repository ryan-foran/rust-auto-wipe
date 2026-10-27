const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class MapManager {
    constructor() {
        this.maps = [];
        this.loadMaps();
    }

    loadMaps() {
        try {
            const mapsPath = path.join(__dirname, '../data/maps.json');
            if (fs.existsSync(mapsPath)) {
                this.maps = fs.readJsonSync(mapsPath);
            } else {
                this.maps = [];
                this.saveMaps();
            }
        } catch (error) {
            console.error('[MapManager] Failed to load maps:', error.message);
            this.maps = [];
        }
    }

    saveMaps() {
        try {
            const dataDir = path.join(__dirname, '../data');
            fs.ensureDirSync(dataDir);
            const mapsPath = path.join(dataDir, 'maps.json');
            fs.writeJsonSync(mapsPath, this.maps, { spaces: 2 });
        } catch (error) {
            console.error('[MapManager] Failed to save maps:', error.message);
        }
    }

    getMaps() {
        return this.maps;
    }

    getEnabledMaps() {
        return this.maps.filter(m => m.enabled !== false);
    }

    addMap(mapData) {
        const map = {
            id: uuidv4(),
            name: mapData.name || 'Unnamed Map',
            type: mapData.type || 'seed',
            seed: mapData.seed || null,
            url: mapData.url || null,
            file: mapData.file || null,
            size: mapData.size || null,
            description: mapData.description || '',
            enabled: mapData.enabled !== false,
            createdAt: new Date().toISOString()
        };
        this.maps.push(map);
        this.saveMaps();
        return map;
    }

    updateMap(id, updates) {
        const index = this.maps.findIndex(m => m.id === id);
        if (index === -1) return null;
        this.maps[index] = { ...this.maps[index], ...updates };
        this.saveMaps();
        return this.maps[index];
    }

    deleteMap(id) {
        const index = this.maps.findIndex(m => m.id === id);
        if (index === -1) return false;
        this.maps.splice(index, 1);
        this.saveMaps();
        return true;
    }

    toggleMap(id) {
        const map = this.maps.find(m => m.id === id);
        if (!map) return null;
        map.enabled = !map.enabled;
        this.saveMaps();
        return map;
    }

    getRandomMapFromPool() {
        const enabled = this.getEnabledMaps();
        if (enabled.length === 0) return null;
        const randomIndex = Math.floor(Math.random() * enabled.length);
        return enabled[randomIndex];
    }

    selectMap(mapConfig = {}) {
        const { mode = 'seed', mapId = null, seed = null, size = null } = mapConfig;
        
        if (mode === 'pool') {
            const map = this.getRandomMapFromPool();
            if (map) {
                return {
                    seed: map.seed || Math.floor(Math.random() * 1000000) + 1,
                    size: map.size || size,
                    mapName: map.name,
                    mapType: map.type
                };
            }
            // Fallback to random seed if pool is empty
            return { seed: Math.floor(Math.random() * 1000000) + 1, size: size || null };
        } else if (mode === 'random') {
            // Generate random seed 1-1000000
            const randomSeed = Math.floor(Math.random() * 1000000) + 1;
            return { seed: randomSeed, size: size || null };
        } else if (mode === 'seed') {
            // Use provided seed
            return { 
                seed: (seed !== null && seed !== undefined && seed !== '') ? seed : 1, 
                size: size || null 
            };
        }
        
        // Default
        return { seed: 1, size: size || null };
    }
}

module.exports = MapManager;
