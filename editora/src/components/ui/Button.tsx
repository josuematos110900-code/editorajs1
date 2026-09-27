import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

/**
 * Hierarquia de botões:
 * - primary: a ação principal de cada ecrã (Comprar, Reservar, Finalizar compra) — no máximo uma por área.
 * - secondary: alternativa (Adicionar ao carrinho, Explorar catálogo).
 * - tertiary: ações discretas em texto (Ver todos, Saber mais).
 * - ghost: utilitários de interface (painel, filtros). danger: ações destrutivas.
 */
type Variant = 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap select-none';

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-hover',
  secondary: 'border border-secondary/80 bg-transparent text-fg hover:bg-secondary hover:text-background',
  tertiary: 'text-fg underline decoration-line-strong underline-offset-4 hover:text-primary hover:decoration-primary !px-0',
  ghost: 'text-fg/85 hover:bg-surface-alt hover:text-fg',
  danger: 'border border-danger/40 text-danger hover:bg-danger hover:text-white',
};

const sizes: Record<Size, string> = {
  sm: 'min-h-10 px-3.5 text-sm',
  md: 'min-h-11 px-5 text-[15px]',
  lg: 'min-h-12 px-7 text-base',
};

export function buttonClasses(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, type = 'button', ...props },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClasses(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
});

export function ButtonLink({ variant = 'primary', size = 'md', className, ...props }: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}
