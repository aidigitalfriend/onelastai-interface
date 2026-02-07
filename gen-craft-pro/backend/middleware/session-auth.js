/**
 * GenCraft Pro — Session Authentication
 * 
 * Real session verification against PostgreSQL database.
 * Supports: session cookies, JWT tokens, API keys.
 * Falls back gracefully if DB is unavailable.
 */

const jwt = require('jsonwebtoken');
const { getDB } = require('../lib/db');
const { getRedis } = require('../lib/redis');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('[Auth] FATAL: JWT_SECRET must be set in production!');
  process.exit(1);
}
const RESOLVED_JWT_SECRET = JWT_SECRET || 'gencraft-dev-secret-local-only';
const SESSION_CACHE_TTL = 300; // 5 minutes in Redis

/**
 * Verify session from database/cache
 */
async function verifySession(sessionId) {
  if (!sessionId) return null;

  const redis = getRedis();
  
  // 1. Check Redis cache first
  try {
    const cached = await redis.get(`session:${sessionId}`);
    if (cached) {
      const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
      if (parsed && parsed.id) return parsed;
    }
  } catch (err) {
    // Redis miss/error — continue to DB
  }

  // 2. Query database
  try {
    const db = getDB();
    const session = await db.session.findUnique({
      where: { sessionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
            role: true,
            plan: true,
            stripeCustomerId: true,
          },
        },
      },
    });

    if (!session) return null;
    if (!session.isActive) return null;
    if (new Date(session.expiresAt) < new Date()) {
      // Session expired — mark inactive
      await db.session.update({
        where: { id: session.id },
        data: { isActive: false },
      }).catch(() => {});
      return null;
    }

    const user = session.user;
    
    // 3. Cache in Redis
    try {
      await redis.set(
        `session:${sessionId}`,
        JSON.stringify(user),
        'EX',
        SESSION_CACHE_TTL
      );
    } catch (err) {
      // Cache write failure is non-fatal
    }

    return user;
  } catch (err) {
    console.warn(`[Auth] DB session lookup failed: ${err.message}`);
    return null;
  }
}

/**
 * Verify JWT token
 */
function verifyJWT(token) {
  try {
    const decoded = jwt.verify(token, RESOLVED_JWT_SECRET);
    return {
      id: decoded.sub || decoded.userId,
      email: decoded.email,
      name: decoded.name,
      plan: decoded.plan,
      role: decoded.role || 'user',
    };
  } catch (err) {
    return null;
  }
}

/**
 * Verify API key against database
 */
async function verifyApiKey(apiKey) {
  if (!apiKey) return null;

  const redis = getRedis();

  // Check cache
  try {
    const cached = await redis.get(`apikey:${apiKey}`);
    if (cached) return typeof cached === 'string' ? JSON.parse(cached) : cached;
  } catch (err) {}

  // Look up API key in database
  try {
    const db = getDB();
    // Query the user's API key from the database
    const keyHash = require('crypto').createHash('sha256').update(apiKey).digest('hex');
    const record = await db.$queryRawUnsafe(
      `SELECT u.id, u.email, u.plan, u.role FROM "User" u WHERE u."apiKeyHash" = $1 LIMIT 1`,
      keyHash
    );
    if (record && record.length > 0) {
      const user = { id: record[0].id, email: record[0].email, plan: record[0].plan, role: record[0].role || 'api' };
      try {
        await redis.set(`apikey:${apiKey}`, JSON.stringify(user), 'EX', 3600);
      } catch (err) {}
      return user;
    }
  } catch (err) {
    // DB lookup failed — fall back to format validation in dev mode only
    if (process.env.NODE_ENV !== 'production' && apiKey.startsWith('gcp_') && apiKey.length >= 32) {
      return { id: 'api-user', email: 'api@maula.ai', plan: 'yearly', role: 'api', _devMode: true };
    }
    console.warn(`[Auth] API key DB lookup failed: ${err.message}`);
  }

  return null;
}

/**
 * Express middleware: Extract & verify user identity
 * 
 * Priority:
 *   1. Session cookie (session_id)
 *   2. Authorization: Bearer <jwt>
 *   3. X-API-Key header
 *   4. Development fallback (x-user-id header, dev only)
 */
function sessionAuth(req, res, next) {
  // Async verification wrapped for Express
  (async () => {
    try {
      let user = null;

      // 1. Session cookie
      const sessionId = req.cookies?.session_id || req.headers['x-session-id'];
      if (sessionId && !user) {
        user = await verifySession(sessionId);
      }

      // 2. JWT Bearer token
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ') && !user) {
        const token = authHeader.slice(7);
        user = verifyJWT(token);
      }

      // 3. API key
      const apiKey = req.headers['x-api-key'];
      if (apiKey && !user) {
        user = await verifyApiKey(apiKey);
      }

      // 4. Development mode fallback
      if (!user && process.env.NODE_ENV !== 'production') {
        const devUserId = req.headers['x-user-id'];
        if (devUserId) {
          user = {
            id: devUserId,
            email: req.headers['x-user-email'] || 'dev@maula.ai',
            plan: req.headers['x-user-plan'] || 'monthly',
            role: 'user',
            _devMode: true,
          };
        }
      }

      req.user = user;
    } catch (err) {
      console.warn(`[Auth] Verification error: ${err.message}`);
      req.user = null;
    }

    next();
  })();
}

/**
 * Invalidate cached session (on logout, plan change, etc.)
 */
async function invalidateSession(sessionId) {
  const redis = getRedis();
  try {
    await redis.del(`session:${sessionId}`);
  } catch (err) {}

  try {
    const db = getDB();
    await db.session.update({
      where: { sessionId },
      data: { isActive: false },
    });
  } catch (err) {}
}

module.exports = {
  sessionAuth,
  verifySession,
  verifyJWT,
  verifyApiKey,
  invalidateSession,
};
