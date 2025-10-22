/**
 * Security Middleware for TTS API
 * 
 * Implements:
 * - API key authentication
 * - Rate limiting per IP
 * - Request validation
 * - CORS protection
 * - Request logging for security auditing
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Rate limiting store
 * Tracks requests per IP address
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Configuration for rate limiting
 */
export interface RateLimitConfig {
  maxRequests: number;  // Max requests per window
  windowMs: number;     // Time window in milliseconds
}

/**
 * Get client IP address from request
 * Handles proxied requests correctly
 */
function getClientIP(req: Request): string {
  // Check for X-Forwarded-For header (common in proxied setups)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
    return ips[0].trim();
  }

  // Fallback to connection remote address
  return req.socket.remoteAddress || 'unknown';
}

/**
 * Rate limiting middleware
 * Prevents abuse by limiting requests per IP
 */
export function createRateLimiter(config: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = getClientIP(req);
    const now = Date.now();

    // Get or create rate limit entry for this IP
    let entry = rateLimitStore.get(ip);

    // Clean up entry if window has passed
    if (entry && now > entry.resetTime) {
      entry = undefined;
    }

    if (!entry) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
      };
      rateLimitStore.set(ip, entry);
    }

    // Increment request count
    entry.count++;

    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      
      res.setHeader('Retry-After', retryAfter.toString());
      res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', entry.resetTime.toString());

      console.warn(`🚨 Rate limit exceeded for IP: ${ip}`);

      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter,
      });
      return;
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (config.maxRequests - entry.count).toString());
    res.setHeader('X-RateLimit-Reset', entry.resetTime.toString());

    next();
  };
}

/**
 * API Key authentication middleware
 * Validates Bearer token from Authorization header
 */
export function createAuthMiddleware(validApiKeys: Set<string>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Extract Authorization header
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing Authorization header',
      });
      return;
    }

    // Validate Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid Authorization header format. Expected: Bearer <token>',
      });
      return;
    }

    const token = parts[1];

    // Validate token
    if (!validApiKeys.has(token)) {
      const ip = getClientIP(req);
      console.warn(`🚨 Invalid API key attempt from IP: ${ip}`);
      
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key',
      });
      return;
    }

    // Authentication successful
    next();
  };
}

/**
 * Request logging middleware
 * Logs all TTS requests for security auditing
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const ip = getClientIP(req);
  const timestamp = new Date().toISOString();
  const method = req.method;
  const path = req.path;

  // Log request
  console.log(`📝 [${timestamp}] ${method} ${path} from ${ip}`);

  // Log response when finished
  const originalSend = res.send;
  res.send = function(data: any): Response {
    const statusCode = res.statusCode;
    const logLevel = statusCode >= 400 ? '❌' : '✅';
    console.log(`${logLevel} [${timestamp}] ${method} ${path} -> ${statusCode}`);
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Input validation middleware for TTS requests
 * Validates request body before processing
 */
export function validateTTSRequest(req: Request, res: Response, next: NextFunction): void {
  const { text, quality, speed } = req.body;

  // Validate required field: text
  if (!text || typeof text !== 'string') {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Missing or invalid "text" field. Must be a non-empty string.',
    });
    return;
  }

  // Validate optional field: quality
  if (quality !== undefined && quality !== 'low' && quality !== 'medium') {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid "quality" field. Must be "low" or "medium".',
    });
    return;
  }

  // Validate optional field: speed
  if (speed !== undefined) {
    const speedNum = Number(speed);
    if (isNaN(speedNum) || speedNum < 0.5 || speedNum > 2.0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid "speed" field. Must be a number between 0.5 and 2.0.',
      });
      return;
    }
  }

  next();
}

/**
 * Cleanup task: Remove old rate limit entries
 * Call this periodically to prevent memory leaks
 */
export function cleanupRateLimitStore(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const [ip, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(ip);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`🧹 Cleaned up ${cleaned} expired rate limit entries`);
  }

  return cleaned;
}

/**
 * CORS middleware for TTS API
 * Restricts access to specific origins
 */
export function createCORSMiddleware(allowedOrigins: string[] = ['*']) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.headers.origin;

    if (allowedOrigins.includes('*')) {
      // Allow all origins (use with caution!)
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (origin && allowedOrigins.includes(origin)) {
      // Allow specific origin
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      // Origin not allowed
      res.status(403).json({
        error: 'Forbidden',
        message: 'Origin not allowed',
      });
      return;
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }

    next();
  };
}

/**
 * Security headers middleware
 * Adds security-related HTTP headers
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Strict Transport Security (if using HTTPS)
  if (req.secure) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}

