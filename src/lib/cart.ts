/**
 * Client-side cart. Lives in localStorage; the server re-prices every line at
 * checkout from the CMS, so nothing here is trusted for money — it's display only.
 */

export interface CartLine {
  slug: string;
  name: string;
  price: number;
  image: string;
  size: string | null;
  color: string | null;
  qty: number;
}

const KEY = 'saucy-cart-v1';
const EVENT = 'saucy:cart-change';

export function lineKey(line: Pick<CartLine, 'slug' | 'size' | 'color'>): string {
  return [line.slug, line.size ?? '', line.color ?? ''].join('::');
}

export function getCart(): CartLine[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((l) => l && typeof l.slug === 'string' && typeof l.qty === 'number');
  } catch {
    return [];
  }
}

function save(lines: CartLine[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    /* private mode / quota — cart just won't persist */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function onCartChange(fn: () => void): () => void {
  window.addEventListener(EVENT, fn);
  window.addEventListener('storage', fn); // sync across tabs
  return () => {
    window.removeEventListener(EVENT, fn);
    window.removeEventListener('storage', fn);
  };
}

export function addToCart(line: Omit<CartLine, 'qty'>, qty = 1): void {
  const lines = getCart();
  const key = lineKey(line);
  const existing = lines.find((l) => lineKey(l) === key);
  if (existing) {
    existing.qty = Math.min(existing.qty + qty, 99);
  } else {
    lines.push({ ...line, qty: Math.min(qty, 99) });
  }
  save(lines);
}

export function setQty(key: string, qty: number): void {
  let lines = getCart();
  if (qty <= 0) {
    lines = lines.filter((l) => lineKey(l) !== key);
  } else {
    const line = lines.find((l) => lineKey(l) === key);
    if (line) line.qty = Math.min(qty, 99);
  }
  save(lines);
}

export function removeLine(key: string): void {
  save(getCart().filter((l) => lineKey(l) !== key));
}

export function clearCart(): void {
  save([]);
}

export function cartCount(): number {
  return getCart().reduce((n, l) => n + l.qty, 0);
}

export function cartSubtotal(): number {
  return getCart().reduce((n, l) => n + l.price * l.qty, 0);
}
