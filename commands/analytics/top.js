const {
    SlashCommandBuilder,
    MessageFlags,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder
} = require('discord.js');
const EmbedHelper = require('../../utils/embedBuilder');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('top')
        .setDescription('View in-game /top leaderboards')
        .addStringOption(option =>
            option.setName('bot')
                .setDescription('Which bot to use (defaults to first available)')
                .setRequired(false)
        ),
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const botManager = global.botManager;
        const config = global.config;

        // Get bot to use
        const botId = interaction.options.getString('bot') || botManager.getAllBots()[0]?.[0];
        const bot = botManager.getBot(botId);

        if (!bot) {
            await interaction.editReply({
                content: 'No bot available. Please try again later.'
            });
            return;
        }

        const botStatus = botManager.getBotStatus(botId);
        if (botStatus.status !== 'online') {
            await interaction.editReply({
                content: `Bot ${botId} is currently ${botStatus.status}. Please try again when it's online.`
            });
            return;
        }

        // Create buttons
        const islandXPBtn = new ButtonBuilder()
            .setCustomId('Island XP')
            .setLabel('Island XP')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📊');

        const islandTopBtn = new ButtonBuilder()
            .setCustomId('Island Top')
            .setLabel('Island Top')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🏆');

        const row = new ActionRowBuilder()
            .addComponents(islandXPBtn, islandTopBtn);

        const response = await interaction.followUp({
            content: 'Select a sub-menu',
            flags: MessageFlags.Ephemeral,
            components: [row],
            withResponse: true
        });

        const collectorFilter = i => i.user.id === interaction.user.id;

        try {
            const selection = await response.awaitMessageComponent({
                filter: collectorFilter,
                time: 60_000
            });

            const wait = require('node:timers/promises').setTimeout;
            const shortPause = config.settings.shortPause;
            
            await bot.chat('/top');
            await wait(shortPause);

            if (selection.customId === 'Island XP') {
                await bot.clickWindow(2, 0, 0);
                await wait(shortPause);
                await handleIslandExp(bot, selection);
                bot.closeWindow(bot.currentWindow);
            } else if (selection.customId === 'Island Top') {
                await bot.clickWindow(22, 0, 0);
                await wait(shortPause);

                // Show league selection buttons
                const LEAGUES = { 'Recruit': 11, 'Steel': 12, 'Titanium': 13, 'Neon': 14, 'Celestium': 15 };

                const leagueRow = new ActionRowBuilder().addComponents(
                    ...Object.keys(LEAGUES).map(name =>
                        new ButtonBuilder()
                            .setCustomId(`league_${name}`)
                            .setLabel(name)
                            .setStyle(ButtonStyle.Secondary)
                    )
                );

                await selection.update({
                    content: 'Select a league',
                    components: [leagueRow],
                });

                const leagueSelection = await selection.message.awaitMessageComponent({
                    filter: collectorFilter,
                    time: 60_000
                });

                const leagueName = leagueSelection.customId.replace('league_', '');
                const leagueSlot = LEAGUES[leagueName];

                await bot.clickWindow(leagueSlot, 0, 0);
                await wait(shortPause);
                await handleIslandTop(bot, leagueSelection, leagueName);
                bot.closeWindow(bot.currentWindow);
            }

        } catch (error) {
            console.error('Error in /top command:', error);
            await interaction.editReply({
                content: 'Command timed out or an error occurred.',
                components: []
            });
        }
    },
};

async function handleIslandExp(bot, selection) {
    try {
        const hourly = bot.currentWindow.containerItems()[11];
        const daily = bot.currentWindow.containerItems()[12];
        const weekly = bot.currentWindow.containerItems()[14];

        const parseLore = (item) => {
            const json = JSON.parse('[' + item.customLore.toString() + ']');
            return json.filter(x => x)
                .map(x => x.extra.map(y => y.text).filter(z => z).join(''))
                .join('\n')
                .replaceAll("'s Island -", "")
                .replaceAll(" EXP", "");
        };

        const loreHourly = parseLore(hourly);
        const loreDaily = parseLore(daily);
        const loreWeekly = parseLore(weekly);

        const embed = EmbedHelper.createTopEmbed({
            fields: [
                { name: 'Hourly', value: loreHourly || 'No data', inline: true },
                { name: 'Daily', value: loreDaily || 'No data', inline: true },
                { name: 'Weekly', value: loreWeekly || 'No data', inline: true },
            ]
        });

        embed.setDescription('Island EXP Top');

        await selection.update({ embeds: [embed], content: null, components: [] });
    } catch (err) {
        console.error('Error in handleIslandExp:', err);
        await selection.update({
            content: 'Error fetching Island XP data',
            components: []
        });
    }
}

async function handleIslandTop(bot, selection, leagueName) {
    try {
        const slots = [4, 12, 14, 19, 20, 21, 22, 23, 24, 25];
        const items = bot.currentWindow.containerItems();
        const topArr = slots.map(slot => items[slot]);

        const topLoreArr = [];
        for (let i = 0; i < topArr.length; i++) {
            if (topArr[i].name === 'gray_stained_glass_pane') continue;

            const lore = topArr[i].customLore.toString();
            const json = JSON.parse('[' + lore + ']');
            let text = json.filter(x => x)
                .map(x => x.extra.map(y => y.text).filter(z => z).join(''))
                .join('\n')
                .split('+')[0]
                .split('.')[1];

            if (i >= 5) {
                const parts = text.split('Trophy Points:');
                text = parts[0].trim() + '\nTrophy Points:\n' + parts[1].trim();
                text = text.replaceAll(' - Island Level', '\nIs Lvl');
            }

            topLoreArr.push({ text: '```autohotkey\n' + text + '```', index: i });
        }

        const fields = topLoreArr.map(({ text, index }, pos) => ({
            name: `#${pos + 1}`,
            value: text,
            inline: index >= 5
        }));

        const embed = EmbedHelper.createTopEmbed({ fields });
        embed.setDescription(`Island Top — ${leagueName} League`);

        await selection.update({ embeds: [embed], content: null, components: [] });
    } catch (err) {
        console.error('Error in handleIslandTop:', err);
        await selection.update({
            content: 'Error fetching Island Top data',
            components: []
        });
    }
}
