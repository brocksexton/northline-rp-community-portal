export const FORUM_DISCORD_LOVE_EMOJI = '💙';

export const FORUM_DISCORD_REACTION_CHOICES = [
  { emoji: FORUM_DISCORD_LOVE_EMOJI, label: 'Love', source: 'discord' as const, interactive: false },
] as const;

export const FORUM_WEBSITE_REACTION_CHOICES = [
  { emoji: '😂', label: 'Funny' },
  { emoji: '🔥', label: 'Hot take' },
  { emoji: '👀', label: 'Watching' },
  { emoji: '✅', label: 'Helpful' },
  { emoji: '🙌', label: 'Good point' },
] as const;

export const FORUM_REACTION_CHOICES = FORUM_WEBSITE_REACTION_CHOICES;

export function normalizeForumDiscordReactionEmoji(value: unknown) {
  const raw = String(value ?? '').trim();
  if (raw === FORUM_DISCORD_LOVE_EMOJI || raw === 'blue_heart' || raw === ':blue_heart:') return FORUM_DISCORD_LOVE_EMOJI;
  return raw;
}
