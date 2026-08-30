import type { APIRoute } from 'astro';
import catalog from '../../data/catalog.json';

export const prerender = false;

/**
 * Contact form handler. Sends the message to the shop inbox via the Cloudflare
 * Email Sending binding (`EMAIL` in wrangler.jsonc). The recipient comes from the
 * build-time catalog snapshot so this route never imports the Keystatic reader.
 *
 * Without the binding / a verified sending domain it degrades to "email us
 * directly", mirroring how /api/checkout handles a missing Stripe key.
 */

const FROM = { email: 'contact@saucyfields.com', name: 'Saucy Fields website' };
const SHOP_INBOX = catalog.settings.email;

const clamp = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const escapeHtml = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

type EmailBinding = { send: (message: Record<string, unknown>) => Promise<unknown> };

/** The `EMAIL` send binding, or undefined when not on the Cloudflare runtime. */
async function getEmail(): Promise<EmailBinding | undefined> {
  try {
    const { env } = await import('cloudflare:workers');
    return (env as Record<string, EmailBinding | undefined>).EMAIL;
  } catch {
    return undefined; // e.g. `astro dev` on the Node adapter
  }
}

export const POST: APIRoute = async ({ request }) => {
  const ct = request.headers.get('content-type') || '';
  const wantsJson = ct.includes('application/json');

  const done = (ok: boolean, message: string, status = ok ? 200 : 400) => {
    if (wantsJson) {
      return new Response(JSON.stringify({ ok, message }), {
        status,
        headers: { 'content-type': 'application/json' },
      });
    }
    // No-JS form post: bounce back to the page, which shows the confirmation.
    return new Response(null, {
      status: 303,
      headers: { location: ok ? '/contact?sent=1' : '/contact?error=1' },
    });
  };

  let fields: Record<string, unknown> = {};
  try {
    if (wantsJson) {
      fields = await request.json();
    } else {
      fields = Object.fromEntries(await request.formData());
    }
  } catch {
    return done(false, 'Could not read the form.');
  }

  // Honeypot — a bot filled the hidden field. Pretend it worked, send nothing.
  if (clamp(fields['bot-field'], 1)) return done(true, 'Thanks — we got your message.');

  const name = clamp(fields.name, 200);
  const email = clamp(fields.email, 320);
  const message = clamp(fields.message, 5000);

  if (!name || !email || !message) return done(false, 'Please fill in your name, email, and a message.');
  if (!looksLikeEmail(email)) return done(false, 'That email address doesn’t look right.');

  const EMAIL = await getEmail();
  if (!EMAIL || !SHOP_INBOX) {
    return done(
      false,
      SHOP_INBOX
        ? `Our form isn’t hooked up yet — please email us directly at ${SHOP_INBOX}.`
        : 'Our form isn’t hooked up yet — please reach us on social media.',
      503,
    );
  }

  const text = `From: ${name} <${email}>\n\n${message}`;
  const html = `<p><strong>${escapeHtml(name)}</strong> &lt;${escapeHtml(email)}&gt;</p><p style="white-space:pre-wrap">${escapeHtml(
    message,
  )}</p>`;

  try {
    await EMAIL.send({
      to: SHOP_INBOX,
      from: FROM,
      replyTo: email,
      subject: `Contact form — ${name}`,
      text,
      html,
    });
  } catch (err) {
    console.error('[contact] email send failed', err);
    return done(false, `Something went wrong sending that. Email us directly at ${SHOP_INBOX}.`, 502);
  }

  return done(true, 'Thanks! We got your message and will get back to you soon.');
};
