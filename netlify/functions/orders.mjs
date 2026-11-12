// POST /api/orders — order ahead for pickup, pay in store.
// Prices come from public/data/menu.json on the server, never from the browser.
import menu from "../../public/data/menu.json" with { type: "json" };
import { handler, readBody, json, clean, isPhone, isBot, clientIp, HttpError, HOURS, shopNow, timeLabel, escapeHtml } from "../lib/util.mjs";
import { store, newKey, rateLimit } from "../lib/store.mjs";
import { sendEmail, layout } from "../lib/email.mjs";

const MAX_ITEMS = 30;
const byId = new Map(menu.products.filter((p) => p.sizes).map((p) => [p.id, p]));

function priceItems(items) {
  if (!Array.isArray(items) || items.length === 0) throw new HttpError("Your cart is empty.");
  const lines = [];
  let count = 0;
  for (const it of items.slice(0, 50)) {
    const product = byId.get(String(it?.id));
    const size = product?.sizes.find((s) => s[0] === it?.size);
    const qty = Math.floor(Number(it?.qty));
    if (!product || !size || !(qty >= 1 && qty <= 20)) throw new HttpError("Something in your cart is no longer on the menu. Please refresh the page.");
    count += qty;
    lines.push({ id: product.id, name: product.name, size: size[0], unitPrice: size[1], qty, lineTotal: Math.round(size[1] * qty * 100) / 100 });
  }
  if (count > MAX_ITEMS) throw new HttpError(`For orders over ${MAX_ITEMS} drinks, please call us at (734) 444-2819.`);
  const total = Math.round(lines.reduce((a, l) => a + l.lineTotal, 0) * 100) / 100;
  return { lines, total };
}

function checkPickup(pickup, now) {
  const [open, close] = HOURS[now.day].map((h) => h * 60);
  const lastOrder = close - 15;
  if (now.minutes < open - 60 || now.minutes >= lastOrder) {
    throw new HttpError("Online ordering is closed right now. Order on DoorDash or come by during store hours.");
  }
  if (pickup === "ASAP") {
    if (now.minutes < open) throw new HttpError("We're not open yet. Please pick a time after we open.");
    return { pickup, pickupLabel: "as soon as possible" };
  }
  const m = /^(\d{2}):(\d{2})$/.exec(pickup || "");
  if (!m) throw new HttpError("Please choose a pickup time.");
  const t = Number(m[1]) * 60 + Number(m[2]);
  if (t < Math.max(open, now.minutes + 10) || t > lastOrder) throw new HttpError("That pickup time isn't available anymore. Please choose another.");
  return { pickup, pickupLabel: timeLabel(pickup) };
}

export default handler(["POST"], async (req, context) => {
  const body = await readBody(req);
  if (isBot(body)) return json({ ok: true, orderNumber: 0, total: 0, pickup: "ASAP" });

  const name = clean(body.name, 80);
  const phone = clean(body.phone, 30);
  const notes = clean(body.notes, 200);
  if (name.length < 2) throw new HttpError("Please enter your name.");
  if (!isPhone(phone)) throw new HttpError("Please enter a phone number so we can reach you about your order.");

  const now = shopNow();
  const { pickup, pickupLabel } = checkPickup(clean(body.pickup, 10), now);
  const { lines, total } = priceItems(body.items);
  if (!(await rateLimit("orders", clientIp(req, context), 4, 15))) throw new HttpError("Too many orders from this device. Please call us at (734) 444-2819.", 429);

  // Order numbers restart each day: 101, 102, ...
  const orders = store("orders");
  const counterKey = `_counter/${now.dateKey}`;
  const orderNumber = ((await orders.get(counterKey, { type: "json" })) || 100) + 1;
  await orders.setJSON(counterKey, orderNumber);

  const order = { orderNumber, name, phone, notes, pickup, pickupLabel, items: lines, total, status: "new", createdAt: new Date().toISOString() };
  await orders.setJSON(newKey(), order);

  const rows = lines.map((l) => `<tr><td>${l.qty}×</td><td>${escapeHtml(l.name)} (${l.size})</td><td style="text-align:right">$${l.lineTotal.toFixed(2)}</td></tr>`).join("");
  await sendEmail({
    to: process.env.SHOP_EMAIL,
    subject: `Pickup order #${orderNumber} for ${pickup === "ASAP" ? "ASAP" : pickupLabel} — ${name}`,
    html: layout(`Pickup order #${orderNumber}`, `
      <p><b>${escapeHtml(name)}</b> · ${escapeHtml(phone)}<br>Pickup: <b>${escapeHtml(pickupLabel)}</b></p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
        <tr><td></td><td style="padding-top:8px"><b>Total (pay in store)</b></td><td style="text-align:right;padding-top:8px"><b>$${total.toFixed(2)}</b></td></tr></table>
      ${notes ? `<p><b>Notes:</b> ${escapeHtml(notes)}</p>` : ""}`),
  });

  return json({ ok: true, orderNumber, total, pickup, pickupLabel });
});

export const config = { path: "/api/orders" };

// Exposed for tests.
export const _test = { priceItems, checkPickup };
