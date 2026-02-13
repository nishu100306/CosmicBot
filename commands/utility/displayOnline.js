const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const getOnlinePlayers = require('../../utils/getOnlinePlayers');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('displayonline')
        .setDescription('displays online players'),
    async execute(interaction) {
        await interaction.reply({
            content: 'Loading...',
            fetchReply: true,
            flags: MessageFlags.Ephemeral
        });

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

        const names = await getOnlinePlayers(bot);

        if (names.length === 0) {
            await interaction.editReply({ content: 'No players found online.' });
            return;
        }

        const header = `**Online Players (${names.length}):**\n`;
        const content = header + names.join(', ');

        // Discord message limit is 2000 chars
        if (content.length <= 2000) {
            await interaction.editReply({ content });
        } else {
            await interaction.editReply({ content: header + names.slice(0, 100).join(', ') + '\n...' });
        }
        return;
    },
};
