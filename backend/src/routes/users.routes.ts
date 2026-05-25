import { Router, Request, Response } from 'express';
import { supabase } from '../db/supabase-client.js';

const router = Router();

/**
 * GET /api/users/search?q=
 * Public lightweight user search for app search suggestions.
 * Returns only non-sensitive profile fields.
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = String(req.query.q || '').trim();

    if (query.length < 2) {
      return res.json({ users: [] });
    }

    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, role')
      .ilike('username', `%${query}%`)
      .limit(8);

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      users: (users || []).map((user) => ({
        id: user.id,
        username: user.username,
        role: user.role,
      })),
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      error: {
        code: 'SEARCH_USERS_FAILED',
        message: 'Could not search users. Please try again.',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

export default router;
