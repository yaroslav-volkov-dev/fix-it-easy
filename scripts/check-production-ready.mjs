/**
 * The last gate before anything reaches the live domain.
 *
 * Only runs when SITE_ENV=production, so preview deployments are unaffected. It refuses to
 * let a build go out with a placeholder phone number, with city copy the client has not
 * confirmed, or with legal pages that still hold the "awaiting attorney" notice.
 *
 * The point is that unverified content cannot reach the live site by accident — the brief's
 * hard constraints stop being a promise and become a build failure.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const CITIES_DIR = 'src/content/cities';
const BRAND_FILE = 'src/content/site/brand.yaml';
const LEGAL_FILE = 'src/content/site/legal.yaml';

if (process.env.SITE_ENV !== 'production') {
  console.log('Production gate skipped (SITE_ENV is not "production").');
  process.exit(0);
}

const blockers = [];

const readYaml = (file) => parse(readFileSync(file, 'utf8'));

const brand = readYaml(BRAND_FILE);
const isPlaceholderPhone = String(brand.phone ?? '').replace(/\D/g, '').replace(/^1/, '') ===
  '0000000000';

if (isPlaceholderPhone) {
  blockers.push(
    `${BRAND_FILE}: the phone number is still the placeholder ${brand.phone}. Every button on ` +
      `the site would dial nothing. Put the real number in and build again.`,
  );
}

const legal = readYaml(LEGAL_FILE);
for (const page of legal.pages ?? []) {
  if (page.status !== 'approved') {
    blockers.push(
      `${LEGAL_FILE}: "${page.title}" still shows the placeholder notice. Paste the text from ` +
        `the attorney and set status: approved.`,
    );
  }
}

for (const name of readdirSync(CITIES_DIR).filter((file) => file.endsWith('.yaml'))) {
  const city = readYaml(join(CITIES_DIR, name));
  if (city.reviewStatus !== 'approved') {
    blockers.push(
      `${CITIES_DIR}/${name}: the copy for ${city.name} has not been confirmed. Read it through, ` +
        `correct anything that is wrong, then set reviewStatus: approved.`,
    );
  }
}

if (!process.env.PUBLIC_SITE_URL) {
  blockers.push(
    'PUBLIC_SITE_URL is not set, so every canonical link and the sitemap would point at the ' +
      'temporary workers.dev address instead of the real domain.',
  );
}

if (blockers.length > 0) {
  console.error('\nProduction build blocked.\n');
  for (const blocker of blockers) {
    console.error(`  - ${blocker}\n`);
  }
  console.error(
    `${blockers.length} item(s) must be resolved before this site can go live. Preview builds ` +
      `(SITE_ENV=preview) are unaffected.\n`,
  );
  process.exit(1);
}

console.log('Production gate passed: real phone number, approved city copy, approved legal text.');
