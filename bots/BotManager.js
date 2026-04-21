const mineflayer = require('mineflayer');
const mc = require('minecraft-protocol');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const socks = require('socks').SocksClient

class BotManager extends EventEmitter {
    constructor(config) {
        super();
        this.config = config;
        this.bots = new Map();
        this.botInstances = new Map();
    }

    /**
     * Initialize all enabled bots from config
     */
    initializeBots() {
        const enabledBots = this.config.bots.filter(bot => bot.enabled);

        for (const botConfig of enabledBots) {
            this.createBot(botConfig);
        }

        console.log(`Initialized ${this.bots.size} bot(s)`);
    }

    /**
     * Create a single bot instance
     */
    createBot(botConfig) {
        if (this.bots.has(botConfig.id)) {
            console.log(`Bot ${botConfig.id} already exists`);
            return this.bots.get(botConfig.id);
        }

        const botOptions = {
            host: botConfig.host,
            port: botConfig.port,
            username: botConfig.username,
            auth: botConfig.auth,
            version: botConfig.version
        };

        // Add password if provided (for offline/cracked servers or specific auth types)
        if (botConfig.password) {
            botOptions.password = botConfig.password;
        }

        let bot;

        // If proxy is enabled, create socket through SOCKS proxy first
        if (botConfig.proxy && botConfig.proxy.enabled) {
            console.log(`[${botConfig.id}] Configuring ${botConfig.proxy.type.toUpperCase()} proxy ${botConfig.proxy.host}:${botConfig.proxy.port}`);

            // Pre-create the SOCKS connection before bot creation
            console.log(`[${botConfig.id}] Pre-creating SOCKS connection to ${botConfig.proxy.host}:${botConfig.proxy.port}`);
            console.log(`[${botConfig.id}] Destination: ${botConfig.host}:${botConfig.port}`);

            // This will be populated when connect is called
            let proxySocket = null;
            let socketReady = false;

            // Create mineflayer bot with the proxy socket using callback-based SOCKS
            const clientOptions = {
                host: botConfig.host,
                port: botConfig.port,
                username: botConfig.username,
                auth: botConfig.auth,
                version: botConfig.version,
                connect: (client) => {
                    console.log(`[${botConfig.id}] Connect function called, creating proxy socket...`);

                    socks.createConnection(
                        {
                            proxy: {
                                host: botConfig.proxy.host,
                                port: botConfig.proxy.port,
                                type: 5,
                            },
                            command: 'connect',
                            destination: {
                                host: botConfig.host,
                                port: botConfig.port,
                            },
                        },
                        (err, info) => {
                            if (err) {
                                console.error(`[${botConfig.id}] SOCKS connection error:`, err);
                                client.emit('error', err);
                                return;
                            }

                            console.log(`[${botConfig.id}] SOCKS proxy connection established`);

                            // Add socket error handlers for debugging
                            info.socket.on('error', (sockErr) => {
                                console.error(`[${botConfig.id}] Socket error:`, sockErr);
                            });

                            info.socket.on('close', () => {
                                console.log(`[${botConfig.id}] Socket closed`);
                            });

                            proxySocket = info.socket;
                            socketReady = true;

                            console.log(`[${botConfig.id}] Setting socket on client...`);
                            client.setSocket(proxySocket);
                            console.log(`[${botConfig.id}] Emitting connect event...`);
                            client.emit('connect');
                            console.log(`[${botConfig.id}] Connect event emitted`);
                        }
                    );
                }
            };

            bot = mineflayer.createBot(clientOptions);
        } else {
            // No proxy, create mineflayer bot directly
            bot = mineflayer.createBot(botOptions);
        }

        this.bots.set(botConfig.id, bot);
        this.botInstances.set(botConfig.id, {
            config: botConfig,
            bot: bot,
            status: 'connecting',
            lastError: null
        });

        this.bindEvents(botConfig.id, bot, botConfig);

        return bot;
    }

    /**
     * Bind event handlers to a bot
     */
    bindEvents(botId, bot, botConfig) {
        // Raise the listener cap — mineflayer re-attaches configuration-phase handlers
        // on each handshake cycle, and some servers trigger multiple cycles per bot.
        // The login-loop detector will force a reconnect before real leaks occur.
        bot._client.setMaxListeners(50);

        bot.on('start', () => {
            console.log(`[${botId}] Bot started (start event)`)
        });

        bot.on('login', () => {
            const instance = this.botInstances.get(botId);
            if (!instance || instance.bot !== bot) return;

            const now = Date.now();
            instance.loginTimestamps = (instance.loginTimestamps || []).filter(t => now - t < 10000);
            instance.loginTimestamps.push(now);

            // Rate-limit the log to avoid spamming Discord when stuck in a loop
            if (instance.loginTimestamps.length <= 3) {
                console.log(`[${botId}] Bot login event fired (dim: ${bot.game?.dimension})`);
            } else if (instance.loginTimestamps.length === 4) {
                console.log(`[${botId}] Bot login event firing rapidly — suppressing further logs`);
            }

            // Detect login-loop: 10+ logins in 10s means the bot is stuck being re-logged by the server
            if (instance.loginTimestamps.length >= 10 && !instance.loginLoopDetected) {
                instance.loginLoopDetected = true;
                console.error(`[${botId}] Login loop detected (${instance.loginTimestamps.length} logins in 10s) — forcing reconnect`);
                this.reconnect(botId);
            }
        });

        bot._client.on('connect', () => {
            console.log(`[${botId}] Client connect event fired`);
        });

        bot._client.on('session', () => {
            console.log(`[${botId}] Client session event fired`);
        });

        bot.on('spawn', () => {
            console.log(`[${botId}] Bot logged in as ${bot.username} (spawn event)`);
            const instance = this.botInstances.get(botId);
            instance.status = 'online';
            this.emit('botSpawn', botId, bot);

            // Start periodic tasks if enabled
            if (botConfig.periodicTasks?.enabled) {
                this.startPeriodicTasks(botId);
            }
        });

        bot.on('end', (reason) => {
            console.log(`[${botId}] Bot disconnected: ${reason}`);
            const instance = this.botInstances.get(botId);
            if (!instance || instance.bot !== bot) return;

            instance.status = 'offline';
            this.emit('botEnd', botId, reason);

            // Stop periodic tasks immediately so stale intervals stop firing on the dead bot
            if (instance.intervalId) {
                clearInterval(instance.intervalId);
                instance.intervalId = null;
            }

            // Guard against multiple reconnects being scheduled
            if (instance.reconnectTimeout) return;

            instance.reconnectTimeout = setTimeout(() => {
                instance.reconnectTimeout = null;
                this.reconnect(botId);
            }, this.config.settings.reconnectDelay);
        });

        bot.on('error', (err) => {
            console.error(`[${botId}] Error:`, err);
            const instance = this.botInstances.get(botId);
            instance.lastError = err.message;
            this.emit('botError', botId, err);
        });

        bot.on('kicked', (reason) => {
            console.log(`[${botId}] Kicked: ${reason}`);
            this.emit('botKicked', botId, reason);
        });

        bot.on('respawn', () => {
            if (bot.currentWindow) {
                console.log(`[${botId}] Respawn detected with open window — force-closing to prevent chat lock`);
                bot.closeWindow(bot.currentWindow);
            }
        });
    }

    /**
     * Reconnect a bot
     */
    reconnect(botId) {
        const instance = this.botInstances.get(botId);
        if (!instance) {
            console.error(`[${botId}] Bot instance not found for reconnect`);
            return;
        }

        console.log(`[${botId}] Attempting to reconnect...`);

        const botConfig = instance.config;
        const oldBot = instance.bot;

        // Clear any pending reconnect timeout and periodic interval
        if (instance.reconnectTimeout) {
            clearTimeout(instance.reconnectTimeout);
            instance.reconnectTimeout = null;
        }
        if (instance.intervalId) {
            clearInterval(instance.intervalId);
            instance.intervalId = null;
        }

        // Detach listeners and force-close the old bot to release sockets/resources
        if (oldBot) {
            try {
                oldBot.removeAllListeners();
                if (oldBot._client) {
                    oldBot._client.removeAllListeners();
                }
                oldBot.end();
            } catch (err) {
                console.error(`[${botId}] Error cleaning up old bot:`, err.message);
            }
        }

        // Remove old bot/instance references so createBot starts fresh
        this.bots.delete(botId);
        this.botInstances.delete(botId);

        // Create new bot with same config
        this.createBot(botConfig);
    }

    /**
     * Start periodic tasks for a bot
     */
    startPeriodicTasks(botId) {
        const instance = this.botInstances.get(botId);
        if (!instance || !instance.config.periodicTasks?.enabled) return;

        const bot = instance.bot;
        const config = instance.config.periodicTasks;
        let cycleCount = 0;

        const executePeriodicTasks = async () => {
            try {
                if (instance.status !== 'online') return;

                const wait = require('node:timers/promises').setTimeout;
                const shortPause = this.config.settings.shortPause;

                // Execute configured commands
                for (const command of config.commands || []) {
                    await wait(shortPause);
                    bot.chat(command);
                }

                // Log top data every N cycles
                if (config.logTopEveryNCycles && cycleCount % config.logTopEveryNCycles === 0) {
                    this.emit('topLogRequest', botId, bot);
                }

                cycleCount++;
            } catch (err) {
                console.error(`[${botId}] Error in periodic tasks:`, err);
            }
        };

        // Clear existing interval if any
        if (instance.intervalId) {
            clearInterval(instance.intervalId);
        }

        // Start new interval
        instance.intervalId = setInterval(executePeriodicTasks, config.interval);
        console.log(`[${botId}] Periodic tasks started (interval: ${config.interval}ms)`);
    }

    /**
     * Get a bot by ID
     */
    getBot(botId) {
        return this.bots.get(botId);
    }

    /**
     * Get all bots
     */
    getAllBots() {
        return Array.from(this.bots.entries());
    }

    /**
     * Get bot status information
     */
    getBotStatus(botId) {
        const instance = this.botInstances.get(botId);
        if (!instance) return null;

        return {
            id: botId,
            username: instance.bot.username,
            status: instance.status,
            lastError: instance.lastError,
            host: instance.config.host
        };
    }

    /**
     * Get all bot statuses
     */
    getAllBotStatuses() {
        const statuses = [];
        for (const [botId, _] of this.botInstances) {
            statuses.push(this.getBotStatus(botId));
        }
        return statuses;
    }

    /**
     * Stop a bot
     */
    stopBot(botId) {
        const instance = this.botInstances.get(botId);
        if (!instance) return false;

        if (instance.intervalId) {
            clearInterval(instance.intervalId);
            instance.intervalId = null;
        }
        if (instance.reconnectTimeout) {
            clearTimeout(instance.reconnectTimeout);
            instance.reconnectTimeout = null;
        }

        try {
            instance.bot.removeAllListeners();
            instance.bot.quit();
        } catch (err) {
            console.error(`[${botId}] Error stopping bot:`, err.message);
        }
        this.bots.delete(botId);
        this.botInstances.delete(botId);

        console.log(`[${botId}] Bot stopped`);
        return true;
    }

    /**
     * Stop all bots
     */
    stopAllBots() {
        for (const [botId, _] of this.botInstances) {
            this.stopBot(botId);
        }
    }
}

module.exports = BotManager;
