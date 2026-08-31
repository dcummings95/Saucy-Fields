import { config, collection, singleton, fields } from '@keystatic/core';

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
 * To test GitHub mode locally, temporarily force `kind: 'github'` below.
 */
const GITHUB_REPO = 'dcummings95/saucy-fields' as const;

const storage = import.meta.env.DEV
  ? ({ kind: 'local' } as const)
  : ({ kind: 'github', repo: GITHUB_REPO } as const);

const productImage = (label: string) =>
  fields.image({
    label,
    directory: 'public/images/products',
    publicPath: '/images/products/',
    validation: { isRequired: false },
  });

export default config({
  storage,
  ui: {
    brand: { name: 'Saucy Fields' },
    navigation: {
      Shop: ['products'],
      Pages: ['homepage', 'about', 'services', 'pages'],
      Settings: ['siteSettings'],
    },
  },
  collections: {
    products: collection({
      label: 'Products',
      slugField: 'name',
      path: 'src/content/products/*/',
      format: { contentField: 'description' },
      entryLayout: 'content',
      columns: ['name', 'price', 'status'],
      schema: {
        name: fields.slug({
          name: { label: 'Product name' },
          slug: {
            label: 'URL slug',
            description: 'The /shop/... address. Change with care once a product is public.',
          },
        }),
        band: fields.text({
          label: 'Band / business / artist',
          description: 'Who is this for? Shows on the product card and drives the shop filter. Leave blank for Saucy Fields originals.',
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
        price: fields.number({
          label: 'Price (USD)',
          description: 'Dollars, e.g. 25 or 15.5',
          validation: { isRequired: true, min: 0 },
        }),
        compareAtPrice: fields.number({
          label: 'Compare-at price (USD)',
          description: 'Optional. Shows a struck-through "was" price for sales.',
        }),
        status: fields.select({
          label: 'Status',
          options: [
            { label: 'Available', value: 'available' },
            { label: 'Pre-sale', value: 'presale' },
            { label: 'Sold out', value: 'soldout' },
          ],
          defaultValue: 'available',
        }),
        featured: fields.checkbox({
          label: 'Feature on homepage',
          defaultValue: false,
        }),
        shortDescription: fields.text({
          label: 'Short description',
          description: 'One line shown on shop cards.',
          multiline: true,
        }),
        images: fields.array(
          fields.object({
            src: productImage('Image'),
            alt: fields.text({ label: 'Alt text', description: 'Describe the image for screen readers.' }),
          }),
          {
            label: 'Images',
            itemLabel: (props) => props.fields.alt.value || 'Image',
          },
        ),
        sizes: fields.array(fields.text({ label: 'Size' }), {
          label: 'Sizes',
          description: 'e.g. S, M, L, XL. Leave empty for one-size items like posters.',
          itemLabel: (props) => props.value,
        }),
        colors: fields.array(fields.text({ label: 'Color' }), {
          label: 'Colors',
          description: 'Optional colour options.',
          itemLabel: (props) => props.value,
        }),
        description: fields.markdoc({
          label: 'Full description',
        }),
        seoDescription: fields.text({
          label: 'SEO description',
          description: 'Optional. Overrides the short description in search results / link previews.',
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
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        description: fields.text({
          label: 'Short description',
          description: 'Used for the browser tab and link previews.',
          multiline: true,
        }),
        showInFooter: fields.checkbox({ label: 'Link from the site footer', defaultValue: true }),
        content: fields.markdoc({ label: 'Body' }),
      },
    }),
  },

  singletons: {
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
        heading: fields.text({ label: 'Page heading', defaultValue: 'About Saucy Fields' }),
        intro: fields.text({
          label: 'Intro line',
          multiline: true,
          defaultValue: 'Two friends, a stack of screens, and a soft spot for the local scene.',
        }),
        image: fields.image({
          label: 'Photo',
          // Own directory: Keystatic names saved images after the field key, so
          // keeping this apart from the homepage hero avoids any filename clash.
          directory: 'public/images/about',
          publicPath: '/images/about/',
        }),
        imageAlt: fields.text({ label: 'Photo alt text', defaultValue: 'Isaac and Spencer of Saucy Fields' }),
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
        story: fields.markdoc({ label: 'Story' }),
      },
    }),

    services: singleton({
      label: 'Services page',
      path: 'src/content/services/',
      format: { contentField: 'body' },
      schema: {
        heading: fields.text({ label: 'Page heading', defaultValue: 'Make merch with us' }),
        intro: fields.text({
          label: 'Intro',
          multiline: true,
          defaultValue:
            "Need shirts, posters, or a full merch run? We handle the whole thing — art, print, and delivery — whether it's for a band, a business, or a one-time event.",
        }),
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
        body: fields.markdoc({ label: 'Extra content (optional)' }),
      },
    }),
  },
});
