/**
 * Low-level API-Football client.
 *
 * Wraps https://v3.football.api-sports.io/ using the `x-apisports-key` header.
 * The key is read from FOOTBALL_API_KEY at call time and never leaves the
 * server. Every method degrades gracefully when the key is missing: callers
 * receive `null` / empty results instead of a thrown error, so the product can
 * run with live-data empty states until credentials are configured.
 */

const API_BASE = process.env.FOOTBALL_API_BASE_URL || 'https://v3.football.api-sports.io';
const REQUEST_TIMEOUT_MS = 12000;

export class FootballApiError extends Error {
  readonly status: number;
  readonly errors: unknown;

  constructor(message: string, status = 502, errors: unknown = null) {
    super(message);
    this.name = 'FootballApiError';
    this.status = status;
    this.errors = errors;
  }
}

export interface ApiFootballEnvelope<T> {
  get: string;
  parameters: Record<string, string>;
  errors: unknown;
  results: number;
  paging: { current: number; total: number };
  response: T[];
}

export function isFootballApiConfigured(): boolean {
  return Boolean(process.env.FOOTBALL_API_KEY && process.env.FOOTBALL_API_KEY.trim());
}

function extractApiErrors(errors: unknown): string | null {
  if (!errors) return null;
  if (Array.isArray(errors)) return errors.length ? errors.map(String).join('; ') : null;
  if (typeof errors === 'object') {
    const values = Object.values(errors as Record<string, unknown>).filter(Boolean);
    return values.length ? values.map(String).join('; ') : null;
  }
  return String(errors);
}

/**
 * Perform an authenticated GET against API-Football.
 * Returns `null` when the integration is not configured or the request fails
 * in a way that should not break the caller (timeouts, 5xx, quota errors).
 */
export async function footballGet<T>(
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<ApiFootballEnvelope<T> | null> {
  if (!isFootballApiConfigured()) return null;

  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'x-apisports-key': process.env.FOOTBALL_API_KEY as string,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new FootballApiError('Football data rate limit reached.', 429);
      }
      throw new FootballApiError(`Football data request failed (${response.status}).`, response.status);
    }

    const payload = (await response.json()) as ApiFootballEnvelope<T>;
    const apiError = extractApiErrors(payload.errors);
    if (apiError) {
      // Quota / plan errors should not take the whole endpoint down.
      const status = /ratelimit|rate limit|quota|requests/i.test(apiError) ? 429 : 502;
      throw new FootballApiError(apiError, status, payload.errors);
    }
    return payload;
  } catch (error) {
    if (error instanceof FootballApiError) {
      if (error.status === 429) return null;
      throw error;
    }
    // Network / abort / parse errors — treat as "no live data right now".
    return null;
  } finally {
    clearTimeout(timer);
  }
}
