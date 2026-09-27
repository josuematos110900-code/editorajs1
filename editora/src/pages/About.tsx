import { ArrowRight } from 'lucide-react';
import { ButtonLink } from '../components/ui/Button';
import { site } from '../config/site';
import { useCatalog } from '../context/CatalogContext';
import { useSeo } from '../lib/seo';

export default function About() {
  const { books, authors } = useCatalog();
  useSeo({ title: 'Sobre nós', description: site.about.intro });

  return (
    <div className="page">
      <header className="grid gap-10 border-b border-line pb-14 lg:grid-cols-[1.3fr_1fr] lg:items-end">
        <div>
          <p className="eyebrow">Sobre nós</p>
          <h1 className="t-display mt-4 max-w-3xl">{site.about.title}</h1>
        </div>
        <p className="t-lead max-w-prose">{site.about.intro}</p>
      </header>

      <dl className="grid grid-cols-2 gap-6 border-b border-line py-10 sm:grid-cols-3">
        <Stat label="Títulos no catálogo" value={books.length} />
        <Stat label="Autores publicados" value={authors.length} />
        <Stat label="Sede" value="Luanda" className="col-span-2 sm:col-span-1" />
      </dl>

      <div className="section !mt-14 grid gap-12 md:grid-cols-3">
        {site.about.sections.map((s, i) => (
          <section key={s.title} aria-labelledby={`sobre-${i}`}>
            <p className="font-display text-sm text-primary">0{i + 1}</p>
            <h2 id={`sobre-${i}`} className="t-h3 mt-2">{s.title}</h2>
            <p className="mt-3 text-muted">{s.body}</p>
          </section>
        ))}
      </div>

      <div className="section flex flex-col items-start gap-4 rounded-card bg-surface-alt p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
        <div>
          <h2 className="t-h3">Tem um livro para publicar?</h2>
          <p className="mt-1 text-muted">Envie a proposta para {site.contacts.manuscripts}.</p>
        </div>
        <ButtonLink to="/contacto" variant="secondary">
          Falar connosco <ArrowRight size={16} aria-hidden="true" />
        </ButtonLink>
      </div>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <div className={className}>
      <dt className="t-caption">{label}</dt>
      <dd className="mt-2 font-display text-4xl text-fg">{value}</dd>
    </div>
  );
}
