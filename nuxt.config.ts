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
  // '/api/**'              Allows the API to be called from another origin.
  routeRules: {
    '/': { prerender: true },
    '/insights': { swr: 60 },
    '/insights/**': { swr: 3600 },
    '/dashboard/**': { ssr: false },
    '/datasets/**': { ssr: false },
    '/recommendations/**': { ssr: false },
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

    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || ''
    }
  }
})
