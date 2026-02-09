const { SlashCommandBuilder } = require('discord.js');
const EmbedHelper = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addbot')
        .setDescription('Add a new Mineflayer bot configuration')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('Unique bot ID')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('username')
                .setDescription('Minecraft username')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('host')
                .setDescription('Server address')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('auth')
                .setDescription('Authentication type')
                .setRequired(true)
                .addChoices(
                    { name: 'Microsoft', value: 'microsoft' },
                    { name: 'Mojang', value: 'mojang' },
                    { name: 'Offline', value: 'offline' }
                )
        )
        .addIntegerOption(option =>
            option.setName('port')
                .setDescription('Server port (default: 25565)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(65535)
        )
        .addStringOption(option =>
            option.setName('version')
                .setDescription('Minecraft version (default: 1.20.4)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('password')
                .setDescription('Password (for offline/cracked servers)')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('autostart')
                .setDescription('Automatically start the bot (default: false)')
                .setRequired(false)
        ),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const botConfigManager = global.botConfigManager;
        const botManager = global.botManager;

        const botId = interaction.options.getString('id');
        const username = interaction.options.getString('username');
        const host = interaction.options.getString('host');
        const auth = interaction.options.getString('auth');
        const port = interaction.options.getInteger('port') || 25565;
        const version = interaction.options.getString('version') || '1.20.4';
        const password = interaction.options.getString('password') || '';
        const autostart = interaction.options.getBoolean('autostart') || false;

        // Check if bot already exists
        const exists = await botConfigManager.configExists(botId);
        if (exists) {
            await interaction.editReply({
                content: `❌ A bot with ID \`${botId}\` already exists. Use \`/editbot\` to modify it or choose a different ID.`
            });
            return;
        }

        // Create bot configuration
        const botConfig = {
            id: botId,
            enabled: autostart,
            username: username,
            password: password,
            auth: auth,
            host: host,
            port: port,
            version: version,
            periodicTasks: {
                enabled: true,
                interval: 60000,
                commands: ['/join'],
                logTopEveryNCycles: 10
            }
        };

        // Validate configuration
        const validation = botConfigManager.validateConfig(botConfig);
        if (!validation.valid) {
            await interaction.editReply({
                content: `❌ Invalid configuration:\n${validation.errors.map(e => `• ${e}`).join('\n')}`
            });
            return;
        }

        // Save configuration
        const saved = await botConfigManager.saveConfig(botConfig);
        if (!saved) {
            await interaction.editReply({
                content: '❌ Failed to save bot configuration. Check logs for details.'
            });
            return;
        }

        // Start bot if autostart is enabled
        if (autostart) {
            try {
                botManager.createBot(botConfig);
            } catch (err) {
                console.error('Error starting bot:', err);
                await interaction.editReply({
                    content: `⚠️ Bot configuration saved, but failed to start: ${err.message}\nUse \`/startbot ${botId}\` to try again.`
                });
                return;
            }
        }

        const embed = EmbedHelper.createBaseEmbed()
            .setTitle('✅ Bot Added Successfully')
            .setDescription(`Bot \`${botId}\` has been configured.`)
            .setFields([
                { name: 'Username', value: username, inline: true },
                { name: 'Host', value: `${host}:${port}`, inline: true },
                { name: 'Auth', value: auth, inline: true },
                { name: 'Version', value: version, inline: true },
                { name: 'Auto-started', value: autostart ? 'Yes' : 'No', inline: true },
                { name: 'Config File', value: `config/bots/${botId}.json`, inline: false }
            ]);

        if (!autostart) {
            embed.addFields({
                name: 'Next Steps',
                value: `Use \`/startbot ${botId}\` to start this bot.`
            });
        }

        await interaction.editReply({ embeds: [embed], content: null });
    },
};
