const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('restartbot')
        .setDescription('Restart a bot (stop and start with latest config)')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('Bot ID to restart')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const botConfigManager = global.botConfigManager;
        const botManager = global.botManager;
        const botId = interaction.options.getString('id');

        // Load configuration
        const config = await botConfigManager.loadConfig(botId);
        if (!config) {
            await interaction.editReply({
                content: `❌ No configuration found for bot \`${botId}\`.`
            });
            return;
        }

        // Stop bot if running
        if (botManager.getBot(botId)) {
            botManager.stopBot(botId);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit
        }

        // Clear the stopped flag (stopBot sets it; restart should override)
        botManager.stoppedBots.delete(botId);

        // Start bot with new config
        try {
            botManager.createBot(config);
            await interaction.editReply({
                content: `✅ Bot \`${botId}\` is restarting with updated configuration...\nUse \`/status\` to check its status.`
            });
        } catch (err) {
            console.error('Error restarting bot:', err);
            await interaction.editReply({
                content: `❌ Failed to restart bot \`${botId}\`: ${err.message}`
            });
        }
    },
};
