const { SlashCommandBuilder } = require('discord.js');
const { PRIORITY } = require('../../utils/BotQueue');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chat')
        .setDescription('Send a chat message through a bot')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message to send')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('bot')
                .setDescription('Which bot to use (defaults to first available)')
                .setRequired(false)
        ),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const botManager = global.botManager;
        const message = interaction.options.getString('message');
        const botId = interaction.options.getString('bot') || global.config.settings.defaultBot;

        const queue = botManager.getQueue(botId);
        if (!queue) {
            await interaction.editReply({ content: 'No bot available or bot ID not found.' });
            return;
        }

        const botStatus = botManager.getBotStatus(botId);
        if (botStatus.status !== 'online') {
            await interaction.editReply({
                content: `Bot ${botId} is currently ${botStatus.status}. Cannot send message.`
            });
            return;
        }

        const result = await queue.enqueue('chat', (bot) => bot.chat(message), {
            priority: PRIORITY.HIGH,
            timeoutMs: 10_000
        });

        if (result.ok) {
            await interaction.editReply({
                content: `✅ Message sent via bot \`${botId}\`:\n> ${message}`
            });
        } else {
            await interaction.editReply({
                content: `❌ Chat failed (${result.reason}): ${result.error?.message || result.error}`
            });
        }
    },
};
