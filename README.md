# CosmicBot V0

A multi-bot Minecraft analytics bot with Discord integration. Supports multiple simultaneous Mineflayer bots for data collection and provides comprehensive Discord commands for analytics and bot management.

## Features

### Multi-Bot Support
- Configure and run multiple Mineflayer bots simultaneously
- **Separate configuration files for each bot** - Easy management and version control
- **Dynamic bot management** - Add, remove, edit, start, and stop bots via Discord commands
- Independent bot management with auto-reconnect
- Per-bot configuration for tasks and intervals
- Bot status monitoring

### Discord Commands

#### Utility
- `/ping` - Check bot latency and status

#### Bot Control (Admin only)
- `/addbot` - Add a new bot configuration
- `/removebot` - Remove a bot configuration
- `/editbot` - Edit existing bot configuration
- `/startbot` - Start a configured bot
- `/stopbot` - Stop a running bot
- `/restartbot` - Restart a bot with latest configuration
- `/status` - View status of all Mineflayer bots
- `/listbots` - List all configured bots
- `/chat [message] [bot]` - Send chat messages through a bot

#### Analytics
- `/info [island_name]` - Detailed island statistics and trophy tracking
- `/top [bot]` - Interactive leaderboard viewer (Island XP & Top 10)
- `/leaderboard [timeframe] [limit]` - Trophy growth rankings
- `/compare [island1] [island2]` - Compare two islands head-to-head

### Data Collection
- Automated periodic data logging
- Island leaderboard tracking
- Player XP monitoring
- Historical data storage

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure the Main Settings**
   ```bash
   cp config/main.example.json config/main.json
   ```

   Edit `config/main.json` with your settings:
   - Discord token, client ID, and guild ID
   - Data storage paths
   - Bot appearance (color, image, name)

3. **Create Your First Bot Configuration**
   ```bash
   cp config/bots/bot1.example.json config/bots/mybot.json
   ```

   Edit `config/bots/mybot.json` with your bot settings:
   - Minecraft username and authentication
   - Server host and port
   - Periodic tasks and intervals

   **OR** use Discord commands to add bots dynamically (after step 4):
   ```
   /addbot id:mybot username:BotName host:play.server.com auth:microsoft autostart:true
   ```

4. **Deploy Discord Commands**
   ```bash
   npm run deploy
   ```

5. **Start the Bot**
   ```bash
   npm start
   ```

## File Structure

```
CosmicBotV0/
├── bots/
│   └── BotManager.js          # Multi-bot manager with event handling
├── commands/
│   ├── analytics/             # Data analysis commands (4 commands)
│   │   ├── info.js
│   │   ├── top.js
│   │   ├── leaderboard.js
│   │   └── compare.js
│   ├── bot-control/           # Bot management commands (9 commands)
│   │   ├── addbot.js
│   │   ├── removebot.js
│   │   ├── editbot.js
│   │   ├── startbot.js
│   │   ├── stopbot.js
│   │   ├── restartbot.js
│   │   ├── status.js
│   │   ├── chat.js
│   │   └── listbots.js
│   └── utility/               # General utility commands (1 command)
│       └── ping.js
├── config/
│   ├── main.json              # Main configuration (create from example)
│   ├── main.example.json      # Example main configuration
│   └── bots/                  # Individual bot configurations
│       └── bot1.example.json  # Example bot configuration
├── data/                      # Data storage
│   ├── islands/               # Island leaderboard data
│   ├── logs/                  # Bot logs
│   └── players/               # Player XP data
├── utils/
│   ├── botConfigManager.js    # Bot configuration file management
│   ├── dataLogger.js          # Data collection and analysis
│   └── embedBuilder.js        # Discord embed helpers
├── index.js                   # Main application entry point
├── deploy-commands.js         # Discord slash command deployer
├── package.json
└── README.md
```

## Configuration

### Main Configuration (`config/main.json`)

```json
{
  "discord": {
    "token": "YOUR_DISCORD_BOT_TOKEN",
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

### Bot Configuration (`config/bots/{botId}.json`)

Each bot has its own configuration file in the `config/bots/` directory:

```json
{
  "id": "unique_bot_id",
  "enabled": true,
  "username": "bot_username",
  "password": "",
  "auth": "microsoft",
  "host": "server.address",
  "port": 25565,
  "version": "1.20.4",
  "proxy": {
    "enabled": false,
    "host": "proxy.server.com",
    "port": 1080,
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

**Configuration Fields:**
- **id**: Unique identifier for the bot
- **enabled**: Whether to auto-start this bot on launch
- **username**: Minecraft username
- **password**: Password for authentication (optional, for offline/cracked servers)
- **auth**: Authentication type (`microsoft`, `mojang`, or `offline`)
- **host**: Minecraft server address
- **port**: Server port (default: 25565)
- **version**: Minecraft version (e.g., "1.20.4")
- **proxy**: Proxy server configuration (optional)
  - **enabled**: Enable proxy connection
  - **host**: Proxy server address
  - **port**: Proxy server port
  - **type**: Proxy type (`socks4` or `socks5`)
  - **username**: Proxy authentication username (optional)
  - **password**: Proxy authentication password (optional)
- **periodicTasks**: Automated task configuration
  - **enabled**: Enable periodic tasks
  - **interval**: Time between task cycles (milliseconds)
  - **commands**: Commands to run each cycle
  - **logTopEveryNCycles**: Log leaderboard data every N cycles

### Managing Bots

#### Option 1: File-Based Management
Create/edit JSON files in `config/bots/` directory. Each file must be named `{botId}.json`.

**Example:** `config/bots/farmer.json`
```json
{
  "id": "farmer",
  "enabled": true,
  "username": "FarmBot",
  "auth": "microsoft",
  "host": "play.hypixel.net",
  "port": 25565,
  "version": "1.20.4",
  "periodicTasks": {
    "enabled": true,
    "interval": 60000,
    "commands": ["/join", "/is"],
    "logTopEveryNCycles": 10
  }
}
```

Restart the bot to apply changes.

**Example with Proxy:** `config/bots/proxy-bot.json`
```json
{
  "id": "proxy-bot",
  "enabled": true,
  "username": "ProxyBot",
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

#### Option 2: Discord Command Management (Recommended)

**Add a new bot:**
```
/addbot id:farmer username:FarmBot host:play.hypixel.net auth:microsoft autostart:true
/addbot id:cracked username:CrackedBot host:cracked.server.com auth:offline password:mypassword autostart:true
```

**Edit bot settings:**
```
/editbot id:farmer port:25566 enabled:false
/editbot id:cracked password:newpassword
```

**Remove a bot:**
```
/removebot id:farmer confirm:true
```

**Control bots:**
```
/startbot id:farmer
/stopbot id:farmer
/restartbot id:farmer
```

### Appearance Configuration
Customize the Discord embed appearance in `config/main.json`:

- **embedColor**: Hex color code for Discord embeds (must be string format with "0x" prefix)
- **botImage**: URL to the bot's thumbnail/icon image
- **botName**: Name displayed in embed footers

## Bot Management Workflow

1. **Add a new bot** using `/addbot` or create a config file
2. **Bot starts automatically** if `enabled: true` or `autostart: true`
3. **Monitor status** with `/status` or `/listbots`
4. **Edit configuration** with `/editbot` or edit the JSON file
5. **Restart to apply changes** with `/restartbot`
6. **Remove when done** with `/removebot`

## Improvements Over PhoenixBotV1

1. **Scalability**: Support for unlimited bots vs single bot
2. **Separate Bot Configs**: Each bot has its own configuration file
3. **Dynamic Bot Management**: Add/remove/edit bots without restarting
4. **Better Organization**: Separated concerns into logical modules
5. **More Commands**: 14 commands vs 3 (info, top, leaderboard, compare, status, listbots, chat, ping, addbot, removebot, editbot, startbot, stopbot, restartbot)
6. **Command Categories**: Organized into utility, bot-control, and analytics
7. **Event-Driven Architecture**: BotManager uses EventEmitter for better control flow
8. **Centralized Data Management**: DataLogger class handles all data operations
9. **Configuration Manager**: BotConfigManager for file-based bot configs
10. **Reusable Components**: EmbedHelper for consistent Discord embeds
11. **Error Handling**: Improved error handling and status reporting
12. **Bot Selection**: Commands can specify which bot to use
13. **Admin Controls**: Permission-based bot control commands
14. **Configurable Appearance**: Customize embed colors and images
15. **Proxy Support**: SOCKS4/SOCKS5 proxy support with authentication

## Data Storage

- **Island Data**: `data/islands/isTopData.txt` - CSV format leaderboard data
- **Player Data**: `data/players/[username].txt` - Per-player XP tracking
- **Bot Configs**: `config/bots/[botId].json` - Individual bot configurations
- **Logs**: `data/logs/` - Bot operation logs (future feature)

## Command Reference

### Analytics Commands
| Command | Description | Options |
|---------|-------------|---------|
| `/info` | Island statistics | `island_name` (required) |
| `/top` | View leaderboards | `bot` (optional) |
| `/leaderboard` | Trophy growth rankings | `timeframe` (hours), `limit` |
| `/compare` | Compare two islands | `island1`, `island2` |

### Bot Control Commands (Admin Only)
| Command | Description | Options |
|---------|-------------|---------|
| `/addbot` | Add new bot | `id`, `username`, `host`, `auth`, `port`, `version`, `password`, `autostart` |
| `/removebot` | Remove bot | `id`, `confirm` |
| `/editbot` | Edit bot config | `id`, `username`, `host`, `port`, `auth`, `version`, `password`, `enabled` |
| `/startbot` | Start a bot | `id` |
| `/stopbot` | Stop a bot | `id` |
| `/restartbot` | Restart a bot | `id` |
| `/status` | View all bot statuses | - |
| `/listbots` | List all bots | - |
| `/chat` | Send chat via bot | `message`, `bot` (optional) |

### Utility Commands
| Command | Description |
|---------|-------------|
| `/ping` | Check latency |

## Troubleshooting

**Bot won't start:**
- Check the bot configuration file exists in `config/bots/`
- Verify authentication credentials
- Check server address and port
- Use `/status` to see error messages

**Configuration not applying:**
- If editing files: Use `/restartbot` to reload configuration
- If using commands: Changes apply immediately on restart

**Commands not showing:**
- Run `npm run deploy` to register commands
- Check bot has Administrator permission in Discord

**Proxy connection issues:**
- Verify proxy host, port, and type are correct
- Check proxy credentials if authentication is required
- Ensure firewall allows proxy connections
- Test proxy with another tool to verify it's working
- Check bot logs for specific proxy error messages

## Using Proxies

CosmicBot V0 supports SOCKS4 and SOCKS5 proxy servers. To use a proxy:

1. **Edit bot config file** to enable proxy and add details
2. **Copy from template:** `cp config/bots/bot-with-proxy.example.json config/bots/mybot.json`
3. **Restart the bot** with `/restartbot id:mybot`

See [CONFIGURATION_GUIDE.md](CONFIGURATION_GUIDE.md#using-proxy-servers) for detailed proxy setup instructions.

## License

ISC
