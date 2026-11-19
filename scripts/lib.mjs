// Shared helpers for the build and check scripts. No dependencies.
import { readFileSync, existsSync } from "node:fs";

const root = new URL("../", import.meta.url);
export const read = (f) => readFileSync(new URL(f, root), "utf8");
export const exists = (f) => existsSync(new URL(f, root));
export const json = (f) => JSON.parse(read(f));

export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const money = (n) => "$" + Number(n).toFixed(2);
export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* ---------- data ---------- */
export const site = json("data/site.json");
export const menu = json("data/menu.json");
export const BASE = site.url;

/** Flat product list used by the cart/menu on index.html and by menu.html. */
export const PRODUCTS = menu.categories.flatMap((c) =>
  c.items.map((i) => ({
    id: i.id, name: i.name, desc: i.desc, cat: c.name,
    ...(i.stats ? { stats: i.stats } : {}),
    img: `assets/${i.img || i.id}.webp`,
    sizes: i.sizes || c.sizes || null,
  })),
);
export const CATS = ["All", ...menu.categories.map((c) => c.name)];
export const NOTES = { ...Object.fromEntries(menu.categories.filter((c) => c.note).map((c) => [c.name, c.note])), All: menu.allNote };
export const PRE_CATS = menu.categories.filter((c) => c.preWorkout).map((c) => c.name);

/* ---------- hours ---------- */
export const fmtHour = (h) => (h % 12 || 12) + (h < 12 ? "am" : "pm");
export const hoursRange = (g) => `${fmtHour(g.open)} to ${fmtHour(g.close)}`;
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const hoursJs = () => "{" + [0, 1, 2, 3, 4, 5, 6].map((d) => { const g = site.hours.find((x) => x.days.includes(d)); return `${d}:[${g.open},${g.close}]`; }).join(",") + "}";
export const hoursTableRows = () => site.hours.map((g) => `        <tr data-days="${g.days.join(",")}"><td>${g.label}</td><td>${hoursRange(g)}</td></tr>`).join("\n");
export const hoursSentence = () => {
  const parts = site.hours.map((g) => `${g.label} ${hoursRange(g)}`);
  return parts.length > 1 ? parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1] : parts[0];
};
export const footerHours = () => `${site.hours[0].short} ${hoursRange(site.hours[0])}<br>${site.hours.slice(1).map((g) => `${g.short} ${hoursRange(g)}`).join(" · ")}`;
export const hoursSpec = () => site.hours.map((g) => ({
  "@type": "OpeningHoursSpecification",
  dayOfWeek: g.days.length === 1 ? DAY_NAMES[g.days[0]] : g.days.map((d) => DAY_NAMES[d]),
  opens: String(g.open).padStart(2, "0") + ":00", closes: String(g.close).padStart(2, "0") + ":00",
}));

/* ---------- image sizes (webp, png, jpg) without dependencies ---------- */
export function imageSize(file) {
  const b = readFileSync(new URL(file, root));
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    const t = b.toString("ascii", 12, 16);
    if (t === "VP8 ") return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
    if (t === "VP8L") return { w: 1 + (((b[22] & 0x3f) << 8) | b[21]), h: 1 + (((b[24] & 0x0f) << 10) | (b[23] << 2) | ((b[22] & 0xc0) >> 6)) };
    if (t === "VP8X") return { w: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), h: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
  }
  if (b[0] === 0x89 && b.toString("ascii", 1, 4) === "PNG") return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  throw new Error("cannot read image size: " + file);
}
