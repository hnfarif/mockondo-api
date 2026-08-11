import { Redis } from '@upstash/redis'

const KEY = 'mockondo:mocks'
let localMocks = {}
const localSessions = new Map()

export function redisClient() {
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

export async function createSession(sessionId, ttlSeconds = 3600) {
  const redis = redisClient()
  if (redis) return redis.set(`mockondo:session:${sessionId}`, '1', { ex: ttlSeconds })
  localSessions.set(sessionId, Date.now() + ttlSeconds * 1000)
}

export async function hasSession(sessionId) {
  if (!sessionId) return false
  const redis = redisClient()
  if (redis) return Boolean(await redis.get(`mockondo:session:${sessionId}`))
  const expiresAt = localSessions.get(sessionId)
  if (!expiresAt || expiresAt < Date.now()) { localSessions.delete(sessionId); return false }
  return true
}

export async function deleteSession(sessionId) {
  if (!sessionId) return
  const redis = redisClient()
  if (redis) await redis.del(`mockondo:session:${sessionId}`)
  else localSessions.delete(sessionId)
}

function sessionFromCookie(req) {
  const cookie = req.headers.cookie || ''
  const match = cookie.match(/(?:^|;\s*)__Host-mockondo_session=([^;]+)/)
  return match?.[1]
}

export async function isAuthorized(req) {
  const expected = process.env.MOCKONDO_ADMIN_TOKEN
  if (!expected) return false
  const received = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (received === expected) return true
  return hasSession(sessionFromCookie(req))
}

export function cors(req, res) {
  const origin = process.env.MOCKONDO_CORS_ORIGIN || req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  if (origin !== '*') res.setHeader('Access-Control-Allow-Credentials', 'true')
}
