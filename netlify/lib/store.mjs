// Data storage on Netlify Blobs (built into Netlify, free on every plan, no database to run).
// Three collections: "leads" (free-call requests), "subscribers" (meal plan) and "orders".
// Tests set PJ_MEMORY_STORE=1 to use an in-memory store instead.

import { getStore } from "@netlify/blobs";

const memory = new Map();

function memoryStore(name) {
  const prefix = name + "/";
  return {
    async get(key, opts) {
      const v = memory.get(prefix + key);
      if (v === undefined) return null;
      return opts?.type === "json" ? JSON.parse(v) : v;
    },
    async setJSON(key, value) {
      memory.set(prefix + key, JSON.stringify(value));
    },
    async delete(key) {
      memory.delete(prefix + key);
    },
    async list({ prefix: p = "" } = {}) {
      const blobs = [...memory.keys()]
        .filter((k) => k.startsWith(prefix + p))
        .map((k) => ({ key: k.slice(prefix.length) }));
      return { blobs };
    },
  };
}

export function store(name) {
  if (process.env.PJ_MEMORY_STORE === "1") return memoryStore(name);
  return getStore({ name, consistency: "strong" });
}

export function resetMemoryStore() {
  memory.clear();
}

// Sortable, unique keys: newest records sort last.
export function newKey() {
  return `${new Date().toISOString()}_${crypto.randomUUID().slice(0, 8)}`;
}

export async function listAll(name, limit = 500) {
  const s = store(name);
  const { blobs } = await s.list();
  const keys = blobs.map((b) => b.key).filter((k) => !k.startsWith("_")).sort().reverse().slice(0, limit);
  const items = await Promise.all(keys.map(async (key) => ({ key, ...(await s.get(key, { type: "json" })) })));
  return items;
}

// Simple per-IP limit so nobody can flood the forms: `max` requests per `windowMin` minutes.
export async function rateLimit(bucket, ip, max = 5, windowMin = 10) {
  const s = store("ratelimits");
  const slot = Math.floor(Date.now() / (windowMin * 60_000));
  const key = `${bucket}/${ip.replace(/[^\w.:-]/g, "_")}/${slot}`;
  const count = ((await s.get(key, { type: "json" })) || 0) + 1;
  await s.setJSON(key, count);
  return count <= max;
}
