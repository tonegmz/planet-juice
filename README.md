# Planet Juice — planetjuice.shop

The Planet Juice Southgate website, with its own back end:

- **Free-call booking** — "Request My Free Call" requests are saved and (optionally) emailed to the shop.
- **Free 7-day meal plan** — signups are saved as an email list, and each person gets an email with the plan.
- **Order ahead for pickup** — customers build a cart, pick a pickup time and pay in store. Prices are checked on the server, so nobody can change them in their browser.
- **Staff dashboard** at `/admin` — see new pickup orders (refreshes every 30 seconds), mark them *making → ready → picked up*, track free-call requests, and download the meal-plan email list as a CSV.

Everything runs on Netlify's free plan: the site, the API (Netlify Functions) and the data (Netlify Blobs). There is no server or database to maintain.

```
public/                 the website (what visitors see)
  index.html            the main page
  admin.html            staff dashboard
  data/menu.json        menu + prices (used by the site AND the order API)
  assets/               photos and logo
  downloads/            put 7-day-meal-plan.pdf here
netlify/functions/      the back end (one file per API endpoint)
  leads.mjs             POST /api/leads       free-call requests
  subscribe.mjs         POST /api/subscribe   meal-plan signups
  orders.mjs            POST /api/orders      pickup orders
  admin.mjs             GET/POST /api/admin   dashboard data (password protected)
netlify/lib/            shared helpers (storage, email, validation, store hours)
tests/                  automated tests (npm test)
netlify.toml            Netlify build + security settings
```

---

## 1. Turn off the "Powered by Netlify" badge (free, 1 minute)

Netlify started showing this badge on new free-plan projects in August 2026. It's a setting, not a paid feature:

1. Log in at app.netlify.com and open the Planet Juice project.
2. Go to **Project configuration → General → Powered by Netlify badge**.
3. Turn it **off** and save. It disappears right away; no redeploy needed.

## 2. Put this code on GitHub

1. Go to github.com → **New repository**. Name it `planetjuice`, set it to **Private**, and don't add a README (this folder already has one).
2. In this folder, run:

   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/planetjuice.git
   git push -u origin main
   ```

   (No command line? Use GitHub Desktop: *File → Add local repository*, pick this folder, then *Publish repository*.)

## 3. Connect the GitHub repo to your existing Netlify project

Keep the same Netlify project — your domain is already connected to it, so DNS at GoDaddy doesn't change.

1. In Netlify: **Project configuration → Build & deploy → Continuous deployment → Link repository**, and choose `planetjuice` on GitHub.
2. Build settings fill in from `netlify.toml` (publish directory `public`, functions in `netlify/functions`). Leave the build command empty.
3. **Project configuration → Environment variables**, add:

   | Variable | What to put |
   |---|---|
   | `ADMIN_PASSWORD` | A long password for `/admin` (at least 8 characters; the dashboard is locked until this is set) |
   | `SHOP_EMAIL` | The email that should get new orders and requests (optional) |
   | `RESEND_API_KEY` | From resend.com, free tier (optional — see step 5) |
   | `EMAIL_FROM` | e.g. `Planet Juice <hello@planetjuice.shop>` (optional) |
   | `MEAL_PLAN_URL` | Link to the meal plan PDF (optional; defaults to `/downloads/7-day-meal-plan.pdf`) |

4. **Deploys → Trigger deploy**. From now on, every push to `main` on GitHub publishes the site automatically.

The old forms used Netlify Forms; this version saves to its own back end instead, so you can turn off form detection under **Forms** if you like.

## 4. Domain (GoDaddy) — check, don't change

Your domain already points at Netlify. In Netlify → **Domain management**, make sure both `planetjuice.shop` and `www.planetjuice.shop` are listed and HTTPS is on. Pick which one is the **primary domain** (the other redirects to it). The site's SEO tags assume `www.planetjuice.shop`; if you keep the bare domain as primary, change the `canonical`/`og:url` lines at the top of `public/index.html` and the URL in `public/sitemap.xml`.

If you ever need to set the DNS up again at GoDaddy (**My Products → DNS**):

| Type | Name | Value |
|---|---|---|
| A | @ | `75.2.60.5` (Netlify's load balancer) |
| CNAME | www | `YOUR-PROJECT.netlify.app` |

## 5. Email notifications (optional, free)

Without email, everything still works — check `/admin`. To get emails:

1. Make a free account at resend.com and add the domain `planetjuice.shop`. Resend shows a few DNS records; add them at GoDaddy (DNS → Add record).
2. Create an API key and put it in Netlify as `RESEND_API_KEY`, with `EMAIL_FROM` and `SHOP_EMAIL`.
3. Redeploy.

## 6. The free meal plan

Put the PDF in `public/downloads/` as `7-day-meal-plan.pdf` and push. Signups get a link to it by email.

---

## Everyday changes

- **Prices / menu items** — edit `public/data/menu.json`. The site and the order system both read it, so the price customers see is the price they're charged.
- **Store hours** — update `HOURS` in both `public/index.html` and `netlify/lib/util.mjs`, plus the hours text in `index.html`.
- **DoorDash link** — `DOORDASH_URL` near the top of the script in `public/index.html`.
- **Online ordering** opens one hour before the shop opens and stops 15 minutes before close; slots are every 15 minutes.

## Running it on your computer

```bash
npm install
cp .env.example .env     # set ADMIN_PASSWORD
npm run dev              # http://localhost:8888  (dashboard at /admin)
npm test                 # runs the API tests
```

## Limits worth knowing

- Pickup orders are **pay in store** — there's no online payment. Adding Stripe Checkout is the natural next step if you want prepaid orders.
- Free-plan Netlify usage is metered in credits; a single shop's traffic and orders fit comfortably, but keep an eye on **Usage** in Netlify the first month.
- Testimonials on the page are shown as written; make sure each one is from a real client who agreed to it.
