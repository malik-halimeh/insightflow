export default defineNuxtConfig({
  modules: ['@nuxt/ui'],

  css: ['~/assets/css/main.css'],

  devtools: { enabled: true },

  compatibilityDate: '2026-06-30',

  // These env names are not NUXT_-prefixed, so Nuxt cannot bind them automatically.
  // Each is read explicitly here. Overriding any of them on the deployed host requires
  // the NUXT_-prefixed form (NUXT_MONGODB_URI, NUXT_SESSION_SECRET, ...).
  runtimeConfig: {
    mongodbUri: process.env.MONGODB_URI || '',
    mongodbDb: process.env.MONGODB_DB || '',
    authUsername: process.env.AUTH_USERNAME || '',
    authPassword: process.env.AUTH_PASSWORD || '',
    sessionSecret: process.env.SESSION_SECRET || '',

    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || ''
    }
  }
})
