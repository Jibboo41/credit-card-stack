import { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';

interface SyncLogsModalProps {
  onClose: () => void;
}

export default function SyncLogsModal({ onClose }: SyncLogsModalProps) {
  const { syncLogs } = useFinanceStore();
  const [expandedSection, setExpandedSection] = useState<{ logId: string, section: 'accounts' | 'fetched' | 'categorized' | 'orphans' } | null>(null);

  const toggleSection = (logId: string, section: 'accounts' | 'fetched' | 'categorized' | 'orphans') => {
    if (expandedSection?.logId === logId && expandedSection?.section === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection({ logId, section });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 size={18} color="var(--sys-green)" />;
      case 'partial':
        return <AlertTriangle size={18} color="var(--sys-yellow)" />;
      case 'error':
        return <AlertCircle size={18} color="var(--sys-red)" />;
      default:
        return <Clock size={18} color="var(--sys-label-secondary)" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'Success';
      case 'partial':
        return 'Partial Success';
      case 'error':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 12000 }}>
      <div className="modal-sheet" style={{ maxWidth: '600px', width: '90%' }} onClick={e => e.stopPropagation()}>
        <div className="modal-pull-indicator" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: '#fff' }}>Sync Logs</h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '16px', padding: '8px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
          {syncLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--sys-label-secondary)' }}>
              No sync logs available yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {syncLogs.map(log => (
                <div key={log.id} style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  padding: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {getStatusIcon(log.status)}
                      <span style={{ fontWeight: 600, color: '#fff' }}>{getStatusText(log.status)}</span>
                    </div>
                    <span style={{ color: 'var(--sys-label-secondary)', fontSize: '13px' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '14px' }}>
                    <div 
                      onClick={() => toggleSection(log.id, 'accounts')}
                      style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer', background: expandedSection?.logId === log.id && expandedSection.section === 'accounts' ? 'rgba(255,255,255,0.05)' : 'transparent', padding: '8px', borderRadius: '8px', margin: '-8px' }}>
                      <span style={{ color: 'var(--sys-label-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Accounts Synced
                        {log.accountsSyncedDetails && log.accountsSyncedDetails.length > 0 && (expandedSection?.logId === log.id && expandedSection.section === 'accounts' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
                      </span>
                      <span style={{ color: '#fff', fontWeight: 500 }}>{log.accountsSynced}</span>
                    </div>
                    <div 
                      onClick={() => toggleSection(log.id, 'fetched')}
                      style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer', background: expandedSection?.logId === log.id && expandedSection.section === 'fetched' ? 'rgba(255,255,255,0.05)' : 'transparent', padding: '8px', borderRadius: '8px', margin: '-8px' }}>
                      <span style={{ color: 'var(--sys-label-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Transactions Fetched
                        {log.transactionsFetchedDetails && log.transactionsFetchedDetails.length > 0 && (expandedSection?.logId === log.id && expandedSection.section === 'fetched' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
                      </span>
                      <span style={{ color: '#fff', fontWeight: 500 }}>{log.transactionsFetched}</span>
                    </div>
                    <div 
                      onClick={() => toggleSection(log.id, 'categorized')}
                      style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer', background: expandedSection?.logId === log.id && expandedSection.section === 'categorized' ? 'rgba(255,255,255,0.05)' : 'transparent', padding: '8px', borderRadius: '8px', margin: '-8px' }}>
                      <span style={{ color: 'var(--sys-label-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Categorized (AI)
                        {log.transactionsCategorizedDetails && log.transactionsCategorizedDetails.length > 0 && (expandedSection?.logId === log.id && expandedSection.section === 'categorized' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
                      </span>
                      <span style={{ color: '#fff', fontWeight: 500 }}>{log.transactionsCategorized}</span>
                    </div>
                    <div 
                      onClick={() => toggleSection(log.id, 'orphans')}
                      style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer', background: expandedSection?.logId === log.id && expandedSection.section === 'orphans' ? 'rgba(255,255,255,0.05)' : 'transparent', padding: '8px', borderRadius: '8px', margin: '-8px' }}>
                      <span style={{ color: 'var(--sys-label-secondary)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Orphans Deleted
                        {log.orphansDeletedDetails && log.orphansDeletedDetails.length > 0 && (expandedSection?.logId === log.id && expandedSection.section === 'orphans' ? <ChevronUp size={12}/> : <ChevronDown size={12}/>)}
                      </span>
                      <span style={{ color: '#fff', fontWeight: 500 }}>{log.orphansDeleted}</span>
                    </div>
                  </div>

                  {expandedSection?.logId === log.id && (
                    <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', fontSize: '12px', color: '#ccc', maxHeight: '200px', overflowY: 'auto' }}>
                      {expandedSection.section === 'accounts' && (
                        log.accountsSyncedDetails?.length ? log.accountsSyncedDetails.map((d, i) => <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{d}</div>) : 'No details available.'
                      )}
                      {expandedSection.section === 'fetched' && (
                        log.transactionsFetchedDetails?.length ? log.transactionsFetchedDetails.map((d, i) => <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{d}</div>) : 'No details available.'
                      )}
                      {expandedSection.section === 'categorized' && (
                        log.transactionsCategorizedDetails?.length ? log.transactionsCategorizedDetails.map((d, i) => <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{d}</div>) : 'No details available.'
                      )}
                      {expandedSection.section === 'orphans' && (
                        log.orphansDeletedDetails?.length ? log.orphansDeletedDetails.map((d, i) => <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{d}</div>) : 'No details available.'
                      )}
                    </div>
                  )}

                  {log.errorDetails && (
                    <div style={{
                      marginTop: '12px',
                      padding: '12px',
                      background: 'rgba(255, 69, 58, 0.1)',
                      borderRadius: '8px',
                      color: 'var(--sys-red)',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      wordBreak: 'break-word'
                    }}>
                      {log.errorDetails}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
