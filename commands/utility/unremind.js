const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unremind')
        .setDescription('Cancel a reminder by ID (use /reminders to see IDs)')
        .addStringOption(o => o
            .setName('id')
            .setDescription('Reminder ID')
            .setRequired(true)),
    async execute(interaction) {
        const manager = global.reminderManager;
        if (!manager) {
            await interaction.reply({ content: 'Reminder manager not initialized.', flags: MessageFlags.Ephemeral });
            return;
        }

        const id = interaction.options.getString('id');
        const reminder = manager.reminders.find(r => r.id === id);

        if (!reminder) {
            await interaction.reply({ content: `No reminder found with ID \`${id}\`.`, flags: MessageFlags.Ephemeral });
            return;
        }

        if (reminder.guildId !== interaction.guildId) {
            await interaction.reply({ content: 'That reminder belongs to a different server.', flags: MessageFlags.Ephemeral });
            return;
        }

        await manager.remove(id);
        await interaction.reply({
            content: `Cancelled reminder \`${id}\`: *${reminder.message}*`,
            flags: MessageFlags.Ephemeral
        });
    },
};
