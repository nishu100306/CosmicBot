# CosmicBot V0 - Configuration Guide

This guide explains the new separate configuration system and how to manage multiple bots.

## Configuration Structure

CosmicBot V0 uses a **two-tier configuration system**:

1. **Main Configuration** (`config/main.json`) - Discord settings, appearance, and global settings
2. **Bot Configurations** (`config/bots/*.json`) - Individual configuration file for each Mineflayer bot

## Quick Start

### Step 1: Create Main Configuration

```bash
cp config/main.example.json config/main.json
```

Edit `config/main.json`:
```json
{
  "discord": {
    "token": "YOUR_BOT_TOKEN",
    "clientId": "YOUR_CLIENT_ID",
    "guildId": "YOUR_GUILD_ID"
  },
  "settings": {
    "shortPause": 1000,
    "reconnectDelay": 31000,
    "dataPath": "./data",
    "botsConfigPath": "./config/bots"
  },
  "appearance": {
    "embedColor": "0x9b59b6",
    "botImage": "https://your-image-url.png",
    "botName": "CosmicBot V0"
  }
}
```

### Step 2: Create Bot Configurations

#### Option A: File-Based (Manual)

Create a file `config/bots/mybot.json`:
```json
{
  "id": "mybot",
  "enabled": true,
  "username": "MinecraftUsername",
  "password": "",
  "auth": "microsoft",
  "host": "play.server.com",
  "port": 25565,
  "version": "1.20.4",
  "proxy": {
    "enabled": false,
    "host": "",
    "port": 0,
    "type": "socks5",
    "username": "",
    "password": ""
  },
  "periodicTasks": {
    "enabled": true,
    "interval": 60000,
    "commands": ["/join"],
    "logTopEveryNCycles": 10
  }
}
```

#### Option B: Discord Commands (Dynamic)

After starting the bot, use Discord commands:

```
/addbot id:mybot username:MinecraftUsername host:play.server.com auth:microsoft autostart:true
```

This automatically creates `config/bots/mybot.json`.

## Managing Multiple Bots

### Adding Bots

**Method 1: Create Config File**
```bash
cp config/bots/bot1.example.json config/bots/farmer.json
# Edit farmer.json with your settings
```

**Method 2: Discord Command**
```
/addbot id:farmer username:FarmBot host:mc.server.com auth:microsoft port:25565 version:1.20.4 autostart:true
/addbot id:offline username:OfflineBot host:cracked.server.com auth:offline password:secret123 autostart:true
```

### Editing Bots

**Method 1: Edit Config File**
```bash
# Edit config/bots/farmer.json
# Then restart the bot
```

**Method 2: Discord Command**
```
/editbot id:farmer username:NewUsername host:new.server.com
/editbot id:offline password:newsecretpass
/restartbot id:farmer
```

### Removing Bots

**Method 1: Delete Config File**
```bash
rm config/bots/farmer.json
```

**Method 2: Discord Command**
```
/removebot id:farmer confirm:true
```

### Starting/Stopping Bots

```
/startbot id:farmer
/stopbot id:farmer
/restartbot id:farmer
```

## Configuration Fields Reference

### Main Configuration

| Field | Type | Description |
|-------|------|-------------|
| `discord.token` | string | Discord bot token |
| `discord.clientId` | string | Discord application client ID |
| `discord.guildId` | string | Discord server (guild) ID |
| `settings.shortPause` | number | Delay between bot actions (ms) |
| `settings.reconnectDelay` | number | Delay before reconnecting (ms) |
| `settings.dataPath` | string | Path to data directory |
| `settings.botsConfigPath` | string | Path to bot configs directory |
| `appearance.embedColor` | string | Hex color for Discord embeds |
| `appearance.botImage` | string | URL for bot thumbnail |
| `appearance.botName` | string | Name in embed footers |

### Bot Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique bot identifier |
| `enabled` | boolean | Yes | Auto-start on launch |
| `username` | string | Yes | Minecraft username |
| `password` | string | No | Password (for offline/cracked servers) |
| `auth` | string | Yes | Auth type: `microsoft`, `mojang`, `offline` |
| `host` | string | Yes | Server address |
| `port` | number | No | Server port (default: 25565) |
| `version` | string | No | Minecraft version (default: 1.20.4) |
| `proxy.enabled` | boolean | No | Enable proxy connection |
| `proxy.host` | string | No | Proxy server address |
| `proxy.port` | number | No | Proxy server port |
| `proxy.type` | string | No | Proxy type: `socks4` or `socks5` |
| `proxy.username` | string | No | Proxy authentication username |
| `proxy.password` | string | No | Proxy authentication password |
| `periodicTasks.enabled` | boolean | No | Enable periodic tasks |
| `periodicTasks.interval` | number | No | Task interval in ms |
| `periodicTasks.commands` | array | No | Commands to run each cycle |
| `periodicTasks.logTopEveryNCycles` | number | No | Log frequency |

## Example Configurations

### Example 1: Single Bot (Basic)

`config/bots/main.json`:
```json
{
  "id": "main",
  "enabled": true,
  "username": "MainBot",
  "password": "",
  "auth": "microsoft",
  "host": "play.hypixel.net",
  "port": 25565,
  "version": "1.20.4",
  "periodicTasks": {
    "enabled": true,
    "interval": 60000,
    "commands": ["/join"],
    "logTopEveryNCycles": 10
  }
}
```

### Example 2: Offline/Cracked Server Bot

`config/bots/cracked.json`:
```json
{
  "id": "cracked",
  "enabled": true,
  "username": "CrackedBot",
  "password": "mypassword123",
  "auth": "offline",
  "host": "cracked.server.com",
  "port": 25565,
  "version": "1.20.4",
  "periodicTasks": {
    "enabled": true,
    "interval": 60000,
    "commands": ["/spawn"],
    "logTopEveryNCycles": 0
  }
}
```

### Example 3: Multiple Bots

`config/bots/farmer.json`:
```json
{
  "id": "farmer",
  "password": "",
  "enabled": true,
  "username": "FarmBot",
  "auth": "microsoft",
  "host": "farm.server.com",
  "port": 25565,
  "version": "1.20.4",
  "periodicTasks": {
    "enabled": true,
    "interval": 120000,
    "commands": ["/join", "/farm start"],
    "logTopEveryNCycles": 5
  }
}
```

`config/bots/miner.json`:
```json
{
  "id": "miner",
  "enabled": true,
  "username": "MineBot",
  "password": "",
  "auth": "microsoft",
  "host": "mine.server.com",
  "port": 25565,
  "version": "1.20.4",
  "periodicTasks": {
    "enabled": true,
    "interval": 90000,
    "commands": ["/join", "/mine"],
    "logTopEveryNCycles": 15
  }
}
```

### Example 4: Disabled Bot (Configured but not running)

`config/bots/backup.json`:
```json
{
  "id": "miner",
  "enabled": true,
  "username": "MineBot",
  "auth": "microsoft",
  "host": "mine.server.com",
  "port": 25565,
  "version": "1.20.4",
  "periodicTasks": {
    "enabled": true,
    "interval": 90000,
    "commands": ["/join", "/mine"],
    "logTopEveryNCycles": 15
  }
}
```

### Example 3: Disabled Bot (Configured but not running)

`config/bots/backup.json`:
```json
{
  "id": "backup",
  "enabled": false,
  "username": "BackupBot",
  "auth": "offline",
  "host": "localhost",
  "port": 25565,
  "version": "1.20.4",
  "periodicTasks": {
    "enabled": false,
    "interval": 60000,
    "commands": [],
    "logTopEveryNCycles": 0
  }
}
```

Start when needed: `/startbot id:backup`

### Example 5: Bot with SOCKS5 Proxy

`config/bots/proxy-bot.json`:
```json
{
  "id": "proxy-bot",
  "enabled": true,
  "username": "ProxyBot",
  "password": "",
  "auth": "microsoft",
  "host": "play.server.com",
  "port": 25565,
  "version": "1.20.4",
  "proxy": {
    "enabled": true,
    "host": "proxy.example.com",
    "port": 1080,
    "type": "socks5",
    "username": "proxy_user",
    "password": "proxy_pass"
  },
  "periodicTasks": {
    "enabled": true,
    "interval": 60000,
    "commands": ["/join"],
    "logTopEveryNCycles": 10
  }
}
```

### Example 6: Bot with SOCKS4 Proxy (No Auth)

`config/bots/socks4-bot.json`:
```json
{
  "id": "socks4-bot",
  "enabled": true,
  "username": "Socks4Bot",
  "password": "",
  "auth": "microsoft",
  "host": "mc.server.com",
  "port": 25565,
  "version": "1.20.4",
  "proxy": {
    "enabled": true,
    "host": "socks4.proxy.com",
    "port": 1080,
    "type": "socks4",
    "username": "",
    "password": ""
  },
  "periodicTasks": {
    "enabled": true,
    "interval": 60000,
    "commands": ["/spawn"],
    "logTopEveryNCycles": 5
  }
}
```

## Best Practices

### Naming Conventions
- Use descriptive bot IDs: `farmer`, `miner`, `trader`, `main`
- Avoid special characters in IDs (use letters, numbers, underscores)
- Keep IDs lowercase for consistency

### File Organization
```
config/bots/
├── farmer.json       # Production bot
├── miner.json        # Production bot
├── test.json         # Testing bot (enabled: false)
└── backup.json       # Backup bot (enabled: false)
```

### Version Control
- Commit example files: `*.example.json`
- **Do NOT commit** actual configs: `main.json`, `config/bots/*.json` (except examples)
- Use `.gitignore` to exclude sensitive configs

### Security
- Never share config files containing:
  - Discord bot tokens
  - Microsoft/Mojang account credentials
- Store credentials securely
- Use environment variables for sensitive data (future feature)

## Troubleshooting

### Bot Not Loading

**Check config file exists:**
```bash
ls config/bots/mybot.json
```

**Validate JSON syntax:**
```bash
cat config/bots/mybot.json | python -m json.tool
```

**Check logs:**
Look for error messages when starting the bot.

### Configuration Not Updating

**If using file-based config:**
```
/restartbot id:mybot
```

**If using Discord commands:**
Changes apply on next start/restart.

### Multiple Bots Conflicting

- Ensure each bot has a unique `id`
- Check that bots aren't using the same username on the same server
- Verify network/server allows multiple connections

### Proxy Connection Issues

**Check proxy settings:**
- Verify proxy host and port are correct
- Ensure proxy type matches your proxy server (socks4 vs socks5)
- Check if proxy requires authentication

**Test proxy connection:**
```bash
# Test with curl (Linux/Mac)
curl --socks5 proxy.example.com:1080 https://google.com

# Or with proxy authentication
curl --socks5 proxy_user:proxy_pass@proxy.example.com:1080 https://google.com
```

**Common issues:**
- Firewall blocking proxy connection
- Proxy credentials incorrect
- Proxy server down or not responding
- Wrong proxy type specified

## Migration from PhoenixBotV1

1. **Copy your old config:**
   ```bash
   # Old: config/config.json
   # New: config/main.json
   ```

2. **Extract bot settings:**
   - Move bot-specific settings from `config.bots[]` to separate files
   - Create `config/bots/{botId}.json` for each bot

3. **Update field names:**
   - `config.json` → `main.json`
   - `config.bots[]` → individual `config/bots/*.json` files

4. **Test configuration:**
   ```bash
   npm start
   ```

5. **Verify bots load:**
   ```
   /status
   /listbots
   ```

## Advanced Usage

### Dynamic Bot Creation via API

You can programmatically add bots:

```javascript
const botConfig = {
  id: 'dynamic-bot',
  enabled: true,
  username: 'DynamicBot',
  auth: 'microsoft',
  host: 'server.com',
  port: 25565,
  version: '1.20.4',
  periodicTasks: {
    enabled: true,
    interval: 60000,
    commands: ['/join'],
    logTopEveryNCycles: 10
  }
};

await botConfigManager.saveConfig(botConfig);
botManager.createBot(botConfig);
```

### Custom Periodic Tasks

Modify `periodicTasks.commands` for different behaviors:

```json
{
  "periodicTasks": {
    "enabled": true,
    "interval": 30000,
    "commands": [
      "/join",
      "/is",
      "/balance",
      "/quest check"
    ],
    "logTopEveryNCycles": 20
  }
}
```

### Conditional Bot Starting

Set `enabled: false` and use Discord commands:

```
/startbot id:mybot
```

Only start when needed.

### Using Proxy Servers

CosmicBot V0 supports SOCKS4 and SOCKS5 proxy servers for bot connections.

**Use cases:**
- Bypass IP-based rate limiting
- Connect from restricted networks
- Mask bot IP addresses
- Use residential proxies for better reliability

**Setup:**

1. **Add proxy to existing bot (file-based):**
   ```bash
   # Edit config/bots/mybot.json
   ```
   ```json
   {
     "proxy": {
       "enabled": true,
       "host": "proxy.server.com",
       "port": 1080,
       "type": "socks5",
       "username": "user",
       "password": "pass"
     }
   }
   ```
   Then restart: `/restartbot id:mybot`

2. **Create new bot with proxy (from template):**
   ```bash
   cp config/bots/bot-with-proxy.example.json config/bots/proxy-bot.json
   # Edit proxy-bot.json with your proxy details
   ```

3. **Note:** Proxy configuration via Discord `/editbot` command is not yet supported. You must edit the config file directly and restart the bot.

**Proxy Types:**
- **SOCKS5**: Full TCP proxy with authentication support (recommended)
- **SOCKS4**: Basic TCP proxy without authentication

**Security:**
- Keep proxy credentials secure
- Don't share config files containing proxy passwords
- Use dedicated proxy accounts per bot if possible

## Support

For issues or questions:
1. Check the main [README.md](README.md)
2. Review command reference: `/help`
3. Check bot status: `/status`
4. Report issues on GitHub
