const { SlashCommandBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dimensionblacklist')
        .setDescription('Manage the dimension blacklist for player tracking')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Add, remove, or list blacklisted dimensions')
                .setRequired(true)
                .addChoices(
                    { name: 'Add', value: 'add' },
                    { name: 'Remove', value: 'remove' },
                    { name: 'List', value: 'list' }
                )
        )
        .addStringOption(option =>
            option.setName('dimension')
                .setDescription('Dimension name (e.g. minecraft:the_nether)')
                .setRequired(false)
        ),
    async execute(interaction) {
        const config = global.config;
        const action = interaction.options.getString('action');
        const dimension = interaction.options.getString('dimension');

        if (!config.settings.dimensionBlacklist) {
            config.settings.dimensionBlacklist = [];
        }

        const blacklist = config.settings.dimensionBlacklist;

        if (action === 'list') {
            if (blacklist.length === 0) {
                await interaction.reply({ content: 'Dimension blacklist is empty.', flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ content: `**Blacklisted dimensions:**\n${blacklist.map(d => `- ${d}`).join('\n')}`, flags: MessageFlags.Ephemeral });
            }
            return;
        }

        if (!dimension) {
            await interaction.reply({ content: 'Please provide a dimension name.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (action === 'add') {
            if (blacklist.includes(dimension)) {
                await interaction.reply({ content: `\`${dimension}\` is already blacklisted.`, flags: MessageFlags.Ephemeral });
                return;
            }
            blacklist.push(dimension);
            global.saveConfig();
            await interaction.reply({ content: `Added \`${dimension}\` to the blacklist.`, flags: MessageFlags.Ephemeral });
        } else if (action === 'remove') {
            const index = blacklist.indexOf(dimension);
            if (index === -1) {
                await interaction.reply({ content: `\`${dimension}\` is not in the blacklist.`, flags: MessageFlags.Ephemeral });
                return;
            }
            blacklist.splice(index, 1);
            global.saveConfig();
            await interaction.reply({ content: `Removed \`${dimension}\` from the blacklist.`, flags: MessageFlags.Ephemeral });
        }
    },
};
