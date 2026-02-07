/**
 * GenCraft Pro — Rate Limiting Middleware
 * 
 * Configurable rate limiters for different API routes:
 *   - General API:   100 requests / minute
 *   - AI routes:      20 requests / minute
 *   - Auth routes:    10 requests / minute
 *   - Upload routes:  30 requests / minute
 */

const rateLimit = require('express-rate-limit');

// ── General API limiter ──
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in a minute.' },
  keyGenerator: (req) => req.user?.id || req.ip,
});

// ── AI route limiter (expensive operations) ──
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'AI rate limit exceeded. Please wait before making more AI requests.' },
  keyGenerator: (req) => req.user?.id || req.ip,
});

// ── Auth route limiter (brute-force protection) ──
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts. Please try again later.' },
  keyGenerator: (req) => req.ip,
  skipSuccessfulRequests: true,
});

// ── Upload limiter ──
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload rate limit exceeded. Please wait before uploading more files.' },
  keyGenerator: (req) => req.user?.id || req.ip,
});

// ── Build/Deploy limiter (resource-intensive) ──
const buildLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Build rate limit exceeded. Please wait before starting more builds.' },
  keyGenerator: (req) => req.user?.id || req.ip,
});

module.exports = {
  generalLimiter,
  aiLimiter,
  authLimiter,
  uploadLimiter,
  buildLimiter,
};
