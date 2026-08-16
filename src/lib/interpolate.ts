/**
 * Section headings that mention a city or a service are stored as templates in the content
 * files ("Why homeowners in {city} call us") so that no English string has to live inside a
 * component. This resolves them.
 *
 * An unknown placeholder is left untouched rather than silently emptied — a visible
 * "{citty}" in a preview is far easier to notice than a missing word.
 */
export const interpolate = (template: string, tokens: Record<string, string>): string =>
  template.replace(/\{(\w+)\}/g, (match, key: string) => tokens[key] ?? match);
