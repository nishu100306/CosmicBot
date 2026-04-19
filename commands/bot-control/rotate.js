const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;
const shortPause = require('../../config/main.json');
const getOnlinePlayers = require('../../utils/getOnlinePlayers');
const EmbedHelper = require('../../utils/embedBuilder');

class player {
    constructor(online, name, isRank) {
        this.online = online;
        this.name = name;
        this.isRank = isRank;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rotate')
        .setDescription('can rotate players')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('The player to invite')
                .setRequired(true)
        ),
    async execute(interaction) {
        const sent = await interaction.reply({
            content: 'Loading...',
            fetchReply: true,
            flags: MessageFlags.Ephemeral
        });

        const botManager = global.botManager;
        const config = global.config;

        // Get bot to use
        const botId = interaction.options.getString('bot') || config.settings.defaultBot;
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

        const username = interaction.options.getString('username');
        const names = await getOnlinePlayers(bot);

        let currPlayers;
        let maxPlayers;
        const members = new Array(10);
        try {
            await bot.chat('/is members');
            await wait(1000);
            let windowTitle = bot.currentWindow.title.value;
            currPlayers = parseInt(windowTitle.substring(windowTitle.indexOf("(") + 1, windowTitle.lastIndexOf(" /")).trim());
            maxPlayers = parseInt(windowTitle.substring(windowTitle.indexOf("/ ") + 1, windowTitle.lastIndexOf(")")).trim());
            for (let i = 0; i < 24; i++) {
                members[i] = bot.currentWindow.containerItems()[i];
                if (members[i] == null || members[i].customLore == null) {
                    break;
                }
                const lore = members[i].customLore.toString();
                        let json = JSON.parse('[' + lore + ']');
                        const loreText = json.filter(x => x)
                            .map(x => x.extra.map(y => y.text).filter(z => z).join(''))
                            .join('\n')
                            .split('+')[0];
                const nameLore = members[i].customName.toString();
                    json = JSON.parse('[' + nameLore + ']');
                    const memberName = json.filter(x => x)
                            .map(x => x.extra.map(y => y.text).filter(z => z).join(''))
                            .join('\n')
                            .split('+')[0];
                if (memberName.startsWith('Default Member Rank')) {
                    members.splice(i);
                    break;
                }
                members[i] = memberName + '\n' + loreText;

            }
        } finally {
            if (bot.currentWindow) {
                try {
                    bot.closeWindow(bot.currentWindow);
                } catch (err) {
                    console.error('[/rotate] Error closing window in finally:', err.message);
                }
            }
        }


        let onlinePlayers = new Array();
        for (let i = 0; i < names.length; i++) {
            onlinePlayers[i] = new player(true, names[i], null);
        }
        let islandMembers = new Array();
        for (let i = 0; i < members.length; i++) {
            const rank = members[i].split('\n')[2];
            const memberName = members[i].split('\n')[0];
            let isOnline = false;
            for (let i = 0; i < onlinePlayers.length; i++) {
                const onlineName = onlinePlayers[i].name;
                if (onlineName.toLowerCase() === memberName.toLowerCase()) {
                    isOnline = true;
                }
            }
            
            islandMembers[i] = new player(isOnline, memberName, rank);
        }

        // Check if the player is already an island member
        const alreadyMember = islandMembers.find(m => m.name.toLowerCase() === username.toLowerCase());
        if (alreadyMember) {
            await interaction.editReply({ content: 'This player is already an island member.' });
            return;
        }

        // Island has open slots — skip kicking, just invite
        if (currPlayers < maxPlayers) {
            const inviteEmbed = EmbedHelper.createBaseEmbed()
                .setTitle('Player Rotation')
                .setThumbnail(`https://mineskin.eu/bust/${username}/100.png`)
                .setDescription(
                    `**Inviting:** ${username}\n` +
                    `Island has open slots (${currPlayers}/${maxPlayers}) — no kick needed.`
                );

            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('rotate_confirm')
                    .setLabel('Confirm')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('rotate_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger)
            );

            await interaction.editReply({ content: null, embeds: [inviteEmbed], components: [confirmRow] });

            const collectorFilter = i => i.user.id === interaction.user.id;
            try {
                const buttonSelection = await sent.awaitMessageComponent({
                    filter: collectorFilter,
                    time: 60_000
                });

                if (buttonSelection.customId === 'rotate_confirm') {
                    await buttonSelection.deferUpdate();
                    await wait(1000);
                    await bot.chat(`/is invite ${username}`);
                    await interaction.editReply({ content: `Inviting ${username}`, embeds: [], components: [] });
                } else {
                    await buttonSelection.update({ content: 'Rotation cancelled.', embeds: [], components: [] });
                }
            } catch (err) {
                console.error('Rotate invite error:', err);
                await interaction.editReply({ content: 'Selection timed out.', embeds: [], components: [] });
            }
            return;
        }

        // Find kickable players: rank is Member or Recruit
        const kickableOffline = islandMembers.filter(m => !m.online && (m.isRank === 'Member' || m.isRank === 'Recruit'));
        const kickableOnline = islandMembers.filter(m => m.online && (m.isRank === 'Member' || m.isRank === 'Recruit'));

        if (kickableOffline.length === 0 && kickableOnline.length === 0) {
            await interaction.editReply({ content: 'No eligible players to kick. All members have protected ranks.' });
            return;
        }

        // Primary kick is randomly selected from offline candidates
        const primaryKick = kickableOffline.length > 0
            ? kickableOffline[Math.floor(Math.random() * kickableOffline.length)]
            : kickableOnline[Math.floor(Math.random() * kickableOnline.length)];

        const offlineAlternatives = kickableOffline.filter(p => p.name !== primaryKick.name);
        const onlineAlternatives = kickableOnline.filter(p => p.name !== primaryKick.name);

        // Build the embed
        let description = `**Inviting:** ${username}\n` +
            `**Kicking:** ${primaryKick.name} (${primaryKick.isRank})${primaryKick.online ? ' - Online' : ''}\n`;

        if (offlineAlternatives.length > 0) {
            description += `\n**Offline Alternatives:**\n${offlineAlternatives.map(p => `- ${p.name} (${p.isRank})`).join('\n')}`;
        }
        if (onlineAlternatives.length > 0) {
            description += `\n**Online Alternatives:**\n${onlineAlternatives.map(p => `- ${p.name} (${p.isRank})`).join('\n')}`;
        }
        if (offlineAlternatives.length === 0 && onlineAlternatives.length === 0) {
            description += '\nNo alternative players to kick.';
        }

        const embed = EmbedHelper.createBaseEmbed()
            .setTitle('Player Rotation')
            .setThumbnail(`https://mineskin.eu/bust/${username}/100.png`)
            .setDescription(description);

        // Build dropdown options
        const options = [
            { label: 'Confirm', description: `Kick ${primaryKick.name} and invite ${username}`, value: 'confirm' },
            { label: 'Cancel', description: 'Cancel the rotation', value: 'cancel' },
            ...offlineAlternatives.map(p => ({
                label: `Kick ${p.name} instead`,
                description: `${p.isRank} - Offline`,
                value: `kick_${p.name}`
            })),
            ...onlineAlternatives.map(p => ({
                label: `Kick ONLINE ${p.name} instead`,
                description: `${p.isRank} - Online`,
                value: `kick_${p.name}`
            }))
        ];

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('rotate_select')
            .setPlaceholder('Choose an action')
            .addOptions(options.slice(0, 25));

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await interaction.editReply({
            content: null,
            embeds: [embed],
            components: [row]
        });

        const collectorFilter = i => i.user.id === interaction.user.id;

        try {
            const selection = await sent.awaitMessageComponent({
                filter: collectorFilter,
                time: 60_000
            });

            if (selection.values[0] === 'confirm') {
                await selection.deferUpdate();
                await wait(1000);
                await bot.chat(`/is kick ${primaryKick.name}`);
                await wait(1000);
                await bot.chat(`/is invite ${username}`);
                await interaction.editReply({ content: `Rotating: kicking ${primaryKick.name}, inviting ${username}`, embeds: [], components: [] });
                return;
            }

            if (selection.values[0] === 'cancel') {
                await selection.update({ content: 'Rotation cancelled.', embeds: [], components: [] });
                return;
            }

            // Alternative player selected — show confirm/cancel buttons
            const selectedName = selection.values[0].replace('kick_', '');
            const selectedPlayer = islandMembers.find(m => m.name === selectedName);
            const selectedStatus = selectedPlayer?.online ? 'Online' : 'Offline';

            const confirmEmbed = EmbedHelper.createBaseEmbed()
                .setTitle('Player Rotation — Confirm')
                .setThumbnail(`https://mineskin.eu/bust/${username}/100.png`)
                .setDescription(
                    `**Inviting:** ${username}\n` +
                    `**Kicking:** ${selectedName} (${selectedStatus})\n\n` +
                    `Are you sure?`
                );

            const confirmRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('rotate_confirm')
                    .setLabel('Confirm')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('rotate_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger)
            );

            await selection.update({ embeds: [confirmEmbed], components: [confirmRow] });

            const buttonSelection = await sent.awaitMessageComponent({
                filter: collectorFilter,
                time: 60_000
            });

            if (buttonSelection.customId === 'rotate_confirm') {
                await buttonSelection.deferUpdate();
                await wait(1000);
                await bot.chat(`/is kick ${selectedName}`);
                await wait(1000);
                await bot.chat(`/is invite ${username}`);
                await interaction.editReply({ content: `Rotating: kicking ${selectedName}, inviting ${username}`, embeds: [], components: [] });
            } else {
                await buttonSelection.update({ content: 'Rotation cancelled.', embeds: [], components: [] });
            }

        } catch (err) {
            console.error('Rotate error:', err);
            await interaction.editReply({ content: 'Selection timed out.', embeds: [], components: [] });
        }

    }
}