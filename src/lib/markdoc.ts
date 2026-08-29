import Markdoc, { type RenderableTreeNode } from '@markdoc/markdoc';

/**
 * Render a Keystatic markdoc field's AST node to an HTML string.
 * The content is plain prose (headings, lists, links, emphasis) — no custom
 * Markdoc tags — so the built-in HTML renderer is enough.
 */
export function renderMarkdoc(node: unknown): string {
  if (!node) return '';
  const transformed = Markdoc.transform(node as Parameters<typeof Markdoc.transform>[0]);
  const html = Markdoc.renderers.html(transformed as RenderableTreeNode);
  // An empty document renders as an empty wrapper — treat that as "no content".
  return html.replace(/<article>\s*<\/article>/, '').trim();
}
