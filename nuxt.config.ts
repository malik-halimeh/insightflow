// Owner: M1
// routeRules live here
//
// NOTE (M3): srcDir + serverDir added below. The repo uses the app/ layout
// (app/app.vue, app/pages, app/components, ...) but Nuxt wasn't
// auto-detecting it — build output only contained the default "Welcome to
// Nuxt" starter page, none of our actual pages/components.
// Once srcDir is set explicitly, Nuxt's serverDir default resolves relative
// to srcDir too (app/server) instead of the repo-root server/ folder, which
// silently drops every /api route. Pinning serverDir to an absolute path
// keeps it at the repo root regardless. Verified with a clean `npm run
// build` — pages, dashboard, and /api/analytics/* all present in the output.
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  devtools: { enabled: true },
  srcDir: 'app',
  serverDir: fileURLToPath(new URL('./server', import.meta.url)),
  css: [],
  routeRules: {
    // define public/protected route caching & rendering rules here
  },
})
