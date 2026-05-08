'use client';

import { useMemo, useState } from 'react';
import type { MetricSample } from '@/lib/community-data';
import { relativeFromDate } from '@/lib/format';

type MetricKey = 'ram' | 'cpu' | 'latency' | 'bandwidth';

type MetricDefinition = {
  key: MetricKey;
  label: string;
  unit: string;
  description: string;
  max?: number;
  getValue: (sample: MetricSample) => number | null | undefined;
};

const METRICS: MetricDefinition[] = [
  { key: 'ram', label: 'RAM utilization', unit: '%', max: 100, description: 'Host memory utilization over time.', getValue: (sample) => sample.ramPercent },
  { key: 'cpu', label: 'CPU utilization', unit: '%', max: 100, description: 'CPU samples captured by the website process.', getValue: (sample) => sample.cpuPercent },
  { key: 'latency', label: 'Query latency', unit: 'ms', description: 'How long the game server query took when it answered.', getValue: (sample) => sample.latencyMs },
  { key: 'bandwidth', label: 'Bandwidth', unit: 'KB/s', description: 'Network collector placeholder for future RX/TX samples.', getValue: (sample) => {
    const rx = typeof sample.networkRxKbps === 'number' ? sample.networkRxKbps : null;
    const tx = typeof sample.networkTxKbps === 'number' ? sample.networkTxKbps : null;
    return rx === null && tx === null ? null : (rx ?? 0) + (tx ?? 0);
  } },
];

function fmt(value: number | null | undefined, unit: string) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'No sample';
  return `${Math.round(value * 10) / 10}${unit}`;
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function chartCoordinates(values: Array<{ value: number; capturedAt: string }>, max: number) {
  const width = 620;
  const height = 180;
  return values.map((point, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = height - Math.max(0, Math.min(1, point.value / max)) * height;
    return { ...point, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
  });
}


export function StaffMetricsHistoryPanel({ samples }: { samples: MetricSample[] }) {
  const [selected, setSelected] = useState<MetricKey>('ram');
  const metric = METRICS.find((item) => item.key === selected) ?? METRICS[0];

  const values = useMemo(() => samples
    .map((sample) => ({ capturedAt: sample.capturedAt, value: metric.getValue(sample) }))
    .filter((sample): sample is { capturedAt: string; value: number } => typeof sample.value === 'number' && Number.isFinite(sample.value)), [samples, metric]);

  const max = metric.max ?? Math.max(1, Math.ceil(Math.max(...values.map((item) => item.value), 1) * 1.15));
  const coords = chartCoordinates(values, max);
  const points = coords.map((point) => `${point.x},${point.y}`).join(' ');
  const latest = values.at(-1)?.value ?? null;
  const avg = average(values.map((item) => item.value));
  const peak = values.length ? Math.max(...values.map((item) => item.value)) : null;
  const first = values[0]?.capturedAt;
  const last = values.at(-1)?.capturedAt;

  return (
    <article className="staff-panel staff-metric-history-panel">
      <div className="section-heading">
        <span className="kicker">Metric history</span>
        <h2>Performance pages</h2>
        <p>Flip between lightweight history pages for RAM, CPU, latency, and bandwidth. Samples are captured as the status endpoint is checked.</p>
      </div>

      <div className="staff-metric-tabs" role="tablist" aria-label="Metric pages">
        {METRICS.map((item) => (
          <button key={item.key} type="button" className={item.key === selected ? 'active' : ''} onClick={() => setSelected(item.key)}>
            {item.label}
          </button>
        ))}
      </div>

      <div className="staff-metric-summary-row">
        <div><span>Latest</span><strong>{fmt(latest, metric.unit)}</strong></div>
        <div><span>Average</span><strong>{fmt(avg, metric.unit)}</strong></div>
        <div><span>Peak</span><strong>{fmt(peak, metric.unit)}</strong></div>
        <div><span>Samples</span><strong>{values.length}</strong></div>
      </div>

      <div className="staff-metric-chart" aria-label={`${metric.label} chart`}>
        {points ? (
          <svg viewBox="0 0 620 180" preserveAspectRatio="none" role="img" aria-label={`${metric.label} history`}>
            <line x1="0" y1="0" x2="620" y2="0" />
            <line x1="0" y1="90" x2="620" y2="90" />
            <line x1="0" y1="180" x2="620" y2="180" />
            <polyline points={points} />
            {coords.map((point, index) => (
              <circle key={`${point.capturedAt}-${index}`} cx={point.x} cy={point.y} r="5">
                <title>{`${metric.label}: ${fmt(point.value, metric.unit)} · ${new Date(point.capturedAt).toLocaleString()}`}</title>
              </circle>
            ))}
          </svg>
        ) : (
          <div className="staff-metric-empty">
            <strong>No usable {metric.label.toLowerCase()} samples yet.</strong>
            <span>{selected === 'bandwidth' ? 'Bandwidth history is ready for a future NIC/performance-counter collector.' : 'Refresh the staff status page or status API after the site has been running for a bit.'}</span>
          </div>
        )}
      </div>

      <div className="staff-metric-chart-footer">
        <span>{metric.description}</span>
        <small>{first && last ? `${relativeFromDate(first)} → ${relativeFromDate(last)}` : 'No time range yet'}</small>
      </div>
    </article>
  );
}
