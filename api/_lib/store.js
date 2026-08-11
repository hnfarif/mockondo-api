import { Redis } from '@upstash/redis'

const KEY = 'mockondo:mocks'
let localMocks = {}

function redisClient() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

export async function listMocks() {
  const redis = redisClient()
  if (redis) return (await redis.get(KEY)) || {}
  return localMocks
}

export async function getMock(slug) {
  const mocks = await listMocks()
  return mocks[slug] || null
}

export async function saveMock(slug, value) {
  const mocks = await listMocks()
  const next = { ...mocks, [slug]: { ...value, slug } }
  const redis = redisClient()
  if (redis) await redis.set(KEY, next)
  else localMocks = next
  return next[slug]
}

export async function deleteMock(slug) {
  const mocks = await listMocks()
  if (!mocks[slug]) return false
  delete mocks[slug]
  const redis = redisClient()
  if (redis) await redis.set(KEY, mocks)
  else localMocks = mocks
  return true
}

export function isAuthorized(req) {
  const expected = process.env.MOCKONDO_ADMIN_TOKEN
  if (!expected) return false
  const received = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  return received === expected
}

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.MOCKONDO_CORS_ORIGIN || '*')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
}
