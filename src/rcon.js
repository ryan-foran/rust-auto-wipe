const { Rcon } = require('rcon-client');

class RustRcon {
    constructor(config) {
        this.config = {
            host: config.host || '127.0.0.1',
            port: config.port || 28016,
            password: config.password || '',
        };
        this.client = null;
        this.connected = false;
    }

    async connect() {
        try {
            this.client = new Rcon({
                host: this.config.host,
                port: this.config.port,
                password: this.config.password,
            });

            this.client.on('connect', () => {
                console.log('[RCON] Connected to Rust server');
                this.connected = true;
            });

            this.client.on('end', () => {
                console.log('[RCON] Disconnected from Rust server');
                this.connected = false;
            });

            this.client.on('error', (err) => {
                console.error('[RCON] Error:', err.message);
                this.connected = false;
            });

            await this.client.connect();
            return true;
        } catch (error) {
            console.error('[RCON] Connection failed:', error.message);
            this.connected = false;
            return false;
        }
    }

    async disconnect() {
        if (this.client && this.connected) {
            await this.client.end();
            this.connected = false;
        }
    }

    async sendCommand(command) {
        if (!this.connected || !this.client) {
            throw new Error('RCON not connected');
        }
        try {
            const response = await this.client.send(command);
            return response;
        } catch (error) {
            console.error('[RCON] Command failed:', error.message);
            throw error;
        }
    }

    async getServerInfo() {
        try {
            const response = await this.sendCommand('serverinfo');
            return response;
        } catch (error) {
            return null;
        }
    }

    async say(message) {
        return this.sendCommand(`say ${message}`);
    }

    async global(message) {
        return this.sendCommand(`global.say ${message}`);
    }
}

module.exports = RustRcon;
