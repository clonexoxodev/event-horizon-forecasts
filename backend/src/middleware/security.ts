import { Request, Response, NextFunction } from 'express';
import { supabase } from '../db/supabase-client.js';
import type { SupabaseClient } from '@supabase/supabase-js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      pagination?: {
        limit: number;
        offset: number;
      };
    }
  }
}

/**
 * Sanitize a single string value to prevent XSS.
 */
function sanitizeString(value: string): string {
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/\bon\w+\s*=\s*(['"])[^'"]*\1/gi, '')
    .replace(/\bon\w+\s*=\s*\S+/gi, '');
}

/**
 * Recursively sanitize all string values in an object.
 */
function sanitizeValue(value: any): any {
  if (typeof value === 'string') {
    return sanitizeString(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === 'object') {
    return sanitizeObject(value);
  }
  return value;
}

/**
 * Sanitize all string values in an object, returning a new object.
 */
function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    sanitized[key] = sanitizeValue(obj[key]);
  }
  return sanitized;
}

/**
 * Middleware that sanitizes request body/query/params to prevent XSS.
 */
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query as Record<string, any>);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Returns middleware that validates a UUID parameter.
 */
export const validateUUID = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const paramValue = req.params[paramName];
    if (!paramValue || !UUID_REGEX.test(paramValue)) {
      res.status(400).json({
        error: {
          code: 'INVALID_PARAM',
          message: `Invalid ${paramName} format. Expected a valid UUID.`,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }
    next();
  };
};

/**
 * Middleware that normalizes pagination params (limit, offset).
 */
export const validatePagination = (req: Request, _res: Response, next: NextFunction): void => {
  const rawLimit = Number(req.query.limit);
  const rawOffset = Number(req.query.offset);

  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.floor(rawLimit), 1), 100) : 50;
  const offset = Number.isFinite(rawOffset) ? Math.max(Math.floor(rawOffset), 0) : 0;

  req.pagination = { limit, offset };
  next();
};

/**
 * Middleware that adds standard security headers.
 */
export const securityHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
};

/**
 * Helper that logs an admin action into the admin_audit_log table.
 *
 * @param supabaseClient - Supabase client instance to use for the insert.
 * @param action         - Human-readable action string.
 * @param details        - Optional JSON-serialisable details object.
 */
export const logAdminAction = async (
  supabaseClient: SupabaseClient,
  action: string,
  details?: Record<string, any>,
): Promise<void> => {
  try {
    const { error } = await supabaseClient
      .from('admin_audit_log')
      .insert({
        action,
        details: details ?? null,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to log admin action:', error);
    }
  } catch (err) {
    console.error('Unexpected error logging admin action:', err);
  }
};
