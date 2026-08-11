import { cors, isAuthorized, listMocks, saveMock } from '../_lib/store.js'

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!isAuthorized(req)) return res.status(401).json({ error: 'Authorization required' })
  if (req.method === 'GET') return res.status(200).json(await listMocks())
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { slug, ...mock } = req.body || {}
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/i.test(slug)) return res.status(400).json({ error: 'slug wajib diisi dan hanya boleh berisi huruf, angka, dan tanda -' })
  if (mock.body === undefined) return res.status(400).json({ error: 'body wajib diisi' })
  const saved = await saveMock(slug, mock)
  return res.status(201).json(saved)
}
