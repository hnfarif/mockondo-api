import { cors, deleteSession } from '../_lib/store.js'

function sessionFromCookie(req) {
  const match = (req.headers.cookie || '').match(/(?:^|;\s*)__Host-mockondo_session=([^;]+)/)
  return match?.[1]
}

export default async function handler(req, res) {
  cors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  await deleteSession(sessionFromCookie(req))
  res.setHeader('Set-Cookie', '__Host-mockondo_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0')
  return res.status(204).end()
}
