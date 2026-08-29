# Saucy Fields

Marketing site + shop for Saucy Fields — a screen-print shop in Winona, MN.

- **Astro** static site, deployed to **Netlify**
- **Keystatic** CMS at `/keystatic` — edit every page + the product catalogue, no code
- **Stripe Checkout** for payments (no store platform, no platform fee — just Stripe's rate)

## Local development

```bash
npm install
cp .env.example .env      # optional — the site runs without any keys
npm run dev               # http://localhost:4321  (CMS at /keystatic)
npm run build             # outputs to dist/ for Netlify
```

To exercise the built output (functions + checkout) locally the way Netlify runs it:
`npx netlify dev`. Plain `astro preview` isn't supported with the Netlify adapter.

In dev, Keystatic runs in **local mode**: edits at `/keystatic` write straight to files
in `src/content/`. Commit them like any other change.

## Where things live

| Path | What |
| --- | --- |
| `src/content/` | All site content (managed by Keystatic) |
| `src/content/products/` | One folder per product |
| `keystatic.config.ts` | CMS schema — fields, collections, storage mode |
| `src/pages/` | Routes. `src/pages/api/checkout.ts` builds the Stripe session |
| `src/components/` | UI building blocks |
| `src/styles/global.css` | Design tokens + shared styles |
| `public/images/` | Product photos, brand images |
| `src/data/catalog.json` | Auto-generated price snapshot for checkout — do not edit |

## Going live

See **[HANDOFF.md](./HANDOFF.md)** — GitHub + Netlify + Stripe setup, switching the CMS
to GitHub mode, and the list of placeholder copy to replace.
