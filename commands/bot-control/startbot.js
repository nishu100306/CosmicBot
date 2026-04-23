const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('startbot')
        .setDescription('Start a configured bot')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('Bot ID to start')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const botConfigManager = global.botConfigManager;
        const botManager = global.botManager;

        const botId = interaction.options.getString('id');

        // Check if bot is already running
        if (botManager.getBot(botId)) {
            await interaction.editReply({
                content: `❌ Bot \`${botId}\` is already running.`
            });
            return;
        }

        // Load configuration
        const config = await botConfigManager.loadConfig(botId);
        if (!config) {
            await interaction.editReply({
                content: `❌ No configuration found for bot \`${botId}\`.`
            });
            return;
        }

        // Clear the stopped flag so the bot can be recreated
        botManager.stoppedBots.delete(botId);

        // Start bot
        try {
            botManager.createBot(config);
            await interaction.editReply({
                content: `✅ Bot \`${botId}\` is starting...\nUse \`/status\` to check its status.`
            });
        } catch (err) {
            console.error('Error starting bot:', err);
            await interaction.editReply({
                content: `❌ Failed to start bot \`${botId}\`: ${err.message}`
            });
        }
    },
};
