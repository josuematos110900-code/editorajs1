import { useParams } from 'react-router-dom';
import { policies } from '../config/site';
import { useSeo } from '../lib/seo';
import NotFound from './NotFound';

export default function Policy() {
  const { slug } = useParams();
  const policy = policies.find((p) => p.slug === slug);
  useSeo({ title: policy?.title, description: policy?.body[0] });
  if (!policy) return <NotFound />;
  return (
    <article className="container-page max-w-3xl py-12 sm:py-16">
      <p className="eyebrow">Informações</p>
      <h1 className="t-h1 mt-3">{policy.title}</h1>
      <div className="prose-editorial mt-8 text-lg">
        {policy.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
    </article>
  );
}
