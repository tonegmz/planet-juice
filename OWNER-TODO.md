# Owner to-do list

Only things that need your accounts, decisions or real-world details.

## 1. Get it live (Netlify deploys from `main`)
Your Netlify screenshot shows production deploys come from `main` (last deploy `main@0bc8388`). All of the new work is on the branch `claude/pensive-ptolemy-l6k7ew`, so **none of it is live until it is merged into `main`**. Open a pull request from that branch into `main` on GitHub and merge it (or tell me to open the PR). Netlify then auto-publishes.
After the deploy, open these and check they load: `/`, `/menu`, `/build-your-own-acai-bowl`, `/free-meal-plan`, `/meal-plans`.

## 2. Netlify forms (5 minutes, Project → Forms)
Form detection is already enabled. For **each** form (`free-call` and `meal-plan`): **Add notification → Email notification**, choose "New form submission", pick the form, and enter the email that should get leads. (Use "HTTP POST request" only if you later connect Zapier/Make or an email service.)

## 3. Search engines (I can't do these, they need your Google/Bing login)
- **Google Search Console**: add `https://planetjuice.shop/` as a property (Domain property via DNS is easiest), verify, then Sitemaps → submit `sitemap.xml`. `robots.txt` already points to it.
- **Bing Webmaster Tools**: import from Search Console, which submits the sitemap too.
- **Google Business Profile**: claim and verify. Categories: Smoothie shop (primary), Juice shop, Personal trainer. Add website, hours, photos, the menu and services. Biggest local-ranking factor.
- **Reviews**: ask customers for Google reviews. Send me your review link and I'll add a "Leave a review" button.
- **Citations**: same name, address and phone on Yelp, Apple Business Connect, Bing Places, Facebook, DoorDash. Exactly: Planet Juice, 13615 Eureka Rd, Southgate, MI 48195, (734) 444-2819.
- Pick one primary domain (bare `planetjuice.shop` or `www`) in Netlify Domain management and let the other redirect. The site's canonical URLs use the bare domain.

## 4. Please confirm (I made assumptions)
1. **Annual plans.** I changed the three coaching plans (Starter $149, Elite $297, Champion $497) from "/month" to "/year" and the FAQ to "per year", keeping the dollar amounts. If the real annual prices differ, tell me. I did **not** change two other monthly prices because I need your annual numbers: **Online Coaching "From $199 / month"** and the **meal-plan Monthly toggle** (billed every four weeks, save $45). Tell me if those should become annual too, and at what price.
2. **Açaí pricing.** I read ".75¢" on the menu board as $0.75 per extra topping, and wrote the build-your-own bowl as $9.99 with up to 4 free toppings. The signature bowls on the site still say "Price in store".
3. **Menu follows your board** (protein smoothies incl. Berry Bulk and Vegan, Refreshers, Café, Shots, power-bowl macros, açaí bowls at $9.99, Kids at $7.99; Kafta and Shrimp bowls stay). Still to fix:
   - **Photos:** the Peanut Butter bowl uses the old Choco Banana photo for now (`assets/bowl-peanut-butter.webp`). Send the real one when you have it (same file name).
   - **Planet Picks** are not on your board but are still on the site. Tell me whether to keep them. To remove any item, delete it from `data/menu.json`.
   - Some new item names differ slightly from the old ones (e.g. Southgate, Strawburst, Pineberry, Jamaica, Dubai Choco). Saved carts are updated automatically.
4. **Testimonials**: confirm they're real and you have permission, and that "500+ clients coached" is accurate. I changed "Ewah" to "Moses" inside two testimonial quotes; check that's what those clients said.
5. **Service area** in the schema lists Southgate, Wyandotte, Taylor, Allen Park, Trenton. Remove any you don't serve.
6. **Meal-plan page**: have Moses approve `free-meal-plan.html` (food choices and disclaimer). Source is in `scripts/build-pages.mjs`.

## 5. Send me when you have it
- Moses's certifications, years of experience, a photo and a short story (for an About section). Left out until you have real details.
- Real before/after results with written permission.
- How people order a weekly meal plan (phone only, form, payment link?). If you want online payment, tell me the provider (Stripe, Square, Toast).
- An email service (Mailchimp, Buttondown, Klaviyo) if you want the meal plan emailed too, and your choice on analytics (GA4, Plausible or none).
- Whether you want pickup orders and a staff dashboard back (they existed in commit `d7f1488`).

## 6. Ongoing
When prices, hours or menu items change: edit `index.html`, run `npm run build` then `npm run check`. The check flags hours, prices, FAQ or schema that are out of sync.
