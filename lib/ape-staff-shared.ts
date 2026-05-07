export const APE_TAVERN_BADGE_KIND = 'Ape Tavern';
export const APE_TAVERN_BADGE_IMAGE_PATH = '/badges/ape-tavern-staff.png';
export const DEFAULT_APE_TAVERN_STAFF_IDS = [
  '76561198055176887',
  '76561198015828439',
  '76561199567602474',
  '76561197990720321',
  '76561198032406271',
  '76561197969358147',
  '76561197993568598',
  '76561198057680429',
  '76561198042325932',
] as const;

export type ApeStaffState = {
  badgeLabel: string;
  badgeImagePath: string;
  staffSteamIds: string[];
  updatedAt: string | null;
  updatedBy: string | null;
};
