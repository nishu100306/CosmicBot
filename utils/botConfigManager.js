const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

class BotConfigManager {
    constructor(botsConfigPath) {
        this.botsConfigPath = botsConfigPath;
        this.ensureConfigDirectory();
    }

    /**
     * Ensure the bots config directory exists
     */
    ensureConfigDirectory() {
        if (!fs.existsSync(this.botsConfigPath)) {
            fs.mkdirSync(this.botsConfigPath, { recursive: true });
        }
    }

    /**
     * Load all bot configurations
     */
    async loadAllConfigs() {
        try {
            const files = await fsp.readdir(this.botsConfigPath);
            const jsonFiles = files.filter(f => f.endsWith('.json') && !f.endsWith('.example.json'));

            const configs = [];
            for (const file of jsonFiles) {
                try {
                    const filePath = path.join(this.botsConfigPath, file);
                    const content = await fsp.readFile(filePath, 'utf8');
                    const config = JSON.parse(content);
                    configs.push(config);
                } catch (err) {
                    console.error(`Error loading bot config ${file}:`, err.message);
                }
            }

            return configs;
        } catch (err) {
            console.error('Error loading bot configs:', err);
            return [];
        }
    }

    /**
     * Load a single bot configuration by ID
     */
    async loadConfig(botId) {
        try {
            const filePath = path.join(this.botsConfigPath, `${botId}.json`);
            const content = await fsp.readFile(filePath, 'utf8');
            return JSON.parse(content);
        } catch (err) {
            return null;
        }
    }

    /**
     * Save a bot configuration
     */
    async saveConfig(botConfig) {
        try {
            if (!botConfig.id) {
                throw new Error('Bot config must have an id');
            }

            const filePath = path.join(this.botsConfigPath, `${botConfig.id}.json`);
            await fsp.writeFile(filePath, JSON.stringify(botConfig, null, 2), 'utf8');
            return true;
        } catch (err) {
            console.error('Error saving bot config:', err);
            return false;
        }
    }

    /**
     * Delete a bot configuration
     */
    async deleteConfig(botId) {
        try {
            const filePath = path.join(this.botsConfigPath, `${botId}.json`);

            // Check if file exists
            if (!fs.existsSync(filePath)) {
                return false;
            }

            await fsp.unlink(filePath);
            return true;
        } catch (err) {
            console.error('Error deleting bot config:', err);
            return false;
        }
    }

    /**
     * Check if a bot config exists
     */
    async configExists(botId) {
        const filePath = path.join(this.botsConfigPath, `${botId}.json`);
        return fs.existsSync(filePath);
    }

    /**
     * List all bot IDs
     */
    async listBotIds() {
        try {
            const files = await fsp.readdir(this.botsConfigPath);
            return files
                .filter(f => f.endsWith('.json') && !f.endsWith('.example.json'))
                .map(f => f.replace('.json', ''));
        } catch (err) {
            console.error('Error listing bot IDs:', err);
            return [];
        }
    }

    /**
     * Validate bot configuration
     */
    validateConfig(config) {
        const errors = [];

        if (!config.id) errors.push('Missing required field: id');
        if (!config.username) errors.push('Missing required field: username');
        if (!config.host) errors.push('Missing required field: host');
        if (!config.auth) errors.push('Missing required field: auth');

        // Validate auth type
        const validAuthTypes = ['microsoft', 'mojang', 'offline'];
        if (config.auth && !validAuthTypes.includes(config.auth)) {
            errors.push(`Invalid auth type. Must be one of: ${validAuthTypes.join(', ')}`);
        }

        // Validate port
        if (config.port && (config.port < 1 || config.port > 65535)) {
            errors.push('Port must be between 1 and 65535');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Create a default bot configuration
     */
    createDefaultConfig(botId) {
        return {
            id: botId,
            enabled: true,
            username: 'BotUsername',
            password: '',
            auth: 'microsoft',
            host: 'play.server.com',
            port: 25565,
            version: '1.20.4',
            proxy: {
                enabled: false,
                host: '',
                port: 0,
                type: 'socks5',
                username: '',
                password: ''
            },
            periodicTasks: {
                enabled: true,
                interval: 60000,
                commands: ['/join'],
                logTopEveryNCycles: 10
            }
        };
    }
}

module.exports = BotConfigManager;
