/**
 * Stops the build when two pages say the same thing.
 *
 * A city page earns its ranking only from text genuinely about that city, and a service page
 * only from text genuinely about that appliance. The cheapest way to get either wrong is to
 * copy an existing file and swap the name — the pages then look distinct to a person and
 * identical to a search engine.
 *
 * The comparison therefore strips the subject's own words BEFORE measuring similarity: for a
 * city, its name, state, neighborhoods and nearby cities; for a service, its name and short
 * name. Without that step a file differing only by "Tampa" instead of "Miami", or by "dryer"
 * instead of "washer", would score as different and slip through — which is exactly the case
 * this check exists to catch.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const CITIES_DIR = 'src/content/cities';
const SERVICES_DIR = 'src/content/services';
const APPLIANCE_CARDS_FILE = 'src/content/home/appliances.yaml';

const SIMILARITY_LIMIT = 0.6;

const CITY_RULES = {
  minHeroIntroChars: 300,
  minNeighborhoods: 6,
  minFaq: 4,
  minLocalFaq: 2,
  minConditions: 3,
  maxConditions: 5,
};

const SERVICE_RULES = {
  minIntroChars: 300,
  minRepairOrReplaceChars: 200,
  minProblems: 5,
  maxProblems: 7,
  minWhenToCall: 3,
  minFaq: 4,
  maxFaq: 6,
};

const META_RULES = {
  maxTitleChars: 60,
  minDescriptionChars: 110,
  maxDescriptionChars: 165,
};

const problems = [];

const report = (file, message) => {
  problems.push({ file, message });
};

const readYamlDir = (dir) => {
  let names;
  try {
    names = readdirSync(dir).filter((name) => name.endsWith('.yaml'));
  } catch {
    return [];
  }

  return names.map((name) => ({
    slug: name.replace(/\.yaml$/, ''),
    file: `${dir}/${name}`,
    data: parse(readFileSync(join(dir, name), 'utf8')),
  }));
};

/** Longest first, so "New Haven" is removed before the bare word "Haven" can match. */
const normalizeNouns = (nouns) =>
  nouns
    .filter((noun) => typeof noun === 'string' && noun.length > 1)
    .map((noun) => noun.toLowerCase())
    .sort((left, right) => right.length - left.length);

const cityNouns = (city) =>
  normalizeNouns([
    city.data.name,
    city.data.stateName,
    city.data.state,
    ...(city.data.neighborhoods ?? []),
    ...(city.data.nearbyCities ?? []).map((entry) => entry.name),
  ]);

/**
 * A service's own vocabulary, plus the individual words of its name. "Oven, Stove & Range
 * Repair" has to lose "oven", "stove" and "range" separately, or the merged page would look
 * artificially distinct from every single-appliance page.
 */
const serviceNouns = (service) => {
  const names = [service.data.name, service.data.shortName].filter(Boolean);
  const words = names.flatMap((name) => name.toLowerCase().split(/[^a-z]+/));
  return normalizeNouns([...names, ...words]);
};

const tokenize = (text, properNouns) => {
  let value = String(text ?? '').toLowerCase();
  for (const noun of properNouns) {
    value = value.split(noun).join(' ');
  }
  return value
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
};

const trigramsOf = (tokens) => {
  const grams = new Set();
  for (let index = 0; index + 2 < tokens.length; index += 1) {
    grams.add(`${tokens[index]} ${tokens[index + 1]} ${tokens[index + 2]}`);
  }
  return grams;
};

/**
 * Overlap coefficient rather than Jaccard: a short passage lifted wholesale into a longer
 * one scores 1.0 here, where Jaccard would dilute it below the limit and let it through.
 */
const overlapRatio = (left, right) => {
  if (left.size === 0 || right.size === 0) return 0;
  const [smaller, larger] = left.size <= right.size ? [left, right] : [right, left];
  let shared = 0;
  for (const gram of smaller) {
    if (larger.has(gram)) shared += 1;
  }
  return shared / smaller.size;
};

const sharedExamples = (left, right, limit = 3) => {
  const examples = [];
  for (const gram of left) {
    if (right.has(gram)) examples.push(gram);
    if (examples.length === limit) break;
  }
  return examples;
};

const joinBodies = (entries) =>
  (entries ?? []).map((entry) => `${entry.title} ${entry.body}`).join(' ');

const checkMeta = (entry) => {
  const title = entry.data.metaTitle ?? '';
  const description = entry.data.metaDescription ?? '';

  if (title.length > META_RULES.maxTitleChars) {
    report(
      entry.file,
      `metaTitle is ${title.length} characters. Keep it to ${META_RULES.maxTitleChars} or fewer, ` +
        `or Google will cut it off in the results.`,
    );
  }

  if (
    description.length < META_RULES.minDescriptionChars ||
    description.length > META_RULES.maxDescriptionChars
  ) {
    report(
      entry.file,
      `metaDescription is ${description.length} characters. It should be between ` +
        `${META_RULES.minDescriptionChars} and ${META_RULES.maxDescriptionChars}, and it should ` +
        `end with a reason to call.`,
    );
  }
};

const checkDuplicateMeta = (entries) => {
  const byTitle = new Map();
  const byDescription = new Map();

  for (const entry of entries) {
    const title = entry.data.metaTitle ?? '';
    const description = entry.data.metaDescription ?? '';

    const titleTwin = byTitle.get(title);
    if (titleTwin) {
      report(entry.file, `metaTitle is identical to the one in ${titleTwin}. Every page needs its own.`);
    } else {
      byTitle.set(title, entry.file);
    }

    const descriptionTwin = byDescription.get(description);
    if (descriptionTwin) {
      report(
        entry.file,
        `metaDescription is identical to the one in ${descriptionTwin}. Every page needs its own.`,
      );
    } else {
      byDescription.set(description, entry.file);
    }
  }
};

/** Compares every pair in a collection on the two fields that carry its ranking value. */
const checkPairwiseSimilarity = (fingerprints, fieldLabels) => {
  for (let left = 0; left < fingerprints.length; left += 1) {
    for (let right = left + 1; right < fingerprints.length; right += 1) {
      const first = fingerprints[left];
      const second = fingerprints[right];

      const comparisons = [
        {
          field: fieldLabels.primary,
          left: first.primary,
          right: second.primary,
        },
        {
          field: fieldLabels.secondary,
          left: first.secondary,
          right: second.secondary,
        },
      ];

      for (const comparison of comparisons) {
        const ratio = overlapRatio(comparison.left, comparison.right);
        if (ratio <= SIMILARITY_LIMIT) continue;

        const examples = sharedExamples(comparison.left, comparison.right);
        report(
          `${first.file} and ${second.file}`,
          `${comparison.field} is ${Math.round(ratio * 100)}% the same in "${first.slug}" and ` +
            `"${second.slug}" once the subject's own words are removed. The limit is ` +
            `${Math.round(SIMILARITY_LIMIT * 100)}%. Shared wording includes: ` +
            examples.map((example) => `"${example}"`).join(', ') +
            `. Rewrite one of them so it describes that page's subject specifically.`,
        );
      }
    }
  }
};

const cities = readYamlDir(CITIES_DIR);
const services = readYamlDir(SERVICES_DIR);
const serviceSlugs = new Set(services.map((service) => service.slug));
const citySlugs = new Set(cities.map((city) => city.slug));

// ---------------------------------------------------------------- services

for (const service of services) {
  const { data, file } = service;
  checkMeta(service);

  const intro = String(data.intro ?? '');
  if (intro.length < SERVICE_RULES.minIntroChars) {
    report(
      file,
      `intro is ${intro.length} characters and needs at least ${SERVICE_RULES.minIntroChars}. ` +
        `Say what this appliance actually does in Florida and Connecticut homes.`,
    );
  }

  const repairOrReplace = String(data.repairOrReplace ?? '');
  if (repairOrReplace.length < SERVICE_RULES.minRepairOrReplaceChars) {
    report(
      file,
      `repairOrReplace is ${repairOrReplace.length} characters and needs at least ` +
        `${SERVICE_RULES.minRepairOrReplaceChars}. Give a real rule of thumb by age and cost.`,
    );
  }

  const commonProblems = data.commonProblems ?? [];
  if (
    commonProblems.length < SERVICE_RULES.minProblems ||
    commonProblems.length > SERVICE_RULES.maxProblems
  ) {
    report(
      file,
      `commonProblems has ${commonProblems.length} items. It needs between ` +
        `${SERVICE_RULES.minProblems} and ${SERVICE_RULES.maxProblems}.`,
    );
  }

  const whenToCall = data.whenToCall ?? [];
  if (whenToCall.length < SERVICE_RULES.minWhenToCall) {
    report(
      file,
      `whenToCall has ${whenToCall.length} items and needs at least ` +
        `${SERVICE_RULES.minWhenToCall}. These are the safety boundaries — gas, refrigerant, ` +
        `240-volt circuits, sealed systems.`,
    );
  }

  const faq = data.faq ?? [];
  if (faq.length < SERVICE_RULES.minFaq || faq.length > SERVICE_RULES.maxFaq) {
    report(
      file,
      `faq has ${faq.length} questions. It needs between ${SERVICE_RULES.minFaq} and ` +
        `${SERVICE_RULES.maxFaq}.`,
    );
  }
}

checkPairwiseSimilarity(
  services.map((service) => {
    const nouns = serviceNouns(service);
    return {
      slug: service.slug,
      file: service.file,
      primary: trigramsOf(tokenize(service.data.intro, nouns)),
      secondary: trigramsOf(tokenize(joinBodies(service.data.commonProblems), nouns)),
    };
  }),
  { primary: 'intro', secondary: 'commonProblems' },
);

// ------------------------------------------------------------------ cities

for (const city of cities) {
  const { data, file } = city;
  checkMeta(city);

  const heroIntro = String(data.heroIntro ?? '');
  if (heroIntro.length < CITY_RULES.minHeroIntroChars) {
    report(
      file,
      `heroIntro is ${heroIntro.length} characters and needs at least ` +
        `${CITY_RULES.minHeroIntroChars}. Write about what actually breaks in ` +
        `${data.name ?? 'this city'} and why.`,
    );
  }

  const conditions = data.localConditions ?? [];
  if (
    conditions.length < CITY_RULES.minConditions ||
    conditions.length > CITY_RULES.maxConditions
  ) {
    report(
      file,
      `localConditions has ${conditions.length} items. It needs between ` +
        `${CITY_RULES.minConditions} and ${CITY_RULES.maxConditions}.`,
    );
  }

  const neighborhoods = data.neighborhoods ?? [];
  if (neighborhoods.length < CITY_RULES.minNeighborhoods) {
    report(
      file,
      `neighborhoods lists ${neighborhoods.length} names and needs at least ` +
        `${CITY_RULES.minNeighborhoods}.`,
    );
  }

  const faq = data.faq ?? [];
  if (faq.length < CITY_RULES.minFaq) {
    report(file, `faq has ${faq.length} questions and needs at least ${CITY_RULES.minFaq}.`);
  }

  // At least two questions must genuinely be about this place, not generic filler.
  const placeNames = [
    data.name,
    data.stateName,
    ...neighborhoods,
    ...(data.nearbyCities ?? []).map((entry) => entry.name),
  ]
    .filter(Boolean)
    .map((name) => String(name).toLowerCase());

  const localFaqCount = faq.filter((entry) => {
    const haystack = `${entry.question} ${entry.answer}`.toLowerCase();
    return placeNames.some((name) => haystack.includes(name));
  }).length;

  if (localFaqCount < CITY_RULES.minLocalFaq) {
    report(
      file,
      `only ${localFaqCount} of the FAQ answers mention ${data.name ?? 'this city'}, a ` +
        `neighborhood or a nearby town. At least ${CITY_RULES.minLocalFaq} must be genuinely local.`,
    );
  }

  for (const nearby of data.nearbyCities ?? []) {
    if (nearby.slug && !citySlugs.has(nearby.slug)) {
      report(
        file,
        `nearbyCities points at "${nearby.slug}", but there is no ${CITIES_DIR}/${nearby.slug}.yaml. ` +
          `Remove the slug to keep it as plain text.`,
      );
    }
  }
}

checkPairwiseSimilarity(
  cities.map((city) => {
    const nouns = cityNouns(city);
    return {
      slug: city.slug,
      file: city.file,
      primary: trigramsOf(tokenize(city.data.heroIntro, nouns)),
      secondary: trigramsOf(tokenize(joinBodies(city.data.localConditions), nouns)),
    };
  }),
  { primary: 'heroIntro', secondary: 'localConditions' },
);

// ------------------------------------------------- homepage appliance grid

/**
 * The grid is the only route into the service pages, so a card pointing at a file that does
 * not exist would quietly orphan a page. Astro validates this too, but failing here gives the
 * client the message before the framework does.
 */
const applianceCards = (() => {
  try {
    return parse(readFileSync(APPLIANCE_CARDS_FILE, 'utf8')).cards ?? [];
  } catch {
    return [];
  }
})();

const linkedServices = new Set();
for (const card of applianceCards) {
  if (!serviceSlugs.has(card.service)) {
    report(
      APPLIANCE_CARDS_FILE,
      `the card labelled "${card.label}" points at "${card.service}", but there is no ` +
        `${SERVICES_DIR}/${card.service}.yaml.`,
    );
    continue;
  }
  linkedServices.add(card.service);
}

for (const slug of serviceSlugs) {
  if (!linkedServices.has(slug)) {
    report(
      APPLIANCE_CARDS_FILE,
      `${SERVICES_DIR}/${slug}.yaml has a page but no card points at it, so nothing on the site ` +
        `links to it. Add a card, or delete the service file.`,
    );
  }
}

checkDuplicateMeta([...cities, ...services]);

if (problems.length > 0) {
  console.error('\nContent check failed. The site was not built.\n');
  for (const problem of problems) {
    console.error(`  ${problem.file}`);
    console.error(`    ${problem.message}\n`);
  }
  console.error(
    `${problems.length} problem(s) found. Fix them in the content files and commit again — ` +
      `the live site is untouched until the build passes.\n`,
  );
  process.exit(1);
}

console.log(
  `Content check passed: ${cities.length} city page(s), ${services.length} service page(s), ` +
    `${applianceCards.length} appliance card(s), no near-duplicates.`,
);
