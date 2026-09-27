import { useEffect } from 'react';
import { site } from '../config/site';

interface SeoOptions {
  title?: string;
  description?: string;
  image?: string | null;
  path?: string;
  type?: 'website' | 'book' | 'profile';
  jsonLd?: Record<string, unknown>;
  noindex?: boolean;
}

export const appUrl = ((import.meta.env.VITE_APP_URL as string | undefined) || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');

export function absoluteUrl(path: string) {
  if (/^https?:|^data:/.test(path)) return path;
  return `${appUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
}

/** Title, description, canonical, Open Graph, Twitter e JSON-LD por página. */
export function useSeo({ title, description, image, path, type = 'website', jsonLd, noindex }: SeoOptions) {
  const jsonLdString = jsonLd ? JSON.stringify(jsonLd) : '';
  useEffect(() => {
    const fullTitle = title ? `${title} · ${site.name}` : `${site.name} — ${site.tagline}`;
    const desc = (description || site.description).slice(0, 160);
    const img = absoluteUrl(image && !image.startsWith('data:') ? image : '/og-default.svg');
    const url = absoluteUrl(path ?? window.location.pathname);

    document.title = fullTitle;
    setMeta('name', 'description', desc);
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', desc);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:image', img);
    setMeta('property', 'og:site_name', site.name);
    setMeta('property', 'og:locale', 'pt_AO');
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', desc);
    setMeta('name', 'twitter:image', img);
    setLink('canonical', url);

    const scriptId = 'jsonld-page';
    document.getElementById(scriptId)?.remove();
    if (jsonLdString) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      script.textContent = jsonLdString;
      document.head.appendChild(script);
    }
  }, [title, description, image, path, type, jsonLdString, noindex]);
}
