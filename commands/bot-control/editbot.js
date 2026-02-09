const { SlashCommandBuilder } = require('discord.js');
const EmbedHelper = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('editbot')
        .setDescription('Edit a bot configuration')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('Bot ID to edit')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('username')
                .setDescription('New username')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('host')
                .setDescription('New server address')
                .setRequired(false)
        )
        .addIntegerOption(option =>
            option.setName('port')
                .setDescription('New server port')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(65535)
        )
        .addStringOption(option =>
            option.setName('auth')
                .setDescription('New authentication type')
                .setRequired(false)
                .addChoices(
                    { name: 'Microsoft', value: 'microsoft' },
                    { name: 'Mojang', value: 'mojang' },
                    { name: 'Offline', value: 'offline' }
                )
        )
        .addStringOption(option =>
            option.setName('version')
                .setDescription('New Minecraft version')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('password')
                .setDescription('New password (for offline/cracked servers)')
                .setRequired(false)
        )
        .addBooleanOption(option =>
            option.setName('enabled')
                .setDescription('Enable/disable bot')
                .setRequired(false)
        ),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const botConfigManager = global.botConfigManager;
        const botManager = global.botManager;

        const botId = interaction.options.getString('id');

        // Load existing config
        const existingConfig = await botConfigManager.loadConfig(botId);
        if (!existingConfig) {
            await interaction.editReply({
                content: `❌ No bot found with ID \`${botId}\`.`
            });
            return;
        }

        // Get new values (only update if provided)
        const username = interaction.options.getString('username');
        const host = interaction.options.getString('host');
        const port = interaction.options.getInteger('port');
        const auth = interaction.options.getString('auth');
        const version = interaction.options.getString('version');
        const password = interaction.options.getString('password');
        const enabled = interaction.options.getBoolean('enabled');

        // Track changes
        const changes = [];

        // Update config with new values
        if (username !== null) {
            existingConfig.username = username;
            changes.push(`Username: ${username}`);
        }
        if (password !== null) {
            existingConfig.password = password;
            changes.push(`Password: ${password ? '***' : '(removed)'}`);
        }
        if (host !== null) {
            existingConfig.host = host;
            changes.push(`Host: ${host}`);
        }
        if (port !== null) {
            existingConfig.port = port;
            changes.push(`Port: ${port}`);
        }
        if (auth !== null) {
            existingConfig.auth = auth;
            changes.push(`Auth: ${auth}`);
        }
        if (version !== null) {
            existingConfig.version = version;
            changes.push(`Version: ${version}`);
        }
        if (enabled !== null) {
            existingConfig.enabled = enabled;
            changes.push(`Enabled: ${enabled}`);
        }

        if (changes.length === 0) {
            await interaction.editReply({
                content: '❌ No changes specified. Please provide at least one field to update.'
            });
            return;
        }

        // Validate updated configuration
        const validation = botConfigManager.validateConfig(existingConfig);
        if (!validation.valid) {
            await interaction.editReply({
                content: `❌ Invalid configuration:\n${validation.errors.map(e => `• ${e}`).join('\n')}`
            });
            return;
        }

        // Save updated configuration
        const saved = await botConfigManager.saveConfig(existingConfig);
        if (!saved) {
            await interaction.editReply({
                content: '❌ Failed to save updated configuration. Check logs for details.'
            });
            return;
        }

        // If bot is running, prompt to restart
        const isRunning = botManager.getBot(botId) !== undefined;
        let restartNote = '';
        if (isRunning) {
            restartNote = '\n\n⚠️ **Note:** Bot is currently running. Use `/restartbot ' + botId + '` to apply changes.';
        }

        const embed = EmbedHelper.createBaseEmbed()
            .setTitle('✅ Bot Configuration Updated')
            .setDescription(`Bot \`${botId}\` has been updated.`)
            .setFields([
                {
                    name: 'Changes Applied',
                    value: changes.map(c => `• ${c}`).join('\n'),
                    inline: false
                },
                {
                    name: 'Config File',
                    value: `config/bots/${botId}.json`,
                    inline: false
                }
            ]);

        await interaction.editReply({
            embeds: [embed],
            content: restartNote || null
        });
    },
};
