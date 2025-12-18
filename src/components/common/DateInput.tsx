import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { formatDate } from '../../utils/dateFormat';

type DateInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> & {
  value?: string | null;
  onValueChange?: (value: string) => void;
};

export default function DateInput({ value, onValueChange, className, ...rest }: DateInputProps) {
  const initial = (value ?? (rest as any).defaultValue ?? '') as string;
  const [internalValue, setInternalValue] = useState<string>(initial);

  useEffect(() => {
    if (value !== undefined && value !== null) {
      setInternalValue(String(value));
    }
  }, [value]);

  const effectiveValue = value !== undefined && value !== null ? String(value) : internalValue;

  const displayValue = useMemo(() => {
    if (!effectiveValue) return '';
    return formatDate(effectiveValue);
  }, [effectiveValue]);

  const placeholder = typeof rest.placeholder === 'string' ? rest.placeholder : undefined;
  const disabled = Boolean(rest.disabled);

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={displayValue}
        readOnly
        className={className}
        placeholder={placeholder}
        aria-disabled={disabled}
        tabIndex={-1}
      />
      <input
        {...rest}
        type="date"
        value={effectiveValue}
        onChange={(e) => {
          const next = e.target.value;
          if (value === undefined || value === null) {
            setInternalValue(next);
          }
          onValueChange?.(next);
          rest.onChange?.(e);
        }}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0,
          width: '100%',
          height: '100%',
          cursor: 'pointer',
        }}
      />
    </div>
  );
}
