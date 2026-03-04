const EmbedHelper = require('./embedBuilder');

async function buildLeaderboardEmbed(dataLogger, timeframe, limit) {
    const fileLines = await dataLogger.readIslandData();

    if (fileLines.length === 0) {
        return null;
    }

    const islandGrowth = new Map();
    const timeframeMs = timeframe * 60 * 60 * 1000;
    const cutoffTime = Date.now() - timeframeMs;

    for (const line of fileLines) {
        const [league, leader, level, position, trophies, timestamp] = line.split(',');
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
        return null;
    }

    const embed = EmbedHelper.createBaseEmbed()
        .setTitle(`Top ${limit} Islands by Trophy Growth`)
        .setDescription(`**Timeframe:** Past ${timeframe} hours\n**Updated:** <t:${Math.floor(Date.now() / 1000)}:R>`);

    const fields = growthArray.map((island, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        return {
            name: `${medal} ${island.leader}`,
            value: `**Growth:** ${island.growth.toLocaleString()} trophies\n` +
                   `**Rate:** ${island.hourlyRate.toFixed(2)}/hr\n` +
                   `**Level:** ${island.currentLevel} | **Rank:** #${island.currentRank > 0 ? island.currentRank : 'N/A'}\n` +
                   `<t:${Math.floor(island.minTime / 1000)}:t> → <t:${Math.floor(island.maxTime / 1000)}:t>`,
            inline: true
        };
    });

    embed.setFields(fields);
    return embed;
}

module.exports = buildLeaderboardEmbed;
