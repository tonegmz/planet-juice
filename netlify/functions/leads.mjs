// POST /api/leads — "Request My Free Call" form.
import { handler, readBody, json, clean, isEmail, isPhone, isBot, clientIp, HttpError, escapeHtml } from "../lib/util.mjs";
import { store, newKey, rateLimit } from "../lib/store.mjs";
import { sendEmail, layout } from "../lib/email.mjs";

const GOALS = ["Lose weight", "Build muscle", "Eat better", "Train online"];
const PLANS = ["", "Starter", "Elite", "Champion"];

export default handler(["POST"], async (req, context) => {
  const body = await readBody(req);
  if (isBot(body)) return json({ ok: true }); // quietly drop spam

  const name = clean(body.name, 80);
  const contact = clean(body.contact, 120);
  const goal = GOALS.includes(body.goal) ? body.goal : GOALS[0];
  const plan = PLANS.includes(body.plan) ? body.plan : "";

  if (name.length < 2) throw new HttpError("Please enter your name.");
  if (!isEmail(contact) && !isPhone(contact)) throw new HttpError("Please enter a phone number or email we can reach you at.");
  if (!(await rateLimit("leads", clientIp(req, context)))) throw new HttpError("Too many requests. Please call us at (734) 444-2819.", 429);

  const lead = { name, contact, goal, plan, status: "new", createdAt: new Date().toISOString() };
  await store("leads").setJSON(newKey(), lead);

  await sendEmail({
    to: process.env.SHOP_EMAIL,
    subject: `New free-call request: ${name}`,
    replyTo: isEmail(contact) ? contact : undefined,
    html: layout("New free-call request", `
      <p><b>Name:</b> ${escapeHtml(name)}<br><b>Contact:</b> ${escapeHtml(contact)}<br><b>Goal:</b> ${escapeHtml(goal)}${plan ? `<br><b>Plan:</b> ${escapeHtml(plan)}` : ""}</p>
      <p>Reach out within one business day. All requests are in the dashboard at /admin.</p>`),
  });

  return json({ ok: true });
});

export const config = { path: "/api/leads" };
