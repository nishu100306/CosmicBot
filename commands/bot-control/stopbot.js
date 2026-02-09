const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stopbot')
        .setDescription('Stop a running bot')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('Bot ID to stop')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const botManager = global.botManager;
        const botId = interaction.options.getString('id');

        // Check if bot is running
        if (!botManager.getBot(botId)) {
            await interaction.editReply({
                content: `❌ Bot \`${botId}\` is not running.`
            });
            return;
        }

        // Stop bot
        try {
            botManager.stopBot(botId);
            await interaction.editReply({
                content: `✅ Bot \`${botId}\` has been stopped.`
            });
        } catch (err) {
            console.error('Error stopping bot:', err);
            await interaction.editReply({
                content: `❌ Failed to stop bot \`${botId}\`: ${err.message}`
            });
        }
    },
};
