# Owner to-do list

Things that need your accounts, your decisions or your real-world details. Roughly in priority order.

## Before you publish
1. **Confirm the domain is `planetjuice.shop`.** Canonicals, the sitemap and all schema use it. If it's different, tell me and I'll change it.
2. **Check Netlify's publish directory.** `netlify.toml` now sets it to the repo root. In Netlify: Project configuration → Build & deploy → check it deploys from this branch/repo and that the deploy succeeds.
3. **Review the free 7-day meal plan** (`free-meal-plan.html`, source in `scripts/build-pages.mjs`). I wrote it from the menu; Ewah should approve the food choices and the disclaimer, or send you the real plan.
4. **Delete two duplicate images** (I was blocked from deleting files): `assets/power-kafta.webp` and `assets/power-shrimp.webp`. The site now uses `bowl-kafta.webp` and `bowl-shrimp.webp`.
5. **Confirm the testimonials are real** and you have permission to use the names, and that "500+ clients coached" is accurate.

## Netlify (10 minutes)
6. **Form notifications**: Project → Forms → Form notifications → add an email notification for both forms (`free-call` and `meal-plan`) so you actually get leads. Optionally add an SMS/Slack route via Zapier.
7. **Spam**: Forms → Settings → enable reCAPTCHA or keep the honeypot (already in place).
8. **Domain**: pick one primary domain (www or bare) in Domain management, with HTTPS on.
9. Open the live `/free-meal-plan.html` and `/menu` once after deploy and confirm they load.

## Local SEO (biggest impact; I can't do these for you)
10. **Google Business Profile**: claim and verify it. Categories: Smoothie shop (primary), Juice shop, Personal trainer. Add website `https://planetjuice.shop/`, hours, phone, photos, the menu and the services (training, meal plans).
11. **Send me the exact latitude/longitude** of the shop (from the Google Maps pin) and I'll add `geo` to the schema. Also the exact business name as it appears on Google.
12. **Reviews**: ask customers for Google reviews; share the review link from your profile. Send me the link and I'll add a "Leave a review" button.
13. **Citations**: list the same name, address and phone on Yelp, Apple Business Connect, Bing Places, Facebook, DoorDash and the local chamber of commerce. Keep it identical: Planet Juice, 13615 Eureka Rd, Southgate, MI 48195, (734) 444-2819.
14. **Google Search Console**: add `planetjuice.shop`, verify, submit `https://planetjuice.shop/sitemap.xml`. Do the same in Bing Webmaster Tools.

## Content I need from you to build the next pages
15. **Trainer / About page**: Ewah's full name, certifications, years of experience, a photo, and a short story. Without real details I can't write this honestly, and it matters for trust and search.
16. **Real results**: before/after photos with written permission, and real review quotes with first name and town.
17. **Service area**: which nearby towns you really serve for delivery and meal plans (the schema currently lists Southgate, Wyandotte, Taylor, Allen Park, Trenton: delete any that are wrong).
18. **Meal-plan fulfilment**: how people actually order a weekly plan (phone only? a form? payment link?). If you want online ordering or payment, tell me which provider (Stripe, Square, Toast) and I'll wire it up.

## Decisions
19. **Email delivery of the meal plan**: right now it opens on the site. If you want it emailed too, pick an email service (Mailchimp, Buttondown, Klaviyo) and give me the form/API details; I'll connect it.
20. **Orders and a staff dashboard**: the earlier version of this repo (commit `d7f1488`) had pickup orders and an admin dashboard. Do you want that back, or stay with DoorDash and phone orders?
21. **Analytics**: choose Google Analytics 4, Plausible or nothing. I'll add the snippet once you decide.

## Ongoing
22. When prices, hours or menu items change, edit them in `index.html`, then run `npm run build` and `npm run check`. The check tells you if hours, prices, the FAQ or the schema fall out of sync.
23. Post to the Google Business Profile weekly (new smoothie, offer, photo). It helps local ranking.
