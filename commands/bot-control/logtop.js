const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { PRIORITY } = require('../../utils/BotQueue');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logtop')
        .setDescription('Manually trigger an /is top data log')
        .addStringOption(option =>
            option.setName('bot')
                .setDescription('Which bot to use (defaults to first available)')
                .setRequired(false)
        ),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const botManager = global.botManager;
        const dataLogger = global.dataLogger;
        const config = global.config;

        const botId = interaction.options.getString('bot') || config.settings.defaultBot;
        const queue = botManager.getQueue(botId);

        if (!queue) {
            await interaction.editReply({ content: 'No bot available.' });
            return;
        }

        const botStatus = botManager.getBotStatus(botId);
        if (botStatus.status !== 'online') {
            await interaction.editReply({
                content: `Bot ${botId} is currently ${botStatus.status}. Please try again when it's online.`
            });
            return;
        }

        await interaction.editReply({ content: `Logging /is top data using bot \`${botId}\`...` });

        const result = await queue.enqueue(
            'logTopData',
            (bot) => dataLogger.logTopData(bot, config.settings.shortPause),
            { priority: PRIORITY.HIGH, timeoutMs: 180_000 }
        );

        if (result.ok && result.value) {
            await interaction.editReply({ content: `Successfully logged /is top data using bot \`${botId}\`.` });
        } else {
            const errMsg = result.ok ? 'logTopData returned false' : `${result.reason}: ${result.error?.message || result.error}`;
            await interaction.editReply({ content: `Failed to log /is top data: ${errMsg}` });
        }
    },
};
