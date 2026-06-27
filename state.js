import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  const state = await redis.get('reef:state');
  const raw = await redis.zrange('reef:series', 0, -1);

  const series = (raw || []).map((m) => {
    const str = String(m);
    const idx = str.indexOf(':');
    return { t: Number(str.slice(0, idx)), v: Number(str.slice(idx + 1)) };
  }).filter((p) => Number.isFinite(p.t) && Number.isFinite(p.v));

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ state: state || null, series });
}
