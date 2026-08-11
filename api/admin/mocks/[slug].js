import { cors, deleteMock, isAuthorized, saveMock } from '../../_lib/store.js'
import { getMock } from '../../_lib/store.js'

export default async function handler(req, res) {
  cors(req, res)
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (!(await isAuthorized(req))) return res.status(401).json({ error: 'Authorization required' })
  const { slug } = req.query
  if (req.method === 'GET') {
    const mock = await getMock(slug)
    return mock ? res.status(200).json(mock) : res.status(404).json({ error: 'Mock endpoint tidak ditemukan' })
  }
  if (req.method === 'PUT') return res.status(200).json(await saveMock(slug, req.body || {}))
  if (req.method === 'DELETE') return (await deleteMock(slug)) ? res.status(204).end() : res.status(404).json({ error: 'Mock endpoint tidak ditemukan' })
  return res.status(405).json({ error: 'Method not allowed' })
}
