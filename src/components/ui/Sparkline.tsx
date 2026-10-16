import { useId } from 'react';

interface SparklineProps {
  values: number[];
  height?: number;
  color?: string;
  fill?: boolean;
  label?: string;
}

export function Sparkline({ values, height = 40, color = 'var(--accent)', fill = true, label }: SparklineProps) {
  const gradientId = `spark${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  if (values.length < 2) return null;

  const width = 100;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => [
    (i / (values.length - 1)) * width,
    height - 2 - ((v - min) / range) * (height - 4),
  ]);
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" height={height} role="img" aria-label={label}>
      {fill && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.32" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line} L${width},${height} L0,${height} Z`} fill={`url(#${gradientId})`} />
        </>
      )}
      <path d={line} fill="none" stroke={color} strokeWidth="1.75" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
