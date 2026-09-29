import type { MarkdownInstance } from 'astro';

export type SeriesDocument = {
  slug: string;
  title: string;
  summary?: string;
  order: number;
  version?: string;
  effectiveDate?: string;
  href: string;
  markdown: MarkdownInstance<Record<string, unknown>>;
};

const documentModules = import.meta.glob<MarkdownInstance<Record<string, unknown>>>(
  '../../series/*/documents/*.md', { eager: true },
);

function readDocument(path: string, markdown: SeriesDocument['markdown']): SeriesDocument {
  const seriesSlug = path.split('/').at(-3)!;
  const slug = path.split('/').at(-1)!.slice(0, -3);
  const metadata = markdown.frontmatter;
  const fail = (field: string): never => {
    throw new Error(`Invalid document ${field}: ${path}`);
  };
  const text = (field: string, required = false): string | undefined => {
    const value = metadata[field];
    if (value === undefined && !required) return undefined;
    if (typeof value !== 'string' || !value.trim()) return fail(field);
    return value.trim();
  };
  const title = text('title', true)!;
  const summary = text('summary');
  const version = text('version');
  const effectiveDate = text('effectiveDate');
  const order = metadata.order === undefined ? 0 : metadata.order;
  if (typeof order !== 'number' || !Number.isFinite(order)) fail('order');
  if (effectiveDate && (
    !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)
    || !Number.isFinite(Date.parse(effectiveDate))
    || new Date(effectiveDate).toISOString().slice(0, 10) !== effectiveDate
  )) fail('effectiveDate (expected YYYY-MM-DD)');

  return {
    slug, title, summary, order: order as number, version, effectiveDate,
    href: `/racing/${encodeURIComponent(seriesSlug)}/documents/${encodeURIComponent(slug)}`,
    markdown,
  };
}

export function getSeriesDocuments(seriesSlug: string): SeriesDocument[] {
  const prefix = `../../series/${seriesSlug}/documents/`;
  return Object.entries(documentModules)
    .filter(([path]) => path.startsWith(prefix))
    .map(([path, markdown]) => readDocument(path, markdown))
    .sort((a, b) => a.order - b.order || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
}
