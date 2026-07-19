import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { supabase } from '../db/supabase-client.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Only JPEG, PNG, GIF, and WebP profile photos are allowed.'));
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.use(authMiddleware.authenticate);

router.post('/avatar', upload.single('media'), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Please log in to update your profile photo.',
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: {
          code: 'IMAGE_REQUIRED',
          message: 'Choose a profile image.',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const extension = req.file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
    const safeName = `${req.user.userId}/avatar-${Date.now()}.${extension}`;

    const { error: bucketError } = await supabase.storage.createBucket('profile-images', { public: true });
    if (bucketError && !/exist|already/i.test(bucketError.message)) {
      console.warn('Could not verify profile-images bucket:', bucketError.message);
    }

    const { error: uploadError } = await supabase.storage
      .from('profile-images')
      .upload(safeName, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from('profile-images').getPublicUrl(safeName);
    const avatarUrl = publicUrlData.publicUrl;

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl, profile_image_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', req.user.userId)
      .select('id, username, email, role, avatar_url, profile_image_url')
      .single();

    if (updateError || !updatedUser) throw updateError || new Error('Profile not updated');

    return res.json({
      success: true,
      avatarUrl,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role || 'user',
        avatarUrl: updatedUser.avatar_url || updatedUser.profile_image_url || avatarUrl,
        avatar_url: updatedUser.avatar_url || avatarUrl,
        profile_image_url: updatedUser.profile_image_url || avatarUrl,
      },
    });
  } catch (error: any) {
    console.error('Profile avatar upload error:', error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: {
          code: 'FILE_TOO_LARGE',
          message: 'Profile photo must be under 5MB.',
          timestamp: new Date().toISOString(),
        },
      });
    }

    return res.status(500).json({
      error: {
        code: 'PROFILE_AVATAR_FAILED',
        message: 'Could not save profile picture. Check the profile-images bucket and avatar fields.',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

router.put('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Please log in to update your profile.',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const { name, username } = req.body ?? {};
    const updates: Record<string, string> = { updated_at: new Date().toISOString() };

    if (typeof name === 'string' && name.trim()) {
      updates.name = name.trim().slice(0, 80);
    }
    if (typeof username === 'string' && username.trim()) {
      const trimmed = username.trim().slice(0, 40);
      if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_USERNAME',
            message: 'Username may only contain letters, numbers, dots, dashes, and underscores.',
            timestamp: new Date().toISOString(),
          },
        });
      }
      updates.username = trimmed;
    }

    if (Object.keys(updates).length === 1) {
      return res.status(400).json({
        error: {
          code: 'NO_FIELDS',
          message: 'Provide a name or username to update.',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', updates.username)
      .neq('id', req.user.userId)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({
        error: {
          code: 'USERNAME_TAKEN',
          message: 'That username is already in use.',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.userId)
      .select('id, username, email, role, avatar_url, profile_image_url, balance')
      .maybeSingle();

    if (updateError || !updatedUser) {
      return res.status(500).json({
        error: {
          code: 'PROFILE_UPDATE_FAILED',
          message: 'Could not update profile. Please try again.',
          timestamp: new Date().toISOString(),
        },
      });
    }

    return res.json({
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role || 'user',
        balance: Number(updatedUser.balance ?? 0),
        avatarUrl: updatedUser.avatar_url || updatedUser.profile_image_url || null,
        avatar_url: updatedUser.avatar_url || null,
        profile_image_url: updatedUser.profile_image_url || null,
      },
    });
  } catch (error: any) {
    console.error('Profile update error:', error);
    return res.status(500).json({
      error: {
        code: 'PROFILE_UPDATE_FAILED',
        message: 'Could not update profile. Please try again.',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

export default router;
