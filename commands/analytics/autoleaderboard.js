const { SlashCommandBuilder, ChannelType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoleaderboard')
        .setDescription('Configure automatic leaderboard posting')
        .addStringOption(option =>
            option.setName('toggle')
                .setDescription('Enable or disable auto-posting')
                .setRequired(false)
                .addChoices(
                    { name: 'On', value: 'on' },
                    { name: 'Off', value: 'off' }
                )
        )
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to post leaderboard in')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName('interval')
                .setDescription('Minutes between posts (default: 60)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(1440)
        )
        .addIntegerOption(option =>
            option.setName('timeframe')
                .setDescription('Leaderboard timeframe in hours (default: 1)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(168)
        )
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Number of islands to show (default: 10)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(25)
        ),
    async execute(interaction) {
        const config = global.config;

        // Initialize autoLeaderboard config if missing
        if (!config.settings.autoLeaderboard) {
            config.settings.autoLeaderboard = {
                enabled: false,
                channelId: null,
                intervalMinutes: 60,
                timeframe: 1,
                limit: 10
            };
        }

        const alConfig = config.settings.autoLeaderboard;
        const toggle = interaction.options.getString('toggle');
        const channel = interaction.options.getChannel('channel');
        const interval = interaction.options.getInteger('interval');
        const timeframe = interaction.options.getInteger('timeframe');
        const limit = interaction.options.getInteger('limit');

        // No args — show current status
        if (!toggle && !channel && !interval && !timeframe && !limit) {
            const status = alConfig.enabled ? 'Enabled' : 'Disabled';
            const ch = alConfig.channelId ? `<#${alConfig.channelId}>` : 'Not set';
            await interaction.reply({
                content: `**Auto Leaderboard Status**\n` +
                    `**Status:** ${status}\n` +
                    `**Channel:** ${ch}\n` +
                    `**Interval:** ${alConfig.intervalMinutes} minutes\n` +
                    `**Timeframe:** ${alConfig.timeframe} hours\n` +
                    `**Limit:** ${alConfig.limit} islands`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        // Apply changes
        if (channel) alConfig.channelId = channel.id;
        if (interval) alConfig.intervalMinutes = interval;
        if (timeframe) alConfig.timeframe = timeframe;
        if (limit) alConfig.limit = limit;

        if (toggle === 'on') {
            if (!alConfig.channelId) {
                await interaction.reply({
                    content: 'Please set a channel first: `/autoleaderboard channel:#channel toggle:on`',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }
            alConfig.enabled = true;
        } else if (toggle === 'off') {
            alConfig.enabled = false;
        }

        // If a channel was set without explicit toggle, enable it
        if (channel && !toggle) {
            alConfig.enabled = true;
        }

        global.saveConfig();

        // Restart or stop the timer
        if (alConfig.enabled) {
            global.startAutoLeaderboard();
        } else {
            global.stopAutoLeaderboard();
        }

        const status = alConfig.enabled ? 'Enabled' : 'Disabled';
        const ch = alConfig.channelId ? `<#${alConfig.channelId}>` : 'Not set';
        await interaction.reply({
            content: `**Auto Leaderboard Updated**\n` +
                `**Status:** ${status}\n` +
                `**Channel:** ${ch}\n` +
                `**Interval:** ${alConfig.intervalMinutes} minutes\n` +
                `**Timeframe:** ${alConfig.timeframe} hours\n` +
                `**Limit:** ${alConfig.limit} islands`,
            flags: MessageFlags.Ephemeral
        });
    },
};
