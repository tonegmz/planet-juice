// POST /api/subscribe — free 7-day meal plan signup.
import { handler, readBody, json, clean, isEmail, isBot, clientIp, HttpError, escapeHtml } from "../lib/util.mjs";
import { createHash } from "node:crypto";
import { store, rateLimit } from "../lib/store.mjs";
import { sendEmail, layout } from "../lib/email.mjs";

export default handler(["POST"], async (req, context) => {
  const body = await readBody(req);
  if (isBot(body)) return json({ ok: true });

  const firstName = clean(body.first_name, 60);
  const email = clean(body.email, 120).toLowerCase();
  if (firstName.length < 1) throw new HttpError("Please enter your first name.");
  if (!isEmail(email)) throw new HttpError("Please enter a valid email address.");
  if (!(await rateLimit("subscribe", clientIp(req, context)))) throw new HttpError("Too many requests. Please try again later.", 429);

  // One record per email address, so signing up twice doesn't create duplicates.
  const subs = store("subscribers");
  const key = createHash("sha256").update(email).digest("hex").slice(0, 32);
  const existing = await subs.get(key, { type: "json" });
  await subs.setJSON(key, {
    firstName,
    email,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const url = process.env.MEAL_PLAN_URL || "https://www.planetjuice.shop/downloads/7-day-meal-plan.pdf";
  await sendEmail({
    to: email,
    subject: "Your free 7-day meal plan from Planet Juice",
    html: layout(`Here's your plan, ${escapeHtml(firstName)}!`, `
      <p>This is the same starter plan our clients use in their first week.</p>
      <p><a href="${escapeHtml(url)}" style="display:inline-block;background:#7B5EA7;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Download the 7-day meal plan</a></p>
      <p>Want a plan built around your goal and schedule? Reply to this email or book a free 15-minute call at planetjuice.shop.</p>`),
  });

  return json({ ok: true });
});

export const config = { path: "/api/subscribe" };
