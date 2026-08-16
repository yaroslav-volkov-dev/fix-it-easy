/**
 * Writes dist/robots.txt and dist/_headers after the site is built.
 *
 * The production domain must be the only indexable copy of this site. A preview on
 * *.workers.dev competing with it in search results would be worse than no preview at all.
 *
 * Cloudflare serves static assets without running a Worker, so there is no request-time
 * place to inspect the Host header — and adding a Worker just for that would put every
 * page view on paid, rate-limited request handling. Instead the decision is made once, at
 * build time, from SITE_ENV, and applied in three independent ways:
 *
 *   1. robots.txt          disallows everything on a preview build
 *   2. _headers            adds X-Robots-Tag: noindex, which also covers already-crawled URLs
 *   3. <meta name=robots>  emitted by base-layout.astro from the same variable
 */
import { writeFileSync } from 'node:fs';

const DIST_DIR = 'dist';

const isProduction = process.env.SITE_ENV === 'production';
const siteUrl = (process.env.PUBLIC_SITE_URL ?? 'https://fix-it-easy.workers.dev').replace(
  /\/$/,
  '',
);

const robotsTxt = isProduction
  ? `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap-index.xml
`
  : `# Preview build. This copy of the site must never be indexed —
# the production domain is the only one that should appear in search results.
User-agent: *
Disallow: /
`;

const previewHeader = isProduction ? '' : '  X-Robots-Tag: noindex, nofollow\n';

const headers = `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
${previewHeader}
# Astro fingerprints these filenames, so they can be cached forever.
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/fonts/*
  Cache-Control: public, max-age=31536000, immutable
`;

writeFileSync(`${DIST_DIR}/robots.txt`, robotsTxt);
writeFileSync(`${DIST_DIR}/_headers`, headers);

console.log(
  isProduction
    ? `Deploy files written for production: indexable, sitemap at ${siteUrl}/sitemap-index.xml.`
    : 'Deploy files written for preview: robots.txt disallows everything and _headers sends noindex.',
);
