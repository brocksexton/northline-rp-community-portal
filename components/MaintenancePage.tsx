import type { MaintenanceIcon, MaintenanceSettings } from '@/lib/maintenance-data';

function formatCountdown(value: string | null) {
  if (!value) return null;
  const target = new Date(value);
  if (!Number.isFinite(target.getTime())) return null;
  return target.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function iconClass(icon: MaintenanceIcon) {
  switch (icon) {
    case 'traffic': return 'fa-solid fa-traffic-light';
    case 'coffee': return 'fa-solid fa-mug-hot';
    case 'broadcast': return 'fa-solid fa-satellite-dish';
    case 'moon': return 'fa-solid fa-moon';
    case 'sparkles': return 'fa-solid fa-wand-magic-sparkles';
    case 'wrench':
    default: return 'fa-solid fa-screwdriver-wrench';
  }
}

export function MaintenancePage({ settings }: { settings: MaintenanceSettings }) {
  const countdown = formatCountdown(settings.countdownEndsAt);
  const canVisitTweeter = settings.allowTweeterDuringMaintenance && !settings.tweeterMaintenanceEnabled && settings.showTweeterButton;
  return (
    <main className={`maintenance-screen maintenance-theme-${settings.theme} maintenance-layout-${settings.layout}`} style={{ ['--maintenance-accent' as string]: settings.accentColor }}>
      <section className="maintenance-card" aria-labelledby="maintenance-title">
        <div className="maintenance-glow" aria-hidden="true" />
        <div className="maintenance-icon" aria-hidden="true"><i className={iconClass(settings.icon)} /></div>
        <span className="maintenance-kicker">{settings.kicker}</span>
        <h1 id="maintenance-title">{settings.headline}</h1>
        <p>{settings.message}</p>
        {countdown ? (
          <div className="maintenance-countdown">
            <span>Planned return</span>
            <strong>{countdown}</strong>
          </div>
        ) : null}
        <div className="maintenance-actions">
          <a className="button button-primary" href="/api/auth/steam?returnTo=/staff/maintenance"><i className="fa-brands fa-steam" aria-hidden="true" /> Developer sign-in</a>
          {canVisitTweeter ? <a className="button button-soft" href="/tweeter"><i className="fa-brands fa-twitter" aria-hidden="true" /> {settings.tweeterButtonLabel}</a> : null}
          {settings.showDiscordButton ? <a className="button button-soft" href={settings.discordUrl} target="_blank" rel="noreferrer"><i className="fa-brands fa-discord" aria-hidden="true" /> Discord updates</a> : null}
          {settings.showCustomButton ? <a className="button button-ghost" href={settings.customButtonUrl} target="_blank" rel="noreferrer"><i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /> {settings.customButtonLabel}</a> : null}
        </div>
      </section>
    </main>
  );
}
