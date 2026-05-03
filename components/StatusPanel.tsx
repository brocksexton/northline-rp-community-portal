export function StatusPanel({ label = 'Status', value = 'Unavailable' }: { label?: string; value?: string }) {
  return <div className="card"><span className="kicker">{label}</span><strong>{value}</strong></div>;
}
