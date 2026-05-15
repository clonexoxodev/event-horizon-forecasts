-- =====================================================
-- NOTIFICATIONS SYSTEM - DATABASE MIGRATION (FIXED)
-- =====================================================
-- This script creates the notifications table and triggers
-- for the real-time notification system
-- 
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: CREATE NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Notification type
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'forecast_confirmed',
    'market_closing_soon',
    'market_moved_significantly',
    'market_resolved',
    'position_sold',
    'new_market_available'
  )),
  
  -- Content
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  
  -- Status
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Metadata (JSONB for flexibility)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Composite index for user's unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON notifications(user_id, is_read, created_at DESC) 
  WHERE is_read = FALSE;

-- =====================================================
-- STEP 2: CREATE TRIGGERS
-- =====================================================

-- Auto-set read_at timestamp when notification is marked as read
CREATE OR REPLACE FUNCTION set_notification_read_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_read = TRUE AND (OLD.is_read IS NULL OR OLD.is_read = FALSE) THEN
    NEW.read_at = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notifications_read_at ON notifications;
CREATE TRIGGER notifications_read_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION set_notification_read_at();

-- =====================================================
-- STEP 3: CREATE RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- System can insert notifications for any user
CREATE POLICY "System can insert notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- STEP 4: CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type VARCHAR(50),
  p_title VARCHAR(200),
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_metadata)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE
  WHERE id = p_notification_id
    AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = TRUE
  WHERE user_id = auth.uid()
    AND is_read = FALSE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_count
  FROM notifications
  WHERE user_id = auth.uid()
    AND is_read = FALSE;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 5: CREATE NOTIFICATION TRIGGERS FOR EVENTS
-- =====================================================

-- Trigger: Notify user when market is resolved
CREATE OR REPLACE FUNCTION notify_market_resolved()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if market was just resolved
  IF NEW.status = 'resolved' AND (OLD.status IS NULL OR OLD.status != 'resolved') THEN
    -- Check if positions table exists before trying to query it
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'positions') THEN
      -- Notify all users with positions in this market
      INSERT INTO notifications (user_id, type, title, message, metadata)
      SELECT DISTINCT
        p.user_id,
        'market_resolved',
        CASE 
          WHEN p.side = NEW.outcome THEN 'You Won! 🎉'
          ELSE 'Market Resolved'
        END,
        CASE 
          WHEN p.side = NEW.outcome THEN
            format('"%s" resolved %s. You won!', NEW.question, NEW.outcome)
          ELSE
            format('"%s" resolved %s.', NEW.question, NEW.outcome)
        END,
        jsonb_build_object(
          'market_id', NEW.id,
          'outcome', NEW.outcome,
          'won', (p.side = NEW.outcome)
        )
      FROM positions p
      WHERE p.market_id = NEW.id
        AND p.status = 'active';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_market_resolved ON markets;
CREATE TRIGGER trigger_notify_market_resolved
  AFTER UPDATE ON markets
  FOR EACH ROW
  EXECUTE FUNCTION notify_market_resolved();

-- =====================================================
-- STEP 6: VERIFICATION QUERIES
-- =====================================================

-- Verify notifications table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Your notifications system is now ready with:
-- ✅ Notifications table with all required fields
-- ✅ Indexes for performance
-- ✅ RLS policies for security
-- ✅ Helper functions for common operations
-- ✅ Triggers for automatic notifications
-- =====================================================
