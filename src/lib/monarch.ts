import type { ConnectionStatus, CreditCard, RecurringStream } from '../core/models';

/**
 * Amount owed on a card as a positive number. Monarch reports card balances with the opposite sign
 * (the original UI displayed `-currentBalance`), so the conversion lives here in one place.
 */
export function getAmountOwed(card: CreditCard): number | undefined {
  if (card.currentBalance === undefined || card.currentBalance === null) return undefined;
  const owed = -card.currentBalance;
  return Object.is(owed, -0) ? 0 : owed;
}

/** The user's own limit wins; otherwise fall back to the limit Monarch reports. */
export function getCreditLimit(card: CreditCard): number | undefined {
  if (card.cardLimit !== undefined && card.cardLimit !== null && card.cardLimit > 0) return card.cardLimit;
  if (card.monarchCreditLimit !== undefined && card.monarchCreditLimit !== null && card.monarchCreditLimit > 0) return card.monarchCreditLimit;
  return undefined;
}

/** Utilization as a 0–1+ fraction, or undefined when the balance or limit is unknown. */
export function getUtilization(card: CreditCard): number | undefined {
  const owed = getAmountOwed(card);
  const limit = getCreditLimit(card);
  if (owed === undefined || !limit) return undefined;
  return Math.max(0, owed) / limit;
}

export function utilizationTone(fraction: number): 'good' | 'warn' | 'bad' {
  if (fraction < 0.3) return 'good';
  if (fraction < 0.5) return 'warn';
  return 'bad';
}

/** Monarch may report APR as a fraction (0.2499) or a percentage (24.99); normalize to a percentage. */
export function normalizeApr(apr: number | undefined | null): number | undefined {
  if (apr === undefined || apr === null || Number.isNaN(apr) || apr <= 0) return undefined;
  return apr <= 1 ? apr * 100 : apr;
}

/**
 * Balance history converted to "amount owed" (positive = owed). Guards against a sign mismatch between
 * the history and the current balance by aligning the history's last point with the current balance.
 */
export function getOwedHistory(card: CreditCard): number[] {
  const history = card.balanceHistory?.filter(v => typeof v === 'number' && Number.isFinite(v)) ?? [];
  if (history.length === 0) return [];
  const last = history[history.length - 1];
  const current = card.currentBalance;
  const flip = current !== undefined && current !== 0 && last !== 0 && Math.sign(current) !== Math.sign(last);
  return history.map(v => (flip ? v : -v));
}

export interface ConnectionInfo {
  label: string;
  tone: 'good' | 'warn' | 'bad' | 'neutral';
  needsAttention: boolean;
  hint?: string;
}

export function getConnectionInfo(status: ConnectionStatus | undefined): ConnectionInfo | undefined {
  switch (status) {
    case 'ok':
      return { label: 'Connected', tone: 'good', needsAttention: false };
    case 'update_required':
      return { label: 'Needs re-authentication', tone: 'warn', needsAttention: true, hint: 'Reconnect this account in Monarch to resume syncing.' };
    case 'disconnected':
      return { label: 'Disconnected', tone: 'bad', needsAttention: true, hint: 'Monarch lost the connection to this institution.' };
    case 'manual':
      return { label: 'Manual account', tone: 'neutral', needsAttention: false };
    case 'sync_disabled':
      return { label: 'Sync disabled', tone: 'neutral', needsAttention: false, hint: 'Syncing is turned off for this account in Monarch.' };
    default:
      return undefined;
  }
}

interface FrequencyInfo {
  label: string;
  perMonth: number;
}

/** Interpret Monarch's recurring frequency strings (e.g. "monthly", "biweekly", "semimonthly_start_mid"). */
export function getFrequencyInfo(frequency: string | undefined): FrequencyInfo {
  const f = (frequency ?? '').toLowerCase();
  if (!f) return { label: 'Recurring', perMonth: 1 };
  if (f.includes('daily') || f === 'day') return { label: 'Daily', perMonth: 365 / 12 };
  if (f.includes('semimonth') || f.includes('twice_a_month') || f.includes('twice a month')) return { label: 'Twice a month', perMonth: 2 };
  if (f.includes('biweek') || f.includes('two_week') || f.includes('every_two_weeks') || f.includes('fortnight')) return { label: 'Every 2 weeks', perMonth: 26 / 12 };
  if (f.includes('week')) return { label: 'Weekly', perMonth: 52 / 12 };
  if (f.includes('two_month') || f.includes('bimonth') || f.includes('every_other_month')) return { label: 'Every 2 months', perMonth: 0.5 };
  if (f.includes('quarter')) return { label: 'Quarterly', perMonth: 1 / 3 };
  if (f.includes('semiyear') || f.includes('semi_annual') || f.includes('semiannual') || f.includes('half')) return { label: 'Twice a year', perMonth: 1 / 6 };
  if (f.includes('year') || f.includes('annual')) return { label: 'Yearly', perMonth: 1 / 12 };
  if (f.includes('month')) return { label: 'Monthly', perMonth: 1 };
  const label = f.replace(/_/g, ' ');
  return { label: label.charAt(0).toUpperCase() + label.slice(1), perMonth: 1 };
}

/** Typical charge for a stream as a positive number. */
export function getStreamAmount(stream: RecurringStream): number {
  return Math.abs(stream.amount ?? stream.nextAmount ?? stream.lastAmount ?? 0);
}

/** Expense streams have negative amounts; income streams (paychecks, refunds) are positive. */
export function isExpenseStream(stream: RecurringStream): boolean {
  const amount = stream.amount ?? stream.nextAmount ?? stream.lastAmount ?? 0;
  return amount < 0;
}

export function getMonthlyEquivalent(stream: RecurringStream): number {
  return getStreamAmount(stream) * getFrequencyInfo(stream.frequency).perMonth;
}

export function getCardDisplayName(card: CreditCard): string {
  return card.name || card.monarchDisplayName || 'Unnamed card';
}

export function getBankName(card: CreditCard): string | undefined {
  return card.bankName || card.institutionName || undefined;
}
