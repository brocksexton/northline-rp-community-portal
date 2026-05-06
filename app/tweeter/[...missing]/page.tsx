import { TweeterErrorShell } from '@/components/TweeterErrorShell';

export const dynamic = 'force-dynamic';

export default function MissingTweeterRoute() {
  return (
    <TweeterErrorShell
      statusCode="404"
      title="Nothing to see here."
      message="That Tweeter route is not available."
    />
  );
}
