import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import { AdminMarketRepository } from '../repositories/admin-market.repository.js';
import { AuditTrailRepository } from '../repositories/audit-trail.repository.js';
import { supabase } from '../db/supabase-client.js';
import {
  MarketCreateSchema,
  MarketUpdateSchema,
  StatusChangeSchema,
  BulkActionSchema,
  MarketFiltersSchema,
  isValidTransition,
  normalizeMarketCategory,
  validateEditableFields,
} from '../validation/market.validation.js';

const router = Router();
const marketRepo = new AdminMarketRepository();
const auditRepo = new AuditTrailRepository();

const stripNotificationMetadata = (payload: Record<string, any> | Record<string, any>[]) => {
  if (Array.isArray(payload)) {
    return payload.map(({ metadata: _metadata, ...item }) => item);
  }
  const { metadata: _metadata, ...fallbackPayload } = payload;
  return fallbackPayload;
};

const insertNotificationSafely = async (payload: Record<string, any> | Record<string, any>[], label = 'Notification') => {
  const { error } = await supabase.from('notifications').insert(payload);
  if (!error) return;

  if (/metadata/i.test(error.message || '')) {
    const retry = await supabase.from('notifications').insert(stripNotificationMetadata(payload));
    if (!retry.error) return;
    console.warn(`${label} not saved:`, retry.error.message);
    return;
  }

  console.warn(`${label} not saved:`, error.message);
};

const notifyUsersForNewMarket = async (market: any, adminUserId: string) => {
  if (market.status !== 'active' || !market.category) return;
  const category = normalizeMarketCategory(market.category);
  const matchingCategories = category === 'Economy' ? ['Economy', 'Finance', 'finance'] : [category];

  const { data: priorPositions, error } = await supabase
    .from('positions')
    .select('user_id, markets!inner(category)')
    .in('markets.category', matchingCategories);

  if (error) {
    console.warn('New-market notifications skipped:', error.message);
    return;
  }

  const userIds = Array.from(new Set((priorPositions || [])
    .map((position: any) => position.user_id)
    .filter((userId: string) => userId && userId !== adminUserId)));

  if (!userIds.length) return;

  await insertNotificationSafely(userIds.map((userId) => ({
      user_id: userId,
      type: 'new_market_available',
      title: `New ${category} market`,
      message: market.question,
      reference_id: market.id,
      reference_type: 'market',
      metadata: {
        marketId: market.id,
        marketQuestion: market.question,
        category
      }
    })), 'New-market notifications');
};

const notifyMarketResolution = async (market: any, outcome?: string) => {
  const { data: positions, error } = await supabase
    .from('positions')
    .select('user_id')
    .eq('market_id', market.id);

  if (error) {
    console.warn('Market resolution notifications skipped:', error.message);
    return;
  }

  const userIds = Array.from(new Set((positions || []).map((position: any) => position.user_id).filter(Boolean)));
  if (!userIds.length) return;

  await insertNotificationSafely(userIds.map((userId) => ({
      user_id: userId,
      type: 'market_resolved',
      title: 'Market resolved',
      message: `${market.question} resolved as ${outcome || market.outcome || 'final'}.`,
      reference_id: market.id,
      reference_type: 'market',
      metadata: {
        marketId: market.id,
        marketQuestion: market.question,
        outcome: outcome || market.outcome || null
      }
    })), 'Market resolution notifications');
};

const toAmount = (smallestUnit: number | null | undefined) => Number(smallestUnit || 0) / 100;

const notifyUser = async (userId: string, notification: Record<string, any>) => {
  await insertNotificationSafely({
    user_id: userId,
    ...notification
  });
};

const loadMarketPositions = async (marketId: string) => {
  const { data: positions, error } = await supabase
    .from('positions')
    .select('*')
    .eq('market_id', marketId);

  if (error) throw new Error(`Failed to load positions: ${error.message}`);
  return positions || [];
};

const ownershipSettlementForPosition = (position: any, outcome: 'YES' | 'NO', totalWinningShares: number, totalLosingStakeSmallestUnit: number) => {
  const stakeSmallestUnit = Number(position.amount_smallest_unit || Math.round(Number(position.stake_amount || 0) * 100) || 0);
  const won = position.side === outcome;
  const priceAtPurchase = Number(position.price_at_purchase || position.entry_price || 0);
  const storedShares = Number(position.shares_owned || position.shares_received || 0);
  const sharesReceived = storedShares > 0
    ? storedShares
    : priceAtPurchase > 0
      ? toAmount(stakeSmallestUnit) / priceAtPurchase
      : 0;
  // Pool-safe settlement: price is sentiment/entry math. Winners recover stake
  // plus pro-rata losing-pool profit, so payouts stay inside locked stakes.
  const ownershipShare = won && totalWinningShares > 0 ? sharesReceived / totalWinningShares : 0;
  const poolProfitSmallestUnit = Math.max(0, Math.round(ownershipShare * totalLosingStakeSmallestUnit));
  const payoutSmallestUnit = won ? stakeSmallestUnit + poolProfitSmallestUnit : 0;
  const profitSmallestUnit = won ? payoutSmallestUnit - stakeSmallestUnit : -stakeSmallestUnit;

  return {
    won,
    stakeSmallestUnit,
    priceAtPurchase,
    sharesReceived,
    ownershipShare,
    payoutSmallestUnit,
    profitSmallestUnit
  };
};

const buildSettlementPreview = (market: any, outcome: 'YES' | 'NO', positions: any[]) => {
  const yesPositions = positions.filter((position) => position.side === 'YES');
  const noPositions = positions.filter((position) => position.side === 'NO');
  const winners = positions.filter((position) => position.side === outcome);
  const losers = positions.filter((position) => position.side !== outcome);
  const totalWinningStakeSmallestUnit = winners.reduce((sum, position) => sum + Number(position.amount_smallest_unit || Math.round(Number(position.stake_amount || 0) * 100) || 0), 0);
  const totalLosingStakeSmallestUnit = losers.reduce((sum, position) => sum + Number(position.amount_smallest_unit || Math.round(Number(position.stake_amount || 0) * 100) || 0), 0);
  const totalWinningShares = winners.reduce((sum, position) => {
    const stakeSmallestUnit = Number(position.amount_smallest_unit || Math.round(Number(position.stake_amount || 0) * 100) || 0);
    const entryPrice = Number(position.price_at_purchase || position.entry_price || 0);
    const shares = Number(position.shares_owned || position.shares_received || 0) || (entryPrice > 0 ? toAmount(stakeSmallestUnit) / entryPrice : 0);
    return sum + shares;
  }, 0);

  let settledPositions = positions.map((position) => {
    const settlement = ownershipSettlementForPosition(position, outcome, totalWinningShares, totalLosingStakeSmallestUnit);

    return {
      id: position.id,
      userId: position.user_id,
      username: position.username || position.user_id,
      side: position.side,
      status: settlement.won ? 'won' : 'lost',
      stakeSmallestUnit: settlement.stakeSmallestUnit,
      priceAtPurchase: settlement.priceAtPurchase,
      sharesReceived: settlement.sharesReceived,
      payoutSmallestUnit: settlement.payoutSmallestUnit,
      profitSmallestUnit: settlement.profitSmallestUnit,
      alreadySettled: Boolean(position.settled_at || position.resolved_at || ['won', 'lost', 'settled'].includes(String(position.status || ''))),
      stake: toAmount(settlement.stakeSmallestUnit),
      price: settlement.priceAtPurchase,
      shares: settlement.sharesReceived,
      ownershipPercent: settlement.ownershipShare * 100,
      payout: toAmount(settlement.payoutSmallestUnit),
      profit: toAmount(settlement.profitSmallestUnit)
    };
  });
  const maxPayoutSmallestUnit = totalWinningStakeSmallestUnit + totalLosingStakeSmallestUnit;
  let payoutOverflow = settledPositions.reduce((sum, position) => sum + position.payoutSmallestUnit, 0) - maxPayoutSmallestUnit;

  if (payoutOverflow > 0) {
    settledPositions = settledPositions.map((position) => {
      if (payoutOverflow <= 0 || position.payoutSmallestUnit <= 0) return position;
      const reduction = Math.min(payoutOverflow, position.payoutSmallestUnit);
      payoutOverflow -= reduction;
      const payoutSmallestUnit = position.payoutSmallestUnit - reduction;
      const profitSmallestUnit = payoutSmallestUnit - position.stakeSmallestUnit;
      return {
        ...position,
        payoutSmallestUnit,
        profitSmallestUnit,
        payout: toAmount(payoutSmallestUnit),
        profit: toAmount(profitSmallestUnit)
      };
    });
  }

  return {
    marketId: market.id,
    marketQuestion: market.question,
    winningOutcome: outcome,
    totalYesStake: toAmount(yesPositions.reduce((sum, position) => sum + Number(position.amount_smallest_unit || 0), 0)),
    totalNoStake: toAmount(noPositions.reduce((sum, position) => sum + Number(position.amount_smallest_unit || 0), 0)),
    totalWinningStake: toAmount(totalWinningStakeSmallestUnit),
    totalLosingStake: toAmount(totalLosingStakeSmallestUnit),
    totalWinningShares,
    totalWinners: winners.length,
    totalLosers: losers.length,
    totalPayout: toAmount(settledPositions.reduce((sum, position) => sum + position.payoutSmallestUnit, 0)),
    platformFee: 0,
    positions: settledPositions
  };
};

const resolveMarketPoolPayouts = async (market: any, outcome: 'YES' | 'NO', adminUserId: string) => {
  if (market.status === 'resolved' || market.resolved_at) {
    throw new Error('Market has already been resolved');
  }

  const marketStatus = market.status || market.state || 'active';
  const closesAt = market.closes_at || market.close_date || market.close_time;
  const hasEnded = closesAt ? new Date(closesAt).getTime() <= Date.now() : false;
  if (!['closed', 'pending_resolution'].includes(marketStatus) && !hasEnded) {
    throw new Error('Market must be ended or pending resolution before settlement.');
  }

  const positions = await loadMarketPositions(market.id);
  const preview = buildSettlementPreview(market, outcome, positions);
  const now = new Date().toISOString();

  for (const result of preview.positions) {
    const position = positions.find((candidate) => candidate.id === result.id);
    if (!position) continue;
    if (position.settled_at || position.resolved_at || ['won', 'lost', 'settled'].includes(String(position.status || ''))) {
      continue;
    }

    if (result.payoutSmallestUnit > 0) {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', position.user_id)
        .single();

      if (wallet) {
        const field = position.currency === 'USD' ? 'available_usd_cents' : 'available_ngn_kobo';
        const totalField = position.currency === 'USD' ? 'balance_usd_cents' : 'balance_ngn_kobo';
        await supabase
          .from('wallets')
          .update({
            [field]: Number(wallet[field] || 0) + result.payoutSmallestUnit,
            [totalField]: Number(wallet[totalField] || 0) + Math.max(0, result.profitSmallestUnit),
            updated_at: now
          })
          .eq('id', wallet.id);

        await supabase.from('transactions').insert({
          wallet_id: wallet.id,
          user_id: position.user_id,
          type: 'position_payout',
          amount_smallest_unit: result.payoutSmallestUnit,
          currency: position.currency || 'NGN',
          direction: 'IN',
          status: 'completed',
          reference_id: position.id,
          reference_type: 'position',
          market_id: market.id,
          position_id: position.id,
          metadata: {
            marketId: market.id,
            marketQuestion: market.question,
            outcome,
            description: `Payout for ${market.question}`,
            stake: result.stake,
            payout: result.payout,
            profit: result.profit
          }
        });
      }

      await notifyUser(position.user_id, {
        type: 'position_payout',
        title: 'Prediction won',
        message: `${market.question} resolved ${outcome}. Your payout is ₦${Math.floor(result.payout).toLocaleString()}.`,
        reference_id: market.id,
        reference_type: 'market',
        metadata: { marketId: market.id, marketQuestion: market.question, outcome, payout: result.payout }
      });
    } else {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', position.user_id)
        .single();

      if (wallet) {
        const totalField = position.currency === 'USD' ? 'balance_usd_cents' : 'balance_ngn_kobo';
        await supabase
          .from('wallets')
          .update({
            [totalField]: Math.max(0, Number(wallet[totalField] || 0) - result.stakeSmallestUnit),
            updated_at: now
          })
          .eq('id', wallet.id);
      }
    }

    let { error: positionUpdateError } = await supabase
      .from('positions')
      .update({
        is_winner: result.status === 'won',
        payout_smallest_unit: result.payoutSmallestUnit,
        final_payout_smallest_unit: result.payoutSmallestUnit,
        profit_smallest_unit: result.profitSmallestUnit,
        settlement_payout_smallest_unit: result.payoutSmallestUnit,
        settlement_profit_smallest_unit: result.profitSmallestUnit,
        ownership_percent: result.ownershipPercent,
        status: result.status,
        resolved_at: now,
        settled_at: now,
        winning_outcome: outcome,
        market_question_snapshot: market.question,
        market_category_snapshot: normalizeMarketCategory(market.category)
      })
      .eq('id', position.id);

    if (positionUpdateError && /profit_smallest_unit|settled_at|winning_outcome|market_question_snapshot|market_category_snapshot/i.test(positionUpdateError.message || '')) {
      const { error: retryError } = await supabase
        .from('positions')
        .update({
          is_winner: result.status === 'won',
          payout_smallest_unit: result.payoutSmallestUnit,
          final_payout_smallest_unit: result.payoutSmallestUnit,
          status: result.status,
          resolved_at: now
        })
        .eq('id', position.id);
      positionUpdateError = retryError;
    }

    if (positionUpdateError) throw new Error(`Failed to update position settlement: ${positionUpdateError.message}`);
  }

  let { data: updatedMarket, error: marketError } = await supabase
    .from('markets')
    .update({
      status: 'resolved',
      state: 'resolved',
      outcome,
      winning_outcome: outcome,
      resolved_outcome: outcome,
      resolved_at: now,
      resolved_by: adminUserId,
      updated_at: now
    })
    .eq('id', market.id)
    .neq('status', 'resolved')
    .select()
    .single();

  if (marketError && /resolved_by/i.test(marketError.message || '')) {
    const retry = await supabase
      .from('markets')
      .update({
        status: 'resolved',
        state: 'resolved',
        outcome,
        winning_outcome: outcome,
        resolved_outcome: outcome,
        resolved_at: now,
        updated_at: now
      })
      .eq('id', market.id)
      .neq('status', 'resolved')
      .select()
      .single();
    updatedMarket = retry.data;
    marketError = retry.error;
  }

  if (marketError || !updatedMarket) throw new Error(`Failed to mark market resolved: ${marketError?.message || 'No data returned'}`);

  await supabase.from('market_resolution_logs').insert({
    market_id: market.id,
    resolved_by: adminUserId,
    outcome,
    winning_pool_smallest_unit: Math.round(preview.totalWinningStake * 100),
    losing_pool_smallest_unit: Math.round(preview.totalLosingStake * 100),
    payout_pool_smallest_unit: Math.round(preview.totalPayout * 100),
    resolved_position_count: positions.length,
    payout_summary: preview
  }).then(({ error }) => {
    if (error) console.warn('Resolution log not saved:', error.message);
  });

  return { market: updatedMarket, payoutSummary: preview };
};

const cancelMarketWithRefunds = async (market: any) => {
  if (market.status === 'resolved' || market.resolved_at) {
    throw new Error('Resolved markets cannot be cancelled');
  }

  const { data: positions, error: positionsError } = await supabase
    .from('positions')
    .select('*')
    .eq('market_id', market.id);

  if (positionsError) throw new Error(`Failed to load positions: ${positionsError.message}`);

  let refunds = 0;
  let refundedTotal = 0;

  for (const position of positions || []) {
    const stake = Number(position.amount_smallest_unit || 0);
    const { data: wallet } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', position.user_id)
      .single();

    if (wallet && stake > 0) {
      const field = position.currency === 'USD' ? 'available_usd_cents' : 'available_ngn_kobo';
      await supabase
        .from('wallets')
        .update({
          [field]: Number(wallet[field] || 0) + stake,
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id);

      await supabase.from('transactions').insert({
        wallet_id: wallet.id,
        user_id: position.user_id,
        type: 'refund',
        amount_smallest_unit: stake,
        currency: position.currency || 'NGN',
        direction: 'IN',
        status: 'completed',
        reference_id: position.id,
        reference_type: 'position',
        market_id: market.id,
        position_id: position.id,
        metadata: { marketId: market.id, marketQuestion: market.question, reason: 'market_cancelled' }
      });
    }

    await supabase
      .from('positions')
      .update({
        is_winner: null,
        payout_smallest_unit: stake,
        final_payout_smallest_unit: stake,
        status: 'refunded',
        resolved_at: new Date().toISOString()
      })
      .eq('id', position.id);

    refunds += 1;
    refundedTotal += stake;
  }

  const { data: updatedMarket, error: marketError } = await supabase
    .from('markets')
    .update({
      status: 'cancelled',
      state: 'closed',
      outcome: 'INVALID',
      resolved_outcome: null,
      resolved_at: new Date().toISOString()
    })
    .eq('id', market.id)
    .select()
    .single();

  if (marketError || !updatedMarket) throw new Error(`Failed to cancel market: ${marketError?.message || 'No data returned'}`);

  return { market: updatedMarket, refundSummary: { refunds, refundedTotal: toAmount(refundedTotal) } };
};

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter to validate image/video types
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, MP4, WebM, and MOV files are allowed.'));
  }
};

// Configure multer with size limit (30MB)
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 30 * 1024 * 1024,
  },
});

const ensurePublicStorageBucket = async (bucket: string, mediaType: 'image' | 'video') => {
  const { error } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: 30 * 1024 * 1024,
    allowedMimeTypes: mediaType === 'video'
      ? ['video/mp4', 'video/webm', 'video/quicktime']
      : ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  });

  if (error && !/already exists|exist/i.test(error.message || '')) {
    throw new Error(`Could not verify ${bucket} storage bucket: ${error.message}`);
  }
};

// All routes require admin or super_admin role
router.use(authMiddleware.authenticate);
router.use(requireRole('admin'));

/**
 * GET /api/admin/markets
 * List markets with filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const filters = MarketFiltersSchema.parse(req.query);

    // Get markets
    const result = await marketRepo.list(filters);

    res.json({
      success: true,
      markets: result.markets,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error('List markets error:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: error.errors,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list markets',
      },
    });
  }
});

/**
 * GET /api/admin/markets/export
 * Export markets to CSV
 */
router.get('/export', async (req: Request, res: Response) => {
  try {
    // Validate query parameters (same as list endpoint)
    const filters = MarketFiltersSchema.parse(req.query);

    // Fetch all matching markets from database
    const markets = await marketRepo.getForExport(filters);

    // Generate CSV header
    const csvHeader = 'id,question,category,status,close_date,resolution_date,pool_amount,participant_count,outcome,created_at,resolved_at\n';

    // Generate CSV rows
    const csvRows = markets.map((market) => {
      // Convert pool_amount from smallest unit to decimal
      const poolAmount = market.pool_amount_smallest_unit / (market.currency === 'NGN' ? 100 : 100);
      
      // Escape fields that might contain commas or quotes
      const escapeCSV = (value: any): string => {
        if (value === null || value === undefined) {
          return '';
        }
        const stringValue = String(value);
        // If the value contains comma, quote, or newline, wrap it in quotes and escape existing quotes
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };

      return [
        escapeCSV(market.id),
        escapeCSV(market.question),
        escapeCSV(normalizeMarketCategory(market.category)),
        escapeCSV(market.status),
        escapeCSV(market.close_date),
        escapeCSV(market.resolution_date),
        escapeCSV(poolAmount),
        escapeCSV(market.participant_count),
        escapeCSV(market.outcome || ''),
        escapeCSV(market.created_at),
        escapeCSV(market.resolved_at || ''),
      ].join(',');
    }).join('\n');

    // Combine header and rows
    const csvContent = csvHeader + csvRows;

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `markets-export-${timestamp}.csv`;

    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Send CSV data
    res.send(csvContent);
  } catch (error: any) {
    console.error('Export markets error:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: error.errors,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to export markets',
      },
    });
  }
});

/**
 * POST /api/admin/markets
 * Create a new market
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validated = MarketCreateSchema.parse(req.body);

    // Create market
    const market = await marketRepo.create(validated, req.user!.userId);

    // Create audit trail entry
    await auditRepo.create({
      market_id: market.id,
      admin_user_id: req.user!.userId,
      action_type: 'create',
      snapshot_after: market,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });

    await notifyUsersForNewMarket(market, req.user!.userId);

    res.status(201).json({
      success: true,
      market,
    });
  } catch (error: any) {
    console.error('Market creation error:', error);

    if (error.name === 'ZodError') {
      const firstError = error.errors[0];
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: firstError.message,
          field: firstError.path.join('.'),
          details: error.errors,
        },
      });
    }

    if (error.message.includes('price_sum_equals_100')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PRICE_SUM_INVALID',
          message: 'YES and NO prices must sum to 100',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create market',
      },
    });
  }
});

/**
 * PATCH /api/admin/markets/bulk-status
 * Bulk status change
 */
router.patch('/bulk-status', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validated = BulkActionSchema.parse(req.body);

    const failed: Array<{ market_id: string; error: string }> = [];
    let updatedCount = 0;

    // Process each market
    for (const marketId of validated.market_ids) {
      try {
        const market = await marketRepo.findById(marketId);

        if (!market) {
          failed.push({ market_id: marketId, error: 'Market not found' });
          continue;
        }

        // Validate transition
        if (!isValidTransition(market.status, validated.status)) {
          failed.push({
            market_id: marketId,
            error: `Cannot transition from ${market.status} to ${validated.status}`,
          });
          continue;
        }

        // Update status
        await marketRepo.updateStatus(marketId, validated.status);

        // Create audit trail
        await auditRepo.create({
          market_id: marketId,
          admin_user_id: req.user!.userId,
          action_type: 'status_change',
          changed_fields: {
            status: { old: market.status, new: validated.status },
          },
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
        });

        updatedCount++;
      } catch (error: any) {
        failed.push({ market_id: marketId, error: error.message });
      }
    }

    res.json({
      success: true,
      updated_count: updatedCount,
      failed,
    });
  } catch (error: any) {
    console.error('Bulk status change error:', error);

    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: error.errors,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to perform bulk operation',
      },
    });
  }
});

/**
 * POST /api/admin/markets/upload-image
 * Upload market image to Supabase Storage
 */
router.post('/upload-image', upload.single('image'), async (req: Request, res: Response) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE_UPLOADED',
          message: 'No image file was uploaded',
        },
      });
    }

    const file = req.file;
    
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `market-${timestamp}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from('market-images')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: 'Failed to upload image to storage',
          details: error.message,
        },
      });
    }

    // Get public URL for the uploaded image
    const { data: publicUrlData } = supabase.storage
      .from('market-images')
      .getPublicUrl(fileName);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'URL_GENERATION_FAILED',
          message: 'Failed to generate public URL for uploaded image',
        },
      });
    }

    res.status(200).json({
      success: true,
      image_url: publicUrlData.publicUrl,
    });
  } catch (error: any) {
    console.error('Image upload error:', error);

    // Handle multer errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'Image file size must be under 5MB',
        },
      });
    }

    if (error.message && error.message.includes('Invalid file type')) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: error.message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to upload image',
      },
    });
  }
});

/**
 * POST /api/admin/markets/upload-media
 * Upload a market image or short video to Supabase Storage.
 */
router.post('/upload-media', upload.single('media'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE_UPLOADED',
          message: 'No media file was uploaded',
        },
      });
      return;
    }

    const file = req.file;
    const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';
    const bucket = mediaType === 'video' ? 'market-videos' : 'market-images';
    const timestamp = Date.now();
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${mediaType}-${timestamp}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

    await ensurePublicStorageBucket(bucket, mediaType);

    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase media upload error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: `Failed to upload ${mediaType} to storage`,
          details: error.message,
        },
      });
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    res.status(200).json({
      success: true,
      media_type: mediaType,
      url: publicUrlData.publicUrl,
      [`${mediaType}_url`]: publicUrlData.publicUrl,
    });
    return;
  } catch (error: any) {
    console.error('Media upload error:', error);

    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'Media file size must be under 30MB',
        },
      });
      return;
    }

    if (error.message && error.message.includes('Invalid file type')) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: error.message,
        },
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to upload media',
      },
    });
    return;
  }
});

/**
 * GET /api/admin/markets/:marketId
 * Get market details
 */
router.get('/:marketId', async (req: Request, res: Response) => {
  try {
    const { marketId } = req.params as { marketId: string };

    const market = await marketRepo.findById(marketId);

    if (!market) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MARKET_NOT_FOUND',
          message: 'Market not found',
        },
      });
    }

    // Calculate computed fields
    const poolAmount = market.pool_amount_smallest_unit / (market.currency === 'NGN' ? 100 : 100);
    const closeDate = new Date(market.close_date);
    const now = new Date();
    const timeRemainingSeconds = Math.max(0, Math.floor((closeDate.getTime() - now.getTime()) / 1000));

    res.json({
      success: true,
      market: {
        ...market,
        pool_amount: poolAmount,
        current_yes_percentage: market.yes_price,
        current_no_percentage: market.no_price,
        time_remaining_seconds: timeRemainingSeconds,
        is_closing_soon: timeRemainingSeconds > 0 && timeRemainingSeconds < 86400,
        is_closed: timeRemainingSeconds === 0,
      },
    });
  } catch (error: any) {
    console.error('Get market error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get market',
      },
    });
  }
});

/**
 * PUT /api/admin/markets/:marketId
 * Update market
 */
router.put('/:marketId', async (req: Request, res: Response) => {
  try {
    const { marketId } = req.params as { marketId: string };

    // Validate request body
    const validated = MarketUpdateSchema.parse(req.body);

    // Get existing market
    const existingMarket = await marketRepo.findById(marketId);

    if (!existingMarket) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MARKET_NOT_FOUND',
          message: 'Market not found',
        },
      });
    }

    if (req.user!.role !== 'super_admin' && existingMarket.created_by !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admins can only edit markets they created',
        },
      });
    }

    // Check edit restrictions based on status
    const editCheck = validateEditableFields(existingMarket.status, validated);

    if (!editCheck.valid) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'CANNOT_EDIT_FIELD',
          message: `Cannot edit fields for ${existingMarket.status} market: ${editCheck.invalidFields.join(', ')}`,
          fields: editCheck.invalidFields,
        },
      });
    }

    // Update market with optimistic locking
    const updatedMarket = await marketRepo.update(marketId, validated, existingMarket.version);

    // Calculate changed fields
    const changedFields = auditRepo.calculateChangedFields(existingMarket, validated);

    // Create audit trail entry
    await auditRepo.create({
      market_id: marketId,
      admin_user_id: req.user!.userId,
      action_type: 'update',
      changed_fields: changedFields,
      snapshot_before: existingMarket,
      snapshot_after: updatedMarket,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      market: updatedMarket,
    });
  } catch (error: any) {
    console.error('Market update error:', error);

    if (error.name === 'ZodError') {
      const firstError = error.errors[0];
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: firstError.message,
          field: firstError.path.join('.'),
          details: error.errors,
        },
      });
    }

    if (error.message === 'CONCURRENT_MODIFICATION') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'CONCURRENT_MODIFICATION',
          message: 'Market was modified by another admin. Please refresh and try again.',
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update market',
      },
    });
  }
});

/**
 * DELETE /api/admin/markets/:marketId
 * Delete market (draft only)
 */
router.delete('/:marketId', async (req: Request, res: Response) => {
  try {
    const { marketId } = req.params as { marketId: string };

    // Get existing market
    const existingMarket = await marketRepo.findById(marketId);

    if (!existingMarket) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MARKET_NOT_FOUND',
          message: 'Market not found',
        },
      });
    }

    if (req.user!.role !== 'super_admin' && existingMarket.created_by !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admins can only delete markets they created',
        },
      });
    }

    // Only allow deletion of draft markets
    if (existingMarket.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_DELETE_NON_DRAFT',
          message: 'Only draft markets can be deleted',
        },
      });
    }

    // Create audit trail entry before deletion
    await auditRepo.create({
      market_id: marketId,
      admin_user_id: req.user!.userId,
      action_type: 'delete',
      snapshot_before: existingMarket,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });

    // Delete market
    await marketRepo.delete(marketId);

    res.json({
      success: true,
      message: 'Market deleted successfully',
    });
  } catch (error: any) {
    console.error('Market deletion error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete market',
      },
    });
  }
});

/**
 * GET /api/admin/markets/:marketId/resolution-preview
 * Preview settlement before paying winners.
 */
router.get('/:marketId/resolution-preview', async (req: Request, res: Response) => {
  try {
    const { marketId } = req.params as { marketId: string };
    const outcome = String(req.query.outcome || '').toUpperCase();
    if (outcome !== 'YES' && outcome !== 'NO') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_OUTCOME', message: 'Choose YES or NO.' } });
    }

    const market = await marketRepo.findById(marketId);
    if (!market) {
      return res.status(404).json({ success: false, error: { code: 'MARKET_NOT_FOUND', message: 'Market not found.' } });
    }
    if (req.user!.role !== 'super_admin') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only super admins can resolve markets.' } });
    }

    const positions = await loadMarketPositions(marketId);
    res.json({ success: true, preview: buildSettlementPreview(market, outcome, positions) });
  } catch (error: any) {
    console.error('Resolution preview error:', error);
    res.status(500).json({ success: false, error: { code: 'RESOLUTION_PREVIEW_FAILED', message: error.message || 'Failed to preview settlement.' } });
  }
});

/**
 * POST /api/admin/markets/:marketId/resolve
 * Resolve a market and pay winners exactly once.
 */
router.post('/:marketId/resolve', async (req: Request, res: Response) => {
  try {
    const { marketId } = req.params as { marketId: string };
    const outcome = String(req.body.winningOutcome || req.body.outcome || '').toUpperCase();
    if (outcome !== 'YES' && outcome !== 'NO') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_OUTCOME', message: 'Choose YES or NO.' } });
    }

    const market = await marketRepo.findById(marketId);
    if (!market) {
      return res.status(404).json({ success: false, error: { code: 'MARKET_NOT_FOUND', message: 'Market not found.' } });
    }
    if (req.user!.role !== 'super_admin') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only super admins can resolve markets.' } });
    }

    if (market.status === 'resolved' || market.resolved_at) {
      const positions = await loadMarketPositions(marketId);
      return res.json({
        success: true,
        alreadyResolved: true,
        market,
        summary: buildSettlementPreview(market, outcome, positions),
        message: 'Market is already resolved. No payouts were created.'
      });
    }

    const result = await resolveMarketPoolPayouts(market, outcome, req.user!.userId);
    await auditRepo.create({
      market_id: marketId,
      admin_user_id: req.user!.userId,
      action_type: 'status_change',
      changed_fields: { status: { old: market.status, new: 'resolved' }, outcome: { old: market.outcome, new: outcome } },
      snapshot_before: market,
      snapshot_after: result.market,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    }).catch((error) => console.warn('Resolution audit not saved:', error.message));

    res.json({ success: true, market: result.market, summary: result.payoutSummary });
  } catch (error: any) {
    console.error('Resolve market error:', error);
    res.status(500).json({ success: false, error: { code: 'RESOLVE_MARKET_FAILED', message: error.message || 'Failed to resolve market.' } });
  }
});

/**
 * PATCH /api/admin/markets/:marketId/status
 * Change market status
 */
router.patch('/:marketId/status', async (req: Request, res: Response) => {
  try {
    const { marketId } = req.params as { marketId: string };

    // Validate request body
    const validated = StatusChangeSchema.parse(req.body);

    // Get existing market
    const existingMarket = await marketRepo.findById(marketId);

    if (!existingMarket) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MARKET_NOT_FOUND',
          message: 'Market not found',
        },
      });
    }

    if (validated.status === 'resolved' && req.user!.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Only super admins can resolve markets',
        },
      });
    }

    if (req.user!.role !== 'super_admin' && existingMarket.created_by !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admins can only change markets they created',
        },
      });
    }

    // Validate status transition
    if (!isValidTransition(existingMarket.status, validated.status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot transition from ${existingMarket.status} to ${validated.status}`,
        },
      });
    }

    let updatedMarket: any;
    let operationSummary: any;

    if (validated.status === 'resolved') {
      if (validated.outcome !== 'YES' && validated.outcome !== 'NO') {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_OUTCOME',
            message: 'Choose YES or NO to resolve this market. Use cancel to refund all positions.',
          },
        });
      }
      const result = await resolveMarketPoolPayouts(existingMarket, validated.outcome, req.user!.userId);
      updatedMarket = result.market;
      operationSummary = result.payoutSummary;
    } else if (validated.status === 'cancelled') {
      const result = await cancelMarketWithRefunds(existingMarket);
      updatedMarket = result.market;
      operationSummary = result.refundSummary;
    } else {
      updatedMarket = await marketRepo.updateStatus(
        marketId,
        validated.status,
        validated.outcome,
        validated.resolution_source
      );
    }

    // Create audit trail entry
    await auditRepo.create({
      market_id: marketId,
      admin_user_id: req.user!.userId,
      action_type: 'status_change',
      changed_fields: {
        status: { old: existingMarket.status, new: validated.status },
        ...(validated.outcome && { outcome: { old: existingMarket.outcome, new: validated.outcome } }),
      },
      snapshot_before: existingMarket,
      snapshot_after: updatedMarket,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    });

    if (validated.status === 'resolved') {
      await notifyMarketResolution(updatedMarket, validated.outcome);
    }

    res.json({
      success: true,
      market: updatedMarket,
      summary: operationSummary,
    });
  } catch (error: any) {
    console.error('Status change error:', error);

    if (error.name === 'ZodError') {
      const firstError = error.errors[0];
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: firstError.message,
          field: firstError.path.join('.'),
          details: error.errors,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message || 'Failed to change market status',
      },
    });
  }
});

/**
 * GET /api/admin/markets/:marketId/audit
 * Get audit trail for market
 */
router.get('/:marketId/audit', async (req: Request, res: Response) => {
  try {
    const { marketId } = req.params as { marketId: string };
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    // Check if market exists
    const market = await marketRepo.findById(marketId);

    if (!market) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'MARKET_NOT_FOUND',
          message: 'Market not found',
        },
      });
    }

    // Get audit trail
    const result = await auditRepo.getByMarketId(marketId, page, limit);

    res.json({
      success: true,
      audit_entries: result.entries,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error('Get audit trail error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to get audit trail',
      },
    });
  }
});

export default router;
