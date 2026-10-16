import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import type { ToastTone } from '../../store/useFinanceStore';

const ICONS: Record<ToastTone, typeof Info> = {
  success: CircleCheck,
  error: CircleX,
  warn: TriangleAlert,
  info: Info,
};

export function Toasts() {
  const toasts = useFinanceStore(s => s.toasts);
  const dismissToast = useFinanceStore(s => s.dismissToast);
  return (
    <div className="toast-region" aria-live="polite">
      {toasts.map(toast => {
        const Icon = ICONS[toast.tone];
        return (
          <div key={toast.id} className={`toast ${toast.tone}`} role={toast.tone === 'error' ? 'alert' : 'status'}>
            <Icon size={18} aria-hidden="true" />
            <div className="toast-message">{toast.message}</div>
            <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => dismissToast(toast.id)} aria-label="Dismiss notification">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
