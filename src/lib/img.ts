/**
 * Helpers for CMS-managed images (`/images/...` string paths from Keystatic).
 *
 * Astro's `<Image>` pipeline never touches `public/`, so the `saucy-images`
 * build hook in astro.config.mjs post-processes `dist/images/**` instead:
 * it caps the original raster at 1600px and emits WebP variants at each of
 * IMG_WIDTHS. These helpers build the URLs that point at those variants.
 *
 * The build hook only runs on `astro build`. During `astro dev` the variants
 * don't exist, so the helpers no-op and the pages fall back to the original
 * raster (served as-is by the dev server, same as before).
 */

export const IMG_WIDTHS = [400, 800, 1600] as const;

const VARIANTS_BUILT = !import.meta.env.DEV;
const isRaster = (src: string) => /\.(jpe?g|png)$/i.test(src);

/** Sized WebP variant, e.g. `/images/x.jpg` + 800 -> `/images/x-800.webp`. */
export function webpVariant(src: string, width: number): string {
  if (!VARIANTS_BUILT || !isRaster(src)) return src;
  return src.replace(/\.(jpe?g|png)$/i, `-${width}.webp`);
}

/** `srcset` across IMG_WIDTHS, or `''` when the variants aren't available. */
export function webpSrcset(src: string): string {
  if (!VARIANTS_BUILT || !isRaster(src)) return '';
  return IMG_WIDTHS.map((w) => `${webpVariant(src, w)} ${w}w`).join(', ');
}
