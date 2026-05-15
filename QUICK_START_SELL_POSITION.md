# Quick Start: Sell Position Feature

## What You Got

✅ **Sell Position Modal** - Beautiful, premium UI for creating listings
✅ **Portfolio Integration** - Active positions with Sell buttons
✅ **Listing Management** - Generate codes and shareable links
✅ **Database Schema** - position_listings table ready
✅ **Success Flow** - Toast notifications and success states

## Setup (2 Steps)

### 1. Run Database Migration

Open Supabase SQL Editor and run:

```sql
CREATE TABLE IF NOT EXISTS position_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  listing_code VARCHAR(8) UNIQUE NOT NULL,
  asking_price BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'sold', 'cancelled')),
  buyer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sold_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT asking_price_positive CHECK (asking_price > 0)
);

CREATE INDEX idx_position_listings_position_id ON position_listings(position_id);
CREATE INDEX idx_position_listings_listing_code ON position_listings(listing_code);
CREATE INDEX idx_position_listings_status ON position_listings(status);
CREATE INDEX idx_position_listings_created_at ON position_listings(created_at DESC);

ALTER TABLE position_listings DISABLE ROW LEVEL SECURITY;
```

### 2. Test It

1. Place a forecast on any market
2. Go to Portfolio page
3. Click "Sell" button on your position
4. Enter asking price
5. Click "Create Listing"
6. See success state with listing code
7. Copy shareable link
8. Position moves to "Listed for Sale" section

## How It Works

### User Flow
```
Portfolio → Active Position → Click "Sell" → Modal Opens
→ Enter Asking Price → Create Listing → Success!
→ Get Listing Code + Shareable Link → Position Listed
```

### What Users See

**In Modal:**
- Market question and icon
- Entry price vs Current price
- Price change percentage
- Current value and P&L
- Asking price input
- Create listing button

**After Success:**
- Listing code (e.g., "A3K7M9P2")
- Shareable link
- Copy and Share buttons
- Success toast

**In Portfolio:**
- Position moves to "Listed for Sale"
- Shows listing code
- Shows asking price

## Key Features

### 🎨 Premium Design
- Matches your purple/charcoal theme
- Smooth animations (180ms)
- Mobile: Bottom sheet
- Desktop: Centered modal
- Backdrop blur effect

### 💰 Smart Pricing
- Pre-filled with current value
- Shows profit/loss
- Validates max 50% above value
- Prevents unrealistic pricing

### 🔗 Shareable Links
- Unique 8-character codes
- Format: `/listing/{code}`
- Copy to clipboard
- Native share on mobile

### 📊 Position Tracking
- Active positions section
- Listed positions section
- Real-time value updates
- P&L indicators

## What's Next?

This is the **seller-side foundation**. To complete the marketplace:

### Phase 2: Buyer Flow
- [ ] Create `/listing/{code}` page
- [ ] Add purchase button
- [ ] Implement position transfer
- [ ] Add payment processing

### Phase 3: Marketplace
- [ ] Browse all listings
- [ ] Search and filter
- [ ] Categories
- [ ] Featured listings

### Phase 4: Advanced
- [ ] Edit/cancel listings
- [ ] Offer system
- [ ] Analytics
- [ ] Notifications

## Files Added

```
event-horizon-forecasts-main/
├── src/
│   ├── lib/
│   │   └── positions.ts          ← Position types & functions
│   └── components/
│       └── SellPositionModal.tsx ← Sell modal component
```

## Files Modified

```
event-horizon-forecasts-main/
└── src/
    └── pages/
        └── Portfolio.tsx          ← Added positions display

backend/
└── supabase-schema.sql           ← Added position_listings table
```

## Testing Checklist

- [ ] Modal opens on Sell click
- [ ] Shows correct position data
- [ ] Price input works
- [ ] Validation prevents bad prices
- [ ] Listing creates successfully
- [ ] Success state shows code
- [ ] Copy link works
- [ ] Position moves to Listed section
- [ ] Toast notifications appear
- [ ] Mobile responsive
- [ ] Desktop layout correct

## Support

See `SELL_POSITION_FEATURE.md` for complete documentation.

---

**Time**: 30-40 minutes
**Status**: ✅ Ready to test
**Impact**: High - Enables position liquidity
