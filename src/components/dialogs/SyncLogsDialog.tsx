import { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useUiStore } from '../../store/useUiStore';
import { formatDateTime } from '../../lib/format';
import { Modal } from '../ui/Modal';
import { EmptyState } from '../ui/EmptyState';

export function SyncLogsDialog() {
  const closeDialog = useUiStore(s => s.closeDialog);
  const syncLogs = useFinanceStore(s => s.syncLogs);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <span className="badge badge-good"><CheckCircle2 size={12} /> Success</span>;
      case 'partial':
        return <span className="badge badge-warn"><AlertTriangle size={12} /> Partial</span>;
      case 'error':
        return <span className="badge badge-bad"><AlertCircle size={12} /> Failed</span>;
      default:
        return <span className="badge"><Clock size={12} /> Unknown</span>;
    }
  };

  return (
    <Modal
      title="Monarch Sync Logs"
      subtitle="History of background synchronization runs"
      onClose={closeDialog}
      size="lg"
      footer={
        <>
          <span className="spacer" />
          <button type="button" className="btn btn-primary" onClick={closeDialog}>
            Close
          </button>
        </>
      }
    >
      {syncLogs.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No sync history"
          description="Sync operations and error diagnostics will appear here once triggered."
        />
      ) : (
        <div className="list">
          {syncLogs.map(log => {
            const isExpanded = expandedLogId === log.id;
            return (
              <div key={log.id} className="log-entry">
                <div
                  className="log-head"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                >
                  {getStatusBadge(log.status)}
                  <span className="tabular" style={{ fontSize: '13px', fontWeight: 600 }}>
                    {formatDateTime(log.timestamp)}
                  </span>
                  <span className="spacer" style={{ flex: 1 }} />
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>

                <div className="log-stats">
                  <div className="log-stat">
                    <div className="v">{log.accountsSynced ?? 0}</div>
                    <div className="l">Accounts</div>
                  </div>
                  <div className="log-stat">
                    <div className="v">{log.transactionsFetched ?? 0}</div>
                    <div className="l">Transactions</div>
                  </div>
                  {log.recurringSynced !== undefined && (
                    <div className="log-stat">
                      <div className="v">{log.recurringSynced}</div>
                      <div className="l">Recurring</div>
                    </div>
                  )}
                  {log.orphansDeleted !== undefined && log.orphansDeleted > 0 && (
                    <div className="log-stat">
                      <div className="v" style={{ color: 'var(--orange)' }}>{log.orphansDeleted}</div>
                      <div className="l">Orphans Cleaned</div>
                    </div>
                  )}
                </div>

                {isExpanded && log.errorDetails && (
                  <div className="log-error">
                    {log.errorDetails}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
