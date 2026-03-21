function getInstancePlayers(bot) {
    return Object.keys(bot.players).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}

module.exports = getInstancePlayers;
