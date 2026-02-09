const { SlashCommandBuilder, ChannelType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setlogchannel')
        .setDescription('Set a Discord channel to mirror console output to')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to log to (leave empty to disable)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        ),
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel');

        if (channel) {
            global.logChannelId = channel.id;
            global.config.settings.logChannelId = channel.id;
            global.saveConfig();
            console.log(`[setlogchannel] Channel set to: ${channel.id} (${channel.name})`);
            await interaction.reply({
                content: `Console logging enabled in ${channel}. Test message incoming...`,
                flags: MessageFlags.Ephemeral
            });
            console.log('[TEST] This is a test log message to verify channel logging is working.');
        } else {
            global.logChannelId = null;
            global.config.settings.logChannelId = null;
            global.saveConfig();
            console.log('[setlogchannel] Channel logging disabled');
            await interaction.reply({
                content: 'Console logging to Discord disabled.',
                flags: MessageFlags.Ephemeral
            });
        }
    },
};
