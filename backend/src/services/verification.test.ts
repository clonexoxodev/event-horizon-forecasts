import { describe, it, expect, vi } from 'vitest';
import {
  classifyContract,
  questionFromStatement,
  evaluateExpression,
  compareNumber,
  evaluateContract,
  isFixedArgument,
  contractFromMarket,
  argumentMode,
  verificationDecision,
  argumentResolutionDeadline,
  requiresExternalData,
  fetchRawEvidence,
  sourceUrlFor,
  describeContract,
  MAX_VERIFICATION_ATTEMPTS,
  toDbMethod,
  VerificationContract,
} from './verification.js';

const sportContract: VerificationContract = {
  method: 'sport_event',
  mode: 'group',
  source: 'https://sports.example/event/1',
  params: { condition: 'home_gte_2' },
};

const priceContract: VerificationContract = {
  method: 'crypto_price',
  mode: 'group',
  source: null,
  params: { asset: 'bitcoin', currency: 'usd', operator: 'gt', threshold: 100000 },
};

describe('classifyContract (argument creation contract validation)', () => {
  it('accepts a sports argument with a machine-readable contract', () => {
    const result = classifyContract({
      category: 'Sports',
      method: 'sport_event',
      mode: '1v1',
      source: 'https://api.example.com/match/123',
      params: { sport: 'soccer', eventId: '123', condition: 'home_gte_2' },
    });
    expect(result.ok).toBe(true);
    expect(result.contract?.mode).toBe('1v1');
    expect(result.contract?.source).toBe('https://api.example.com/match/123');
  });

  it('rejects a sports argument without an event reference', () => {
    const result = classifyContract({ category: 'Sports', method: 'sport_event', params: { sport: 'soccer' } });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/eventId/);
  });

  it('rejects a sports argument with an unparseable condition', () => {
    const result = classifyContract({
      category: 'Sports',
      method: 'sport_event',
      params: { sport: 'soccer', eventId: 'x', condition: 'banana > 3' },
    });
    expect(result.ok).toBe(false);
  });

  it('accepts a crypto price argument', () => {
    const result = classifyContract({
      category: 'Crypto',
      method: 'crypto_price',
      mode: 'group',
      params: { asset: 'bitcoin', currency: 'usd', operator: 'gt', threshold: 100000 },
    });
    expect(result.ok).toBe(true);
  });

  it('rejects a crypto price argument without a threshold', () => {
    const result = classifyContract({ category: 'Crypto', method: 'crypto_price', params: { asset: 'bitcoin', operator: 'gt' } });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/threshold/);
  });

  it('rejects a crypto price argument with an unknown operator', () => {
    const result = classifyContract({ category: 'Crypto', method: 'crypto_price', params: { asset: 'bitcoin', operator: 'roughly', threshold: 5 } });
    expect(result.ok).toBe(false);
  });

  it('accepts a crypto event argument when a source URL is provided', () => {
    const result = classifyContract({
      category: 'Crypto',
      method: 'crypto_event',
      source: 'https://api.chain.example/status',
      params: { asset: 'ether', event: 'shapella' },
    });
    expect(result.ok).toBe(true);
  });

  it('rejects a crypto event argument without a machine-readable source', () => {
    const result = classifyContract({ category: 'Crypto', method: 'crypto_event', params: { asset: 'ether', event: 'halving' } });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/source/);
  });

  it('accepts a factual argument with a deterministic formula', () => {
    const result = classifyContract({ category: 'facts', method: 'factual', params: { calc: 'score.home - score.away' } });
    expect(result.ok).toBe(true);
  });

  it('accepts a factual argument with a source URL', () => {
    const result = classifyContract({ category: 'Verifiable knowledge/facts', method: 'factual', source: 'https://api.example.com/claim/42' });
    expect(result.ok).toBe(true);
  });

  it('rejects a factual argument with neither source nor formula', () => {
    const result = classifyContract({ category: 'facts', method: 'factual', params: {} });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/source URL|formula/);
  });

  it('rejects a manual method (no overseers)', () => {
    const result = classifyContract({ category: 'Sports', method: 'manual', params: {} });
    expect(result.ok).toBe(false);
  });

  it('rejects an invalid mode', () => {
    const result = classifyContract({
      category: 'Sports',
      method: 'sport_event',
      mode: 'draft',
      params: { sport: 'x', eventId: '1', condition: 'home_win' },
    });
    expect(result.ok).toBe(false);
  });

  it('defaults mode to group when omitted', () => {
    const result = classifyContract({ category: 'Sports', method: 'sport_event', params: { sport: 'x', eventId: '1', condition: 'home_win' } });
    expect(result.ok).toBe(true);
    expect(result.contract?.mode).toBe('group');
  });

  it('maps a facts category to the factual method', () => {
    const result = classifyContract({ category: 'facts', params: { calc: '1' } });
    expect(result.ok).toBe(true);
    expect(result.contract?.method).toBe('factual');
  });

  it('maps a crypto category with an event payload into crypto_event', () => {
    const result = classifyContract({ category: 'crypto', source: 'https://x.dev/e', params: { asset: 'bitcoin', event: 'halving' } });
    expect(result.ok).toBe(true);
    expect(result.contract?.method).toBe('crypto_event');
  });

  it('resolves the crypto_market DB alias into crypto_price', () => {
    const result = classifyContract({ category: 'crypto', method: 'crypto_market', params: { asset: 'bitcoin', operator: 'gte', threshold: 100000 } });
    expect(result.ok).toBe(true);
    expect(result.contract?.method).toBe('crypto_price');
  });

  it('resolves the crypto_market DB alias into crypto_event when event fields are present', () => {
    const result = classifyContract({ category: 'crypto', method: 'crypto_market', source: 'https://x.dev/e', params: { asset: 'ether', event: 'halving' } });
    expect(result.ok).toBe(true);
    expect(result.contract?.method).toBe('crypto_event');
  });

  it('rejects an unsupported category with no method', () => {
    const result = classifyContract({ category: 'Politics', params: {} });
    expect(result.ok).toBe(false);
  });
});

describe('questionFromStatement (strict YES/NO phrasing)', () => {
  it('turns a statement into a question', () => {
    expect(questionFromStatement('  Legolas\n beats  Gimli  ')).toBe('Legolas beats Gimli?');
  });

  it('keeps an existing question mark', () => {
    expect(questionFromStatement('Is the coin above 100?')).toBe('Is the coin above 100?');
  });
});

describe('evaluateExpression (deterministic safe evaluator)', () => {
  it('evaluates arithmetic with precedence and helpers', () => {
    expect(evaluateExpression('2 + 3 * 4')).toBe(14);
    expect(evaluateExpression('(2 + 3) * 4')).toBe(20);
    expect(evaluateExpression('10 % 3')).toBe(1);
    expect(evaluateExpression('2 ^ 10')).toBe(1024);
    expect(evaluateExpression('-5 + 3')).toBe(-2);
  });

  it('resolves dotted variables and coerces booleans', () => {
    expect(evaluateExpression('score.home - score.away', { score: { home: 2, away: 1 } })).toBe(1);
    expect(evaluateExpression('done', { done: true })).toBe(1);
  });

  it('returns null on invalid input', () => {
    expect(evaluateExpression('2 +')).toBe(null);
    expect(evaluateExpression('2 / 0')).toBe(null);
    expect(evaluateExpression('a.b', {})).toBe(null);
    expect(evaluateExpression('alert(1)')).toBe(null);
    expect(evaluateExpression('__proto__.polluted', {})).toBe(null);
    expect(evaluateExpression('2 + 3; return 4')).toBe(null);
  });

  it('is deterministic across repeated calls', () => {
    const formula = 'a * 100 + b';
    const vars = { a: 2, b: 5 };
    expect(evaluateExpression(formula, vars)).toBe(205);
    expect(evaluateExpression(formula, vars)).toBe(205);
    expect(evaluateExpression(formula, vars)).toBe(205);
  });
});

describe('compareNumber', () => {
  it('compares numeric strings, rejects garbage', () => {
    expect(compareNumber('105000', 'gt', 100000)).toBe(true);
    expect(compareNumber('90000', 'gt', 100000)).toBe(false);
    expect(compareNumber('abc', 'gt', 100000)).toBe(null);
    expect(compareNumber(100000, 'lte', 100000)).toBe(true);
    expect(compareNumber(1, 'neq', 2)).toBe(true);
    expect(compareNumber(1, 'eq', 1)).toBe(true);
  });
});

describe('evaluateContract', () => {
  it('sports: YES when the condition holds, NO otherwise', () => {
    expect(evaluateContract(sportContract, { score: { home: 3, away: 1 } }).outcome).toBe('YES');
    expect(evaluateContract(sportContract, { score: { home: 1, away: 0 } }).outcome).toBe('NO');
  });

  it('sports: null when data is insufficient', () => {
    expect(evaluateContract(sportContract, { status: 'live' }).outcome).toBe(null);
  });

  it('sports: accepts a result label', () => {
    const c: VerificationContract = { ...sportContract, params: { condition: 'home_win' } };
    expect(evaluateContract(c, { result: 'home' }).outcome).toBe('YES');
    expect(evaluateContract(c, { result: 'away' }).outcome).toBe('NO');
    expect(evaluateContract(c, { score: { home: 2, away: 0 } }).outcome).toBe('YES');
  });

  it('sports: total_over handles decimals', () => {
    const c: VerificationContract = { ...sportContract, params: { condition: 'total_over_2.5' } };
    expect(evaluateContract(c, { home: 2, away: 1 }).outcome).toBe('YES');
    expect(evaluateContract(c, { home: 1, away: 1 }).outcome).toBe('NO');
  });

  it('crypto price: reads the CoinGecko simple-price shape', () => {
    expect(evaluateContract(priceContract, { bitcoin: { usd: 105000 } }).outcome).toBe('YES');
    expect(evaluateContract(priceContract, { bitcoin: { usd: 90000 } }).outcome).toBe('NO');
  });

  it('crypto price: accepts a bare number', () => {
    expect(evaluateContract(priceContract, 105000).outcome).toBe('YES');
    expect(evaluateContract(priceContract, 50000).outcome).toBe('NO');
  });

  it('crypto price: null when the price is missing', () => {
    expect(evaluateContract(priceContract, { wrong: 'shape' }).outcome).toBe(null);
  });

  it('crypto event: boolean and status sources', () => {
    const evt: VerificationContract = { method: 'crypto_event', mode: 'group', source: 'https://e.example/s', params: { asset: 'ether' } };
    expect(evaluateContract(evt, true).outcome).toBe('YES');
    expect(evaluateContract(evt, false).outcome).toBe('NO');
    expect(evaluateContract(evt, { occurred: true }).outcome).toBe('YES');
    expect(evaluateContract(evt, { status: 'pending' }).outcome).toBe('NO');
  });

  it('crypto event: null when the source is unknown', () => {
    const evt: VerificationContract = { method: 'crypto_event', mode: 'group', source: 'https://e.example/s', params: { asset: 'ether' } };
    expect(evaluateContract(evt, { status: 'unknown' }).outcome).toBe(null);
  });

  it('factual: deterministic formula decides YES/NO', () => {
    const c: VerificationContract = { method: 'factual', mode: 'group', source: null, params: { calc: 'score.home - score.away' } };
    expect(evaluateContract(c, { score: { home: 2, away: 1 } }).outcome).toBe('YES');
    expect(evaluateContract(c, { score: { home: 1, away: 1 } }).outcome).toBe('NO');
  });

  it('factual: boolean source decides YES/NO', () => {
    const c: VerificationContract = { method: 'factual', mode: 'group', source: 'https://f.example/c', params: {} };
    expect(evaluateContract(c, { result: true }).outcome).toBe('YES');
    expect(evaluateContract(c, { result: 'false' }).outcome).toBe('NO');
    expect(evaluateContract(c, { result: 42 }).outcome).toBe('YES');
    expect(evaluateContract(c, { something: 'else' }).outcome).toBe(null);
  });

  it('verification is deterministic and does not depend on prior attempts', () => {
    const first = evaluateContract(priceContract, { bitcoin: { usd: 105000 } });
    const second = evaluateContract(priceContract, { bitcoin: { usd: 105000 } });
    expect(first).toEqual(second);
    expect(first.outcome).toBe('YES');
  });
});

describe('market helpers', () => {
  it('isFixedArgument', () => {
    expect(isFixedArgument({ pricing_model: 'fixed' })).toBe(true);
    expect(isFixedArgument({ pricing_model: 'ownership_shares' })).toBe(false);
    expect(isFixedArgument(null)).toBe(false);
  });

  it('contractFromMarket reconstructs a stored contract', () => {
    const market = {
      pricing_model: 'fixed',
      verification_method: 'crypto_price',
      verification_source: null,
      verification_params: { asset: 'bitcoin', operator: 'gte', threshold: 100000, mode: '1v1' },
    };
    const contract = contractFromMarket(market);
    expect(contract).not.toBeNull();
    expect(contract?.method).toBe('crypto_price');
    expect(contract?.mode).toBe('1v1');
  });

  it('contractFromMarket returns null for invalid rows', () => {
    expect(contractFromMarket({ pricing_model: 'ownership_shares', verification_method: 'crypto_price', verification_params: {} })).toBeNull();
    expect(contractFromMarket({ pricing_model: 'fixed', verification_method: 'oracle', verification_params: {} })).toBeNull();
    expect(contractFromMarket({ pricing_model: 'fixed', verification_method: 'sport_event', verification_params: {} })).toBeNull();
  });

  it('contractFromMarket reads a crypto_market row stored by the DB layer', () => {
    const contract = contractFromMarket({
      pricing_model: 'fixed',
      verification_method: 'crypto_market',
      verification_source: null,
      verification_params: { asset: 'bitcoin', operator: 'lte', threshold: 50000, mode: 'group' },
    });
    expect(contract).not.toBeNull();
    expect(contract?.method).toBe('crypto_price');
    expect(contract?.mode).toBe('group');
  });

  it('contractFromMarket reads a crypto_market event row into crypto_event', () => {
    const contract = contractFromMarket({
      pricing_model: 'fixed',
      verification_method: 'crypto_market',
      verification_source: 'https://x.dev/e',
      verification_params: { asset: 'ether', event: 'halving' },
    });
    expect(contract).not.toBeNull();
    expect(contract?.method).toBe('crypto_event');
    expect(contract?.source).toBe('https://x.dev/e');
  });

  it('toDbMethod maps crypto method variants onto the DB whitelist value', () => {
    expect(toDbMethod('crypto_price')).toBe('crypto_market');
    expect(toDbMethod('crypto_event')).toBe('crypto_market');
    expect(toDbMethod('sport_event')).toBe('sport_event');
    expect(toDbMethod('factual')).toBe('factual');
  });

  it('argumentMode defaults to group', () => {
    expect(argumentMode({ verification_params: { mode: '1v1' } })).toBe('1v1');
    expect(argumentMode({ verification_params: {} })).toBe('group');
    expect(argumentMode({})).toBe('group');
  });

  it('verificationDecision gates attempts', () => {
    const due = {
      pricing_model: 'fixed',
      verification_method: 'crypto_price',
      verification_status: 'pending',
      verification_attempt_count: 0,
      resolution_date: new Date(Date.now() - 1000).toISOString(),
    };
    expect(verificationDecision(due).shouldAttempt).toBe(true);
    expect(verificationDecision({ ...due, verification_status: 'verified' }).shouldAttempt).toBe(false);
    expect(verificationDecision({ ...due, verification_status: 'unverifiable' }).shouldAttempt).toBe(false);
    expect(verificationDecision({ ...due, verification_attempt_count: MAX_VERIFICATION_ATTEMPTS }).shouldAttempt).toBe(false);
    expect(verificationDecision({ ...due, resolution_date: new Date(Date.now() + 10000).toISOString() }).shouldAttempt).toBe(false);
    expect(verificationDecision({ ...due, verification_method: null }).shouldAttempt).toBe(false);
    expect(verificationDecision({ pricing_model: 'ownership_shares' }).shouldAttempt).toBe(false);
  });

  it('argumentResolutionDeadline falls back to close + margin', () => {
    const close = new Date('2026-01-01T00:00:00Z').getTime();
    expect(argumentResolutionDeadline({ close_date: '2026-01-01T00:00:00Z' })).toBe(close + 120000);
    expect(argumentResolutionDeadline({ resolution_date: '2026-02-01T00:00:00Z', close_date: '2026-01-01T00:00:00Z' })).toBe(new Date('2026-02-01T00:00:00Z').getTime());
  });

  it('requiresExternalData', () => {
    expect(requiresExternalData({ method: 'factual', mode: 'group', source: null, params: { calc: '1+1' } })).toBe(false);
    expect(requiresExternalData({ method: 'crypto_price', mode: 'group', source: null, params: { asset: 'bitcoin' } })).toBe(true);
    expect(requiresExternalData({ method: 'sport_event', mode: 'group', source: 'https://s.example/e', params: {} })).toBe(true);
  });

  it('sourceUrlFor defaults crypto price to CoinGecko', () => {
    const url = sourceUrlFor({ method: 'crypto_price', mode: 'group', source: null, params: { asset: 'bitcoin', currency: 'usd' } });
    expect(url).toContain('api.coingecko.com');
    expect(url).toContain('bitcoin');
  });

  it('sourceUrlFor honours an explicit source, returns null when none is needed', () => {
    expect(sourceUrlFor({ method: 'sport_event', mode: 'group', source: 'https://s.example/e', params: {} })).toBe('https://s.example/e');
    expect(sourceUrlFor({ method: 'factual', mode: 'group', source: null, params: { calc: '1' } })).toBe(null);
  });

  it('describeContract is deterministic and human-readable', () => {
    const d = describeContract(priceContract);
    expect(d.yes).toContain('YES');
    expect(d.yes).toContain('bitcoin');
    expect(d.yes).toContain('100000');
  });
});

describe('fetchRawEvidence', () => {
  it('returns null when the source is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false } as any));
    const contract: VerificationContract = { method: 'crypto_event', mode: 'group', source: 'https://x.example/s', params: {} };
    expect(await fetchRawEvidence(contract)).toBeNull();
    vi.unstubAllGlobals();
  });

  it('parses a JSON payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => '{"occurred":true}' } as any));
    const contract: VerificationContract = { method: 'crypto_event', mode: 'group', source: 'https://x.example/s', params: {} };
    expect(await fetchRawEvidence(contract)).toEqual({ occurred: true });
    vi.unstubAllGlobals();
  });

  it('parses scalar true/false payloads', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, text: async () => 'false' } as any));
    const contract: VerificationContract = { method: 'factual', mode: 'group', source: 'https://f.example/c', params: {} };
    expect(await fetchRawEvidence(contract)).toBe(false);
    vi.unstubAllGlobals();
  });

  it('returns null without a source URL', async () => {
    expect(await fetchRawEvidence({ method: 'factual', mode: 'group', source: null, params: { calc: '1' } })).toBeNull();
  });
});