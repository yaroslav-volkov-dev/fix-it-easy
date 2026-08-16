/**
 * JSON-LD builders.
 *
 * The brand has no registered address, no license number and no collected reviews, so a
 * LocalBusiness node — which requires an address — must never be emitted, and neither must
 * any rating or review property. That is a legal constraint, not a style preference, so it
 * is enforced by assertNoForbiddenNodes() below: every graph is walked before it is
 * serialised and the build throws if a forbidden property ever appears.
 */

type JsonLdValue = string | number | boolean | null | JsonLdNode | Array<JsonLdValue>;
export type JsonLdNode = { [key: string]: JsonLdValue | undefined };

const FORBIDDEN_KEYS = [
  'address',
  'aggregateRating',
  'review',
  'reviewCount',
  'ratingValue',
  'ratingCount',
  'priceRange',
  'taxID',
  'vatID',
  'duns',
  'globalLocationNumber',
] as const;

const FORBIDDEN_TYPES = [
  'LocalBusiness',
  'HomeAndConstructionBusiness',
  'PostalAddress',
  'AggregateRating',
  'Review',
] as const;

const isNode = (value: unknown): value is JsonLdNode =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Walks the graph and throws with the exact path, so the failure is trivial to locate. */
export const assertNoForbiddenNodes = (value: unknown, path = '$'): void => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoForbiddenNodes(item, `${path}[${index}]`));
    return;
  }

  if (!isNode(value)) return;

  for (const key of Object.keys(value)) {
    const isForbiddenKey = (FORBIDDEN_KEYS as readonly string[]).includes(key);
    if (isForbiddenKey) {
      throw new Error(
        `JSON-LD: forbidden property "${key}" at ${path}. The brand has no verified address, ` +
          `rating or registration number, so this must never be published.`,
      );
    }
  }

  const nodeType = value['@type'];
  const isForbiddenType =
    typeof nodeType === 'string' && (FORBIDDEN_TYPES as readonly string[]).includes(nodeType);
  if (isForbiddenType) {
    throw new Error(`JSON-LD: forbidden @type "${nodeType}" at ${path}.`);
  }

  for (const [key, child] of Object.entries(value)) {
    assertNoForbiddenNodes(child, `${path}.${key}`);
  }
};

export const organizationId = (siteUrl: string): string => `${siteUrl}#organization`;

type CityRef = {
  name: string;
  stateName: string;
};

const cityNode = (city: CityRef): JsonLdNode => ({
  '@type': 'City',
  name: city.name,
  containedInPlace: {
    '@type': 'State',
    name: city.stateName,
  },
});

type OrganizationInput = {
  siteUrl: string;
  name: string;
  logoUrl: string;
  telephone: string;
  cities: CityRef[];
};

export const buildOrganization = (input: OrganizationInput): JsonLdNode => ({
  '@type': 'Organization',
  '@id': organizationId(input.siteUrl),
  name: input.name,
  url: input.siteUrl,
  logo: {
    '@type': 'ImageObject',
    url: input.logoUrl,
  },
  telephone: input.telephone,
  areaServed: input.cities.map(cityNode),
});

type ServiceInput = {
  siteUrl: string;
  name: string;
  serviceType: string;
  description: string;
  url: string;
  cities: CityRef[];
};

export const buildService = (input: ServiceInput): JsonLdNode => ({
  '@type': 'Service',
  name: input.name,
  serviceType: input.serviceType,
  description: input.description,
  url: input.url,
  provider: { '@id': organizationId(input.siteUrl) },
  areaServed: input.cities.map(cityNode),
});

type FaqEntry = {
  question: string;
  answer: string;
};

export const buildFaqPage = (faq: FaqEntry[]): JsonLdNode => ({
  '@type': 'FAQPage',
  mainEntity: faq.map((entry) => ({
    '@type': 'Question',
    name: entry.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: entry.answer,
    },
  })),
});

type BreadcrumbItem = {
  name: string;
  url: string;
};

export const buildBreadcrumbs = (items: BreadcrumbItem[]): JsonLdNode => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});

/** Wraps the page's nodes into one @graph and refuses to return anything forbidden. */
export const buildGraph = (nodes: JsonLdNode[]): string => {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': nodes,
  };
  assertNoForbiddenNodes(graph);
  return JSON.stringify(graph);
};
