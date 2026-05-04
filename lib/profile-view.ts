import type { ApeItem, PlayerSave, PropertyLayout } from '@/lib/ape-data';
import { countItems, getCitizenName, getLevel, getXp } from '@/lib/ape-data';
import type { CommunityProfile, ProfileShowcaseSettings } from '@/lib/community-data';
import { DEFAULT_PROFILE_SHOWCASE } from '@/lib/community-data';
import { duration, itemName, money, playerTitle, statLabel } from '@/lib/format';

type StatEntry = { key: string; label: string; value: number };
type InventoryEntry = { label: string; count: number };

type PublicProfileInput = {
  steamId: string;
  player: PlayerSave | null;
  communityProfile: CommunityProfile | null;
  layouts: PropertyLayout[];
  role: string;
  fallbackName?: string | null;
};

export type PublicProfileView = {
  steamId: string;
  displayName: string;
  privacy: 'public' | 'private';
  bio: string;
  location: string;
  websiteUrl: string;
  bannerColor: string;
  showcase: ProfileShowcaseSettings;
  role: string;
  title: string;
  economy: {
    cash: string;
    bank: string;
    total: string;
  } | null;
  inventory: {
    totalSlots: number;
    topItems: InventoryEntry[];
  } | null;
  stats: {
    level: number;
    xp: number;
    topStats: StatEntry[];
  } | null;
  properties: {
    totalLayouts: number;
    layouts: Array<{ propertyName: string; layoutName: string; propCount: number }>;
  } | null;
  activity: {
    playtime: string;
    joined: string;
    health: number | null;
    hunger: number | null;
    thirst: number | null;
  } | null;
  hiddenSections: string[];
};

export function normalizeProfileShowcase(showcase: Partial<ProfileShowcaseSettings> | undefined | null): ProfileShowcaseSettings {
  return {
    ...DEFAULT_PROFILE_SHOWCASE,
    economy: Boolean(showcase?.economy),
    inventory: Boolean(showcase?.inventory),
    stats: Boolean(showcase?.stats),
    properties: Boolean(showcase?.properties),
    activity: Boolean(showcase?.activity),
  };
}

function inventoryLabel(item: ApeItem): string {
  return itemName(String(item.PrefabResourcePath ?? 'Unknown item'));
}

function collectInventory(items: Array<ApeItem | null | undefined>, counts: Map<string, number>) {
  for (const item of items) {
    if (!item) continue;
    const label = inventoryLabel(item);
    const stack = Math.max(1, Number(item.StackCount ?? 1));
    counts.set(label, (counts.get(label) ?? 0) + stack);
    if (Array.isArray(item.ContainerSlots)) collectInventory(item.ContainerSlots, counts);
  }
}

export function getInventorySummary(player: PlayerSave | null): InventoryEntry[] {
  const counts = new Map<string, number>();
  if (!player) return [];
  collectInventory([
    ...(player.HotbarSlots ?? []),
    ...(player.InventorySlots ?? []),
    ...(player.EquipmentSlots ?? []),
    ...(player.MailboxStorageSlots ?? []),
  ], counts);
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 12);
}

export function getTopTrackedStats(player: PlayerSave | null, limit = 8): StatEntry[] {
  const hidden = new Set(['bank_balance', 'cash_balance', 'level', 'playtime_mins']);
  return Object.entries(player?.TrackedStats ?? {})
    .filter(([key, value]) => !hidden.has(key) && Number.isFinite(Number(value)))
    .map(([key, value]) => ({ key, label: statLabel(key), value: Number(value) }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function sectionNames(showcase: ProfileShowcaseSettings) {
  const names: string[] = [];
  if (!showcase.economy) names.push('Economy');
  if (!showcase.inventory) names.push('Inventory');
  if (!showcase.stats) names.push('Stats');
  if (!showcase.properties) names.push('Properties');
  if (!showcase.activity) names.push('Activity');
  return names;
}

export function buildPublicProfileView(input: PublicProfileInput): PublicProfileView {
  const { steamId, player, communityProfile, layouts, role, fallbackName } = input;
  const showcase = normalizeProfileShowcase(communityProfile?.showcase);
  const displayName = getCitizenName(player, fallbackName || steamId);
  const title = playerTitle(player?.DisplayTitle);
  const privacy = communityProfile?.privacy ?? 'public';
  const publicProfile = privacy !== 'private';

  return {
    steamId,
    displayName,
    privacy,
    bio: communityProfile?.bio?.trim() || 'No public bio has been set yet.',
    location: communityProfile?.location?.trim() || '',
    websiteUrl: communityProfile?.websiteUrl?.trim() || '',
    bannerColor: communityProfile?.bannerColor || '#38bdf8',
    showcase,
    role,
    title,
    economy: publicProfile && showcase.economy && player ? {
      cash: money(player.CashBalance),
      bank: money(player.BankBalance),
      total: money(Number(player.CashBalance ?? 0) + Number(player.BankBalance ?? 0)),
    } : null,
    inventory: publicProfile && showcase.inventory && player ? {
      totalSlots: countItems(player),
      topItems: getInventorySummary(player),
    } : null,
    stats: publicProfile && showcase.stats && player ? {
      level: getLevel(player),
      xp: getXp(player),
      topStats: getTopTrackedStats(player),
    } : null,
    properties: publicProfile && showcase.properties ? {
      totalLayouts: layouts.length,
      layouts: layouts.slice(0, 8).map((layout) => ({
        propertyName: layout.PropertyName || 'Unknown property',
        layoutName: layout.LayoutName || 'Saved layout',
        propCount: layout.Items?.length ?? 0,
      })),
    } : null,
    activity: publicProfile && showcase.activity && player ? {
      playtime: duration(player.TotalPlaytimeSeconds),
      joined: player.FirstJoinedUtc ? new Date(player.FirstJoinedUtc).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown',
      health: player.Health == null ? null : Number(player.Health),
      hunger: player.Hunger == null ? null : Number(player.Hunger),
      thirst: player.Thirst == null ? null : Number(player.Thirst),
    } : null,
    hiddenSections: publicProfile ? sectionNames(showcase) : ['Economy', 'Inventory', 'Stats', 'Properties', 'Activity'],
  };
}
