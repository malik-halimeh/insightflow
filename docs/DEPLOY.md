# Deploying InsightFlow to Render

Written for someone who has not deployed a Nuxt app before. Follow it in order.

**Do this on day three, not day five.** Every step below has failed for somebody at
least once, and the fixes take minutes on day three and cost you the project on day five.

---

## What gets built

| | |
| --- | --- |
| Build command | `npm install && npm run build` |
| Start command | `node .output/server/index.mjs` |
| Nitro preset | `render-com` (set in `nuxt.config.ts`, extends `node-server`) |
| Health check path | `/api/health` |
| Node version | 22 or newer |

**Never `nuxt generate`.** It emits static files with no server, which silently removes
every API route, the login, the upload and the publish flow. The site would appear to
build fine and then fail on every action. There is deliberately no `generate` script in
`package.json` — do not add one.

---

## 1. Before you touch Render: MongoDB Atlas network access

**This is the single most likely thing to break your deployment.** Do it first.

Atlas refuses connections from any IP that is not on its access list. It does not
refuse them politely — the TCP port accepts the connection and then the TLS handshake
is dropped, so the error you get is `Client network socket disconnected before secure
TLS connection was established`, which reads like a network fault and is not one.

Render does not give you a fixed outbound IP address on the free and starter plans.

1. Atlas → your project → **Network Access**
2. **Add IP Address**
3. Choose **Allow access from anywhere** (`0.0.0.0/0`)
4. Confirm the entry is **permanent**, not temporary

> **Watch the temporary entries.** Atlas offers a "temporary access" option that
> expires after six hours. If your app worked this morning and refuses to connect this
> afternoon with no code change, this is why. Check the expiry column first.

`0.0.0.0/0` means any IP can *attempt* to connect. Your database is still protected by
its username and password, which is why that password must be strong and must not be
reused anywhere else.

## 2. Create the Render service

1. Render dashboard → **New** → **Web Service**
2. Connect the GitHub repository `malik-halimeh/insightflow`
3. Fill in:

| Field | Value |
| --- | --- |
| Environment | `Node` |
| Region | Closest to your Atlas cluster |
| Branch | `main` |
| Build command | `npm install && npm run build` |
| Start command | `node .output/server/index.mjs` |
| Health check path | `/api/health` |

4. Add the environment variables from section 3 **before** the first deploy.
5. Create the service.

**Do not set `PORT`.** Render assigns it and the Nitro server reads it automatically.
Setting it yourself is a common way to get a service that builds and then never
becomes reachable.

## 3. Environment variables, and what breaks without each one

Add all six in **Environment** before the first build.

| Variable | Example | What breaks if it is missing or wrong |
| --- | --- | --- |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/…` | Everything that touches data. `/api/health` returns **503** with `database: down`. The data sets, dashboard and insight pages all fail. **Sign-in still works**, which makes the app look healthier than it is. |
| `MONGODB_DB` | `insightflow` | Same as above — the connection is refused before any query runs. |
| `AUTH_USERNAME` | `owner` | Nobody can sign in. `/api/auth/login` returns **500** "Sign in is not configured on this server." |
| `AUTH_PASSWORD` | a long random string | Same. The route refuses to run at all rather than accept an empty password, which would otherwise let anyone in. |
| `SESSION_SECRET` | 32+ random characters | Sign-in returns **500**. If it were merely weak rather than missing, session cookies could be forged — treat it as a password. |
| `NUXT_PUBLIC_SITE_URL` | `https://insightflow.onrender.com` | **Nothing today.** No code currently reads it. Set it correctly anyway: it is exposed to the browser, so it must never hold a secret, and it is what canonical URLs and share links will use when the public feed needs them. |

### The production server does not read `.env`

`.env` is a convenience for local development only. `nuxt dev` and `npm run seed` read
it; **`node .output/server/index.mjs` does not.** The deployed app sees only real
environment variables, which is exactly what Render's Environment tab provides.

This matters if you ever test the production build on your own machine. This fails:

```bash
node .output/server/index.mjs          # health says database: down
```

This works:

```bash
node --env-file=.env .output/server/index.mjs
```

If you test that way, note that the session cookie is issued with `Secure` outside
development, so a browser will refuse to store it over plain `http://localhost`.
Sign-in will appear to fail locally and work fine on Render, which serves HTTPS.

### The build-time trap you need to understand

Five of these six names are not prefixed with `NUXT_`, so Nuxt cannot bind them
automatically. `nuxt.config.ts` reads them explicitly with `process.env`, **which
happens while the site is being built, not while it is running.**

Two consequences:

1. **The variables must exist before the first build.** If you deploy and then add
   them, the build has already baked in empty strings. You must trigger a fresh deploy
   — restarting the service is not enough.
2. **The values end up inside the build output.** Anyone who can read the build
   artifact can read the connection string. That is normal for this setup, but it is
   why the Atlas password must not be reused anywhere else.

To change a secret **without rebuilding**, set the `NUXT_`-prefixed form instead —
`NUXT_MONGODB_URI`, `NUXT_SESSION_SECRET`, and so on. Nitro applies those at runtime
and they override whatever was baked in.

## 4. Seed the deployed database

The seed script runs against whatever `MONGODB_URI` points at, so run it **locally**
with the production connection string in your `.env`, once:

```bash
npm run seed
```

It wipes and rebuilds `users`, `datasets`, `salesRows`, `publishedInsights` and
`recommendations`. It leaves `rules` alone. Running it twice does not duplicate.

> **It wipes.** There is no confirmation prompt and no environment guard. Point it at
> production only when you intend to replace production data.

---

## 5. Post-deploy checklist

Run every step against the **deployed URL**, not localhost. Substitute your real host
for `https://insightflow.onrender.com`.

Something that works locally and fails deployed is the entire point of this list.

### 5.1 The instance is alive

```bash
curl -i https://insightflow.onrender.com/api/health
```

- [ ] **200**, and the body reads `"status":"ok"` with `"database":"up"`

If you get **503** with `"database":"down"`, the app is running and the database is
not. Go back to section 1 — it is almost always the Atlas access list.

### 5.2 The public feed works with no account

Use a private window, or curl, so no session cookie is sent.

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://insightflow.onrender.com/insights
```

- [ ] `/` loads and is the landing page
- [ ] `/insights` returns **200** with no session
- [ ] The feed shows the seeded insights — real text, not an empty list
- [ ] View source on `/insights`: the insight text **is present in the HTML**

That last check is the one that matters. These pages are server-rendered so strangers
and search engines can read them. If the HTML source is an empty `<div id="__nuxt">`,
server rendering is not working and the page is useless to a search engine even though
it looks fine in your browser.

### 5.3 A protected page redirects when signed out

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://insightflow.onrender.com/dashboard
```

- [ ] In a signed-out browser, `/dashboard` sends you to `/login`

> **Expect `200`, not `302`, from curl.** The private pages are client-rendered, so the
> server returns an empty shell and the redirect happens in the browser. This is
> correct. Check it in a real browser, not with curl.

### 5.4 Sign in

- [ ] `/login` loads
- [ ] Wrong password shows "That username and password did not match" and stays put
- [ ] The correct details sign you in and land you on `/dashboard`
- [ ] `/api/auth/session` now returns `"authenticated":true` with your username
- [ ] The cookie is `HttpOnly`, `Secure` and `SameSite=Lax` (browser dev tools → Application → Cookies)

`Secure` is set automatically outside development. If sign-in works locally and fails
on Render with the cookie never appearing, you are loading the site over `http://`
rather than `https://`.

### 5.5 Seeded data is really there

- [ ] Signed in, `/datasets` lists **"Bella Pizza — last 8 weeks"** with **631** rows
- [ ] Open one of the seeded insights from the feed and it loads on its own URL

### 5.6 Log out

- [ ] Log out returns you to `/login`
- [ ] `/dashboard` now redirects to `/login` again

---

## 6. Things specific to this host you should know

**Free instances sleep.** After about 15 minutes of no traffic Render stops the
instance, and the next visitor waits roughly 30–60 seconds for it to start. Do not let
this surprise you in a live demo — open the site a minute beforehand. Note that a
health check ping is itself traffic, so a frequent external monitor keeps it awake.

**Cached pages are lost on every restart.** The `/insights` routes use `swr`, which
caches a rendered page in the instance's memory. Restarts, redeploys and sleeps all
clear it. The first visitor after a restart always waits for a fresh render. Nothing
is broken; it just means the cache helps less than the numbers suggest.

**Do not run more than one instance yet.** Each instance keeps its own cache and its
own database connection, so with two instances the same page can be a minute stale on
one and fresh on the other. Nothing in this app coordinates that.

**The landing page is prerendered at build time.** `/` is built once and served as a
static file, so editing its text requires a **new deploy** — no restart or cache clear
will change it. It is also the one page that stays up when the database is down.

**Health checks cost a database round trip.** `/api/health` pings MongoDB on every
call. That is deliberate — a health check that only proves the web server is running
would report a healthy instance that cannot serve a single page. But do not point a
one-second external monitor at it.

**The filesystem is temporary.** Anything written to disk disappears on restart. This
app writes nothing to disk, so it does not matter today; it will if anyone adds file
uploads that are stored locally rather than in a bucket.

---

## If it does not work

| What you see | Almost always |
| --- | --- |
| `/api/health` says `database: down` | Atlas access list, section 1. Check for an expired temporary entry. |
| Everything 500s but sign-in works | Same. Sign-in does not touch the database, so it survives a database outage. |
| Sign-in returns 500 | `AUTH_USERNAME`, `AUTH_PASSWORD` or `SESSION_SECRET` missing from Render. |
| Sign-in succeeds but you bounce back to `/login` | The cookie is not being stored. You are on `http://`, not `https://`. |
| Build succeeds, site never responds | You set `PORT` yourself. Remove it. |
| Config changes have no effect | The variable was added after the build. Trigger a fresh deploy, not a restart. |
| API routes 404 in production | Something ran `nuxt generate`. The build command must be `nuxt build`. |
