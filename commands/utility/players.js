const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const getInstancePlayers = require('../../utils/getInstancePlayers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('players')
        .setDescription('Lists players in the bot\'s current instance'),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const botManager = global.botManager;
        const config = global.config;
        const botId = interaction.options.getString('bot') || config.settings.defaultBot;
        const bot = botManager.getBot(botId);

        if (!bot) {
            await interaction.editReply({ content: 'No bot available. Please try again later.' });
            return;
        }

        const botStatus = botManager.getBotStatus(botId);
        if (botStatus.status !== 'online') {
            await interaction.editReply({ content: `Bot ${botId} is currently ${botStatus.status}. Please try again when it's online.` });
            return;
        }

        const playerNames = getInstancePlayers(bot);

        if (playerNames.length === 0) {
            await interaction.editReply({ content: 'No players found in this instance.' });
            return;
        }

        const header = `**Instance Players (${playerNames.length}):**\n`;
        const content = header + playerNames.join(', ');

        if (content.length <= 2000) {
            await interaction.editReply({ content });
        } else {
            await interaction.editReply({ content: header + playerNames.slice(0, 100).join(', ') + '\n...' });
        }
    },
};
