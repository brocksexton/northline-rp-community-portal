import { readFile } from 'fs/promises';
import path from 'path';

type LinkItem = { label: string; href: string };
type LegalSection = { title: string; body: string };

export type SiteConfig = {
  brand: {
    name: string;
    shortName: string;
    tagline: string;
    logoText: string;
    accentColor: string;
    domain: string;
    siteUrl: string;
    embedImageUrl?: string;
  };
  home: {
    eyebrow: string;
    headline: string;
    subheadline: string;
    intro: string;
    primaryCta: string;
    secondaryCta: string;
  };
  server: {
    joinLabel: string;
    joinUrl: string;
    discordUrl: string;
    rulesUrl: string;
    storeUrl: string;
    maxPlayersFallback: number;
    locationLabel: string;
    modeLabel: string;
  };
  content: {
    announcementTitle: string;
    announcementBody: string;
    footerText: string;
    earlyAccessTitle?: string;
    earlyAccessBody?: string;
  };
  layout: {
    showGridBackground: boolean;
    panelStyle: string;
    homeDensity: string;
    mobileBottomNav: boolean;
  };
  status: {
    defaultState: string;
    knownIssueLabel: string;
    metricSampleMinutes: number;
    offlineAfterMinutes: number;
  };
  legal: {
    lastModified: string;
    privacyTitle: string;
    termsTitle: string;
    contactEmail: string;
    privacySections: LegalSection[];
    termsSections: LegalSection[];
  };
  quickLinks: LinkItem[];
  features: Array<{ title: string; body: string }>;
};

const fallbackConfig: SiteConfig = {
  brand: {
    name: 'Northline RP',
    shortName: 'NLRP',
    tagline: 's&box roleplay server',
    logoText: 'Northline RP',
    accentColor: '#1194f0',
    domain: 'northline.lol',
    siteUrl: 'https://northline.lol',
    embedImageUrl: 'https://media.discordapp.net/attachments/1500369066009825304/1501668755372118148/northline-banner.jpg?ex=69fce982&is=69fb9802&hm=2c606aedc3c7bb3fceed551b937ec67ce75f7dea9085c995d8b2aebaceb57903&=&format=webp&width=1521&height=856',
  },
  home: {
    eyebrow: 'Northline Roleplay Network',
    headline: 'Northline RP',
    subheadline: 'A living s&box roleplay community.',
    intro: 'Connect your Steam account to view your citizen profile and server activity.',
    primaryCta: 'Connect with Steam',
    secondaryCta: 'View server status',
  },
  server: {
    joinLabel: 'Join Northline',
    joinUrl: 'https://sbox.game/apetavern/aperp',
    discordUrl: '#',
    rulesUrl: '#',
    storeUrl: '#',
    maxPlayersFallback: 64,
    locationLabel: 's&box',
    modeLabel: 'APE RP / Northline RP',
  },
  content: {
    announcementTitle: 'Welcome to Northline',
    announcementBody: 'Edit config/site.config.json to update community content.',
    footerText: 'Community project.',
    earlyAccessTitle: 'Early access',
    earlyAccessBody: 'Features and server data may change while the community is being built.',
  },
  layout: {
    showGridBackground: true,
    panelStyle: 'crisp',
    homeDensity: 'community',
    mobileBottomNav: true,
  },
  status: {
    defaultState: 'operational',
    knownIssueLabel: 'No known city-wide issues',
    metricSampleMinutes: 30,
    offlineAfterMinutes: 30,
  },
  legal: {
    lastModified: '2026-05-03',
    privacyTitle: 'Privacy Policy',
    termsTitle: 'Terms of Conditions',
    contactEmail: 'admin@northline.lol',
    privacySections: [],
    termsSections: [],
  },
  quickLinks: [],
  features: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeConfig(base: SiteConfig, patch: Partial<SiteConfig>): SiteConfig {
  const result: Record<string, unknown> = JSON.parse(JSON.stringify(base));

  for (const [key, value] of Object.entries(patch)) {
    if (Array.isArray(value)) {
      result[key] = value;
    } else if (isRecord(value) && isRecord(result[key])) {
      result[key] = { ...(result[key] as object), ...value };
    } else if (value !== undefined) {
      result[key] = value;
    }
  }

  return result as SiteConfig;
}

export async function getSiteConfig(): Promise<SiteConfig> {
  try {
    const file = path.join(process.cwd(), 'config', 'site.config.json');
    const raw = await readFile(file, 'utf8');
    return mergeConfig(fallbackConfig, JSON.parse(raw) as Partial<SiteConfig>);
  } catch {
    return fallbackConfig;
  }
}
