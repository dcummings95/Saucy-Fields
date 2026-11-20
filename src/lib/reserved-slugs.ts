/**
 * URLs that already belong to a built-in page or system route. Extra pages are
 * served at `/<slug>`, and Astro always prefers a fixed route over `[page].astro`,
 * so an Extra page with one of these slugs would never be shown.
 *
 * keystatic.config.ts uses RESERVED_SLUG_RE as the slug field's validation, so
 * the editor refuses these and the build-time reader fails loudly on a
 * hand-edited file that uses one. Add to this list whenever a new file lands
 * in src/pages/.
 */
export const RESERVED_SLUGS = [
  'index',
  'shop',
  'about',
  'services',
  'contact',
  'cart',
  'success',
  'canceled',
  '404',
  'api',
  'keystatic',
  'images',
  'sitemap-index',
] as const;

/** Lowercase-dashed slug that isn't one of RESERVED_SLUGS. */
export const RESERVED_SLUG_RE = new RegExp(
  `^(?!(?:${RESERVED_SLUGS.join('|')})$)[a-z0-9]+(?:-[a-z0-9]+)*$`,
);