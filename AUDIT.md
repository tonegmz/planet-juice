# Planet Juice site audit

Audited 2026-11-19 against the current static build (`index.html`, `meal-plans.html`, `assets/`).
Status: **Fixed** = changed in this commit. **Open** = needs a decision, access or a backend.

## Update: build-out pass (same day)

Done on the code side since the first audit:
- **Free meal plan is now real**: signing up opens `free-meal-plan.html` (a printable 7-day plan, `noindex`). The copy no longer promises an email. The plan content is a draft written from the menu: **Ewah should review it** before launch.
- **New `menu.html`**: static, crawlable full menu with prices and `Menu` schema, generated from the same data the cart uses.
- **`404.html`**, **`netlify.toml`** (publish root, security headers, asset caching, repo files hidden), **`assets/og-share.jpg`** (1200×630).
- **Meal-plan to booking link**: each plan has "Or request a call about X", which opens the consultation form with the plan pre-selected (`index.html?plan=Build#book`).
- **Cart**: stale saved carts are migrated, focus returns to the opener on close, Tab is trapped while the drawer is open.
- **Guardrails**: `npm run check` verifies hours (JS, table, schema), prices, FAQ vs. schema, sitemap, canonical tags, alt text, missing files and phone/address consistency. `npm run build` regenerates `menu.html`, `free-meal-plan.html` and `404.html` from the shared header, footer and menu data. Run both before every push.
- **Still blocked / still needs a person**: see `OWNER-TODO.md`.

## 1. What the site shows vs. what is actually connected

| Visible promise | What really happens | Status |
|---|---|---|
| "Request My Free Consultation" form, "reply within one business day" | Posts to Netlify Forms (`data-netlify`). Submissions land in the Netlify dashboard only. No email/SMS alert, no follow-up tracking. | **Open** |
| "Get your 7-day meal plan, free. Check your inbox." | Same Netlify Forms post. **No plan is ever sent** and there is no PDF in the repo. Anyone who signs up gets a success message and nothing else. | **Open (highest risk)** |
| Cart ("Your Cart", subtotal) | Client-side only (`localStorage`). It never creates an order; the drawer hands off to DoorDash or a phone call. The cart contents are not passed to DoorDash. | Works as designed, but see note A |
| Meal-plan "Call to Start Build/Balance/Lean" | `tel:` links only. No plan selection reaches the booking form or any record. | **Open** |
| Weekly/Monthly toggle and "Save $45" | Prices are consistent across data attributes ($720→$675, $480→$435, $384→$339). Pure display. | OK |
| "Open now" badge and hours table | Hours exist in three places that must be edited together: `HOURS` in the JS, the visible table, and the JSON-LD. They currently agree. | OK, fragile |
| DoorDash links | Index sets the URL in JS. **`meal-plans.html` footer link pointed to `index.html#` (dead).** | **Fixed** |
| Reviews ("500+ clients", testimonials) | Hard-coded copy. Not verifiable by visitors and not backed by a live source. | Note B |

Note A: the cart-to-DoorDash gap is inherent to using DoorDash for fulfilment. If pickup orders matter, the earlier commit (`d7f1488`) had an orders function and staff dashboard; the current static build dropped them. Decide whether to restore that or accept DoorDash/phone only.

Note B: the testimonials show first names with cities in other states. Real names/consent should be confirmed. Do **not** mark them up with `Review` schema: Google treats self-published reviews of your own business as ineligible.

## 2. Sustainability (what breaks as the business changes)

1. **Single 84 KB HTML file with inline JS/CSS and a hard-coded menu.** Every price change touches code in several places (the `SMOOTHIES`/`PROTEIN` arrays, `NOTES`, the visible menu note, the FAQ, the JSON-LD). Move menu data to one JSON file and generate the notes from it. **Open**
2. **Hours live in three places** (see above). One `hours` object should feed the badge, the table and the schema. **Open**
3. **Footer, header, head tags and the SVG sprite are copy-pasted across both pages.** Adding a third page means a third copy. A tiny build step (or Eleventy/Astro) fixes this. **Open**
4. **No hosting config in the repo.** The earlier `netlify.toml` (security headers, asset caching, CSP) was lost when the site was replaced. If Netlify's "publish directory" is still `public`, this root-level build will not deploy at all. Confirm the Netlify setting, then add a `netlify.toml`. Note the page uses inline scripts, so the old strict CSP would break the site; either move scripts to files or relax it. **Open**
5. **Duplicate images**: `power-kafta.webp` = `bowl-kafta.webp` and `power-shrimp.webp` = `bowl-shrimp.webp` (byte-identical). Point the menu at the `bowl-*` files and delete the copies (keep the old filenames for one release so saved carts don't show broken images). **Open**
6. **Fonts load from Google Fonts** (render-blocking, external dependency). Self-host the two variable fonts. **Open**
7. `package.json` exists only so `npm start` serves the folder locally (`python3 -m http.server`). Fine, but it is not a build. **Info**

## 3. SEO (on-page and technical)

| Item | Before | Now |
|---|---|---|
| `<title>`, meta description | Present and good on both pages | unchanged |
| Canonical URL | Missing | **Fixed** (`https://planetjuice.shop/`, `/meal-plans.html`) |
| `robots.txt`, `sitemap.xml` | Missing | **Fixed** |
| Open Graph | `og:image` was a relative path (breaks on Facebook/iMessage); `meal-plans` reused the homepage title/description | **Fixed**: absolute URLs, `og:url`, `og:site_name`, per-page title/description/image |
| Twitter/X card | Missing | **Fixed** |
| Structured data | One `FoodEstablishment` block, home page only | **Fixed**: expanded business node (+`HealthClub`, url, logo, image, `hasMap`, `areaServed`, DoorDash `OrderAction`); `FAQPage` generated from the visible FAQ; meal-plans page gets three `Product`/`Offer` entries (weekly prices) and a `BreadcrumbList` |
| Headings | One `h1` per page, logical order | OK. Home `h1` ("Transform Your Body. Fuel Your Life.") has no keyword or place; consider a visible line such as "Personal training and smoothies in Southgate, MI" |
| Image alt text | 28 of 28 `<img>` have `alt` | OK. Menu product images are injected by JS with `alt=""`; fine for decorative, but name them for image search if wanted |
| Social image | `mural.jpg` is 1800×600 (3:1) | **Open**: make a 1200×630 share image |
| Meal plans in the nav / sitemap | Linked from nav and footer | OK |
| Page weight | Assets 2.7 MB total, WebP used, lazy loading and dimensions set | Good |
| Indexable menu | Menu is built by JS from arrays | Googlebot renders JS, but a static `/menu` page with real HTML would rank for "smoothies Southgate" far better. **Open** |

## 4. Local SEO

Fixed in this commit: richer `LocalBusiness`-style schema with address, phone, hours, `areaServed` (Southgate, Wyandotte, Taylor, Allen Park, Trenton), map link and social/DoorDash `sameAs`.

Already good: NAP (name, address, phone) is identical in the header, footer, visit card and schema; click-to-call and directions links exist; hours are marked up.

**Open, needs the owner (not something code can do):**
1. **Google Business Profile**: claim/verify it, set categories (e.g. Smoothie shop, Personal trainer, Juice bar), add the website URL, hours, photos, menu, and the same NAP used here. This is the single biggest local ranking factor.
2. **Add `geo` coordinates** to the schema (latitude/longitude of 13615 Eureka Rd). I did not guess them.
3. **Reviews**: ask for Google reviews and add a "Leave a review" link (Google gives a short link in the Business Profile).
4. **Citations**: same NAP on Yelp, Apple Business Connect, Bing Places, Facebook, DoorDash, the Southgate chamber of commerce.
5. **Local landing content**: a short "Training and smoothies near Wyandotte / Taylor / Allen Park" section or pages, and mention Eureka Rd and Southgate in the home `h1`/first paragraph.
6. **Trainer credibility**: "Moses" (owner and personal trainer) is named in the meta description but has no bio/credential section with name and certification. Add one for E-E-A-T.
7. **Verify the domain** `planetjuice.shop` in Google Search Console, submit `sitemap.xml`, and confirm www vs. bare domain is redirected once.

## 5. Accessibility and quality (quick pass)

- Forms have labels, honeypot, status messages with `role="status"`. Good.
- Reduced-motion is respected for the banner and reveal effects. Good.
- Cart drawer sets `aria-hidden` and focuses the close button; confirm focus returns to the opener and is trapped while open. **Open**
- No JS console errors on either page (checked in headless Chromium).

## 6. Recommended next steps, in order

1. Make the free meal plan real: attach a PDF and send it (Netlify form notification + Zapier/Make, or Buttondown/Mailchimp), or change the copy until it is.
2. Add an email/SMS notification on the consultation form and decide where leads are tracked.
3. Confirm the Netlify publish directory, then add `netlify.toml` (headers, caching, redirects, www canonicalisation).
4. Claim and complete the Google Business Profile; add `geo` to the schema.
5. Put menu, hours and prices in single sources of truth; share header/footer between pages.
6. Add a static menu page and a trainer/about page for search.
