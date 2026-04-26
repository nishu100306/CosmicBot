const fsp = require('node:fs/promises');
const path = require('path');
const getOnlinePlayers = require('./getOnlinePlayers');

class PlaytimeTracker {
    constructor(config, botManager) {
        this.config = config;
        this.botManager = botManager;
        this.interval = null;
    }

    get ptConfig() {
        return this.config.settings.playtimeTracker;
    }

    get playtimeDir() {
        return path.join(this.config.settings.dataPath, 'playtime');
    }

    fileFor(playerName) {
        const safe = playerName.toLowerCase().replace(/[^a-z0-9_]/g, '');
        return path.join(this.playtimeDir, `${safe}.txt`);
    }

    async ensureDir() {
        await fsp.mkdir(this.playtimeDir, { recursive: true });
    }

    async pollOnce() {
        const botId = this.config.settings.defaultBot;
        const bot = this.botManager.getBot(botId);
        if (!bot) return;

        const botStatus = this.botManager.getBotStatus(botId);
        if (botStatus.status !== 'online') return;

        let onlineNames;
        try {
            onlineNames = await getOnlinePlayers(bot);
        } catch (err) {
            console.error('[PlaytimeTracker] Error fetching online players:', err.message);
            return;
        }

        const now = Math.floor(Date.now() / 1000);
        await Promise.all(
            onlineNames.map(name => fsp.appendFile(this.fileFor(name), `${now}\n`))
        );
    }

    async start() {
        this.stop();
        if (!this.ptConfig?.enabled) return;
        await this.ensureDir();
        this.interval = setInterval(() => {
            this.pollOnce().catch(err => console.error('[PlaytimeTracker] Error:', err));
        }, this.ptConfig.intervalMs);
        console.log(`[PlaytimeTracker] Started — polling every ${this.ptConfig.intervalMs}ms`);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            console.log('[PlaytimeTracker] Stopped');
        }
    }

    /**
     * Sum playtime over [startTs, endTs] (Unix seconds).
     * Sessions are derived: consecutive snapshots within 2*intervalSec are one session.
     */
    async getPlaytime(playerName, startTs, endTs) {
        const file = this.fileFor(playerName);
        let data;
        try {
            data = await fsp.readFile(file, 'utf8');
        } catch (err) {
            return { total: 0, sessionCount: 0, lastSeen: null };
        }

        const intervalSec = this.ptConfig.intervalMs / 1000;
        const gapThreshold = intervalSec * 2;

        const timestamps = data.split('\n')
            .map(l => parseInt(l, 10))
            .filter(t => !isNaN(t));

        if (timestamps.length === 0) {
            return { total: 0, sessionCount: 0, lastSeen: null };
        }

        const lastSeen = timestamps[timestamps.length - 1];
        let total = 0;
        let sessionCount = 0;
        let sessionStart = timestamps[0];
        let prev = timestamps[0];

        const closeSession = (start, end) => {
            const overlap = Math.min(end, endTs) - Math.max(start, startTs);
            if (overlap > 0) {
                total += overlap;
                sessionCount++;
            }
        };

        for (let i = 1; i < timestamps.length; i++) {
            const t = timestamps[i];
            if (t - prev > gapThreshold) {
                closeSession(sessionStart, prev);
                sessionStart = t;
            }
            prev = t;
        }
        closeSession(sessionStart, prev);

        return { total, sessionCount, lastSeen };
    }
}

module.exports = PlaytimeTracker;
