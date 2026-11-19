// Consistency checks. Run: npm run check   (exits non-zero if anything is out of sync)
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { read, exists, site, menu, PRODUCTS, json } from "./lib.mjs";

const pages = readdirSync(new URL("../", import.meta.url)).filter((f) => f.endsWith(".html"));
const problems = [];
const bad = (m) => problems.push(m);
const jsonld = (t) => [...t.matchAll(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g)].map((m) => JSON.parse(m[1]));
const html = Object.fromEntries(pages.map((f) => [f, read(f)]));

/* 1. generated regions and pages match data/*.json (hours, menu, schema, FAQ markup...) */
const b = spawnSync(process.execPath, ["scripts/build.mjs", "--check"], { cwd: new URL("../", import.meta.url), encoding: "utf8" });
if (b.status !== 0) bad((b.stderr || b.stdout || "build --check failed").trim());

/* 2. data sanity */
const ids = new Set();
for (const p of PRODUCTS) {
  if (ids.has(p.id)) bad(`duplicate menu id: ${p.id}`);
  ids.add(p.id);
  if (!exists(p.img)) bad(`menu item "${p.name}" is missing image ${p.img}`);
  for (const s of p.sizes || []) if (!(s[1] > 0)) bad(`menu item "${p.name}" has a bad price`);
}
for (const base of menu.byo.bases) if (!exists(`assets/${base.img}.webp`)) bad(`build-your-own base "${base.name}" is missing its image`);
for (const l of menu.addons.preWorkout.levels) if (!exists(`assets/${l.img}.webp`)) bad(`pre-workout image missing: ${l.img}`);
const used = new Set([...PRODUCTS.map((p) => p.img), ...menu.byo.bases.map((x) => `assets/${x.img}.webp`), ...menu.addons.preWorkout.levels.map((l) => `assets/${l.img}.webp`)]);
for (const f of readdirSync(new URL("../assets", import.meta.url))) {
  if (/^(base|bowl|cafe|kids|pick|pro|pre|refresher|shot|power)-|^[a-z-]+\.webp$/.test(f) && !used.has("assets/" + f) && !Object.values(html).some((h) => h.includes("assets/" + f)))
    bad(`assets/${f} is not used anywhere (delete it or add it to data/menu.json)`);
}

/* 3. every page: JSON-LD parses, local files exist, alt text, basic SEO tags */
for (const f of pages) {
  const t = html[f];
  try { jsonld(t); } catch (e) { bad(`${f}: invalid JSON-LD (${e.message})`); }
  for (const m of t.matchAll(/(?:src|href)="(assets\/[^"#?]+)"/g)) if (!exists(m[1])) bad(`${f}: missing file ${m[1]}`);
  for (const m of t.matchAll(/<img\b[^>]*>/g)) if (!/\balt=/.test(m[0])) bad(`${f}: <img> without alt: ${m[0].slice(0, 70)}`);
  if (!/noindex/.test(t) && !/<link rel="canonical"/.test(t)) bad(`${f}: indexable page without canonical`);
  if (!/<title>[^<]{10,}/.test(t)) bad(`${f}: missing/short title`);
  if (!/<meta name="description" content="[^"]{50,}/.test(t)) bad(`${f}: missing/short meta description`);
  if ((t.match(/<h1[ >]/g) || []).length !== 1) bad(`${f}: expected exactly one <h1>`);
}

/* 4. internal links and #anchors point at something that exists */
const idsOf = (t) => new Set([...t.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
for (const f of pages) {
  for (const m of html[f].matchAll(/\bhref="([^"]*)"/g)) {
    const h = m[1];
    if (!h || /^(https?:|mailto:|tel:|javascript:)/.test(h) || h === "#" || /['+]/.test(h)) continue; // skip hrefs assembled by page scripts
    const [file, frag] = h.split("#");
    const target = file || f;
    if (file && !pages.includes(target) && !exists(target)) { bad(`${f}: link to missing page ${h}`); continue; }
    if (frag && pages.includes(target) && !idsOf(html[target]).has(frag)) bad(`${f}: link ${h} points at a missing #${frag}`);
  }
}

/* 5. phone, address and DoorDash link are the same everywhere */
for (const f of pages) {
  const t = html[f];
  for (const m of t.matchAll(/tel:(\+?\d+)/g)) if (m[1] !== site.phone.tel) bad(`${f}: phone ${m[1]} differs from data/site.json`);
  for (const m of t.matchAll(/\b(\d{4,5}) Eureka Rd/g)) if (m[0] !== site.address.street) bad(`${f}: street address "${m[0]}" differs from data/site.json`);
  for (const m of t.matchAll(/https:\/\/www\.doordash\.com\/[^"'\s<]+/g)) if (m[0] !== site.doordash) bad(`${f}: DoorDash link differs from data/site.json`);
}

/* 6. meal-plan prices on the page match the schema and the "save $45" claim */
const mp = html["meal-plans.html"];
const rows = [...mp.matchAll(/data-wk="(\d+)" data-mo="(\d+)" data-was="(\d+)"/g)];
const shown = rows.map((m) => +m[1]);
const schemaPrices = jsonld(mp).flatMap((o) => o["@graph"] || []).filter((x) => x["@type"] === "Product").map((x) => +x.offers.price);
if (JSON.stringify(shown) !== JSON.stringify(schemaPrices)) bad(`meal-plans prices ${shown} differ from schema ${schemaPrices}`);
for (const m of rows) if (+m[3] - +m[2] !== 45) bad(`meal-plans: "save $45" does not hold for ${m[0]}`);

/* 7. sitemap lists every indexable page, and only those */
const sm = read("sitemap.xml");
for (const f of pages) {
  const noindex = /noindex/.test(html[f]);
  const listed = sm.includes(f === "index.html" ? `${site.url}</loc>` : `/${f}</loc>`);
  if (!noindex && !listed) bad(`sitemap.xml is missing ${f}`);
  if (noindex && listed) bad(`sitemap.xml lists noindex page ${f}`);
}
if (!read("robots.txt").includes(site.url + "sitemap.xml")) bad("robots.txt does not point at the sitemap");

if (problems.length) { console.error(problems.map((p) => "✗ " + p).join("\n") + `\n\n${problems.length} problem(s)`); process.exit(1); }
console.log(`✓ all checks passed (${pages.length} pages, ${PRODUCTS.length} menu items)`);
