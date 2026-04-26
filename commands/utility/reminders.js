const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const EmbedHelper = require('../../utils/embedBuilder');
const { formatDuration } = require('../../utils/reminderManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reminders')
        .setDescription('List active reminders in this server')
        .addBooleanOption(o => o
            .setName('recurring_only')
            .setDescription('Show only recurring reminders')
            .setRequired(false)),
    async execute(interaction) {
        const manager = global.reminderManager;
        if (!manager) {
            await interaction.reply({ content: 'Reminder manager not initialized.', flags: MessageFlags.Ephemeral });
            return;
        }

        const recurringOnly = interaction.options.getBoolean('recurring_only') || false;
        let list = manager.listForGuild(interaction.guildId);
        if (recurringOnly) list = list.filter(r => r.recurring);

        if (list.length === 0) {
            await interaction.reply({
                content: recurringOnly ? 'No recurring reminders in this server.' : 'No active reminders in this server.',
                flags: MessageFlags.Ephemeral
            });
            return;
        }

        list.sort((a, b) => a.fireAt - b.fireAt);

        const lines = list.map(r => {
            const tag = r.recurring ? `🔁 every ${formatDuration(r.intervalSec)}` : '⏰ one-shot';
            const preview = r.message.length > 60 ? r.message.slice(0, 60) + '…' : r.message;
            return `\`${r.id}\` — ${tag} — next: <t:${r.fireAt}:R>\n  by <@${r.createdBy}> in <#${r.channelId}>: *${preview}*`;
        });

        const embed = EmbedHelper.createBaseEmbed()
            .setTitle('Active Reminders')
            .setDescription(lines.join('\n\n'));

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    },
};
