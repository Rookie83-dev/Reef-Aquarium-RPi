import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});
const DAY_MS = 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Use POST' });
  }
  const auth = req.headers.authorization || '';
  if (auth !== `Bearer ${process.env.INGEST_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = req.body || {};
  const temp = Number(body.temp);
  if (!Number.isFinite(temp)) {
    return res.status(400).json({ error: 'temp (number) required' });
  }
  const fan = body.fan ? 1 : 0;
  const ts = Date.now();

  await redis.set('reef:state', { temp, fan, ts });
  await redis.zadd('reef:series', { score: ts, member: `${ts}:${temp}` });
  await redis.zremrangebyscore('reef:series', 0, ts - DAY_MS);

  return res.status(200).json({ ok: true, ts });
}
