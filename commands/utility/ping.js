const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    async execute(interaction) {
        const sent = await interaction.reply({
            content: 'Pinging...',
            fetchReply: true,
            flags: MessageFlags.Ephemeral
        });

        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);

        await interaction.editReply({
            content: `🏓 Pong!\n**Latency:** ${latency}ms\n**API Latency:** ${apiLatency}ms`
        });
    },
};
