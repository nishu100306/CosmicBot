const fs = require('node:fs');
const path = require('node:path');
const { Client, GatewayIntentBits, Collection, Events, MessageFlags } = require('discord.js');
const BotManager = require('./bots/BotManager');
const DataLogger = require('./utils/dataLogger');
const BotConfigManager = require('./utils/botConfigManager');

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
        GatewayIntentBits.MessageContent
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

// Intercept console output and forward to Discord channel
const originalLog = console.log.bind(console);
const originalError = console.error.bind(console);
let logBuffer = [];
let flushTimeout = null;

async function flushLogBuffer() {
    flushTimeout = null;

    if (logBuffer.length === 0 || !global.logChannelId || !client.isReady()) {
        return;
    }

    const message = logBuffer.join('\n').slice(0, 1900);
    logBuffer = [];

    try {
        const channel = await client.channels.fetch(global.logChannelId);
        if (channel && channel.isTextBased()) {
            await channel.send('```\n' + message + '\n```');
        }
    } catch (err) {
        originalLog('[flushLogBuffer] Error sending to Discord:', err.message);
    }
}

function queueLogMessage(args) {
    const text = args.map(a => typeof a === 'string' ? a : JSON.stringify(a, null, 2)).join(' ');
    logBuffer.push(text);

    if (!flushTimeout) {
        flushTimeout = setTimeout(() => {
            flushLogBuffer().catch(err => {
                originalLog('[flushLogBuffer] Error:', err);
            });
        }, 1000);
    }
}

console.log = (...args) => {
    originalLog(...args);
    queueLogMessage(args);
};

console.error = (...args) => {
    originalError(...args);
    queueLogMessage(['[ERROR]', ...args]);
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

    for (const botConfig of enabledBots) {
        try {
            botManager.createBot(botConfig);
        } catch (err) {
            console.error(`Failed to start bot ${botConfig.id}:`, err.message);
        }
    }
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
botManager.on('topLogRequest', async (botId, bot) => {
    console.log(`[${botId}] Top log requested`);
    await dataLogger.logTopData(bot, config.settings.shortPause);
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
