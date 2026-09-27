import { Link } from 'react-router-dom';
import { policies, site } from '../../config/site';
import { demoMode } from '../../data';
import { NewsletterForm } from '../NewsletterForm';
import { Logo } from './Header';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-ink-100 bg-ink-950 text-paper-200">
      <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-sm">
          <div className="rounded-md bg-paper px-3 py-2 inline-block">
            <Logo />
          </div>
          <p className="mt-5 text-sm leading-relaxed text-ink-300">{site.description}</p>
          <div className="mt-6">
            <p className="mb-2 text-sm font-semibold text-paper-50">{site.texts.newsletterTitle}</p>
            <NewsletterForm tone="dark" />
          </div>
        </div>
        <FooterColumn title="Livraria">
          <FooterLink to="/pre-venda">Pré-venda</FooterLink>
          <FooterLink to="/livros">Catálogo</FooterLink>
          <FooterLink to="/autores">Autores</FooterLink>
          <FooterLink to="/carrinho">Carrinho</FooterLink>
          <FooterLink to="/conta">A minha conta</FooterLink>
        </FooterColumn>
        <FooterColumn title="Informações">
          {policies.map((p) => (
            <FooterLink key={p.slug} to={`/informacoes/${p.slug}`}>
              {p.title}
            </FooterLink>
          ))}
        </FooterColumn>
        <FooterColumn title="Contactos">
          <li>
            <a className="hover:text-paper-50" href={`mailto:${site.contacts.email}`}>
              {site.contacts.email}
            </a>
          </li>
          <li>
            <a className="hover:text-paper-50" href={`tel:${site.contacts.phone.replace(/\s/g, '')}`}>
              {site.contacts.phone}
            </a>
          </li>
          <li>{site.contacts.address}</li>
          <li>{site.contacts.hours}</li>
          <li className="flex flex-wrap gap-x-4 gap-y-1 pt-2">
            {site.social.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-paper-50">
                {s.label}
              </a>
            ))}
          </li>
        </FooterColumn>
      </div>
      <div className="border-t border-ink-800">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-ink-400 sm:flex-row sm:justify-between">
          <p>
            © {year} {site.name}. Todos os direitos reservados.
          </p>
          {demoMode && <p>Modo demonstração — livros, autores e contactos são fictícios.</p>}
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-body text-xs font-semibold uppercase tracking-[0.18em] text-paper-50">{title}</h2>
      <ul className="mt-4 space-y-2.5 text-sm text-ink-300">{children}</ul>
    </div>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      <Link to={to} className="hover:text-paper-50">
        {children}
      </Link>
    </li>
  );
}
