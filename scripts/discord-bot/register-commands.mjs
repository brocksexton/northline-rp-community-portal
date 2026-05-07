import { REST, Routes } from 'discord.js';
import { commands } from './commands.mjs';

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_BOT_CLIENT_ID;
const guildId = process.env.DISCORD_BOT_GUILD_ID;

if (!token || !clientId) {
  console.error('Missing DISCORD_BOT_TOKEN or DISCORD_BOT_CLIENT_ID.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);
const route = guildId ? Routes.applicationGuildCommands(clientId, guildId) : Routes.applicationCommands(clientId);
const scope = guildId ? `guild ${guildId}` : 'global';

console.log(`Registering ${commands.length} Northline bot command groups to ${scope}...`);
await rest.put(route, { body: commands });
console.log('Northline bot commands registered.');
