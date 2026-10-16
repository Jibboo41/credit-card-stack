interface ProgressBarProps {
  value: number;
  tone?: 'accent' | 'good' | 'warn' | 'bad';
  size?: 'md' | 'sm';
  label?: string;
}

export function ProgressBar({ value, tone = 'accent', size = 'md', label }: ProgressBarProps) {
  const pct = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  return (
    <div className={`progress${size === 'sm' ? ' progress-sm' : ''}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={`progress-fill${tone === 'accent' ? '' : ` ${tone}`}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
