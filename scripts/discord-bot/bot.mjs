import { loadNorthlineEnv } from '../shared/load-env.mjs';
loadNorthlineEnv({ debug: true });
import { appendFile, open, stat } from 'node:fs/promises';
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  PermissionFlagsBits,
  Partials,
} from 'discord.js';

const token = process.env.DISCORD_BOT_TOKEN;
const apiSecret = process.env.NORTHLINE_BOT_API_SECRET || process.env.DISCORD_BOT_API_SECRET;
const apiBase = (process.env.NORTHLINE_BOT_API_BASE_URL || process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const defaultColor = parseColor(process.env.NORTHLINE_BOT_EMBED_COLOR || '#1d9bf0');
const publicUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || apiBase;
const bannerUrl = process.env.NORTHLINE_BOT_BANNER_URL || '';
const connectionNoticesEnabled = /^true$/i.test(process.env.NORTHLINE_BOT_CONNECTION_NOTICES || '');
const connectionChannelId = (process.env.NORTHLINE_BOT_CONNECTION_CHANNEL_ID || '').trim();
const connectionLogPath = (process.env.NORTHLINE_BOT_CONNECTION_LOG_PATH || process.env.NORTHLINE_SERVER_CONSOLE_LOG_PATH || 'C:\\Servers\\northline-data\\server-console.log').trim();
const connectionPollMs = Math.max(1000, Math.min(Number(process.env.NORTHLINE_BOT_CONNECTION_POLL_MS || 2000) || 2000, 30000));
const connectionDedupeMs = Math.max(5000, Math.min(Number(process.env.NORTHLINE_BOT_CONNECTION_DEDUPE_MS || 45000) || 45000, 300000));
const connectionIncludeSteamId = !/^false$/i.test(process.env.NORTHLINE_BOT_CONNECTION_INCLUDE_STEAMID || 'true');
const connectionProfileBaseUrl = (process.env.NORTHLINE_BOT_PROFILE_BASE_URL || `${publicUrl.replace(/\/$/, '')}/tweeter/profile`).replace(/\/$/, '');
const steamApiKey = (process.env.STEAM_API_KEY || '').trim();
const steamProfileCacheMs = Math.max(60_000, Math.min(Number(process.env.NORTHLINE_BOT_STEAM_PROFILE_CACHE_MS || 900000) || 900000, 86_400_000));
const deathNoticesEnabled = /^true$/i.test(process.env.NORTHLINE_BOT_DEATH_NOTICES || '');
const deathChannelId = (process.env.NORTHLINE_BOT_DEATH_CHANNEL_ID || connectionChannelId || '').trim();
const deathLogPath = (process.env.NORTHLINE_BOT_DEATH_LOG_PATH || connectionLogPath).trim();
const deathPollMs = Math.max(1000, Math.min(Number(process.env.NORTHLINE_BOT_DEATH_POLL_MS || connectionPollMs) || connectionPollMs, 30000));
const deathDedupeMs = Math.max(5000, Math.min(Number(process.env.NORTHLINE_BOT_DEATH_DEDUPE_MS || 45000) || 45000, 300000));
const deathIncludeSteamId = !/^false$/i.test(process.env.NORTHLINE_BOT_DEATH_INCLUDE_STEAMID || 'true');
const deathEventsPath = (process.env.NORTHLINE_BOT_DEATH_EVENTS_PATH || 'C:\\Servers\\northline-data\\death-events.jsonl').trim();


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
const linkedForumRoleId = String(process.env.NORTHLINE_DISCORD_LINKED_ROLE_ID || process.env.DISCORD_LINKED_ROLE_ID || '').trim();
const forumChannelId = String(process.env.NORTHLINE_DISCORD_FORUM_CHANNEL_ID || '').trim();
const forumSyncEnabled = Boolean(forumChannelId) && !/^false$/i.test(process.env.NORTHLINE_BOT_FORUM_SYNC_ENABLED || 'true');
const forumSyncImportUnlinked = /^true$/i.test(process.env.NORTHLINE_BOT_FORUM_IMPORT_UNLINKED || '');
const forumSyncLog = !/^false$/i.test(process.env.NORTHLINE_BOT_FORUM_SYNC_LOG || 'true');

const botIntents = [GatewayIntentBits.Guilds];
if (linkedForumRoleId || /^true$/i.test(process.env.NORTHLINE_BOT_ENABLE_PRIVILEGED_INTENTS || '')) {
  botIntents.push(GatewayIntentBits.GuildMembers);
}
if (forumSyncEnabled || /^true$/i.test(process.env.NORTHLINE_BOT_ENABLE_PRIVILEGED_INTENTS || '')) {
  botIntents.push(GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessageReactions);
}

const client = new Client({ intents: botIntents, partials: [Partials.Message, Partials.Channel, Partials.Reaction] });

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

function steamProfileUrl(steamId) {
  return steamId ? `https://steamcommunity.com/profiles/${steamId}` : null;
}

const steamProfileCache = new Map();

async function getSteamProfile(steamId) {
  if (!steamId) return null;
  const now = Date.now();
  const cached = steamProfileCache.get(steamId);
  if (cached && now - cached.cachedAt < steamProfileCacheMs) return cached.profile;
  const fallback = { steamId, profileUrl: steamProfileUrl(steamId), personaName: null, avatar: null };
  if (!steamApiKey) {
    steamProfileCache.set(steamId, { cachedAt: now, profile: fallback });
    return fallback;
  }

  try {
    const params = new URLSearchParams({ key: steamApiKey, steamids: steamId });
    const response = await fetch(`https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?${params.toString()}`);
    if (!response.ok) throw new Error(`Steam API returned ${response.status}`);
    const data = await response.json();
    const player = data?.response?.players?.[0];
    const profile = {
      steamId,
      profileUrl: player?.profileurl || fallback.profileUrl,
      personaName: player?.personaname || null,
      avatar: player?.avatarfull || player?.avatarmedium || player?.avatar || null,
    };
    steamProfileCache.set(steamId, { cachedAt: now, profile });
    return profile;
  } catch (error) {
    console.warn('[northline-discord-bot] Steam profile lookup failed:', error instanceof Error ? error.message : error);
    steamProfileCache.set(steamId, { cachedAt: now, profile: fallback });
    return fallback;
  }
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

async function apiDelete(path, body) {
  const response = await fetch(`${apiBase}${path}`, {
    method: 'DELETE',
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


function forumMessageBody(message) {
  const content = String(message.content || '').trim();
  const attachments = [...(message.attachments?.values?.() || [])];
  const attachmentLines = attachments.map((attachment) => attachment.url).filter(Boolean);
  const stickerLines = [...(message.stickers?.values?.() || [])].map((sticker) => `[Sticker: ${sticker.name}]`).filter(Boolean);
  const pieces = [content, ...stickerLines, ...attachmentLines].filter(Boolean);
  return pieces.join('\n\n').trim();
}

function isForumThreadChannel(channel) {
  return Boolean(channel?.isThread?.() && channel.parentId === forumChannelId);
}

function isForumStarterMessage(message) {
  // In Discord forum channels the starter message for a post usually has the same ID as the thread.
  // Some gateway events do not have a reliable messageCount yet, so the ID equality is the primary signal.
  return Boolean(message?.channel?.id && message.channel.id === message.id) || Boolean(message?.type === 0 && message?.channel?.messageCount === 1);
}

async function importDiscordForumMessage(message) {
  if (!forumSyncEnabled) return;
  if (!message.guild || message.author?.bot || message.webhookId) return;
  if (!isForumThreadChannel(message.channel)) return;

  const body = forumMessageBody(message);
  if (!body) return;

  const starter = isForumStarterMessage(message);
  const payload = {
    discordThreadId: message.channel.id,
    discordMessageId: message.id,
    discordStarterMessageId: starter ? message.id : '',
    isStarter: starter,
    discordUserId: message.author.id,
    discordUsername: message.author.tag || message.author.username,
    discordAvatarUrl: typeof message.author.displayAvatarURL === 'function' ? message.author.displayAvatarURL({ size: 128 }) : '',
    title: message.channel.name || 'Discord Forum Thread',
    body,
    categoryId: 'general',
    importUnlinked: forumSyncImportUnlinked,
  };

  try {
    // For normal replies in an already-mapped thread this succeeds.
    // For the first message in a Discord-created forum thread, the website does not know the thread yet,
    // so we fall back to creating/importing the thread with that message as the starter post.
    if (!isForumStarterMessage(message)) {
      await apiPost('/api/bot/forum/posts', payload);
      if (forumSyncLog) console.log(`[northline-discord-bot] Imported Discord forum reply ${message.id} from thread ${message.channel.id}.`);
      return;
    }
  } catch (error) {
    if (forumSyncLog) console.warn(`[northline-discord-bot] Reply import fell back to thread import for ${message.id}:`, error instanceof Error ? error.message : error);
  }

  try {
    await apiPost('/api/bot/forum/threads', payload);
    if (forumSyncLog) console.log(`[northline-discord-bot] Imported Discord forum thread ${message.channel.id} from message ${message.id}.`);
  } catch (error) {
    // If the thread already exists and this was not the starter, try once more as a post.
    try {
      await apiPost('/api/bot/forum/posts', payload);
      if (forumSyncLog) console.log(`[northline-discord-bot] Imported Discord forum reply ${message.id} after thread fallback.`);
    } catch (postError) {
      const threadError = error instanceof Error ? error.message : String(error);
      const replyError = postError instanceof Error ? postError.message : String(postError);
      if (forumSyncLog) console.warn(`[northline-discord-bot] Could not import Discord forum message ${message.id}. Thread import: ${threadError}. Reply import: ${replyError}`);
    }
  }
}



function normalizedForumReactionName(reaction) {
  const raw = reaction?.emoji?.name || String(reaction?.emoji || '').trim();
  if (raw === '💙' || raw === 'blue_heart' || raw === ':blue_heart:') return '💙';
  return raw;
}

async function syncDiscordForumReaction(reaction, user, active) {
  if (!forumSyncEnabled || user?.bot) return;
  try {
    if (reaction?.partial) reaction = await reaction.fetch();
    const message = reaction?.message;
    if (message?.partial) await message.fetch();
    if (!message?.guild || !isForumThreadChannel(message.channel)) return;
    const emoji = normalizedForumReactionName(reaction);
    if (emoji !== '💙') return;
    const payload = {
      discordThreadId: message.channel.id,
      discordMessageId: message.id,
      discordUserId: user.id,
      emoji,
    };
    if (active) await apiPost('/api/bot/forum/reactions', payload);
    else await apiDelete('/api/bot/forum/reactions', payload);
    if (forumSyncLog) console.log(`[northline-discord-bot] ${active ? 'Synced' : 'Removed'} Discord forum reaction ${emoji} for message ${message.id}.`);
  } catch (error) {
    if (forumSyncLog) console.warn('[northline-discord-bot] Could not sync Discord forum reaction:', error instanceof Error ? error.message : error);
  }
}

async function deleteDiscordForumWebsitePost(message) {
  if (!forumSyncEnabled) return;
  if (!message.guild || !isForumThreadChannel(message.channel)) return;
  try {
    await apiDelete('/api/bot/forum/posts', {
      discordThreadId: message.channel.id,
      discordMessageId: message.id,
    });
    if (forumSyncLog) console.log(`[northline-discord-bot] Marked Discord forum message ${message.id} hidden on website.`);
  } catch (error) {
    if (forumSyncLog) console.warn(`[northline-discord-bot] Could not hide deleted Discord forum message ${message.id}:`, error instanceof Error ? error.message : error);
  }
}

async function deleteDiscordForumWebsiteThread(thread) {
  if (!forumSyncEnabled || thread.parentId !== forumChannelId) return;
  try {
    await apiDelete('/api/bot/forum/threads', { discordThreadId: thread.id });
    if (forumSyncLog) console.log(`[northline-discord-bot] Marked deleted Discord forum thread ${thread.id} hidden on website.`);
  } catch (error) {
    if (forumSyncLog) console.warn(`[northline-discord-bot] Could not hide deleted Discord forum thread ${thread.id}:`, error instanceof Error ? error.message : error);
  }
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


async function handleLink(interaction) {
  const code = clean(interaction.options.getString('code', true), 40).toUpperCase();
  await interaction.deferReply({ ephemeral: true });
  try {
    const payload = await apiPost('/api/bot/discord-link', {
      code,
      discordUserId: interaction.user.id,
      discordUsername: interaction.user.tag || interaction.user.username,
    });

    const link = payload.link || {};
    const steamId = link.steamId || link.steamId64 || link.steamID || 'linked website account';
    const roleAssigned = Boolean(payload.roleAssigned);

    if (linkedForumRoleId && interaction.guild && !roleAssigned) {
      const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
      if (member && !member.roles.cache.has(linkedForumRoleId)) {
        await member.roles.add(linkedForumRoleId, 'Northline website account linked').catch((error) => {
          console.warn('[northline-discord-bot] Could not add linked forum role:', error instanceof Error ? error.message : error);
        });
      }
    }

    return interaction.editReply({
      content: `✅ Discord linked to Northline account \`${steamId}\`. You can now use the website/forum connection.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not link your Discord account.';
    return interaction.editReply({
      content: `❌ ${message}\nGenerate a fresh code from your Northline dashboard and run \`/link code:<code>\` within 5 minutes.`,
    });
  }
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


const connectionNoticeDedupe = new Map();

function parseConnectionLine(line) {
  const text = String(line || '').replace(/\u001b\[[0-9;]*m/g, '').trim();
  if (!text) return null;

  const steamMatch = text.match(/\[(\d{15,20})\]/);
  const steamId = steamMatch?.[1] || null;

  if (/\bconnected\s+to\s+steam\b/i.test(text) && !steamId) {
    return { action: 'server-started', name: 'Northline RP', steamId: null, raw: text };
  }

  let action = null;
  if (/\b(disconnected|disconnecting|left|has left)\b/i.test(text)) action = 'leave';
  else if (/\b(is connecting|joined|has joined)\b/i.test(text) || (/\bconnected\b/i.test(text) && steamId)) action = 'join';
  if (!action) return null;

  // User-facing join/leave notices should only be emitted for real player lines.
  // Server lifecycle lines such as "Connected to Steam" do not include a SteamID64 and are handled above.
  if (!steamId) return null;

  let name = 'Unknown player';

  if (steamMatch && typeof steamMatch.index === 'number') {
    let before = text.slice(0, steamMatch.index)
      .replace(/^\[?\d{1,2}:\d{2}:\d{2}\]?\s*/i, '')
      .replace(/^\[[^\]]+\]\s*/i, '')
      .trim();
    const doubleSpaceParts = before.split(/\s{2,}/).map((part) => part.trim()).filter(Boolean);
    if (doubleSpaceParts.length) before = doubleSpaceParts[doubleSpaceParts.length - 1];
    before = before.replace(/^(generic|info|log|server|client|trace|debug|warning|warn|notice)\s+/i, '').trim();
    if (before) name = before;
  }

  name = clean(name.replace(/[`*_~|]/g, ''), 80) || 'Unknown player';
  return { action, name, steamId, raw: text };
}

function shouldSendConnectionNotice(event) {
  const key = `${event.action}:${event.steamId || event.name.toLowerCase()}`;
  const now = Date.now();
  const previous = connectionNoticeDedupe.get(key) || 0;
  if (now - previous < connectionDedupeMs) return false;
  connectionNoticeDedupe.set(key, now);
  for (const [oldKey, timestamp] of connectionNoticeDedupe.entries()) {
    if (now - timestamp > connectionDedupeMs * 4) connectionNoticeDedupe.delete(oldKey);
  }
  return true;
}

async function connectionNoticeEmbed(event) {
  if (event.action === 'server-started') {
    return new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle('🟢 Server started')
      .setDescription('The server has started and should appear in the server browser shortly.')
      .setFooter({ text: 'Northline RP • Live city feed' })
      .setTimestamp(new Date());
  }

  const joined = event.action === 'join';
  const profile = await getSteamProfile(event.steamId);
  const displayName = profile?.personaName || event.name;
  const embed = new EmbedBuilder()
    .setColor(joined ? 0x57f287 : 0xed4245)
    .setTitle(joined ? '🟢 Player joined' : '🔴 Player left')
    .setDescription(joined ? `**${displayName}** is heading into Northline.` : `**${displayName}** left the city.`)
    .setFooter({ text: 'Northline RP • Live city feed' })
    .setTimestamp(new Date());

  if (profile?.avatar) {
    embed.setThumbnail(profile.avatar);
    embed.setAuthor({ name: displayName, iconURL: profile.avatar, url: profile.profileUrl || undefined });
  }
  if (event.steamId && connectionProfileBaseUrl) embed.setURL(`${connectionProfileBaseUrl}/${event.steamId}`);

  const fields = [{ name: 'Citizen', value: displayName, inline: true }];
  if (connectionIncludeSteamId && event.steamId) fields.push({ name: 'SteamID64', value: `\`${event.steamId}\``, inline: true });
  if (profile?.profileUrl) fields.push({ name: 'Steam profile', value: `[Open profile](${profile.profileUrl})`, inline: true });
  embed.addFields(...fields);
  return embed;
}

async function sendConnectionNotice(channel, event) {
  if (!shouldSendConnectionNotice(event)) return;
  await channel.send({ embeds: [await connectionNoticeEmbed(event)] });
}

const deathNoticeDedupe = new Map();

function stripLogPrefix(line) {
  return String(line || '')
    .replace(/\u001b\[[0-9;]*m/g, '')
    .replace(/^\[server-log\]\s*/i, '')
    .replace(/^\[?\d{1,2}:\d{2}:\d{2}\]?\s*/i, '')
    .replace(/^\[[^\]]+\]\s*/i, '')
    .replace(/^(generic|info|log|server|client|trace|debug|warning|warn|notice)\s+/i, '')
    .trim();
}

function cleanLogName(value) {
  return clean(String(value || '')
    .replace(/[`*_~|]/g, '')
    .replace(/^(generic|info|log|server|client|trace|debug|warning|warn|notice)\s+/i, '')
    .trim(), 80);
}

function extractCause(tail, fallback = 'Unknown') {
  const raw = String(tail || '').trim();
  if (!raw) return fallback;
  const lower = raw.toLowerCase();
  if (/suicide|self|themself|himself|herself/.test(lower)) return 'Suicide';
  if (/fall|gravity|impact/.test(lower)) return 'Fall damage';
  if (/fire|burn/.test(lower)) return 'Fire';
  if (/explode|explosion|blast/.test(lower)) return 'Explosion';
  const matched = raw.match(/(?:with|using|by|from|cause:|weapon:)\s+(.+)$/i);
  const text = clean((matched?.[1] || raw)
    .replace(/\[[0-9]{15,20}\]/g, '')
    .replace(/^(by|with|using|from|cause:|weapon:)\s+/i, '')
    .trim(), 120);
  return text || fallback;
}

function parseDeathLine(line) {
  const text = String(line || '').replace(/\u001b\[[0-9;]*m/g, '').trim();
  if (!text) return null;
  if (!/\b(died|death|killed|murdered|slain|suicide|fatal|dead)\b/i.test(text)) return null;
  if (/\b(disconnected|connecting|connected to steam|joined|has joined)\b/i.test(text)) return null;

  const body = stripLogPrefix(text);
  const player = '(.{1,80}?)\\s*\\[(\\d{15,20})\\]';

  let match = body.match(new RegExp(`^${player}.*?\\b(?:was\\s+)?(?:killed|murdered|slain|downed)\\s+by\\s+${player}(.*)$`, 'i'));
  if (match) {
    return {
      action: 'death',
      victimName: cleanLogName(match[1]),
      victimSteamId: match[2],
      killerName: cleanLogName(match[3]),
      killerSteamId: match[4],
      cause: extractCause(match[5], 'Killed by another player'),
      raw: text,
    };
  }

  match = body.match(new RegExp(`^${player}.*?\\b(?:killed|murdered|slain)\\s+${player}(.*)$`, 'i'));
  if (match) {
    return {
      action: 'death',
      killerName: cleanLogName(match[1]),
      killerSteamId: match[2],
      victimName: cleanLogName(match[3]),
      victimSteamId: match[4],
      cause: extractCause(match[5], 'Killed by another player'),
      raw: text,
    };
  }

  match = body.match(new RegExp(`^${player}.*?\\b(?:died|has died|was killed|committed suicide|is dead)\\b(.*)$`, 'i'));
  if (match) {
    const tail = match[3] || '';
    return {
      action: 'death',
      victimName: cleanLogName(match[1]),
      victimSteamId: match[2],
      killerName: null,
      killerSteamId: null,
      cause: extractCause(tail, /suicide/i.test(body) ? 'Suicide' : 'Unknown'),
      raw: text,
    };
  }

  return null;
}

function shouldSendDeathNotice(event) {
  const key = `${event.victimSteamId}:${event.killerSteamId || 'world'}:${event.cause}`;
  const now = Date.now();
  const previous = deathNoticeDedupe.get(key) || 0;
  if (now - previous < deathDedupeMs) return false;
  deathNoticeDedupe.set(key, now);
  for (const [oldKey, timestamp] of deathNoticeDedupe.entries()) {
    if (now - timestamp > deathDedupeMs * 4) deathNoticeDedupe.delete(oldKey);
  }
  return true;
}

async function deathNoticeEmbed(event) {
  const victimProfile = await getSteamProfile(event.victimSteamId);
  const killerProfile = await getSteamProfile(event.killerSteamId);
  const victimName = victimProfile?.personaName || event.victimName || 'Unknown player';
  const killerName = killerProfile?.personaName || event.killerName || null;

  const embed = new EmbedBuilder()
    .setColor(killerName ? 0xff6b6b : 0xfaa61a)
    .setTitle(killerName ? '💀 Fatal encounter' : '💀 Player death')
    .setDescription(killerName ? `**${victimName}** was killed by **${killerName}**.` : `**${victimName}** died.`)
    .setFooter({ text: 'Northline RP • Incident feed' })
    .setTimestamp(new Date());

  if (victimProfile?.avatar) {
    embed.setThumbnail(victimProfile.avatar);
    embed.setAuthor({ name: victimName, iconURL: victimProfile.avatar, url: victimProfile.profileUrl || undefined });
  }

  const fields = [
    { name: 'Victim', value: victimName, inline: true },
    { name: 'Cause', value: clean(event.cause || 'Unknown', 120), inline: true },
  ];
  if (killerName) fields.splice(1, 0, { name: 'Involved player', value: killerName, inline: true });
  if (deathIncludeSteamId && event.victimSteamId) fields.push({ name: 'Victim SteamID64', value: `\`${event.victimSteamId}\``, inline: true });
  if (deathIncludeSteamId && event.killerSteamId) fields.push({ name: 'Other SteamID64', value: `\`${event.killerSteamId}\``, inline: true });
  if (victimProfile?.profileUrl) fields.push({ name: 'Victim profile', value: `[Open Steam profile](${victimProfile.profileUrl})`, inline: true });
  if (killerProfile?.profileUrl) fields.push({ name: 'Other profile', value: `[Open Steam profile](${killerProfile.profileUrl})`, inline: true });
  embed.addFields(...fields);
  return embed;
}

async function appendDeathEvent(event) {
  try {
    await appendFile(deathEventsPath, `${JSON.stringify({ ...event, createdAt: new Date().toISOString() })}\n`, 'utf8');
  } catch (error) {
    console.warn('[northline-discord-bot] Could not write death event:', error instanceof Error ? error.message : error);
  }
}

async function sendDeathNotice(channel, event) {
  if (!shouldSendDeathNotice(event)) return;
  await appendDeathEvent(event);
  await channel.send({ embeds: [await deathNoticeEmbed(event)] });
}

async function readNewLogChunk(filePath, offset) {
  const info = await stat(filePath);
  if (!info.isFile()) return { offset, text: '' };
  if (info.size < offset) return { offset: info.size, text: '' };
  if (info.size === offset) return { offset, text: '' };
  const maxBytes = 256 * 1024;
  const start = Math.max(offset, info.size - maxBytes);
  const length = info.size - start;
  const handle = await open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, start);
    return { offset: info.size, text: buffer.toString('utf8').replace(/\0/g, '') };
  } finally {
    await handle.close();
  }
}

async function startConnectionNoticeWatcher() {
  if (!connectionNoticesEnabled) return;
  if (!connectionChannelId) {
    console.warn('[northline-discord-bot] Connection notices are enabled but NORTHLINE_BOT_CONNECTION_CHANNEL_ID is empty.');
    return;
  }

  let channel = null;
  try {
    channel = await client.channels.fetch(connectionChannelId);
  } catch (error) {
    console.error('[northline-discord-bot] Could not fetch connection notice channel:', error);
    return;
  }
  if (!channel?.isTextBased?.()) {
    console.error('[northline-discord-bot] Connection notice channel is not text-based.');
    return;
  }

  let offset = 0;
  let pending = '';
  try {
    const info = await stat(connectionLogPath);
    offset = info.isFile() ? info.size : 0;
  } catch {
    offset = 0;
  }

  console.log(`[northline-discord-bot] Watching connection notices from ${connectionLogPath}. Channel: ${connectionChannelId}. Starting at byte ${offset}.`);

  setInterval(async () => {
    try {
      const result = await readNewLogChunk(connectionLogPath, offset);
      offset = result.offset;
      if (!result.text) return;

      const combined = pending + result.text;
      const parts = combined.split(/\r?\n/);
      pending = combined.endsWith('\n') || combined.endsWith('\r') ? '' : (parts.pop() || '');
      const lines = pending ? parts : parts.filter(Boolean);

      for (const line of lines) {
        const event = parseConnectionLine(line);
        if (event) await sendConnectionNotice(channel, event);
      }
    } catch (error) {
      console.error('[northline-discord-bot] Connection notice watcher error:', error instanceof Error ? error.message : error);
    }
  }, connectionPollMs).unref?.();
}

async function startDeathNoticeWatcher() {
  if (!deathNoticesEnabled) return;
  if (!deathChannelId) {
    console.warn('[northline-discord-bot] Death notices are enabled but NORTHLINE_BOT_DEATH_CHANNEL_ID is empty.');
    return;
  }

  let channel = null;
  try {
    channel = await client.channels.fetch(deathChannelId);
  } catch (error) {
    console.error('[northline-discord-bot] Could not fetch death notice channel:', error);
    return;
  }
  if (!channel?.isTextBased?.()) {
    console.error('[northline-discord-bot] Death notice channel is not text-based.');
    return;
  }

  let offset = 0;
  let pending = '';
  try {
    const info = await stat(deathLogPath);
    offset = info.isFile() ? info.size : 0;
  } catch {
    offset = 0;
  }

  console.log(`[northline-discord-bot] Watching death notices from ${deathLogPath}. Channel: ${deathChannelId}. Starting at byte ${offset}.`);

  setInterval(async () => {
    try {
      const result = await readNewLogChunk(deathLogPath, offset);
      offset = result.offset;
      if (!result.text) return;

      const combined = pending + result.text;
      const parts = combined.split(/\r?\n/);
      pending = combined.endsWith('\n') || combined.endsWith('\r') ? '' : (parts.pop() || '');
      const lines = pending ? parts : parts.filter(Boolean);

      for (const line of lines) {
        const event = parseDeathLine(line);
        if (event) await sendDeathNotice(channel, event);
      }
    } catch (error) {
      console.error('[northline-discord-bot] Death notice watcher error:', error instanceof Error ? error.message : error);
    }
  }, deathPollMs).unref?.();
}

client.once('ready', () => {
  console.log(`Northline Discord bot signed in as ${client.user.tag}. API: ${apiBase}`);
  startConnectionNoticeWatcher().catch((error) => console.error('[northline-discord-bot] Connection watcher failed:', error));
  startDeathNoticeWatcher().catch((error) => console.error('[northline-discord-bot] Death watcher failed:', error));
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'link') return handleLink(interaction);
  if (interaction.commandName === 'northline') return handleNorthline(interaction);
  if (interaction.commandName === 'announce') return handleAnnounce(interaction);
  if (interaction.commandName === 'discordmod') return handleDiscordMod(interaction);
});

client.on('messageCreate', async (message) => {
  await importDiscordForumMessage(message).catch((error) => {
    console.error('[northline-discord-bot] Forum sync import failed:', error instanceof Error ? error.message : error);
  });
});

client.on('messageDelete', async (message) => {
  await deleteDiscordForumWebsitePost(message).catch((error) => {
    console.error('[northline-discord-bot] Forum sync delete failed:', error instanceof Error ? error.message : error);
  });
});

client.on('threadCreate', async (thread) => {
  if (!forumSyncEnabled || thread.parentId !== forumChannelId) return;
  if (forumSyncLog) console.log(`[northline-discord-bot] Forum thread detected: ${thread.name} (${thread.id}). Waiting for starter message event.`);
  // Discord can fire threadCreate before messageCreate for the forum starter post,
  // and sometimes the starter message event is missed entirely after a bot restart.
  // Fetch it once after a short delay so the website can create/map the thread deterministically.
  setTimeout(async () => {
    try {
      const starterMessage = typeof thread.fetchStarterMessage === 'function' ? await thread.fetchStarterMessage() : null;
      if (starterMessage) await importDiscordForumMessage(starterMessage);
    } catch (error) {
      if (forumSyncLog) console.warn(`[northline-discord-bot] Could not fetch/import starter message for forum thread ${thread.id}:`, error instanceof Error ? error.message : error);
    }
  }, 1750).unref?.();
});

client.on('threadDelete', async (thread) => {
  await deleteDiscordForumWebsiteThread(thread).catch((error) => {
    console.error('[northline-discord-bot] Forum thread delete sync failed:', error instanceof Error ? error.message : error);
  });
});

client.on('messageReactionAdd', async (reaction, user) => {
  await syncDiscordForumReaction(reaction, user, true);
});

client.on('messageReactionRemove', async (reaction, user) => {
  await syncDiscordForumReaction(reaction, user, false);
});

client.on('error', (error) => console.error('[northline-discord-bot]', error));
await client.login(token);
