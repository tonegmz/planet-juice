// Consistency checks. Run: npm run check   (exits non-zero if anything is out of sync)
import { readFileSync, existsSync, readdirSync } from "node:fs";
const root = new URL("../", import.meta.url);
const read = (f) => readFileSync(new URL(f, root), "utf8");
const pages = readdirSync(root).filter((f) => f.endsWith(".html"));
const problems = [];
const bad = (m) => problems.push(m);

const idx = read("index.html");
const jsonld = (t) => [...t.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g)].map((m) => JSON.parse(m[1]));

/* 1. every page: JSON-LD parses, local files exist, images have alt, basic SEO tags */
for (const f of pages) {
  const t = read(f);
  try { jsonld(t); } catch (e) { bad(`${f}: invalid JSON-LD (${e.message})`); }
  for (const m of t.matchAll(/(?:src|href)="(assets\/[^"#?]+)"/g)) if (!existsSync(new URL(m[1], root))) bad(`${f}: missing file ${m[1]}`);
  for (const m of t.matchAll(/<img\b[^>]*>/g)) if (!/\balt=/.test(m[0])) bad(`${f}: <img> without alt: ${m[0].slice(0, 70)}`);
  if (!/noindex/.test(t) && !/<link rel="canonical"/.test(t)) bad(`${f}: indexable page without canonical`);
  if (!/<title>[^<]{10,}/.test(t)) bad(`${f}: missing/short title`);
  if (!/<meta name="description" content="[^"]{50,}/.test(t)) bad(`${f}: missing/short meta description`);
  if ((t.match(/<h1[ >]/g) || []).length !== 1) bad(`${f}: expected exactly one <h1>`);
}

/* 2. hours: JS HOURS == visible table == JSON-LD */
const HOURS = new Function("return " + idx.match(/var HOURS = (\{[^}]*\});/)[1])();
const biz = jsonld(idx).find((o) => o["@type"]?.includes?.("FoodEstablishment"));
const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ldHours = {};
for (const s of biz.openingHoursSpecification) for (const d of [].concat(s.dayOfWeek)) ldHours[names.indexOf(d)] = [+s.opens.slice(0, 2), +s.closes.slice(0, 2)];
for (let d = 0; d < 7; d++) if (HOURS[d][0] !== ldHours[d]?.[0] || HOURS[d][1] !== ldHours[d]?.[1]) bad(`hours differ for ${names[d]}: JS ${HOURS[d]} vs JSON-LD ${ldHours[d]}`);
const fmt = (h) => (h % 12 || 12) + (h < 12 ? "am" : "pm");
for (const m of idx.matchAll(/<tr data-days="([\d,]+)"><td>[^<]*<\/td><td>(\d+(?:am|pm)) to (\d+(?:am|pm))<\/td>/g))
  for (const d of m[1].split(",")) if (fmt(HOURS[d][0]) !== m[2] || fmt(HOURS[d][1]) !== m[3]) bad(`hours table row ${m[1]} says ${m[2]}-${m[3]} but JS says ${fmt(HOURS[d][0])}-${fmt(HOURS[d][1])}`);

/* 3. phone and address identical everywhere */
for (const f of pages) {
  const t = read(f);
  if (/tel:\+1\d{10}/.test(t) && !t.includes("tel:+17344442819")) bad(`${f}: phone differs from +1-734-444-2819`);
  if (/\b\d{4,5} Eureka Rd/.test(t) && !t.includes("13615 Eureka Rd")) bad(`${f}: street address differs`);
}

/* 4. meal-plan prices on the page match the schema */
const mp = read("meal-plans.html");
const rows = [...mp.matchAll(/data-wk="(\d+)" data-mo="(\d+)" data-was="(\d+)"/g)];
const shown = rows.map((m) => +m[1]);
const schemaPrices = jsonld(mp).flatMap((o) => o["@graph"] || []).filter((x) => x["@type"] === "Product").map((x) => +x.offers.price);
if (JSON.stringify(shown) !== JSON.stringify(schemaPrices)) bad(`meal-plans prices ${shown} differ from schema ${schemaPrices}`);
for (const m of rows) if (+m[3] - +m[2] !== 45) bad(`meal-plans: "save $45" does not hold for ${m[0]}`);

/* 5. sitemap lists every indexable page, and only those */
const sm = read("sitemap.xml");
for (const f of pages) {
  const noindex = /noindex/.test(read(f));
  const listed = sm.includes(f === "index.html" ? "https://planetjuice.shop/</loc>" : `/${f}</loc>`);
  if (!noindex && !listed) bad(`sitemap.xml is missing ${f}`);
  if (noindex && listed) bad(`sitemap.xml lists noindex page ${f}`);
}

/* 6. FAQ markup matches the visible FAQ */
const faqLd = jsonld(idx).find((o) => o["@type"] === "FAQPage");
const strip = (s) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").trim();
const faqHtml = [...idx.matchAll(/<details[^>]*><summary>(.*?)<svg.*?<\/summary><p>(.*?)<\/p><\/details>/gs)].map((m) => [strip(m[1]), strip(m[2])]);
if (faqHtml.length !== faqLd.mainEntity.length) bad("FAQ count differs between page and FAQPage schema");
faqHtml.forEach(([q, a], i) => { const e = faqLd.mainEntity[i]; if (e && (e.name !== q || e.acceptedAnswer.text !== a)) bad(`FAQ #${i + 1} differs from schema: "${q}"`); });

/* 7. generated menu page is up to date with the menu data in index.html */
const prices = [...idx.matchAll(/\["(\d+oz)",(\d+\.\d+)\]/g)].map((m) => `${m[1]} $${m[2]}`);
const menu = read("menu.html");
for (const p of new Set(prices)) if (!menu.includes(p)) bad(`menu.html is stale: missing "${p}" (run npm run build)`);

if (problems.length) { console.error(problems.map((p) => "✗ " + p).join("\n")); console.error(`\n${problems.length} problem(s)`); process.exit(1); }
console.log(`✓ all checks passed (${pages.length} pages)`);
