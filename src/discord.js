const axios = require('axios');

class DiscordManager {
    constructor() {
        this.webhookUrl = process.env.DISCORD_WEBHOOK_URL || '';
        this.enabled = process.env.DISCORD_ENABLED === 'true' && !!this.webhookUrl;
        this.serverName = process.env.DISCORD_SERVER_NAME || 'Rust Server';
        this.serverIp = process.env.DISCORD_SERVER_IP || '';
        this.sidebarColor = process.env.DISCORD_SIDEBAR_COLOR || '#FF0000';
    }

    isEnabled() {
        return this.enabled && !!this.webhookUrl;
    }

    async sendWebhook(payload) {
        if (!this.isEnabled()) {
            return { success: false, message: 'Discord not enabled' };
        }

        try {
            await axios.post(this.webhookUrl, payload);
            return { success: true };
        } catch (error) {
            console.error('[Discord] Webhook error:', error.message);
            return { success: false, message: error.message };
        }
    }

    async wipeCountdown(minutesAhead = 60) {
        if (!this.isEnabled()) return { success: false };

        const timestamp = Math.floor((Date.now() + minutesAhead * 60000) / 1000);
        
        const payload = {
            embeds: [{
                title: 'Wipe Countdown!',
                description: `${this.serverName} wiping in <t:${timestamp}:R>\n${this.serverIp}`,
                color: parseInt(this.sidebarColor.replace('#', ''), 16),
                timestamp: new Date().toISOString()
            }]
        };

        return this.sendWebhook(payload);
    }

    async justWiped() {
        if (!this.isEnabled()) return { success: false };

        const payload = {
            embeds: [{
                title: 'Just Wiped!',
                description: `${this.serverName} has just been wiped!\n${this.serverIp}`,
                color: parseInt(this.sidebarColor.replace('#', ''), 16),
                timestamp: new Date().toISOString()
            }]
        };

        return this.sendWebhook(payload);
    }

    async test() {
        if (!this.isEnabled()) return { success: false, message: 'Discord not enabled or no webhook URL' };

        const payload = {
            embeds: [{
                title: 'Test',
                description: 'Discord integration working!',
                color: parseInt(this.sidebarColor.replace('#', ''), 16),
                timestamp: new Date().toISOString()
            }]
        };

        return this.sendWebhook(payload);
    }

    updateConfig(config) {
        if (config.enabled !== undefined) {
            this.enabled = config.enabled && !!(config.webhookUrl || this.webhookUrl);
            process.env.DISCORD_ENABLED = this.enabled ? 'true' : 'false';
        }
        if (config.webhookUrl !== undefined) {
            this.webhookUrl = config.webhookUrl;
            process.env.DISCORD_WEBHOOK_URL = config.webhookUrl;
            if (config.enabled !== undefined) {
                this.enabled = config.enabled && !!this.webhookUrl;
                process.env.DISCORD_ENABLED = this.enabled ? 'true' : 'false';
            }
        }
        if (config.serverName !== undefined) {
            this.serverName = config.serverName;
            process.env.DISCORD_SERVER_NAME = config.serverName;
        }
        if (config.serverIp !== undefined) {
            this.serverIp = config.serverIp;
            process.env.DISCORD_SERVER_IP = config.serverIp;
        }
        if (config.sidebarColor !== undefined) {
            this.sidebarColor = config.sidebarColor;
            process.env.DISCORD_SIDEBAR_COLOR = config.sidebarColor;
        }

        return this.getConfig();
    }

    getConfig() {
        return {
            enabled: this.enabled && !!this.webhookUrl,
            webhookUrl: this.webhookUrl,
            serverName: this.serverName,
            serverIp: this.serverIp,
            sidebarColor: this.sidebarColor
        };
    }
}

module.exports = DiscordManager;
