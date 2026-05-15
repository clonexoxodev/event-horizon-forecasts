-- =====================================================
-- FLIPPE SUPABASE COMPLETE BACKEND SETUP
-- =====================================================
-- This script sets up a complete role-based access control system
-- with profiles table, RLS policies, helper functions, and triggers
-- 
-- SUPER ADMIN: fehintoluwaolu@gmail.com
-- =====================================================

-- =====================================================
-- STEP 1: CREATE PROFILES TABLE
-- =====================================================

-- Create profiles table (or update existing users table)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- =====================================================
-- STEP 2: HELPER FUNCTIONS
-- =====================================================

-- Function to get current user's role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS VARCHAR(20) AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM profiles 
    WHERE email = auth.jwt() ->> 'email'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role IN ('admin', 'super_admin')
    FROM profiles 
    WHERE email = auth.jwt() ->> 'email'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'super_admin'
    FROM profiles 
    WHERE email = auth.jwt() ->> 'email'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if email is the primary super admin
CREATE OR REPLACE FUNCTION is_primary_super_admin(user_email VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN user_email = 'fehintoluwaolu@gmail.com';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- STEP 3: TRIGGERS
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to auto-assign super_admin role to primary email
CREATE OR REPLACE FUNCTION auto_assign_super_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email = 'fehintoluwaolu@gmail.com' THEN
    NEW.role = 'super_admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_primary_super_admin
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_super_admin();

-- Trigger to prevent deletion of primary super admin
CREATE OR REPLACE FUNCTION prevent_primary_super_admin_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.email = 'fehintoluwaolu@gmail.com' THEN
    RAISE EXCEPTION 'Cannot delete primary super admin account';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_primary_super_admin
  BEFORE DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_primary_super_admin_deletion();

-- Trigger to prevent role change of primary super admin
CREATE OR REPLACE FUNCTION prevent_primary_super_admin_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.email = 'fehintoluwaolu@gmail.com' AND NEW.role != 'super_admin' THEN
    RAISE EXCEPTION 'Cannot change role of primary super admin';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER protect_primary_super_admin_role
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION prevent_primary_super_admin_role_change();

-- =====================================================
-- STEP 4: ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  USING (email = auth.jwt() ->> 'email');

-- Policy: Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (email = auth.jwt() ->> 'email')
  WITH CHECK (
    email = auth.jwt() ->> 'email' 
    AND role = (SELECT role FROM profiles WHERE email = auth.jwt() ->> 'email')
  );

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  USING (is_admin());

-- Policy: Super admins can view all profiles
CREATE POLICY "Super admins can view all profiles"
  ON profiles
  FOR SELECT
  USING (is_super_admin());

-- Policy: Super admins can update any profile (except primary super admin role)
CREATE POLICY "Super admins can update profiles"
  ON profiles
  FOR UPDATE
  USING (is_super_admin())
  WITH CHECK (
    is_super_admin() 
    AND (
      email != 'fehintoluwaolu@gmail.com' 
      OR role = 'super_admin'
    )
  );

-- Policy: Super admins can delete profiles (except primary super admin)
CREATE POLICY "Super admins can delete profiles"
  ON profiles
  FOR DELETE
  USING (
    is_super_admin() 
    AND email != 'fehintoluwaolu@gmail.com'
  );

-- Policy: Allow profile creation during signup
CREATE POLICY "Allow profile creation"
  ON profiles
  FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- STEP 5: INSERT PRIMARY SUPER ADMIN
-- =====================================================

-- Insert or update primary super admin profile
INSERT INTO profiles (email, full_name, role)
VALUES ('fehintoluwaolu@gmail.com', 'Fehin Toluwaolu', 'super_admin')
ON CONFLICT (email) 
DO UPDATE SET 
  role = 'super_admin',
  updated_at = NOW();

-- =====================================================
-- STEP 6: VERIFICATION QUERIES
-- =====================================================

-- Verify primary super admin exists
SELECT id, email, full_name, role, created_at 
FROM profiles 
WHERE email = 'fehintoluwaolu@gmail.com';

-- Verify helper functions work
SELECT 
  is_primary_super_admin('fehintoluwaolu@gmail.com') as is_primary,
  is_primary_super_admin('other@example.com') as is_not_primary;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
-- Your Supabase backend is now configured with:
-- ✅ Profiles table with role-based access
-- ✅ Helper functions (is_admin, is_super_admin)
-- ✅ Auto-assignment of super_admin role
-- ✅ Protection against primary super admin deletion
-- ✅ Row Level Security policies
-- ✅ Automatic timestamp updates
-- =====================================================
