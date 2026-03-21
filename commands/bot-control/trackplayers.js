const { SlashCommandBuilder, MessageFlags, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('trackplayers')
        .setDescription('Configure player tracking for the bot\'s instance')
        .addBooleanOption(option =>
            option.setName('enabled')
                .setDescription('Enable or disable tracking')
                .setRequired(true)
        )
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to log new players in')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName('interval')
                .setDescription('Check interval in milliseconds (default: 10000)')
                .setRequired(false)
                .setMinValue(10)
                .setMaxValue(300000)
        )
        .addRoleOption(option =>
            option.setName('pingrole')
                .setDescription('Role to ping when a new player is detected')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('clearrole')
                .setDescription('Set to true to remove the ping role')
                .setRequired(false)
        ),
    async execute(interaction) {
        const config = global.config;
        const enabled = interaction.options.getBoolean('enabled');
        const channel = interaction.options.getChannel('channel');
        const interval = interaction.options.getInteger('interval');
        const pingRole = interaction.options.getRole('pingrole');

        if (!config.settings.trackPlayers) {
            config.settings.trackPlayers = {
                enabled: false,
                channelId: null,
                intervalMs: 10000
            };
        }

        const tpConfig = config.settings.trackPlayers;

        if (channel) tpConfig.channelId = channel.id;
        if (interval) tpConfig.intervalMs = interval;
        if (pingRole) tpConfig.pingRoleId = pingRole.id;
        if (interaction.options.getBoolean('clearrole')) tpConfig.pingRoleId = null;
        tpConfig.enabled = enabled;

        if (enabled && !tpConfig.channelId) {
            await interaction.reply({ content: 'Please specify a channel when enabling tracking.', flags: MessageFlags.Ephemeral });
            return;
        }

        global.saveConfig();

        if (enabled) {
            await global.playerTracker.start();
        } else {
            global.playerTracker.stop();
        }

        const status = enabled ? 'Enabled' : 'Disabled';
        const ch = tpConfig.channelId ? `<#${tpConfig.channelId}>` : 'Not set';
        const role = tpConfig.pingRoleId ? `<@&${tpConfig.pingRoleId}>` : 'None';
        await interaction.reply({
            content: `**Player Tracking ${status}**\n**Channel:** ${ch}\n**Interval:** ${tpConfig.intervalMs}ms\n**Ping Role:** ${role}`,
            flags: MessageFlags.Ephemeral
        });
    },
};
