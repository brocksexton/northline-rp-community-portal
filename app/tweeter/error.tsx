'use client';

import { useEffect } from 'react';
import { TweeterErrorShell } from '@/components/TweeterErrorShell';

export default function TweeterError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <TweeterErrorShell
      statusCode="500"
      title="Tweeter hit a snag."
      message="The timeline could not load this page cleanly."
      reset={reset}
    />
  );
}
