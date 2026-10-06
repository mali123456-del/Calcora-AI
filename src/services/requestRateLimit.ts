import type { RequestHandler } from 'express';
import { createFixedWindowRateLimiter } from './requestSecurity';

export function createRateLimitMiddleware(limit: number, windowMs: number): RequestHandler {
  const limiter = createFixedWindowRateLimiter({ limit, windowMs });
  return (req, res, next) => {
    const decision = limiter.check(req.ip || req.socket.remoteAddress || 'unknown');
    if (!decision.allowed) {
      res.setHeader('Retry-After', String(decision.retryAfterSeconds));
      res.status(429).json({ success: false, error: 'Too many requests. Please retry later.' });
      return;
    }
    next();
  };
}
