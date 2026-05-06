import type { MaintenanceSettings } from '@/lib/maintenance-data';

function formatCountdown(value: string | null) {
  if (!value) return null;
  const target = new Date(value);
  if (!Number.isFinite(target.getTime())) return null;
  return target.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function MaintenancePage({ settings }: { settings: MaintenanceSettings }) {
  const countdown = formatCountdown(settings.countdownEndsAt);
  return (
    <main className={`maintenance-screen maintenance-theme-${settings.theme}`} style={{ ['--maintenance-accent' as string]: settings.accentColor }}>
      <section className="maintenance-card" aria-labelledby="maintenance-title">
        <div className="maintenance-glow" aria-hidden="true" />
        <div className="maintenance-icon" aria-hidden="true"><i className="fa-solid fa-screwdriver-wrench" /></div>
        <span className="maintenance-kicker">Northline RP</span>
        <h1 id="maintenance-title">{settings.headline}</h1>
        <p>{settings.message}</p>
        {countdown ? (
          <div className="maintenance-countdown">
            <span>Planned return</span>
            <strong>{countdown}</strong>
          </div>
        ) : null}
        <div className="maintenance-actions">
          <a className="button button-primary" href="/api/auth/steam?returnTo=/staff"><i className="fa-brands fa-steam" aria-hidden="true" /> Developer sign-in</a>
          {settings.showDiscordButton ? <a className="button button-soft" href={settings.discordUrl} target="_blank" rel="noreferrer"><i className="fa-brands fa-discord" aria-hidden="true" /> Discord updates</a> : null}
        </div>
        <small>Developers can still sign in and view the site while maintenance mode is active.</small>
      </section>
    </main>
  );
}
