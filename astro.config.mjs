// @ts-check
import { defineConfig } from 'astro/config';
import { createReader } from '@keystatic/core/reader';
import { mkdirSync, writeFileSync } from 'node:fs';
import react from '@astrojs/react';
import keystatic from '@keystatic/astro';
import netlify from '@astrojs/netlify';
import keystaticConfig from './keystatic.config.ts';

/**
 * Writes `src/data/catalog.json` — a trimmed product + settings snapshot that the
 * on-demand checkout route (`/api/checkout`) imports statically. The route runs as
 * a serverless function where the Keystatic file reader isn't available, so it
 * relies on this bundled snapshot instead. Regenerated on every dev start / build,
 * so it's always as fresh as the last deploy.
 */
async function generateCatalog() {
  const reader = createReader(process.cwd(), keystaticConfig);
  const entries = await reader.collections.products.all();
  const products = entries.map(({ slug, entry }) => ({
    slug,
    name: entry.name,
    price: entry.price,
    status: entry.status,
    image: entry.images[0]?.src ?? '',
  }));
  const settings = await reader.singletons.siteSettings.read();
  mkdirSync('src/data', { recursive: true });
  writeFileSync(
    'src/data/catalog.json',
    JSON.stringify(
      {
        products,
        settings: {
          shippingFlatRate: settings?.shippingFlatRate ?? 0,
          location: settings?.location ?? { city: 'Winona', region: 'Minnesota', blurb: '' },
          email: settings?.email ?? '',
        },
      },
      null,
      2,
    ),
  );
}

function saucyCatalog() {
  return {
    name: 'saucy-catalog',
    hooks: {
      'astro:config:setup': generateCatalog,
      'astro:build:start': generateCatalog,
    },
  };
}

// The Netlify adapter spins up a full Netlify runtime emulation in `astro dev`
// (edge-function/Deno server, Blobs) which is noisy and needs Deno on PATH. We
// only need it for `astro build`, so skip it during local dev — on-demand routes
// (Keystatic admin, /api/checkout) still work in Astro's own dev server.
const isDev = process.argv.includes('dev');

export default defineConfig({
  site: 'https://www.saucyfields.com',
  adapter: isDev ? undefined : netlify(),
  integrations: [react(), keystatic(), saucyCatalog()],
  image: {
    domains: ['images.squarespace-cdn.com', 'static1.squarespace.com'],
  },
  vite: {
    optimizeDeps: {
      include: ['@keystatic/core', '@keystatic/astro'],
    },
  },
});
