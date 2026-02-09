const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removebot')
        .setDescription('Remove a bot configuration')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('Bot ID to remove')
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option.setName('confirm')
                .setDescription('Confirm deletion (required)')
                .setRequired(true)
        ),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const botConfigManager = global.botConfigManager;
        const botManager = global.botManager;

        const botId = interaction.options.getString('id');
        const confirm = interaction.options.getBoolean('confirm');

        if (!confirm) {
            await interaction.editReply({
                content: '❌ You must set `confirm` to `true` to remove a bot.'
            });
            return;
        }

        // Check if bot exists
        const exists = await botConfigManager.configExists(botId);
        if (!exists) {
            await interaction.editReply({
                content: `❌ No bot found with ID \`${botId}\`.`
            });
            return;
        }

        // Stop bot if running
        const bot = botManager.getBot(botId);
        if (bot) {
            botManager.stopBot(botId);
        }

        // Delete configuration
        const deleted = await botConfigManager.deleteConfig(botId);
        if (!deleted) {
            await interaction.editReply({
                content: '❌ Failed to delete bot configuration. Check logs for details.'
            });
            return;
        }

        await interaction.editReply({
            content: `✅ Bot \`${botId}\` has been removed successfully.\n` +
                     `Configuration file \`config/bots/${botId}.json\` has been deleted.`
        });
    },
};
