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
  validateEditableFields,
} from '../validation/market.validation.js';

const router = Router();
const marketRepo = new AdminMarketRepository();
const auditRepo = new AuditTrailRepository();

const notifyUsersForNewMarket = async (market: any, adminUserId: string) => {
  if (market.status !== 'active' || !market.category) return;

  const { data: priorPositions, error } = await supabase
    .from('positions')
    .select('user_id, markets!inner(category)')
    .eq('markets.category', market.category);

  if (error) {
    console.warn('New-market notifications skipped:', error.message);
    return;
  }

  const userIds = Array.from(new Set((priorPositions || [])
    .map((position: any) => position.user_id)
    .filter((userId: string) => userId && userId !== adminUserId)));

  if (!userIds.length) return;

  await supabase
    .from('notifications')
    .insert(userIds.map((userId) => ({
      user_id: userId,
      type: 'new_market_available',
      title: `New ${market.category} market`,
      message: market.question,
      reference_id: market.id,
      reference_type: 'market',
      metadata: {
        marketId: market.id,
        marketQuestion: market.question,
        category: market.category
      }
    })))
    .then(({ error: notificationError }) => {
      if (notificationError) console.warn('New-market notifications not saved:', notificationError.message);
    });
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

  await supabase
    .from('notifications')
    .insert(userIds.map((userId) => ({
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
    })))
    .then(({ error: notificationError }) => {
      if (notificationError) console.warn('Market resolution notifications not saved:', notificationError.message);
    });
};

const toAmount = (smallestUnit: number) => smallestUnit / 100;

const notifyUser = async (userId: string, notification: Record<string, any>) => {
  await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      ...notification
    })
    .then(({ error }) => {
      if (error) console.warn('Notification not saved:', error.message);
    });
};

const resolveMarketPoolPayouts = async (market: any, outcome: 'YES' | 'NO', adminUserId: string) => {
  if (market.status === 'resolved' || market.resolved_at) {
    throw new Error('Market has already been resolved');
  }

  const { data: positions, error: positionsError } = await supabase
    .from('positions')
    .select('*')
    .eq('market_id', market.id);

  if (positionsError) throw new Error(`Failed to load positions: ${positionsError.message}`);

  const winningPool = Number(outcome === 'YES' ? market.yes_pool_smallest_unit : market.no_pool_smallest_unit) || 0;
  const totalPool =
    (Number(market.yes_pool_smallest_unit) || 0) +
    (Number(market.no_pool_smallest_unit) || 0);

  let winners = 0;
  let losers = 0;
  let totalPayout = 0;

  for (const position of positions || []) {
    const won = position.side === outcome;
    const stake = Number(position.amount_smallest_unit || 0);
    const payout = won && winningPool > 0 ? Math.floor((stake / winningPool) * totalPool) : 0;

    if (won) {
      winners += 1;
      totalPayout += payout;

      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', position.user_id)
        .single();

      if (wallet) {
        const field = position.currency === 'USD' ? 'available_usd_cents' : 'available_ngn_kobo';
        await supabase
          .from('wallets')
          .update({
            [field]: Number(wallet[field] || 0) + payout,
            updated_at: new Date().toISOString()
          })
          .eq('id', wallet.id);

        await supabase.from('transactions').insert({
          wallet_id: wallet.id,
          user_id: position.user_id,
          type: 'position_payout',
          amount_smallest_unit: payout,
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
            stake: toAmount(stake),
            payout: toAmount(payout),
            profit: toAmount(Math.max(0, payout - stake))
          }
        });
      }

      await notifyUser(position.user_id, {
        type: 'position_payout',
        title: 'Prediction won',
        message: `${market.question} resolved ${outcome}. Your payout is ₦${Math.floor(toAmount(payout)).toLocaleString()}.`,
        reference_id: market.id,
        reference_type: 'market',
        metadata: { marketId: market.id, marketQuestion: market.question, outcome, payout: toAmount(payout) }
      });
    } else {
      losers += 1;
    }

    await supabase
      .from('positions')
      .update({
        is_winner: won,
        payout_smallest_unit: payout,
        final_payout_smallest_unit: payout,
        status: won ? 'won' : 'lost',
        resolved_at: new Date().toISOString()
      })
      .eq('id', position.id);
  }

  const { data: updatedMarket, error: marketError } = await supabase
    .from('markets')
    .update({
      status: 'resolved',
      state: 'resolved',
      outcome,
      winning_outcome: outcome,
      resolved_outcome: outcome,
      resolved_at: new Date().toISOString()
    })
    .eq('id', market.id)
    .select()
    .single();

  if (marketError || !updatedMarket) throw new Error(`Failed to mark market resolved: ${marketError?.message || 'No data returned'}`);

  await supabase.from('market_resolution_logs').insert({
    market_id: market.id,
    resolved_by: adminUserId,
    outcome,
    payout_summary: { winners, losers, totalPayoutSmallestUnit: totalPayout, totalPayout: toAmount(totalPayout) }
  }).then(({ error }) => {
    if (error) console.warn('Resolution log not saved:', error.message);
  });

  return { market: updatedMarket, payoutSummary: { winners, losers, totalPayout: toAmount(totalPayout) } };
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
        escapeCSV(market.category),
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
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE_UPLOADED',
          message: 'No media file was uploaded',
        },
      });
    }

    const file = req.file;
    const mediaType = file.mimetype.startsWith('video/') ? 'video' : 'image';
    const bucket = mediaType === 'video' ? 'market-videos' : 'market-images';
    const timestamp = Date.now();
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${mediaType}-${timestamp}-${Math.random().toString(36).substring(7)}.${fileExtension}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Supabase media upload error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: `Failed to upload ${mediaType} to storage`,
          details: error.message,
        },
      });
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
  } catch (error: any) {
    console.error('Media upload error:', error);

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'Media file size must be under 30MB',
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
        message: 'Failed to upload media',
      },
    });
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
        message: 'Failed to change market status',
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
