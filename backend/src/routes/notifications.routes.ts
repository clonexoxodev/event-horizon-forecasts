import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { supabase } from '../db/supabase-client.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware.authenticate);

const stripNotificationMetadata = (payload: Record<string, any>) => {
  const { metadata: _metadata, ...fallbackPayload } = payload;
  return fallbackPayload;
};

const insertNotificationSafely = async (payload: Record<string, any>) => {
  const result = await supabase.from('notifications').insert(payload).select().single();
  if (!result.error) return result;

  if (/metadata/i.test(result.error.message || '')) {
    return supabase.from('notifications').insert(stripNotificationMetadata(payload)).select().single();
  }

  return result;
};

/**
 * GET /api/notifications
 * Get user's notifications with pagination
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unread_only === 'true';
    
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by unread if requested
    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error, count } = await query;

    if (error) {
      console.error('Get notifications error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch notifications',
        },
      });
    }

    res.json({
      success: true,
      notifications: notifications || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch notifications',
      },
    });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Get unread count error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch unread count',
        },
      });
    }

    res.json({
      success: true,
      unread_count: count || 0,
    });
  } catch (error: any) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch unread count',
      },
    });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const notificationId = req.params.id;

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOTIFICATION_NOT_FOUND',
            message: 'Notification not found',
          },
        });
      }

      console.error('Mark as read error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to mark notification as read',
        },
      });
    }

    res.json({
      success: true,
      notification: data,
    });
  } catch (error: any) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to mark notification as read',
      },
    });
  }
});

/**
 * PATCH /api/notifications/mark-all-read
 * Mark all notifications as read
 */
router.patch('/mark-all-read', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const { error, count } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Mark all as read error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to mark all notifications as read',
        },
      });
    }

    res.json({
      success: true,
      updated_count: count || 0,
    });
  } catch (error: any) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to mark all notifications as read',
      },
    });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const notificationId = req.params.id;

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    if (error) {
      console.error('Delete notification error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete notification',
        },
      });
    }

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete notification',
      },
    });
  }
});

/**
 * DELETE /api/notifications
 * Delete all notifications for user
 */
router.delete('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const { error, count } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Delete all notifications error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to delete notifications',
        },
      });
    }

    res.json({
      success: true,
      deleted_count: count || 0,
    });
  } catch (error: any) {
    console.error('Delete all notifications error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete notifications',
      },
    });
  }
});

/**
 * POST /api/notifications
 * Create a notification (for testing or admin use)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { type, title, message, metadata } = req.body;

    // Validate required fields
    if (!type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Type, title, and message are required',
        },
      });
    }

    // Validate type
    const validTypes = [
      'forecast_confirmed',
      'market_closing_soon',
      'market_moved_significantly',
      'market_resolved',
      'position_sold',
      'new_market_available',
    ];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TYPE',
          message: `Type must be one of: ${validTypes.join(', ')}`,
        },
      });
    }

    const { data, error } = await insertNotificationSafely({
      user_id: userId,
      type,
      title,
      message,
      metadata: metadata || {},
    });

    if (error) {
      console.error('Create notification error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create notification',
        },
      });
    }

    res.status(201).json({
      success: true,
      notification: data,
    });
  } catch (error: any) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create notification',
      },
    });
  }
});

export default router;
