const { SlashCommandBuilder } = require('discord.js');
const EmbedHelper = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Shows stats about an island')
        .addStringOption(option =>
            option.setName('island_name')
                .setDescription('The name of the leader of the island')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();

        try {
            const dataLogger = global.dataLogger;
            const leaderName = interaction.options.getString('island_name');

            const stats = await dataLogger.getIslandStats(leaderName);
            const embed = EmbedHelper.createInfoEmbed(stats);

            await interaction.editReply({ embeds: [embed] });
        } catch (err) {
            console.error('Error in /info command:', err);
            await interaction.editReply({
                content: 'An error occurred while fetching island data. Please try again later.'
            });
        }
    },
};
