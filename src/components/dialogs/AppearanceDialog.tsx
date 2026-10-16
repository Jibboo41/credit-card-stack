import { Check } from 'lucide-react';
import { THEMES } from '../../lib/themes';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useUiStore } from '../../store/useUiStore';
import { Modal } from '../ui/Modal';

export function AppearanceDialog() {
  const closeDialog = useUiStore(s => s.closeDialog);
  const theme = useFinanceStore(s => s.theme);
  const setTheme = useFinanceStore(s => s.setTheme);

  return (
    <Modal
      title="Appearance"
      subtitle="Choose an ambient theme for the application"
      onClose={closeDialog}
      size="md"
      footer={
        <>
          <span className="spacer" />
          <button type="button" className="btn btn-primary" onClick={closeDialog}>
            Done
          </button>
        </>
      }
    >
      <div className="theme-grid">
        {THEMES.map(t => {
          const isSelected = t.id === theme;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              className="theme-swatch"
              style={{ background: t.swatch }}
              aria-pressed={isSelected}
              onClick={() => setTheme(t.id)}
            >
              <Icon size={18} />
              <span>{t.label}</span>
              {isSelected && (
                <span className="check" aria-hidden="true">
                  <Check size={12} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
