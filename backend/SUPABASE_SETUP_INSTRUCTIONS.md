# Flippe Supabase Complete Setup Instructions

## Overview
This guide will help you set up a complete, production-ready Supabase backend for Flippe with role-based access control, Row Level Security, and automatic super admin assignment.

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project: https://tuqvhmxefiepdcmqffvt.supabase.co
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Complete Setup Script
1. Open the file: `backend/SUPABASE_COMPLETE_SETUP.sql`
2. Copy the **entire contents** of the file
3. Paste into the Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter)

### Step 3: Verify Setup
After running the script, you should see:
- ✅ Profiles table created
- ✅ Helper functions created
- ✅ Triggers created
- ✅ RLS policies enabled
- ✅ Primary super admin profile created

The verification queries at the end will show:
```
email: fehintoluwaolu@gmail.com
role: super_admin
```

---

## 📋 What Gets Created

### 1. **Profiles Table**
```sql
profiles (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(20) CHECK (role IN ('user', 'admin', 'super_admin')),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
```

### 2. **Helper Functions**
- `get_user_role()` - Returns current user's role
- `is_admin()` - Returns true if user is admin or super_admin
- `is_super_admin()` - Returns true if user is super_admin
- `is_primary_super_admin(email)` - Checks if email is primary super admin

### 3. **Triggers**
- **Auto-assign super_admin**: Automatically assigns super_admin role to fehintoluwaolu@gmail.com
- **Prevent deletion**: Blocks deletion of primary super admin account
- **Prevent role change**: Blocks role changes for primary super admin
- **Update timestamp**: Automatically updates `updated_at` on profile changes

### 4. **Row Level Security Policies**
- Users can view and edit their own profile (except role)
- Admins can view all profiles
- Super admins can view, update, and delete profiles (except primary super admin)
- Profile creation allowed during signup

---

## 🔐 Authentication Flow

### User Signup Flow
```javascript
// 1. User signs up with Supabase Auth
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
})

// 2. Create profile in profiles table
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .insert({
    email: 'user@example.com',
    full_name: 'John Doe',
    role: 'user' // Default role
  })

// 3. If email is fehintoluwaolu@gmail.com, role is automatically set to super_admin
```

### User Login Flow
```javascript
// 1. User logs in with Supabase Auth
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})

// 2. Fetch user profile with role
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('*')
  .eq('email', data.user.email)
  .single()

// 3. Use role for authorization
if (profile.role === 'super_admin') {
  // Show super admin dashboard
} else if (profile.role === 'admin') {
  // Show admin dashboard
} else {
  // Show user dashboard
}
```

### Check User Role
```javascript
// Using helper functions in SQL queries
const { data, error } = await supabase.rpc('is_super_admin')
// Returns: true or false

const { data, error } = await supabase.rpc('is_admin')
// Returns: true or false

const { data, error } = await supabase.rpc('get_user_role')
// Returns: 'user', 'admin', or 'super_admin'
```

---

## 🛡️ Security Features

### 1. **Primary Super Admin Protection**
- Email: `fehintoluwaolu@gmail.com`
- **Cannot be deleted** - Trigger prevents deletion
- **Role cannot be changed** - Trigger prevents role modification
- **Automatically assigned super_admin** - On insert or update

### 2. **Row Level Security (RLS)**
All data access is controlled by RLS policies:
- Users can only see their own profile
- Admins can see all profiles but cannot modify roles
- Super admins have full access (except primary super admin protection)

### 3. **Role Validation**
- Role field has CHECK constraint: `role IN ('user', 'admin', 'super_admin')`
- Invalid roles are rejected at database level

### 4. **Automatic Timestamps**
- `created_at` set automatically on insert
- `updated_at` updated automatically on every change

---

## 🔧 Common Operations

### Add a New Admin
```sql
-- Only super_admin can do this
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'newadmin@example.com';
```

### Remove Admin Access
```sql
-- Only super_admin can do this
UPDATE profiles 
SET role = 'user' 
WHERE email = 'oldadmin@example.com';
```

### List All Admins
```sql
SELECT id, email, full_name, role, created_at
FROM profiles
WHERE role IN ('admin', 'super_admin')
ORDER BY created_at DESC;
```

### Check if User is Admin (in your app)
```javascript
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('email', user.email)
  .single()

const isAdmin = ['admin', 'super_admin'].includes(profile.role)
```

---

## 🧪 Testing the Setup

### Test 1: Verify Primary Super Admin
```sql
SELECT * FROM profiles WHERE email = 'fehintoluwaolu@gmail.com';
-- Should return: role = 'super_admin'
```

### Test 2: Try to Delete Primary Super Admin (Should Fail)
```sql
DELETE FROM profiles WHERE email = 'fehintoluwaolu@gmail.com';
-- Should return: ERROR: Cannot delete primary super admin account
```

### Test 3: Try to Change Primary Super Admin Role (Should Fail)
```sql
UPDATE profiles 
SET role = 'user' 
WHERE email = 'fehintoluwaolu@gmail.com';
-- Should return: ERROR: Cannot change role of primary super admin
```

### Test 4: Test Helper Functions
```sql
SELECT is_primary_super_admin('fehintoluwaolu@gmail.com');
-- Should return: true

SELECT is_primary_super_admin('other@example.com');
-- Should return: false
```

---

## 🔄 Migrating Existing Users Table

If you already have a `users` table and want to migrate to `profiles`:

### Option 1: Rename Table
```sql
ALTER TABLE users RENAME TO profiles;
```

### Option 2: Migrate Data
```sql
-- Create profiles table (run SUPABASE_COMPLETE_SETUP.sql first)

-- Copy data from users to profiles
INSERT INTO profiles (id, email, full_name, role, created_at)
SELECT id, email, username as full_name, role, created_at
FROM users
ON CONFLICT (email) DO NOTHING;
```

---

## 📱 Frontend Integration

### React/TypeScript Example
```typescript
// types/profile.ts
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'user' | 'admin' | 'super_admin';
  created_at: string;
  updated_at: string;
}

// hooks/useProfile.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', user.email)
          .single();
        
        if (data) setProfile(data);
      }
      
      setLoading(false);
    }

    fetchProfile();
  }, []);

  const isAdmin = () => {
    return profile?.role === 'admin' || profile?.role === 'super_admin';
  };

  const isSuperAdmin = () => {
    return profile?.role === 'super_admin';
  };

  return { profile, loading, isAdmin, isSuperAdmin };
}
```

---

## 🚨 Troubleshooting

### Issue: "relation 'profiles' does not exist"
**Solution**: Run the complete setup script in Supabase SQL Editor

### Issue: "permission denied for table profiles"
**Solution**: RLS is enabled. Make sure you're authenticated with Supabase Auth

### Issue: Primary super admin not created
**Solution**: Check if email is exactly `fehintoluwaolu@gmail.com` (case-sensitive)

### Issue: Cannot update user roles
**Solution**: Only super_admin can update roles. Check your current user's role

---

## 📚 Additional Resources

- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [PostgreSQL Triggers](https://www.postgresql.org/docs/current/trigger-definition.html)
- [PostgreSQL Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)

---

## ✅ Setup Checklist

- [ ] Run `SUPABASE_COMPLETE_SETUP.sql` in SQL Editor
- [ ] Verify primary super admin created
- [ ] Test helper functions
- [ ] Test RLS policies
- [ ] Update frontend to use profiles table
- [ ] Test authentication flow
- [ ] Test role-based access control
- [ ] Deploy to production

---

## 🎉 You're Done!

Your Supabase backend is now production-ready with:
- ✅ Scalable role-based access control
- ✅ Secure Row Level Security
- ✅ Protected primary super admin
- ✅ Automatic role assignment
- ✅ Helper functions for easy role checking
- ✅ Audit trails with timestamps

**Next Steps**: Integrate with your frontend and test the authentication flow!
