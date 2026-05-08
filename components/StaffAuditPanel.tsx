'use client';

import { useMemo, useState } from 'react';
import type { StaffAuditMember, StaffAuditState, StaffPageKey } from '@/lib/staff-audit-data';

type Props = { initialState: StaffAuditState };
type Filter = 'all' | 'danger' | 'warning' | 'watch' | 'ok' | 'unknown';

function formatDateTime(value: string | null) {
  if (!value) return 'No recorded activity';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function absenceLabel(member: StaffAuditMember) {
  if (member.daysSinceLastSeen === null) return 'No website or server activity recorded';
  if (member.daysSinceLastSeen === 0) return 'Active today';
  if (member.daysSinceLastSeen === 1) return 'Inactive for 1 day';
  return `Inactive for ${member.daysSinceLastSeen} days`;
}

function severityText(severity: StaffAuditMember['absenceSeverity']) {
  switch (severity) {
    case 'danger': return 'Critical';
    case 'warning': return 'Needs check-in';
    case 'watch': return 'Watch';
    case 'ok': return 'Healthy';
    default: return 'Unknown';
  }
}

export function StaffAuditPanel({ initialState }: Props) {
  const [state, setState] = useState(initialState);
  const [filter, setFilter] = useState<Filter>('all');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const visibleStaff = useMemo(() => {
    if (filter === 'all') return state.staff;
    return state.staff.filter((member) => member.absenceSeverity === filter);
  }, [filter, state.staff]);

  async function refresh() {
    const response = await fetch('/api/staff/audit', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Could not refresh staff audit data.');
    setState(data);
  }

  async function togglePage(member: StaffAuditMember, page: StaffPageKey) {
    const disabled = !member.disabledPages.includes(page);
    const key = `${member.steamId}:${page}`;
    setBusyKey(key);
    setNotice(null);
    try {
      const response = await fetch('/api/staff/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steamId: member.steamId, page, disabled }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update staff access.');
      setState(data.state);
      setNotice(disabled ? `Disabled ${page} for ${member.displayName}.` : `Restored ${page} for ${member.displayName}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Update failed.');
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <>
      <section className="staff-audit-summary-grid">
        <article><span>Total staff</span><strong>{state.totals.staffCount}</strong><p>Role assignments with staff permissions.</p></article>
        <article className="severity-danger"><span>20+ days</span><strong>{state.totals.dangerCount}</strong><p>Needs direct follow-up.</p></article>
        <article className="severity-warning"><span>10–19 days</span><strong>{state.totals.warningCount}</strong><p>Worth checking in.</p></article>
        <article className="severity-watch"><span>5–9 days</span><strong>{state.totals.watchCount}</strong><p>Potential busy week.</p></article>
        <article><span>Disabled pages</span><strong>{state.totals.overridesCount}</strong><p>Per-staff website restrictions.</p></article>
      </section>

      <section className="staff-panel staff-audit-controls">
        <div className="section-heading">
          <span className="kicker">Audit controls</span>
          <h2>Staff activity and access</h2>
          <p>Colours are based on the most recent website sign-in or server connection. Website sign-in counts are tracked from this build forward.</p>
        </div>
        <div className="segmented-control staff-audit-filter">
          {(['all', 'danger', 'warning', 'watch', 'ok', 'unknown'] as Filter[]).map((item) => (
            <button key={item} type="button" className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item === 'all' ? 'All' : severityText(item as StaffAuditMember['absenceSeverity'])}</button>
          ))}
        </div>
        <button className="button button-soft" type="button" onClick={() => refresh().catch((error) => setNotice(error.message))}>Refresh</button>
        {notice ? <div className="notice info server-admin-notice">{notice}</div> : null}
      </section>

      <section className="staff-audit-list">
        {visibleStaff.map((member) => (
          <article key={member.steamId} className={`staff-panel staff-audit-member severity-${member.absenceSeverity}`}>
            <div className="staff-audit-member-header">
              <div>
                <span className="kicker">{member.role}</span>
                <h3>{member.displayName}</h3>
                <p>{member.steamId}</p>
              </div>
              <strong className={`staff-audit-severity severity-${member.absenceSeverity}`}>{severityText(member.absenceSeverity)}</strong>
            </div>

            <div className="staff-audit-metrics">
              <div><span>Last activity</span><strong>{absenceLabel(member)}</strong><small>{formatDateTime(member.lastSeenAt)}</small></div>
              <div><span>Website sign-ins</span><strong>{member.signIns30d}</strong><small>{member.signInsAllTime} all time</small></div>
              <div><span>Actions</span><strong>{member.actionCount30d}</strong><small>{member.actionCountAllTime} all time</small></div>
              <div><span>Last server join</span><strong>{formatDateTime(member.lastServerConnectionAt)}</strong><small>Compared against connection logs</small></div>
            </div>

            <div className="staff-audit-breakdown">
              <strong>30-day action types</strong>
              {member.actionBreakdown30d.length ? (
                <div className="staff-audit-tags">
                  {member.actionBreakdown30d.map((item) => <span key={item.type}>{item.type} × {item.count}</span>)}
                </div>
              ) : <p className="muted-inline-note">No actions recorded in the last 30 days.</p>}
            </div>

            <div className="staff-audit-access">
              <strong>Page access overrides</strong>
              <div className="staff-audit-page-grid">
                {state.pages.map((page) => {
                  const disabled = member.disabledPages.includes(page.id);
                  return (
                    <button
                      key={page.id}
                      type="button"
                      className={disabled ? 'staff-page-toggle is-disabled' : 'staff-page-toggle'}
                      disabled={busyKey === `${member.steamId}:${page.id}`}
                      title={page.description}
                      onClick={() => togglePage(member, page.id)}
                    >
                      <span>{page.label}</span>
                      <em>{disabled ? 'Disabled' : 'Allowed'}</em>
                    </button>
                  );
                })}
              </div>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
