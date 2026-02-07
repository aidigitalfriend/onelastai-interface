/**
 * GenCraft Pro — Auth Middleware
 * 
 * Authentication and authorization middleware for API routes.
 * Verifies sessions, API keys, and plan-based access control.
 */

const crypto = require('crypto');

/**
 * Require authenticated user
 */
function requireAuth(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please sign in to access this resource',
    });
  }
  next();
}

/**
 * Require specific plan level
 */
function requirePlan(...allowedPlans) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userPlan = req.user.plan || 'weekly';
    
    // Plan hierarchy: yearly > monthly > weekly
    const planHierarchy = { weekly: 1, monthly: 2, yearly: 3 };
    const userLevel = planHierarchy[userPlan] || 0;
    const requiredLevel = Math.min(
      ...allowedPlans.map(p => planHierarchy[p] || 0)
    );

    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: 'Plan upgrade required',
        currentPlan: userPlan,
        requiredPlan: allowedPlans[0],
        message: `This feature requires ${allowedPlans.join(' or ')} plan`,
      });
    }

    next();
  };
}

/**
 * Rate limiter (per user, per endpoint)
 */
function rateLimit(options = {}) {
  const {
    windowMs = 60 * 1000,   // 1 minute
    maxRequests = 60,
    keyGenerator = (req) => `${req.user?.id || req.ip}:${req.route?.path || req.path}`,
  } = options;

  const windows = new Map();

  // Cleanup old windows periodically
  setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [key, window] of windows.entries()) {
      if (window.start < cutoff) windows.delete(key);
    }
  }, windowMs);

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();

    let window = windows.get(key);
    if (!window || window.start < now - windowMs) {
      window = { start: now, count: 0 };
      windows.set(key, window);
    }

    window.count++;

    // Set rate limit headers
    res.set('X-RateLimit-Limit', String(maxRequests));
    res.set('X-RateLimit-Remaining', String(Math.max(0, maxRequests - window.count)));
    res.set('X-RateLimit-Reset', String(Math.ceil((window.start + windowMs) / 1000)));

    if (window.count > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((window.start + windowMs - now) / 1000),
      });
    }

    next();
  };
}

/**
 * Verify webhook signature (GitHub/GitLab)
 */
function verifyWebhookSignature(secret) {
  return (req, res, next) => {
    const signature = req.headers['x-hub-signature-256'] || req.headers['x-gitlab-token'];
    
    if (!signature) {
      return res.status(401).json({ error: 'Missing webhook signature' });
    }

    // GitHub: HMAC SHA-256
    if (req.headers['x-hub-signature-256']) {
      const hmac = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(req.body))
        .digest('hex');
      
      const expected = `sha256=${hmac}`;
      
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    // GitLab: token comparison
    if (req.headers['x-gitlab-token']) {
      if (signature !== secret) {
        return res.status(401).json({ error: 'Invalid webhook token' });
      }
    }

    next();
  };
}

/**
 * Validate request body against schema
 */
function validateBody(schema) {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      if (value !== undefined && value !== null) {
        if (rules.type && typeof value !== rules.type) {
          errors.push(`${field} must be a ${rules.type}`);
        }
        if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
          errors.push(`${field} must be at most ${rules.maxLength} characters`);
        }
        if (rules.enum && !rules.enum.includes(value)) {
          errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
        }
        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push(`${field} has invalid format`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }

    next();
  };
}

/**
 * Request logging middleware
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id || 'anonymous',
      ip: req.ip,
    };

    if (res.statusCode >= 400) {
      console.warn(`[API] ${log.method} ${log.path} ${log.status} ${log.duration} (user: ${log.userId})`);
    }
  });

  next();
}

module.exports = {
  requireAuth,
  requirePlan,
  rateLimit,
  verifyWebhookSignature,
  validateBody,
  requestLogger,
};
