/**
 * Pool Engine — pure, dependency-free math for pool-based prediction markets.
 *
 * This module is the single source of truth for pricing, ownership shares,
 * trade math, activation (protected-market) rules, and settlement distribution.
 * It performs NO I/O (no Supabase, no Postgres, no fetch); callers own all
 * persistence and idempotency concerns.
 *
 * Financial invariants maintained here:
 *   - Amounts are integer minor units (kobo) throughout.
 *   - Settlement is conservative: total payouts never exceed the total pool
 *     minus configured platform fee and creator reward (overflow-shaved).
 *   - A market with no opposing pool (all YES / all NO / single participant /
 *     unscorable) refunds every stakeholder their full stake (rule: REFUND).
 *   - At default config (fee 0, reward 0) distribution matches the established
 *     pool math exactly: winners recover stake + pro-rata losing-pool profit.
 */

export type PredictionSide = 'YES' | 'NO';

export type SettlementRule = 'NORMAL' | 'REFUND' | 'EMPTY';

export interface SettlementConfig {
  /** Platform fee basis points charged against the losing pool at settle. */
  platformFeeBps: number;
  /** Market creator reward basis points charged against the losing pool. */
  creatorRewardBps: number;
}

export const DEFAULT_SETTLEMENT_CONFIG: SettlementConfig = {
  platformFeeBps: 0,
  creatorRewardBps: 0,
};

export const MIN_MARKET_PRICE = 1;
export const MAX_MARKET_PRICE = 99;

/**
 * Maximum per-side and total pool a market must pass before it is "live"
 * (protected markets stop capping per-user stakes once live). These are
 * defaults only — per-market config overrides them.
 */
export const DEFAULT_ACTIVATION_REQUIREMENTS = {
  totalPoolSmallestUnit: 1000000,
  yesPoolSmallestUnit: 200000,
  noPoolSmallestUnit: 200000,
  minimumParticipants: 5,
  protectedMaxStakeSmallestUnit: 100000,
  buildingMaxStakeSmallestUnit: 100000,
};

export interface MarketLike {
  starting_yes_price?: number | string | null;
  yes_price?: number | string | null;
  yes_volume_smallest_unit?: number | string | null;
  yes_pool_smallest_unit?: number | string | null;
  no_volume_smallest_unit?: number | string | null;
  no_pool_smallest_unit?: number | string | null;
  pool_amount_smallest_unit?: number | string | null;
  total_volume_smallest_unit?: number | string | null;
  total_yes_shares?: number | string | null;
  total_no_shares?: number | string | null;
  participant_count?: number | string | null;
  participants?: number | string | null;
  activation_state?: string | null;
  protected_market_enabled?: boolean | null;
  activation_settings?: Record<string, unknown> | null;
  protection_settings?: Record<string, unknown> | null;
  activation_threshold_smallest_unit?: number | string | null;
  activation_yes_min_smallest_unit?: number | string | null;
  activation_no_min_smallest_unit?: number | string | null;
  activation_min_participants?: number | string | null;
  protected_max_stake_smallest_unit?: number | string | null;
}

export interface Prices {
  yesPrice: number;
  noPrice: number;
}

export interface OwnershipState extends Prices {
  yesVolume: number;
  noVolume: number;
  totalVolume: number;
  yesShares: number;
  noShares: number;
}

export interface OwnershipTrade {
  before: OwnershipState;
  after: OwnershipState;
  entryPrice: number;
  currentPrice: number;
  sharesOwned: number;
  positionValueSmallestUnit: number;
  ownershipPercent: number;
  nextYesVolume: number;
  nextNoVolume: number;
  nextYesShares: number;
  nextNoShares: number;
  nextTotalVolume: number;
  priceChange: number;
}

export interface ActivationRequirements {
  totalPoolSmallestUnit: number;
  yesPoolSmallestUnit: number;
  noPoolSmallestUnit: number;
  minimumParticipants: number;
  protectedMaxStakeSmallestUnit: number;
  buildingMaxStakeSmallestUnit: number;
}

export interface ActivationState {
  activated: boolean;
  yesPool: number;
  noPool: number;
  totalPool: number;
  participants: number;
  requirements: ActivationRequirements;
}

/** Raw position row shape the engine understands for settlement math. */
export interface SettlementPositionInput {
  id?: string | number;
  side?: string | null;
  user_id?: string | null;
  currency?: string | null;
  amount_smallest_unit?: number | string | null;
  stake_amount?: number | string | null;
  price_at_purchase?: number | string | null;
  entry_price?: number | string | null;
  shares_owned?: number | string | null;
  shares_received?: number | string | null;
}

export interface SettledPosition {
  id: string | number | undefined;
  side: string | null | undefined;
  status: 'won' | 'lost';
  stakeSmallestUnit: number;
  priceAtPurchase: number;
  sharesReceived: number;
  ownershipPercent: number;
  payoutSmallestUnit: number;
  profitSmallestUnit: number;
}

export interface SettlementResult {
  rule: SettlementRule;
  totalYesStakeSmallestUnit: number;
  totalNoStakeSmallestUnit: number;
  totalWinningStakeSmallestUnit: number;
  totalLosingStakeSmallestUnit: number;
  totalWinningShares: number;
  totalWinners: number;
  totalLosers: number;
  platformFeeSmallestUnit: number;
  creatorRewardSmallestUnit: number;
  totalPayoutSmallestUnit: number;
  positions: SettledPosition[];
}

export const toAmount = (smallestUnit: number | null | undefined): number =>
  Number(smallestUnit || 0) / 100;

export const roundPrice = (value: number): number => Math.round(value * 10) / 10;

export const clampPrice = (value: number): number =>
  Math.min(MAX_MARKET_PRICE, Math.max(MIN_MARKET_PRICE, roundPrice(value)));

export const getStartingPrices = (market: MarketLike): Prices => {
  const yesPrice = clampPrice(Number(market.starting_yes_price ?? market.yes_price ?? 50));
  return { yesPrice, noPrice: roundPrice(100 - yesPrice) };
};

export const getOwnershipState = (market: MarketLike): OwnershipState => {
  const starting = getStartingPrices(market);
  const yesVolume = Number(market.yes_volume_smallest_unit ?? market.yes_pool_smallest_unit ?? 0);
  const noVolume = Number(market.no_volume_smallest_unit ?? market.no_pool_smallest_unit ?? 0);
  const totalVolume = yesVolume + noVolume;
  const yesShares = Number(market.total_yes_shares ?? 0);
  const noShares = Number(market.total_no_shares ?? 0);

  if (totalVolume <= 0) {
    return { yesPrice: starting.yesPrice, noPrice: starting.noPrice, yesVolume, noVolume, totalVolume, yesShares, noShares };
  }

  const activityTargetYes = (yesVolume / totalVolume) * 100;
  const activityWeight = Math.min(0.95, totalVolume / (totalVolume + 500000));
  const yesPrice = clampPrice((starting.yesPrice * (1 - activityWeight)) + (activityTargetYes * activityWeight));
  return { yesPrice, noPrice: roundPrice(100 - yesPrice), yesVolume, noVolume, totalVolume, yesShares, noShares };
};

export const calculateOwnershipTrade = (
  market: MarketLike,
  side: PredictionSide,
  amountSmallestUnit: number
): OwnershipTrade => {
  const before = getOwnershipState(market);
  const entryPrice = side === 'YES' ? before.yesPrice : before.noPrice;
  const sharesOwned = entryPrice > 0 ? toAmount(amountSmallestUnit) / entryPrice : 0;
  const nextYesVolume = side === 'YES' ? before.yesVolume + amountSmallestUnit : before.yesVolume;
  const nextNoVolume = side === 'NO' ? before.noVolume + amountSmallestUnit : before.noVolume;
  const nextYesShares = side === 'YES' ? before.yesShares + sharesOwned : before.yesShares;
  const nextNoShares = side === 'NO' ? before.noShares + sharesOwned : before.noShares;
  const after = getOwnershipState({
    ...market,
    yes_volume_smallest_unit: nextYesVolume,
    no_volume_smallest_unit: nextNoVolume,
    yes_pool_smallest_unit: nextYesVolume,
    no_pool_smallest_unit: nextNoVolume,
    total_yes_shares: nextYesShares,
    total_no_shares: nextNoShares,
  });
  const currentPrice = side === 'YES' ? after.yesPrice : after.noPrice;
  const positionValueSmallestUnit = Math.round(sharesOwned * currentPrice * 100);
  const sideSharesAfter = side === 'YES' ? nextYesShares : nextNoShares;
  return {
    before,
    after,
    entryPrice,
    currentPrice,
    sharesOwned,
    positionValueSmallestUnit,
    ownershipPercent: sideSharesAfter > 0 ? (sharesOwned / sideSharesAfter) * 100 : 0,
    nextYesVolume,
    nextNoVolume,
    nextYesShares,
    nextNoShares,
    nextTotalVolume: nextYesVolume + nextNoVolume,
    priceChange: currentPrice - entryPrice,
  };
};

export const getActivationRequirements = (market: MarketLike): ActivationRequirements => {
  const settings = (market.activation_settings || market.protection_settings || {}) as Record<string, any>;
  return {
    totalPoolSmallestUnit: Number(market.activation_threshold_smallest_unit ?? settings.totalPoolSmallestUnit ?? DEFAULT_ACTIVATION_REQUIREMENTS.totalPoolSmallestUnit),
    yesPoolSmallestUnit: Number(market.activation_yes_min_smallest_unit ?? settings.yesPoolSmallestUnit ?? DEFAULT_ACTIVATION_REQUIREMENTS.yesPoolSmallestUnit),
    noPoolSmallestUnit: Number(market.activation_no_min_smallest_unit ?? settings.noPoolSmallestUnit ?? DEFAULT_ACTIVATION_REQUIREMENTS.noPoolSmallestUnit),
    minimumParticipants: Number(market.activation_min_participants ?? settings.minimumParticipants ?? DEFAULT_ACTIVATION_REQUIREMENTS.minimumParticipants),
    protectedMaxStakeSmallestUnit: Number(market.protected_max_stake_smallest_unit ?? settings.protectedMaxStakeSmallestUnit ?? settings.buildingMaxStakeSmallestUnit ?? DEFAULT_ACTIVATION_REQUIREMENTS.protectedMaxStakeSmallestUnit),
    buildingMaxStakeSmallestUnit: Number(market.protected_max_stake_smallest_unit ?? settings.protectedMaxStakeSmallestUnit ?? settings.buildingMaxStakeSmallestUnit ?? DEFAULT_ACTIVATION_REQUIREMENTS.buildingMaxStakeSmallestUnit),
  };
};

export const getActivationState = (market: MarketLike): ActivationState => {
  const yesPool = Number(market.yes_volume_smallest_unit ?? market.yes_pool_smallest_unit ?? 0);
  const noPool = Number(market.no_volume_smallest_unit ?? market.no_pool_smallest_unit ?? 0);
  const totalPool = Number(market.total_volume_smallest_unit ?? market.pool_amount_smallest_unit ?? yesPool + noPool);
  const participants = Number(market.participant_count ?? market.participants ?? 0);

  if (market.protected_market_enabled === false) {
    return {
      activated: true,
      yesPool,
      noPool,
      totalPool,
      participants,
      requirements: DEFAULT_ACTIVATION_REQUIREMENTS,
    };
  }

  const requirements = getActivationRequirements(market);
  const activated =
    totalPool >= requirements.totalPoolSmallestUnit &&
    yesPool >= requirements.yesPoolSmallestUnit &&
    noPool >= requirements.noPoolSmallestUnit &&
    participants >= requirements.minimumParticipants;
  return { activated, yesPool, noPool, totalPool, participants, requirements };
};

const normalizeSide = (side: string | null | undefined): PredictionSide | null => {
  const value = String(side || '').toUpperCase();
  if (value === 'YES' || value === 'UP') return 'YES';
  if (value === 'NO' || value === 'DOWN') return 'NO';
  return null;
};

const stakeSmallestUnit = (position: SettlementPositionInput): number =>
  Number(position.amount_smallest_unit ?? Math.round(Number(position.stake_amount || 0) * 100) ?? 0);

const sharesReceived = (position: SettlementPositionInput): number => {
  const stake = stakeSmallestUnit(position);
  const entryPrice = Number(position.price_at_purchase ?? position.entry_price ?? 0);
  const stored = Number(position.shares_owned ?? position.shares_received ?? 0);
  return stored > 0 ? stored : entryPrice > 0 ? toAmount(stake) / entryPrice : 0;
};

/**
 * Compute the conservative settlement for a pool market.
 *
 * rule === 'REFUND'  : no opposing pool (or unscorable) — every stakeholder
 *                      receives their full stake back; nothing is charged.
 * rule === 'EMPTY'   : no positions — nothing to distribute.
 * rule === 'NORMAL'  : winners recover their stake plus a pro-rata share of
 *                      the losing pool, after the configured platform fee and
 *                      creator reward are withheld.
 *
 * The returned creatorRewardSmallestUnit is owed to market.created_by (if any);
 * platformFeeSmallestUnit is owed to the platform. The caller credits them.
 */
export const settleMarkets = (
  positions: SettlementPositionInput[],
  outcome: PredictionSide,
  config?: Partial<SettlementConfig>
): SettlementResult => {
  const cfg: SettlementConfig = { ...DEFAULT_SETTLEMENT_CONFIG, ...(config || {}) };
  const winningPositions = positions.filter((position) => normalizeSide(position.side) === outcome);
  const losingPositions = positions.filter((position) => normalizeSide(position.side) !== outcome);

  const totalWinningShares = winningPositions.reduce(
    (sum: number, position: SettlementPositionInput) => sum + sharesReceived(position),
    0
  );
  const totalWinningStake = winningPositions.reduce(
    (sum: number, position: SettlementPositionInput) => sum + stakeSmallestUnit(position),
    0
  );
  const totalLosingStake = losingPositions.reduce(
    (sum: number, position: SettlementPositionInput) => sum + stakeSmallestUnit(position),
    0
  );
  const totalYesStake = positions
    .filter((position) => normalizeSide(position.side) === 'YES')
    .reduce((sum: number, position: SettlementPositionInput) => sum + stakeSmallestUnit(position), 0);
  const totalNoStake = positions
    .filter((position) => normalizeSide(position.side) === 'NO')
    .reduce((sum: number, position: SettlementPositionInput) => sum + stakeSmallestUnit(position), 0);

  if (positions.length === 0) {
    return {
      rule: 'EMPTY',
      totalYesStakeSmallestUnit: 0,
      totalNoStakeSmallestUnit: 0,
      totalWinningStakeSmallestUnit: 0,
      totalLosingStakeSmallestUnit: 0,
      totalWinningShares: 0,
      totalWinners: 0,
      totalLosers: 0,
      platformFeeSmallestUnit: 0,
      creatorRewardSmallestUnit: 0,
      totalPayoutSmallestUnit: 0,
      positions: [],
    };
  }

  const refundAll = totalWinningStake > 0 && totalLosingStake <= 0 || totalWinningShares <= 0;
  const rule: SettlementRule = refundAll ? 'REFUND' : 'NORMAL';

  if (rule === 'REFUND') {
    const positionsResult: SettledPosition[] = winningPositions.map((position) => {
      const stake = stakeSmallestUnit(position);
      return {
        id: position.id,
        side: position.side,
        status: 'won',
        stakeSmallestUnit: stake,
        priceAtPurchase: Number(position.price_at_purchase ?? position.entry_price ?? 0),
        sharesReceived: sharesReceived(position),
        ownershipPercent: 0,
        payoutSmallestUnit: stake,
        profitSmallestUnit: 0,
      };
    });
    const losingResult: SettledPosition[] = losingPositions.map((position) => {
      const stake = stakeSmallestUnit(position);
      return {
        id: position.id,
        side: position.side,
        status: 'lost',
        stakeSmallestUnit: stake,
        priceAtPurchase: Number(position.price_at_purchase ?? position.entry_price ?? 0),
        sharesReceived: sharesReceived(position),
        ownershipPercent: 0,
        payoutSmallestUnit: stake,
        profitSmallestUnit: 0,
      };
    });
    const allSettled = [...positionsResult, ...losingResult];
    return {
      rule,
      totalYesStakeSmallestUnit: totalYesStake,
      totalNoStakeSmallestUnit: totalNoStake,
      totalWinningStakeSmallestUnit: totalWinningStake,
      totalLosingStakeSmallestUnit: totalLosingStake,
      totalWinningShares,
      totalWinners: winningPositions.length,
      totalLosers: losingPositions.length,
      platformFeeSmallestUnit: 0,
      creatorRewardSmallestUnit: 0,
      totalPayoutSmallestUnit: allSettled.reduce((sum, position) => sum + position.payoutSmallestUnit, 0),
      positions: allSettled,
    };
  }

  const poolProfit = totalLosingStake;
  const platformFeeSmallestUnit = Math.round((poolProfit * cfg.platformFeeBps) / 10000);
  const creatorRewardSmallestUnit = Math.round((poolProfit * cfg.creatorRewardBps) / 10000);
  const distributableProfit = Math.max(0, poolProfit - platformFeeSmallestUnit - creatorRewardSmallestUnit);

  let settledPositions: SettledPosition[] = allPositionsSettled(
    winningPositions,
    losingPositions,
    outcome,
    totalWinningShares,
    distributableProfit
  );

  const totalPool = totalWinningStake + totalLosingStake;
  const maxPayout = Math.max(0, totalPool - platformFeeSmallestUnit - creatorRewardSmallestUnit);
  let payoutOverflow =
    settledPositions.reduce((sum: number, position: SettledPosition) => sum + position.payoutSmallestUnit, 0) -
    maxPayout;

  if (payoutOverflow > 0) {
    settledPositions = settledPositions.map((position: SettledPosition) => {
      if (payoutOverflow <= 0 || position.payoutSmallestUnit <= 0) return position;
      const reduction = Math.min(payoutOverflow, position.payoutSmallestUnit);
      payoutOverflow -= reduction;
      const payoutSmallestUnit = position.payoutSmallestUnit - reduction;
      const profitSmallestUnit = payoutSmallestUnit - position.stakeSmallestUnit;
      return {
        ...position,
        payoutSmallestUnit,
        profitSmallestUnit,
      };
    });
  }

  const totalPayoutSmallestUnit = settledPositions.reduce((sum, position) => sum + position.payoutSmallestUnit, 0);

  return {
    rule,
    totalYesStakeSmallestUnit: totalYesStake,
    totalNoStakeSmallestUnit: totalNoStake,
    totalWinningStakeSmallestUnit: totalWinningStake,
    totalLosingStakeSmallestUnit: totalLosingStake,
    totalWinningShares,
    totalWinners: winningPositions.length,
    totalLosers: losingPositions.length,
    platformFeeSmallestUnit,
    creatorRewardSmallestUnit,
    totalPayoutSmallestUnit,
    positions: settledPositions,
  };
};

const allPositionsSettled = (
  winningPositions: SettlementPositionInput[],
  losingPositions: SettlementPositionInput[],
  _outcome: PredictionSide,
  totalWinningShares: number,
  distributableProfit: number
): SettledPosition[] => {
  const winners: SettledPosition[] = winningPositions.map((position) => {
    const stake = stakeSmallestUnit(position);
    const ownershipShare = totalWinningShares > 0 ? sharesReceived(position) / totalWinningShares : 0;
    const poolProfitSmallestUnit = Math.round(ownershipShare * distributableProfit);
    const payoutSmallestUnit = stake + poolProfitSmallestUnit;
    return {
      id: position.id,
      side: position.side,
      status: 'won',
      stakeSmallestUnit: stake,
      priceAtPurchase: Number(position.price_at_purchase ?? position.entry_price ?? 0),
      sharesReceived: sharesReceived(position),
      ownershipPercent: ownershipShare * 100,
      payoutSmallestUnit,
      profitSmallestUnit: payoutSmallestUnit - stake,
    };
  });
  const losers: SettledPosition[] = losingPositions.map((position) => {
    const stake = stakeSmallestUnit(position);
    return {
      id: position.id,
      side: position.side,
      status: 'lost',
      stakeSmallestUnit: stake,
      priceAtPurchase: Number(position.price_at_purchase ?? position.entry_price ?? 0),
      sharesReceived: sharesReceived(position),
      ownershipPercent: 0,
      payoutSmallestUnit: 0,
      profitSmallestUnit: -stake,
    };
  });
  return [...winners, ...losers].sort((a, b) => (a.status === b.status ? 0 : a.status === 'won' ? -1 : 1));
};