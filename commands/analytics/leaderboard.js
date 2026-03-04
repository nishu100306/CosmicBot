const { SlashCommandBuilder } = require('discord.js');
const buildLeaderboardEmbed = require('../../utils/leaderboardBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Shows top islands by trophy growth')
        .addIntegerOption(option =>
            option.setName('timeframe')
                .setDescription('Timeframe in hours (default: 1)')
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
        await interaction.deferReply();

        try {
            const dataLogger = global.dataLogger;
            const timeframe = interaction.options.getInteger('timeframe') || 1;
            const limit = interaction.options.getInteger('limit') || 10;

            const embed = await buildLeaderboardEmbed(dataLogger, timeframe, limit);

            if (!embed) {
                await interaction.editReply({
                    content: `No data available for the past ${timeframe} hours.`
                });
                return;
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error('Error in /leaderboard command:', err);
            await interaction.editReply({
                content: 'An error occurred while generating the leaderboard.'
            });
        }
    },
};
