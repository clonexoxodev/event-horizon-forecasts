# Market Pricing Examples

## How Prices Change Based on Pool Distribution

### Example 1: Starting from Zero
```
Initial State:
├─ YES Pool: ₦0
├─ NO Pool: ₦0
├─ Total Pool: ₦0
├─ YES Price: 50%
└─ NO Price: 50%

User stakes ₦10,000 on YES:
├─ YES Pool: ₦10,000 ✨
├─ NO Pool: ₦0
├─ Total Pool: ₦10,000
├─ YES Price: 100% ⬆️
└─ NO Price: 0% ⬇️

Another user stakes ₦10,000 on NO:
├─ YES Pool: ₦10,000
├─ NO Pool: ₦10,000 ✨
├─ Total Pool: ₦20,000
├─ YES Price: 50% ⬇️
└─ NO Price: 50% ⬆️
```

### Example 2: Balanced Market
```
Current State:
├─ YES Pool: ₦50,000
├─ NO Pool: ₦50,000
├─ Total Pool: ₦100,000
├─ YES Price: 50%
└─ NO Price: 50%

User stakes ₦25,000 on YES:
├─ YES Pool: ₦75,000 ✨
├─ NO Pool: ₦50,000
├─ Total Pool: ₦125,000
├─ YES Price: 60% ⬆️ (+10%)
└─ NO Price: 40% ⬇️ (-10%)
```

### Example 3: Skewed Market
```
Current State:
├─ YES Pool: ₦80,000
├─ NO Pool: ₦20,000
├─ Total Pool: ₦100,000
├─ YES Price: 80%
└─ NO Price: 20%

User stakes ₦30,000 on NO:
├─ YES Pool: ₦80,000
├─ NO Pool: ₦50,000 ✨
├─ Total Pool: ₦130,000
├─ YES Price: 62% ⬇️ (-18%)
└─ NO Price: 38% ⬆️ (+18%)
```

### Example 4: Large Market
```
Current State:
├─ YES Pool: ₦500,000
├─ NO Pool: ₦300,000
├─ Total Pool: ₦800,000
├─ YES Price: 63%
└─ NO Price: 37%

User stakes ₦100,000 on YES:
├─ YES Pool: ₦600,000 ✨
├─ NO Pool: ₦300,000
├─ Total Pool: ₦900,000
├─ YES Price: 67% ⬆️ (+4%)
└─ NO Price: 33% ⬇️ (-4%)
```

## Price Impact Calculation

The price impact of a stake depends on:
1. **Stake size** - Larger stakes = bigger impact
2. **Current pool size** - Smaller pools = bigger impact
3. **Pool distribution** - More balanced = less impact

### Formula for Price Impact
```
New YES Price = round((yesPool + stake) / (totalPool + stake) * 100)
Price Impact = New YES Price - Current YES Price
```

### Impact Examples

#### Small Stake, Small Pool
```
₦5,000 stake on ₦20,000 pool = 25% increase → ~8% price change
```

#### Small Stake, Large Pool
```
₦5,000 stake on ₦500,000 pool = 1% increase → ~0.5% price change
```

#### Large Stake, Small Pool
```
₦50,000 stake on ₦20,000 pool = 250% increase → ~40% price change
```

#### Large Stake, Large Pool
```
₦50,000 stake on ₦500,000 pool = 10% increase → ~4% price change
```

## Visual Representation

### Market with 60% YES, 40% NO
```
YES ████████████░░░░░░░░ 60%  (₦120K)
NO  ████████░░░░░░░░░░░░ 40%  (₦80K)
    ────────────────────
    Total Pool: ₦200K
    Participants: 156
```

After ₦20K YES stake:
```
YES █████████████░░░░░░░ 64%  (₦140K) ⬆️
NO  ███████░░░░░░░░░░░░░ 36%  (₦80K)  ⬇️
    ────────────────────
    Total Pool: ₦220K
    Participants: 157
```

### Market with 25% YES, 75% NO
```
YES █████░░░░░░░░░░░░░░░ 25%  (₦25K)
NO  ███████████████░░░░░ 75%  (₦75K)
    ────────────────────
    Total Pool: ₦100K
    Participants: 89
```

After ₦25K YES stake:
```
YES ██████████░░░░░░░░░░ 40%  (₦50K)  ⬆️
NO  ████████████░░░░░░░░ 60%  (₦75K)  ⬇️
    ────────────────────
    Total Pool: ₦125K
    Participants: 90
```

## Animated Transitions

When prices update, users see:
- ✨ Smooth number animations (500ms)
- 📊 Progress bar sliding to new position (700ms)
- 👥 Participant count incrementing
- 💰 Pool size growing

Example animation sequence:
```
1. User clicks "YES — 60%"
2. Forecast slip opens
3. User enters ₦10,000
4. User confirms
5. Loading state (1.5s)
6. Success animation
7. Prices animate: 60% → 62% (smooth)
8. Pool animates: ₦200K → ₦210K
9. Participants: 156 → 157
```

## Edge Cases

### Case 1: First Forecast Ever
```
Before: 50% / 50% (no pool)
After:  100% / 0% (one-sided)
```

### Case 2: Extreme Imbalance
```
Before: 99% / 1%
After:  Still capped at reasonable range
```

### Case 3: Simultaneous Forecasts
```
User A stakes YES: 60% → 62%
User B stakes NO:  62% → 60%
Result: Smooth animation through both changes
```

## Benefits

1. **Fair Pricing** - Reflects actual market sentiment
2. **Dynamic** - Updates in real-time
3. **Transparent** - Users see exact pool distribution
4. **Smooth** - Animated transitions prevent jarring changes
5. **Simple** - Easy to understand formula
