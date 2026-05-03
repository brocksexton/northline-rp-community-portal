'use client';

import { useEffect } from 'react';
import { ErrorShell } from '@/components/ErrorShell';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <ErrorShell title="Something broke on the website." message="Northline hit an unexpected error while loading this page. Try again, then check server logs if it keeps happening." reset={reset} />;
}
