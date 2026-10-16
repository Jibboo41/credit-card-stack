const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const currencyWhole = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const currencyCompact = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 });

export function formatCurrency(value: number, options: { whole?: boolean; compact?: boolean } = {}): string {
  const v = Object.is(value, -0) ? 0 : value;
  if (options.compact && Math.abs(v) >= 10_000) return currencyCompact.format(v);
  return (options.whole ? currencyWhole : currency).format(v);
}

/** Monarch amounts are negative for purchases; show purchases as positive and credits with a plus sign. */
export function formatTxAmount(amount: number): string {
  return amount > 0 ? `+${formatCurrency(amount)}` : formatCurrency(-amount);
}

export function formatRate(rate: number): string {
  return `${parseFloat(rate.toFixed(2))}%`;
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function toYmd(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayYmd(): string {
  return toYmd(new Date());
}

export function currentYearMonth(): string {
  return todayYmd().substring(0, 7);
}

export function parseYmd(ymd: string): Date {
  return new Date(`${ymd.substring(0, 10)}T12:00:00`);
}

export function shiftMonth(ym: string, delta: number): string {
  const [year, month] = ym.split('-').map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

export function formatMonth(ym: string, style: 'long' | 'short' = 'long'): string {
  const [year, month] = ym.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: style, year: 'numeric' });
}

export function formatDate(ymd: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }): string {
  return parseYmd(ymd).toLocaleDateString('en-US', options);
}

export function formatDayHeading(ymd: string): string {
  const today = todayYmd();
  const yesterday = toYmd(new Date(Date.now() - 86_400_000));
  if (ymd === today) return 'Today';
  if (ymd === yesterday) return 'Yesterday';
  return formatDate(ymd, { weekday: 'long', month: 'short', day: 'numeric' });
}

export function daysBetween(fromYmd: string, toYmdStr: string): number {
  return Math.round((parseYmd(toYmdStr).getTime() - parseYmd(fromYmd).getTime()) / 86_400_000);
}

export function daysUntil(ymd: string): number {
  return daysBetween(todayYmd(), ymd);
}

export function formatRelativeDays(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

/** Next calendar date (today or later) that falls on the given day of the month, clamped to short months. */
export function nextDueDate(dueDay: number, from: Date = new Date()): string {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let offset = 0; offset < 2; offset++) {
    const year = today.getFullYear();
    const month = today.getMonth() + offset;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const candidate = new Date(year, month, Math.min(dueDay, lastDay));
    if (candidate >= today) return toYmd(candidate);
  }
  return toYmd(new Date(today.getFullYear(), today.getMonth() + 1, Math.min(dueDay, 28)));
}

export function timeAgo(iso: string | number | Date): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
