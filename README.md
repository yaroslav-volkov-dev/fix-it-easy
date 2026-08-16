# FIX IT EASY — appliance repair website

A static, content-driven lead-generation site for an appliance repair service operating in
Florida and Connecticut. The only conversion action is a phone call: there are no forms, no
cookies, no third-party trackers and no client-side JavaScript.

For the client-facing guide to changing text, see [EDITING.md](./EDITING.md).

---

## Requirements

- Node.js 20.3 or newer (built and verified on 24.11)

## Install, develop, build

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # runs every guard, then builds to dist/
npm run preview    # serves dist/ exactly as Cloudflare will
```

`npm run build` is a pipeline, and each step can stop it:

| Step | What it does |
|---|---|
| `check:content` | Rejects near-duplicate city pages and thin or malformed content |
| `check:copy` | Rejects any user-visible English string written inside a component |
| `astro check` | Type-checks every `.astro` and `.ts` file under `strict` |
| `astro build` | Renders the static site into `dist/` |
| `emit:deploy` | Writes `dist/robots.txt` and `dist/_headers` for the target environment |
| `check:production` | On a production build only: refuses placeholder or unapproved content |

## Environment

Copy `.env.example` to `.env`. Three variables, all build-time only:

- `SITE_ENV` — `production` or anything else. Anything other than `production` is treated as
  a preview: `robots.txt` disallows everything, `_headers` sends `X-Robots-Tag: noindex`,
  every page carries a `noindex` meta tag and the analytics beacon is omitted.
- `PUBLIC_SITE_URL` — the canonical origin. Every canonical link, the sitemap and the JSON-LD
  graph derive from it.
- `PUBLIC_CF_BEACON_TOKEN` — Cloudflare Web Analytics. The script tag is emitted only when
  this is set **and** `SITE_ENV=production`.

## Deploy

```bash
SITE_ENV=production PUBLIC_SITE_URL=https://<the-real-domain> npm run build
npm run deploy     # wrangler deploy — needs `wrangler login` once
```

Output directory is `dist/`. `wrangler.jsonc` declares static assets only — there is no
`main` entry, so no Worker code runs and no request is billed as a Worker invocation.

**Preview builds must never be indexed.** Because the site is served without a Worker, there
is no request-time place to inspect the `Host` header, and adding a Worker purely for that
would put every page view onto paid, rate-limited request handling. The decision is therefore
made once at build time from `SITE_ENV` and applied three independent ways: `robots.txt`,
the `X-Robots-Tag` header in `_headers`, and the `robots` meta tag. See
`scripts/emit-deploy-files.mjs`.

---

## Architecture

### Routes

```
/
/services/refrigerator-repair/
/services/freezer-repair/
/services/washer-repair/
/services/dryer-repair/
/services/dishwasher-repair/
/services/oven-stove-range-repair/
/services/microwave-repair/
/services/wine-cooler-repair/
/locations/
/locations/tampa/
/locations/fort-lauderdale/
/locations/stamford/
/locations/new-haven/
/privacy-policy/
/terms-of-service/
/sitemap/
/404.html
```

Eighteen pages. **There is no `/services/` landing page** — the appliance grid in homepage
block 6 is the only entry point into the service pages from the body of the site, with a
footer column as the secondary route. The header links to service areas only.

### Layout

```
src/
  content.config.ts        Zod schemas — the contract for every content file
  content/
    site/                  brand, navigation, legal, index-page copy
    home/                  one file per approved homepage block
    services/              one file per appliance page (8)
    cities/                one file per city (4)
  lib/
    phone.ts               formats the number; the number itself is in brand.yaml
    seo.ts                 canonical URLs, social card metadata
    schema.ts              JSON-LD builders + the forbidden-property guard
    site.ts                loads and groups content
    interpolate.ts         fills {city} / {service} in heading templates
  components/{layout,ui,sections}/
  layouts/                 base-layout, legal-layout
  pages/
scripts/
  check-content-uniqueness.mjs
  check-no-hardcoded-copy.mjs
  check-production-ready.mjs
  emit-deploy-files.mjs
  build-brand-images.mjs   one-off: regenerates public/logo.png and public/og-default.png
```

### Eleven cards, eight pages

Homepage block 6 keeps the client's approved appliance list verbatim and in order:
refrigerator, freezer, dryer, washer, dishwasher, oven, stove, range, cook top, microwave,
wine cooler. Four of those words — oven, stove, range and cook top — lead to the same
combined page, because they describe overlapping equipment and three near-identical pages
would compete with each other for the same queries.

Which label points where is decided in `src/content/home/appliances.yaml`, not in a
component. The words are stored in the client's own lower case and capitalised by CSS, so
nothing renames the approved copy in passing.

### Service page template

Every service page carries the same seven sections, in this order: the H1, an intro tying
the appliance to Florida and Connecticut conditions, `commonProblems` (5–7 concrete symptoms
with their likely cause), `whenToCall` (the safety boundaries — gas, refrigerant, 240-volt
circuits, sealed systems), `repairOrReplace` (a rule of thumb by age and cost share), the
FAQ, and the shared call band.

Its breadcrumb is two levels — Home, then the service — and it links to no city page. The
city-by-service page combination (`/locations/{city}/{service}/`) is deliberately not built.

### Everything a visitor reads comes from a content file

No user-visible English string may live in a component. Section headings that mention a city
or a service are stored as templates (`Why homeowners in {city} call us`) and filled in by
`lib/interpolate.ts`. `check:copy` enforces this by stripping frontmatter, comments, tags,
attributes and `{expressions}` from every `.astro` file and failing on whatever prose is
left. Justified exceptions live in `scripts/copy-allowlist.json`.

### The uniqueness guard is the point of the build

A city page ranks only on text genuinely written for that city, and a service page only on
text genuinely written for that appliance. The cheapest way to get either wrong is to copy a
file and swap the names — which looks distinct to a person and identical to a search engine.

`check-content-uniqueness.mjs` therefore **strips the subject's own words before comparing**:
for a city its name, state, neighborhoods and nearby cities; for a service its name and short
name, including the individual words of a compound name so the merged oven/stove/range page
cannot look artificially distinct. It then measures token-trigram overlap between every pair
within each collection — `heroIntro` and `localConditions` for cities, `intro` and
`commonProblems` for services. Above 60% the build fails, naming both files and quoting the
shared wording.

Verified: pasting Tampa's `heroIntro` into `fort-lauderdale.yaml` with the city, county and
bay renamed still scores 97% and is rejected.

It uses the overlap coefficient rather than Jaccard: a short passage lifted wholesale into a
longer one scores 1.0, where Jaccard would dilute it below the threshold.

The same script also enforces the per-page minimums (intro length, section counts, at least
two genuinely local FAQ answers per city), checks that no two pages share a meta title or
description, and — because the homepage grid is the only route into the service pages —
fails if a card points at a missing service file or if a service file has no card pointing
at it and would therefore be orphaned.

### The legal constraints are build failures, not conventions

The brand has no registered address, no license number and no collected reviews.

- `lib/schema.ts` walks every JSON-LD graph before serialising it and throws on `address`,
  `aggregateRating`, `review`, `ratingValue`, `priceRange`, `taxID` and on the `LocalBusiness`
  and `PostalAddress` types — at any depth. Verified against all four cases.
- `check-production-ready.mjs` blocks a production build while the phone number is the
  placeholder, while any city is still `reviewStatus: draft`, or while the legal pages still
  show the "awaiting attorney" notice.

### Zero JavaScript

The FAQ accordion is `<details>`/`<summary>`. There is no mobile menu to open — with two
destinations the links simply wrap onto a second row. `dist/` contains no `.js` file at all;
the only `<script>` in the HTML is the JSON-LD block.

### Branding

The logo exists in two cuts, both redrawn as SVG from the client's artwork:

- **`brand-badge.astro`** — the complete badge: ring, gabled roof with the red chimney and the
  four-pane window, the FIX IT EASY wordmark, APPLIANCE REPAIR between two red rules, the
  wrench roundel and the SAME DAY SERVICE banner curving across the foot. It appears at full
  size in the footer of every page. The words are live SVG text pulled from `brand.yaml`, so
  they stay sharp at any size and the client can still edit them.
- **`brand-mark.astro`** — the compact cut used in the header beside the HTML wordmark: ring,
  roof, chimney, window and the wrench roundel. Only the wordmark and the banner are dropped,
  because the HTML wordmark sits right next to it and banner text is illegible at that size.

  Its proportions deliberately differ from the full badge. There the roundel sits below three
  lines of type, so it can be small — about 13% of the badge diameter, which at a 44-pixel
  header mark would be six pixels of wrench and therefore no wrench at all. Here the type is
  gone, so the roof is raised and the roundel enlarged until the wrench still reads. Ten
  arrangements were drawn and compared at 44, 64 and 160 pixels before this one was chosen.

  The wrench itself stands upright in both compact cuts, while the full badge keeps it at the
  angle the client's logo uses. Rotated, a small wrench loses its silhouette to antialiasing
  and reads as a blob; upright, the jaw, the ring and the handle each land on their own pixels.

- **`public/favicon.svg`** — the header mark unchanged: same roof, chimney, window, roundel
  and wrench at the same proportions. Two adjustments concern only the tab: a white disc
  behind it, because a navy ring on transparent all but disappears against a dark tab strip,
  and a thicker ring, because a 6-unit stroke lands on well under one pixel at 16. Verified by
  rasterising at 16, 32 and 48 over both a light and a dark background and looking at the
  actual pixel grid.

`scripts/build-brand-images.mjs` rebuilds the badge a third time to produce `public/logo.png`
and `public/og-default.png`. It is a separate copy on purpose: the rasteriser inside sharp is
not a browser — it ignores `textLength` and does not implement `textPath` at all, so the
script sets explicit Arial-fitted font sizes and places the banner letters along the arc one
at a time. Those two PNGs are committed, so a Cloudflare build never renders a font.

Replacing the mark with an original vector therefore means those three places, and nothing else.

### Fonts and images

One self-hosted variable font (Inter, latin subset, 48 KB) vendored from
`@fontsource-variable/inter` into `src/assets/fonts/` and wired through Astro's fonts API,
which emits the preload link and a metric-matched fallback so the font swap causes no layout
shift. No font CDN is contacted at build time or at runtime.

There are no photographs. The client supplied none, and stock photos of "our technicians"
would be the same false trust signal the brief rules out. The hero is text, which also makes
it the fastest possible LCP element. Icons are inline SVG. Slots for real client photography
are open whenever they arrive.

---

## Adding a city

1. Copy the closest existing file in `src/content/cities/` to `<new-city>.yaml`.
2. Rewrite `heroIntro`, `localConditions`, `neighborhoods`, `nearbyCities` and `faq` for that
   city. Minimums: 300 characters, 3–5 conditions, 6 neighborhoods, 4 questions of which at
   least 2 name the city or one of its neighborhoods.
3. `npm run build`. If the text is too close to an existing city, the guard says so.
4. Once the client confirms the copy, set `reviewStatus: approved`.

The page, the menus, the site map, the sitemap XML and the internal links follow automatically.

## Adding a service

1. Copy the closest existing file in `src/content/services/` to `<slug>.yaml`.
2. Rewrite `intro` (300+ characters, tied to Florida and Connecticut), `commonProblems` (5–7),
   `whenToCall` (3+ safety boundaries), `repairOrReplace` (200+ characters) and `faq` (4–6).
3. **Add a card for it in `src/content/home/appliances.yaml`.** That grid is the only route
   into the service pages, so a page without a card is orphaned — and the build says so.
4. `npm run build`. If the text is too close to an existing service, the guard names both.

---

## Measured results

Lighthouse 12.8.2, mobile, against `npm run preview` of a production build:

| Page | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT | Weight |
|---|---|---|---|---|---|---|---|---|
| `/` | 100 | 100 | 100 | 100 | 1.2 s | 0 | 0 ms | 60 KiB |
| `/locations/tampa/` | 100 | 100 | 100 | 100 | 1.2 s | 0 | 0 ms | 61 KiB |
| `/services/oven-stove-range-repair/` | 100 | 100 | 100 | 100 | 1.2 s | 0 | 0 ms | 62 KiB |

No audit fails on any of the three. On a preview build the SEO category drops to 66 by
design — the only failing audit is `is-crawlable`, which is exactly what the noindex
switch is for.

Contrast ratios, all measured rather than eyeballed:

| Pair | Ratio | Use |
|---|---|---|
| white on `#1c2c4c` navy | 13.9 : 1 | text on dark bands |
| white on `#d0202b` red | 5.4 : 1 | primary button label |
| white on `#a8161f` red | 7.5 : 1 | button hover |
| `#3f4a5a` grey on white | 9.0 : 1 | body copy |
| `#f2666f` on navy | 4.6 : 1 | the only red allowed as text on a dark band |

Brand red is 2.59 : 1 against navy, so it is never used as text there, and a red button on a
navy band carries a light hairline border to keep the control boundary above the 3 : 1 that
WCAG 1.4.11 requires.

---

## Open questions for the client

1. **Phone number.** `src/content/site/brand.yaml` holds the placeholder `+1 (000) 000-0000`.
   A production build refuses to run until it is replaced.
2. **Domain.** Not registered. The site currently targets `fix-it-easy.workers.dev` with
   indexing fully disabled. Set `PUBLIC_SITE_URL` when the real domain exists.
   *Note:* §12 of the brief said `pages.dev`. That subdomain belongs to Cloudflare Pages;
   deploying static assets with `wrangler`, as the same section requires, gives a
   `workers.dev` subdomain instead. The noindex switch covers either.
3. **Privacy policy and terms of service.** Awaiting the client's attorney. Both pages carry a
   visible placeholder, are excluded from the sitemap and are `noindex`. No legal text was
   generated.
4. **Cloudflare Web Analytics token.** Not supplied. Worth deciding: the beacon is ~5 KB of
   third-party JavaScript, and once a real zone exists the same analytics can be switched on
   from the Cloudflare dashboard with no tag in the HTML at all — which would keep the site at
   literally zero JavaScript.
5. **City copy.** All four cities are `reviewStatus: draft`. They were written in-house from
   the reference notes in the brief plus publicly verifiable geography (neighborhood and
   nearby-city names). Nothing about the business itself was invented, but the client must
   confirm the operational claims before launch. A production build blocks until they do.
6. **Original vector logo.** The badge is redrawn as SVG from the supplied image, with the
   colours sampled from it. If the original vector exists it is worth dropping in — see
   *Branding* below for the three places it would replace.
7. **Photography.** None supplied, none invented.
8. **Garbage disposal repair.** A `garbage-disposal-repair` page was specified but the
   appliance is **not** in the client's approved list, so it has not been built. Confirm
   whether the company actually services garbage disposals; if so, the page is one content
   file plus one card in `src/content/home/appliances.yaml`.

### Resolved

- **Thin-duplicate risk across `stove`, `range` and `cook top`** — flagged and now closed.
  The three merged into a single `oven-stove-range-repair` page, with all four homepage words
  (oven, stove, range, cook top) pointing at it. The client's approved wording on the
  homepage is unchanged.
- **The service pages were never in the client's own message.** The client's brief asked for
  a list of appliances and a multi-page site "for different cities"; per-appliance pages came
  from the written spec that followed. They are kept because searches run on the appliance —
  someone with a broken refrigerator types "refrigerator repair near me", not "appliance
  repair" — but the origin is worth knowing.

### Resolved from the brief

- **"Average response time: 10-20 minutes"** was flagged in the brief as ambiguous, since it
  reads as time-to-arrival. The client confirmed it means time to respond, not to arrive, and
  the wording already says "response time". It ships as approved, verbatim.
- **Content file format.** The brief's §13 mentioned a `---` frontmatter block. Every field in
  the schema is structured data with no article body, so the content files are plain YAML
  instead — the same syntax without the fences and without an empty body inviting text that
  would never be rendered. `EDITING.md` explains indentation in place of the fences.
- **Content config location.** `src/content.config.ts`, not `src/content/config.ts`. The
  latter is the Astro 4 layout and would run the collections in legacy mode.
- **`robots.txt`.** Generated into `dist/` by `emit-deploy-files.mjs` rather than kept static
  in `public/`, because its contents depend on `SITE_ENV` and its `Sitemap:` line depends on
  `PUBLIC_SITE_URL`.
