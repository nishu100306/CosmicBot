const fs = require('node:fs');
const path = require('node:path');
const { Worker } = require('node:worker_threads');
const { Client, GatewayIntentBits, Collection, Events, MessageFlags } = require('discord.js');
const BotManager = require('./bots/BotManager');
const DataLogger = require('./utils/dataLogger');
const BotConfigManager = require('./utils/botConfigManager');
const PlayerTracker = require('./utils/playerTracker');
const PlaytimeTracker = require('./utils/playtimeTracker');
const ReminderManager = require('./utils/reminderManager');

// Load main configuration
let config;
try {
    config = require('./config/main.json');
} catch (err) {
    console.error('Error loading main.json. Please copy main.example.json to main.json and configure it.');
    process.exit(1);
}

// Initialize Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// Initialize Bot Config Manager
const botsConfigPath = path.join(__dirname, config.settings.botsConfigPath || './config/bots');
const botConfigManager = new BotConfigManager(botsConfigPath);

// Initialize Bot Manager
const botManager = new BotManager(config);

// Initialize Data Logger
const dataLogger = new DataLogger(config.settings.dataPath);

// Make available globally
global.botManager = botManager;
global.dataLogger = dataLogger;
global.botConfigManager = botConfigManager;
global.config = config;
global.logChannelId = config.settings.logChannelId || null;

// Helper to save config changes to main.json
global.saveConfig = () => {
    const configPath = path.join(__dirname, 'config', 'main.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
};

// ───── Logging: write to stdout immediately, ship to Discord via worker ─────
const originalLog = console.log.bind(console);
const originalError = console.error.bind(console);

const logWorker = new Worker(path.join(__dirname, 'utils', 'logWorker.js'));

logWorker.on('message', async (msg) => {
    if (msg.type !== 'send') return;
    if (!global.logChannelId || !client.isReady()) return;
    try {
        const channel = await client.channels.fetch(global.logChannelId);
        if (channel && channel.isTextBased()) {
            await channel.send('```\n' + msg.message + '\n```');
        }
    } catch (err) {
        originalLog('[logWorker] Discord send failed:', err.message);
    }
});

logWorker.on('error', (err) => {
    originalError('[logWorker] worker error:', err);
});

logWorker.on('exit', (code) => {
    if (code !== 0) originalError(`[logWorker] exited with code ${code}`);
});

function postToLogWorker(args, isError) {
    try {
        // Convert anything that won't structured-clone (functions, etc.) to its string form first
        const safeArgs = args.map(a => {
            if (typeof a === 'function') return '[Function]';
            if (typeof a === 'symbol') return a.toString();
            return a;
        });
        logWorker.postMessage({ type: 'log', args: safeArgs, isError });
    } catch (err) {
        originalError('[logWorker] postMessage failed:', err.message);
    }
}

console.log = (...args) => {
    originalLog(...args);
    postToLogWorker(args, false);
};

console.error = (...args) => {
    originalError(...args);
    postToLogWorker(args, true);
};

// Surface silent failures straight to stdout (bypasses Discord log pipeline)
process.on('unhandledRejection', (reason) => {
    originalError('[UNHANDLED REJECTION]', reason);
});

process.on('uncaughtException', (err) => {
    originalError('[UNCAUGHT EXCEPTION]', err);
});

// ───── Heartbeat + watchdog ─────
// Heartbeat runs every 10s and reports basic health to stdout (PM2-visible, bypasses Discord).
// Watchdog detects event-loop stalls by measuring drift between expected and actual fire time.
const HEARTBEAT_INTERVAL_MS = 10_000;
const STALL_THRESHOLD_MS = 30_000;
let lastHeartbeat = Date.now();

setInterval(() => {
    const now = Date.now();
    const drift = now - lastHeartbeat - HEARTBEAT_INTERVAL_MS;
    lastHeartbeat = now;

    const mem = process.memoryUsage();
    const queueDepths = botManager.getQueueDepths ? botManager.getQueueDepths() : {};
    const totalQueueDepth = Object.values(queueDepths).reduce((a, b) => a + b, 0);

    originalLog(
        `[heartbeat] rss=${Math.round(mem.rss / 1024 / 1024)}MB ` +
        `heap=${Math.round(mem.heapUsed / 1024 / 1024)}/${Math.round(mem.heapTotal / 1024 / 1024)}MB ` +
        `discordReady=${client.isReady()} ` +
        `queueDepth=${totalQueueDepth} ` +
        `drift=${drift}ms`
    );

    if (drift > STALL_THRESHOLD_MS) {
        originalError(`[STALL DETECTED] event loop blocked for ${drift}ms`);
    }
}, HEARTBEAT_INTERVAL_MS);

// Auto leaderboard posting (multiple channels, each with its own settings)
const buildLeaderboardEmbed = require('./utils/leaderboardBuilder');

// One-time migration: convert legacy singular autoLeaderboard config to the array form
(() => {
    const legacy = config.settings.autoLeaderboard;
    if (legacy && !config.settings.autoLeaderboards) {
        config.settings.autoLeaderboards = [];
        if (legacy.enabled && legacy.channelId) {
            config.settings.autoLeaderboards.push({
                channelId: legacy.channelId,
                intervalMinutes: legacy.intervalMinutes || 60,
                timeframe: legacy.timeframe || 1,
                limit: legacy.limit || 10
            });
        }
        delete config.settings.autoLeaderboard;
        global.saveConfig();
        console.log('[AutoLeaderboard] Migrated legacy config to autoLeaderboards array');
    }
    if (!config.settings.autoLeaderboards) config.settings.autoLeaderboards = [];
})();

global.autoLeaderboardIntervals = new Map(); // channelId -> intervalId

global.startAutoLeaderboards = () => {
    global.stopAutoLeaderboards();

    const entries = config.settings.autoLeaderboards || [];
    for (const entry of entries) {
        if (!entry.channelId) continue;
        const intervalMs = entry.intervalMinutes * 60 * 1000;

        const intervalId = setInterval(async () => {
            try {
                const channel = await client.channels.fetch(entry.channelId);
                if (!channel || !channel.isTextBased()) return;

                const embed = await buildLeaderboardEmbed(dataLogger, entry.timeframe, entry.limit);
                if (embed) {
                    await channel.send({ embeds: [embed] });
                }
            } catch (err) {
                console.error(`[AutoLeaderboard:${entry.channelId}] Error posting leaderboard:`, err.message);
            }
        }, intervalMs);

        global.autoLeaderboardIntervals.set(entry.channelId, intervalId);
        console.log(`[AutoLeaderboard] Started for channel ${entry.channelId} — every ${entry.intervalMinutes} min`);
    }
};

global.stopAutoLeaderboards = () => {
    for (const intervalId of global.autoLeaderboardIntervals.values()) {
        clearInterval(intervalId);
    }
    global.autoLeaderboardIntervals.clear();
};

// Load Discord commands
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            command.category = folder;
            client.commands.set(command.data.name, command);
            console.log(`[Discord] Loaded command: ${command.data.name}`);
        } else {
            console.log(`[WARNING] Command at ${filePath} is missing "data" or "execute" property.`);
        }
    }
}

// Discord bot ready event
client.once(Events.ClientReady, async (c) => {
    console.log(`[Discord] Logged in as ${c.user.tag}`);

    // Load and initialize Mineflayer bots from config files
    const botConfigs = await botConfigManager.loadAllConfigs();
    const enabledBots = botConfigs.filter(bot => bot.enabled);

    console.log(`Found ${botConfigs.length} bot configuration(s), ${enabledBots.length} enabled`);

    // Stagger bot startup to avoid the server's "logging in too fast" rate limit
    const startupDelayMs = 8000;
    for (let i = 0; i < enabledBots.length; i++) {
        const botConfig = enabledBots[i];
        try {
            botManager.createBot(botConfig);
        } catch (err) {
            console.error(`Failed to start bot ${botConfig.id}:`, err.message);
        }
        if (i < enabledBots.length - 1) {
            await new Promise(resolve => setTimeout(resolve, startupDelayMs));
        }
    }

    // Start auto leaderboards if configured
    global.startAutoLeaderboards();

    // Start player tracker if configured
    global.playerTracker = new PlayerTracker(config, botManager, client);
    if (config.settings.trackPlayers?.enabled) {
        await global.playerTracker.start();
    }

    // Start playtime tracker if configured
    global.playtimeTracker = new PlaytimeTracker(config, botManager);
    if (config.settings.playtimeTracker?.enabled) {
        await global.playtimeTracker.start();
    }

    // Load and schedule persisted reminders
    global.reminderManager = new ReminderManager(config, client);
    await global.reminderManager.start();
});

// Handle Discord slash commands
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    // Role-based permission check (bypass users skip this)
    const isBypassed = config.settings.bypassUsers?.includes(interaction.user.id);
    const requiredRoleId = config.settings.roles?.[command.category];
    if (requiredRoleId && !isBypassed && !interaction.member.roles.cache.has(requiredRoleId)) {
        await interaction.reply({
            content: `You need the <@&${requiredRoleId}> role to use this command.`,
            flags: MessageFlags.Ephemeral
        });
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing command ${interaction.commandName}:`, error);

        const errorMessage = {
            content: 'There was an error while executing this command!',
            flags: MessageFlags.Ephemeral
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});

// Handle bot manager events
// ───── Chat log forwarding (one batch per bot per second) ─────
const chatLogBuffers = new Map(); // botId -> { channelId, lines: [], timer }

botManager.on('botChat', (botId, channelId, msg) => {
    let entry = chatLogBuffers.get(botId);
    if (!entry || entry.channelId !== channelId) {
        // Channel changed (or first time) — flush old buffer if needed
        if (entry && entry.timer) clearTimeout(entry.timer);
        entry = { channelId, lines: [], timer: null };
        chatLogBuffers.set(botId, entry);
    }
    entry.lines.push(msg);

    if (!entry.timer) {
        entry.timer = setTimeout(async () => {
            entry.timer = null;
            const lines = entry.lines.splice(0, entry.lines.length);
            if (lines.length === 0 || !client.isReady()) return;
            const content = '```\n' + lines.join('\n').slice(0, 1900) + '\n```';
            try {
                const channel = await client.channels.fetch(entry.channelId);
                if (channel && channel.isTextBased()) {
                    await channel.send({ content, allowedMentions: { parse: [] } });
                }
            } catch (err) {
                originalLog(`[chatLog:${botId}] send failed:`, err.message);
            }
        }, 1000);
    }
});

botManager.on('topLogRequest', async (botId, bot) => {
    console.log(`[${botId}] Top log requested`);
    const queue = botManager.getQueue(botId);
    if (!queue) return;
    const { PRIORITY } = require('./utils/BotQueue');
    const result = await queue.enqueue('logTopData', (b) => dataLogger.logTopData(b, config.settings.shortPause), {
        priority: PRIORITY.LOW,
        timeoutMs: 180_000
    });
    if (!result.ok) {
        console.error(`[${botId}] logTopData failed: ${result.reason} - ${result.error?.message || result.error}`);
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    botManager.stopAllBots();
    client.destroy();
    process.exit(0);
});

// Login to Discord
client.login(config.discord.token).catch(err => {
    console.error('Failed to login to Discord:', err);
    process.exit(1);
});
