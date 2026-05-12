import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'ro'] as const,
  defaultLocale: 'en',
  /**
   * Always prefix the URL with the locale (e.g. /en/plan, /ro/plan).
   * Per the i18n plan: SEO-friendly + shareable per-language links.
   */
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];
