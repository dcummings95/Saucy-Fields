// @ts-check
import { defineConfig, envField } from 'astro/config';
import { createReader } from '@keystatic/core/reader';
import { mkdirSync, writeFileSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';
import cloudflare from '@astrojs/cloudflare';
import node from '@astrojs/node';
import keystaticConfig from './keystatic.config.ts';

/**
 * Writes `src/data/catalog.json` — a trimmed product + settings snapshot that the
 * on-demand routes (`/api/checkout`, `/api/contact`) import statically. Those run
 * on the edge where the Keystatic file reader isn't available, so they rely on
 * this bundled snapshot instead. Regenerated on every dev start / build, so it's
 * always as fresh as the last deploy.
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

// Keep in sync with IMG_WIDTHS in src/lib/img.ts.
const IMG_WIDTHS = [400, 800, 1600, 2600];

/**
 * Post-build image squeeze. Keystatic writes uploads straight into
 * `public/images/**` as full-size JPG/PNG, and Astro's `<Image>` pipeline never
 * touches `public/`. So after the build we walk the emitted `dist/images/**`:
 * cap the original raster at 2600px and re-encode it (this stays the `<img>`
 * fallback), then emit `name-<width>.webp` variants that `CmsImage.astro` and
 * the product gallery point a `<source srcset>` at. Only `dist/` is touched —
 * the source files the CMS manages are left alone.
 */
async function optimizeBuiltImages(distDir, logger) {
  const root = path.join(distDir, 'images');
  if (!existsSync(root)) return;

  const files = readdirSync(root, { recursive: true })
    .map((entry) => path.join(root, entry.toString()))
    .filter((file) => /\.(jpe?g|png)$/i.test(file));

  let saved = 0;
  for (const file of files) {
    const input = readFileSync(file);
    const isPng = /\.png$/i.test(file);
    const from = () => sharp(input, { failOn: 'none' }).rotate();

    // Re-encode the original in place, capped at the largest width.
    let raster = from().resize(2600, 2600, { fit: 'inside', withoutEnlargement: true });
    raster = isPng
      ? raster.png({ compressionLevel: 9, palette: true })
      : raster.jpeg({ quality: 80, mozjpeg: true });
    const rasterBuf = await raster.toBuffer();
    if (rasterBuf.length < input.length) {
      writeFileSync(file, rasterBuf);
      saved += input.length - rasterBuf.length;
    }

    // WebP variants for srcset.
    for (const width of IMG_WIDTHS) {
      const buf = await from()
        .resize(width, null, { withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer();
      writeFileSync(file.replace(/\.(jpe?g|png)$/i, `-${width}.webp`), buf);
    }
  }
  logger.info(`optimized ${files.length} image(s), saved ${(saved / 1024).toFixed(0)} KB on the rasters`);
}

function saucyImages() {
  return {
    name: 'saucy-images',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        await optimizeBuiltImages(fileURLToPath(dir), logger);
      },
    },
  };
}

// On-demand routes (Keystatic admin API, /api/checkout, /api/contact) need an
// adapter in dev too. Use the plain Node adapter for `astro dev` so Keystatic's
// local-mode file reader keeps resolving to its Node build; the production build
// uses the Cloudflare (Workers) adapter.
//   - imageService: 'compile'  -> optimize any <Image> at build with sharp, no
//     runtime Images binding. (Our CMS images go through the saucy-images hook.)
//   - prerenderEnvironment: 'node' -> prerender static pages on Node so the
//     Keystatic file reader (node:fs) works during the build.
const adapter = process.argv.includes('dev')
  ? node({ mode: 'standalone' })
  : cloudflare({ imageService: 'compile', prerenderEnvironment: 'node' });

export default defineConfig({
  site: 'https://www.saucyfields.com',
  adapter,
  // Emit `about.html` rather than `about/index.html`. Cloudflare's static-asset
  // server then serves `/about` directly; with the default directory layout it
  // 307-redirects `/about` -> `/about/`, adding a hop to every internal click.
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [
    react(),
    keystatic(),
    saucyCatalog(),
    saucyImages(),
    sitemap({
      // Keep transient / cart-flow pages out of the index.
      filter: (page) => !/\/(cart|success|canceled)$/.test(page),
    }),
  ],
  env: {
    schema: {
      STRIPE_SECRET_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      KEYSTATIC_GITHUB_CLIENT_ID: envField.string({ context: 'server', access: 'secret', optional: true }),
      KEYSTATIC_GITHUB_CLIENT_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
      KEYSTATIC_SECRET: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  vite: {
    optimizeDeps: {
      include: ['@keystatic/core', '@keystatic/astro'],
    },
  },
});
