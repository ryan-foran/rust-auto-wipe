const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class CustomFilesManager {
    constructor(serverDir) {
        this.serverDir = serverDir || process.env.RUST_SERVER_DIR || './server';
        this.rules = [];
        this.loadRules();
    }

    loadRules() {
        try {
            const rulesPath = path.join(__dirname, '../data/custom-files.json');
            if (fs.existsSync(rulesPath)) {
                this.rules = fs.readJsonSync(rulesPath);
            } else {
                this.rules = [];
                this.saveRules();
            }
        } catch (error) {
            console.error('[CustomFilesManager] Failed to load rules:', error.message);
            this.rules = [];
        }
    }

    saveRules() {
        try {
            const dataDir = path.join(__dirname, '../data');
            fs.ensureDirSync(dataDir);
            const rulesPath = path.join(dataDir, 'custom-files.json');
            fs.writeJsonSync(rulesPath, this.rules, { spaces: 2 });
        } catch (error) {
            console.error('[CustomFilesManager] Failed to save rules:', error.message);
        }
    }

    getRules() {
        return this.rules;
    }

    getEnabledRules() {
        return this.rules.filter(r => r.enabled !== false);
    }

    addRule(ruleData) {
        const rule = {
            id: uuidv4(),
            name: ruleData.name || 'Unnamed Rule',
            pattern: ruleData.pattern || '*',
            wipeType: ruleData.wipeType || 'all', // 'map', 'blueprint', 'full', 'all'
            description: ruleData.description || '',
            enabled: ruleData.enabled !== false,
            createdAt: new Date().toISOString()
        };
        this.rules.push(rule);
        this.saveRules();
        return rule;
    }

    updateRule(id, updates) {
        const index = this.rules.findIndex(r => r.id === id);
        if (index === -1) return null;
        this.rules[index] = { ...this.rules[index], ...updates };
        this.saveRules();
        return this.rules[index];
    }

    deleteRule(id) {
        const index = this.rules.findIndex(r => r.id === id);
        if (index === -1) return false;
        this.rules.splice(index, 1);
        this.saveRules();
        return true;
    }

    toggleRule(id) {
        const rule = this.rules.find(r => r.id === id);
        if (!rule) return null;
        rule.enabled = !rule.enabled;
        this.saveRules();
        return rule;
    }

    async deleteCustomFiles(wipeType = 'full') {
        const rulesToApply = this.getEnabledRules().filter(r => 
            r.wipeType === 'all' || r.wipeType === wipeType
        );

        if (rulesToApply.length === 0) return [];

        const deletedFiles = [];
        
        try {
            const serverFiles = await fs.readdir(this.serverDir).catch(() => []);
            
            for (const rule of rulesToApply) {
                try {
                    // Simple pattern matching (supports * wildcard)
                    const regex = new RegExp('^' + rule.pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$', 'i');
                    
                    for (const file of serverFiles) {
                        if (regex.test(file)) {
                            try {
                                const filePath = path.join(this.serverDir, file);
                                const stat = await fs.stat(filePath);
                                if (stat.isFile()) {
                                    await fs.remove(filePath);
                                    deletedFiles.push({ rule: rule.name, file });
                                    console.log(`[CustomFilesManager] Deleted custom file: ${file} (rule: ${rule.name})`);
                                }
                            } catch (err) {
                                console.warn(`[CustomFilesManager] Could not delete ${file}:`, err.message);
                            }
                        }
                    }
                } catch (err) {
                    console.error(`[CustomFilesManager] Error applying rule ${rule.name}:`, err.message);
                }
            }
        } catch (error) {
            console.error('[CustomFilesManager] Error reading server directory:', error.message);
        }

        return deletedFiles;
    }
}

module.exports = CustomFilesManager;
