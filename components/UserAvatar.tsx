type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const sizeClass: Record<AvatarSize, string> = {
  sm: 'avatar-sm',
  md: 'avatar-md',
  lg: 'avatar-lg',
  xl: 'avatar-xl',
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'NL';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
}

export function UserAvatar({ src, name, size = 'md' }: { src?: string | null; name: string; size?: AvatarSize }) {
  const safeName = name || 'Northline citizen';
  return (
    <div className={`avatar ${sizeClass[size]}`} aria-label={safeName} title={safeName}>
      {src ? <img src={src} alt="" referrerPolicy="no-referrer" /> : <span>{initials(safeName)}</span>}
    </div>
  );
}
