import { TweeterErrorShell } from '@/components/TweeterErrorShell';

export const dynamic = 'force-dynamic';

export default function MissingTweeterRoute() {
  return (
    <TweeterErrorShell
      statusCode="404"
      title="Nothing to see here."
      message="This Tweeter route is not connected to a post, profile, message thread, or feed page."
    />
  );
}
