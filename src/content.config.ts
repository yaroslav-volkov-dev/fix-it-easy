import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
// Imported from astro/zod rather than astro:content: the virtual module re-exports `z` as
// a value only, so `z.ZodRawShape` below would not resolve as a type.
import { z } from 'astro/zod';

/**
 * Every user-visible string on this site lives in a content file, never in a component.
 * The schemas below are the contract: a missing or too-short field fails the build with
 * the file name and the field, instead of silently rendering an empty section.
 */

const SITE_DIR = './src/content/site';
const HOME_DIR = './src/content/home';

/**
 * Most global copy is a single object rather than a list of entries. A collection scoped
 * to exactly one file gives that object a schema and keeps the editing experience uniform:
 * the client opens a YAML file, changes a value, commits.
 */
const singleton = <TShape extends z.ZodRawShape>(base: string, file: string, shape: TShape) =>
  defineCollection({
    loader: glob({ base, pattern: file }),
    schema: z.object(shape),
  });

/**
 * Illustration keys. The homepage grid keeps the client's eleven appliance words, while the
 * service pages behind them number eight — oven, stove, range and cook top all resolve to
 * the same combined page — so the icon list is longer than the list of services.
 */
const APPLIANCE_ICONS = [
  'refrigerator',
  'freezer',
  'dryer',
  'washer',
  'dishwasher',
  'oven',
  'stove',
  'range',
  'cooktop',
  'microwave',
  'wine-cooler',
] as const;

const questionAnswer = z.object({
  question: z.string().min(10),
  answer: z.string().min(40),
});

const titledParagraph = z.object({
  title: z.string().min(3),
  body: z.string().min(60),
});

/** A call to action always resolves to the phone number — the site has no forms. */
const callToAction = z.object({
  label: z.string().min(3),
  note: z.string().optional(),
});

const brand = singleton(SITE_DIR, 'brand.yaml', {
  name: z.string().min(2),
  tagline: z.string().min(5),
  logoAlt: z.string().min(5),
  /** The logo splits the name across two colours, so the split lives in content too. */
  wordmark: z.object({
    lead: z.string().min(2),
    accent: z.string().min(2),
    sub: z.string().min(5),
    /** The curved banner across the foot of the full badge. */
    ribbon: z.string().min(5),
  }),
  /** Single source of truth for the phone number. lib/phone.ts only formats it. */
  phone: z.string().regex(/^\+1 \(\d{3}\) \d{3}-\d{4}$/, 'Use the format +1 (555) 123-4567'),
  htmlLang: z.string().min(2),

  skipLinkLabel: z.string().min(3),
  menuLabel: z.string().min(3),
  menuAriaLabel: z.string().min(3),
  breadcrumbHomeLabel: z.string().min(2),
  breadcrumbAriaLabel: z.string().min(3),

  callBarLabel: z.string().min(3),
  callBarNote: z.string().min(3),

  cityHeroTitleTemplate: z.string().includes('{city}').includes('{state}'),
  cityConditionsHeadingTemplate: z.string().includes('{city}'),
  cityAreasHeadingTemplate: z.string().includes('{city}'),
  cityNeighborhoodsLabel: z.string().min(3),
  cityNearbyLabel: z.string().min(3),
  cityFaqHeadingTemplate: z.string().includes('{city}'),

  serviceProblemsHeading: z.string().min(3),
  serviceWhenToCallHeading: z.string().min(3),
  serviceRepairOrReplaceHeading: z.string().min(3),
  serviceFaqHeadingTemplate: z.string().includes('{service}'),
});

const navigationLink = z.object({
  label: z.string().min(2),
  href: z.string().startsWith('/'),
});

const navigation = singleton(SITE_DIR, 'navigation.yaml', {
  /**
   * Deliberately short. The service pages are reached from the homepage grid and the footer,
   * not from the header, so this list carries only the browsable sections of the site.
   */
  main: z.array(navigationLink).min(1),
  footerGroups: z
    .array(
      z.object({
        heading: z.string().min(2),
        links: z.array(navigationLink).min(1),
      }),
    )
    .min(2),
});

const legal = singleton(SITE_DIR, 'legal.yaml', {
  trademarkDisclaimer: z.string().min(60),
  copyrightTemplate: z.string().includes('{year}'),
  serviceAreaSummary: z.string().min(20),
  /**
   * Legal text comes from the client's attorney. Until then the pages carry a visible
   * placeholder and stay out of the sitemap and the index.
   */
  pages: z
    .array(
      z.object({
        slug: z.enum(['privacy-policy', 'terms-of-service']),
        title: z.string().min(5),
        metaTitle: z.string().min(10),
        metaDescription: z.string().min(50),
        status: z.enum(['awaiting-attorney', 'approved']).default('awaiting-attorney'),
        placeholderHeading: z.string().min(10),
        placeholderBody: z.string().min(60),
      }),
    )
    .length(2),
});

const indexPageCopy = z.object({
  title: z.string().min(5),
  metaTitle: z.string().min(10).max(60),
  metaDescription: z.string().min(110).max(165),
  intro: z.string().min(80),
});

const pages = singleton(SITE_DIR, 'pages.yaml', {
  locationsIndex: indexPageCopy.extend({
    stateHeadingTemplate: z.string().includes('{state}'),
  }),
  humanSitemap: indexPageCopy.extend({
    sections: z.object({
      main: z.string().min(3),
      services: z.string().min(3),
      locations: z.string().min(3),
      legal: z.string().min(3),
    }),
  }),
  notFound: z.object({
    title: z.string().min(5),
    metaTitle: z.string().min(10).max(60),
    body: z.string().min(40),
    backLabel: z.string().min(3),
  }),
});

const homeHero = singleton(HOME_DIR, 'hero.yaml', {
  metaTitle: z.string().min(10).max(60),
  metaDescription: z.string().min(110).max(165),
  headline: z.string().min(20),
  /**
   * "Average response time: 10-20 minutes" was flagged in the brief as ambiguous.
   * The client confirmed it means time to respond, not time to arrive. See README.
   */
  benefits: z.array(z.string().min(5)).min(3).max(5),
  cta: callToAction,
});

const homePreEstimate = singleton(HOME_DIR, 'pre-estimate.yaml', {
  heading: z.string().min(10),
  /** A promise about the phone call. Deliberately not a calculator and not a form. */
  promises: z.array(z.string().min(10)).min(3),
  cta: callToAction,
});

const homeHowItWorks = singleton(HOME_DIR, 'how-it-works.yaml', {
  heading: z.string().min(10),
  steps: z.array(z.string().min(10)).min(4).max(8),
});

const homeDifferentiation = singleton(HOME_DIR, 'differentiation.yaml', {
  heading: z.string().min(10),
  body: z.string().min(60),
});

const homeCtaBand = singleton(HOME_DIR, 'cta-band.yaml', {
  heading: z.string().min(10),
  body: z.string().min(20),
  cta: callToAction,
});

const homeAppliances = singleton(HOME_DIR, 'appliances.yaml', {
  heading: z.string().min(10),
  intro: z.string().min(40),
  /**
   * The client's approved appliance list, in the client's own words and order. Several
   * labels point at the same page: one visitor calls it a range, the next calls it a stove,
   * and both should land somewhere that answers them.
   *
   * This grid is the only way into the service pages from the body of the site.
   */
  cards: z
    .array(
      z.object({
        label: z.string().min(3),
        icon: z.enum(APPLIANCE_ICONS),
        service: reference('services'),
      }),
    )
    .min(6),
});

const homeServiceAreas = singleton(HOME_DIR, 'service-areas.yaml', {
  heading: z.string().min(10),
  intro: z.string().min(40),
  allLocationsLabel: z.string().min(3),
});

const services = defineCollection({
  loader: glob({ base: './src/content/services', pattern: '**/*.yaml' }),
  schema: z.object({
    name: z.string().min(5),
    shortName: z.string().min(3),
    metaTitle: z.string().min(10).max(60),
    metaDescription: z.string().min(110).max(165),
    /** Ties the appliance to what Florida and Connecticut homes actually do to it. */
    intro: z.string().min(300),
    commonProblems: z.array(titledParagraph).min(5).max(7),
    /** Safety boundaries: gas, refrigerant, 240-volt circuits, sealed systems. */
    whenToCall: z.array(titledParagraph).min(3),
    repairOrReplace: z.string().min(200),
    faq: z.array(questionAnswer).min(4).max(6),
    order: z.number().int().positive(),
    icon: z.enum(APPLIANCE_ICONS),
  }),
});

const cities = defineCollection({
  loader: glob({ base: './src/content/cities', pattern: '**/*.yaml' }),
  schema: z.object({
    name: z.string().min(2),
    state: z.enum(['FL', 'CT']),
    stateName: z.string().min(5),
    metaTitle: z.string().min(10).max(60),
    metaDescription: z.string().min(110).max(165),
    /**
     * The four fields below carry the whole ranking value of a city page. They must be
     * genuinely different city to city — scripts/check-content-uniqueness.mjs compares
     * every pair and fails the build above 60% similarity.
     */
    heroIntro: z.string().min(300),
    localConditions: z.array(titledParagraph).min(3).max(5),
    neighborhoods: z.array(z.string().min(2)).min(6),
    nearbyCities: z
      .array(
        z.object({
          name: z.string().min(2),
          slug: z.string().optional(),
        }),
      )
      .min(3),
    faq: z.array(questionAnswer).min(4),
    /**
     * Kept for reference but no longer rendered: a city page now links only to its nearby
     * cities, so the city-by-service link mesh does not exist. Services stay reachable from
     * the homepage grid and the footer.
     */
    featuredServices: z.array(reference('services')).min(3).optional(),
    /**
     * Copy drafted in-house starts as a draft. A production build refuses to ship a city
     * the client has not confirmed — see scripts/check-production-ready.mjs.
     */
    reviewStatus: z.enum(['draft', 'approved']).default('draft'),
  }),
});

export const collections = {
  brand,
  navigation,
  legal,
  pages,
  homeHero,
  homePreEstimate,
  homeHowItWorks,
  homeDifferentiation,
  homeCtaBand,
  homeAppliances,
  homeServiceAreas,
  services,
  cities,
};
