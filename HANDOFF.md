# Saucy Fields — handoff & go-live guide

This is a complete replacement for the Squarespace site. It runs locally right now with
no accounts. This guide covers turning it into a live site with a working shop.

---

## 1. Why it's built this way (the fee thing)

You're paying Squarespace twice: their transaction fee **plus** Stripe's 2.9% + 30¢.
Snipcart and every other "add a cart" service does the same — 2% or a monthly minimum on
top of Stripe.

This site has **no store platform**. The product catalogue lives in the CMS, and
"Checkout" talks straight to Stripe. The only cost is Stripe's unavoidable **2.9% + 30¢**
per order. No monthly fee, no platform cut.

Trade-off: the cart and checkout are ~200 lines of our own code instead of a paid
service. It's simple and it's done, but it's ours to maintain.

Until Stripe is connected, "Checkout" shows an **"email us your order"** link with the
cart contents pre-filled — so the site is usable the day you show it to Isaac and Spencer.

---

## 2. One-time setup to go live

### a. Put it on GitHub

Create a repo **under an account Isaac controls** (so he can approve CMS edits later):

```bash
cd saucy-fields
git init && git add -A && git commit -m "Initial site"
git branch -M main
git remote add origin https://github.com/<isaac-or-org>/saucy-fields.git
git push -u origin main
```

### b. Deploy to Netlify (free)

1. Sign in at [netlify.com](https://www.netlify.com) with GitHub.
2. **Add new site → Import from Git →** pick the repo.
3. Build settings are auto-detected from `netlify.toml` (`npm run build`, publish `dist`).
   Deploy.
4. You'll get a URL like `saucy-fields.netlify.app`. In **Site configuration → Domain
   management** you can add `saucyfields.com` later (point the domain's DNS at Netlify, or
   move the domain into Netlify DNS).

### c. Environment variables (Netlify → Site configuration → Environment variables)

| Key | Value | Needed for |
| --- | --- | --- |
| `PUBLIC_SITE_URL` | your live URL, e.g. `https://www.saucyfields.com` | checkout redirects |
| `STRIPE_SECRET_KEY` | from Stripe (below) | taking payment |
| `KEYSTATIC_STORAGE_KIND` | `github` | CMS login in production |
| `KEYSTATIC_GITHUB_REPO` | `<owner>/saucy-fields` | CMS |
| `KEYSTATIC_GITHUB_CLIENT_ID` | from the GitHub App (below) | CMS |
| `KEYSTATIC_GITHUB_CLIENT_SECRET` | from the GitHub App | CMS |
| `KEYSTATIC_SECRET` | any long random string (`openssl rand -hex 32`) | CMS sessions |

Redeploy after adding variables.

---

## 3. Stripe (payments)

1. Create an account at [stripe.com](https://stripe.com) — takes ~10 min, needs a bank
   account for payouts.
2. **Developers → API keys →** copy the **Secret key** (`sk_live_…`) into Netlify as
   `STRIPE_SECRET_KEY`. Redeploy.
3. That's it. Checkout now works: card entry, receipts, shipping address, and the
   "Local pickup — Winona" (free) vs "US shipping" options are handled by Stripe.
   The shipping flat rate is set in the CMS (**Site settings → Flat-rate shipping**).

**Test it first:** put the **test** key (`sk_test_…`) in locally in `.env`, run
`npm run dev`, add something to the cart, and check out with card `4242 4242 4242 4242`,
any future date, any CVC.

Orders show up in the Stripe Dashboard (**Payments**). Product name, size/colour, and
slug are attached to each line item.

### Optional: get an email when an order comes in

Not built. The simplest add-on later: a Stripe webhook (`checkout.session.completed`) →
a Netlify function → an email via [Resend](https://resend.com) (free tier). Ask a
developer for ~1 hour of work, or just watch the Stripe Dashboard / turn on Stripe's own
email notifications (**Settings → Business → Customer emails**).

---

## 4. The CMS (Keystatic)

### Local (now)
`npm run dev`, open `http://localhost:4321/keystatic`. Edits save to files; commit them.

### Production (after go-live)
Keystatic uses a **GitHub App** so Isaac/Spencer log in with GitHub and their edits are
committed to the repo (which redeploys the site).

1. Go to `https://<your-site>/keystatic` once deployed — Keystatic will walk you through
   **creating the GitHub App** and installing it on the repo.
2. It gives you the `KEYSTATIC_GITHUB_CLIENT_ID` / `_SECRET` — put them in Netlify with
   the other `KEYSTATIC_*` vars, redeploy.
3. Now anyone with write access to the repo can edit at `/keystatic`. Add Spencer as a
   collaborator on the GitHub repo to give him access.

Docs: <https://keystatic.com/docs/connect-to-github>

### What's editable

Everything: homepage, About (story + both bios + process), Services, Site settings
(announcement bar, shipping rate, socials, email), any number of extra pages, and the
full product catalogue — add/remove products, prices, photos, sizes, colours, status
(Available / Pre-sale / Sold out), and which ones are featured on the homepage.

### Adding a product

`/keystatic` → **Products → New**. Fill in name, price, type, upload photos, add sizes.
Set **Status** and tick **Feature on homepage** if wanted. Save. On production that makes
a commit and the site rebuilds in ~1 minute; the price snapshot used by checkout updates
automatically.

---

## 5. Contact form

The contact page form uses **Netlify Forms** — it works automatically once deployed to
Netlify, no setup. Submissions appear in **Netlify → Forms**, and you can add an email
notification there (**Forms → Settings → Form notifications**). It does nothing on
`localhost` — that's expected.

---

## 6. Placeholder content to replace

Built without input from Isaac & Spencer, so some copy is a first draft. All of it is
editable in `/keystatic`. Priorities:

- **About → Story** — rewrite in their voice. Current text is a plausible guess.
- **About → Founders** — the Isaac & Spencer blurbs and roles are guesses. No founder
  photos yet (add under each founder).
- **About → photo / Homepage → hero image** — currently the promo photo pulled from the
  old site. Swap for whatever they want.
- **Services** — offerings, steps, and the intro are generic. Add real pricing ranges,
  turnaround times, and blank-garment options if they want them public.
- **Homepage → "What we do"** and **band roster** — check the band list; add links.
- **Shipping & Pickup page** — confirm the flat rate, timelines, and return policy.
- **Product descriptions** — carried over from the old site; mostly fine.
- **Logo** — the header/footer wordmark is set in type (`src/components/Wordmark.astro`).
  If they have the real hand-lettered logo as an SVG/PNG, drop it in and use it there.

Images pulled from the old site live in `public/images/`. Replace freely.

---

## 7. What was intentionally left out

- Stock/inventory counts (status is a manual Available / Sold out toggle).
- An orders dashboard (use the Stripe Dashboard).
- Automated order-notification emails (see §3).
- Anything touching their current Squarespace — cancel that whenever they're ready.
