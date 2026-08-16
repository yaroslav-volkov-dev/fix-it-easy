/**
 * Generates the two raster brand images:
 *   public/logo.png        512x512, the Organization logo in the JSON-LD graph
 *   public/og-default.png  1200x630, the social card for every page
 *
 * A one-off developer tool, not part of `npm run build` — the PNGs are committed, so a
 * Cloudflare build never has to render fonts. Run it again only if the mark changes:
 *
 *   node scripts/build-brand-images.mjs
 *
 * The badge is rebuilt here rather than imported from the Astro component because the
 * rasteriser inside sharp is not a browser. It ignores `textLength`, so each line carries an
 * explicit font size, and it does not implement `textPath` at all, so the banner letters are
 * placed along the arc one at a time by ribbonText() below.
 *
 * The two font sizes below are measured, not guessed: rendered on their own and trimmed to
 * their ink, `FIX IT EASY` at 29 comes to 167 units against the 166 the component pins with
 * `textLength`, and `APPLIANCE REPAIR` at 11.75 comes to 121 against 120. Sizes picked by eye
 * were wider — the wordmark crossed the ring and the sub-line ran under the right red rule,
 * which stayed invisible only for as long as the mark was drawn white on navy.
 *
 * The phone number is deliberately absent from the social card. It changes; the card should
 * not have to be regenerated when it does.
 */
import sharp from 'sharp';

const NAVY = '#1c2c4c';
const RED = '#d0202b';
const WHITE = '#ffffff';
const GREY = '#c8d0da';

const FONT_STACK = 'Arial, Helvetica, sans-serif';

const CENTER = 100;
const RIBBON_TEXT_RADIUS = 84;
const RIBBON_TEXT = 'SAME DAY SERVICE';
const RIBBON_FONT_SIZE = 13;
const RIBBON_TRACKING = 1.2;
// The red band spans 35°-145°, so the letters have 110° to sit in. Anything wider hangs off
// its ends, which is why layoutRibbon() below reports the span it actually used.
const RIBBON_BAND_DEGREES = 110;

/**
 * Arial Bold advance widths per 1000 units of em, for the characters the banner uses.
 *
 * A browser advances each glyph by its own width; sharp does too, but only inside a single
 * <text>. Every letter here is its own element, so the advance has to be applied by hand.
 * Stepping by a constant angle instead — which is what this did at first — gives every letter
 * the same slice of arc, and the wide ones then run into their neighbours: the M and E of
 * SAME merged into one shape.
 */
const ADVANCE_PER_1000 = { S: 667, A: 722, M: 833, E: 667, D: 722, Y: 667, R: 722, V: 667, I: 278, C: 722, ' ': 278 };

const toRadians = (degrees) => (degrees * Math.PI) / 180;
const arcToDegrees = (length) => (length / RIBBON_TEXT_RADIUS) * (180 / Math.PI);

/**
 * Lays the banner out character by character along the bottom bow of the badge.
 *
 * Each glyph sits on the arc at its own angle and is rotated to the tangent there, so the
 * word follows the curve the way `textPath` would in a browser. Angles increase to the left,
 * and the tangent formula keeps the letters upright along the bottom.
 */
const layoutRibbon = (text, fill) => {
  const characters = [...text];
  const advances = characters.map((character) => (ADVANCE_PER_1000[character] / 1000) * RIBBON_FONT_SIZE);
  const totalArc =
    advances.reduce((sum, advance) => sum + advance, 0) + RIBBON_TRACKING * (characters.length - 1);

  // Walk a cursor from the left end of the word to the right, in arc length from the bottom.
  let cursor = totalArc / 2;

  const glyphs = characters.map((character, index) => {
    const centerOffset = cursor - advances[index] / 2;
    cursor -= advances[index] + RIBBON_TRACKING;

    if (character === ' ') return '';

    const angle = 90 + arcToDegrees(centerOffset);
    const radians = toRadians(angle);
    const x = CENTER + RIBBON_TEXT_RADIUS * Math.cos(radians);
    const y = CENTER + RIBBON_TEXT_RADIUS * Math.sin(radians);
    const rotation = (Math.atan2(-Math.cos(radians), Math.sin(radians)) * 180) / Math.PI;

    return (
      `<text x="0" y="0" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) ` +
      `rotate(${rotation.toFixed(2)})" text-anchor="middle" font-family="${FONT_STACK}" ` +
      `font-size="${RIBBON_FONT_SIZE}" font-weight="700" fill="${fill}">${character}</text>`
    );
  });

  return { markup: glyphs.join(''), spanDegrees: arcToDegrees(totalArc) };
};

// Overflowing the band is silent in a raster, so make it loud here instead.
const ribbonSpan = layoutRibbon(RIBBON_TEXT, WHITE).spanDegrees;
if (ribbonSpan > RIBBON_BAND_DEGREES) {
  throw new Error(
    `The banner needs ${ribbonSpan.toFixed(1)}° of arc but the red band is only ` +
      `${RIBBON_BAND_DEGREES}° wide. Lower RIBBON_FONT_SIZE or RIBBON_TRACKING.`,
  );
}

/** The complete badge in one colour scheme, drawn on a 200x200 grid. */
const badge = ({ ink, accent, knockout, ribbonInk }) => `
  <circle cx="100" cy="100" r="95" fill="none" stroke="${ink}" stroke-width="6"/>
  <rect x="132" y="32" width="12" height="26" fill="${accent}"/>
  <path d="M26 72 L100 26 L174 72 L159 72 L100 42 L41 72 Z" fill="${ink}"/>
  <g fill="${ink}">
    <rect x="88" y="49" width="10.5" height="10.5"/>
    <rect x="101.5" y="49" width="10.5" height="10.5"/>
    <rect x="88" y="62.5" width="10.5" height="10.5"/>
    <rect x="101.5" y="62.5" width="10.5" height="10.5"/>
  </g>
  <g transform="translate(100 108) skewX(-8) translate(-100 -108)">
    <text x="100" y="108" text-anchor="middle" font-family="${FONT_STACK}" font-size="29"
          font-weight="700" fill="${ink}">FIX IT <tspan fill="${accent}">EASY</tspan></text>
  </g>
  <g fill="${accent}">
    <rect x="19" y="121" width="15" height="3.5" rx="1.75"/>
    <rect x="166" y="121" width="15" height="3.5" rx="1.75"/>
  </g>
  <text x="100" y="127" text-anchor="middle" font-family="${FONT_STACK}" font-size="11.75"
        font-weight="700" letter-spacing="0.4" fill="${ink}">APPLIANCE REPAIR</text>
  <path d="M36 145 A78 78 0 0 0 164 145" fill="none" stroke="${accent}" stroke-width="25"/>
  <path d="M44 139 A64 64 0 0 1 70 156" fill="none" stroke="${accent}" stroke-width="3.5"
        stroke-linecap="round"/>
  <path d="M156 139 A64 64 0 0 0 130 156" fill="none" stroke="${accent}" stroke-width="3.5"
        stroke-linecap="round"/>
  ${layoutRibbon(RIBBON_TEXT, ribbonInk).markup}
  <circle cx="100" cy="152" r="22" fill="${ink}"/>
  <g transform="translate(100 152) rotate(-35)">
    <circle cx="0" cy="-11" r="8" fill="${knockout}"/>
    <circle cx="0" cy="-11" r="3.6" fill="${ink}"/>
    <rect x="-3.6" y="-19.5" width="7.2" height="8.5" fill="${ink}"/>
    <rect x="-3.6" y="-5.7" width="7.2" height="24.7" rx="3.6" fill="${knockout}"/>
  </g>
`;

// One scheme only. The mark keeps the brand colours everywhere, so on the navy social card it
// gets the white ground it is drawn for rather than a lightened red that reads as pink.
const brandScheme = { ink: NAVY, accent: RED, knockout: WHITE, ribbonInk: WHITE };

const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <rect width="200" height="200" fill="${WHITE}"/>
  ${badge(brandScheme)}
</svg>`;

// The badge is drawn on a 200x200 grid, doubled and offset — so its centre lands at (290, 315)
// and its ring, stroke included, ends at r=196. The disc clears that by a few pixels.
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${NAVY}"/>
  <rect y="606" width="1200" height="24" fill="${RED}"/>
  <circle cx="290" cy="315" r="204" fill="${WHITE}"/>
  <g transform="translate(90 115) scale(2)">${badge(brandScheme)}</g>
  <text x="556" y="272" font-family="${FONT_STACK}" font-size="72" font-weight="700" fill="${WHITE}">Same-Day</text>
  <text x="556" y="356" font-family="${FONT_STACK}" font-size="72" font-weight="700" fill="${WHITE}">Appliance Repair</text>
  <text x="558" y="424" font-family="${FONT_STACK}" font-size="34" fill="${GREY}">Florida and Connecticut</text>
</svg>`;

await sharp(Buffer.from(logoSvg), { density: 600 }).resize(512, 512).png().toFile('public/logo.png');
await sharp(Buffer.from(ogSvg), { density: 144 }).png().toFile('public/og-default.png');

console.log('Wrote public/logo.png (512x512) and public/og-default.png (1200x630).');
