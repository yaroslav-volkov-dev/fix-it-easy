/**
 * Stops the build when a user-visible English string is written inside a component.
 *
 * The client edits this site through content files on github.com. The moment a headline,
 * a button label or an alt text lives inside an .astro file instead, they can no longer
 * change it without a developer — which defeats the point of the content collections.
 *
 * The check strips everything that is not rendered prose (the frontmatter script, comments,
 * style and script blocks, tags and attributes, and any {expression}) and then looks at
 * what text is left. Two or more consecutive words is copy, not markup.
 *
 * Genuine exceptions go in scripts/copy-allowlist.json with a reason.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SCAN_DIRS = ['src/components', 'src/layouts', 'src/pages'];
const ALLOWLIST_FILE = 'scripts/copy-allowlist.json';

/** Attributes whose literal value is read out or displayed to a person. */
const USER_FACING_ATTRIBUTES = /\s(alt|aria-label|title|placeholder)\s*=\s*"([^"]*)"/g;

const WORD = /[A-Za-z]{2,}(?:['\u2019][A-Za-z]+)?/g;

const allowlist = (() => {
  try {
    return JSON.parse(readFileSync(ALLOWLIST_FILE, 'utf8'));
  } catch {
    return [];
  }
})();

const isAllowed = (file, text) =>
  allowlist.some((entry) => entry.file === file && entry.text === text.trim());

const collectAstroFiles = (dir) => {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }

  return entries.flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return collectAstroFiles(path);
    return path.endsWith('.astro') ? [path.split('\\').join('/')] : [];
  });
};

/** Removes the frontmatter script, comments and any style or script block. */
const stripNonMarkup = (source) => {
  const withoutFrontmatter = source.replace(/^---[\s\S]*?\n---/, (match) =>
    match.replace(/[^\n]/g, ' '),
  );
  const blank = (match) => match.replace(/[^\n]/g, ' ');
  return withoutFrontmatter
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/<style[\s\S]*?<\/style>/g, blank)
    .replace(/<script[\s\S]*?<\/script>/g, blank);
};

/**
 * Keeps only rendered text: everything inside a tag or inside an {expression} is dropped,
 * while newlines are preserved so the reported line numbers still point at the source.
 */
const extractRenderedText = (source) => {
  let output = '';
  let inTag = false;
  let braceDepth = 0;
  let quote = null;

  for (const character of source) {
    if (character === '\n') {
      output += '\n';
      if (!inTag && braceDepth === 0) quote = null;
      continue;
    }

    if (inTag) {
      if (quote) {
        if (character === quote) quote = null;
      } else if (character === '"' || character === "'") {
        quote = character;
      } else if (character === '>') {
        inTag = false;
      }
      continue;
    }

    if (braceDepth > 0) {
      if (quote) {
        if (character === quote) quote = null;
      } else if (character === '"' || character === "'" || character === '`') {
        quote = character;
      } else if (character === '{') {
        braceDepth += 1;
      } else if (character === '}') {
        braceDepth -= 1;
      }
      continue;
    }

    if (character === '<') {
      inTag = true;
      continue;
    }

    if (character === '{') {
      braceDepth += 1;
      continue;
    }

    output += character;
  }

  return output;
};

const findings = [];

for (const file of SCAN_DIRS.flatMap(collectAstroFiles)) {
  const source = readFileSync(file, 'utf8');
  const rendered = extractRenderedText(stripNonMarkup(source));

  rendered.split('\n').forEach((line, index) => {
    const words = line.match(WORD) ?? [];
    if (words.length < 2) return;
    if (isAllowed(file, line)) return;

    findings.push({
      file,
      line: index + 1,
      text: line.trim(),
      reason: 'text written directly in the component',
    });
  });

  const withoutFrontmatter = stripNonMarkup(source);
  for (const match of withoutFrontmatter.matchAll(USER_FACING_ATTRIBUTES)) {
    const [, attribute, value] = match;
    const words = value.match(WORD) ?? [];
    if (words.length < 2) continue;
    if (isAllowed(file, value)) continue;

    const line = withoutFrontmatter.slice(0, match.index).split('\n').length;
    findings.push({
      file,
      line,
      text: `${attribute}="${value}"`,
      reason: `${attribute} is written directly in the component`,
    });
  }
}

if (findings.length > 0) {
  console.error('\nHardcoded copy check failed. The site was not built.\n');
  console.error(
    'Every word a visitor can read has to come from a file under src/content, so the\n' +
      'client can edit it without a developer. These strings do not:\n',
  );
  for (const finding of findings) {
    console.error(`  ${finding.file}:${finding.line}`);
    console.error(`    ${finding.text}`);
    console.error(`    -> ${finding.reason}\n`);
  }
  console.error(
    `${findings.length} problem(s). Move each string into a content file and pass it in as a\n` +
      `prop, or add a justified exception to ${ALLOWLIST_FILE}.\n`,
  );
  process.exit(1);
}

console.log('Hardcoded copy check passed: no user-visible strings inside components.');
