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

export default router;
