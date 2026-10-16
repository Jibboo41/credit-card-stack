import { useId } from 'react';
import type { ReactNode } from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  const id = useId();
  return (
    <label className="switch-row" htmlFor={id}>
      <span className="switch-text">
        <span className="title">{label}</span>
        {description && <span className="desc">{description}</span>}
      </span>
      <span className="switch">
        <input id={id} type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={e => onChange(e.target.checked)} />
        <span className="switch-track" />
      </span>
    </label>
  );
}
