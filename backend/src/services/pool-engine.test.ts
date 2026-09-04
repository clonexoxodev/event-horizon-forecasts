import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  calculateOwnershipTrade,
  getOwnershipState,
  getStartingPrices,
  getActivationState,
  DEFAULT_ACTIVATION_REQUIREMENTS,
  settleMarkets,
  SettlementPositionInput,
  PredictionSide,
} from './pool-engine.js';

const position = (
  side: PredictionSide,
  amountSmallestUnit: number,
  shares: number,
  id = `${side}-${amountSmallestUnit}-${shares}`
): SettlementPositionInput => ({
  id,
  side,
  amount_smallest_unit: amountSmallestUnit,
  shares_owned: shares,
  price_at_purchase: 50,
});

describe('pool-engine pricing', () => {
  it('seeds a fresh market at 50/50', () => {
    const prices = getStartingPrices({});
    expect(prices.yesPrice).toBe(50);
    expect(prices.noPrice).toBe(50);
  });

  it('clamps starting prices to the 1–99 band', () => {
    expect(getStartingPrices({ starting_yes_price: 120 }).yesPrice).toBe(99);
    expect(getStartingPrices({ starting_yes_price: -10 }).yesPrice).toBe(1);
    expect(getStartingPrices({ starting_yes_price: 65 }).yesPrice).toBe(65);
  });

  it('pushes YES probability up as YES pool grows relative to NO', () => {
    const before = getOwnershipState({ yes_volume_smallest_unit: 0, no_volume_smallest_unit: 0 });
    expect(before.yesPrice).toBe(50);
    const dominantYes = getOwnershipState({ yes_volume_smallest_unit: 4000, no_volume_smallest_unit: 1000 });
    expect(dominantYes.yesPrice).toBeGreaterThan(50);
    const dominantNo = getOwnershipState({ yes_volume_smallest_unit: 1000, no_volume_smallest_unit: 4000 });
    expect(dominantNo.yesPrice).toBeLessThan(50);
  });

  it('computes ownership trade after adding a YES position', () => {
    const trade = calculateOwnershipTrade({ starting_yes_price: 50 }, 'YES', 10000);
    expect(trade.entryPrice).toBe(50);
    expect(trade.sharesOwned).toBeCloseTo(2, 5);
    expect(trade.currentPrice).toBeGreaterThan(50);
    expect(trade.positionValueSmallestUnit).toBeGreaterThan(10000);
    expect(trade.ownershipPercent).toBe(100);
    expect(trade.nextYesVolume).toBe(10000);
    expect(trade.nextTotalVolume).toBe(10000);
  });
});

describe('pool-engine activation', () => {
  it('treats an empty protected market as inactive below default thresholds', () => {
    const state = getActivationState({});
    expect(state.activated).toBe(false);
    expect(state.requirements).toEqual(DEFAULT_ACTIVATION_REQUIREMENTS);
  });

  it('activates when both sides and participants pass the thresholds', () => {
    const state = getActivationState({
      yes_volume_smallest_unit: 400000,
      no_volume_smallest_unit: 400000,
      total_volume_smallest_unit: 1100000,
      participant_count: 6,
    });
    expect(state.activated).toBe(true);
  });

  it('stays inactive when one side is under its minimum', () => {
    const state = getActivationState({
      yes_volume_smallest_unit: 300000,
      no_volume_smallest_unit: 50000,
      total_volume_smallest_unit: 350000,
      participant_count: 6,
    });
    expect(state.activated).toBe(false);
  });

  it('respects per-market activation overrides', () => {
    const state = getActivationState({
      activation_threshold_smallest_unit: 500,
      activation_yes_min_smallest_unit: 100,
      activation_no_min_smallest_unit: 100,
      activation_min_participants: 2,
      yes_volume_smallest_unit: 400,
      no_volume_smallest_unit: 400,
      total_volume_smallest_unit: 800,
      participant_count: 2,
    });
    expect(state.activated).toBe(true);
  });

  it('always reports protected markets with protection disabled as live', () => {
    const state = getActivationState({ protected_market_enabled: false, yes_volume_smallest_unit: 0, no_volume_smallest_unit: 0 });
    expect(state.activated).toBe(true);
  });
});

describe('pool-engine settlement', () => {
  it('pays winners stake + pro-rata losing pool; losers get nothing', () => {
    const result = settleMarkets(
      [
        position('YES', 5000, 10, 'a'),
        position('YES', 5000, 5, 'b'),
        position('NO', 10000, 20, 'c'),
      ],
      'YES'
    );
    expect(result.rule).toBe('NORMAL');
    expect(result.totalPayoutSmallestUnit).toBe(20000);
    const a = result.positions.find((p) => p.id === 'a')!;
    const b = result.positions.find((p) => p.id === 'b')!;
    const c = result.positions.find((p) => p.id === 'c')!;
    // Winners share the 10000 losing pool by ownership (2/3 and 1/3).
    expect(a.payoutSmallestUnit).toBe(5000 + Math.round((10 / 15) * 10000));
    expect(b.payoutSmallestUnit).toBe(5000 + Math.round((5 / 15) * 10000));
    expect(a.profitSmallestUnit + b.profitSmallestUnit).toBe(10000);
    expect(c.payoutSmallestUnit).toBe(0);
    expect(c.profitSmallestUnit).toBe(-10000);
    // Conservation: nothing leaves the pool beyond the (zero) fee & reward.
    expect(result.platformFeeSmallestUnit).toBe(0);
    expect(result.creatorRewardSmallestUnit).toBe(0);
  });

  it('refunds everyone when there is no opposing pool (all YES)', () => {
    const result = settleMarkets(
      [position('YES', 1000, 10, 'a'), position('YES', 2500, 5, 'b')],
      'YES'
    );
    expect(result.rule).toBe('REFUND');
    expect(result.totalPayoutSmallestUnit).toBe(3500);
    for (const p of result.positions) {
      expect(p.payoutSmallestUnit).toBe(p.stakeSmallestUnit);
      expect(p.profitSmallestUnit).toBe(0);
    }
    expect(result.platformFeeSmallestUnit).toBe(0);
  });

  it('refunds a single participant market', () => {
    const result = settleMarkets([position('NO', 7500, 15, 'solo')], 'NO');
    expect(result.rule).toBe('REFUND');
    expect(result.positions[0].payoutSmallestUnit).toBe(7500);
    expect(result.positions[0].profitSmallestUnit).toBe(0);
    expect(result.totalPayoutSmallestUnit).toBe(7500);
  });

  it('never lets payouts exceed the pool when winners are unscorable', () => {
    const result = settleMarkets(
      [
        { id: 'a', side: 'YES', amount_smallest_unit: 5000 },
        { id: 'b', side: 'NO', amount_smallest_unit: 5000 },
      ],
      'YES'
    );
    // No stored shares and no entry price -> unscorable -> safe refund for all.
    expect(result.rule).toBe('REFUND');
    expect(result.totalPayoutSmallestUnit).toBe(10000);
  });

  it('returns an empty result for a market with no positions', () => {
    const result = settleMarkets([], 'YES');
    expect(result.rule).toBe('EMPTY');
    expect(result.totalPayoutSmallestUnit).toBe(0);
    expect(result.positions).toEqual([]);
  });

  it('is deterministic across repeated runs (pure settlement)', () => {
    const input = [position('YES', 5000, 10, 'a'), position('NO', 4000, 8, 'b')];
    const first = settleMarkets(input, 'YES');
    const second = settleMarkets(input, 'YES');
    expect(first).toEqual(second);
  });
});

describe('pool-engine fee & creator reward', () => {
  it('withholds platform fee and creator reward from the losing pool', () => {
    const result = settleMarkets(
      [
        position('YES', 5000, 10, 'a'),
        position('YES', 5000, 5, 'b'),
        position('NO', 10000, 20, 'c'),
      ],
      'YES',
      { platformFeeBps: 200, creatorRewardBps: 100 }
    );
    // 2% + 1% of the 10000 losing pool.
    expect(result.platformFeeSmallestUnit).toBe(200);
    expect(result.creatorRewardSmallestUnit).toBe(100);
    expect(result.totalPayoutSmallestUnit).toBe(20000 - 300);
  });

  it('keeps the book perfectly balanced when fees apply', () => {
    const result = settleMarkets(
      [
        position('YES', 5000, 10, 'a'),
        position('YES', 5000, 5, 'b'),
        position('NO', 10000, 20, 'c'),
      ],
      'YES',
      { platformFeeBps: 200, creatorRewardBps: 100 }
    );
    const total = result.positions.reduce((sum, p) => sum + p.payoutSmallestUnit, 0);
    expect(total + result.platformFeeSmallestUnit + result.creatorRewardSmallestUnit).toBe(20000);
  });
});

describe('pool-engine conservation property', () => {
  it('never distributes more than the pool minus fees, for any market', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({
          side: fc.constantFrom('YES', 'NO'),
          amount: fc.integer({ min: 100, max: 200000 }),
          shares: fc.double({ min: 0.01, max: 5000 }),
        }), { minLength: 1, maxLength: 30 }),
        fc.constantFrom('YES', 'NO'),
        fc.integer({ min: 0, max: 2000 }),
        fc.integer({ min: 0, max: 2000 }),
        (rows, outcome, feeBps, rewardBps) => {
          const input: SettlementPositionInput[] = rows.map((row, index) => ({
            id: `p${index}`,
            side: row.side,
            amount_smallest_unit: row.amount,
            shares_owned: row.shares,
          }));
          const result = settleMarkets(input, outcome, { platformFeeBps: feeBps, creatorRewardBps: rewardBps });
          const totalPool = result.totalWinningStakeSmallestUnit + result.totalLosingStakeSmallestUnit;
          const totalPaid = result.positions.reduce((sum, p) => sum + p.payoutSmallestUnit, 0);
          expect(totalPaid + result.platformFeeSmallestUnit + result.creatorRewardSmallestUnit).toBeLessThanOrEqual(totalPool);
          for (const p of result.positions) {
            expect(p.payoutSmallestUnit).toBeGreaterThanOrEqual(0);
            expect(p.profitSmallestUnit).toBe(p.payoutSmallestUnit - p.stakeSmallestUnit);
          }
        }
      ),
      { numRuns: 500 }
    );
  });
});