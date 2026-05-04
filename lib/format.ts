export function money(value: number | null | undefined): string {
  return `$${Math.round(Number(value ?? 0)).toLocaleString()}`;
}

export function percent(value: number | null | undefined): string {
  const number = Number(value ?? 0);
  return `${Math.max(0, Math.min(100, Math.round(number))).toLocaleString()}%`;
}

export function duration(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.floor(Number(seconds ?? 0)));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function compactDuration(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.floor(Number(seconds ?? 0)));
  const hours = Math.floor(total / 3600);
  if (hours >= 24) return `${Math.floor(hours / 24)} days`;
  if (hours > 0) return `${hours} hours`;
  return `${Math.max(1, Math.floor(total / 60))} minutes`;
}

export function itemName(resourcePath: string | null | undefined): string {
  if (!resourcePath) return 'Unknown item';
  const file = resourcePath.split('/').pop()?.replace(/\.prefab$/i, '') ?? resourcePath;
  return titleCase(file.replaceAll('_', ' '));
}

export function titleCase(value: string): string {
  return value.replace(/\b\w/g, (match) => match.toUpperCase());
}

export function fromUnixSeconds(seconds: number | null | undefined): string {
  if (!seconds) return 'Unknown';
  return new Date(seconds * 1000).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export function relativeFromUnixSeconds(seconds: number | null | undefined): string {
  if (!seconds) return 'Unknown';
  return relativeFromDate(new Date(seconds * 1000));
}

export function relativeFromDate(value: string | Date | null | undefined): string {
  if (!value) return 'Unknown';
  const date = typeof value === 'string' ? new Date(value) : value;
  const diffMs = Date.now() - date.getTime();
  if (!Number.isFinite(diffMs)) return 'Unknown';
  const seconds = Math.max(0, Math.floor(diffMs / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
}

export function fullDate(value: string | Date | null | undefined): string {
  if (!value) return 'Unknown';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!Number.isFinite(date.getTime())) return 'Unknown';
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export function compactNumber(value: number | null | undefined): string {
  return Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value ?? 0));
}

export function statLabel(key: string): string {
  return titleCase(key.replaceAll('_', ' '));
}


export function resourceLabel(value: string | null | undefined, fallback = ''): string {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  let leaf = raw.split(/[\\/]/).pop() || raw;
  leaf = leaf.replace(/\.(prefab|resource|asset|json)$/i, '');
  if (leaf.includes('.')) leaf = leaf.split('.').pop() || leaf;
  const clean = leaf.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return clean ? titleCase(clean) : fallback;
}

export function playerTitle(value: string | null | undefined, fallback = 'Northline citizen'): string {
  return resourceLabel(value, fallback) || fallback;
}
