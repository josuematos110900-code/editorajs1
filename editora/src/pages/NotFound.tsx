import { ButtonLink } from '../components/ui/Button';
import { useSeo } from '../lib/seo';

export default function NotFound() {
  useSeo({ title: 'Página não encontrada', noindex: true });
  return (
    <div className="container-page py-24 text-center">
      <p className="eyebrow">Erro 404</p>
      <h1 className="t-h1 mt-4">Esta página saiu de circulação.</h1>
      <p className="mx-auto mt-4 max-w-md text-muted">O endereço pode estar errado ou o livro já não estar disponível.</p>
      <div className="mt-8 flex justify-center gap-3">
        <ButtonLink to="/">Página inicial</ButtonLink>
        <ButtonLink to="/livros" variant="secondary">Catálogo</ButtonLink>
      </div>
    </div>
  );
}
