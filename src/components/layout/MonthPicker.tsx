import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { currentYearMonth, formatMonth, pad2, shiftMonth } from '../../lib/format';
import { useFinanceStore } from '../../store/useFinanceStore';

export function MonthPicker() {
  const viewingMonth = useFinanceStore(s => s.viewingMonth);
  const setViewingMonth = useFinanceStore(s => s.setViewingMonth);
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => Number(viewingMonth.slice(0, 4)));
  const ref = useRef<HTMLDivElement>(null);
  const thisMonth = currentYearMonth();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const choose = (ym: string) => {
    setViewingMonth(ym);
    setOpen(false);
  };

  return (
    <div className="month-picker" ref={ref}>
      <button type="button" className="mp-step" onClick={() => setViewingMonth(shiftMonth(viewingMonth, -1))} aria-label="Previous month">
        <ChevronLeft size={16} />
      </button>
      <button
        type="button"
        className="mp-label"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setYear(Number(viewingMonth.slice(0, 4)));
          setOpen(o => !o);
        }}
      >
        {viewingMonth === thisMonth && <span className="mp-dot" aria-hidden="true" />}
        <span className="tabular">{formatMonth(viewingMonth, 'short')}</span>
        <ChevronDown size={14} className="subtle" />
      </button>
      <button type="button" className="mp-step" onClick={() => setViewingMonth(shiftMonth(viewingMonth, 1))} aria-label="Next month">
        <ChevronRight size={16} />
      </button>

      {open && (
        <div className="popover popover-right" role="dialog" aria-label="Choose month">
          <div className="mp-year">
            <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setYear(y => y - 1)} aria-label="Previous year"><ChevronLeft size={16} /></button>
            <span className="tabular">{year}</span>
            <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setYear(y => y + 1)} aria-label="Next year"><ChevronRight size={16} /></button>
          </div>
          <div className="mp-grid">
            {Array.from({ length: 12 }, (_, i) => {
              const ym = `${year}-${pad2(i + 1)}`;
              return (
                <button
                  key={ym}
                  type="button"
                  className={`mp-month${ym === viewingMonth ? ' selected' : ''}${ym === thisMonth ? ' current' : ''}`}
                  onClick={() => choose(ym)}
                  aria-current={ym === viewingMonth ? 'date' : undefined}
                >
                  {new Date(year, i, 1).toLocaleDateString('en-US', { month: 'short' })}
                </button>
              );
            })}
          </div>
          <div className="mp-footer">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => choose(thisMonth)}>Jump to this month</button>
          </div>
        </div>
      )}
    </div>
  );
}
