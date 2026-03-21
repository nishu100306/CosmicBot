const fsp = require('node:fs/promises');
const path = require('path');
const getInstancePlayers = require('./getInstancePlayers');
const getDimension = require('./getDimension');

class PlayerTracker {
    constructor(config, botManager, discordClient) {
        this.config = config;
        this.botManager = botManager;
        this.discordClient = discordClient;
        this.interval = null;
        this.seenPlayers = new Set();
    }

    get tpConfig() {
        return this.config.settings.trackPlayers;
    }

    get seenFile() {
        return path.join(this.config.settings.dataPath, 'trackedPlayers.txt');
    }

    async loadSeenPlayers() {
        this.seenPlayers.clear();
        try {
            const data = await fsp.readFile(this.seenFile, 'utf8');
            for (const line of data.split('\n')) {
                const name = line.trim();
                if (name) this.seenPlayers.add(name.toLowerCase());
            }
        } catch (err) {
            // File doesn't exist yet
        }
    }

    async start() {
        this.stop();

        if (!this.tpConfig?.enabled || !this.tpConfig.channelId) return;

        await this.loadSeenPlayers();

        this.interval = setInterval(async () => {
            try {
                const botId = this.config.settings.defaultBot;
                const bot = this.botManager.getBot(botId);
                if (!bot) return;

                const botStatus = this.botManager.getBotStatus(botId);
                if (botStatus.status !== 'online') return;

                const blacklist = this.config.settings.dimensionBlacklist || [];
                const dimension = getDimension(bot);
                if (blacklist.includes(dimension)) return;

                const players = getInstancePlayers(bot);
                const newPlayers = [];

                for (const name of players) {
                    if (!this.seenPlayers.has(name.toLowerCase())) {
                        this.seenPlayers.add(name.toLowerCase());
                        newPlayers.push(name);
                    }
                }

                if (newPlayers.length > 0) {
                    await fsp.appendFile(this.seenFile, newPlayers.join('\n') + '\n');

                    const channel = await this.discordClient.channels.fetch(this.tpConfig.channelId);
                    if (channel && channel.isTextBased()) {
                        for (const name of newPlayers) {
                            await channel.send(`\`\`\`\n/is ban ${name}\n\`\`\``);
                        }
                    }
                }
            } catch (err) {
                console.error('[PlayerTracker] Error:', err.message);
            }
        }, this.tpConfig.intervalMs);

        console.log(`[PlayerTracker] Started — checking every ${this.tpConfig.intervalMs}ms, posting to channel ${this.tpConfig.channelId}`);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            console.log('[PlayerTracker] Stopped');
        }
    }
}

module.exports = PlayerTracker;
