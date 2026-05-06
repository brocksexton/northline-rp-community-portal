'use client';

import { useMemo, useState } from 'react';
import type { CaseDefinition, CaseRewardDefinition, CaseRewardKind, CaseRewardRarity, CaseStatus, getDailyDropsAdminState } from '@/lib/cases-data';

type DailyDropsAdminState = Awaited<ReturnType<typeof getDailyDropsAdminState>>;

type Props = {
  initialState: DailyDropsAdminState;
  canManage: boolean;
};

const statuses: Array<{ id: CaseStatus; label: string; description: string }> = [
  { id: 'active', label: 'Active', description: 'Public and claimable.' },
  { id: 'hidden', label: 'Hidden', description: 'Not shown or claimable.' },
  { id: 'retired', label: 'Retired', description: 'Kept for records, not claimable.' },
];

const rewardKinds: CaseRewardKind[] = ['cash', 'item', 'utility', 'special'];
const rarities: CaseRewardRarity[] = ['common', 'uncommon', 'rare', 'legendary'];

function slugify(value: string, fallback: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
  return slug || fallback;
}

function newReward(index: number): CaseRewardDefinition {
  return {
    id: `reward-${Date.now()}-${index}`,
    label: 'New reward',
    description: 'Describe what staff should fulfill later.',
    kind: 'item',
    icon: 'fa-solid fa-gift',
    rarity: 'common',
    weight: 1,
    hidden: false,
  };
}

function newCase(index: number): CaseDefinition {
  const label = `Daily Drop ${index + 1}`;
  return {
    id: slugify(label, `daily-drop-${index + 1}`),
    label,
    description: 'A configurable daily drop for website check-ins.',
    status: 'hidden',
    cadenceHours: 24,
    accent: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
    rewards: [newReward(0)],
  };
}

function activeRewardWeight(caseDefinition: CaseDefinition) {
  return caseDefinition.rewards.filter((reward) => !reward.hidden).reduce((sum, reward) => sum + Number(reward.weight || 0), 0);
}

export function DailyDropsAdminPanel({ initialState, canManage }: Props) {
  const [state, setState] = useState(initialState);
  const [selectedId, setSelectedId] = useState(initialState.definitions[0]?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const selected = useMemo(() => state.definitions.find((item) => item.id === selectedId) ?? state.definitions[0] ?? null, [state.definitions, selectedId]);
  const activeCount = state.definitions.filter((item) => item.status === 'active').length;

  function setDefinitions(definitions: CaseDefinition[]) {
    setState((current) => ({ ...current, definitions }));
  }

  function updateCase(id: string, patch: Partial<CaseDefinition>) {
    setDefinitions(state.definitions.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function renameCase(id: string, nextId: string) {
    const safeId = slugify(nextId, id);
    setDefinitions(state.definitions.map((item) => item.id === id ? { ...item, id: safeId } : item));
    setSelectedId(safeId);
  }

  function updateReward(caseId: string, rewardId: string, patch: Partial<CaseRewardDefinition>) {
    setDefinitions(state.definitions.map((item) => item.id === caseId ? {
      ...item,
      rewards: item.rewards.map((reward) => reward.id === rewardId ? { ...reward, ...patch } : reward),
    } : item));
  }

  function addCase() {
    const created = newCase(state.definitions.length);
    setDefinitions([...state.definitions, created]);
    setSelectedId(created.id);
  }

  function duplicateCase(caseDefinition: CaseDefinition) {
    const created = {
      ...caseDefinition,
      id: `${caseDefinition.id}-copy-${Date.now()}`,
      label: `${caseDefinition.label} Copy`,
      status: 'hidden' as CaseStatus,
      rewards: caseDefinition.rewards.map((reward, index) => ({ ...reward, id: `${reward.id}-copy-${Date.now()}-${index}` })),
    };
    setDefinitions([...state.definitions, created]);
    setSelectedId(created.id);
  }

  function removeCase(caseId: string) {
    const next = state.definitions.filter((item) => item.id !== caseId);
    setDefinitions(next);
    setSelectedId(next[0]?.id ?? '');
  }

  function addReward(caseId: string) {
    const caseDefinition = state.definitions.find((item) => item.id === caseId);
    if (!caseDefinition) return;
    updateCase(caseId, { rewards: [...caseDefinition.rewards, newReward(caseDefinition.rewards.length)] });
  }

  function removeReward(caseId: string, rewardId: string) {
    const caseDefinition = state.definitions.find((item) => item.id === caseId);
    if (!caseDefinition) return;
    updateCase(caseId, { rewards: caseDefinition.rewards.filter((reward) => reward.id !== rewardId) });
  }

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch('/api/staff/daily-drops', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ definitions: state.definitions }),
      });
      const payload = await response.json();
      if (payload.state) {
        setState(payload.state);
        if (!payload.state.definitions.some((item: CaseDefinition) => item.id === selectedId)) setSelectedId(payload.state.definitions[0]?.id ?? '');
      }
      setMessage(payload.ok ? 'Daily drops saved. Public cases now use the updated pool.' : payload.message ?? 'Could not save daily drops.');
    } catch {
      setMessage('Could not reach the daily drops API.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="staff-panel drops-admin-panel">
      <div className="section-heading inline">
        <div>
          <span className="kicker">Daily drops</span>
          <h2>Manage daily cases and reward pools</h2>
          <p>Add, remove, hide, retire, and tune daily drop cases. Hidden and retired cases do not appear on the public cases page or claim API.</p>
        </div>
        <span className="feature-admin-count"><strong>{activeCount}</strong> active</span>
      </div>

      <div className="drops-admin-stats">
        <div><strong>{state.claimedCount}</strong><span>claimed</span></div>
        <div><strong>{state.openedCount}</strong><span>opened</span></div>
        <div><strong>{state.hiddenCount}</strong><span>hidden</span></div>
        <div><strong>{state.retiredCount}</strong><span>retired</span></div>
      </div>

      <div className="drops-admin-layout">
        <aside className="drops-case-list">
          <button className="button button-soft" disabled={!canManage || saving} type="button" onClick={addCase}><i className="fa-solid fa-plus" aria-hidden="true" /> Add case</button>
          {state.definitions.map((caseDefinition) => (
            <button className={caseDefinition.id === selected?.id ? 'selected' : ''} key={caseDefinition.id} type="button" onClick={() => setSelectedId(caseDefinition.id)}>
              <span><strong>{caseDefinition.label}</strong><small>{caseDefinition.status} · {caseDefinition.rewards.length} reward{caseDefinition.rewards.length === 1 ? '' : 's'}</small></span>
              <em>{activeRewardWeight(caseDefinition)} wt</em>
            </button>
          ))}
        </aside>

        {selected ? (
          <section className="drops-case-editor">
            <div className="drops-editor-topline">
              <h3>{selected.label}</h3>
              <div>
                <button className="button button-soft" disabled={!canManage || saving} type="button" onClick={() => duplicateCase(selected)}><i className="fa-solid fa-copy" aria-hidden="true" /> Duplicate</button>
                <button className="button button-danger" disabled={!canManage || saving || state.definitions.length <= 1} type="button" onClick={() => removeCase(selected.id)}><i className="fa-solid fa-trash" aria-hidden="true" /> Remove</button>
              </div>
            </div>

            <div className="drops-form-grid">
              <label><span>Case ID</span><input disabled={!canManage || saving} value={selected.id} onChange={(event) => renameCase(selected.id, event.target.value)} /></label>
              <label><span>Label</span><input disabled={!canManage || saving} value={selected.label} maxLength={80} onChange={(event) => updateCase(selected.id, { label: event.target.value })} /></label>
              <label><span>Cadence hours</span><input disabled={!canManage || saving} type="number" min={1} max={720} value={selected.cadenceHours} onChange={(event) => updateCase(selected.id, { cadenceHours: Number(event.target.value) })} /></label>
              <label><span>Accent</span><input disabled={!canManage || saving} value={selected.accent} onChange={(event) => updateCase(selected.id, { accent: event.target.value })} /></label>
              <label className="wide"><span>Description</span><textarea disabled={!canManage || saving} value={selected.description} maxLength={280} rows={3} onChange={(event) => updateCase(selected.id, { description: event.target.value })} /></label>
            </div>

            <div className="drops-status-strip">
              {statuses.map((status) => (
                <button className={selected.status === status.id ? 'selected' : ''} disabled={!canManage || saving} key={status.id} type="button" onClick={() => updateCase(selected.id, { status: status.id })}>
                  <strong>{status.label}</strong><span>{status.description}</span>
                </button>
              ))}
            </div>

            <div className="drops-reward-heading">
              <div><span className="kicker">Rewards</span><h3>Reward pool</h3></div>
              <button className="button button-soft" disabled={!canManage || saving} type="button" onClick={() => addReward(selected.id)}><i className="fa-solid fa-plus" aria-hidden="true" /> Add reward</button>
            </div>

            <div className="drops-reward-list">
              {selected.rewards.map((reward) => (
                <article className={`drops-reward-editor rarity-${reward.rarity} ${reward.hidden ? 'hidden-reward' : ''}`} key={reward.id}>
                  <div className="drops-reward-title">
                    <i className={reward.icon} aria-hidden="true" />
                    <div><strong>{reward.label}</strong><small>{reward.hidden ? 'Hidden from rolls' : `${reward.weight} weight · ${reward.rarity}`}</small></div>
                    <label className="mini-toggle"><input disabled={!canManage || saving} type="checkbox" checked={!reward.hidden} onChange={(event) => updateReward(selected.id, reward.id, { hidden: !event.target.checked })} /><span>{reward.hidden ? 'Hidden' : 'Live'}</span></label>
                  </div>
                  <div className="drops-form-grid reward-grid">
                    <label><span>ID</span><input disabled={!canManage || saving} value={reward.id} onChange={(event) => updateReward(selected.id, reward.id, { id: slugify(event.target.value, reward.id) })} /></label>
                    <label><span>Label</span><input disabled={!canManage || saving} value={reward.label} maxLength={80} onChange={(event) => updateReward(selected.id, reward.id, { label: event.target.value })} /></label>
                    <label><span>Icon class</span><input disabled={!canManage || saving} value={reward.icon} onChange={(event) => updateReward(selected.id, reward.id, { icon: event.target.value })} /></label>
                    <label><span>Weight</span><input disabled={!canManage || saving} type="number" min={0} max={1000000} value={reward.weight} onChange={(event) => updateReward(selected.id, reward.id, { weight: Number(event.target.value) })} /></label>
                    <label><span>Kind</span><select disabled={!canManage || saving} value={reward.kind} onChange={(event) => updateReward(selected.id, reward.id, { kind: event.target.value as CaseRewardKind })}>{rewardKinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}</select></label>
                    <label><span>Rarity</span><select disabled={!canManage || saving} value={reward.rarity} onChange={(event) => updateReward(selected.id, reward.id, { rarity: event.target.value as CaseRewardRarity })}>{rarities.map((rarity) => <option key={rarity} value={rarity}>{rarity}</option>)}</select></label>
                    <label><span>Cash value</span><input disabled={!canManage || saving} type="number" value={reward.value ?? ''} onChange={(event) => updateReward(selected.id, reward.id, { value: event.target.value === '' ? undefined : Number(event.target.value) })} /></label>
                    <label><span>Item/bridge ID</span><input disabled={!canManage || saving} value={reward.itemId ?? ''} onChange={(event) => updateReward(selected.id, reward.id, { itemId: event.target.value })} /></label>
                    <label className="wide"><span>Description</span><textarea disabled={!canManage || saving} value={reward.description} maxLength={220} rows={2} onChange={(event) => updateReward(selected.id, reward.id, { description: event.target.value })} /></label>
                  </div>
                  <div className="drops-reward-actions">
                    <button className="button button-danger" disabled={!canManage || saving || selected.rewards.length <= 1} type="button" onClick={() => removeReward(selected.id, reward.id)}><i className="fa-solid fa-trash" aria-hidden="true" /> Remove reward</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <section className="drops-case-editor"><p>No daily drops configured.</p></section>
        )}
      </div>

      <div className="staff-editor-actions">
        <button className="button button-primary" disabled={!canManage || saving} type="button" onClick={save}><i className="fa-solid fa-floppy-disk" aria-hidden="true" /> {saving ? 'Saving…' : 'Save daily drops'}</button>
        {!canManage ? <span>Developer access required to edit.</span> : message ? <span>{message}</span> : null}
      </div>
    </article>
  );
}
