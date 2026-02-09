const { SlashCommandBuilder } = require('discord.js');
const EmbedHelper = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Shows top islands by trophy growth')
        .addIntegerOption(option =>
            option.setName('timeframe')
                .setDescription('Timeframe in hours (default: 24)')
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
            const timeframe = interaction.options.getInteger('timeframe') || 24;
            const limit = interaction.options.getInteger('limit') || 10;

            const fileLines = await dataLogger.readIslandData();

            if (fileLines.length === 0) {
                await interaction.editReply({
                    content: 'No data available yet. Please try again later.'
                });
                return;
            }

            // Calculate trophy growth for each island
            const islandGrowth = new Map();
            const timeframeMs = timeframe * 60 * 60 * 1000;
            const cutoffTime = Date.now() - timeframeMs;

            for (const line of fileLines) {
                const [leader, level, position, trophies, timestamp] = line.split(',');
                const time = parseInt(timestamp) * 1000;

                if (time < cutoffTime) continue;

                if (!islandGrowth.has(leader)) {
                    islandGrowth.set(leader, {
                        leader,
                        minTrophies: parseInt(trophies),
                        maxTrophies: parseInt(trophies),
                        minTime: time,
                        maxTime: time,
                        currentLevel: parseInt(level),
                        currentRank: parseInt(position)
                    });
                } else {
                    const data = islandGrowth.get(leader);
                    const currTrophies = parseInt(trophies);

                    if (currTrophies < data.minTrophies) {
                        data.minTrophies = currTrophies;
                        data.minTime = time;
                    }
                    if (currTrophies > data.maxTrophies) {
                        data.maxTrophies = currTrophies;
                        data.maxTime = time;
                    }
                    if (parseInt(level) > data.currentLevel) {
                        data.currentLevel = parseInt(level);
                    }
                    if (parseInt(position) > 0 && parseInt(position) < data.currentRank) {
                        data.currentRank = parseInt(position);
                    }
                }
            }

            // Calculate growth and sort
            const growthArray = Array.from(islandGrowth.values())
                .map(data => ({
                    ...data,
                    growth: data.maxTrophies - data.minTrophies,
                    hourlyRate: ((data.maxTrophies - data.minTrophies) /
                        ((data.maxTime - data.minTime) / (3600 * 1000))) || 0
                }))
                .sort((a, b) => b.growth - a.growth)
                .slice(0, limit);

            if (growthArray.length === 0) {
                await interaction.editReply({
                    content: `No data available for the past ${timeframe} hours.`
                });
                return;
            }

            // Build embed
            const embed = EmbedHelper.createBaseEmbed()
                .setTitle(`🏆 Top ${limit} Islands by Trophy Growth`)
                .setDescription(`**Timeframe:** Past ${timeframe} hours\n**Updated:** <t:${Math.floor(Date.now() / 1000)}:R>`);

            const fields = growthArray.map((island, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                return {
                    name: `${medal} ${island.leader}`,
                    value: `**Growth:** ${island.growth.toLocaleString()} trophies\n` +
                           `**Rate:** ${island.hourlyRate.toFixed(2)}/hr\n` +
                           `**Level:** ${island.currentLevel} | **Rank:** #${island.currentRank > 0 ? island.currentRank : 'N/A'}`,
                    inline: true
                };
            });

            embed.setFields(fields);

            await interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error('Error in /leaderboard command:', err);
            await interaction.editReply({
                content: 'An error occurred while generating the leaderboard.'
            });
        }
    },
};
