'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

type AccessResponse = {
  allowed?: boolean;
  reason?: string;
};

function shouldCheckPath(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname.startsWith('/api/')) return false;
  if (pathname.startsWith('/_next/')) return false;
  return true;
}

export function MaintenanceAccessGuard() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!shouldCheckPath(pathname)) return;

    let cancelled = false;
    const query = searchParams?.toString();
    const fullPath = `${pathname}${query ? `?${query}` : ''}`;
    const controller = new AbortController();

    async function checkAccess() {
      try {
        const response = await fetch(`/api/maintenance/access?path=${encodeURIComponent(fullPath)}`, {
          cache: 'no-store',
          credentials: 'same-origin',
          signal: controller.signal,
        });
        if (!response.ok || cancelled) return;
        const data = await response.json() as AccessResponse;
        if (!data.allowed && !cancelled) {
          window.location.assign(fullPath);
        }
      } catch {
        // If the check fails, do not trap the user in a client-side loop.
        // A normal refresh/server render will still enforce maintenance mode.
      }
    }

    void checkAccess();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pathname, searchParams]);

  return null;
}
