// Staff dashboard API (password protected with ADMIN_PASSWORD).
//   GET  /api/admin?type=orders|leads|subscribers   -> list records
//   POST /api/admin  { type, key, status }          -> update a record's status
//   GET  /api/admin?type=subscribers&format=csv     -> download the email list
import { timingSafeEqual, createHash } from "node:crypto";
import { handler, readBody, json, fail, HttpError } from "../lib/util.mjs";
import { store, listAll } from "../lib/store.mjs";

const TYPES = ["orders", "leads", "subscribers"];
const STATUSES = {
  orders: ["new", "making", "ready", "picked up", "cancelled"],
  leads: ["new", "contacted", "booked", "not a fit"],
};

function authorized(req) {
  const expected = process.env.ADMIN_PASSWORD || "";
  if (expected.length < 8) return false; // never run with a missing or weak password
  const given = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const h = (s) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(given), h(expected));
}

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export default handler(["GET", "POST"], async (req) => {
  if (!authorized(req)) return fail("Wrong password.", 401);

  if (req.method === "GET") {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "orders";
    if (!TYPES.includes(type)) throw new HttpError("Unknown type.");
    const items = await listAll(type);
    if (url.searchParams.get("format") === "csv" && type === "subscribers") {
      const csv = ["first_name,email,signed_up", ...items.map((s) => [s.firstName, s.email, s.createdAt].map(csvCell).join(","))].join("\n");
      return new Response(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="meal-plan-subscribers.csv"' } });
    }
    return json({ items, statuses: STATUSES[type] || [] });
  }

  const { type, key, status } = await readBody(req);
  if (!STATUSES[type]?.includes(status)) throw new HttpError("Unknown status.");
  const s = store(type);
  const record = await s.get(String(key), { type: "json" });
  if (!record) throw new HttpError("Record not found.", 404);
  await s.setJSON(String(key), { ...record, status, updatedAt: new Date().toISOString() });
  return json({ ok: true });
});

export const config = { path: "/api/admin" };
