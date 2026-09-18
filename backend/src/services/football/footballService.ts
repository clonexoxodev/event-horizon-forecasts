/**
 * High-level football data service.
 *
 * Normalizes API-Football payloads into a stable, UI-friendly shape and adds a
 * two-tier cache (in-memory L1 + optional persistent L2) so the free request
 * quota is respected across serverless invocations.
 *
 * All reads degrade gracefully: when the football API is not configured or is
 * temporarily unavailable, callers receive empty arrays / null and the UI
 * renders empty states instead of failing.
 */

import { footballGet, isFootballApiConfigured } from './apiFootballClient';

export interface NormalizedTeam {
  id: number | null;
  name: string;
  logo: string | null;
  winner: boolean | null;
}

export interface NormalizedFixture {
  id: number;
  kickoff: string | null;
  statusShort: string;
  statusLong: string;
  elapsed: number | null;
  league: {
    id: number | null;
    name: string;
    country: string | null;
    logo: string | null;
    round: string | null;
    season: number | null;
  };
  home: NormalizedTeam;
  away: NormalizedTeam;
  goals: { home: number | null; away: number | null };
  venue: { name: string | null; city: string | null };
  isLive: boolean;
  isFinished: boolean;
  isUpcoming: boolean;
}

export interface FootballCacheStore {
  get(key: string): Promise<{ payload: unknown; expiresAt: string } | null>;
  set(key: string, payload: unknown, expiresAt: string): Promise<void>;
}

const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE', 'INT'];
const FINISHED_STATUSES = ['FT', 'AET', 'PEN', 'AWD', 'WO'];

const memoryCache = new Map<string, { payload: unknown; expiresAt: number }>();
let persistentStore: FootballCacheStore | null = null;

export function configureFootballCache(store: FootballCacheStore | null): void {
  persistentStore = store;
}

export function isFootballConfigured(): boolean {
  return isFootballApiConfigured();
}

function memoryGet<T>(key: string): T | null {
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return hit.payload as T;
}

function memorySet(key: string, payload: unknown, ttlMs: number): void {
  memoryCache.set(key, { payload, expiresAt: Date.now() + ttlMs });
  if (memoryCache.size > 500) {
    const now = Date.now();
    for (const [k, v] of memoryCache) {
      if (v.expiresAt <= now) memoryCache.delete(k);
    }
  }
}

async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T | null>,
  fallback: T
): Promise<T> {
  const l1 = memoryGet<T>(key);
  if (l1 !== null) return l1;

  if (persistentStore) {
    try {
      const l2 = await persistentStore.get(key);
      if (l2 && new Date(l2.expiresAt).getTime() > Date.now()) {
        memorySet(key, l2.payload, Math.min(ttlMs, new Date(l2.expiresAt).getTime() - Date.now()));
        return l2.payload as T;
      }
    } catch {
      // Persistent cache is best-effort only.
    }
  }

  const fresh = await loader();
  if (fresh === null) return memoryGet<T>(key) ?? fallback;

  memorySet(key, fresh, ttlMs);
  if (persistentStore) {
    try {
      await persistentStore.set(key, fresh, new Date(Date.now() + ttlMs).toISOString());
    } catch {
      // Ignore persistent cache write failures.
    }
  }
  return fresh;
}

function num(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function team(raw: any): NormalizedTeam {
  return {
    id: num(raw && raw.id),
    name: String((raw && raw.name) || 'TBD'),
    logo: (raw && raw.logo) || null,
    winner: raw && typeof raw.winner === 'boolean' ? raw.winner : null,
  };
}

function normalizeFixture(raw: any): NormalizedFixture | null {
  if (!raw || !raw.fixture || !raw.fixture.id) return null;
  const fixture = raw.fixture || {};
  const status = fixture.status || {};
  const short = String(status.short || 'NS').toUpperCase();
  const league = raw.league || {};
  return {
    id: num(fixture.id) as number,
    kickoff: fixture.date || null,
    statusShort: short,
    statusLong: String(status.long || 'Not Started'),
    elapsed: num(status.elapsed),
    league: {
      id: num(league.id),
      name: String(league.name || 'Football'),
      country: league.country || null,
      logo: league.logo || null,
      round: league.round || null,
      season: num(league.season),
    },
    home: team(raw.teams && raw.teams.home),
    away: team(raw.teams && raw.teams.away),
    goals: {
      home: num(raw.goals && raw.goals.home),
      away: num(raw.goals && raw.goals.away),
    },
    venue: {
      name: (fixture.venue && fixture.venue.name) || null,
      city: (fixture.venue && fixture.venue.city) || null,
    },
    isLive: LIVE_STATUSES.includes(short),
    isFinished: FINISHED_STATUSES.includes(short),
    isUpcoming: ['NS', 'TBD'].includes(short),
  };
}

function normalizeFixtures(rows: unknown): NormalizedFixture[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => normalizeFixture(row))
    .filter((row): row is NormalizedFixture => row !== null);
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function getLiveFixtures(): Promise<NormalizedFixture[]> {
  return cached('fixtures:live', 30_000, async () => {
    const envelope = await footballGet<any>('/fixtures', { live: 'all' });
    return envelope ? normalizeFixtures(envelope.response) : null;
  }, []);
}

export async function getFixturesByDate(date: string): Promise<NormalizedFixture[]> {
  return cached(`fixtures:date:${date}`, 120_000, async () => {
    const envelope = await footballGet<any>('/fixtures', { date, timezone: 'Africa/Lagos' });
    return envelope ? normalizeFixtures(envelope.response) : null;
  }, []);
}

export async function getUpcomingFixtures(days = 7): Promise<NormalizedFixture[]> {
  const from = new Date();
  const to = new Date(from.getTime() + Math.max(1, Math.min(days, 14)) * 86_400_000);
  const fromKey = toDateKey(from);
  const toKey = toDateKey(to);
  return cached(`fixtures:range:${fromKey}:${toKey}`, 300_000, async () => {
    const envelope = await footballGet<any>('/fixtures', {
      from: fromKey,
      to: toKey,
      timezone: 'Africa/Lagos',
    });
    if (!envelope) return null;
    const fixtures = normalizeFixtures(envelope.response);
    return fixtures
      .filter((f) => f.isUpcoming || f.isLive)
      .sort((a, b) => new Date(a.kickoff || 0).getTime() - new Date(b.kickoff || 0).getTime());
  }, []);
}

export async function getFixtureById(fixtureId: number): Promise<NormalizedFixture | null> {
  const fixtures = await cached(`fixture:${fixtureId}`, 60_000, async () => {
    const envelope = await footballGet<any>('/fixtures', { id: fixtureId });
    return envelope ? normalizeFixtures(envelope.response) : null;
  }, []);
  return fixtures[0] ?? null;
}

export async function getFixtureEvents(fixtureId: number): Promise<any[]> {
  return cached(`fixture:${fixtureId}:events`, 120_000, async () => {
    const envelope = await footballGet<any>('/fixtures/events', { fixture: fixtureId });
    return envelope ? envelope.response : null;
  }, []);
}

export async function getFixtureStatistics(fixtureId: number): Promise<any[]> {
  return cached(`fixture:${fixtureId}:statistics`, 120_000, async () => {
    const envelope = await footballGet<any>('/fixtures/statistics', { fixture: fixtureId });
    return envelope ? envelope.response : null;
  }, []);
}

export async function getFixtureLineups(fixtureId: number): Promise<any[]> {
  return cached(`fixture:${fixtureId}:lineups`, 300_000, async () => {
    const envelope = await footballGet<any>('/fixtures/lineups', { fixture: fixtureId });
    return envelope ? envelope.response : null;
  }, []);
}

export async function getMatchBundle(fixtureId: number): Promise<{
  fixture: NormalizedFixture | null;
  events: any[];
  statistics: any[];
  lineups: any[];
}> {
  const [fixture, events, statistics, lineups] = await Promise.all([
    getFixtureById(fixtureId),
    getFixtureEvents(fixtureId),
    getFixtureStatistics(fixtureId),
    getFixtureLineups(fixtureId),
  ]);
  return { fixture, events, statistics, lineups };
}

export interface MatchEvidence {
  fixtureId: number;
  home: number | null;
  away: number | null;
  total: number | null;
  result: 'home' | 'away' | 'draw' | null;
  statusShort: string;
  finished: boolean;
}

/**
 * Build the machine-readable evidence object consumed by the deterministic
 * verification engine (`evaluateCondition`) for `sport_event` arguments.
 */
export async function getMatchEvidence(fixtureId: number): Promise<MatchEvidence | null> {
  const fixture = await getFixtureById(fixtureId);
  if (!fixture) return null;
  const home = fixture.goals.home;
  const away = fixture.goals.away;
  let result: MatchEvidence['result'] = null;
  if (home !== null && away !== null) {
    result = home > away ? 'home' : home < away ? 'away' : 'draw';
  }
  return {
    fixtureId,
    home,
    away,
    total: home !== null && away !== null ? home + away : null,
    result,
    statusShort: fixture.statusShort,
    finished: fixture.isFinished,
  };
}

export function snapshotFromFixture(fixture: NormalizedFixture): Record<string, unknown> {
  return {
    fixtureId: fixture.id,
    kickoff: fixture.kickoff,
    statusShort: fixture.statusShort,
    league: fixture.league,
    home: fixture.home,
    away: fixture.away,
    goals: fixture.goals,
    venue: fixture.venue,
  };
}
