import type { MaintenanceSettings } from '@/lib/maintenance-data';

function formatCountdown(value: string | null) {
  if (!value) return null;
  const target = new Date(value);
  if (!Number.isFinite(target.getTime())) return null;
  return target.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function TweeterMaintenancePage({ settings }: { settings: MaintenanceSettings }) {
  const countdown = formatCountdown(settings.tweeterMaintenanceCountdownEndsAt);
  return (
    <main className={`tweeter-maintenance-screen tweeter-maintenance-theme-${settings.tweeterMaintenanceTheme}`}>
      <section className="tweeter-maintenance-card" aria-labelledby="tweeter-maintenance-title">
        <div className="tweeter-maintenance-bird" aria-hidden="true"><i className="fa-brands fa-twitter" /></div>
        <span className="tweeter-maintenance-kicker">{settings.tweeterMaintenanceKicker}</span>
        <h1 id="tweeter-maintenance-title">{settings.tweeterMaintenanceHeadline}</h1>
        <p>{settings.tweeterMaintenanceMessage}</p>
        {countdown ? (
          <div className="tweeter-maintenance-countdown">
            <span>Expected back</span>
            <strong>{countdown}</strong>
          </div>
        ) : null}
        <div className="tweeter-maintenance-actions">
          <a href="/" className="button button-soft"><i className="fa-solid fa-house" aria-hidden="true" /> Back to Northline</a>
          {settings.showDiscordButton ? <a href={settings.discordUrl} className="button button-primary" target="_blank" rel="noreferrer"><i className="fa-brands fa-discord" aria-hidden="true" /> Discord updates</a> : null}
          <a href="/api/auth/steam?returnTo=/staff/maintenance" className="button button-ghost"><i className="fa-brands fa-steam" aria-hidden="true" /> Staff sign-in</a>
        </div>
      </section>
    </main>
  );
}
