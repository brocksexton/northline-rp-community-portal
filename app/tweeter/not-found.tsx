import { TweeterErrorShell } from '@/components/TweeterErrorShell';

export default function TweeterNotFound() {
  return (
    <TweeterErrorShell
      statusCode="404"
      title="This post flew away."
      message="That Tweeter page does not exist, was removed, or is unavailable to your account."
    />
  );
}
