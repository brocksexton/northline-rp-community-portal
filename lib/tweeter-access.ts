import { getPlayer } from './ape-data';
import { getTweeterRestriction } from './tweeter-moderation-data';

function hasValidJoinDate(value: unknown) {
  if (!value) return false;
  const time = new Date(String(value)).getTime();
  return Number.isFinite(time);
}

export async function hasGameServerIdentity(steamId: string | null | undefined) {
  const clean = String(steamId ?? '').trim();
  if (!/^\d{15,20}$/.test(clean)) return false;
  const player = await getPlayer(clean);
  return hasValidJoinDate(player?.FirstJoinedUtc);
}

export const GAME_SERVER_IDENTITY_MESSAGE = 'Join the Northline game server once before using Tweeter social actions.';

export async function getTweeterActorActionLock(steamId: string | null | undefined): Promise<string> {
  const clean = String(steamId ?? '').trim();
  if (!/^\d{15,20}$/.test(clean)) return 'Sign in with Steam first.';
  if (!(await hasGameServerIdentity(clean))) return GAME_SERVER_IDENTITY_MESSAGE;
  const restriction = await getTweeterRestriction(clean);
  return restriction?.actionLockReason ?? '';
}

export async function getTweeterProfileCustomizeLock(steamId: string | null | undefined): Promise<string> {
  const clean = String(steamId ?? '').trim();
  if (!/^\d{15,20}$/.test(clean)) return 'Steam sign-in required.';
  if (!(await hasGameServerIdentity(clean))) return 'Join the Northline game server once before editing your Tweeter profile.';
  const restriction = await getTweeterRestriction(clean);
  if (restriction && !restriction.canCustomizeProfile) return restriction.actionLockReason || 'This account cannot customize its Tweeter profile right now.';
  return '';
}

export async function getTweeterTargetFollowLock(steamId: string | null | undefined): Promise<string> {
  const clean = String(steamId ?? '').trim();
  if (!/^\d{15,20}$/.test(clean)) return 'That profile is not available to follow.';
  const restriction = await getTweeterRestriction(clean);
  return restriction?.targetFollowLockReason ?? '';
}

export async function getTweeterTargetMessageLock(steamId: string | null | undefined): Promise<string> {
  const clean = String(steamId ?? '').trim();
  if (!/^\d{15,20}$/.test(clean)) return 'That profile is not available to message.';
  const restriction = await getTweeterRestriction(clean);
  return restriction?.targetMessageLockReason ?? '';
}
