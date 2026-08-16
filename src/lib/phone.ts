/**
 * The phone number itself lives in src/content/site/brand.yaml so the client can change it
 * in the GitHub web UI. This module only formats it — no number is hardcoded here.
 */

/** "+1 (813) 555-0142" -> "tel:+18135550142" */
export const toTelHref = (display: string): string => `tel:${display.replace(/[^\d+]/g, '')}`;

/** Digits only, used as the JSON-LD `telephone` value. */
export const toE164 = (display: string): string => display.replace(/[^\d+]/g, '');

/**
 * The repository ships with +1 (000) 000-0000 until the client supplies the real number.
 * scripts/check-production-ready.mjs uses this to stop a production build.
 */
export const isPlaceholderPhone = (display: string): boolean =>
  display.replace(/\D/g, '').replace(/^1/, '') === '0000000000';
