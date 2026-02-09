const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listbots')
        .setDescription('Lists all available bots'),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const botManager = global.botManager;
        const bots = botManager.getAllBots();

        if (bots.length === 0) {
            await interaction.editReply({
                content: 'No bots are currently running.'
            });
            return;
        }

        let message = '**Available Bots:**\n\n';

        for (const [botId, bot] of bots) {
            const status = botManager.getBotStatus(botId);
            const statusEmoji = status.status === 'online' ? '🟢' : status.status === 'offline' ? '🔴' : '🟡';
            message += `${statusEmoji} **${botId}** - ${bot.username || 'N/A'} (${status.status})\n`;
        }

        await interaction.editReply({ content: message });
    },
};
