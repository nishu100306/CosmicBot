const { SlashCommandBuilder, MessageFlags, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logchat')
        .setDescription('Stream a bot\'s in-game chat into the current channel (persistent)')
        .addStringOption(o => o
            .setName('bot')
            .setDescription('Bot ID to log chat from')
            .setRequired(true))
        .addBooleanOption(o => o
            .setName('disable')
            .setDescription('Stop chat logging for this bot')
            .setRequired(false)),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const botManager = global.botManager;
        const botConfigManager = global.botConfigManager;
        const BotManager = require('../../bots/BotManager');
        const botId = BotManager.normalizeId(interaction.options.getString('bot'));
        const disable = interaction.options.getBoolean('disable') || false;

        const config = await botConfigManager.loadConfig(botId);
        if (!config) {
            await interaction.editReply({ content: `❌ No configuration found for bot \`${botId}\`.` });
            return;
        }

        if (disable) {
            config.chatLogChannelId = null;
            await botConfigManager.saveConfig(config);
            // Update in-memory instance too so the change is immediate
            const instance = botManager.botInstances.get(botId);
            if (instance) instance.config.chatLogChannelId = null;
            await interaction.editReply({ content: `✅ Chat logging disabled for bot \`${botId}\`.` });
            return;
        }

        if (interaction.channel?.type !== ChannelType.GuildText) {
            await interaction.editReply({ content: '❌ Run this in a regular text channel.' });
            return;
        }

        config.chatLogChannelId = interaction.channelId;
        await botConfigManager.saveConfig(config);
        const instance = botManager.botInstances.get(botId);
        if (instance) instance.config.chatLogChannelId = interaction.channelId;

        await interaction.editReply({
            content: `✅ Chat logging for bot \`${botId}\` will be sent to <#${interaction.channelId}>.`
        });
    },
};
