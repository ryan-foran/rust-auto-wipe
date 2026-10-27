const axios = require('axios');

class PterodactylManager {
    constructor() {
        this.apiKey = process.env.PTERODACTYL_API_KEY;
        this.panelUrl = process.env.PTERODACTYL_PANEL_URL;
        this.serverId = process.env.PTERODACTYL_SERVER_ID;
        this.enabled = !!(this.apiKey && this.panelUrl && this.serverId);
    }

    async updateServer() {
        if (!this.enabled) {
            console.log('[Pterodactyl] Not configured, skipping server update');
            return { success: false, message: 'Pterodactyl not configured' };
        }

        try {
            const url = `${this.panelUrl}/api/client/servers/${this.serverId}/power`;
            const response = await axios.post(url, 
                { action: 'restart' },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Accept': 'Application/vnd.pterodactyl.v1+json',
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('[Pterodactyl] Server restart/update triggered');
            return { success: true, message: 'Server restart triggered' };
        } catch (error) {
            console.error('[Pterodactyl] Failed to trigger update:', error.message);
            return { success: false, message: error.message };
        }
    }

    async reinstallServer() {
        if (!this.enabled) {
            return { success: false, message: 'Pterodactyl not configured' };
        }

        try {
            const url = `${this.panelUrl}/api/client/servers/${this.serverId}/reinstall`;
            const response = await axios.post(url, 
                {},
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Accept': 'Application/vnd.pterodactyl.v1+json',
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log('[Pterodactyl] Server reinstall triggered');
            return { success: true, message: 'Server reinstall triggered' };
        } catch (error) {
            console.error('[Pterodactyl] Failed to trigger reinstall:', error.message);
            return { success: false, message: error.message };
        }
    }

    async getServerStatus() {
        if (!this.enabled) {
            return { success: false, message: 'Pterodactyl not configured' };
        }

        try {
            const url = `${this.panelUrl}/api/client/servers/${this.serverId}/resources`;
            const response = await axios.get(url, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'Application/vnd.pterodactyl.v1+json'
                }
            });

            return { success: true, data: response.data };
        } catch (error) {
            console.error('[Pterodactyl] Failed to get status:', error.message);
            return { success: false, message: error.message };
        }
    }
}

module.exports = PterodactylManager;
