// Run with: npm test
process.env.PJ_MEMORY_STORE = "1";
process.env.ADMIN_PASSWORD = "test-password-123";

import { test, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { resetMemoryStore } from "../netlify/lib/store.mjs";
import leads from "../netlify/functions/leads.mjs";
import subscribe from "../netlify/functions/subscribe.mjs";
import orders, { _test } from "../netlify/functions/orders.mjs";
import admin from "../netlify/functions/admin.mjs";

const post = (fn, body, headers = {}) =>
  fn(new Request("https://x.test/api", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) }), { ip: "1.2.3.4" });
const get = (fn, qs, pw = "test-password-123") =>
  fn(new Request("https://x.test/api/admin?" + qs, { headers: { authorization: "Bearer " + pw } }), {});

beforeEach(() => resetMemoryStore());

// Wednesday Nov 11 2026, 2:00 pm in Detroit (19:00 UTC) — shop is open.
const OPEN_TIME = Date.parse("2026-11-11T19:00:00Z");

test("free-call request is saved and listed in admin", async () => {
  const r = await post(leads, { name: "Jordan", contact: "(734) 555-0100", goal: "Build muscle", plan: "Elite" });
  assert.equal(r.status, 200);
  const list = await (await get(admin, "type=leads")).json();
  assert.equal(list.items.length, 1);
  assert.equal(list.items[0].plan, "Elite");
  assert.equal(list.items[0].status, "new");
});

test("free-call request rejects bad contact info", async () => {
  const r = await post(leads, { name: "Jordan", contact: "nope" });
  assert.equal(r.status, 400);
});

test("honeypot spam is silently dropped", async () => {
  const r = await post(leads, { name: "Bot", contact: "bot@spam.com", company: "Spam Inc" });
  assert.equal(r.status, 200);
  const list = await (await get(admin, "type=leads")).json();
  assert.equal(list.items.length, 0);
});

test("rate limit kicks in after 5 requests", async () => {
  for (let i = 0; i < 5; i++) assert.equal((await post(leads, { name: "A B", contact: "a@b.co" })).status, 200);
  assert.equal((await post(leads, { name: "A B", contact: "a@b.co" })).status, 429);
});

test("meal-plan signup dedupes by email and exports CSV", async () => {
  await post(subscribe, { first_name: "Sam", email: "Sam@Example.com" });
  await post(subscribe, { first_name: "Sammy", email: "sam@example.com" });
  const list = await (await get(admin, "type=subscribers")).json();
  assert.equal(list.items.length, 1);
  assert.equal(list.items[0].firstName, "Sammy");
  const csv = await (await get(admin, "type=subscribers&format=csv")).text();
  assert.match(csv, /sam@example.com/);
});

test("admin requires the password", async () => {
  assert.equal((await get(admin, "type=leads", "wrong")).status, 401);
  assert.equal((await get(admin, "type=leads", "")).status, 401);
});

test("server prices orders from the menu, ignoring browser prices", () => {
  const { lines, total } = _test.priceItems([
    { id: "strawnana", size: "24oz", qty: 2, price: 0.01 },
    { id: "pro-planet-power", size: "16oz", qty: 1 },
  ]);
  assert.equal(lines[0].unitPrice, 8.99);
  assert.equal(total, 26.97); // 2 × 8.99 + 8.99
  assert.throws(() => _test.priceItems([{ id: "made-up", size: "16oz", qty: 1 }]));
  assert.throws(() => _test.priceItems([{ id: "strawnana", size: "64oz", qty: 1 }]));
  assert.throws(() => _test.priceItems([]));
});

test("pickup times respect store hours", () => {
  const wed2pm = { day: 3, minutes: 14 * 60 };
  assert.equal(_test.checkPickup("ASAP", wed2pm).pickup, "ASAP");
  assert.equal(_test.checkPickup("15:30", wed2pm).pickupLabel, "3:30 pm");
  assert.throws(() => _test.checkPickup("14:05", wed2pm)); // too soon
  assert.throws(() => _test.checkPickup("21:50", wed2pm)); // after last order
  assert.throws(() => _test.checkPickup("ASAP", { day: 3, minutes: 23 * 60 })); // closed
  assert.equal(_test.checkPickup("09:15", { day: 3, minutes: 8 * 60 + 30 }).pickup, "09:15"); // pre-order before open
  assert.throws(() => _test.checkPickup("ASAP", { day: 3, minutes: 8 * 60 + 30 })); // ASAP before open
});

test("full pickup order flow with daily order numbers and status updates", async () => {
  mock.timers.enable({ apis: ["Date"], now: OPEN_TIME });
  try {
    const order = { name: "Ava", phone: "734-555-0199", pickup: "ASAP", notes: "oat milk", items: [{ id: "mango-mania", size: "16oz", qty: 1 }] };
    const r1 = await (await post(orders, order)).json();
    const r2 = await (await post(orders, order)).json();
    assert.equal(r1.orderNumber, 101);
    assert.equal(r2.orderNumber, 102);
    assert.equal(r1.total, 7.99);

    const list = await (await get(admin, "type=orders")).json();
    assert.equal(list.items.length, 2);
    const key = list.items[0].key;
    const upd = await admin(new Request("https://x.test/api/admin", {
      method: "POST", headers: { authorization: "Bearer test-password-123", "content-type": "application/json" },
      body: JSON.stringify({ type: "orders", key, status: "ready" }),
    }), {});
    assert.equal(upd.status, 200);
    const after = await (await get(admin, "type=orders")).json();
    assert.equal(after.items.find((i) => i.key === key).status, "ready");
  } finally {
    mock.timers.reset();
  }
});

test("orders need a real phone number", async () => {
  const r = await post(orders, { name: "Ava", phone: "123", pickup: "ASAP", items: [{ id: "mango-mania", size: "16oz", qty: 1 }] });
  assert.equal(r.status, 400);
});
