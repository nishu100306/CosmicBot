# Changelog

## Version 0.1.0 - Initial Release

### Major Features

#### Separate Bot Configuration System
- **Individual config files**: Each bot has its own JSON file in `config/bots/`
- **Main configuration**: Global settings separated into `config/main.json`
- **Dynamic management**: No need to restart main bot to add/remove bots

#### Bot Management Commands (9 new commands)
- `/addbot` - Create new bot configurations via Discord
- `/removebot` - Remove bot configurations
- `/editbot` - Edit existing bot settings
- `/startbot` - Start a configured bot
- `/stopbot` - Stop a running bot
- `/restartbot` - Restart with updated configuration
- `/status` - Enhanced bot status overview
- `/listbots` - List all configured bots
- `/chat` - Send messages through specific bots

#### Configuration Manager
- **BotConfigManager** utility class for file-based config management
- Automatic validation of bot configurations
- Support for multiple authentication types (Microsoft, Mojang, Offline)

#### Improved Architecture
- Event-driven bot lifecycle management
- Separate concerns: BotManager, DataLogger, BotConfigManager
- Centralized configuration loading
- Better error handling and status reporting

### Analytics Commands (4 commands)
- `/info [island_name]` - Island statistics and trophy tracking
- `/top [bot]` - Interactive leaderboard viewer
- `/leaderboard [timeframe] [limit]` - Trophy growth rankings
- `/compare [island1] [island2]` - Head-to-head island comparison

### Appearance Customization
- Configurable embed colors
- Configurable bot image/logo
- Configurable bot name in footers

### Proxy Support
- SOCKS4 and SOCKS5 proxy support
- Per-bot proxy configuration
- Optional proxy authentication (username/password)
- Template configuration file: `bot-with-proxy.example.json`

### File Structure
```
CosmicBotV0/
├── bots/BotManager.js
├── commands/
│   ├── analytics/ (4 commands)
│   ├── bot-control/ (9 commands)
│   └── utility/ (1 command)
├── config/
│   ├── main.json (main configuration)
│   └── bots/ (individual bot configs)
├── utils/
│   ├── botConfigManager.js
│   ├── dataLogger.js
│   └── embedBuilder.js
└── data/
    ├── islands/
    ├── players/
    └── logs/
```

### Breaking Changes from PhoenixBotV1

⚠️ **Configuration Changes:**
- `config.json` split into `main.json` and `bots/*.json`
- Bot configurations now in separate files
- New required fields in main config: `botsConfigPath`

⚠️ **Migration Required:**
1. Copy `config.json` to `config/main.json`
2. Move `bots[]` array items to individual files in `config/bots/`
3. Update Discord token paths if needed

### Improvements Over PhoenixBotV1

1. ✅ Scalability - Unlimited bots vs single bot
2. ✅ Separate configs - One file per bot
3. ✅ Dynamic management - Add/edit/remove without restart
4. ✅ 14 commands vs 3 commands
5. ✅ Admin permission controls
6. ✅ Configuration validation
7. ✅ Better error handling
8. ✅ Event-driven architecture
9. ✅ Modular code organization
10. ✅ Customizable appearance
11. ✅ Password authentication support
12. ✅ Proxy server support (SOCKS4/SOCKS5)

### Known Limitations

- Bot configurations must be valid JSON
- Bot IDs must be unique
- Maximum bot count limited by system resources
- No encryption for stored credentials (passwords stored in plain text)
- Proxy configuration not available via Discord commands (must edit config file)

### Future Enhancements

- Environment variable support for credentials
- Web-based configuration UI
- Bot performance metrics
- Automated backups
- Multi-server support
- Plugin system
- Real-time bot logs viewer

### Dependencies

- discord.js: ^14.21.0
- minecraft-protocol: ^1.62.0
- mineflayer: ^4.30.0
- socks: ^2.7.1
- Node.js: >=16.0.0

### Documentation

- [README.md](README.md) - Main documentation
- [CONFIGURATION_GUIDE.md](CONFIGURATION_GUIDE.md) - Detailed config guide
- Setup scripts: `setup.sh` (Linux/Mac) and `setup.bat` (Windows)

### Contributors

- Initial development and architecture
- PhoenixBotV1 as foundation

---

## Version History

### v0.1.0 (Current)
- Initial release with separate configuration system
- 14 Discord commands
- Multi-bot support
- Dynamic bot management
