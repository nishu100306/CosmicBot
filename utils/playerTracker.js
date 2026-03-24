const fsp = require('node:fs/promises');
const path = require('path');
const wait = require('node:timers/promises').setTimeout;
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const getInstancePlayers = require('./getInstancePlayers');
const getDimension = require('./getDimension');
const EmbedHelper = require('./embedBuilder');

class PlayerTracker {
    constructor(config, botManager, discordClient) {
        this.config = config;
        this.botManager = botManager;
        this.discordClient = discordClient;
        this.interval = null;
        this.seenPlayers = new Set();
        this.commandQueue = [];
        this.processingQueue = false;
    }

    async queueCommand(command) {
        return new Promise((resolve, reject) => {
            this.commandQueue.push({ command, resolve, reject });
            this.processQueue();
        });
    }

    async processQueue() {
        if (this.processingQueue) return;
        this.processingQueue = true;

        while (this.commandQueue.length > 0) {
            const { command, resolve, reject } = this.commandQueue.shift();
            try {
                const botId = this.config.settings.defaultBot;
                const bot = this.botManager.getBot(botId);
                if (!bot) {
                    reject(new Error('Bot not available'));
                    continue;
                }
                const shortPause = this.config.settings.shortPause;
                await wait(shortPause);
                await bot.chat(command);
                await wait(shortPause);
                resolve();
            } catch (err) {
                reject(err);
            }
        }

        this.processingQueue = false;
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

    async sendBanPrompt(channel, playerName, wasBanned = false, isRevival = false) {
        const embed = EmbedHelper.createBaseEmbed()
            .setTitle('New Player Detected')
            .setThumbnail(`https://mineskin.eu/bust/${playerName}/100.png`)
            .setDescription(`**${playerName}** joined the instance.\n\nBan this player?`);

        const buttons = [
            new ButtonBuilder()
                .setCustomId(`ban_yes_${playerName}`)
                .setLabel(`/is ban ${playerName}`)
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`ban_no_${playerName}`)
                .setLabel('Ignore')
                .setStyle(ButtonStyle.Secondary)
        ];

        if (wasBanned) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`unban_${playerName}`)
                    .setLabel(`/is unban ${playerName}`)
                    .setStyle(ButtonStyle.Success)
            );
        }

        const row = new ActionRowBuilder().addComponents(buttons);
        const pingRoleId = this.tpConfig.pingRoleId;
        const content = (!isRevival && pingRoleId) ? `<@&${pingRoleId}>` : undefined;
        const message = await channel.send({ content, embeds: [embed], components: [row] });

        try {
            const selection = await message.awaitMessageComponent({ time: 300_000 });

            if (selection.customId === `ban_yes_${playerName}`) {
                await selection.deferUpdate();
                await this.queueCommand(`/is ban ${playerName}`);

                const doneEmbed = EmbedHelper.createBaseEmbed()
                    .setTitle('Player Banned')
                    .setThumbnail(`https://mineskin.eu/bust/${playerName}/100.png`)
                    .setDescription(`Executed \`/is ban ${playerName}\``);

                await message.edit({ embeds: [doneEmbed], components: [] });
                await message.react('🔄');
                this.listenForRevive(message, channel, playerName, true);
            } else if (selection.customId === `unban_${playerName}`) {
                await selection.deferUpdate();
                await this.queueCommand(`/is unban ${playerName}`);

                const doneEmbed = EmbedHelper.createBaseEmbed()
                    .setTitle('Player Unbanned')
                    .setThumbnail(`https://mineskin.eu/bust/${playerName}/100.png`)
                    .setDescription(`Executed \`/is unban ${playerName}\``);

                await message.edit({ embeds: [doneEmbed], components: [] });
                await message.react('🔄');
                this.listenForRevive(message, channel, playerName, false);
            } else {
                const ignoredEmbed = EmbedHelper.createBaseEmbed()
                    .setTitle('Player Ignored')
                    .setThumbnail(`https://mineskin.eu/bust/${playerName}/100.png`)
                    .setDescription(`**${playerName}** was ignored.`);

                await selection.update({ embeds: [ignoredEmbed], components: [] });
                await message.react('🔄');
                this.listenForRevive(message, channel, playerName, false);
            }
        } catch (err) {
            // Timed out — remove buttons
            const expiredEmbed = EmbedHelper.createBaseEmbed()
                .setTitle('New Player Detected')
                .setThumbnail(`https://mineskin.eu/bust/${playerName}/100.png`)
                .setDescription(`**${playerName}** joined the instance.\n\n*Selection timed out.*`);

            await message.edit({ embeds: [expiredEmbed], components: [] }).catch(() => {});
            await message.react('🔄').catch(() => {});
            this.listenForRevive(message, channel, playerName, false);
        }
    }

    async autoBan(channel, playerName) {
        try {
            await this.queueCommand(`/is ban ${playerName}`);

            const embed = EmbedHelper.createBaseEmbed()
                .setTitle('Player Auto-Banned')
                .setThumbnail(`https://mineskin.eu/bust/${playerName}/100.png`)
                .setDescription(`Automatically executed \`/is ban ${playerName}\``);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`unban_${playerName}`)
                    .setLabel(`/is unban ${playerName}`)
                    .setStyle(ButtonStyle.Success)
            );

            const message = await channel.send({ embeds: [embed], components: [row] });

            try {
                const selection = await message.awaitMessageComponent({ time: 300_000 });

                if (selection.customId === `unban_${playerName}`) {
                    await selection.deferUpdate();
                    await this.queueCommand(`/is unban ${playerName}`);

                    const doneEmbed = EmbedHelper.createBaseEmbed()
                        .setTitle('Player Unbanned')
                        .setThumbnail(`https://mineskin.eu/bust/${playerName}/100.png`)
                        .setDescription(`Executed \`/is unban ${playerName}\``);

                    await message.edit({ embeds: [doneEmbed], components: [] });
                    await message.react('🔄');
                    this.listenForRevive(message, channel, playerName, false);
                }
            } catch (err) {
                await message.edit({ components: [] }).catch(() => {});
                await message.react('🔄').catch(() => {});
                this.listenForRevive(message, channel, playerName, true);
            }
        } catch (err) {
            console.error('[PlayerTracker] Auto-ban error:', err.message);
        }
    }

    async addToWhitelist(playerName) {
        const lowerName = playerName.toLowerCase();
        if (!this.seenPlayers.has(lowerName)) {
            this.seenPlayers.add(lowerName);
            await fsp.appendFile(this.seenFile, playerName + '\n');
        }
    }

    listenForRevive(message, channel, playerName, wasBanned) {
        const filter = (reaction, user) => reaction.emoji.name === '🔄' && !user.bot;

        message.awaitReactions({ filter, max: 1 }).then(async () => {
            await message.reactions.removeAll().catch(() => {});
            await this.sendBanPrompt(channel, playerName, wasBanned, true);
        }).catch(() => {});
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
                            if (this.tpConfig.automatic) {
                                this.autoBan(channel, name);
                            } else {
                                this.sendBanPrompt(channel, name);
                            }
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
