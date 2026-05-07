import Link from 'next/link';
import { getDataHealth, getPopulationSummary, getServerConfig, getServerRuntimeStatus } from '@/lib/ape-data';
import { duration, fullDate, relativeFromDate } from '@/lib/format';
import { getOperationalMetrics } from '@/lib/host-metrics';
import { captureMetricSample, getMetricSamples, getStatusUpdates } from '@/lib/community-data';
import { StaffMetricsHistoryPanel } from '@/components/StaffMetricsHistoryPanel';
import { StatusUpdatesAdminPanel } from '@/components/StatusUpdatesAdminPanel';
import { getCurrentStaffIdentity, canAccessServerAdministration } from '@/lib/staff-auth';
import { getSiteConfig } from '@/lib/site-config';
import { isSiteFeatureEnabled } from '@/lib/site-features-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const metadata = { title: 'Staff Status Diagnostics' };

function sourceLabel(source: string) {
  switch (source) {
    case 'server_status.json': return 'Heartbeat file';
    case 'server_query': return 'Server query';
    case 'process_check': return 'Local process check';
    case 'connection_logs': return 'Connection logs';
    case 'data_path': return 'Data path';
    default: return 'Portal check';
  }
}

function boolLabel(value: boolean | null | undefined) {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return 'Not checked';
}

function mbToGbLabel(mb: number) {
  if (mb >= 1024) return `${Math.round((mb / 1024) * 10) / 10} GB`;
  return `${mb.toLocaleString()} MB`;
}

function DiagnosticRow({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="staff-diagnostic-row">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}

export default async function StaffStatusPage() {
  const identity = await getCurrentStaffIdentity();
  const allowed = identity ? canAccessServerAdministration(identity) : false;

  if (!identity || !allowed) {
    return (
      <main className="page-shell">
        <section className="card auth-panel">
          <span className="eyebrow">Staff</span>
          <h1>Access denied</h1>
          <p>This page requires a Northbound RP staff role.</p>
          <a className="button button-primary" href="/api/auth/steam?returnTo=/staff/status"><i className="fa-brands fa-steam" aria-hidden="true" /> Sign in with Steam</a>
        </section>
      </main>
    );
  }

  const [config, health, population, serverConfig, metrics, updates, publicStatusVisible] = await Promise.all([
    getSiteConfig(),
    getDataHealth(),
    getPopulationSummary(),
    getServerConfig(),
    getOperationalMetrics(),
    getStatusUpdates(20),
    isSiteFeatureEnabled('status'),
  ]);

  const runtime = await getServerRuntimeStatus({
    health,
    population,
    staleAfterMinutes: config.status.offlineAfterMinutes,
    serverHost: config.status.serverHost,
    serverPort: config.status.serverPort,
    queryTimeoutMs: config.status.queryTimeoutMs,
    fallbackQueryHosts: config.status.fallbackQueryHosts,
    processNames: config.status.processNames,
  });
  const query = runtime.diagnostics?.query;
  const processCheck = runtime.diagnostics?.process;
  const maxPlayers = runtime.maxPlayers ?? serverConfig.MaxPlayers ?? config.server.maxPlayersFallback;
  const selectedAttempt = query?.attempts?.find((attempt) => attempt.online) ?? query?.attempts?.[0] ?? null;
  await captureMetricSample({ latencyMs: selectedAttempt?.durationMs ?? null });
  const metricSamples = await getMetricSamples(288);

  return (
    <main className="page-shell staff-page staff-command-page staff-status-page">
      <section className="staff-command-hero">
        <div className="staff-command-copy">
          <span className="ops-kicker"><i /> Staff diagnostics</span>
          <h1>Status checks</h1>
          <p>Private server reachability details, host metrics, and fallback checks for staff troubleshooting.</p>
          <div className="staff-hero-actions">
            <Link className="button button-soft" href="/staff"><i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to staff panel</Link>
            {publicStatusVisible ? <Link className="button button-primary" href="/status"><i className="fa-solid fa-signal" aria-hidden="true" /> Public status</Link> : null}
          </div>
        </div>
        <aside className="staff-identity-card">
          <span>Current runtime</span>
          <strong>{runtime.label}</strong>
          <p>{sourceLabel(runtime.source)}</p>
          <small>{runtime.lastSignalAt ? `Signal ${relativeFromDate(runtime.lastSignalAt)}` : 'No signal timestamp'}</small>
        </aside>
      </section>

      <section className="staff-signal-grid" aria-label="Runtime summary">
        <article><span>Reachable</span><strong>{boolLabel(runtime.online)}</strong><p>{runtime.message}</p></article>
        <article><span>Players</span><strong>{runtime.playerCount ?? population.onlineCount}/{maxPlayers}</strong><p>Runtime count with fallback to connection data.</p></article>
        <article><span>CPU</span><strong>{metrics.cpuPercent === null ? 'Sampling' : `${metrics.cpuPercent}%`}</strong><p>Current web host sample.</p></article>
        <article><span>RAM</span><strong>{metrics.ram.percent}%</strong><p>{mbToGbLabel(metrics.ram.usedMb)} used by the host.</p></article>
      </section>


      <StatusUpdatesAdminPanel initialUpdates={updates} />

      <section className="staff-command-grid staff-metric-history-grid">
        <StaffMetricsHistoryPanel samples={metricSamples} />
      </section>

      <section className="staff-command-grid">
        <article className="staff-panel staff-diagnostic-panel">
          <div className="section-heading"><span className="kicker">Server query</span><h2>Network checks</h2><p>These details are staff-only so the public page stays clean.</p></div>
          <div className="staff-diagnostic-list">
            <DiagnosticRow label="Configured host" value={`${config.status.serverHost ?? '203.0.113.10'}:${config.status.serverPort ?? 27015}`} />
            <DiagnosticRow label="Fallback hosts" value={(config.status.fallbackQueryHosts ?? []).join(', ') || 'None'} />
            <DiagnosticRow label="Timeout" value={`${config.status.queryTimeoutMs ?? 1200}ms`} />
            <DiagnosticRow label="Answered" value={boolLabel(query?.answered)} detail={query?.selectedHost ? `Selected ${query.selectedHost}:${query.port}` : query?.error ?? undefined} />
          </div>
          <div className="staff-diagnostic-attempts">
            {(query?.attempts ?? []).map((attempt) => (
              <div key={`${attempt.host}-${attempt.checkedAt}`} className={attempt.online ? 'success' : 'danger'}>
                <strong>{attempt.host}</strong>
                <span>{attempt.online ? 'answered' : 'no answer'}</span>
                <small>{attempt.online ? `${attempt.playerCount ?? 0}/${attempt.maxPlayers ?? '?'} players` : attempt.error ?? 'No response'} · {fullDate(attempt.checkedAt)}</small>
              </div>
            ))}
            {!(query?.attempts?.length) ? <p className="notice warning">No query attempts were recorded for this request.</p> : null}
          </div>
        </article>

        <article className="staff-panel staff-diagnostic-panel">
          <div className="section-heading"><span className="kicker">Local fallback</span><h2>Process and data checks</h2><p>Useful when UDP server queries are blocked or hairpin routing fails on the same host.</p></div>
          <div className="staff-diagnostic-list">
            <DiagnosticRow label="Process running" value={boolLabel(processCheck?.running)} detail={processCheck?.matchedName ? `Matched ${processCheck.matchedName}` : processCheck?.error ?? undefined} />
            <DiagnosticRow label="Process names" value={(processCheck?.processNames ?? config.status.processNames ?? []).join(', ') || 'Not configured'} />
            <DiagnosticRow label="Data path" value={health.exists ? 'Readable' : 'Unavailable'} detail={health.dataPath ?? 'APE_RP_DATA_PATH not set'} />
            <DiagnosticRow label="Stale window" value={duration(runtime.staleAfterSeconds)} />
          </div>
          {processCheck?.matchedLine ? <pre className="staff-diagnostic-pre">{processCheck.matchedLine}</pre> : null}
          {health.warnings.length ? <div className="notice danger">{health.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div> : <p className="notice success">Game data is readable.</p>}
        </article>
      </section>

      <section className="staff-command-grid">
        <article className="staff-panel staff-diagnostic-panel">
          <div className="section-heading"><span className="kicker">Website host</span><h2>Portal process</h2><p>Lightweight web process metrics without exposing hardware details.</p></div>
          <dl className="metric-grid compact">
            <div><dt>Web uptime</dt><dd>{duration(metrics.webProcess.uptimeSeconds)}</dd></div>
            <div><dt>Host uptime</dt><dd>{duration(metrics.hostUptimeSeconds)}</dd></div>
            <div><dt>Web RAM</dt><dd>{mbToGbLabel(metrics.webProcess.rssMb)}</dd></div>
            <div><dt>Heap used</dt><dd>{mbToGbLabel(metrics.webProcess.heapUsedMb)}</dd></div>
          </dl>
        </article>

        <article className="staff-panel staff-diagnostic-panel">
          <div className="section-heading"><span className="kicker">Current decision</span><h2>{runtime.label}</h2><p>{runtime.message}</p></div>
          <div className="staff-diagnostic-list">
            <DiagnosticRow label="Runtime source" value={sourceLabel(runtime.source)} />
            <DiagnosticRow label="Last signal" value={runtime.lastSignalAt ? fullDate(runtime.lastSignalAt) : 'None'} />
            <DiagnosticRow label="Signal age" value={runtime.signalAgeSeconds === null ? 'Unknown' : duration(runtime.signalAgeSeconds)} />
            <DiagnosticRow label="Checked at" value={query?.checkedAt ? fullDate(query.checkedAt) : fullDate(metrics.checkedAt)} />
          </div>
        </article>
      </section>
    </main>
  );
}
