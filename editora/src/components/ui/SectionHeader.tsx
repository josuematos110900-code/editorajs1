import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/** Cabeçalho de secção partilhado: eyebrow, título e ação terciária «Ver todos». */
export function SectionHeader({ id, eyebrow, title, description, link }: { id: string; eyebrow?: string; title: string; description?: string; link?: { to: string; label: string } }) {
  return (
    <div className="mb-10 flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 id={id} className="t-h2 mt-2">
          {title}
        </h2>
        {description && <p className="mt-2 text-muted">{description}</p>}
      </div>
      {link && (
        <Link to={link.to} className="group -my-2 inline-flex min-h-11 shrink-0 items-center gap-1.5 t-small font-semibold text-fg hover:text-primary">
          {link.label} <ArrowRight size={15} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
