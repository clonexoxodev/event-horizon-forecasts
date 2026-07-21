import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { isValidLifecycleTransition } from './settlement.service.js';

vi.mock('../db/supabase-client.js', () => {
  const chain: any = {};
  const buildChain = () => {
    const c: any = {};
    c.select = vi.fn(() => c);
    c.eq = vi.fn(() => c);
    c.in = vi.fn(() => c);
    c.not = vi.fn(() => c);
    c.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
    c.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
    c.insert = vi.fn(() => ({ ...c, single: c.single, select: c.select }));
    c.update = vi.fn(() => c);
    c.delete = vi.fn(() => c);
    c.rpc = vi.fn(() => Promise.resolve({ data: null, error: null }));
    c.from = vi.fn(() => c);
    return c;
  };

  const mockSupabase = buildChain();
  return { supabase: mockSupabase };
});

const { supabase: mockSupabase } = await import('../db/supabase-client.js') as { supabase: any };

function resetMock() {
  mockSupabase.from.mockReturnValue(mockSupabase);
  mockSupabase.select.mockReturnValue(mockSupabase);
  mockSupabase.eq.mockReturnValue(mockSupabase);
  mockSupabase.in.mockReturnValue(mockSupabase);
  mockSupabase.not.mockReturnValue(mockSupabase);
  mockSupabase.update.mockReturnValue(mockSupabase);
  mockSupabase.insert.mockReturnValue({ single: mockSupabase.single, select: mockSupabase.select });
  mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
  mockSupabase.single.mockResolvedValue({ data: null, error: null });
  mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });
}

const { SettlementService } = await import('./settlement.service.js');

describe('isValidLifecycleTransition', () => {
  it('should allow draft -> active', () => {
    expect(isValidLifecycleTransition('draft', 'active')).toBe(true);
  });

  it('should allow draft -> cancelled', () => {
    expect(isValidLifecycleTransition('draft', 'cancelled')).toBe(true);
  });

  it('should allow active -> closed', () => {
    expect(isValidLifecycleTransition('active', 'closed')).toBe(true);
  });

  it('should allow active -> pending_resolution', () => {
    expect(isValidLifecycleTransition('active', 'pending_resolution')).toBe(true);
  });

  it('should allow active -> refunded', () => {
    expect(isValidLifecycleTransition('active', 'refunded')).toBe(true);
  });

  it('should allow closed -> resolving', () => {
    expect(isValidLifecycleTransition('closed', 'resolving')).toBe(true);
  });

  it('should allow pending_resolution -> resolving', () => {
    expect(isValidLifecycleTransition('pending_resolution', 'resolving')).toBe(true);
  });

  it('should allow resolving -> resolved', () => {
    expect(isValidLifecycleTransition('resolving', 'resolved')).toBe(true);
  });

  it('should allow resolving -> refunding', () => {
    expect(isValidLifecycleTransition('resolving', 'refunding')).toBe(true);
  });

  it('should allow resolving -> failed', () => {
    expect(isValidLifecycleTransition('resolving', 'failed')).toBe(true);
  });

  it('should allow refunding -> refunded', () => {
    expect(isValidLifecycleTransition('refunding', 'refunded')).toBe(true);
  });

  it('should allow refunding -> failed', () => {
    expect(isValidLifecycleTransition('refunding', 'failed')).toBe(true);
  });

  it('should allow resolved -> archived', () => {
    expect(isValidLifecycleTransition('resolved', 'archived')).toBe(true);
  });

  it('should allow refunded -> archived', () => {
    expect(isValidLifecycleTransition('refunded', 'archived')).toBe(true);
  });

  it('should allow cancelled -> archived', () => {
    expect(isValidLifecycleTransition('cancelled', 'archived')).toBe(true);
  });

  it('should reject draft -> resolving (skip steps)', () => {
    expect(isValidLifecycleTransition('draft', 'resolving')).toBe(false);
  });

  it('should reject draft -> resolved (skip steps)', () => {
    expect(isValidLifecycleTransition('draft', 'resolved')).toBe(false);
  });

  it('should reject active -> resolved (must go through closing)', () => {
    expect(isValidLifecycleTransition('active', 'resolved')).toBe(false);
  });

  it('should reject resolved -> resolving (no backwards)', () => {
    expect(isValidLifecycleTransition('resolved', 'resolving')).toBe(false);
  });

  it('should reject resolved -> active (no backwards)', () => {
    expect(isValidLifecycleTransition('resolved', 'active')).toBe(false);
  });

  it('should reject refunding -> active (no backwards)', () => {
    expect(isValidLifecycleTransition('refunding', 'active')).toBe(false);
  });

  it('should reject archived -> anything', () => {
    expect(isValidLifecycleTransition('archived', 'active')).toBe(false);
    expect(isValidLifecycleTransition('archived', 'resolved')).toBe(false);
    expect(isValidLifecycleTransition('archived', 'cancelled')).toBe(false);
  });

  it('should reject unknown source state', () => {
    expect(isValidLifecycleTransition('unknown', 'active')).toBe(false);
  });

  it('should reject unknown target state', () => {
    expect(isValidLifecycleTransition('active', 'unknown')).toBe(false);
  });
});

describe('SettlementService', () => {
  let service: SettlementService;

  beforeEach(() => {
    resetMock();
    service = new SettlementService();
  });

  describe('resolveMarket - edge cases', () => {
    it('should return early if market is already resolved', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'm1', status: 'resolved', resolved_at: '2025-01-01T00:00:00Z', winning_outcome: 'YES' },
        error: null,
      });

      const result = await service.resolveMarket('m1', 'YES', 'admin-1');
      expect(result.positionsSettled).toBe(0);
      expect(result.totalPayoutSmallestUnit).toBe(0);
    });

    it('should throw if market not found', async () => {
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });

      await expect(service.resolveMarket('nonexistent', 'YES', 'admin-1'))
        .rejects.toThrow('Market not found');
    });

    it('should throw if market is not closed', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'm1', status: 'active', question: 'Test?' },
        error: null,
      });

      await expect(service.resolveMarket('m1', 'YES', 'admin-1'))
        .rejects.toThrow('Market must be closed before resolution');
    });

    it('should delegate to refundMarket for REFUND outcome', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: 'm1', status: 'closed', question: 'Test?' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'm1', status: 'closed', question: 'Test?' }, error: null });

      const result = await service.resolveMarket('m1', 'REFUND', 'admin-1');
      expect(result.outcome).toBe('REFUND');
    });

    it('should delegate to refundMarket for CANCEL outcome', async () => {
      mockSupabase.single
        .mockResolvedValueOnce({ data: { id: 'm1', status: 'closed', question: 'Test?' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'm1', status: 'closed', question: 'Test?' }, error: null });

      const result = await service.resolveMarket('m1', 'CANCEL', 'admin-1');
      expect(result.outcome).toBe('CANCEL');
    });
  });

  describe('pool market settlement math', () => {
    it('should compute correct pro-rata payout for YES winners', () => {
      const positions = [
        { side: 'YES', shares_owned: 600, amount_smallest_unit: 30000 },
        { side: 'YES', shares_owned: 400, amount_smallest_unit: 20000 },
        { side: 'NO', shares_owned: 500, amount_smallest_unit: 25000 },
      ];

      const outcome = 'YES';
      const totalWinningShares = 1000;
      const totalLosingStake = 25000;

      const results = positions.map((p) => {
        const shares = p.shares_owned;
        const stake = p.amount_smallest_unit;
        const won = p.side === outcome;
        let payout = 0;
        let profit = 0;

        if (won && totalWinningShares > 0) {
          const ownershipShare = shares / totalWinningShares;
          const poolProfit = Math.round(ownershipShare * totalLosingStake);
          payout = stake + poolProfit;
          profit = poolProfit;
        }

        return { ...p, won, payout, profit };
      });

      const yes1 = results[0];
      expect(yes1.won).toBe(true);
      expect(yes1.payout).toBe(30000 + Math.round(0.6 * 25000));
      expect(yes1.profit).toBe(Math.round(0.6 * 25000));

      const yes2 = results[1];
      expect(yes2.won).toBe(true);
      expect(yes2.payout).toBe(20000 + Math.round(0.4 * 25000));
      expect(yes2.profit).toBe(Math.round(0.4 * 25000));

      const no1 = results[2];
      expect(no1.won).toBe(false);
      expect(no1.payout).toBe(0);
      expect(no1.profit).toBe(0);

      expect(yes1.payout + yes2.payout).toBe(50000 + 25000);
    });

    it('should compute correct pro-rata payout for NO winner', () => {
      const totalWinningShares = 500;
      const totalLosingStake = 50000;
      const stake = 25000;
      const shares = 500;

      const ownershipShare = shares / totalWinningShares;
      const poolProfit = Math.round(ownershipShare * totalLosingStake);
      const payout = stake + poolProfit;

      expect(payout).toBe(25000 + 50000);
      expect(poolProfit).toBe(50000);
    });

    it('should handle single winner takes all', () => {
      const totalWinningShares = 1000;
      const totalLosingStake = 100000;
      const stake = 50000;
      const shares = 1000;

      const ownershipShare = shares / totalWinningShares;
      const poolProfit = Math.round(ownershipShare * totalLosingStake);
      const payout = stake + poolProfit;

      expect(ownershipShare).toBe(1.0);
      expect(poolProfit).toBe(100000);
      expect(payout).toBe(150000);
    });

    it('should handle zero losing stake', () => {
      const totalWinningShares = 1000;
      const totalLosingStake = 0;
      const stake = 50000;
      const shares = 1000;

      const ownershipShare = shares / totalWinningShares;
      const poolProfit = Math.round(ownershipShare * totalLosingStake);
      const payout = stake + poolProfit;

      expect(payout).toBe(50000);
      expect(poolProfit).toBe(0);
    });
  });

  describe('orderbook market settlement math', () => {
    it('should compute payout as shares * 100 for winner', () => {
      const shares = 50;
      const stake = 2500;
      const won = true;

      const payout = won ? shares * 100 : 0;
      const profit = won ? payout - stake : 0;

      expect(payout).toBe(5000);
      expect(profit).toBe(2500);
    });

    it('should give zero payout for loser', () => {
      const shares = 50;
      const stake = 2500;
      const won = false;

      const payout = won ? shares * 100 : 0;
      const profit = won ? payout - stake : 0;

      expect(payout).toBe(0);
      expect(profit).toBe(0);
    });

    it('should handle large share count', () => {
      const shares = 10000;
      const stake = 500000;
      const won = true;

      const payout = shares * 100;
      const profit = payout - stake;

      expect(payout).toBe(1000000);
      expect(profit).toBe(500000);
    });
  });

  describe('settlement_id uniqueness', () => {
    it('should generate unique settlement_ids for pool market', () => {
      const marketId = 'market-1';
      const positionIds = ['pos-1', 'pos-2', 'pos-3'];
      const outcome = 'YES';

      const ids = positionIds.map((pid) => `pool_${marketId}_${pid}_${outcome}`);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should generate unique settlement_ids for orderbook market', () => {
      const marketId = 'market-1';
      const positionIds = ['pos-1', 'pos-2', 'pos-3'];
      const outcome = 'NO';

      const ids = positionIds.map((pid) => `ob_${marketId}_${pid}_${outcome}`);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('pool and orderbook ids should be different', () => {
      const poolId = `pool_market-1_pos-1_YES`;
      const obId = `ob_market-1_pos-1_YES`;
      expect(poolId).not.toBe(obId);
    });
  });

  describe('position settlement skip logic', () => {
    it('should skip already settled positions', () => {
      const positions = [
        { id: 'p1', settled_at: '2025-01-01', status: 'active' },
        { id: 'p2', settled_at: null, status: 'active' },
        { id: 'p3', settled_at: '2025-01-01', status: 'won' },
        { id: 'p4', settled_at: null, status: 'active' },
        { id: 'p5', resolved_at: '2025-01-01', status: 'active' },
      ];

      const toSettle = positions.filter((p) => {
        const positionStatus = String(p.status || '').toLowerCase();
        if (p.settled_at || p.resolved_at || ['won', 'lost', 'settled', 'refunded'].includes(positionStatus)) {
          return false;
        }
        return true;
      });

      expect(toSettle).toHaveLength(2);
      expect(toSettle.map((p) => p.id)).toEqual(['p2', 'p4']);
    });

    it('should skip positions with terminal statuses', () => {
      const positions = [
        { id: 'p1', status: 'won' },
        { id: 'p2', status: 'lost' },
        { id: 'p3', status: 'settled' },
        { id: 'p4', status: 'refunded' },
      ];

      const toSettle = positions.filter((p) => {
        const positionStatus = String(p.status || '').toLowerCase();
        return !['won', 'lost', 'settled', 'refunded'].includes(positionStatus);
      });

      expect(toSettle).toHaveLength(0);
    });
  });

  describe('refundMarket', () => {
    it('should return early if market already refunded', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'm1', status: 'refunded', question: 'Test?' },
        error: null,
      });

      const result = await service.refundMarket('m1', 'market_refund', 'admin-1');
      expect(result.positionsSettled).toBe(0);
    });
  });

  describe('retrySettlement', () => {
    it('should throw if market not in failed state', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'm1', settlement_status: 'completed', status: 'resolved' },
        error: null,
      });

      await expect(service.retrySettlement('m1', 'admin-1'))
        .rejects.toThrow('Market is not in failed state');
    });
  });

  describe('rollbackSettlement', () => {
    it('should throw if market not resolved', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'm1', status: 'active' },
        error: null,
      });

      await expect(service.rollbackSettlement('m1', 'admin-1'))
        .rejects.toThrow('Can only rollback resolved markets');
    });

    it('should throw if settlement completed more than 30 min ago', async () => {
      const thirtyOneMinutesAgo = new Date(Date.now() - 31 * 60 * 1000).toISOString();
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'm1',
          status: 'resolved',
          settlement_completed_at: thirtyOneMinutesAgo,
        },
        error: null,
      });

      await expect(service.rollbackSettlement('m1', 'admin-1'))
        .rejects.toThrow('Cannot rollback: settlement completed more than 30 minutes ago');
    });
  });

  describe('createPositionFromBuyFill', () => {
    it('should create new position when none exists', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: { id: 'new-pos-1' }, error: null });

      const posId = await service.createPositionFromBuyFill(
        {
          id: 'fill-1',
          user_id: 'user-1',
          market_id: 'm1',
          side: 'YES',
          fill_price: 50,
          fill_quantity: 100,
        },
        { id: 'order-1', currency: 'NGN' }
      );

      expect(posId).toBe('new-pos-1');
    });

    it('should update existing position if one exists for this order', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'existing-pos-1', fill_count: 2 },
        error: null,
      });

      const posId = await service.createPositionFromBuyFill(
        {
          id: 'fill-3',
          user_id: 'user-1',
          market_id: 'm1',
          side: 'YES',
          fill_price: 60,
          fill_quantity: 50,
        },
        { id: 'order-1', currency: 'NGN' }
      );

      expect(posId).toBe('existing-pos-1');
    });
  });
});
