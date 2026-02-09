const fsp = require('node:fs/promises');
const path = require('path');

class TopRecord {
    constructor(league, leader, level, position, trophies, timestamp) {
        this.league = league;
        this.leader = leader;
        this.level = level;
        this.position = position;
        this.trophies = trophies;
        this.timestamp = timestamp;
    }

    toString() {
        return `${this.league},${this.leader},${this.level},${this.position},${this.trophies},${this.timestamp}`;
    }
}

class DataLogger {
    constructor(dataPath) {
        this.dataPath = dataPath;
        this.islandDataFile = path.join(dataPath, 'islands', 'isTopData.txt');
        this.playersDir = path.join(dataPath, 'players');
    }

    /**
     * Log island top data
     */
    async logTopData(bot, shortPause = require('../config/main.json')) {
        try {
            const wait = require('node:timers/promises').setTimeout;

            const LEAGUES = Object.freeze({
                'Recruit': 11,
                'Steel': 12,
                'Titanium': 13,
                'Neon': 14,
                'Celestium': 15
            })

            // Open the /is top menu
            await bot.chat('/is top');
            await wait(shortPause);
            if (await bot.currentWindow === null) {
                console.log('failed to open ./is top menu. check if bot is in the lobby')
                return false;
            }
            for (const key of Object.keys(LEAGUES)) {
                await bot.clickWindow(LEAGUES[key], 0, 0);
                await wait(shortPause);

                // Get top 10 items
                const topArr = new Array(10);
                const slots = [4, 12, 14, 19, 20, 21, 22, 23, 24, 25];

                for (let i = 0; i < 10; i++) {
                    topArr[i] = bot.currentWindow.containerItems()[slots[i]];
                }

                

                // Parse and save top data
                for (let i = 0; i < 10; i++) {
                    if (topArr[i].name === "gray_stained_glass_pane") {
                        continue;
                    }
                    const league = key;
                    const lore = topArr[i].customLore.toString();
                    const json = JSON.parse('[' + lore + ']');
                    const loreText = json.filter(x => x)
                        .map(x => x.extra.map(y => y.text).filter(z => z).join(''))
                        .join('\n')
                        .split('+')[0];

                    const leader = loreText.split('. ')[1].split(' - ')[0];
                    const level = loreText.split('Island Level ')[1].split('\n')[0];
                    const position = loreText.split('.')[0];
                    const trophies = loreText.split('Trophy Points: ')[1]
                        .replaceAll(',', '')
                        .replaceAll('\n', '');
                    const timestamp = Math.floor(Date.now() / 1000);

                    const record = new TopRecord(league, leader, level, position, trophies, timestamp);
                    await fsp.appendFile(this.islandDataFile, record.toString() + '\n');
                }
                
                //Click "Back to top islands" button
                await bot.clickWindow(26, 0, 0)
                await wait(shortPause);
                
                
            }
            await bot.closeWindow(bot.currentWindow);
            await fsp.appendFile(this.islandDataFile, "", {flish: true});
            console.log(`[DataLogger] Logged top data at ${new Date().toLocaleString()}`);
            // Log island XP data
            // await this.logIslandXP(bot, shortPause);  
            return true;

        } catch (err) {
            console.error('[DataLogger] Error logging top data:', err);
            return false;
        }
    }

    /**
     * Log island XP data for current island
     */
    async logIslandXP(bot, shortPause = 1000) {
        try {
            const wait = require('node:timers/promises').setTimeout;

            await wait(shortPause);
            await bot.chat('/is');
            await wait(shortPause);
            await bot.clickWindow(6, 0, 0);
            await wait(shortPause);
            await bot.clickWindow(26, 0, 0);
            await wait(shortPause);
            await bot.clickWindow(6, 0, 0);
            await wait(shortPause);

            const items = bot.currentWindow.containerItems();

            for (let i = 0; i < items.length; i++) {
                if (items[i].customName.includes('.')) {
                    const nameJson = JSON.parse('[' + items[i].customName + ']');
                    const name = nameJson.filter(x => x)
                        .map(x => x.extra.map(y => y.text).filter(z => z).join(''))
                        .join('\n');
                    const ign = name.split('.')[1].trim();

                    const loreJson = JSON.parse('[' + items[i].customLore + ']');
                    const lore = loreJson.filter(x => x)
                        .map(x => x.extra.map(y => y.text).filter(z => z).join(''))
                        .join('\n');
                    const exp = lore.split(':')[1].trim().replaceAll(',', '');

                    const playerFile = path.join(this.playersDir, `${ign}.txt`);
                    const timestamp = Math.floor(Date.now() / 1000);
                    await fsp.appendFile(playerFile, `${exp},${timestamp}\n`);
                }
            }

            bot.closeWindow(bot.currentWindow);
            return true;
        } catch (err) {
            console.error('[DataLogger] Error logging island XP:', err);
            return false;
        }
    }

    /**
     * Read island data from file
     */
    async readIslandData() {
        try {
            const file = await fsp.readFile(this.islandDataFile, { encoding: 'utf8' });
            return file.split('\n').filter(line => line.trim() !== '');
        } catch (err) {
            console.error('[DataLogger] Error reading island data:', err);
            return [];
        }
    }

    /**
     * Get island statistics
     */
    async getIslandStats(leaderName) {
        const fileLines = await this.readIslandData();

        let stats = {
            found: false,
            league: 'unknown',
            leader: leaderName,
            level: -1,
            trophies: -1,
            rank: -1,
            trophyTimestamp: -1,
            rankTimestamp: -1,
            recentTrophies: -1,
            recentTime: -1,
            hourData: { time: Number.MAX_SAFE_INTEGER, trophies: -1 },
            dayData: { time: Number.MAX_SAFE_INTEGER, trophies: -1 },
            secondData: { time: -1, trophies: -1 }
        };

        for (let i = fileLines.length - 1; i >= 0; i--) {
            const elements = fileLines[i].split(',');
            if (elements[1].toLowerCase() === leaderName.toLowerCase()) {
                stats.found = true;
                stats.league = elements[0]
                stats.leader = elements[1];

                const currLvl = parseInt(elements[2], 10);
                const currRank = parseInt(elements[3], 10);
                const currTrophies = parseInt(elements[4], 10);
                const currTime = parseInt(elements[5], 10) * 1000;

                if (currLvl > stats.level) {
                    stats.level = currLvl;
                }

                if (currTrophies > stats.trophies) {
                    stats.trophies = currTrophies;
                    stats.trophyTimestamp = currTime;
                }

                if (stats.rank === -1 && currRank !== -1) {
                    stats.rank = currRank;
                    stats.rankTimestamp = currTime;
                }

                if (currTime > stats.recentTime) {
                    stats.recentTime = currTime;
                    stats.recentTrophies = currTrophies;
                }

                // Find data points for calculations
                if (stats.recentTime !== -1 && stats.recentTime - currTime >= (5 * 60 * 1000)) {
                    if (currTime > stats.secondData.time) {
                        stats.secondData.time = currTime;
                        stats.secondData.trophies = currTrophies;
                    }
                }

                if (Date.now() - currTime <= (60 * 60 * 1000 * 1.2)) {
                    if (currTime < stats.hourData.time && stats.recentTime - currTime >= (5 * 60 * 1000)) {
                        stats.hourData.time = currTime;
                        stats.hourData.trophies = currTrophies;
                    }
                }

                if (Date.now() - currTime <= (24 * 60 * 60 * 1000 * 1.1) && stats.recentTime - currTime >= (5 * 60 * 1000)) {
                    if (currTime < stats.dayData.time) {
                        stats.dayData.time = currTime;
                        stats.dayData.trophies = currTrophies;
                    }
                }
            }
        }

        return stats;
    }
}

module.exports = DataLogger;
