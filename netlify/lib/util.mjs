// Shared helpers for the API functions.

export const SHOP_TZ = "America/Detroit";

// Store hours: day (0 = Sunday) -> [open hour, close hour], 24h clock.
// Keep in sync with HOURS in public/index.html.
export const HOURS = { 0: [10, 19], 1: [9, 22], 2: [9, 22], 3: [9, 22], 4: [9, 22], 5: [9, 22], 6: [9, 21] };

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export const fail = (message, status = 400) => json({ error: message }, status);

// Accepts JSON or regular form posts (so forms still work if JavaScript fails).
export async function readBody(req) {
  const len = Number(req.headers.get("content-length") || 0);
  if (len > 20_000) throw new HttpError("That request is too large.", 413);
  const type = req.headers.get("content-type") || "";
  try {
    if (type.includes("application/json")) return (await req.json()) || {};
    if (type.includes("form")) return Object.fromEntries((await req.formData()).entries());
  } catch {
    throw new HttpError("We couldn't read that request.");
  }
  throw new HttpError("Unsupported content type.", 415);
}

export class HttpError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// Wraps a handler: method check, error handling, JSON responses.
export function handler(methods, fn) {
  return async (req, context) => {
    if (!methods.includes(req.method)) return fail("Method not allowed.", 405);
    try {
      return await fn(req, context);
    } catch (err) {
      if (err instanceof HttpError) return fail(err.message, err.status);
      console.error(err);
      return fail("Something went wrong on our side. Please call (734) 444-2819.", 500);
    }
  };
}

export function clean(value, max = 200) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
export const isPhone = (v) => (v.match(/\d/g) || []).length >= 10 && /^[\d\s()+.\-]+$/.test(v);

// Bots fill in the hidden "company" field; people never see it.
export const isBot = (body) => clean(body.company).length > 0;

export function clientIp(req, context) {
  return context?.ip || req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

// Current day/minute in the shop's time zone.
export function shopNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: SHOP_TZ, weekday: "short", hour: "numeric", minute: "numeric", hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return {
    day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")),
    minutes: (parseInt(get("hour"), 10) % 24) * 60 + parseInt(get("minute"), 10),
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

export function timeLabel(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
}

export const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
