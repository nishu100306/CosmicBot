const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const getDimension = require('../../utils/getDimension');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dimension')
        .setDescription('Shows the bot\'s current dimension'),
    async execute(interaction) {
        const botManager = global.botManager;
        const config = global.config;
        const botId = interaction.options.getString('bot') || config.settings.defaultBot;
        const bot = botManager.getBot(botId);

        if (!bot) {
            await interaction.reply({ content: 'No bot available. Please try again later.', flags: MessageFlags.Ephemeral });
            return;
        }

        const botStatus = botManager.getBotStatus(botId);
        if (botStatus.status !== 'online') {
            await interaction.reply({ content: `Bot ${botId} is currently ${botStatus.status}. Please try again when it's online.`, flags: MessageFlags.Ephemeral });
            return;
        }

        const dimension = getDimension(bot);
        await interaction.reply({ content: `**Current dimension:** ${dimension}`, flags: MessageFlags.Ephemeral });
    },
};
