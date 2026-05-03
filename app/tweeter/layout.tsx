export const dynamic = 'force-dynamic';

export default function TweeterLayout({ children }: { children: React.ReactNode }) {
  return <div className="tweeter-mode">{children}</div>;
}
