const fsp = require('node:fs/promises');
const path = require('path');
const crypto = require('node:crypto');

const SETTIMEOUT_CAP_MS = 24 * 24 * 3600 * 1000; // ~24 days

class ReminderManager {
    constructor(config, discordClient) {
        this.config = config;
        this.discordClient = discordClient;
        this.reminders = [];
        this.timers = new Map(); // id -> NodeJS.Timeout
    }

    get file() {
        return path.join(this.config.settings.dataPath, 'reminders.json');
    }

    async load() {
        try {
            const data = await fsp.readFile(this.file, 'utf8');
            this.reminders = JSON.parse(data);
        } catch (err) {
            this.reminders = [];
        }
    }

    async save() {
        await fsp.mkdir(path.dirname(this.file), { recursive: true });
        await fsp.writeFile(this.file, JSON.stringify(this.reminders, null, 2));
    }

    generateId() {
        return crypto.randomBytes(3).toString('hex');
    }

    async add(reminder) {
        reminder.id = this.generateId();
        this.reminders.push(reminder);
        await this.save();
        this.schedule(reminder);
        return reminder;
    }

    async remove(id) {
        const idx = this.reminders.findIndex(r => r.id === id);
        if (idx === -1) return false;
        this.reminders.splice(idx, 1);
        const timer = this.timers.get(id);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(id);
        }
        await this.save();
        return true;
    }

    listForGuild(guildId) {
        return this.reminders.filter(r => r.guildId === guildId);
    }

    schedule(reminder) {
        // Cancel existing timer if any
        const existing = this.timers.get(reminder.id);
        if (existing) clearTimeout(existing);

        const now = Math.floor(Date.now() / 1000);
        let delayMs = (reminder.fireAt - now) * 1000;

        // Recurring reminders: skip ahead past missed fires
        if (reminder.recurring && delayMs < 0) {
            const intervalMs = reminder.intervalSec * 1000;
            const missed = Math.ceil(-delayMs / intervalMs);
            reminder.fireAt += missed * reminder.intervalSec;
            delayMs = (reminder.fireAt - now) * 1000;
            this.save().catch(err => console.error('[Reminders] Save error:', err.message));
        }

        if (delayMs > SETTIMEOUT_CAP_MS) {
            const timer = setTimeout(() => this.schedule(reminder), SETTIMEOUT_CAP_MS);
            this.timers.set(reminder.id, timer);
            return;
        }

        const timer = setTimeout(() => this.fire(reminder), Math.max(0, delayMs));
        this.timers.set(reminder.id, timer);
    }

    async fire(reminder) {
        try {
            const channel = await this.discordClient.channels.fetch(reminder.channelId);
            if (channel && channel.isTextBased()) {
                const mentions = reminder.mentions || '';
                const content = `${mentions}\n**Reminder:** ${reminder.message}`.trim();
                await channel.send({
                    content,
                    allowedMentions: { parse: ['users', 'roles'] }
                });
            }
        } catch (err) {
            console.error(`[Reminders] Failed to fire ${reminder.id}:`, err.message);
        }

        if (reminder.recurring) {
            reminder.fireAt += reminder.intervalSec;
            await this.save();
            this.schedule(reminder);
        } else {
            await this.remove(reminder.id);
        }
    }

    async start() {
        await this.load();
        for (const reminder of this.reminders) {
            this.schedule(reminder);
        }
        console.log(`[Reminders] Loaded ${this.reminders.length} reminder(s)`);
    }

    stop() {
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        this.timers.clear();
    }
}

/**
 * Parse a duration string like "30s", "5m", "2h", "1d2h30m" into seconds.
 * Returns null if no valid units are found.
 */
function parseDuration(str) {
    if (!str) return null;
    const re = /(\d+)\s*([smhdw])/gi;
    let total = 0;
    let matched = false;
    let m;
    while ((m = re.exec(str)) !== null) {
        const n = parseInt(m[1], 10);
        const mult = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 }[m[2].toLowerCase()];
        total += n * mult;
        matched = true;
    }
    return matched ? total : null;
}

function formatDuration(sec) {
    const w = Math.floor(sec / 604800);
    sec %= 604800;
    const d = Math.floor(sec / 86400);
    sec %= 86400;
    const h = Math.floor(sec / 3600);
    sec %= 3600;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    const parts = [];
    if (w) parts.push(`${w}w`);
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    if (s || parts.length === 0) parts.push(`${s}s`);
    return parts.join(' ');
}

module.exports = ReminderManager;
module.exports.parseDuration = parseDuration;
module.exports.formatDuration = formatDuration;
