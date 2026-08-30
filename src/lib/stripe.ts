import Stripe from 'stripe';
import { getSecret } from 'astro:env/server';

/**
 * Returns a Stripe client, or null when no secret key is configured.
 * A null client is the signal for the checkout route to fall back to
 * "email us your order" instead of erroring.
 *
 * The key comes from `astro:env` so it resolves the same way on the Node dev
 * server (`.env` / `process.env`) and on the Cloudflare runtime (Pages secret).
 * `createFetchHttpClient()` is required on Workers — the SDK's default client
 * uses Node's `http` module, which isn't available there.
 */
let cached: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (cached !== undefined) return cached;
  let key: string | undefined;
  try {
    key = getSecret('STRIPE_SECRET_KEY');
  } catch {
    key = undefined; // not configured — fall through to the "email us" path
  }
  cached = key ? new Stripe(key, { httpClient: Stripe.createFetchHttpClient() }) : null;
  return cached;
}
