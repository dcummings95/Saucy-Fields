import Stripe from 'stripe';

/**
 * Returns a Stripe client, or null when no secret key is configured.
 * A null client is the signal for the checkout route to fall back to
 * "email us your order" instead of erroring.
 */
let cached: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (cached !== undefined) return cached;
  const key = process.env.STRIPE_SECRET_KEY || import.meta.env.STRIPE_SECRET_KEY;
  cached = key ? new Stripe(key) : null;
  return cached;
}
