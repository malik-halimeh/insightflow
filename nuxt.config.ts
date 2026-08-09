export default defineNuxtConfig({
  modules: ['@nuxt/ui'],

  css: ['~/assets/css/main.css'],

  devtools: { enabled: true },

  compatibilityDate: '2026-06-30',

  // Render runs a long-lived Node process. This preset extends node-server and
  // produces .output/server/index.mjs, which the start command runs. The build
  // command stays `nuxt build` — `nuxt generate` would emit static files with no
  // server, silently removing every API route, the login and the publish flow.
  nitro: {
    preset: 'render-com'
  },

  // How each part of the site is rendered, and why.
  // '/'                    Built once at deploy time. It is the same for every visitor, so nobody should wait for a server.
  // '/insights'            Rendered on the server and cached for a minute. The public feed must be readable without an account, and by search engines.
  // '/insights/**'         One published insight barely changes, so the same server render is reused for an hour.
  // '/dashboard/**'        Rendered in the browser only. It is private, different for every owner, and must never sit in a shared cache.
  // '/datasets/**'         Same reasoning: private data behind a login, so there is nothing worth rendering on the server.
  // '/recommendations/**'  Same reasoning: private results that belong to one account.
  // '/forecast/**'         Same reasoning again, and see the note below — without this rule the page breaks.
  // '/api/**'              Allows the API to be called from another origin.
  routeRules: {
    '/': { prerender: true },
    '/insights': { swr: 60 },
    '/insights/**': { swr: 3600 },
    '/dashboard/**': { ssr: false },
    '/datasets/**': { ssr: false },
    '/recommendations/**': { ssr: false },
    
    '/forecast/**': { ssr: false },

    '/admin/**': { ssr: false },
    
    '/api/home-stats': { swr: 300 },
    '/api/**': { cors: true }
  },

  // These env names are not NUXT_-prefixed, so Nuxt cannot bind them automatically.
  // Each is read explicitly here. Overriding any of them on the deployed host requires
  // the NUXT_-prefixed form (NUXT_MONGODB_URI, NUXT_SESSION_SECRET, ...).
  runtimeConfig: {
    mongodbUri: process.env.MONGODB_URI || '',
    mongodbDb: process.env.MONGODB_DB || '',
    authUsername: process.env.AUTH_USERNAME || '',
    authPassword: process.env.AUTH_PASSWORD || '',
    sessionSecret: process.env.SESSION_SECRET || '',
    elasticEmailApiKey: process.env.ELASTIC_EMAIL_API_KEY || '',
    elasticEmailFromEmail: process.env.ELASTIC_EMAIL_FROM_EMAIL || '',
    elasticEmailFromName: process.env.ELASTIC_EMAIL_FROM_NAME || 'InsightFlow',

    /**
     * Phase 2 feature flags. One per feature, and every one is off unless the
     * environment says otherwise — `=== 'true'` rather than a truthy check, so an
     * unset variable, an empty string or a stray "false" all mean off.
     *
     * They exist so unfinished work can be merged without appearing in the live
     * demo. Read them where the feature is entered: the route that serves it, or
     * the helper that performs it. A flag checked in one place is a flag that
     * still runs.
     */
    forecastEnabled: process.env.FORECAST_ENABLED === 'true',
    versioningEnabled: process.env.VERSIONING_ENABLED === 'true',
    outcomesEnabled: process.env.OUTCOMES_ENABLED === 'true',
    benchmarksEnabled: process.env.BENCHMARKS_ENABLED === 'true',

    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || '',
      forecastEnabled: process.env.FORECAST_ENABLED === 'true',
      benchmarksEnabled: process.env.BENCHMARKS_ENABLED === 'true'
    }
  }
})
