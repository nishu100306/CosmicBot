const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('whitelist')
        .setDescription('Add a player to the tracker whitelist so they are not flagged as new')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('The player to whitelist')
                .setRequired(true)
        ),
    async execute(interaction) {
        const username = interaction.options.getString('username');

        if (!global.playerTracker) {
            await interaction.reply({ content: 'Player tracker is not initialized.', flags: MessageFlags.Ephemeral });
            return;
        }

        await global.playerTracker.addToWhitelist(username);

        await interaction.reply({
            content: `**${username}** has been added to the tracker whitelist.`,
            flags: MessageFlags.Ephemeral
        });
    },
};
