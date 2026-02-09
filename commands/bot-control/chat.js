const { SlashCommandBuilder } = require('discord.js');

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
        const botId = interaction.options.getString('bot') || botManager.getAllBots()[0]?.[0];

        const bot = botManager.getBot(botId);

        if (!bot) {
            await interaction.editReply({
                content: 'No bot available or bot ID not found.'
            });
            return;
        }

        const botStatus = botManager.getBotStatus(botId);
        if (botStatus.status !== 'online') {
            await interaction.editReply({
                content: `Bot ${botId} is currently ${botStatus.status}. Cannot send message.`
            });
            return;
        }

        try {
            bot.chat(message);
            await interaction.editReply({
                content: `✅ Message sent via bot \`${botId}\`:\n> ${message}`
            });
        } catch (err) {
            console.error('Error sending chat message:', err);
            await interaction.editReply({
                content: 'Failed to send message. Check bot connection.'
            });
        }
    },
};
