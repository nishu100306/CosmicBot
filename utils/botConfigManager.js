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

    static normalizeId(id) {
        return typeof id === 'string' ? id.toLowerCase().trim() : id;
    }

    /**
     * Find the actual filename for a botId, matching case-insensitively.
     * Returns the basename (e.g. "bot1.json") or null.
     */
    async _findConfigFile(botId) {
        const target = BotConfigManager.normalizeId(botId) + '.json';
        try {
            const files = await fsp.readdir(this.botsConfigPath);
            return files.find(f => f.toLowerCase() === target) || null;
        } catch (err) {
            return null;
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
                    if (config.id) config.id = BotConfigManager.normalizeId(config.id);
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
     * Load a single bot configuration by ID (case-insensitive)
     */
    async loadConfig(botId) {
        try {
            const file = await this._findConfigFile(botId);
            if (!file) return null;
            const filePath = path.join(this.botsConfigPath, file);
            const content = await fsp.readFile(filePath, 'utf8');
            const parsed = JSON.parse(content);
            if (parsed.id) parsed.id = BotConfigManager.normalizeId(parsed.id);
            return parsed;
        } catch (err) {
            return null;
        }
    }

    /**
     * Save a bot configuration. Filename is always lowercase.
     */
    async saveConfig(botConfig) {
        try {
            if (!botConfig.id) {
                throw new Error('Bot config must have an id');
            }
            botConfig.id = BotConfigManager.normalizeId(botConfig.id);

            // If a differently-cased file exists, remove it so we don't end up with two
            const existing = await this._findConfigFile(botConfig.id);
            if (existing && existing !== `${botConfig.id}.json`) {
                await fsp.unlink(path.join(this.botsConfigPath, existing)).catch(() => {});
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
     * Delete a bot configuration (case-insensitive)
     */
    async deleteConfig(botId) {
        try {
            const file = await this._findConfigFile(botId);
            if (!file) return false;
            await fsp.unlink(path.join(this.botsConfigPath, file));
            return true;
        } catch (err) {
            console.error('Error deleting bot config:', err);
            return false;
        }
    }

    /**
     * Check if a bot config exists (case-insensitive)
     */
    async configExists(botId) {
        const file = await this._findConfigFile(botId);
        return !!file;
    }

    /**
     * List all bot IDs (always lowercase)
     */
    async listBotIds() {
        try {
            const files = await fsp.readdir(this.botsConfigPath);
            return files
                .filter(f => f.endsWith('.json') && !f.endsWith('.example.json'))
                .map(f => BotConfigManager.normalizeId(f.replace('.json', '')));
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
