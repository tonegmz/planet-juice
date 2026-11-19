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
<body id="top">
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
  menuSections += `<section class="menu-cat" id="${id}"><h2 class="h-display">${esc(c)}</h2><p class="lead">${esc(NOTES[c] || "Prices for this part of the menu are in store and on DoorDash.")}</p>${c === "Açaí Bowls" ? '<a class="menu-byo" href="build-your-own-acai-bowl.html#build"><b>Build Your Own Açaí Bowl · $9.99</b><span>Choose a base and up to 4 free toppings. Build yours →</span></a>' : ""}<div class="menu-grid">`;
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
menuSections += `<section class="menu-cat" id="add-ons"><h2 class="h-display">Add-ons</h2><p class="lead">Boost any drink. Pre-Workout goes in smoothies, protein smoothies, refreshers and shots.</p><div class="menu-grid">
<article class="menu-item"><div><h3>Nutrition Add-Ons · $1.99 each</h3><p>Fat Burner, Caffeine, Recovery, Immune, Vitamin C, Collagen, Creatine, Pump or Omega-3. Protein options in store.</p></div></article>
<article class="menu-item"><div><h3>Pre-Workout · $3.49</h3><p>Level 1 · Focus, Level 2 · Intense, Level 3 · Extreme. Ask at the counter which one fits your training.</p></div></article></div></section>`;
menuLd.push({ "@type": "MenuSection", name: "Add-ons", hasMenuItem: [
  { "@type": "MenuItem", name: "Nutrition Add-Ons", offers: { "@type": "Offer", price: "1.99", priceCurrency: "USD" } },
  { "@type": "MenuItem", name: "Pre-Workout", description: "Level 1 Focus, Level 2 Intense, Level 3 Extreme", offers: { "@type": "Offer", price: "3.49", priceCurrency: "USD" } }] });
const chips = cats.concat(["Add-ons"]).map((c) => `<a href="#${c.toLowerCase().replace(/[^a-z0-9]+/g, "-")}">${esc(c)}</a>`).join("");
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
.menu-item .stats{color:var(--purple);font-weight:600;font-size:13px}
.menu-byo{display:flex;flex-direction:column;gap:4px;margin-top:20px;padding:18px 20px;border-radius:16px;background:var(--purple);color:#fff;text-decoration:none}
.menu-byo b{font:800 20px/1.2 var(--display)}.menu-byo span{opacity:.92;font-size:14px}`;
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

/* ================= build-your-own-acai-bowl.html ================= */
const BYO_PRICE = 9.99, BYO_FREE = 4, BYO_EXTRA = 0.75;
const bases = [
  ["Organic Açaí", "assets/base-acai.webp"], ["Dragonfruit", "assets/base-pitaya.webp"],
  ["Ube", "assets/base-ube.webp"], ["Blue Spirulina", "assets/base-spirulina.webp"],
  ["Mango", "assets/base-mango.webp"], ["Coconut", "assets/base-coconut.webp"],
];
const toppings = {
  Fruits: ["Blueberries", "Bananas", "Strawberries", "Kiwi"],
  Power: ["Peanut butter", "Granola", "Chia seeds", "Greek yogurt"],
  Extras: ["Nutella", "Honey", "Coco flakes"],
};
const signature = [
  ["Nutella Bowl", "Strawberry · Banana · Nutella · Granola", "assets/bowl-nutella.webp"],
  ["Planet Açaí", "Strawberry · Banana · Granola · Honey", "assets/bowl-planet-acai.webp"],
  ["Very Berry", "Strawberry · Blueberry · Granola · Honey", "assets/bowl-very-berry.webp"],
  ["Peanut Butter", "Banana · Blueberry · Granola · Honey", null],
];
const baseHtml = bases.map(([n, img, color], i) => {
  const pic = img ? `<img src="${img}" alt="" width="${dims(img).w}" height="${dims(img).h}" loading="lazy">` : `<span class="swatch" style="background:${color}" aria-hidden="true"></span>`;
  return `<label class="opt base"><input type="radio" name="base" value="${esc(n)}"${i === 0 ? " checked" : ""}>${pic}<span>${esc(n)}</span></label>`;
}).join("");
const topHtml = Object.entries(toppings).map(([g, list]) => `<fieldset class="tgroup"><legend>${g}</legend>${list.map((t) => `<label class="opt top"><input type="checkbox" name="topping" value="${esc(t)}"><span>${esc(t)}</span></label>`).join("")}</fieldset>`).join("");
const sigHtml = signature.map(([n, d, img]) => `<article class="menu-item">${img ? `<img src="${img}" alt="${esc(n)} açaí bowl" width="${dims(img).w}" height="${dims(img).h}" loading="lazy">` : `<span class="swatch ph" aria-hidden="true"></span>`}<div><h3>${esc(n)}</h3><p>${esc(d)}</p><p class="price">$9.99</p></div></article>`).join("");
const byoCss = `
.byo-focus{background:var(--purple);color:#fff;padding-block:clamp(44px,6vw,80px);scroll-margin-top:84px}
.byo-focus .eyebrow{color:var(--lav-soft)}
.byo-focus h1{color:#fff}
.byo-focus .lead{color:rgba(255,255,255,.92)}
.byo-step{margin-top:36px}
.byo-step h2{display:flex;align-items:center;gap:12px;font:800 clamp(22px,3vw,30px)/1.1 var(--display);margin:0 0 6px;color:#fff}
.byo-step h2 b{display:inline-grid;place-items:center;width:38px;height:38px;border-radius:50%;background:#fff;color:var(--purple);font-size:18px}
.byo-step .lead{margin-top:0}
.byo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:14px;margin-top:16px}
.opt{position:relative;cursor:pointer}
.opt input{position:absolute;opacity:0;inset:0;cursor:pointer;margin:0}
.opt.base{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:16px 10px 14px;aspect-ratio:1/1;border-radius:18px;background:#fff;color:var(--ink);font:700 14px/1.2 var(--body);text-align:center;box-shadow:0 6px 18px -10px rgba(20,10,40,.45)}
.opt.base img{width:84px;height:84px;object-fit:contain;display:block}
.opt.base:has(input:checked){background:var(--lav-soft);box-shadow:0 0 0 3px var(--ink)}
.opt.base:has(input:checked)::after{content:"\\2713";position:absolute;top:8px;right:8px;width:24px;height:24px;border-radius:50%;background:var(--purple);color:#fff;display:grid;place-items:center;font-size:14px;font-weight:800}
.opt:has(input:focus-visible){outline:3px solid #fff;outline-offset:3px}
.tgroups{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-top:16px}
.tgroup{border:0;border-radius:18px;padding:16px;margin:0;display:grid;gap:8px;align-content:start;background:#fff;color:var(--ink)}
.tgroup legend{float:left;width:100%;padding:0;margin:0 0 4px;font:800 12px/1 var(--body);letter-spacing:.12em;text-transform:uppercase;color:var(--purple)}
.tgroup legend+*{clear:both}
.opt.top{display:block;padding:11px 12px;border:1.5px solid var(--line);border-radius:10px;font:600 14px/1.2 var(--body);background:#fff}
.opt.top:has(input:checked){border-color:var(--purple);background:var(--lav-soft);box-shadow:0 0 0 2px var(--purple) inset}
.byo-sum{position:sticky;bottom:12px;margin-top:28px;padding:18px;border-radius:18px;background:var(--ink);color:#fff;display:flex;flex-wrap:wrap;gap:14px;align-items:center;justify-content:space-between;z-index:5}
.byo-sum p{margin:0}.byo-sum .tot{font:800 26px/1 var(--display)}.byo-sum small{opacity:.8;display:block;margin-top:4px}
.byo-sum .btns{display:flex;flex-wrap:wrap;gap:10px}
@media(max-width:560px){.byo-sum{padding:12px;gap:8px;bottom:8px}.byo-sum .tot{font-size:22px}.byo-sum .btns{flex-wrap:nowrap;gap:8px;width:100%}.byo-sum .btn{flex:1;min-height:40px;padding:0 10px;font-size:13.5px}.opt.base{aspect-ratio:auto;min-height:130px}}
.byo-fine{margin:16px 0 0;font-size:14px;color:rgba(255,255,255,.88)}
.byo-more{padding-block:clamp(40px,6vw,72px)}
.byo-more h2{font:800 clamp(22px,3vw,30px)/1.1 var(--display);margin:0}
.menu-item{display:flex;gap:14px;align-items:flex-start;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--white)}
.menu-item img{width:92px;height:92px;object-fit:cover;border-radius:10px;flex:none;background:var(--mist)}
.menu-item h3{margin:0 0 4px;font:700 17px/1.2 var(--body)}.menu-item p{margin:0 0 4px;color:var(--muted);font-size:14px}
.menu-item .price{color:var(--ink);font-weight:700}
.swatch.ph{display:block;width:92px;height:92px;border-radius:10px;background:var(--lav-soft);flex:none}
.menu-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;margin-top:16px}`;
const byoJs = `<script>
(function(){
  var P=${BYO_PRICE},FREE=${BYO_FREE},EX=${BYO_EXTRA};
  var sum=document.getElementById("sum"),tot=document.getElementById("tot"),note=document.getElementById("note"),copy=document.getElementById("copy"),msg=document.getElementById("copymsg");
  function state(){
    var b=document.querySelector("input[name=base]:checked"), t=[].slice.call(document.querySelectorAll("input[name=topping]:checked")).map(function(x){return x.value});
    var extra=Math.max(0,t.length-FREE), price=P+extra*EX;
    tot.textContent="$"+price.toFixed(2);
    note.textContent=(b?b.value:"Pick a base")+" · "+t.length+" topping"+(t.length===1?"":"s")+(t.length<=FREE?" ("+(FREE-t.length)+" free left)":" ("+extra+" extra at $"+EX.toFixed(2)+")");
    return {base:b?b.value:"",toppings:t,price:price};
  }
  document.addEventListener("change",state); state();
  copy.addEventListener("click",function(){
    var s=state(), text="Build-your-own açaí bowl: "+s.base+" base"+(s.toppings.length?" with "+s.toppings.join(", "):"")+" ("+tot.textContent+")";
    function done(m){msg.textContent=m}
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){done("Copied. Paste it into the DoorDash notes or read it to us on the phone.")},function(){done(text)})}else{done(text)}
  });
})();
</script>`;
const byoMain = `<section class="byo-focus" id="build"><div class="wrap">
<p class="eyebrow">Açaí bar · Southgate, MI</p>
<h1 class="h-display">Build your own açaí bowl</h1>
<p class="lead">Pick a base, add up to ${BYO_FREE} toppings free, and it's $${BYO_PRICE} at the counter on Eureka Road. Extra toppings are $${BYO_EXTRA.toFixed(2)} each.</p>
<div class="byo-step"><h2><b>1</b>Choose a base</h2><p class="lead">Pick one.</p><div class="byo-grid" role="radiogroup" aria-label="Base">${baseHtml}</div></div>
<div class="byo-step"><h2><b>2</b>Choose your toppings</h2><p class="lead">Up to ${BYO_FREE} free toppings. Extra toppings $${BYO_EXTRA.toFixed(2)} each.</p><div class="tgroups">${topHtml}</div></div>
<div class="byo-sum" id="sum"><div><p class="tot" id="tot">$${BYO_PRICE.toFixed(2)}</p><small id="note"></small></div>
<div class="btns"><button class="btn btn-white" type="button" id="copy">Copy my bowl</button><a class="btn btn-purple" style="background:#fff;color:var(--purple)" href="${DD}" target="_blank" rel="noopener">Order on DoorDash</a></div></div>
<p class="byo-fine" id="copymsg" role="status">The builder shows your price. Order at the counter, call us, or paste your bowl into the notes when you order on DoorDash. Delivery prices on DoorDash may differ from the shop.</p>
</div></section>
<section class="byo-more"><div class="wrap">
<h2>Or choose one of our options</h2><p class="lead" style="margin-top:6px">Every signature açaí bowl is $9.99.</p><div class="menu-grid">${sigHtml}</div>
<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:28px"><a class="btn btn-purple btn-lg" href="${DD}" target="_blank" rel="noopener">Order on DoorDash</a><a class="btn btn-line btn-lg" href="tel:+17344442819">Call (734) 444-2819</a><a class="btn btn-line btn-lg" href="menu.html">See the full menu</a></div>
</div></section>`;
const byoUrl = BASE + "build-your-own-acai-bowl.html";
page({
  file: "build-your-own-acai-bowl.html",
  title: "Build Your Own Açaí Bowl | Southgate, MI | Planet Juice",
  desc: "Build your own açaí bowl at Planet Juice in Southgate, MI: choose an açaí, dragonfruit, ube, blue spirulina, mango or coconut base and up to 4 free toppings for $9.99.",
  canonical: byoUrl,
  extraHead: ld({ "@context": "https://schema.org", "@type": "MenuItem", "@id": byoUrl + "#bowl", name: "Build Your Own Açaí Bowl", description: "Choose a base (organic açaí, dragonfruit, ube, blue spirulina, mango or coconut) and up to 4 free toppings. Extra toppings $0.75 each.", image: BASE + "assets/bowl-planet-acai.webp", offers: { "@type": "Offer", price: BYO_PRICE.toFixed(2), priceCurrency: "USD" } }) + "\n" + ld(crumbs("Build Your Own Açaí Bowl", byoUrl)),
  css: byoCss, main: byoMain, extraScript: byoJs,
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
