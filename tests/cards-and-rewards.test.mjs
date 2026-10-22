import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { createServer } from 'vite';

const server = await createServer({
  configFile: false,
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: 'custom',
});
after(() => server.close());
const { sortCardsByBalanceAndRecentUse } = await server.ssrLoadModule('/src/lib/cardSorting.ts');
const { computeMonthEarnings, getResolvedTransaction } = await server.ssrLoadModule('/src/lib/cashback.ts');

const card = (id, currentBalance = 0, extra = {}) => ({
  id, name: id, monarchId: `account-${id}`, currentBalance,
  isAirlineCard: false, isHotelCard: false, noForeignTxFee: false,
  categories: ['Restaurants'], cashback: { Restaurants: 4 }, baseCashback: 1,
  ...extra,
});
const tx = (id, cardId, date, amount = -100, extra = {}) => ({
  id, monarchAccountId: `account-${cardId}`, date, amount,
  merchantName: id, category: 'Restaurants', ...extra,
});

test('balance owed takes precedence over recency and follows Monarch balance signs', () => {
  const cards = [card('paid-off'), card('small', -20), card('large', -500), card('credit', 10)];
  const transactions = [tx('recent', 'paid-off', '2026-10-22'), tx('old', 'large', '2026-01-01')];
  assert.deepEqual(sortCardsByBalanceAndRecentUse(cards, transactions).map(c => c.id), ['large', 'small', 'paid-off', 'credit']);
  assert.deepEqual(cards.map(c => c.id), ['paid-off', 'small', 'large', 'credit']);
});

test('paid-off cards are ordered by their latest purchase across all months', () => {
  const cards = [card('unused'), card('old'), card('recent')];
  const transactions = [tx('newer', 'recent', '2026-09-30'), tx('older', 'old', '2025-10-01')];
  assert.deepEqual(sortCardsByBalanceAndRecentUse(cards, transactions).map(c => c.id), ['recent', 'old', 'unused']);
});

test('equal nonzero balances also use recency, while unlinked cards have no usage', () => {
  const cards = [card('old', -50), card('unlinked', -50, { monarchId: undefined }), card('recent', -50)];
  const transactions = [tx('old', 'old', '2026-08-01'), tx('new', 'recent', '2026-09-01')];
  assert.deepEqual(sortCardsByBalanceAndRecentUse(cards, transactions).map(c => c.id), ['recent', 'old', 'unlinked']);
});

test('payments, transfers, refunds, and sync timestamps do not count as card use', () => {
  const cards = [card('old', 0, { lastSyncedAt: '2026-10-22T12:00:00Z' }), card('recent')];
  const transactions = [
    tx('old-purchase', 'old', '2026-01-01'),
    tx('new-purchase', 'recent', '2026-09-01', -50, { excludeFromCashback: true }),
    tx('payment', 'old', '2026-10-22', 200, { originalCategory: 'Credit Card Payment' }),
    tx('transfer', 'old', '2026-10-22', -200, { isTransfer: true }),
    tx('legacy-transfer', 'old', '2026-10-22', -200, { originalCategory: 'Transfer' }),
    tx('refund', 'old', '2026-10-22', 20),
  ];
  assert.deepEqual(sortCardsByBalanceAndRecentUse(cards, transactions).map(c => c.id), ['recent', 'old']);
});

test('missing balances and usage have a deterministic fallback', () => {
  const cards = [card('z', undefined, { name: 'Same', currentBalance: undefined }), card('b', 0, { name: 'Same' }), card('a')];
  assert.deepEqual(sortCardsByBalanceAndRecentUse(cards, []).map(c => c.id), ['a', 'b', 'z']);
});

test('rewards drill-downs contain exactly the transactions behind each total', () => {
  const cards = [card('one', -100, { historicalCashback: { '2026-10': { Restaurants: 5 } } }), card('two')];
  const transactions = [
    tx('purchase', 'one', '2026-10-01', -100),
    tx('refund', 'one', '2026-10-04', 20),
    tx('other-category', 'one', '2026-10-05', -40, { category: 'Gas' }),
    tx('other-card', 'two', '2026-10-05', -50),
    tx('other-month', 'one', '2026-09-30', -1000),
    tx('excluded', 'one', '2026-10-05', -1000, { excludeFromCashback: true }),
    tx('payment', 'one', '2026-10-05', 1000, { isTransfer: true }),
  ];
  const earnings = computeMonthEarnings(cards, transactions, '2026-10');
  const category = earnings.byCard.find(c => c.card.id === 'one').categories.find(c => c.category === 'Restaurants');
  assert.deepEqual(category.transactions.map(t => t.id), ['refund', 'purchase']);
  assert.equal(category.spend, 80);
  assert.equal(category.cashback, 4);
  assert.equal(category.rate, 5);
  assert.equal(category.transactions.reduce((sum, t) => sum - t.amount, 0), category.spend);
  assert.equal(category.transactions.reduce((sum, t) => sum - t.amount * category.rate / 100, 0), category.cashback);
  assert.strictEqual(earnings.byCategory.Restaurants.find(e => e.card.id === 'one').transactions, category.transactions);
});

test('manual overrides and unknown categories stay consistent in rewards drill-downs', () => {
  const cards = [card('one')];
  const transactions = [
    tx('edited', 'one', '2026-09-01', -999, {
      manualDate: '2026-10-01', manualAmount: -40, manualCategory: 'Gas', manualMerchantName: 'Edited merchant',
    }),
    tx('unknown', 'one', '2026-10-02', -20, { category: 'Legacy category' }),
  ].map(getResolvedTransaction);
  const earnings = computeMonthEarnings(cards, transactions, '2026-10');
  const gas = earnings.byCategory.Gas[0];
  assert.equal(gas.spend, 40);
  assert.equal(gas.transactions[0].merchantName, 'Edited merchant');
  assert.equal(earnings.byCategory.Other[0].transactions[0].id, 'unknown');
  assert.equal(earnings.totalSpend, 60);
});
