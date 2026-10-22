import { CATEGORIES } from '../core/models';
import type { CardOffer, CreditCard, FinanceCategory, Transaction } from '../core/models';

export function isCategoryActive(card: CreditCard, ym: string, cat: FinanceCategory): boolean {
  const historical = card.historicalCashback?.[ym]?.[cat];
  if (historical !== undefined) return historical !== -1;
  return card.cashback?.[cat] !== undefined;
}

export function getActiveCategoriesForMonth(card: CreditCard, ym: string): FinanceCategory[] {
  return CATEGORIES.filter(cat => isCategoryActive(card, ym, cat));
}

export function getCardCashback(card: CreditCard, ym: string, cat: FinanceCategory): number {
  const historical = card.historicalCashback?.[ym]?.[cat];
  if (historical !== undefined) {
    return historical === -1 ? (card.baseCashback ?? 0) : historical;
  }
  if (!isCategoryActive(card, ym, cat)) return card.baseCashback ?? 0;
  return card.cashback?.[cat] ?? card.baseCashback ?? 0;
}

export function isBaseCashback(card: CreditCard, ym: string, cat: FinanceCategory): boolean {
  const historical = card.historicalCashback?.[ym]?.[cat];
  if (historical !== undefined) return historical === -1;
  if (card.cashback?.[cat] !== undefined) return false;
  return card.baseCashback !== undefined;
}

export function getResolvedTransaction(tx: Transaction): Transaction {
  return {
    ...tx,
    merchantName: tx.manualMerchantName ?? tx.merchantName,
    amount: tx.manualAmount ?? tx.amount,
    date: tx.manualDate ?? tx.date,
    category: tx.manualCategory ?? tx.category,
  };
}

const TRANSFER_CATEGORY_NAMES = new Set(['Credit Card Payment', 'Transfer', 'Balance Adjustments']);

/** Payments, transfers and balance adjustments are not purchases and never earn rewards. */
export function isTransferLike(tx: Transaction): boolean {
  if (tx.isTransfer !== undefined) return tx.isTransfer;
  return !!tx.originalCategory && TRANSFER_CATEGORY_NAMES.has(tx.originalCategory);
}

export function earnsRewards(tx: Transaction): boolean {
  return !tx.excludeFromCashback && !isTransferLike(tx);
}

export interface RankedCard {
  card: CreditCard;
  rate: number;
  isBase: boolean;
  isBest: boolean;
}

/**
 * Cards ranked by earn rate for a category in a month. Cards with the category active are always
 * included; cards that only earn their base rate are included when they share the highest base rate.
 */
export function rankCardsForCategory(cards: CreditCard[], ym: string, cat: FinanceCategory): RankedCard[] {
  const active: RankedCard[] = [];
  const base: RankedCard[] = [];
  for (const card of cards) {
    if (isCategoryActive(card, ym, cat)) {
      active.push({ card, rate: getCardCashback(card, ym, cat), isBase: false, isBest: false });
    } else if (card.baseCashback !== undefined && card.baseCashback > 0) {
      base.push({ card, rate: card.baseCashback, isBase: true, isBest: false });
    }
  }
  const topBase = Math.max(-Infinity, ...base.map(b => b.rate));
  const ranked = [...active, ...base.filter(b => b.rate === topBase)];
  ranked.sort((a, b) => b.rate - a.rate || Number(a.isBase) - Number(b.isBase) || a.card.name.localeCompare(b.card.name));
  const best = ranked[0]?.rate ?? 0;
  return ranked.map(r => ({ ...r, isBest: best > 0 && r.rate === best }));
}

export function bestRateForCategory(cards: CreditCard[], ym: string, cat: FinanceCategory): { rate: number; cards: CreditCard[] } {
  let rate = 0;
  let winners: CreditCard[] = [];
  for (const card of cards) {
    const r = getCardCashback(card, ym, cat);
    if (r > rate) {
      rate = r;
      winners = [card];
    } else if (r === rate && r > 0) {
      winners.push(card);
    }
  }
  return { rate, cards: winners };
}

export interface CategoryEarnings {
  category: FinanceCategory;
  spend: number;
  cashback: number;
  rate: number;
  isBase: boolean;
  transactions: Transaction[];
}

export interface CardEarnings {
  card: CreditCard;
  spend: number;
  cashback: number;
  categories: CategoryEarnings[];
}

export interface MonthEarnings {
  byCard: CardEarnings[];
  byCategory: Record<FinanceCategory, { card: CreditCard; spend: number; cashback: number; rate: number; transactions: Transaction[] }[]>;
  totalSpend: number;
  totalCashback: number;
}

export function txMonth(tx: Transaction): string {
  return tx.date.substring(0, 7);
}

export function cardsByMonarchId(cards: CreditCard[]): Map<string, CreditCard> {
  const map = new Map<string, CreditCard>();
  for (const card of cards) {
    if (card.monarchId) map.set(card.monarchId, card);
  }
  return map;
}

/** Net spend per card and category for the month (refunds offset purchases; transfers excluded). */
export function computeMonthEarnings(cards: CreditCard[], transactions: Transaction[], ym: string): MonthEarnings {
  const byMonarchId = cardsByMonarchId(cards);
  const spend = new Map<string, Map<FinanceCategory, { spend: number; transactions: Transaction[] }>>();

  for (const tx of transactions) {
    if (!tx.date.startsWith(ym) || !earnsRewards(tx)) continue;
    const card = byMonarchId.get(tx.monarchAccountId);
    if (!card) continue;
    const category = CATEGORIES.includes(tx.category) ? tx.category : 'Other';
    const perCat = spend.get(card.id) ?? new Map<FinanceCategory, { spend: number; transactions: Transaction[] }>();
    const group = perCat.get(category) ?? { spend: 0, transactions: [] };
    group.spend -= tx.amount;
    group.transactions.push(tx);
    perCat.set(category, group);
    spend.set(card.id, perCat);
  }

  const byCategory = Object.fromEntries(CATEGORIES.map(c => [c, []])) as unknown as MonthEarnings['byCategory'];
  const byCard: CardEarnings[] = [];
  let totalSpend = 0;
  let totalCashback = 0;

  for (const card of cards) {
    const perCat = spend.get(card.id);
    if (!perCat) continue;
    const categories: CategoryEarnings[] = [];
    for (const category of CATEGORIES) {
      const group = perCat.get(category);
      if (!group || group.spend <= 0) continue;
      const s = group.spend;
      const categoryTransactions = group.transactions.sort((a, b) => b.date.localeCompare(a.date));
      const rate = getCardCashback(card, ym, category);
      const cashback = s * (rate / 100);
      categories.push({ category, spend: s, cashback, rate, isBase: isBaseCashback(card, ym, category), transactions: categoryTransactions });
      byCategory[category].push({ card, spend: s, cashback, rate, transactions: categoryTransactions });
    }
    if (categories.length === 0) continue;
    categories.sort((a, b) => b.cashback - a.cashback);
    const cardSpend = categories.reduce((acc, c) => acc + c.spend, 0);
    const cardCashback = categories.reduce((acc, c) => acc + c.cashback, 0);
    totalSpend += cardSpend;
    totalCashback += cardCashback;
    byCard.push({ card, spend: cardSpend, cashback: cardCashback, categories });
  }

  byCard.sort((a, b) => b.cashback - a.cashback);
  for (const category of CATEGORIES) byCategory[category].sort((a, b) => b.cashback - a.cashback);

  return { byCard, byCategory, totalSpend, totalCashback };
}

export interface MissedReward {
  category: FinanceCategory;
  spend: number;
  earned: number;
  potential: number;
  missed: number;
  bestRate: number;
  bestCards: CreditCard[];
}

/** Rewards that would have been earned by putting each category's spend on the best card. */
export function computeMissedRewards(cards: CreditCard[], earnings: MonthEarnings, ym: string): MissedReward[] {
  const results: MissedReward[] = [];
  for (const category of CATEGORIES) {
    const entries = earnings.byCategory[category];
    if (entries.length === 0) continue;
    const best = bestRateForCategory(cards, ym, category);
    const spend = entries.reduce((acc, e) => acc + e.spend, 0);
    const earned = entries.reduce((acc, e) => acc + e.cashback, 0);
    const potential = spend * (best.rate / 100);
    const missed = potential - earned;
    if (missed > 0.005) {
      results.push({ category, spend, earned, potential, missed, bestRate: best.rate, bestCards: best.cards });
    }
  }
  return results.sort((a, b) => b.missed - a.missed);
}

function parseLocalTime(ymd: string): number {
  return new Date(`${ymd}T12:00:00`).getTime();
}

function endOfDay(ymd: string): number {
  return new Date(`${ymd}T12:00:00`).setHours(23, 59, 59, 999);
}

export function monthBounds(ym: string): { start: number; end: number } {
  const [year, month] = ym.split('-').map(Number);
  return {
    start: new Date(year, month - 1, 1).getTime(),
    end: new Date(year, month, 0, 23, 59, 59, 999).getTime(),
  };
}

export function isOfferInMonth(offer: CardOffer, ym: string): boolean {
  const { start, end } = monthBounds(ym);
  const offerStart = offer.startDate ? parseLocalTime(offer.startDate) : -Infinity;
  const offerEnd = offer.endDate ? endOfDay(offer.endDate) : Infinity;
  return end >= offerStart && start <= offerEnd;
}

export interface OfferProgress {
  card: CreditCard;
  offer: CardOffer;
  transactions: Transaction[];
  spend: number;
  percent: number;
  remaining: number;
  isComplete: boolean;
  daysLeft?: number;
}

export function computeOfferProgress(card: CreditCard, offer: CardOffer, transactions: Transaction[], ym: string): OfferProgress {
  const { start, end } = monthBounds(ym);
  const offerStart = offer.startDate ? parseLocalTime(offer.startDate) : -Infinity;
  const offerEnd = offer.endDate ? endOfDay(offer.endDate) : Infinity;
  const eligible = offer.eligibleCategories ?? [];

  const matching = transactions.filter(tx => {
    if (!card.monarchId || tx.monarchAccountId !== card.monarchId) return false;
    if (isTransferLike(tx)) return false;
    if (eligible.length > 0 && !eligible.includes(tx.category)) return false;
    const t = parseLocalTime(tx.date);
    return offer.isMonthly ? t >= start && t <= end : t >= offerStart && t <= offerEnd;
  });
  matching.sort((a, b) => b.date.localeCompare(a.date));

  const spend = matching.reduce((acc, tx) => acc - tx.amount, 0);
  const target = offer.spendTarget || 0;
  const rawPercent = target > 0 ? Math.round((spend / target) * 100) : spend > 0 ? 100 : 0;
  const percent = Math.max(0, Math.min(100, rawPercent));
  const periodEnd = offer.isMonthly ? end : offerEnd;
  const daysLeft = Number.isFinite(periodEnd) ? Math.ceil((periodEnd - Date.now()) / 86_400_000) : undefined;

  return {
    card,
    offer,
    transactions: matching,
    spend,
    percent,
    remaining: Math.max(0, target - spend),
    isComplete: percent >= 100,
    daysLeft,
  };
}

/** Rewards earned per card across every month of a calendar year (each month uses that month's rates). */
export function computeYearEarnings(cards: CreditCard[], transactions: Transaction[], year: number, throughMonth = 12): Map<string, number> {
  const totals = new Map<string, number>();
  for (let m = 1; m <= throughMonth; m++) {
    const ym = `${year}-${String(m).padStart(2, '0')}`;
    const month = computeMonthEarnings(cards, transactions, ym);
    for (const entry of month.byCard) {
      totals.set(entry.card.id, (totals.get(entry.card.id) ?? 0) + entry.cashback);
    }
  }
  return totals;
}
