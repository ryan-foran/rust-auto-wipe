const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const MapManager = require('./mapManager');
const CustomFilesManager = require('./customFiles');
const PterodactylManager = require('./pterodactyl');

class WipeManager {
    constructor(rcon, serverDir, io = null) {
        this.rcon = rcon;
        this.serverDir = serverDir || process.env.RUST_SERVER_DIR || './server';
        this.io = io;
        this.wipeHistory = [];
        this.mapManager = new MapManager();
        this.customFilesManager = new CustomFilesManager(this.serverDir);
        this.pterodactyl = new PterodactylManager();
        this.loadHistory();
    }

    loadHistory() {
        try {
            const historyPath = path.join(__dirname, '../data/wipe-history.json');
            if (fs.existsSync(historyPath)) {
                this.wipeHistory = fs.readJsonSync(historyPath);
            }
        } catch (error) {
            console.error('[WipeManager] Failed to load history:', error.message);
            this.wipeHistory = [];
        }
    }

    saveHistory() {
        try {
            const dataDir = path.join(__dirname, '../data');
            fs.ensureDirSync(dataDir);
            const historyPath = path.join(dataDir, 'wipe-history.json');
            fs.writeJsonSync(historyPath, this.wipeHistory, { spaces: 2 });
        } catch (error) {
            console.error('[WipeManager] Failed to save history:', error.message);
        }
    }

    async broadcast(event, data) {
        if (this.io) {
            this.io.emit(event, data);
        }
    }

    async performWipe(options = {}) {
        const {
            type = 'full', // 'map', 'blueprint', 'full'
            mapMode = 'seed', // 'seed', 'random', 'pool'
            seed = null,
            mapSize = null,
            mapId = null,
            saveBackup = true,
            announce = true,
            isForceWipe = false,
            updateServer = false,
            wipeTimerMinutes = null
        } = options;

        const wipeId = uuidv4();
        const startTime = new Date();

        const wipeRecord = {
            id: wipeId,
            type,
            startTime: startTime.toISOString(),
            status: 'in_progress',
            options
        };

        this.wipeHistory.unshift(wipeRecord);
        this.saveHistory();
        await this.broadcast('wipe:start', wipeRecord);

        try {
            if (announce && this.rcon.connected) {
                let timerMinutes = wipeTimerMinutes;
                if (timerMinutes === null || timerMinutes === undefined) {
                    timerMinutes = 5; // default for manual
                }
                
                if (timerMinutes > 0) {
                    const totalSeconds = timerMinutes * 60;
                    
                    if (timerMinutes >= 15) {
                        await this.rcon.global(`§c[WIPE] Server wiping in ${timerMinutes} minutes`);
                    } else if (timerMinutes >= 10) {
                        await this.rcon.global(`§c[WIPE] Server wiping in ${timerMinutes} minutes`);
                    } else {
                        await this.rcon.global(`§c[WIPE] Server wiping in ${timerMinutes} minutes`);
                    }
                    
                    // Announce at specific intervals
                    if (totalSeconds >= 900) { // 15 minutes
                        await new Promise(resolve => setTimeout(resolve, 300000)); // wait 5 min to get to 10
                        await this.rcon.global('§c[WIPE] Server wiping in 10 minutes');
                    }
                    if (totalSeconds >= 600) {
                        await new Promise(resolve => setTimeout(resolve, 300000)); // wait 5 min to get to 5
                        await this.rcon.global('§c[WIPE] Server wiping in 5 minutes');
                    }
                    if (totalSeconds >= 300) {
                        await new Promise(resolve => setTimeout(resolve, 60000)); // wait 1 min to get to 4
                        await this.rcon.global('§c[WIPE] Server wiping in 4 minutes');
                        await new Promise(resolve => setTimeout(resolve, 60000));
                        await this.rcon.global('§c[WIPE] Server wiping in 3 minutes');
                        await new Promise(resolve => setTimeout(resolve, 60000));
                        await this.rcon.global('§c[WIPE] Server wiping in 2 minutes');
                        await new Promise(resolve => setTimeout(resolve, 60000));
                        await this.rcon.global('§c[WIPE] Server wiping in 60 seconds');
                    } else {
                        // Handle shorter timers
                        let remaining = totalSeconds;
                        if (remaining > 60) {
                            await new Promise(resolve => setTimeout(resolve, (remaining - 60) * 1000));
                            remaining = 60;
                        }
                    }
                    
                    await this.rcon.global('§c[WIPE] Server wiping in 45 seconds');
                    await new Promise(resolve => setTimeout(resolve, 15000));
                    await this.rcon.global('§c[WIPE] Server wiping in 30 seconds');
                    await new Promise(resolve => setTimeout(resolve, 15000));
                    await this.rcon.global('§c[WIPE] Server wiping in 15 seconds');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    await this.rcon.global('§c[WIPE] Server wiping in 10 seconds');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    await this.rcon.global('§c[WIPE] Server wiping in 5 seconds');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await this.rcon.global('§c[WIPE] Server wiping in 4 seconds');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await this.rcon.global('§c[WIPE] Server wiping in 3 seconds');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await this.rcon.global('§c[WIPE] Server wiping in 2 seconds');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await this.rcon.global('§c[WIPE] Server wiping in 1 second');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                await this.rcon.global('§c[WIPE] Server is wiping NOW!');
            } else if (announce && this.rcon.connected && (wipeTimerMinutes === null || wipeTimerMinutes === undefined)) {
                // Fallback for backward compatibility
                await this.rcon.global('§c[WIPE] Server is wiping in 30 seconds...');
                await new Promise(resolve => setTimeout(resolve, 15000));
                await this.rcon.global('§c[WIPE] Server is wiping in 15 seconds...');
                await new Promise(resolve => setTimeout(resolve, 10000));
                await this.rcon.global('§c[WIPE] Server is wiping NOW!');
            }

            // Perform backup if requested
            if (saveBackup) {
                await this.createBackup(wipeRecord);
            }

            // Map wipe
            if (type === 'map' || type === 'full') {
                const mapSelection = this.mapManager.selectMap({ mode: mapMode, mapId, seed, size: mapSize });
                wipeRecord.mapSelection = mapSelection;
                if (this.rcon.connected) {
                    if (mapSelection.seed) {
                        await this.rcon.sendCommand(`server.seed ${mapSelection.seed}`).catch(() => {});
                    }
                    if (mapSelection.size) {
                        await this.rcon.sendCommand(`server.worldsize ${mapSelection.size}`).catch(() => {});
                    }
                }
                await this.wipeMap(wipeRecord, mapSelection.seed, mapSelection.size);
            }

            // Blueprint wipe
            if (type === 'blueprint' || type === 'full') {
                await this.wipeBlueprints(wipeRecord);
            }

            // Custom files deletion
            const deletedCustom = await this.customFilesManager.deleteCustomFiles(type);
            if (deletedCustom.length > 0) {
                wipeRecord.customFilesDeleted = deletedCustom;
            }

            // Handle server update if requested (e.g., for force wipes)
            if (updateServer && this.pterodactyl.enabled) {
                try {
                    await this.rcon.global('§e[WIPE] Updating server...');
                    const updateResult = await this.pterodactyl.updateServer();
                    wipeRecord.serverUpdate = updateResult;
                } catch (err) {
                    console.error('[WipeManager] Server update failed:', err.message);
                }
            }

            // Restart server via RCON if possible
            if (this.rcon.connected && !updateServer) {
                await this.rcon.sendCommand('quit');
            }

            wipeRecord.status = 'completed';
            wipeRecord.endTime = new Date().toISOString();
            wipeRecord.duration = (new Date() - startTime) / 1000;
            
            this.saveHistory();
            await this.broadcast('wipe:complete', wipeRecord);
            
            console.log(`[WipeManager] Wipe ${wipeId} completed successfully`);
            return wipeRecord;
        } catch (error) {
            wipeRecord.status = 'failed';
            wipeRecord.error = error.message;
            wipeRecord.endTime = new Date().toISOString();
            this.saveHistory();
            await this.broadcast('wipe:failed', { ...wipeRecord, error: error.message });
            
            console.error(`[WipeManager] Wipe ${wipeId} failed:`, error.message);
            throw error;
        }
    }

    async createBackup(wipeRecord) {
        console.log('[WipeManager] Creating backup...');
        const backupDir = path.join(__dirname, '../backups');
        fs.ensureDirSync(backupDir);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `backup-${timestamp}.zip`);
        
        wipeRecord.backupPath = backupPath;
        // Note: Actual zip implementation would require archiver
        // For now, just log
        console.log(`[WipeManager] Backup would be created at: ${backupPath}`);
    }

    async wipeMap(wipeRecord, seed = null, mapSize = null) {
        console.log('[WipeManager] Wiping map files...');
        
        const filesToDelete = [
            'proceduralmap.*.map',
            'proceduralmap.*.sav',
            'map.sav',
            '*.map',
        ];

        try {
            // Try to delete via RCON first
            if (this.rcon.connected) {
                await this.rcon.sendCommand('server.writecfg');
            }

            // Delete map files
            const serverFiles = await fs.readdir(this.serverDir).catch(() => []);
            for (const file of serverFiles) {
                if (file.match(/\.map$|\.sav$/) && !file.includes('backup')) {
                    try {
                        const filePath = path.join(this.serverDir, file);
                        await fs.remove(filePath);
                        console.log(`[WipeManager] Deleted: ${file}`);
                    } catch (err) {
                        console.warn(`[WipeManager] Could not delete ${file}:`, err.message);
                    }
                }
            }

            // Set new seed if provided
            if (seed && this.rcon.connected) {
                await this.rcon.sendCommand(`server.seed ${seed}`);
            }
            if (mapSize && this.rcon.connected) {
                await this.rcon.sendCommand(`server.worldsize ${mapSize}`);
            }

            wipeRecord.mapWiped = true;
        } catch (error) {
            console.error('[WipeManager] Map wipe error:', error.message);
            throw error;
        }
    }

    async wipeBlueprints(wipeRecord) {
        console.log('[WipeManager] Wiping blueprints...');
        
        try {
            if (this.rcon.connected) {
                // Try different methods depending on plugins/server
                await this.rcon.sendCommand('bp.wipe').catch(() => {});
                await this.rcon.sendCommand('blueprintwipe').catch(() => {});
            }

            // Delete blueprint files
            const serverFiles = await fs.readdir(this.serverDir).catch(() => []);
            for (const file of serverFiles) {
                if (file.includes('blueprint') || file.includes('bp')) {
                    try {
                        const filePath = path.join(this.serverDir, file);
                        await fs.remove(filePath);
                        console.log(`[WipeManager] Deleted blueprint file: ${file}`);
                    } catch (err) {
                        console.warn(`[WipeManager] Could not delete ${file}:`, err.message);
                    }
                }
            }

            wipeRecord.blueprintsWiped = true;
        } catch (error) {
            console.error('[WipeManager] Blueprint wipe error:', error.message);
            throw error;
        }
    }

    getHistory(limit = 50) {
        return this.wipeHistory.slice(0, limit);
    }

    getNextWipe() {
        // This would integrate with scheduler
        return null;
    }
}

module.exports = WipeManager;
