import { APE_TAVERN_BADGE_KIND, APE_TAVERN_BADGE_IMAGE_PATH } from '@/lib/ape-staff-shared';

export function TweeterVerifiedBadge({ kind, className = '' }: { kind?: string | null; className?: string }) {
  if (!kind || kind === 'None') return null;
  const label = kind.trim() || 'Verified';
  const classes = ['tweeter-verified', className].filter(Boolean).join(' ');
  if (label === APE_TAVERN_BADGE_KIND) {
    return (
      <span className={`${classes} tweeter-verified-custom`} title={label} aria-label={label}>
        <img src={APE_TAVERN_BADGE_IMAGE_PATH} alt="" aria-hidden="true" />
      </span>
    );
  }
  return <span className={classes} title={label} aria-label={label}><span className="verified-check">✓</span></span>;
}
