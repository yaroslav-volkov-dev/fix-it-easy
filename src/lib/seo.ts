/**
 * Canonical URLs and social card metadata. Everything derives from the `site` value in
 * astro.config.mjs, which in turn comes from PUBLIC_SITE_URL.
 */

export const OG_IMAGE = {
  path: '/og-default.png',
  width: 1200,
  height: 630,
} as const;

/** Routes are built with trailingSlash: 'always', so canonicals must match exactly. */
const withTrailingSlash = (pathname: string): string =>
  pathname.endsWith('/') ? pathname : `${pathname}/`;

export const absoluteUrl = (site: URL | undefined, path: string): string => {
  const origin = site?.origin ?? '';
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
};

export const canonicalUrl = (site: URL | undefined, pathname: string): string =>
  absoluteUrl(site, withTrailingSlash(pathname));
