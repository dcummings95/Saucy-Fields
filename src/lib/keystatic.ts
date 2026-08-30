import { createReader } from '@keystatic/core/reader';
import keystaticConfig from '../../keystatic.config';

/**
 * Build-time content reader. Every Astro page pulls content through this.
 * In production with `KEYSTATIC_STORAGE_KIND=github`, edits committed via the
 * Keystatic admin land in the repo and the next deploy picks them up here.
 */
export const reader = createReader(process.cwd(), keystaticConfig);

export type ProductEntry = Awaited<ReturnType<typeof getProducts>>[number];

const STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  presale: 'Pre-sale',
  soldout: 'Sold out',
};

const TYPE_LABELS: Record<string, string> = {
  shirt: 'Shirt',
  poster: 'Poster',
  other: 'Other',
};

export async function getProducts() {
  const entries = await reader.collections.products.all();
  const products = await Promise.all(
    entries.map(async (entry) => {
      const description = await entry.entry.description();
      return {
        slug: entry.slug,
        ...entry.entry,
        // Who the design is for. Originals (no band) are credited to the shop.
        maker: entry.entry.band || 'Saucy Fields',
        statusLabel: STATUS_LABELS[entry.entry.status] ?? entry.entry.status,
        typeLabel: TYPE_LABELS[entry.entry.type] ?? entry.entry.type,
        images: entry.entry.images.map((image) => ({
          src: image.src ?? '',
          alt: image.alt || entry.entry.name,
        })),
        sizes: [...entry.entry.sizes],
        colors: [...entry.entry.colors],
        descriptionNode: description?.node ?? null,
      };
    }),
  );
  // Sold-out items sink to the bottom; otherwise keep a stable name order.
  return products.sort((a, b) => {
    const rank = (s: string) => (s === 'soldout' ? 1 : 0);
    return rank(a.status) - rank(b.status) || a.name.localeCompare(b.name);
  });
}

export async function getProduct(slug: string) {
  const entry = await reader.collections.products.read(slug);
  if (!entry) return null;
  const description = await entry.description();
  return {
    slug,
    ...entry,
    maker: entry.band || 'Saucy Fields',
    statusLabel: STATUS_LABELS[entry.status] ?? entry.status,
    typeLabel: TYPE_LABELS[entry.type] ?? entry.type,
    images: entry.images.map((image) => ({
      src: image.src ?? '',
      alt: image.alt || entry.name,
    })),
    sizes: [...entry.sizes],
    colors: [...entry.colors],
    descriptionNode: description?.node ?? null,
  };
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

export async function getPages() {
  const entries = await reader.collections.pages.all();
  return Promise.all(
    entries.map(async (entry) => {
      const content = await entry.entry.content();
      return {
        slug: entry.slug,
        ...entry.entry,
        contentNode: content?.node ?? null,
      };
    }),
  );
}

export async function getPage(slug: string) {
  const entry = await reader.collections.pages.read(slug);
  if (!entry) return null;
  const content = await entry.content();
  return { slug, ...entry, contentNode: content?.node ?? null };
}
