const { EmbedBuilder } = require('discord.js');

class EmbedHelper {
    static getConfig() {
        // Get config from global, with fallback defaults
        const config = global.config?.appearance || {};
        return {
            color: parseInt(config.embedColor || '0x9b59b6'),
            image: config.botImage || 'https://cdn.discordapp.com/attachments/1044443844944601098/1401777359669035150/pheonix.png',
            name: config.botName || 'CosmicBot V0'
        };
    }

    static createBaseEmbed() {
        const { color, image, name } = this.getConfig();

        return new EmbedBuilder()
            .setColor(color)
            .setThumbnail(image)
            .setTimestamp()
            .setFooter({ text: name, iconURL: image });
    }

    static createInfoEmbed(stats) {
        const embed = this.createBaseEmbed();

        if (!stats.found) {
            return embed
                .setTitle('Island Info')
                .setDescription(`No data found for: ${stats.leader}`);
        }

        // Calculate deltas
        const deltaSecond = stats.recentTrophies - stats.secondData.trophies;
        const deltaHour = stats.recentTrophies - stats.hourData.trophies;
        const deltaDay = stats.recentTrophies - stats.dayData.trophies;

        // Format messages
        const levelMsg = stats.level === -1
            ? 'Missing Island Level data'
            : `Level ${stats.level} (<t:${Math.floor(stats.trophyTimestamp / 1000)}:f>)`;

        const leagueMsg = stats.league === 'unknown' ? '' : `${stats.league} League - `;
        const rankMsg = stats.rank === -1
            ? 'Missing /Is Top position data'
            : `${leagueMsg}#${stats.rank} (<t:${Math.floor(stats.rankTimestamp / 1000)}:f>)`;

        const trophiesMsg = stats.recentTrophies === -1
            ? 'Missing Trophy data'
            : `${stats.trophies} Trophies (<t:${Math.floor(stats.trophyTimestamp / 1000)}:f>)`;

        let hourlyMsg = '';
        if (stats.recentTrophies === -1 || stats.hourData.trophies === -1) {
            hourlyMsg = 'Missing Data. Unable to calculate';
        } else {
            hourlyMsg = `${deltaHour} Trophies\n(<t:${Math.floor(stats.hourData.time / 1000)}:t>) --> (<t:${Math.floor(stats.recentTime / 1000)}:t>)`;
        }

        let dayMsg = '';
        if (stats.recentTrophies === -1 || stats.dayData.trophies === -1) {
            dayMsg = 'Missing Data. Unable to calculate';
        } else {
            dayMsg = `${deltaDay} Trophies\n(<t:${Math.floor(stats.dayData.time / 1000)}:f>) --> (<t:${Math.floor(stats.recentTime / 1000)}:f>)`;
        }

        // Calculate hourly rates
        const hourlySecond = stats.secondData.trophies === -1 ? null :
            deltaSecond / ((stats.recentTime - stats.secondData.time) / (3600 * 1000));
        const hourlyHour = stats.hourData.trophies === -1 ? null :
            deltaHour / ((stats.recentTime - stats.hourData.time) / (3600 * 1000));
        const hourlyDay = stats.dayData.trophies === -1 ? null :
            deltaDay / ((stats.recentTime - stats.dayData.time) / (3600 * 1000));

        let estimates = '**2 most recent data points:**\n';
        if (hourlySecond === null) {
            estimates += 'Missing Data\n\n';
        } else {
            estimates += `${hourlySecond.toFixed(2)} Trophies per hour\n(<t:${Math.floor(stats.secondData.time / 1000)}:f>) --> (<t:${Math.floor(stats.recentTime / 1000)}:f>)\n\n`;
        }

        estimates += '**Hourly data points:**\n';
        if (hourlyHour === null) {
            estimates += 'Missing Data\n\n';
        } else {
            estimates += `${hourlyHour.toFixed(2)} Trophies per hour\n(<t:${Math.floor(stats.hourData.time / 1000)}:f>) --> (<t:${Math.floor(stats.recentTime / 1000)}:f>)\n\n`;
        }

        estimates += '**Daily data points:**\n';
        if (hourlyDay === null) {
            estimates += 'Missing Data\n\n';
        } else {
            estimates += `${hourlyDay.toFixed(2)} Trophies per hour\n(<t:${Math.floor(stats.dayData.time / 1000)}:f>) --> (<t:${Math.floor(stats.recentTime / 1000)}:f>)`;
        }

        const description = `### Current Level\n${levelMsg}\n` +
            `### Current /Is Top Position\n${rankMsg}\n` +
            `### Current Trophies\n${trophiesMsg}\n` +
            `### Trophy gain in the past hour\n${hourlyMsg}\n` +
            `### Trophy gain in the past 24 hours\n${dayMsg}\n` +
            `## Hourly trophy estimates\n${estimates}\n\n` +
            `Timestamps in parenthesis are when data was collected`;

        return embed
            .setTitle(`Island Info for ${stats.leader}'s Island`)
            .setThumbnail(`https://mineskin.eu/bust/${stats.leader}/100.png`)
            .setDescription(description);
    }

    static createTopEmbed(topData) {
        const embed = this.createBaseEmbed()
            .setTitle('/top viewer')
            .setDescription('Island Top Rankings');

        if (topData.fields) {
            embed.setFields(topData.fields);
        }

        return embed;
    }

    static createBotStatusEmbed(statuses) {
        const embed = this.createBaseEmbed()
            .setTitle('Bot Status Overview');

        const fields = statuses.map(status => ({
            name: `🤖 ${status.username || status.id}`,
            value: `**Status:** ${this.getStatusEmoji(status.status)} ${status.status}\n` +
                   `**Host:** ${status.host}\n` +
                   (status.lastError ? `**Last Error:** ${status.lastError}\n` : ''),
            inline: true
        }));

        embed.setFields(fields);
        return embed;
    }

    static getStatusEmoji(status) {
        switch (status) {
            case 'online': return '🟢';
            case 'offline': return '🔴';
            case 'connecting': return '🟡';
            default: return '⚪';
        }
    }
}

module.exports = EmbedHelper;
