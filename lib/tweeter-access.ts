import { getPlayer } from './ape-data';

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
