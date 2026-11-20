import { createReader } from '@keystatic/core/reader';
import keystaticConfig, { SIZES } from '../../keystatic.config';

/**
 * Build-time content reader. Every Astro page pulls content through this.
 * In production with `KEYSTATIC_STORAGE_KIND=github`, edits committed via the
 * Keystatic admin land in the repo and the next deploy picks them up here.
 */
export const reader = createReader(process.cwd(), keystaticConfig);

export type ProductEntry = Awaited<ReturnType<typeof getProducts>>[number];

const STATUS_LABELS: Record<string, string> = {
  draft: 'Hidden',
  available: 'Available',
  presale: 'Pre-sale',
  soldout: 'Sold out',
};

const TYPE_LABELS: Record<string, string> = {
  shirt: 'Shirt',
  poster: 'Poster',
  other: 'Other',
};

type RawProduct = NonNullable<Awaited<ReturnType<typeof reader.collections.products.read>>>;

/** Hidden products are left out of every page, the sitemap and checkout. */
export const isPublished = (status: string) => status !== 'draft';

async function shapeProduct(slug: string, entry: RawProduct) {
  const description = await entry.description();
  // Ticked sizes in shop order (XS → 3XL), then any one-off sizes.
  const ticked = SIZES.filter((s) => entry.sizes.includes(s));
  return {
    slug,
    ...entry,
    // Who the design is for. Originals (no band) are credited to the shop.
    maker: entry.band.trim() || 'Saucy Fields',
    statusLabel: STATUS_LABELS[entry.status] ?? entry.status,
    typeLabel: TYPE_LABELS[entry.type] ?? entry.type,
    images: entry.images
      .filter((image) => image.src)
      .map((image) => ({ src: image.src!, alt: image.alt || entry.name })),
    sizes: [...ticked, ...entry.otherSizes.map((s) => s.trim()).filter(Boolean)],
    colors: entry.colors.map((c) => c.trim()).filter(Boolean),
    descriptionNode: description?.node ?? null,
  };
}

export async function getProducts() {
  const entries = await reader.collections.products.all();
  const products = await Promise.all(
    entries.filter((e) => isPublished(e.entry.status)).map((e) => shapeProduct(e.slug, e.entry)),
  );
  // Sold-out items sink to the bottom; otherwise newest first, then by name.
  return products.sort((a, b) => {
    const rank = (s: string) => (s === 'soldout' ? 1 : 0);
    return (
      rank(a.status) - rank(b.status) ||
      (b.added ?? '').localeCompare(a.added ?? '') ||
      a.name.localeCompare(b.name)
    );
  });
}

export async function getProduct(slug: string) {
  const entry = await reader.collections.products.read(slug);
  if (!entry || !isPublished(entry.status)) return null;
  return shapeProduct(slug, entry);
}

export async function getSiteSettings() {
  const settings = await reader.singletons.siteSettings.read();
  if (!settings) throw new Error('siteSettings singleton is missing');
  return settings;
}

export async function getHomepage() {
  const home = await reader.singletons.homepage.read();
  if (!home) throw new Error('homepage singleton is missing');
  return home;
}

export async function getAbout() {
  const about = await reader.singletons.about.read();
  if (!about) throw new Error('about singleton is missing');
  const story = await about.story();
  return { ...about, storyNode: story?.node ?? null };
}

export async function getServices() {
  const services = await reader.singletons.services.read();
  if (!services) throw new Error('services singleton is missing');
  const body = await services.body();
  return { ...services, bodyNode: body?.node ?? null };
}

export async function getShopPage() {
  const shop = await reader.singletons.shopPage.read();
  if (!shop) throw new Error('shopPage singleton is missing');
  return shop;
}

export async function getContactPage() {
  const contact = await reader.singletons.contactPage.read();
  if (!contact) throw new Error('contactPage singleton is missing');
  return contact;
}

export type PageEntry = NonNullable<Awaited<ReturnType<typeof getPage>>>;

export async function getPages() {
  const entries = await reader.collections.pages.all();
  return entries.map((entry) => ({ slug: entry.slug, ...entry.entry }));
}

export async function getPage(slug: string) {
  const entry = await reader.collections.pages.read(slug);
  if (!entry) return null;
  const content = await entry.content();
  return { slug, ...entry, contentNode: content?.node ?? null };
}
