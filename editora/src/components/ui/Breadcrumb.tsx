import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/** Mostra onde o utilizador está e permite voltar um nível. */
export function Breadcrumb({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Caminho" className="mb-8 t-small text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={14} aria-hidden="true" className="text-line-strong" />}
            {item.to ? (
              <Link to={item.to} className="-my-2 inline-flex min-h-10 items-center hover:text-fg hover:underline hover:underline-offset-4">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-fg">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
