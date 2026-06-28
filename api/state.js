import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  const state = await redis.get('reef:state');
  const raw = await redis.zrange('reef:series', 0, -1);

  const series = (raw || []).map((m) => {
    const parts = String(m).split(':');
    const t = Number(parts[0]);
    const v = Number(parts[1]);
    const f = parts.length > 2 ? Number(parts[2]) : 0;
    return { t, v, f: f ? 1 : 0 };
  }).filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v));

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ state: state || null, series });
}
