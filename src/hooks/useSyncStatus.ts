import { useMemo } from 'react';
import type { SyncLog } from '../core/models';
import { timeAgo } from '../lib/format';
import { useFinanceStore } from '../store/useFinanceStore';
import { useNow } from './useNow';

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncedAt: number | null;
  lastLog?: SyncLog;
  tone: 'good' | 'warn' | 'bad' | 'neutral';
  label: string;
}

const STALE_AFTER_MS = 2 * 24 * 60 * 60 * 1000;

export function useSyncStatus(): SyncStatus {
  const cards = useFinanceStore(s => s.creditCards);
  const logs = useFinanceStore(s => s.syncLogs);
  const isSyncing = useFinanceStore(s => s.isSyncing);
  const now = useNow();

  const lastCardSync = useMemo(() => {
    let latest = 0;
    for (const card of cards) {
      const t = card.lastSyncedAt ? Date.parse(card.lastSyncedAt) : NaN;
      if (!Number.isNaN(t) && t > latest) latest = t;
    }
    return latest;
  }, [cards]);

  const lastLog = logs[0];
  const lastLogTime = lastLog && lastLog.status !== 'error' ? Date.parse(lastLog.timestamp) : NaN;
  const latest = Math.max(lastCardSync, Number.isNaN(lastLogTime) ? 0 : lastLogTime);
  const lastSyncedAt = latest > 0 ? latest : null;

  let tone: SyncStatus['tone'] = lastSyncedAt ? 'good' : 'neutral';
  if (lastSyncedAt && now - lastSyncedAt > STALE_AFTER_MS) tone = 'warn';
  if (lastLog?.status === 'partial') tone = 'warn';
  if (lastLog?.status === 'error') tone = 'bad';

  let label = lastSyncedAt ? `Synced ${timeAgo(lastSyncedAt)}` : 'Not synced yet';
  if (isSyncing) label = 'Syncing with Monarch…';
  else if (lastLog?.status === 'error') label = `Last sync failed ${timeAgo(lastLog.timestamp)}`;

  return { isSyncing, lastSyncedAt, lastLog, tone, label };
}
