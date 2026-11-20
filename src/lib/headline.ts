/**
 * Split a headline so its last word can render in the accent colour.
 * A one-word headline comes back as `lead` with an empty `last`.
 */
export function splitHeadline(headline: string): { lead: string; last: string } {
  const words = headline.trim().split(/\s+/);
  const last = words.length > 1 ? words.pop()! : '';
  return { lead: words.join(' '), last };
}
