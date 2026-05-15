# Bcrypt Compatibility Fix for Vercel

## Issue

Bcrypt (native module) sometimes has issues in Vercel's serverless environment due to:
- Native C++ bindings
- Different Node.js versions
- Lambda environment constraints

## Solution: Use bcryptjs Instead

If login fails with bcrypt errors in Vercel logs, switch to bcryptjs (pure JavaScript implementation).

### Step 1: Install bcryptjs

```bash
cd backend
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

### Step 2: Update api/index.ts

Change line 7 from:
```typescript
import bcrypt from 'bcrypt';
```

To:
```typescript
import bcrypt from 'bcryptjs';
```

That's it! bcryptjs has the same API as bcrypt, so no other code changes needed.

### Step 3: Redeploy

```bash
git add package.json package-lock.json api/index.ts
git commit -m "fix: Switch to bcryptjs for Vercel compatibility"
git push origin main
```

Or redeploy via Vercel Dashboard.

---

## Why This Works

- **bcryptjs**: Pure JavaScript, no native dependencies
- **bcrypt**: Native C++ module, can have issues in serverless
- **Same API**: Both use `bcrypt.hash()` and `bcrypt.compare()`
- **Same hashes**: bcryptjs can verify hashes created by bcrypt
- **Performance**: Slightly slower but works reliably in all environments

---

## When to Use This Fix

Use bcryptjs if you see these errors in Vercel logs:
- "Cannot find module 'bcrypt'"
- "Error: Module did not self-register"
- "bcrypt native module error"
- Any bcrypt-related errors during login

---

## Current Status

- ✅ Code uses `bcrypt` (native module)
- ⚠️  If Vercel deployment fails, switch to `bcryptjs`
- ✅ All password hashes in database are compatible with both

---

## Testing After Switch

Run the test script:
```bash
node backend/test-login-after-deploy.js
```

Should show:
```
✅ Health Check: PASS
✅ Check User: PASS
✅ Login: PASS
✅ Password Reset: PASS
```
