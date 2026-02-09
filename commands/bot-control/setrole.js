const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setrole')
        .setDescription('Set the required role for a command category')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Command category to set the role for')
                .setRequired(true)
                .addChoices(
                    { name: 'Bot Control', value: 'bot-control' },
                    { name: 'Analytics', value: 'analytics' }
                )
        )
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role required to use commands in this category (leave empty to remove restriction)')
                .setRequired(false)
        ),
    async execute(interaction) {
        const category = interaction.options.getString('category');
        const role = interaction.options.getRole('role');

        if (!global.config.settings.roles) {
            global.config.settings.roles = {};
        }

        if (role) {
            global.config.settings.roles[category] = role.id;
            global.saveConfig();
            await interaction.reply({
                content: `${category} commands now require the ${role} role.`,
                flags: MessageFlags.Ephemeral
            });
        } else {
            global.config.settings.roles[category] = null;
            global.saveConfig();
            await interaction.reply({
                content: `${category} commands are now unrestricted.`,
                flags: MessageFlags.Ephemeral
            });
        }
    },
};
