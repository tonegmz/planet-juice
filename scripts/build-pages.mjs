// Generates menu.html, free-meal-plan.html and 404.html.
//
// Why: the header, footer, styles and icons live in meal-plans.html (the "shell"), and the menu
// data lives in the script inside index.html. This script reuses both so the extra pages cannot
// drift from the main ones. Run:  npm run build   (then commit the generated files).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const BASE = "https://planetjuice.shop/";
const DD = "https://www.doordash.com/store/planet-juice-southgate-30234389/39308575/";
const read = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const write = (f, s) => writeFileSync(new URL("../" + f, import.meta.url), s);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const money = (n) => "$" + n.toFixed(2);

/* ---------- shell pieces taken from meal-plans.html ---------- */
const shell = read("meal-plans.html");
const between = (s, a, b) => { const i = s.indexOf(a); const j = s.indexOf(b, i); if (i < 0 || j < 0) throw new Error("shell marker missing: " + a); return s.slice(i, j + b.length); };
const style = between(shell, "<style>", "</style>");
const sprite = between(shell, '<svg width="0"', "</svg>");
const top = between(shell, '<div class="topbar"', "</header>").replace(/ aria-current="page"/g, "");
const footer = between(shell, "<footer", "</footer>");
const scripts = [...shell.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const navScript = "<script>" + scripts[scripts.length - 1] + "</script>";
const fonts = shell.match(/<link rel="preconnect" href="https:\/\/fonts.googleapis.com">[\s\S]*?display=swap">/)[0];

/* ---------- menu data taken from index.html ---------- */
const idx = read("index.html");
const dataSrc = idx.slice(idx.indexOf('var IMG = "assets/";'), idx.indexOf("var REVIEWS"));
const { PRODUCTS, NOTES, CATS } = new Function(dataSrc + "; return {PRODUCTS:PRODUCTS,NOTES:NOTES,CATS:CATS};")();

function dims(file) {
  try {
    const out = execFileSync("python3", ["-c", "import sys;from PIL import Image;print(*Image.open(sys.argv[1]).size)", file]).toString().trim().split(" ");
    return { w: out[0], h: out[1] };
  } catch { return { w: 600, h: 600 }; }
}

function page({ file, title, desc, canonical, robots, extraHead = "", css = "", main, extraScript = "" }) {
  const og = canonical
    ? `<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Planet Juice"><meta property="og:locale" content="en_US">
<meta property="og:url" content="${canonical}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${BASE}assets/og-share.jpg"><meta name="twitter:card" content="summary_large_image">`
    : "";
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="${robots || "index, follow, max-image-preview:large"}">
<meta name="theme-color" content="#7B5EA7">
${og}
<link rel="icon" type="image/png" href="assets/favicon.png">
<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
${extraHead}
${fonts}
${style.replace("</style>", css + "\n</style>")}
</head>
<body>
${sprite}
${top}
<main>
${main}
</main>
${footer}
${navScript}
${extraScript}
</body>
</html>
`;
  write(file, html);
  console.log("wrote", file, Math.round(html.length / 1024) + " KB");
}

const ld = (o) => '<script type="application/ld+json">\n' + JSON.stringify(o) + "\n</script>";

/* ================= menu.html ================= */
const cats = CATS.filter((c) => c !== "All");
const priceText = (p) => (p.sizes ? p.sizes.map((s) => `${s[0]} ${money(s[1])}`).join(" · ") : "Price in store");
let menuSections = "";
const menuLd = [];
for (const c of cats) {
  const items = PRODUCTS.filter((p) => p.cat === c);
  if (!items.length) continue;
  const id = c.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  menuSections += `<section class="menu-cat" id="${id}"><h2 class="h-display">${esc(c)}</h2><p class="lead">${esc(NOTES[c] || "Prices for this part of the menu are in store and on DoorDash.")}</p><div class="menu-grid">`;
  for (const p of items) {
    const { w, h } = dims(p.img);
    menuSections += `<article class="menu-item"><img src="${p.img}" alt="${esc(p.name)}" width="${w}" height="${h}" loading="lazy"><div><h3>${esc(p.name)}</h3><p>${esc(p.desc)}</p>${p.stats ? `<p class="stats">${esc(p.stats)}</p>` : ""}<p class="price">${esc(priceText(p))}</p></div></article>`;
  }
  menuSections += "</div></section>";
  menuLd.push({
    "@type": "MenuSection", name: c,
    hasMenuItem: items.map((p) => ({
      "@type": "MenuItem", name: p.name, description: p.desc,
      ...(p.sizes ? { offers: p.sizes.map((s) => ({ "@type": "Offer", name: s[0], price: s[1].toFixed(2), priceCurrency: "USD" })) } : {}),
    })),
  });
}
const chips = cats.map((c) => `<a href="#${c.toLowerCase().replace(/[^a-z0-9]+/g, "-")}">${esc(c)}</a>`).join("");
const menuCss = `
.menu-hero{padding-block:clamp(48px,7vw,88px)}
.menu-chips{display:flex;flex-wrap:wrap;gap:8px;margin:24px 0 0}
.menu-chips a{padding:9px 14px;border:1.5px solid var(--line);border-radius:999px;font:600 14px/1 var(--body);color:var(--ink);text-decoration:none;background:var(--white)}
.menu-chips a:hover{border-color:var(--purple);color:var(--purple)}
.menu-cat{padding-block:clamp(36px,5vw,64px);border-top:1px solid var(--line)}
.menu-cat h2{font-size:clamp(28px,4vw,42px)}
.menu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px;margin-top:28px}
.menu-item{display:flex;gap:14px;align-items:flex-start;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--white)}
.menu-item img{width:92px;height:92px;object-fit:cover;border-radius:10px;flex:none;background:var(--mist)}
.menu-item h3{margin:0 0 4px;font:700 17px/1.2 var(--body)}
.menu-item p{margin:0 0 6px;color:var(--muted);font-size:14px}
.menu-item .price{color:var(--ink);font-weight:700}
.menu-item .stats{color:var(--purple);font-weight:600;font-size:13px}`;
const menuMain = `<section class="section menu-hero mist"><div class="wrap">
<p class="eyebrow">Smoothie bar · Southgate, MI</p>
<h1 class="h-display">Our full menu</h1>
<p class="lead">Real-fruit smoothies, protein shakes, açaí bowls, power bowls, refreshers and coffee at 13615 Eureka Rd in Southgate, Michigan. Order at the counter, by phone or on DoorDash.</p>
<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:22px">
<a class="btn btn-purple btn-lg" href="${DD}" target="_blank" rel="noopener">Order on DoorDash</a>
<a class="btn btn-line btn-lg" href="index.html#menu">Build a cart on our site</a>
<a class="btn btn-line btn-lg" href="tel:+17344442819">Call (734) 444-2819</a></div>
<nav class="menu-chips" aria-label="Menu categories">${chips}</nav>
<p class="lead" style="font-size:14px">Delivery areas, prices and hours on DoorDash may differ from the shop.</p>
</div></section>
<div class="wrap">${menuSections}</div>`;
const menuGraph = { "@context": "https://schema.org", "@type": "Menu", "@id": BASE + "menu.html#menu", url: BASE + "menu.html", name: "Planet Juice menu", inLanguage: "en-US", hasMenuSection: menuLd };
const crumbs = (name, url) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Planet Juice", item: BASE }, { "@type": "ListItem", position: 2, name, item: url }] });
page({
  file: "menu.html",
  title: "Menu | Smoothies, Protein Shakes & Açaí Bowls in Southgate, MI | Planet Juice",
  desc: "The full Planet Juice menu in Southgate, MI: real-fruit smoothies, protein shakes, açaí bowls, power bowls, refreshers, coffee and wellness shots, with prices.",
  canonical: BASE + "menu.html",
  extraHead: ld(menuGraph) + "\n" + ld(crumbs("Menu", BASE + "menu.html")),
  css: menuCss, main: menuMain,
});

/* ================= free-meal-plan.html ================= */
const days = [
  ["Day 1", "Banana Bread smoothie (oats, banana)", "Chicken Bowl", "Fruit and a handful of nuts", "Steak Bowl, or grilled steak, potatoes and vegetables at home"],
  ["Day 2", "Açaí bowl: Very Berry or Planet Açaí", "Falafel Bowl", "Plain yogurt with berries", "Chicken, rice and a big portion of vegetables"],
  ["Day 3", "Protein smoothie: Planet Power or PB Lover", "Shrimp Bowl", "Apple with peanut butter", "Beef kafta bowl, or lean ground beef, rice and salad"],
  ["Day 4", "Banana Bread smoothie plus a boiled egg or two", "Chicken Bowl", "Fruit smoothie (Triple Berry or Mango Mania)", "Falafel, hummus, salad and a small portion of rice"],
  ["Day 5", "Protein smoothie: Blue Pineapple or Pina Colada", "Steak Bowl", "Carrots and hummus", "Grilled fish or shrimp with vegetables"],
  ["Day 6", "Açaí bowl: Choco Banana or Planet Açaí", "Beef kafta bowl", "Handful of nuts and a piece of fruit", "A meal you enjoy with a protein, a vegetable and a carb you like"],
  ["Day 7", "Protein smoothie: Southgate Bliss", "Plan and prep: cook proteins and rice for next week", "Fruit and yogurt", "Chicken Bowl, or a simple home-cooked version"],
];
const dayHtml = days.map((d) => `<article class="mp-day"><h3>${d[0]}</h3><dl><dt>Breakfast</dt><dd>${esc(d[1])}</dd><dt>Lunch</dt><dd>${esc(d[2])}</dd><dt>Snack</dt><dd>${esc(d[3])}</dd><dt>Dinner</dt><dd>${esc(d[4])}</dd></dl></article>`).join("");
const freeCss = `
.mp-day{border:1px solid var(--line);border-radius:14px;padding:18px;background:var(--white);break-inside:avoid}
.mp-day h3{margin:0 0 8px;font:800 20px/1.1 var(--display);color:var(--purple)}
.mp-day dl{margin:0;display:grid;grid-template-columns:90px 1fr;gap:6px 10px;font-size:15px}
.mp-day dt{font-weight:700}.mp-day dd{margin:0;color:var(--muted)}
.mp-days{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px;margin-top:28px}
.mp-notes{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-top:28px}
.mp-notes div{background:var(--mist);border-radius:14px;padding:18px}
.mp-notes h3{margin:0 0 8px;font:700 17px/1.2 var(--body)}.mp-notes ul{margin:0;padding-left:18px;color:var(--muted)}
@media print{.topbar,.header,.footer,.no-print{display:none!important}.section{padding-block:16px}body{font-size:13px}}`;
const freeMain = `<section class="section"><div class="wrap">
<p class="eyebrow">Free download</p>
<h1 class="h-display">Your 7-day starter meal plan</h1>
<p class="lead">One simple week of meals built around Planet Juice favorites and easy home meals. Swap days around, repeat what you like, and use it as a starting point.</p>
<p class="no-print" style="margin-top:18px;display:flex;flex-wrap:wrap;gap:12px"><button class="btn btn-purple btn-lg" type="button" onclick="window.print()">Print or save as PDF</button><a class="btn btn-line btn-lg" href="menu.html">See the full menu</a></p>
<div class="mp-days">${dayHtml}</div>
<div class="mp-notes">
<div><h3>How to use it</h3><ul><li>Drink water through the day.</li><li>Build each meal around a protein, a vegetable and a carb you enjoy.</li><li>Prep proteins and rice once and reuse them for several meals.</li><li>Protein smoothies on our menu are about 400 calories with about 40 to 47g of protein, so they work as a meal or a post-workout refuel.</li></ul></div>
<div><h3>Easy swaps</h3><ul><li>Any bowl protein for another: chicken, steak, kafta, shrimp or falafel.</li><li>Almond or oat milk in any smoothie.</li><li>Fruit, yogurt or nuts for any snack.</li></ul></div>
<div><h3>Good to know</h3><ul><li>This is a general starting guide, not medical advice. If you have a health condition, allergy or take medication, check with your doctor first.</li><li>Portions depend on your goal. That's what a custom plan is for.</li></ul></div>
</div>
<div class="no-print" style="margin-top:36px;padding:24px;border-radius:16px;background:var(--mist)">
<h2 class="h-display" style="font-size:clamp(24px,3.4vw,34px)">Want a plan built for you?</h2>
<p class="lead">Book a free 15-minute consultation, or get ready-made bowls every week.</p>
<p style="margin-top:16px;display:flex;flex-wrap:wrap;gap:12px"><a class="btn btn-purple btn-lg" href="index.html#book">Book a Free Consultation</a><a class="btn btn-line btn-lg" href="meal-plans.html">See weekly bowl plans</a></p></div>
</div></section>`;
page({
  file: "free-meal-plan.html",
  title: "Your 7-Day Starter Meal Plan | Planet Juice",
  desc: "A free 7-day starter meal plan from Planet Juice in Southgate, MI.",
  robots: "noindex, follow",
  css: freeCss, main: freeMain,
});

/* ================= 404.html ================= */
page({
  file: "404.html",
  title: "Page not found | Planet Juice",
  desc: "That page doesn't exist. Head back to the Planet Juice homepage.",
  robots: "noindex, follow",
  extraHead: '<base href="/">',
  main: `<section class="section"><div class="wrap center" style="text-align:center">
<p class="eyebrow">404</p><h1 class="h-display">That page isn't on our menu.</h1>
<p class="lead" style="margin-inline:auto">Let's get you back to something good.</p>
<p style="margin-top:22px;display:flex;flex-wrap:wrap;gap:12px;justify-content:center"><a class="btn btn-purple btn-lg" href="index.html">Go to the homepage</a><a class="btn btn-line btn-lg" href="menu.html">See the menu</a></p>
</div></section>`,
});
