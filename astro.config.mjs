// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

/**
 * The production domain is not registered yet, so the canonical origin comes from
 * an env var and falls back to the free Cloudflare Workers subdomain. Every
 * canonical URL, the sitemap and the JSON-LD graph derive from this single value.
 */
const siteUrl = process.env.PUBLIC_SITE_URL ?? 'https://fix-it-easy.workers.dev';

export default defineConfig({
  site: siteUrl,
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  integrations: [
    sitemap({
      // Legal placeholders must never enter the sitemap while they hold no real text.
      filter: (page) => !page.includes('/privacy-policy/') && !page.includes('/terms-of-service/'),
    }),
  ],
  // Self-hosted, latin-only, single variable file vendored from @fontsource-variable/inter.
  // No font CDN is contacted at build time or at runtime.
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Inter Variable',
      cssVariable: '--font-inter',
      fallbacks: ['system-ui', 'sans-serif'],
      display: 'swap',
      options: {
        variants: [
          {
            src: ['./src/assets/fonts/inter-latin-variable.woff2'],
            weight: '100 900',
            style: 'normal',
          },
        ],
      },
    },
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  // Build-time only: the site is fully static, so nothing here reaches the browser
  // except the analytics token, which is deliberately inlined into the beacon tag.
  env: {
    schema: {
      SITE_ENV: envField.enum({
        context: 'server',
        access: 'public',
        values: ['production', 'preview'],
        default: 'preview',
      }),
      PUBLIC_CF_BEACON_TOKEN: envField.string({
        context: 'server',
        access: 'public',
        optional: true,
      }),
    },
  },
  devToolbar: {
    enabled: false,
  },
});
