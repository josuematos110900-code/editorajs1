import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode;
}

/** Campo acessível: label associado, erro anunciado e ligado por aria-describedby. */
export function Field({ label, error, hint, required, className, children }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-medium text-ink-800">
        {label}
        {required && <span className="text-seal-700" aria-hidden="true"> *</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-seal-700">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-ink-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type Common = { label: string; error?: string; hint?: string; className?: string };

export function TextField({ label, error, hint, className, required, ...props }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(a11y) => <input className="input" required={required} {...a11y} {...props} />}
    </Field>
  );
}

export function TextAreaField({ label, error, hint, className, required, ...props }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(a11y) => <textarea className="input min-h-28" required={required} {...a11y} {...props} />}
    </Field>
  );
}

export function SelectField({
  label,
  error,
  hint,
  className,
  required,
  children,
  ...props
}: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={className}>
      {(a11y) => (
        <select className="input pr-8" required={required} {...a11y} {...props}>
          {children}
        </select>
      )}
    </Field>
  );
}

export function Checkbox({ label, className, ...props }: { label: ReactNode; className?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3 text-sm text-ink-700', className)}>
      <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-ink-300 accent-seal-700" {...props} />
      <span>{label}</span>
    </label>
  );
}
