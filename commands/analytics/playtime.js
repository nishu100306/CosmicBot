const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const EmbedHelper = require('../../utils/embedBuilder');

function formatDuration(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);
    return parts.join(' ');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('playtime')
        .setDescription('Show how long a player has been online')
        .addStringOption(o => o
            .setName('username')
            .setDescription('Player to query')
            .setRequired(true))
        .addNumberOption(o => o
            .setName('hours')
            .setDescription('Look back this many hours (default: all-time)')
            .setRequired(false)
            .setMinValue(0.1)),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const tracker = global.playtimeTracker;
        if (!tracker) {
            await interaction.editReply('Playtime tracker is not initialized.');
            return;
        }

        const username = interaction.options.getString('username');
        const hours = interaction.options.getNumber('hours');
        const now = Math.floor(Date.now() / 1000);
        const startTs = hours ? (now - Math.floor(hours * 3600)) : 0;
        const endTs = now;

        const { total, sessionCount, lastSeen } = await tracker.getPlaytime(username, startTs, endTs);

        const intervalSec = tracker.ptConfig.intervalMs / 1000;
        const isOnline = lastSeen !== null && (now - lastSeen) < (intervalSec * 2);
        const range = hours ? `over the last ${hours}h` : 'all-time';

        let desc;
        if (lastSeen === null) {
            desc = `**${username}** has no recorded playtime.`;
        } else {
            desc = `**${username}** — ${range}\n` +
                `**Playtime:** ${formatDuration(total)}\n` +
                `**Sessions:** ${sessionCount}\n` +
                `**Status:** ${isOnline ? 'Online' : `Last seen <t:${lastSeen}:R>`}`;
        }

        const embed = EmbedHelper.createBaseEmbed()
            .setTitle('Playtime')
            .setThumbnail(`https://mineskin.eu/bust/${username}/100.png`)
            .setDescription(desc);

        await interaction.editReply({ embeds: [embed] });
    },
};
