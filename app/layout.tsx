import type { Metadata } from 'next';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { getSiteConfig } from '@/lib/site-config';
import './globals.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig();
  return {
    title: {
      default: config.brand.name,
      template: `%s · ${config.brand.name}`,
    },
    description: config.brand.tagline,
    metadataBase: new URL(config.brand.siteUrl),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const config = await getSiteConfig();
  return (
    <html lang="en" style={{ ['--accent' as string]: config.brand.accentColor }}>
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <Header />
        <div id="main-content" tabIndex={-1}>
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
