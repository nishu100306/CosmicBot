const wait = require('node:timers/promises').setTimeout;

async function getOnlinePlayers(bot, delay = 100, timeout = 400) {
    await wait(delay);
    const results = await bot.tabComplete("/msg ", { assumeCommand: true, sendBlockInSight: false, timeout: 10000});
    return results.map(p => p.match);
}

module.exports = getOnlinePlayers;
