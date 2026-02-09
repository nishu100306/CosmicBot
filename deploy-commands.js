const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// Load configuration
let config;
try {
    config = require('./config/main.json');
} catch (err) {
    console.error('Error loading main.json. Please copy main.example.json to main.json and configure it.');
    process.exit(1);
}

const { token, clientId, guildId } = config.discord;

const commands = [];

// Grab all command files
const commandsPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
    const folderPath = path.join(commandsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(folderPath, file);
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.log(`[WARNING] Command at ${filePath} is missing "data" or "execute" property.`);
        }
    }
}

// Deploy commands
const rest = new REST().setToken(token);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();
