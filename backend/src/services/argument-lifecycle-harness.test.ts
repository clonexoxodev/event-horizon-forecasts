import { describe, it, expect } from 'vitest';
import {
  contractFromMarket,
  argumentMode,
  verificationDecision,
  evaluateContract,
  MAX_VERIFICATION_ATTEMPTS,
  isFixedArgument,
  YesNo,
} from './verification.js';

interface MockPosition {
  id: string;
  userId: string;
  side: 'YES' | 'NO';
  status: string;
  amount: number;
}

interface MockSettlement {
  market: string;
  outcome: YesNo;
  at: number;
}

const makeHarness = () => {
  const positions: MockPosition[] = [];
  const attempts: any[] = [];
  const refunds: { positionId: string; amount: number }[] = [];
  const settlements: MockSettlement[] = [];

  const store = {
    positions,
    attempts,
    refunds,
    settlements,
    settledOnce(marketId: string) {
      return settlements.filter((s) => s.market === marketId).length;
    },
    refundTotal() {
      return refunds.reduce((sum, r) => sum + r.amount, 0);
    },
    attemptCount(marketId: string) {
      return attempts.filter((a) => a.market === marketId).length;
    },
  };

  const addPosition = (marketId: string, userId: string, side: 'YES' | 'NO', amount: number) => {
    positions.push({ id: `${marketId}-${userId}`, userId, side, status: 'active', amount });
  };

  const countSides = () => {
    const active = positions.filter((p) => p.status === 'active');
    return {
      yes: active.filter((p) => p.side === 'YES').length,
      no: active.filter((p) => p.side === 'NO').length,
      total: active.length,
    };
  };

  const refundAll = (marketId: string, reason: string) => {
    for (const p of positions.filter((xp) => xp.status === 'active')) {
      p.status = 'refunded';
      refunds.push({ positionId: p.id, amount: p.amount });
    }
    return `refunded:${reason}`;
  };

  const verifyOnce = async (market: any, provider: unknown): Promise<{ outcome: YesNo | null }> => {
    const contract = contractFromMarket(market);
    if (!contract) {
      attempts.push({ market: market.id, status: 'failed', reason: 'invalid-contract' });
      return { outcome: null };
    }
    const attemptNumber = store.attemptCount(market.id) + 1;
    if (provider === null && contract.method !== 'factual') {
      attempts.push({ market: market.id, status: 'failed', reason: 'unreachable', n: attemptNumber });
      return { outcome: null };
    }
    const evaluation = evaluateContract(contract, provider);
    if (!evaluation.outcome) {
      attempts.push({ market: market.id, status: 'failed', reason: evaluation.failureReason || 'no-outcome', n: attemptNumber });
      return { outcome: null };
    }
    attempts.push({ market: market.id, status: 'verified', outcome: evaluation.outcome, n: attemptNumber });
    return { outcome: evaluation.outcome };
  };

  const lifecycle = async (market: any, provider: unknown | null = null) => {
    if (!isFixedArgument(market)) return { changed: false, status: market.status };
    if (['resolved', 'refunded'].includes(String(market.status))) return { changed: false, status: market.status };
    const now = Date.now();
    const due = now >= new Date(market.resolution_date).getTime();
    const closed = due || ['closed', 'pending_resolution'].includes(String(market.status));
    if (!closed) return { changed: false, status: market.status };

    const sides = countSides();
    const mode = argumentMode(market);
    if (mode === '1v1') {
      if (sides.total !== 2) {
        refundAll(market.id, 'NO_OPPONENT');
        return { changed: true, status: 'refunded' };
      }
    } else if (sides.yes < 1 || sides.no < 1) {
      refundAll(market.id, 'ONE_SIDED');
      return { changed: true, status: 'refunded' };
    }

    const decision = verificationDecision({ ...market, status: 'closed' });
    if (!decision.shouldAttempt) return { changed: false, status: 'pending' };

    const result = await verifyOnce(market, provider);
    if (!result.outcome) {
      const failed = attempts.filter((a) => a.market === market.id && a.status === 'failed').length;
      if (failed >= MAX_VERIFICATION_ATTEMPTS) {
        refundAll(market.id, 'VERIFICATION_FAILED');
        return { changed: true, status: 'refunded' };
      }
      return { changed: true, status: 'pending' };
    }
    if (store.settledOnce(market.id) === 0) {
      settlements.push({ market: market.id, outcome: result.outcome, at: Date.now() });
    }
    return { changed: true, status: 'resolved', outcome: result.outcome };
  };

  return { store, lifecycle, addPosition };
};

describe('argument lifecycle rules (mirror of index.ts runArgumentLifecycle)', () => {
  const market = (over: any = {}) => ({
    id: 'm1',
    pricing_model: 'fixed',
    status: 'active',
    resolution_date: '2020-01-01T00:00:00Z',
    verification_method: 'crypto_price',
    verification_source: null,
    verification_params: { asset: 'bitcoin', currency: 'usd', operator: 'gt', threshold: 100000, mode: 'group' },
    verification_status: 'pending',
    verification_attempt_count: 0,
    ...over,
  });

  it('1v1 with both sides present verifies and settles exactly once, idempotently', async () => {
    const h = makeHarness();
    h.addPosition('m1', 'u1', 'YES', 1000);
    h.addPosition('m1', 'u2', 'NO', 1000);
    const m = market({ verification_params: { asset: 'bitcoin', currency: 'usd', operator: 'gt', threshold: 100000, mode: '1v1' } });
    const first = await h.lifecycle(m, { bitcoin: { usd: 105000 } });
    const second = await h.lifecycle(m, { bitcoin: { usd: 105000 } });
    expect(first.status).toBe('resolved');
    expect(first.outcome).toBe('YES');
    expect(h.store.settledOnce('m1')).toBe(1);
    expect(second.status).toBe('resolved');
    expect(h.store.settledOnce('m1')).toBe(1);
    expect(h.store.refundTotal()).toBe(0);
  });

  it('1v1 with only one participant refunds that participant at deadline', async () => {
    const h = makeHarness();
    h.addPosition('m1', 'u1', 'YES', 1000);
    const m = market({ verification_params: { asset: 'bitcoin', currency: 'usd', operator: 'gt', threshold: 100000, mode: '1v1' } });
    const result = await h.lifecycle(m, null);
    expect(result.status).toBe('refunded');
    expect(h.store.refundTotal()).toBe(1000);
    expect(h.store.settledOnce('m1')).toBe(0);
  });

  it('1v1 with nobody joining is refunded as an empty market', async () => {
    const h = makeHarness();
    const m = market({ verification_params: { asset: 'bitcoin', currency: 'usd', operator: 'gt', threshold: 100000, mode: '1v1' } });
    const result = await h.lifecycle(m, null);
    expect(result.status).toBe('refunded');
    expect(h.store.refundTotal()).toBe(0);
  });

  it('group market with both sides present verifies and resolves', async () => {
    const h = makeHarness();
    h.addPosition('m1', 'u1', 'YES', 1000);
    h.addPosition('m1', 'u2', 'NO', 1000);
    h.addPosition('m1', 'u3', 'NO', 1000);
    const result = await h.lifecycle(market(), { bitcoin: { usd: 90000 } });
    expect(result.status).toBe('resolved');
    expect(result.outcome).toBe('NO');
    expect(h.store.refundTotal()).toBe(0);
  });

  it('group market with a zero side refunds everyone at deadline', async () => {
    const h = makeHarness();
    h.addPosition('m1', 'u1', 'YES', 1000);
    h.addPosition('m1', 'u2', 'YES', 2000);
    const result = await h.lifecycle(market(), null);
    expect(result.status).toBe('refunded');
    expect(h.store.refundTotal()).toBe(3000);
    expect(h.store.settledOnce('m1')).toBe(0);
  });

  it('group market with no participants does not pay out', async () => {
    const h = makeHarness();
    const result = await h.lifecycle(market(), null);
    expect(result.status).toBe('refunded');
    expect(h.store.refundTotal()).toBe(0);
  });

  it('maxes out attempts then refunds when verification keeps failing', async () => {
    const h = makeHarness();
    h.addPosition('m1', 'u1', 'YES', 1000);
    h.addPosition('m1', 'u2', 'NO', 1000);
    let result;
    for (let i = 0; i <= MAX_VERIFICATION_ATTEMPTS; i += 1) {
      result = await h.lifecycle(market({ verification_status: 'failed', verification_attempt_count: i }), null);
      if (result.status === 'refunded') break;
    }
    expect(result?.status).toBe('refunded');
    expect(h.store.refundTotal()).toBe(2000);
    const failedAttempts = h.store.attempts.filter((a) => a.market === 'm1' && a.status === 'failed').length;
    expect(failedAttempts).toBeGreaterThanOrEqual(MAX_VERIFICATION_ATTEMPTS);
    expect(h.store.settledOnce('m1')).toBe(0);
  });

  it('does not settle or refund before the resolution deadline', async () => {
    const h = makeHarness();
    h.addPosition('m1', 'u1', 'YES', 1000);
    h.addPosition('m1', 'u2', 'NO', 1000);
    const future = market({ resolution_date: new Date(Date.now() + 3600_000).toISOString() });
    const result = await h.lifecycle(future, { bitcoin: { usd: 105000 } });
    expect(result.changed).toBe(false);
    expect(h.store.settledOnce('m1')).toBe(0);
    expect(h.store.refundTotal()).toBe(0);
  });

  it('records a verified attempt with the outcome when verification succeeds', async () => {
    const h = makeHarness();
    h.addPosition('m1', 'u1', 'YES', 1000);
    h.addPosition('m1', 'u2', 'NO', 1000);
    await h.lifecycle(market(), { bitcoin: { usd: 120000 } });
    const verified = h.store.attempts.filter((a) => a.market === 'm1' && a.status === 'verified');
    expect(verified.length).toBe(1);
    expect(verified[0].outcome).toBe('YES');
  });

  it('ignores non-fixed markets entirely', async () => {
    const h = makeHarness();
    const result = await h.lifecycle({ id: 'm2', status: 'active', pricing_model: 'ownership_shares' });
    expect(result.changed).toBe(false);
    expect(h.store.refundTotal()).toBe(0);
  });
});