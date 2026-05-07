import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';


export const linkCommand = new SlashCommandBuilder()
  .setName('link')
  .setDescription('Link your Discord account to your Northline RP website account')
  .addStringOption((opt) => opt
    .setName('code')
    .setDescription('The 5-minute link code generated from your Northline website dashboard')
    .setRequired(true)
    .setMinLength(4)
    .setMaxLength(40));

export const northlineCommand = new SlashCommandBuilder()
  .setName('northline')
  .setDescription('Northline RP website and game-server utilities')
  .addSubcommand((sub) => sub.setName('status').setDescription('Show the current server status'))
  .addSubcommand((sub) => sub.setName('players').setDescription('Show the current connected players'))
  .addSubcommand((sub) => sub.setName('deaths').setDescription('Show current death/fatality stats'))
  .addSubcommand((sub) => sub.setName('fun').setDescription('Show a random Northline city status'))
  .addSubcommand((sub) => sub
    .setName('broadcast')
    .setDescription('Send a server broadcast through the website command bridge')
    .addStringOption((opt) => opt.setName('message').setDescription('Broadcast message').setRequired(true).setMaxLength(180)))
  .addSubcommand((sub) => sub
    .setName('kick')
    .setDescription('Kick a connected player by SteamID64')
    .addStringOption((opt) => opt.setName('steamid').setDescription('Target SteamID64').setRequired(true).setMinLength(15).setMaxLength(20))
    .addStringOption((opt) => opt.setName('reason').setDescription('Kick reason').setRequired(true).setMaxLength(180))
    .addStringOption((opt) => opt.setName('name').setDescription('Optional player name for logs').setRequired(false).setMaxLength(80)))
  .addSubcommand((sub) => sub
    .setName('ban')
    .setDescription('Ban a player by SteamID64')
    .addStringOption((opt) => opt.setName('steamid').setDescription('Target SteamID64').setRequired(true).setMinLength(15).setMaxLength(20))
    .addStringOption((opt) => opt.setName('reason').setDescription('Ban reason').setRequired(true).setMaxLength(180))
    .addIntegerOption((opt) => opt.setName('duration_minutes').setDescription('Optional duration in minutes; omit for permanent').setRequired(false).setMinValue(1).setMaxValue(5256000))
    .addStringOption((opt) => opt.setName('name').setDescription('Optional player name for logs').setRequired(false).setMaxLength(80)))
  .addSubcommand((sub) => sub
    .setName('server')
    .setDescription('Run a server power action')
    .addStringOption((opt) => opt.setName('action').setDescription('Power action').setRequired(true).addChoices(
      { name: 'Start', value: 'start' },
      { name: 'Kill', value: 'kill' },
      { name: 'Restart', value: 'restart' },
      { name: 'Update', value: 'update' },
    )));

export const announceCommand = new SlashCommandBuilder()
  .setName('announce')
  .setDescription('Send a polished announcement embed')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
  .addStringOption((opt) => opt.setName('title').setDescription('Embed title').setRequired(true).setMaxLength(256))
  .addStringOption((opt) => opt.setName('message').setDescription('Embed body').setRequired(true).setMaxLength(4000))
  .addChannelOption((opt) => opt.setName('channel').setDescription('Destination channel; defaults to current channel').setRequired(false).addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
  .addStringOption((opt) => opt.setName('color').setDescription('Hex color, e.g. #1d9bf0').setRequired(false).setMaxLength(12))
  .addStringOption((opt) => opt.setName('image_url').setDescription('Optional image URL').setRequired(false).setMaxLength(500))
  .addStringOption((opt) => opt.setName('thumbnail_url').setDescription('Optional thumbnail URL').setRequired(false).setMaxLength(500))
  .addStringOption((opt) => opt.setName('author').setDescription('Optional author label').setRequired(false).setMaxLength(256))
  .addStringOption((opt) => opt.setName('footer').setDescription('Optional footer label').setRequired(false).setMaxLength(256))
  .addBooleanOption((opt) => opt.setName('timestamp').setDescription('Include current timestamp').setRequired(false));

export const discordModCommand = new SlashCommandBuilder()
  .setName('discordmod')
  .setDescription('Discord moderation tools')
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  .addSubcommand((sub) => sub
    .setName('timeout')
    .setDescription('Timeout a Discord member')
    .addUserOption((opt) => opt.setName('user').setDescription('Member').setRequired(true))
    .addIntegerOption((opt) => opt.setName('minutes').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(40320))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason').setRequired(false).setMaxLength(300)))
  .addSubcommand((sub) => sub
    .setName('untimeout')
    .setDescription('Remove a Discord timeout')
    .addUserOption((opt) => opt.setName('user').setDescription('Member').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason').setRequired(false).setMaxLength(300)))
  .addSubcommand((sub) => sub
    .setName('kick')
    .setDescription('Kick a Discord member')
    .addUserOption((opt) => opt.setName('user').setDescription('Member').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason').setRequired(false).setMaxLength(300)))
  .addSubcommand((sub) => sub
    .setName('ban')
    .setDescription('Ban a Discord member')
    .addUserOption((opt) => opt.setName('user').setDescription('Member').setRequired(true))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason').setRequired(false).setMaxLength(300))
    .addIntegerOption((opt) => opt.setName('delete_message_days').setDescription('Delete recent message days').setRequired(false).setMinValue(0).setMaxValue(7)))
  .addSubcommand((sub) => sub
    .setName('purge')
    .setDescription('Bulk delete recent messages in this channel')
    .addIntegerOption((opt) => opt.setName('amount').setDescription('Messages to delete, 1-100').setRequired(true).setMinValue(1).setMaxValue(100))
    .addStringOption((opt) => opt.setName('reason').setDescription('Reason').setRequired(false).setMaxLength(300)));

export const commands = [linkCommand, northlineCommand, announceCommand, discordModCommand].map((command) => command.toJSON());
