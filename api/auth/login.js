import crypto from 'node:crypto'
import { cors, createSession } from '../_lib/store.js'

export default async function handler(req, res) {
  cors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const expected = process.env.MOCKONDO_ADMIN_TOKEN
  if (!expected || req.body?.token !== expected) return res.status(401).json({ error: 'Token admin tidak valid' })
  const sessionId = crypto.randomBytes(32).toString('hex')
  await createSession(sessionId)
  res.setHeader('Set-Cookie', `__Host-mockondo_session=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`)
  return res.status(204).end()
}
