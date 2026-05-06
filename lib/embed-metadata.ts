import type { Metadata } from 'next';
import { getSiteConfig, type SiteConfig } from '@/lib/site-config';

export const DEFAULT_EMBED_IMAGE_URL = 'https://media.discordapp.net/attachments/1500369066009825304/1501668755372118148/northline-banner.jpg?ex=69fce982&is=69fb9802&hm=2c606aedc3c7bb3fceed551b937ec67ce75f7dea9085c995d8b2aebaceb57903&=&format=webp&width=1521&height=856';

const DEFAULT_IMAGE_WIDTH = 1521;
const DEFAULT_IMAGE_HEIGHT = 856;

type EmbedMetadataInput = {
  title: string;
  description: string;
  path?: string;
  imageUrl?: string | null;
  imageAlt?: string;
  noIndex?: boolean;
};

function cleanSiteUrl(value: string) {
  const trimmed = String(value || '').trim();
  return trimmed || 'https://northline.lol';
}

function cleanPath(path?: string) {
  const value = String(path || '/').trim();
  if (!value) return '/';
  if (/^https?:\/\//i.test(value)) return value;
  return value.startsWith('/') ? value : `/${value}`;
}

export function cleanMetaText(value: string, maxLength = 180) {
  const compact = String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/[<>]/g, '')
    .trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

export function getConfiguredEmbedImage(config: SiteConfig, override?: string | null) {
  return override || config.brand.embedImageUrl || DEFAULT_EMBED_IMAGE_URL;
}

export function buildMetadataFromConfig(config: SiteConfig, input: EmbedMetadataInput): Metadata {
  const siteUrl = cleanSiteUrl(config.brand.siteUrl);
  const path = cleanPath(input.path);
  const title = cleanMetaText(input.title, 80);
  const description = cleanMetaText(input.description || config.brand.tagline, 220);
  const absoluteTitle = title === config.brand.name ? title : `${title} · ${config.brand.name}`;
  const imageUrl = getConfiguredEmbedImage(config, input.imageUrl);
  const imageAlt = input.imageAlt || `${config.brand.name} banner`;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: 'website',
      siteName: config.brand.name,
      title: absoluteTitle,
      description,
      url: path,
      images: [
        {
          url: imageUrl,
          width: DEFAULT_IMAGE_WIDTH,
          height: DEFAULT_IMAGE_HEIGHT,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: absoluteTitle,
      description,
      images: [imageUrl],
    },
    robots: input.noIndex ? { index: false, follow: false } : undefined,
    other: {
      'theme-color': config.brand.accentColor,
    },
  };
}

export async function buildPageMetadata(input: EmbedMetadataInput): Promise<Metadata> {
  const config = await getSiteConfig();
  return buildMetadataFromConfig(config, input);
}
