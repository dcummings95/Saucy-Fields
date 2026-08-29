/** Money helpers. Prices are stored in the CMS as plain USD dollars. */

export function usd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Dollars -> integer cents, for Stripe. */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}
