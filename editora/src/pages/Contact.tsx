import { Clock, Mail, MapPin, Phone, PenLine } from 'lucide-react';
import { site } from '../config/site';
import { useSeo } from '../lib/seo';

export default function Contact() {
  useSeo({ title: 'Contacto', description: `Fale com a ${site.name}: encomendas, pré-vendas, livrarias e propostas de publicação.` });

  const items = [
    { icon: Mail, label: 'E-mail', value: site.contacts.email, href: `mailto:${site.contacts.email}`, note: 'Encomendas, pré-vendas e informações gerais.' },
    { icon: Phone, label: 'Telefone', value: site.contacts.phone, href: `tel:${site.contacts.phone.replace(/\s/g, '')}`, note: site.contacts.hours },
    { icon: PenLine, label: 'Propostas de publicação', value: site.contacts.manuscripts, href: `mailto:${site.contacts.manuscripts}`, note: 'Sinopse, capítulo de amostra e nota biográfica.' },
    { icon: MapPin, label: 'Morada', value: site.contacts.address, note: 'Levantamento de encomendas mediante aviso.' },
  ];

  return (
    <div className="page">
      <p className="eyebrow">Contacto</p>
      <h1 className="t-h1 mt-3 max-w-2xl">Estamos aqui para ajudar.</h1>
      <p className="t-lead mt-4 max-w-prose">Dúvidas sobre uma encomenda ou pré-venda? Indique sempre o número da encomenda (ex.: ED-260927-ABC12) para respondermos mais depressa.</p>

      <ul className="mt-12 grid gap-4 sm:grid-cols-2">
        {items.map(({ icon: Icon, label, value, href, note }) => (
          <li key={label} className="card flex gap-4 p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary" aria-hidden="true">
              <Icon size={19} />
            </span>
            <div className="min-w-0">
              <p className="t-caption">{label}</p>
              {href ? (
                <a href={href} className="mt-1 inline-block break-words py-1.5 font-display text-xl text-fg underline decoration-line-strong underline-offset-4 hover:decoration-primary">
                  {value}
                </a>
              ) : (
                <p className="mt-1 font-display text-xl text-fg">{value}</p>
              )}
              <p className="mt-1 t-small text-muted">{note}</p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-8 flex items-center gap-2 t-small text-muted">
        <Clock size={15} aria-hidden="true" /> Respondemos em até 2 dias úteis.
      </p>
    </div>
  );
}
