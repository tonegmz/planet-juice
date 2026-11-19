# Planet Juice website

Static site (no framework). Netlify deploys the repo root from `main`.

## Where things live

| To change | Edit | Then |
|---|---|---|
| Menu items, prices, notes, açaí builder bases/toppings, add-ons | `data/menu.json` | `npm run build` |
| Phone, address, geo, hours, DoorDash link, service area | `data/site.json` | `npm run build` |
| The free 7-day meal plan | `data/free-meal-plan.json` | `npm run build` |
| Coaching, packages, FAQ, testimonials, meal-plan prices (page copy) | `index.html`, `meal-plans.html` | `npm run check` |
| Menu photos | `assets/` (name = item `id`, or set `"img"` in the JSON) | `npm run check` |

`npm run build` rewrites everything marked `GENERATED:` in `index.html` and `meal-plans.html` (menu data for the cart, hours table, footer hours, FAQ hours sentence, add-ons, business and FAQ schema) and regenerates `menu.html`, `build-your-own-acai-bowl.html`, `free-meal-plan.html` and `404.html`. Do not hand-edit inside those markers or those four files.

`npm run check` fails if: generated files are stale, a menu photo is missing or unused, a link or `#anchor` is broken, an image has no alt text, phone/address/DoorDash differ anywhere, meal-plan prices disagree with their schema, or the sitemap is wrong.

Netlify runs both on every deploy (`netlify.toml`). If they fail the deploy fails and the previous site stays live, so a bad edit cannot go public.

## How the pieces connect

```
data/site.json ──► business schema, hours badge + table, footer hours, FAQ hours
data/menu.json ──► cart + menu on index.html ──► menu.html
              └──► build-your-own-acai-bowl.html (bases, toppings, price, signature bowls)
              └──► add-ons row (Pre-Workout shows only under its drink categories)
forms (Netlify) ──► free-call: consultation requests    meal-plan: signup ──► free-meal-plan.html
```

Run locally: `npm start` then open http://localhost:3000.
