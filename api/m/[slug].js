import { cors, getMock } from '../_lib/store.js'

export default async function handler(req, res) {
  cors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  const mock = await getMock(req.query.slug)
  if (!mock) return res.status(404).json({ error: 'Mock endpoint tidak ditemukan' })
  if (mock.method && mock.method !== req.method) return res.status(405).json({ error: 'Method tidak diizinkan', allowed: mock.method })
  await new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(mock.delay) || 0)))
  Object.entries({ 'Content-Type': 'application/json', ...(mock.headers || {}) }).forEach(([key, value]) => res.setHeader(key, value))
  if (mock.timeout === true) return res.status(504).json({ error: 'Mock timeout' })
  return res.status(Number(mock.status) || 200).json(mock.body ?? null)
}
