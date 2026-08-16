import { getCollection, getEntry } from 'astro:content';

/**
 * Collections scoped to a single file always resolve, but getEntry is typed as possibly
 * undefined — a missing file should stop the build with a sentence the client can act on,
 * not a null reference deep inside a template.
 *
 * Each collection is fetched by its own literal name rather than through a shared generic,
 * because a generic over the collection name collapses the four different shapes into one
 * union and every field access then fails to type-check.
 */
const requireEntry = <TEntry>(entry: TEntry | undefined, file: string): TEntry => {
  if (!entry) {
    throw new Error(`Missing content file ${file} — the page cannot render without it.`);
  }
  return entry;
};

export const loadSiteCopy = async () => {
  const [brand, navigation, legal, pages] = await Promise.all([
    getEntry('brand', 'brand'),
    getEntry('navigation', 'navigation'),
    getEntry('legal', 'legal'),
    getEntry('pages', 'pages'),
  ]);

  return {
    brand: requireEntry(brand, 'src/content/site/brand.yaml').data,
    navigation: requireEntry(navigation, 'src/content/site/navigation.yaml').data,
    legal: requireEntry(legal, 'src/content/site/legal.yaml').data,
    pages: requireEntry(pages, 'src/content/site/pages.yaml').data,
  };
};

export type SiteCopy = Awaited<ReturnType<typeof loadSiteCopy>>;

/** The six approved homepage blocks, each stored in its own file under content/home. */
export const loadHomeCopy = async () => ({
  hero: requireEntry(await getEntry('homeHero', 'hero'), 'src/content/home/hero.yaml').data,
  preEstimate: requireEntry(
    await getEntry('homePreEstimate', 'pre-estimate'),
    'src/content/home/pre-estimate.yaml',
  ).data,
  howItWorks: requireEntry(
    await getEntry('homeHowItWorks', 'how-it-works'),
    'src/content/home/how-it-works.yaml',
  ).data,
  differentiation: requireEntry(
    await getEntry('homeDifferentiation', 'differentiation'),
    'src/content/home/differentiation.yaml',
  ).data,
  ctaBand: requireEntry(await getEntry('homeCtaBand', 'cta-band'), 'src/content/home/cta-band.yaml')
    .data,
  appliances: requireEntry(
    await getEntry('homeAppliances', 'appliances'),
    'src/content/home/appliances.yaml',
  ).data,
  serviceAreas: requireEntry(
    await getEntry('homeServiceAreas', 'service-areas'),
    'src/content/home/service-areas.yaml',
  ).data,
});

/** Services in the order the content files ask for, used by the grid and the index page. */
export const loadServices = async () => {
  const services = await getCollection('services');
  return services.sort((a, b) => a.data.order - b.data.order);
};

/** Cities sorted by state then name, so every list on the site reads the same way. */
export const loadCities = async () => {
  const cities = await getCollection('cities');
  return cities.sort((a, b) => {
    const byState = a.data.state.localeCompare(b.data.state);
    return byState === 0 ? a.data.name.localeCompare(b.data.name) : byState;
  });
};

export type CityEntry = Awaited<ReturnType<typeof loadCities>>[number];
export type ServiceEntry = Awaited<ReturnType<typeof loadServices>>[number];

/** The shape lib/schema.ts needs to describe an area served, with no content types leaking in. */
export const cityRefs = (cities: CityEntry[]) =>
  cities.map((city) => ({ name: city.data.name, stateName: city.data.stateName }));

/** Groups cities under their state for the locations index and the footer. */
export const groupCitiesByState = (cities: CityEntry[]) => {
  const groups = new Map<string, { stateName: string; cities: CityEntry[] }>();

  for (const city of cities) {
    const group = groups.get(city.data.state);
    if (group) {
      group.cities.push(city);
      continue;
    }
    groups.set(city.data.state, { stateName: city.data.stateName, cities: [city] });
  }

  return [...groups.entries()].map(([state, group]) => ({ state, ...group }));
};
