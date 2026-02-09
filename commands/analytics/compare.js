const { SlashCommandBuilder } = require('discord.js');
const EmbedHelper = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('compare')
        .setDescription('Compare stats between two islands')
        .addStringOption(option =>
            option.setName('island1')
                .setDescription('First island leader name')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('island2')
                .setDescription('Second island leader name')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply();

        try {
            const dataLogger = global.dataLogger;
            const island1Name = interaction.options.getString('island1');
            const island2Name = interaction.options.getString('island2');

            const stats1 = await dataLogger.getIslandStats(island1Name);
            const stats2 = await dataLogger.getIslandStats(island2Name);

            if (!stats1.found || !stats2.found) {
                const missing = [];
                if (!stats1.found) missing.push(island1Name);
                if (!stats2.found) missing.push(island2Name);

                await interaction.editReply({
                    content: `No data found for: ${missing.join(', ')}`
                });
                return;
            }

            // Calculate hourly rates
            const getHourlyRate = (stats) => {
                if (stats.hourData.trophies === -1 || stats.recentTrophies === -1) return null;
                const delta = stats.recentTrophies - stats.hourData.trophies;
                const timeDiff = (stats.recentTime - stats.hourData.time) / (3600 * 1000);
                return delta / timeDiff;
            };

            const hourly1 = getHourlyRate(stats1);
            const hourly2 = getHourlyRate(stats2);

            // Build comparison embed
            const embed = EmbedHelper.createBaseEmbed()
                .setTitle(`⚔️ Island Comparison`)
                .setDescription(`**${stats1.leader}** vs **${stats2.leader}**`);

            const compareValue = (val1, val2, format = (v) => v) => {
                if (val1 == null && val2 == null) return 'N/A | N/A';
                if (val1 == null) return `N/A | ${format(val2, 1)}`;
                if (val2 == null) return `${format(val1, 0)} | N/A`;

                const winner = val1 > val2 ? '🏆' : val1 < val2 ? '' : '🤝';
                const loser = val2 > val1 ? '🏆' : val2 < val1 ? '' : '🤝';

                return `${winner} ${format(val1, 0)} | ${format(val2, 1)} ${loser}`;
            };

            embed.setFields([
                {
                    name: '🏆 Trophies',
                    value: compareValue(
                        stats1.trophies === -1 ? null : stats1.trophies,
                        stats2.trophies === -1 ? null : stats2.trophies,
                        v => v.toLocaleString()
                    ),
                    inline: false
                },
                {
                    name: '📊 Island Level',
                    value: compareValue(
                        stats1.level === -1 ? null : stats1.level,
                        stats2.level === -1 ? null : stats2.level
                    ),
                    inline: true
                },
                {
                    name: '🎯 Rank',
                    value: compareValue(
                        stats1.rank === -1 ? null : -stats1.rank,
                        stats2.rank === -1 ? null : -stats2.rank,
                        (v, i) => {
                            const league = i === 0 ? stats1.league : stats2.league;
                            const prefix = league !== 'unknown' ? `${league} ` : '';
                            return `${prefix}#${Math.abs(v)}`;
                        }
                    ),
                    inline: true
                },
                {
                    name: '⚡ Hourly Rate',
                    value: hourly1 !== null && hourly2 !== null
                        ? compareValue(hourly1, hourly2, v => `${v.toFixed(2)}/hr`)
                        : 'Insufficient data',
                    inline: false
                },
                {
                    name: '⏳ Time to Catch Up',
                    value: (() => {
                        if (hourly1 == null || hourly2 == null) return 'Insufficient rate data';
                        if (stats1.trophies === -1 || stats2.trophies === -1) return 'Insufficient trophy data';

                        const trophyDiff = stats1.trophies - stats2.trophies;
                        const rateDiff = hourly2 - hourly1;

                        // Island 2 is behind and gaining faster
                        if (trophyDiff > 0 && rateDiff > 0) {
                            const hours = trophyDiff / rateDiff;
                            const days = Math.floor(hours / 24);
                            const hrs = Math.floor(hours % 24);
                            const mins = Math.floor((hours % 1) * 60);
                            return `**${stats2.leader}** catches **${stats1.leader}** in ~${days}d ${hrs}h ${mins}m`;
                        }

                        // Island 1 is behind and gaining faster
                        if (trophyDiff < 0 && rateDiff < 0) {
                            const hours = Math.abs(trophyDiff) / Math.abs(rateDiff);
                            const days = Math.floor(hours / 24);
                            const hrs = Math.floor(hours % 24);
                            const mins = Math.floor((hours % 1) * 60);
                            return `**${stats1.leader}** catches **${stats2.leader}** in ~${days}d ${hrs}h ${mins}m`;
                        }

                        return 'The trailing island is not gaining faster — no catch-up projected';
                    })(),
                    inline: false
                },
                {
                    name: `${stats1.leader}'s Recent Data`,
                    value: `**Last Update:** <t:${Math.floor(stats1.recentTime / 1000)}:R>\n` +
                           `**Recent Trophies:** ${stats1.recentTrophies.toLocaleString()}`,
                    inline: true
                },
                {
                    name: `${stats2.leader}'s Recent Data`,
                    value: `**Last Update:** <t:${Math.floor(stats2.recentTime / 1000)}:R>\n` +
                           `**Recent Trophies:** ${stats2.recentTrophies.toLocaleString()}`,
                    inline: true
                }
            ]);

            await interaction.editReply({ embeds: [embed] });

        } catch (err) {
            console.error('Error in /compare command:', err);
            await interaction.editReply({
                content: 'An error occurred while comparing islands.'
            });
        }
    },
};
