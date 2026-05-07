import { loadNorthlineEnv } from '../shared/load-env.mjs';
loadNorthlineEnv({ debug: true });
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';

const token = process.env.DISCORD_BOT_TOKEN;
const apiSecret = process.env.NORTHLINE_BOT_API_SECRET || process.env.DISCORD_BOT_API_SECRET;
const apiBase = (process.env.NORTHLINE_BOT_API_BASE_URL || process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const defaultColor = parseColor(process.env.NORTHLINE_BOT_EMBED_COLOR || '#1d9bf0');
const publicUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || apiBase;
const bannerUrl = process.env.NORTHLINE_BOT_BANNER_URL || '';

if (!token) {
  console.error('Missing DISCORD_BOT_TOKEN.');
  process.exit(1);
}
if (!apiSecret || apiSecret.length < 24) {
  console.error('Missing NORTHLINE_BOT_API_SECRET / DISCORD_BOT_API_SECRET. Use a long random value and match it in the website .env.local.');
  process.exit(1);
}

const adminRoles = splitIds(process.env.NORTHLINE_BOT_ADMIN_ROLE_IDS);
const modRoles = splitIds(process.env.NORTHLINE_BOT_MOD_ROLE_IDS);
const announceRoles = splitIds(process.env.NORTHLINE_BOT_ANNOUNCE_ROLE_IDS);

const botIntents = [GatewayIntentBits.Guilds];
if (/^true$/i.test(process.env.NORTHLINE_BOT_ENABLE_PRIVILEGED_INTENTS || '')) {
  botIntents.push(GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages);
}

const client = new Client({ intents: botIntents });

function splitIds(value) {
  return String(value || '').split(',').map((part) => part.trim()).filter(Boolean);
}

function parseColor(value) {
  const text = String(value || '').trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(text)) return Number.parseInt(text, 16);
  return 0x1d9bf0;
}

function clean(value, max = 1024) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, Math.max(0, max - 1))}…` : text;
}

function hasAnyRole(member, roleIds) {
  if (!roleIds.length) return false;
  return roleIds.some((roleId) => member.roles.cache.has(roleId));
}

function canAdmin(interaction) {
  const member = interaction.member;
  return Boolean(member?.permissions?.has(PermissionFlagsBits.Administrator) || hasAnyRole(member, adminRoles));
}

function canModerate(interaction) {
  const member = interaction.member;
  return Boolean(
    member?.permissions?.has(PermissionFlagsBits.Administrator)
    || member?.permissions?.has(PermissionFlagsBits.ModerateMembers)
    || hasAnyRole(member, adminRoles)
    || hasAnyRole(member, modRoles)
  );
}

function canAnnounce(interaction) {
  const member = interaction.member;
  return Boolean(
    member?.permissions?.has(PermissionFlagsBits.Administrator)
    || member?.permissions?.has(PermissionFlagsBits.ManageMessages)
    || hasAnyRole(member, adminRoles)
    || hasAnyRole(member, announceRoles)
  );
}

async function apiGet(path) {
  const response = await fetch(`${apiBase}${path}`, {
    headers: { 'x-northline-bot-secret': apiSecret },
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Website API returned ${response.status}`);
  return data;
}

async function apiPost(path, body) {
  const response = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-northline-bot-secret': apiSecret },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Website API returned ${response.status}`);
  return data;
}

function baseEmbed(title) {
  const embed = new EmbedBuilder()
    .setColor(defaultColor)
    .setTitle(title)
    .setURL(publicUrl)
    .setFooter({ text: 'Northline RP Discord Bot' })
    .setTimestamp(new Date());
  if (bannerUrl) embed.setImage(bannerUrl);
  return embed;
}

function statusEmoji(state) {
  if (state === 'online') return '🟢';
  if (state === 'quiet') return '🟡';
  if (state === 'offline') return '🔴';
  return '⚪';
}

async function statusEmbed() {
  const data = await apiGet('/api/bot/summary');
  const runtime = data.runtime || {};
  const pop = data.population || {};
  const deaths = data.deaths || {};
  const playerCount = runtime.playerCount ?? pop.onlineCount ?? 0;
  const maxPlayers = runtime.maxPlayers ?? data.server?.maxPlayers ?? '—';
  return baseEmbed(`${statusEmoji(runtime.state)} ${data.server?.name || 'Northline RP'} status`)
    .setDescription(clean(runtime.message || runtime.label || 'Status unavailable.', 2048))
    .addFields(
      { name: 'Status', value: clean(runtime.label || runtime.state || 'Unknown'), inline: true },
      { name: 'Players', value: `${playerCount}/${maxPlayers}`, inline: true },
      { name: 'Fatality rate', value: `${Math.round((deaths.fatalityRate || 0) * 1000) / 10}%`, inline: true },
      { name: 'Deaths', value: `${deaths.total ?? 0} fatal events`, inline: true },
      { name: 'Latest signal', value: runtime.lastSignalAt ? `<t:${Math.floor(new Date(runtime.lastSignalAt).getTime() / 1000)}:R>` : '—', inline: true },
      { name: 'Open website', value: publicUrl, inline: false },
    );
}

async function playersEmbed() {
  const data = await apiGet('/api/bot/summary');
  const players = Array.isArray(data.players) ? data.players : [];
  const description = players.length
    ? players.slice(0, 20).map((player, index) => `${index + 1}. **${clean(player.rpName || player.name || 'Unknown', 64)}** \`${player.steamId}\``).join('\n')
    : 'Nobody is connected right now.';
  return baseEmbed(`Connected players (${players.length})`).setDescription(description);
}

async function deathsEmbed() {
  const data = await apiGet('/api/bot/summary');
  const deaths = data.deaths || {};
  const categories = Array.isArray(deaths.categories) ? deaths.categories.slice(0, 5) : [];
  const topVictims = Array.isArray(deaths.topVictims) ? deaths.topVictims.slice(0, 3) : [];
  const embed = baseEmbed('Northline mortality report')
    .setDescription(`Current fatality rate: **${Math.round((deaths.fatalityRate || 0) * 1000) / 10}%** across **${deaths.damageEvents ?? 0}** damage events.`)
    .addFields(
      { name: 'Fatal events', value: String(deaths.total ?? 0), inline: true },
      { name: 'Latest fatality', value: deaths.latestAt ? `<t:${Math.floor(new Date(deaths.latestAt).getTime() / 1000)}:R>` : '—', inline: true },
    );
  if (categories.length) embed.addFields({ name: 'Top categories', value: categories.map((cat) => `**${cat.label}:** ${cat.count}`).join('\n') });
  if (topVictims.length) embed.addFields({ name: 'Most endangered locals', value: topVictims.map((victim) => `**${clean(victim.name, 60)}:** ${victim.count}`).join('\n') });
  return embed;
}

async function funEmbed() {
  const data = await apiGet('/api/bot/summary');
  const players = data.players?.length ?? data.population?.onlineCount ?? 0;
  const deaths = data.deaths?.total ?? 0;
  const lines = [
    `City forecast: ${players} locals outside and a 70% chance of questionable decisions.`,
    `Northline OSHA report: ${deaths} fatal events logged and absolutely no lessons learned.`,
    players > 0 ? `${players} people are currently roleplaying, arguing, working, or discovering gravity.` : 'The streets are quiet. Too quiet. Someone should check the alleys.',
    data.runtime?.online ? 'Server heartbeat detected. The city is legally alive.' : 'Server heartbeat is not looking great. The city may be napping.',
  ];
  return baseEmbed('Northline city vibe check').setDescription(lines[Math.floor(Math.random() * lines.length)]);
}

async function sendNorthlineAction(interaction, body) {
  const data = await apiPost('/api/bot/server-action', {
    ...body,
    actorId: interaction.user.id,
    actorName: `${interaction.user.tag}`,
  });
  const record = data.record || {};
  return baseEmbed(record.status === 'failed' ? 'Action failed' : record.status === 'queued' ? 'Action queued' : 'Action sent')
    .setColor(record.status === 'failed' ? 0xed4245 : record.status === 'queued' ? 0xfee75c : 0x57f287)
    .addFields(
      { name: 'Command', value: clean(record.command || '—'), inline: false },
      { name: 'Delivery', value: clean(record.delivery || '—'), inline: true },
      { name: 'Status', value: clean(record.status || '—'), inline: true },
      { name: 'Result', value: clean(record.result || 'No result returned.', 1000), inline: false },
    );
}

async function handleNorthline(interaction) {
  const sub = interaction.options.getSubcommand();
  if (['broadcast', 'kick', 'ban'].includes(sub) && !canModerate(interaction)) return interaction.reply({ content: 'You need Discord moderation permissions or a configured Northline mod/admin role.', ephemeral: true });
  if (sub === 'server' && !canAdmin(interaction)) return interaction.reply({ content: 'You need Administrator or a configured Northline admin role for server power actions.', ephemeral: true });

  await interaction.deferReply({ ephemeral: ['broadcast', 'kick', 'ban', 'server'].includes(sub) });
  try {
    if (sub === 'status') return interaction.editReply({ embeds: [await statusEmbed()] });
    if (sub === 'players') return interaction.editReply({ embeds: [await playersEmbed()] });
    if (sub === 'deaths') return interaction.editReply({ embeds: [await deathsEmbed()] });
    if (sub === 'fun') return interaction.editReply({ embeds: [await funEmbed()] });
    if (sub === 'broadcast') {
      const embed = await sendNorthlineAction(interaction, { type: 'broadcast', message: interaction.options.getString('message', true) });
      return interaction.editReply({ embeds: [embed] });
    }
    if (sub === 'kick' || sub === 'ban') {
      const embed = await sendNorthlineAction(interaction, {
        type: 'moderation',
        action: sub,
        steamId: interaction.options.getString('steamid', true),
        name: interaction.options.getString('name') || null,
        reason: interaction.options.getString('reason', true),
        durationMinutes: sub === 'ban' ? interaction.options.getInteger('duration_minutes') : null,
      });
      return interaction.editReply({ embeds: [embed] });
    }
    if (sub === 'server') {
      const embed = await sendNorthlineAction(interaction, { type: 'server-control', action: interaction.options.getString('action', true) });
      return interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    return interaction.editReply({ content: error instanceof Error ? error.message : 'Northline bot action failed.' });
  }
}

async function handleAnnounce(interaction) {
  if (!canAnnounce(interaction)) return interaction.reply({ content: 'You need Manage Messages or a configured Northline announcement role.', ephemeral: true });
  const channel = interaction.options.getChannel('channel') || interaction.channel;
  if (!channel?.isTextBased?.()) return interaction.reply({ content: 'That channel cannot receive announcements.', ephemeral: true });
  const embed = new EmbedBuilder()
    .setTitle(clean(interaction.options.getString('title', true), 256))
    .setDescription(clean(interaction.options.getString('message', true), 4000))
    .setColor(parseColor(interaction.options.getString('color') || defaultColor.toString(16)));
  const imageUrl = interaction.options.getString('image_url');
  const thumbnailUrl = interaction.options.getString('thumbnail_url');
  const author = interaction.options.getString('author');
  const footer = interaction.options.getString('footer');
  if (imageUrl) embed.setImage(imageUrl);
  if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);
  if (author) embed.setAuthor({ name: clean(author, 256) });
  if (footer) embed.setFooter({ text: clean(footer, 256) });
  if (interaction.options.getBoolean('timestamp')) embed.setTimestamp(new Date());
  await channel.send({ embeds: [embed] });
  return interaction.reply({ content: `Announcement sent to ${channel}.`, ephemeral: true });
}

async function handleDiscordMod(interaction) {
  if (!canModerate(interaction)) return interaction.reply({ content: 'You need Discord moderation permissions or a configured Northline mod/admin role.', ephemeral: true });
  const sub = interaction.options.getSubcommand();
  await interaction.deferReply({ ephemeral: true });
  try {
    if (sub === 'purge') {
      const amount = interaction.options.getInteger('amount', true);
      const deleted = await interaction.channel.bulkDelete(amount, true);
      return interaction.editReply(`Deleted ${deleted.size} recent messages.`);
    }

    const user = interaction.options.getUser('user', true);
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const reason = interaction.options.getString('reason') || `Requested by ${interaction.user.tag}`;
    if (!member && sub !== 'ban') return interaction.editReply('That member is not in this server.');

    if (sub === 'timeout') {
      const minutes = interaction.options.getInteger('minutes', true);
      await member.timeout(minutes * 60 * 1000, reason);
      return interaction.editReply(`Timed out ${user.tag} for ${minutes} minute(s).`);
    }
    if (sub === 'untimeout') {
      await member.timeout(null, reason);
      return interaction.editReply(`Removed timeout from ${user.tag}.`);
    }
    if (sub === 'kick') {
      await member.kick(reason);
      return interaction.editReply(`Kicked ${user.tag}.`);
    }
    if (sub === 'ban') {
      const deleteMessageSeconds = (interaction.options.getInteger('delete_message_days') || 0) * 86400;
      await interaction.guild.members.ban(user.id, { reason, deleteMessageSeconds });
      return interaction.editReply(`Banned ${user.tag}.`);
    }
  } catch (error) {
    return interaction.editReply(error instanceof Error ? error.message : 'Discord moderation action failed.');
  }
}

client.once('ready', () => {
  console.log(`Northline Discord bot signed in as ${client.user.tag}. API: ${apiBase}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'northline') return handleNorthline(interaction);
  if (interaction.commandName === 'announce') return handleAnnounce(interaction);
  if (interaction.commandName === 'discordmod') return handleDiscordMod(interaction);
});

client.on('error', (error) => console.error('[northline-discord-bot]', error));
await client.login(token);
