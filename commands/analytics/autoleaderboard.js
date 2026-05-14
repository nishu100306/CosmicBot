const { SlashCommandBuilder, ChannelType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoleaderboard')
        .setDescription('Configure automatic leaderboard posting (multiple channels supported)')
        .addSubcommand(sub => sub
            .setName('add')
            .setDescription('Add or update an auto-leaderboard for a channel')
            .addChannelOption(o => o
                .setName('channel')
                .setDescription('Channel to post leaderboard in')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
            .addIntegerOption(o => o
                .setName('interval')
                .setDescription('Minutes between posts (default: 60)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(1440))
            .addIntegerOption(o => o
                .setName('timeframe')
                .setDescription('Leaderboard timeframe in hours (default: 1)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(168))
            .addIntegerOption(o => o
                .setName('limit')
                .setDescription('Number of islands to show (default: 10)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(25)))
        .addSubcommand(sub => sub
            .setName('remove')
            .setDescription('Remove an auto-leaderboard for a channel')
            .addChannelOption(o => o
                .setName('channel')
                .setDescription('Channel to stop posting in')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)))
        .addSubcommand(sub => sub
            .setName('list')
            .setDescription('List all configured auto-leaderboards')),
    async execute(interaction) {
        const config = global.config;
        if (!config.settings.autoLeaderboards) config.settings.autoLeaderboards = [];
        const entries = config.settings.autoLeaderboards;

        const sub = interaction.options.getSubcommand();

        if (sub === 'list') {
            if (entries.length === 0) {
                await interaction.reply({
                    content: 'No auto-leaderboards configured.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }
            const lines = entries.map(e =>
                `<#${e.channelId}> — every **${e.intervalMinutes}** min, **${e.timeframe}h** timeframe, **${e.limit}** islands`
            );
            await interaction.reply({
                content: '**Auto Leaderboards:**\n' + lines.join('\n'),
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (sub === 'remove') {
            const channel = interaction.options.getChannel('channel');
            const idx = entries.findIndex(e => e.channelId === channel.id);
            if (idx === -1) {
                await interaction.reply({
                    content: `No auto-leaderboard configured for <#${channel.id}>.`,
                    flags: MessageFlags.Ephemeral
                });
                return;
            }
            entries.splice(idx, 1);
            global.saveConfig();
            global.startAutoLeaderboards();
            await interaction.reply({
                content: `✅ Removed auto-leaderboard for <#${channel.id}>.`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        if (sub === 'add') {
            const channel = interaction.options.getChannel('channel');
            const interval = interaction.options.getInteger('interval');
            const timeframe = interaction.options.getInteger('timeframe');
            const limit = interaction.options.getInteger('limit');

            let entry = entries.find(e => e.channelId === channel.id);
            const isNew = !entry;
            if (!entry) {
                entry = { channelId: channel.id, intervalMinutes: 60, timeframe: 1, limit: 10 };
                entries.push(entry);
            }
            if (interval !== null) entry.intervalMinutes = interval;
            if (timeframe !== null) entry.timeframe = timeframe;
            if (limit !== null) entry.limit = limit;

            global.saveConfig();
            global.startAutoLeaderboards();

            await interaction.reply({
                content: `✅ ${isNew ? 'Added' : 'Updated'} auto-leaderboard for <#${channel.id}>:\n` +
                    `**Interval:** ${entry.intervalMinutes} min\n` +
                    `**Timeframe:** ${entry.timeframe} hours\n` +
                    `**Limit:** ${entry.limit} islands`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }
    },
};
