import { config, collection, singleton, fields, type ComponentSchema } from '@keystatic/core';
import { RESERVED_SLUGS, RESERVED_SLUG_RE } from './src/lib/reserved-slugs';

/**
 * Keystatic CMS configuration.
 *
 * This file runs BOTH on the server (build-time content reads) and in the browser
 * (the /keystatic admin UI), so it can only use `import.meta.env.DEV` / `.PROD` —
 * never `process.env` (that throws "process is not defined" in the browser).
 *
 * Storage:
 *  - `astro dev`   -> local mode: edits at /keystatic write straight to files here.
 *  - production     -> GitHub mode: Isaac/Spencer sign in with GitHub at /keystatic
 *                      and their edits are committed to the repo, triggering a deploy.
 *
 * To run GitHub mode locally (needed once, to create the Keystatic GitHub App —
 * Keystatic only allows that flow in dev), start the dev server with
 * PUBLIC_KEYSTATIC_STORAGE=github set in `.env`.
 */
// Must match the GitHub repo slug exactly, including case.
const GITHUB_REPO = 'dcummings95/Saucy-Fields' as const;

const useGithub = !import.meta.env.DEV || import.meta.env.PUBLIC_KEYSTATIC_STORAGE === 'github';

const storage = useGithub
  ? ({ kind: 'github', repo: GITHUB_REPO } as const)
  : ({ kind: 'local' } as const);

const productImage = (label: string) =>
  fields.image({
    label,
    directory: 'public/images/products',
    publicPath: '/images/products/',
    validation: { isRequired: true },
  });

/** Standard apparel sizes, in the order they're shown to buyers. */
export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'] as const;

/**
 * Rich-text field. Images inserted in the editor must land under `public/` or
 * the site can't serve them (Keystatic's default stores them beside the content
 * file in `src/content/`, which renders as a broken image). For collections
 * Keystatic adds the entry slug: public/images/content/<folder>/<slug>/<file>.
 */
const richText = (label: string, folder: string) =>
  fields.markdoc({
    label,
    options: {
      image: {
        directory: `public/images/content/${folder}`,
        publicPath: `/images/content/${folder}/`,
      },
    },
  });

/* Field helpers for the Extra pages builder. */
const pageImage = (label: string, description?: string, required = false) =>
  fields.image({
    label,
    description,
    directory: 'public/images/pages',
    publicPath: '/images/pages/',
    validation: { isRequired: required },
  });

const altText = () => fields.text({ label: 'Image alt text', description: 'Describe the photo for screen readers.' });

const photoSide = () =>
  fields.select({
    label: 'Photo side',
    options: [
      { label: 'Right', value: 'right' },
      { label: 'Left', value: 'left' },
    ],
    defaultValue: 'right',
  });

/** Where the full-width banner's headline group sits (see Hero.astro). */
const heroTextPosition = () =>
  fields.select({
    label: 'Headline position',
    description: 'The small label always stays at the top. This moves the headline, text and buttons.',
    options: [
      { label: 'Spread — headline at the top, buttons at the bottom', value: 'spread' },
      { label: 'Top', value: 'top' },
      { label: 'Middle', value: 'middle' },
      { label: 'Bottom', value: 'bottom' },
    ],
    defaultValue: 'spread',
  });

const button = (label: string) =>
  fields.object({ label: fields.text({ label: 'Label' }), href: fields.text({ label: 'Link' }) }, { label });

const heroButtons = () => ({
  primaryCta: button('Main button (optional)'),
  secondaryCta: button('Second button (optional)'),
});

/** Headline fields for Extra pages, which have no heading/intro of their own. */
const heroText = () => ({
  eyebrow: fields.text({ label: 'Small label above the headline', description: 'Optional, e.g. "Holiday sale".' }),
  headline: fields.text({
    label: 'Headline',
    description: 'Leave blank to use the page title. The last word renders in the accent colour.',
    multiline: true,
  }),
  subtext: fields.text({ label: 'Text under the headline', description: 'Optional, keep it short.', multiline: true }),
});

/**
 * The "Top of the page" picker, shared by every page except the homepage.
 * Rendered by src/components/PageHero.astro.
 *
 * `folder` must be unique per singleton: Keystatic names singleton uploads
 * after the field path (no per-entry subfolder like collections get), so two
 * singletons sharing a folder would overwrite each other's hero photo.
 *
 * `text` adds headline/subtext fields to the hero (Extra pages pass
 * `heroText()`). Singletons pass `{}`: their "Page heading" and "Intro"
 * fields already are the hero text. Generic so the reader keeps the types.
 */
const heroPicker = <T extends Record<string, ComponentSchema>>(folder: string, text: T) => {
  const ownText = Object.keys(text).length > 0;
  const img = (label: string, description: string, required = false) =>
    fields.image({
      label,
      description,
      directory: `public/images/${folder}`,
      publicPath: `/images/${folder}/`,
      validation: { isRequired: required },
    });
  return fields.conditional(
    fields.select({
      label: 'Top of the page',
      description: ownText
        ? 'How the page opens. "No hero" is a plain title over the body.'
        : 'How the page opens. The page heading, intro and small label above are used as the hero text.',
      options: [
        { label: 'No hero — just the heading', value: 'none' },
        { label: 'Full-width photo banner (like the homepage)', value: 'full' },
        { label: 'Split — headline beside a photo', value: 'split' },
      ],
      defaultValue: 'none',
    }),
    {
      none: fields.empty(),
      full: fields.object({
        image: img('Hero image', 'Wide shot — shown on tablet and desktop.', true),
        imageMobile: img(
          'Hero image — mobile',
          'Optional taller crop shown on phones. Falls back to the wide image if empty.',
        ),
        imageAlt: altText(),
        textPosition: heroTextPosition(),
        ...text,
        ...heroButtons(),
      }),
      split: fields.object({
        image: img('Photo', 'Shown beside the headline; stacks under it on phones.', true),
        imageAlt: altText(),
        photoSide: photoSide(),
        ...text,
        ...heroButtons(),
      }),
    },
  );
};

/** Small label over a singleton page's heading (shown with or without a hero). */
const eyebrowField = (defaultValue: string) =>
  fields.text({ label: 'Small label above the heading', description: 'Optional.', defaultValue });

export default config({
  storage,
  ui: {
    brand: { name: 'Saucy Fields' },
    navigation: {
      Shop: ['products', 'productHelp'],
      Pages: ['homepage', 'about', 'services', 'shopPage', 'contactPage', 'pages'],
      Settings: ['siteSettings'],
    },
  },
  collections: {
    products: collection({
      label: 'Products',
      slugField: 'name',
      path: 'src/content/products/*/',
      format: { contentField: 'description' },
      // 'form' (the default) keeps photos, price and sizes in the main column.
      // 'content' would squeeze them into a sidebar beside the description.
      columns: ['name', 'status', 'price', 'band'],
      schema: {
        name: fields.slug({
          name: { label: 'Product name' },
          slug: {
            label: 'URL slug',
            description: 'The /shop/... address. Change with care once a product is public.',
          },
        }),
        status: fields.select({
          label: 'Status',
          description: 'New products start hidden, so you can save as you go. Switch to Available when it is ready to sell.',
          options: [
            { label: 'Hidden — not on the site yet', value: 'draft' },
            { label: 'Available', value: 'available' },
            { label: 'Pre-sale', value: 'presale' },
            { label: 'Sold out', value: 'soldout' },
          ],
          defaultValue: 'draft',
        }),
        presaleNote: fields.text({
          label: 'Pre-sale note',
          description:
            'Only shown while the status is Pre-sale, under the price. e.g. "Ships the week of Dec 8." Leave blank for "Ships once the print run is done."',
        }),
        price: fields.number({
          label: 'Price (USD)',
          description: 'Dollars, e.g. 25 or 15.5. Card payments need at least $0.50.',
          validation: { isRequired: true, min: 0.5 },
        }),
        compareAtPrice: fields.number({
          label: 'Compare-at price (USD)',
          description: 'Optional. Shows a struck-through "was" price and a Sale tag. Must be higher than the price.',
        }),
        images: fields.array(
          fields.object({
            src: productImage('Image'),
            alt: fields.text({
              label: 'Alt text',
              description: 'Optional. Describe the photo for screen readers, e.g. "Pink shirt, front". Falls back to the product name.',
            }),
          }),
          {
            label: 'Photos',
            description:
              'JPG or PNG (iPhone HEIC photos will not show — export as JPG). The FIRST photo is the shop card, the checkout thumbnail and the link preview; cards crop it to a tall 3:4 frame from the top. Drag to reorder.',
            itemLabel: (props) => props.fields.alt.value || 'Photo',
          },
        ),
        band: fields.text({
          label: 'Band / business / artist',
          description:
            'Who is this for? Shows on the product card and groups products in the shop filter, so spell it the same way every time. Leave blank for Saucy Fields originals.',
        }),
        type: fields.select({
          label: 'Type',
          options: [
            { label: 'Shirt', value: 'shirt' },
            { label: 'Poster', value: 'poster' },
            { label: 'Other', value: 'other' },
          ],
          defaultValue: 'shirt',
        }),
        sizes: fields.multiselect({
          label: 'Sizes',
          description: 'Tick every size you sell. Untick one when it runs out. Leave all unticked for one-size items like posters.',
          options: SIZES.map((s) => ({ label: s, value: s })),
        }),
        otherSizes: fields.array(fields.text({ label: 'Size' }), {
          label: 'Other sizes (optional)',
          description: 'Anything not in the list above, e.g. "Youth M". Listed after the ticked sizes.',
          itemLabel: (props) => props.value || 'Size',
        }),
        colors: fields.array(fields.text({ label: 'Color' }), {
          label: 'Colors',
          description: 'Optional. Buyers pick one at checkout. Leave empty for a single colour.',
          itemLabel: (props) => props.value || 'Color',
        }),
        shortDescription: fields.text({
          label: 'Short description',
          description: 'One or two sentences under the price on the product page. Also used for Google and link previews.',
          multiline: true,
        }),
        description: richText('Full description (optional)', 'products'),
        featured: fields.checkbox({
          label: 'Feature on homepage',
          description: 'The homepage shows up to 4 products, featured ones first.',
          defaultValue: false,
        }),
        added: fields.date({
          label: 'Date added',
          description: 'Newest products show first in the shop. Filled in automatically.',
          defaultValue: { kind: 'today' },
        }),
        seoDescription: fields.text({
          label: 'SEO description (optional)',
          description: 'Overrides the short description in Google results and link previews.',
          multiline: true,
        }),
      },
    }),

    pages: collection({
      label: 'Extra pages',
      slugField: 'title',
      path: 'src/content/pages/*/',
      format: { contentField: 'content' },
      entryLayout: 'content',
      columns: ['title', 'showInFooter'],
      schema: {
        title: fields.slug({
          name: { label: 'Title' },
          slug: {
            label: 'URL slug',
            description: 'The page lives at saucyfields.com/<slug>. Change with care once the page is public.',
            validation: {
              pattern: {
                regex: RESERVED_SLUG_RE,
                message: `Lowercase letters, numbers and dashes only, and not one of the built-in pages: ${RESERVED_SLUGS.join(', ')}.`,
              },
            },
          },
        }),
        description: fields.text({
          label: 'Short description',
          description: 'Used for the browser tab and link previews.',
          multiline: true,
        }),
        showInFooter: fields.checkbox({ label: 'Link from the site footer', defaultValue: true }),
        // Collections get a per-slug subfolder, so all Extra pages can share one.
        hero: heroPicker('pages', heroText()),
        content: richText('Body', 'pages'),
        sections: fields.blocks(
          {
            text: {
              label: 'Text',
              schema: fields.object({
                heading: fields.text({ label: 'Heading (optional)' }),
                body: fields.markdoc.inline({ label: 'Text', options: { image: false } }),
              }),
              itemLabel: (props) => `Text${props.fields.heading.value ? ` — ${props.fields.heading.value}` : ''}`,
            },
            textPhoto: {
              label: 'Text + photo',
              schema: fields.object({
                heading: fields.text({ label: 'Heading (optional)' }),
                body: fields.markdoc.inline({ label: 'Text', options: { image: false } }),
                image: pageImage('Photo', undefined, true),
                imageAlt: altText(),
                photoSide: photoSide(),
                cta: button('Button (optional)'),
              }),
              itemLabel: (props) => `Text + photo${props.fields.heading.value ? ` — ${props.fields.heading.value}` : ''}`,
            },
            products: {
              label: 'Product grid',
              schema: fields.object({
                eyebrow: fields.text({ label: 'Small label (optional)' }),
                heading: fields.text({ label: 'Heading', defaultValue: 'From the shop' }),
                band: fields.text({
                  label: 'Only this band / business',
                  description: 'Optional. Must match the "Band / business / artist" on the products exactly.',
                }),
                type: fields.select({
                  label: 'Only this type',
                  options: [
                    { label: 'Everything', value: 'all' },
                    { label: 'Shirts', value: 'shirt' },
                    { label: 'Posters', value: 'poster' },
                    { label: 'Other', value: 'other' },
                  ],
                  defaultValue: 'all',
                }),
                limit: fields.integer({
                  label: 'How many to show',
                  description: '0 shows every match.',
                  defaultValue: 4,
                  validation: { min: 0 },
                }),
                hideSoldOut: fields.checkbox({ label: 'Hide sold-out items', defaultValue: false }),
              }),
              itemLabel: (props) => `Products — ${props.fields.heading.value || 'grid'}`,
            },
            cards: {
              label: 'Numbered cards',
              schema: fields.object({
                eyebrow: fields.text({ label: 'Small label (optional)' }),
                heading: fields.text({ label: 'Heading' }),
                dark: fields.checkbox({ label: 'Dark background', defaultValue: true }),
                items: fields.array(
                  fields.object({
                    title: fields.text({ label: 'Title' }),
                    body: fields.text({ label: 'Body', multiline: true }),
                  }),
                  { label: 'Cards', itemLabel: (props) => props.fields.title.value || 'Card' },
                ),
              }),
              itemLabel: (props) => `Cards — ${props.fields.heading.value || 'untitled'}`,
            },
            gallery: {
              label: 'Photo gallery',
              schema: fields.object({
                heading: fields.text({ label: 'Heading (optional)' }),
                images: fields.array(
                  fields.object({
                    src: fields.image({
                      label: 'Image',
                      directory: 'public/images/pages',
                      publicPath: '/images/pages/',
                      validation: { isRequired: true },
                    }),
                    alt: fields.text({ label: 'Alt text', description: 'Describe the image for screen readers.' }),
                    caption: fields.text({ label: 'Caption (optional)' }),
                  }),
                  { label: 'Photos', itemLabel: (props) => props.fields.alt.value || 'Photo' },
                ),
              }),
              itemLabel: (props) => `Gallery — ${props.fields.heading.value || 'photos'}`,
            },
            cta: {
              label: 'Call-to-action box',
              schema: fields.object({
                heading: fields.text({ label: 'Heading', defaultValue: 'Got something to print?' }),
                text: fields.text({ label: 'Text', multiline: true }),
                buttonLabel: fields.text({ label: 'Button label', defaultValue: 'Get in touch →' }),
                buttonHref: fields.text({ label: 'Button link', defaultValue: '/contact' }),
                color: fields.select({
                  label: 'Colour',
                  options: [
                    { label: 'Saucy red', value: 'saucy' },
                    { label: 'Mustard', value: 'mustard' },
                    { label: 'Ink (black)', value: 'ink' },
                  ],
                  defaultValue: 'saucy',
                }),
              }),
              itemLabel: (props) => `Call to action — ${props.fields.heading.value}`,
            },
          },
          {
            label: 'Sections',
            description: 'Extra sections stacked under the body, top to bottom. Drag to reorder.',
          },
        ),
      },
    }),
  },

  singletons: {
    // Editor-only how-to that sits under Products in the sidebar. Nothing on
    // the site reads it, so it never renders publicly.
    productHelp: singleton({
      label: 'Help: adding a product',
      path: 'src/content/help/products/',
      format: { contentField: 'guide' },
      entryLayout: 'content',
      schema: {
        guide: fields.markdoc({
          label: 'Guide',
          description: 'Notes for whoever runs the shop. Not shown on the website.',
          options: { image: false },
        }),
      },
    }),

    siteSettings: singleton({
      label: 'Site settings',
      path: 'src/content/settings/site/',
      format: { data: 'json' },
      schema: {
        businessName: fields.text({ label: 'Business name', defaultValue: 'Saucy Fields' }),
        tagline: fields.text({
          label: 'Tagline',
          multiline: true,
          defaultValue: 'Hand-drawn, screen-printed shirts and posters out of Winona, MN.',
        }),
        seoTitle: fields.text({
          label: 'Homepage SEO title',
          description:
            'The <title> tag for the homepage — shows as the headline in Google results. Aim for ~55 characters.',
          defaultValue: 'Screen Printing & Custom Merch in Winona, MN | Saucy Fields',
        }),
        announcement: fields.object(
          {
            enabled: fields.checkbox({ label: 'Show announcement bar', defaultValue: true }),
            text: fields.text({ label: 'Announcement text' }),
            link: fields.text({ label: 'Link (optional)' }),
          },
          { label: 'Announcement bar' },
        ),
        location: fields.object(
          {
            city: fields.text({ label: 'City', defaultValue: 'Winona' }),
            region: fields.text({ label: 'State / region', defaultValue: 'Minnesota' }),
            blurb: fields.text({
              label: 'Location blurb',
              multiline: true,
              defaultValue: 'Printing out of Winona, MN — local pickup and drop-off available.',
            }),
          },
          { label: 'Location' },
        ),
        email: fields.text({ label: 'Contact email', defaultValue: 'fieldsofsauce@gmail.com' }),
        shippingNote: fields.text({
          label: 'Shipping / pickup note',
          multiline: true,
          defaultValue: 'Flat-rate shipping in the US. Local pickup in Winona is free — just ask.',
        }),
        shippingFlatRate: fields.number({
          label: 'Flat-rate shipping (USD)',
          description: 'Added at checkout. Set to 0 for free shipping.',
          defaultValue: 6,
          validation: { isRequired: true, min: 0 },
        }),
        social: fields.object(
          {
            instagram: fields.text({ label: 'Instagram URL', defaultValue: 'https://www.instagram.com/saucy.fields/' }),
            tiktok: fields.text({ label: 'TikTok URL', defaultValue: 'https://www.tiktok.com/@saucyfields' }),
            facebook: fields.text({
              label: 'Facebook URL',
              defaultValue: 'https://www.facebook.com/profile.php?id=61553063294535',
            }),
          },
          { label: 'Social links' },
        ),
      },
    }),

    homepage: singleton({
      label: 'Homepage',
      path: 'src/content/homepage/',
      format: { data: 'json' },
      schema: {
        heroHeadline: fields.text({
          label: 'Hero headline',
          description: 'The last word renders in the accent colour. Hyphens use a non-breaking hyphen (‑) so words like "Hand‑drawn" stay on one line.',
          multiline: true,
          defaultValue: 'Hand‑drawn. Hand‑pulled. A little saucy.',
        }),
        heroSubtext: fields.text({
          label: 'Hero subtext',
          multiline: true,
          defaultValue:
            'Saucy Fields is a two-person print shop in Winona, MN. We draw, design, and screen-print shirts and posters for bands, businesses, and anyone who wants something better than clip art — and sell a few of our own.',
        }),
        heroImage: fields.image({
          label: 'Hero image',
          description: 'Wide shot — shown on tablet and desktop.',
          directory: 'public/images/brand',
          publicPath: '/images/brand/',
        }),
        heroImageMobile: fields.image({
          label: 'Hero image — mobile',
          description: 'Optional taller crop shown on phones. Falls back to the wide hero image if empty.',
          directory: 'public/images/brand',
          publicPath: '/images/brand/',
        }),
        heroImageAlt: fields.text({ label: 'Hero image alt text', defaultValue: 'Isaac and Spencer of Saucy Fields' }),
        heroTextPosition: heroTextPosition(),
        primaryCta: fields.object(
          {
            label: fields.text({ label: 'Label', defaultValue: 'Shop the merch' }),
            href: fields.text({ label: 'Link', defaultValue: '/shop' }),
          },
          { label: 'Primary button' },
        ),
        secondaryCta: fields.object(
          {
            label: fields.text({ label: 'Label', defaultValue: 'Make merch with us' }),
            href: fields.text({ label: 'Link', defaultValue: '/services' }),
          },
          { label: 'Secondary button' },
        ),
        whatWeDoHeading: fields.text({ label: '"What we do" heading', defaultValue: 'What we do' }),
        whatWeDo: fields.array(
          fields.object({
            title: fields.text({ label: 'Title' }),
            body: fields.text({ label: 'Body', multiline: true }),
          }),
          { label: '"What we do" items', itemLabel: (props) => props.fields.title.value || 'Item' },
        ),
        bandsHeading: fields.text({ label: 'Client roster heading', defaultValue: 'Recently printed for' }),
        bands: fields.array(
          fields.object({
            name: fields.text({ label: 'Name' }),
            url: fields.text({ label: 'Link (optional)' }),
          }),
          { label: 'Roster', itemLabel: (props) => props.fields.name.value || 'Name' },
        ),
      },
    }),

    about: singleton({
      label: 'About page',
      path: 'src/content/about/',
      format: { contentField: 'story' },
      schema: {
        eyebrow: eyebrowField('Who we are'),
        heading: fields.text({ label: 'Page heading', defaultValue: 'About Saucy Fields' }),
        intro: fields.text({
          label: 'Intro line',
          multiline: true,
          defaultValue: 'Two friends, a stack of screens, and a soft spot for the local scene.',
        }),
        hero: heroPicker('about', {}),
        founders: fields.array(
          fields.object({
            name: fields.text({ label: 'Name' }),
            role: fields.text({ label: 'Role' }),
            bio: fields.text({ label: 'Bio', multiline: true }),
            photo: fields.image({
              label: 'Photo',
              directory: 'public/images/team',
              publicPath: '/images/team/',
            }),
          }),
          { label: 'Founders', itemLabel: (props) => props.fields.name.value || 'Person' },
        ),
        processHeading: fields.text({ label: 'Process heading', defaultValue: 'How a print happens' }),
        process: fields.array(
          fields.object({
            step: fields.text({ label: 'Step title' }),
            detail: fields.text({ label: 'Detail', multiline: true }),
          }),
          { label: 'Process steps', itemLabel: (props) => props.fields.step.value || 'Step' },
        ),
        story: richText('Story', 'about'),
      },
    }),

    services: singleton({
      label: 'Services page',
      path: 'src/content/services/',
      format: { contentField: 'body' },
      schema: {
        eyebrow: eyebrowField('Custom work'),
        heading: fields.text({ label: 'Page heading', defaultValue: 'Make merch with us' }),
        intro: fields.text({
          label: 'Intro',
          multiline: true,
          defaultValue:
            "Need shirts, posters, or a full merch run? We handle the whole thing — art, print, and delivery — whether it's for a band, a business, or a one-time event.",
        }),
        hero: heroPicker('services', {}),
        offeringsHeading: fields.text({ label: 'Offerings heading', defaultValue: 'What we offer' }),
        offerings: fields.array(
          fields.object({
            title: fields.text({ label: 'Title' }),
            body: fields.text({ label: 'Body', multiline: true }),
          }),
          { label: 'Offerings', itemLabel: (props) => props.fields.title.value || 'Offering' },
        ),
        stepsHeading: fields.text({ label: 'Process heading', defaultValue: 'How it works' }),
        steps: fields.array(
          fields.object({
            title: fields.text({ label: 'Step' }),
            body: fields.text({ label: 'Detail', multiline: true }),
          }),
          { label: 'Steps', itemLabel: (props) => props.fields.title.value || 'Step' },
        ),
        ctaHeading: fields.text({ label: 'CTA heading', defaultValue: 'Let’s talk' }),
        ctaBody: fields.text({
          label: 'CTA body',
          multiline: true,
          defaultValue: 'Send us a note with your project, your timeline, and any art you already have.',
        }),
        body: richText('Extra content (optional)', 'services'),
      },
    }),

    shopPage: singleton({
      label: 'Shop page',
      path: 'src/content/shop/',
      format: { data: 'json' },
      schema: {
        eyebrow: eyebrowField('The shop'),
        heading: fields.text({ label: 'Page heading', defaultValue: "Everything we're printing right now" }),
        intro: fields.text({
          label: 'Intro',
          multiline: true,
          defaultValue: 'Small runs, hand-drawn art. When something sells out we note it — sometimes we reprint.',
        }),
        hero: heroPicker('shop', {}),
      },
    }),

    contactPage: singleton({
      label: 'Contact page',
      path: 'src/content/contact/',
      format: { data: 'json' },
      schema: {
        eyebrow: eyebrowField('Say hi'),
        heading: fields.text({ label: 'Page heading', defaultValue: 'Get in touch' }),
        intro: fields.text({
          label: 'Intro',
          multiline: true,
          defaultValue: "Send an email, reach out on socials, or use the form. We'd love to hear from you.",
        }),
        hero: heroPicker('contact', {}),
      },
    }),
  },
});
