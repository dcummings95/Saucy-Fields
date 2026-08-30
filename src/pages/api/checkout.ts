import type { APIRoute } from 'astro';
import catalog from '../../data/catalog.json';
import { getStripe } from '../../lib/stripe';
import { toCents } from '../../lib/format';

export const prerender = false;

type IncomingItem = { slug?: unknown; size?: unknown; color?: unknown; qty?: unknown };

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

const productBySlug = new Map(catalog.products.map((p) => [p.slug, p]));

export const POST: APIRoute = async ({ request }) => {
  const stripe = getStripe();
  if (!stripe) {
    return json(
      { message: 'Online checkout isn’t switched on yet — but we can still take your order by email.' },
      503,
    );
  }

  let body: { items?: IncomingItem[] };
  try {
    body = await request.json();
  } catch {
    return json({ message: 'Could not read your cart.' }, 400);
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) return json({ message: 'Your cart is empty.' }, 400);

  const origin = import.meta.env.PUBLIC_SITE_URL || new URL(request.url).origin;

  const lineItems = [];
  for (const raw of items) {
    const product = productBySlug.get(String(raw.slug));
    if (!product) return json({ message: 'One of those items is no longer in the shop.' }, 409);
    if (product.status === 'soldout') return json({ message: `“${product.name}” just sold out.` }, 409);

    const qty = Math.max(1, Math.min(99, Number(raw.qty) || 1));
    const options = [raw.size, raw.color].filter((v) => typeof v === 'string' && v).join(' / ');
    const image = product.image ? new URL(product.image, origin).toString() : undefined;

    lineItems.push({
      quantity: qty,
      price_data: {
        currency: 'usd',
        unit_amount: toCents(product.price),
        product_data: {
          name: product.name + (options ? ` — ${options}` : ''),
          ...(image ? { images: [image] } : {}),
          metadata: {
            slug: product.slug,
            size: typeof raw.size === 'string' ? raw.size : '',
            color: typeof raw.color === 'string' ? raw.color : '',
          },
        },
      },
    });
  }

  const { shippingFlatRate, location } = catalog.settings;
  const shippingOptions: Parameters<typeof stripe.checkout.sessions.create>[0]['shipping_options'] = [
    {
      shipping_rate_data: {
        type: 'fixed_amount',
        display_name: `Local pickup — ${location.city}`,
        fixed_amount: { amount: 0, currency: 'usd' },
      },
    },
  ];
  if (shippingFlatRate > 0) {
    shippingOptions.push({
      shipping_rate_data: {
        type: 'fixed_amount',
        display_name: 'US shipping',
        fixed_amount: { amount: toCents(shippingFlatRate), currency: 'usd' },
        delivery_estimate: { minimum: { unit: 'business_day', value: 3 }, maximum: { unit: 'business_day', value: 10 } },
      },
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      shipping_address_collection: { allowed_countries: ['US'] },
      shipping_options: shippingOptions,
      phone_number_collection: { enabled: true },
      allow_promotion_codes: true,
      success_url: `${origin}/success`,
      cancel_url: `${origin}/canceled`,
    });
    return json({ url: session.url });
  } catch (err) {
    console.error('[checkout] Stripe error', err);
    return json({ message: 'Something went wrong reaching checkout. Try again, or email us.' }, 502);
  }
};
