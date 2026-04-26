const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { parseDuration, formatDuration } = require('../../utils/reminderManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remind')
        .setDescription('Set a reminder')
        .addStringOption(o => o
            .setName('time')
            .setDescription('When to fire (e.g. 30m, 2h, 1d12h). For recurring, this is the interval.')
            .setRequired(true))
        .addStringOption(o => o
            .setName('message')
            .setDescription('Reminder text')
            .setRequired(true))
        .addBooleanOption(o => o
            .setName('recurring')
            .setDescription('Fire repeatedly on the interval (default: false)')
            .setRequired(false))
        .addUserOption(o => o
            .setName('user')
            .setDescription('User to ping')
            .setRequired(false))
        .addRoleOption(o => o
            .setName('role')
            .setDescription('Role to ping')
            .setRequired(false))
        .addStringOption(o => o
            .setName('extra_mentions')
            .setDescription('Extra raw mentions, e.g. <@id> <@&id>')
            .setRequired(false)),
    async execute(interaction) {
        const manager = global.reminderManager;
        if (!manager) {
            await interaction.reply({ content: 'Reminder manager not initialized.', flags: MessageFlags.Ephemeral });
            return;
        }

        const timeStr = interaction.options.getString('time');
        const message = interaction.options.getString('message');
        const recurring = interaction.options.getBoolean('recurring') || false;
        const user = interaction.options.getUser('user');
        const role = interaction.options.getRole('role');
        const extra = interaction.options.getString('extra_mentions');

        const seconds = parseDuration(timeStr);
        if (!seconds || seconds < 1) {
            await interaction.reply({
                content: `Invalid time format: \`${timeStr}\`. Use e.g. \`30s\`, \`5m\`, \`2h\`, \`1d12h\`.`,
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        const mentionParts = [];
        if (user) mentionParts.push(`<@${user.id}>`);
        if (role) mentionParts.push(`<@&${role.id}>`);
        if (extra) mentionParts.push(extra);
        const mentions = mentionParts.join(' ');

        const now = Math.floor(Date.now() / 1000);
        const reminder = {
            channelId: interaction.channelId,
            guildId: interaction.guildId,
            createdBy: interaction.user.id,
            createdAt: now,
            fireAt: now + seconds,
            message,
            mentions,
            recurring,
            intervalSec: recurring ? seconds : null
        };

        const saved = await manager.add(reminder);

        const kind = recurring ? `recurring (every ${formatDuration(seconds)})` : `one-shot (in ${formatDuration(seconds)})`;
        await interaction.reply({
            content: `Reminder set: **${kind}**\n**ID:** \`${saved.id}\`\n**First fire:** <t:${saved.fireAt}:F> (<t:${saved.fireAt}:R>)`,
            flags: MessageFlags.Ephemeral
        });
    },
};
