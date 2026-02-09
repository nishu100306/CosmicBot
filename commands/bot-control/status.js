const { SlashCommandBuilder } = require('discord.js');
const EmbedHelper = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Shows the status of all Mineflayer bots'),
    async execute(interaction) {
        await interaction.deferReply();

        const botManager = global.botManager;
        const statuses = botManager.getAllBotStatuses();

        if (statuses.length === 0) {
            await interaction.editReply({
                content: 'No bots are currently configured.'
            });
            return;
        }

        const embed = EmbedHelper.createBotStatusEmbed(statuses);
        await interaction.editReply({ embeds: [embed] });
    },
};
