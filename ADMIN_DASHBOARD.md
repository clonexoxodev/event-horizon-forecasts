# Admin Dashboard Documentation

## Overview
Comprehensive admin dashboard for Flippe with full market management capabilities and role-based access control.

## Access Control

### Super Admin Emails
Only these email addresses have admin access:
- `fehintoluwaolu@gmail.com`
- `oluwasinaayomifetuga@gmail.com`

### Security Features
- ✅ Email-based authentication
- ✅ Automatic redirect for non-admin users
- ✅ Admin panel hidden from normal users
- ✅ Admin link only visible in More page for admins
- ✅ Route protection at page level

## Admin Capabilities

### 1. Create Market
Admins can create new markets with the following fields:

**Basic Information:**
- Market Question/Title (required)
- Category (Finance, Politics, Entertainment, Economy, Technology, Sports, Others)
- Country (Nigeria, United States, United Kingdom, Global, Others)
- Market Icon/Emoji

**Market Configuration:**
- Market Type: YES/NO or UP/DOWN
- Option 1 Label (default: YES)
- Option 2 Label (default: NO)
- Initial YES Probability (1-99%)
- Initial NO Probability (auto-calculated to sum to 100%)

**Timing:**
- Close Date (required)
- Close Time (required)
- Combined into ISO timestamp

**Resolution:**
- Resolution Source (required) - e.g., "CoinMarketCap", "Official Website"
- Market Description (required) - Detailed resolution criteria

**Status:**
- Draft: Not visible to users
- Active: Published immediately to homepage

### 2. Edit Market
Admins can edit existing markets:

**Editable Fields:**
- Market Question
- Category
- Status (draft, active, closed, resolved)
- Manual Price Adjustment (YES/NO probabilities)

**Read-Only Stats:**
- Total Pool
- Participants Count
- Creation Date
- Market ID

**Manual Price Override:**
- Admins can manually adjust YES/NO probabilities
- Overrides pool-based pricing
- Useful for market corrections or interventions

### 3. Close Market
- Prevents new forecasts from being placed
- Market remains visible
- Existing positions remain active
- Status changes to "closed"
- Confirmation required

### 4. Resolve Market
- Available only for closed markets
- Two resolution options:
  - Resolve as YES
  - Resolve as NO
- Triggers payout calculations
- Status changes to "resolved"
- **Cannot be undone** - confirmation required

### 5. Delete Market
- Permanently removes market
- Should only be used for test/spam markets
- Confirmation required
- **Use with caution**

### 6. View Market Activity
Each market displays:
- Total pool size
- Number of participants
- Current YES/NO prices
- Market status
- Creation date
- Market ID

## Dashboard Features

### Statistics Overview
Four key metrics displayed:
1. **Total Markets** - All markets in system
2. **Active** - Currently accepting forecasts
3. **Closed** - No new forecasts, awaiting resolution
4. **Resolved** - Completed markets

### Search & Filter
- **Search**: Find markets by question text
- **Status Filter**: Filter by draft, active, closed, resolved, or all

### Markets Table
Comprehensive table view with columns:
- Market (question + ID)
- Category
- Status (color-coded badges)
- Pool (total money)
- Participants (trader count)
- Prices (YES/NO percentages)
- Actions (edit, close, resolve, delete)

### Action Buttons
Color-coded for clarity:
- 🔵 **Edit** (Gray) - Modify market details
- 🟠 **Close** (Amber) - Stop accepting forecasts
- 🟢 **Resolve YES** (Green) - Mark outcome as YES
- 🔴 **Resolve NO** (Red) - Mark outcome as NO
- 🔴 **Delete** (Red) - Remove market

## Market Lifecycle

```
Draft → Active → Closed → Resolved
  ↓       ↓        ↓
Delete  Delete   Delete
```

### State Transitions

1. **Draft → Active**
   - Market becomes visible to users
   - Appears on homepage
   - Users can place forecasts

2. **Active → Closed**
   - No new forecasts accepted
   - Existing positions remain
   - Awaiting resolution

3. **Closed → Resolved**
   - Outcome determined (YES or NO)
   - Payouts calculated
   - Winners receive returns
   - **Cannot be reversed**

4. **Any State → Deleted**
   - Permanent removal
   - Use only for test/spam markets

## Market Creation Flow

### Step 1: Open Create Modal
Click "Create Market" button in admin dashboard

### Step 2: Fill Required Fields
- Market question
- Category
- Close date & time
- Resolution source
- Description

### Step 3: Configure Options
- Set market type (YES/NO or UP/DOWN)
- Customize option labels if needed
- Set initial probabilities (default 50/50)

### Step 4: Choose Status
- **Draft**: Save for later, not visible to users
- **Active**: Publish immediately

### Step 5: Submit
Market is created and appears in dashboard

## Market Editing Flow

### Step 1: Click Edit Icon
Find market in table, click edit button

### Step 2: View Current Stats
See read-only statistics:
- Total pool
- Participants
- Creation date

### Step 3: Make Changes
- Update question
- Change category
- Adjust status
- **Manual price override** if needed

### Step 4: Save Changes
Changes take effect immediately

## Manual Price Adjustment

Admins can override pool-based pricing:

### When to Use
- Market manipulation detected
- Pricing error correction
- Special circumstances
- Testing purposes

### How It Works
1. Open Edit Market modal
2. Scroll to "Manual Price Adjustment"
3. Enter new YES probability (1-99%)
4. NO probability auto-calculates
5. Save changes

### Important Notes
- Overrides automatic pool-based pricing
- Should be used sparingly
- Document reason for adjustment
- Users will see new prices immediately

## Market Resolution

### Prerequisites
- Market must be in "closed" status
- All forecasts must be finalized
- Outcome must be verified

### Resolution Process
1. Verify outcome from resolution source
2. Click appropriate resolve button (YES or NO)
3. Confirm resolution (cannot be undone)
4. System calculates payouts
5. Winners receive returns
6. Market status changes to "resolved"

### Payout Calculation
```
If outcome = YES:
  Winners = Users who forecasted YES
  Payout = (Stake / YES Pool) * Total Pool

If outcome = NO:
  Winners = Users who forecasted NO
  Payout = (Stake / NO Pool) * Total Pool
```

## Access Points

### For Admins
1. **More Page** - Shows "Admin Panel" option
2. **Direct URL** - `/admin`
3. **Navigation** - Admin link in More menu

### For Non-Admins
- Admin panel completely hidden
- No navigation links visible
- Direct URL access blocked (redirects to home)

## Security Considerations

### Email Verification
- Admin status checked on every page load
- Email comparison is case-insensitive
- Hardcoded admin emails in code

### Route Protection
- Admin page checks user authentication
- Redirects to login if not authenticated
- Redirects to home if not admin
- No data exposed to non-admins

### Future Enhancements
- Database-based role management
- Multiple admin levels (super admin, moderator)
- Admin activity logging
- Two-factor authentication
- IP whitelisting

## API Integration (TODO)

### Endpoints Needed

**Create Market:**
```
POST /api/admin/markets
Body: {
  question, category, country, marketType,
  yesLabel, noLabel, initialYesProb, initialNoProb,
  closeDateTime, resolutionSource, description,
  icon, status
}
```

**Update Market:**
```
PUT /api/admin/markets/:id
Body: {
  question, category, status,
  yesPrice, noPrice
}
```

**Close Market:**
```
POST /api/admin/markets/:id/close
```

**Resolve Market:**
```
POST /api/admin/markets/:id/resolve
Body: { outcome: "YES" | "NO" }
```

**Delete Market:**
```
DELETE /api/admin/markets/:id
```

**List Markets:**
```
GET /api/admin/markets
Query: { search?, status? }
```

## Database Schema Updates

### Markets Table
Add admin-related fields:
```sql
ALTER TABLE markets ADD COLUMN created_by TEXT;
ALTER TABLE markets ADD COLUMN updated_by TEXT;
ALTER TABLE markets ADD COLUMN manual_price_override BOOLEAN DEFAULT FALSE;
ALTER TABLE markets ADD COLUMN resolution_notes TEXT;
ALTER TABLE markets ADD COLUMN deleted_at TIMESTAMP;
```

### Admin Activity Log
Create new table:
```sql
CREATE TABLE admin_activity (
  id TEXT PRIMARY KEY,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  market_id TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Testing Checklist

### Access Control
- [ ] Non-admin users cannot access /admin
- [ ] Admin link hidden for non-admin users
- [ ] Admin link visible for admin users
- [ ] Direct URL access blocked for non-admins

### Market Creation
- [ ] All required fields validated
- [ ] Probabilities sum to 100%
- [ ] Date/time validation works
- [ ] Draft markets not visible to users
- [ ] Active markets appear on homepage

### Market Editing
- [ ] Changes save correctly
- [ ] Manual price override works
- [ ] Status changes take effect
- [ ] Read-only fields cannot be edited

### Market Actions
- [ ] Close market works
- [ ] Resolve YES works
- [ ] Resolve NO works
- [ ] Delete market works
- [ ] Confirmations appear for destructive actions

### Search & Filter
- [ ] Search finds markets by question
- [ ] Status filter works correctly
- [ ] Empty states display properly

## Troubleshooting

### Admin Access Issues
**Problem:** Admin user cannot access dashboard
**Solution:** 
1. Verify email matches exactly (case-insensitive)
2. Check user is logged in
3. Clear browser cache
4. Check console for errors

### Market Not Appearing
**Problem:** Created market doesn't show on homepage
**Solution:**
1. Check market status is "active"
2. Verify close date is in future
3. Check category filter
4. Refresh page

### Price Override Not Working
**Problem:** Manual price adjustment not taking effect
**Solution:**
1. Ensure probabilities sum to 100%
2. Check values are between 1-99%
3. Save changes after adjustment
4. Verify no pool-based pricing override

## Best Practices

### Market Creation
1. Write clear, unambiguous questions
2. Set realistic close dates
3. Specify reliable resolution sources
4. Provide detailed descriptions
5. Use appropriate categories

### Market Management
1. Close markets promptly when time expires
2. Verify outcomes before resolving
3. Document manual price adjustments
4. Use delete sparingly (only for spam/tests)
5. Monitor market activity regularly

### Resolution
1. Always verify from official source
2. Double-check outcome before resolving
3. Resolve promptly after close
4. Communicate delays to users
5. Document any disputes

## Future Features

### Planned Enhancements
- [ ] Bulk market operations
- [ ] Market templates
- [ ] Scheduled publishing
- [ ] Auto-resolution from APIs
- [ ] Market analytics dashboard
- [ ] User management panel
- [ ] Content moderation tools
- [ ] Automated market closure
- [ ] Resolution dispute system
- [ ] Admin activity audit log

### Advanced Features
- [ ] Market categories management
- [ ] Custom resolution criteria
- [ ] Multi-outcome markets
- [ ] Market bundles/series
- [ ] Featured markets
- [ ] Market recommendations
- [ ] A/B testing for markets
- [ ] Market performance analytics

## Support

For admin-related issues:
1. Check this documentation
2. Review console errors
3. Verify admin email access
4. Contact technical support

## Changelog

### v1.0.0 (Current)
- Initial admin dashboard release
- Market CRUD operations
- Role-based access control
- Search and filter functionality
- Manual price adjustment
- Market lifecycle management
