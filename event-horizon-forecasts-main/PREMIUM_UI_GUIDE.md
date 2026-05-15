# Flippe Premium UI Design System

## 🎨 Design Philosophy

**Premium Fintech | Clean | Modern | Institutional | Soft Minimalism**

Flippe's UI should feel handcrafted, trustworthy, and premium—like a product from Stripe, Robinhood, or Coinbase.

---

## 🎯 Color System

### Primary Colors
```css
Purple (Primary):     hsl(271, 70%, 60%)  /* #9D5BD2 */
Purple Soft:          hsl(271, 70%, 95%)  /* #F5EDFC */
```

### Secondary Colors
```css
Charcoal (Text):      hsl(220, 13%, 18%)  /* #272B33 */
Graphite (Muted):     hsl(220, 9%, 46%)   /* #6B7280 */
Off-White (BG):       hsl(30, 18%, 97%)   /* #FAF9F7 */
```

### Market Colors (YES/NO ONLY)
```css
Emerald (YES):        hsl(142, 50%, 45%)  /* #3AAA6F */
Emerald Soft:         hsl(142, 50%, 95%)  /* #E8F7EF */

Coral (NO):           hsl(350, 70%, 55%)  /* #E84855 */
Coral Soft:           hsl(350, 70%, 95%)  /* #FDE8EA */
```

### ⚠️ Color Rules

**DO use green/red for:**
- ✅ YES market positions
- ✅ NO market positions
- ✅ Market outcome indicators
- ✅ Position profit/loss

**DO NOT use green/red for:**
- ❌ Deposit buttons (use purple)
- ❌ Withdraw buttons (use purple or neutral)
- ❌ Dashboard cards (use purple/neutral)
- ❌ Success/error states (use purple/neutral)

---

## 📐 Spacing System

**Base: 4px**

```css
0.5 = 2px    4  = 16px   10 = 40px
1   = 4px    5  = 20px   12 = 48px
1.5 = 6px    6  = 24px   14 = 56px
2   = 8px    7  = 28px   16 = 64px
2.5 = 10px   8  = 32px   20 = 80px
3   = 12px   9  = 36px   24 = 96px
```

**Consistent Spacing:**
- Card padding: `p-6` (24px) or `p-8` (32px)
- Section spacing: `py-12` (48px) or `py-16` (64px)
- Element gaps: `gap-4` (16px) or `gap-6` (24px)
- Button padding: `px-6 py-3` (24px × 12px)

---

## 🔤 Typography

**Font:** Inter (Variable)

### Scale
```css
xs:   11px  (uppercase labels, badges)
sm:   13px  (secondary text, captions)
base: 15px  (body text, default)
md:   16px  (emphasized body)
lg:   18px  (subheadings)
xl:   20px  (card titles)
2xl:  24px  (section headings)
3xl:  30px  (page headings)
4xl:  36px  (hero headings)
```

### Weights
```css
400: Regular (body text)
500: Medium  (emphasized text)
600: Semibold (headings, buttons)
700: Bold (hero text, numbers)
800: Extrabold (display text)
```

### Hierarchy
```tsx
// Page Title
<h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-charcoal">

// Section Heading
<h2 className="text-2xl font-bold text-charcoal">

// Card Title
<h3 className="text-xl font-semibold text-charcoal">

// Body Text
<p className="text-base text-graphite leading-relaxed">

// Small Text
<span className="text-sm text-graphite">

// Label
<label className="text-xs font-semibold uppercase tracking-wider text-graphite">
```

---

## 🎴 Cards & Containers

### Standard Card
```tsx
<div className="bg-white rounded-xl p-6 border border-graphite/10 shadow-card">
  {/* content */}
</div>
```

### Elevated Card (hover)
```tsx
<div className="bg-white rounded-xl p-6 border border-graphite/10 shadow-card hover:shadow-elevated transition-normal">
  {/* content */}
</div>
```

### Interactive Card
```tsx
<button className="bg-white rounded-xl p-6 border border-graphite/10 shadow-card hover:shadow-elevated hover:-translate-y-0.5 transition-normal text-left w-full">
  {/* content */}
</button>
```

### Glass Card
```tsx
<div className="glass rounded-xl p-6 border border-white/20 shadow-elevated">
  {/* content */}
</div>
```

---

## 🔘 Buttons

### Primary Button
```tsx
<button className="px-6 py-3 rounded-xl bg-purple text-white font-semibold shadow-sm hover:bg-purple/90 hover:shadow-md transition-fast">
  Primary Action
</button>
```

### Secondary Button
```tsx
<button className="px-6 py-3 rounded-xl bg-white text-charcoal font-semibold border border-graphite/20 hover:border-graphite/30 hover:bg-graphite/5 transition-fast">
  Secondary Action
</button>
```

### Ghost Button
```tsx
<button className="px-4 py-2 rounded-lg text-graphite font-medium hover:bg-graphite/5 hover:text-charcoal transition-fast">
  Ghost Action
</button>
```

### Icon Button
```tsx
<button className="w-10 h-10 rounded-xl grid place-items-center text-graphite hover:text-charcoal hover:bg-graphite/5 transition-fast">
  <Icon className="w-5 h-5" />
</button>
```

### YES Button (Market)
```tsx
<button className="px-6 py-3 rounded-xl bg-emerald text-white font-semibold shadow-sm hover:bg-emerald/90 hover:shadow-md transition-fast">
  Buy YES
</button>
```

### NO Button (Market)
```tsx
<button className="px-6 py-3 rounded-xl bg-coral text-white font-semibold shadow-sm hover:bg-coral/90 hover:shadow-md transition-fast">
  Buy NO
</button>
```

---

## 🎭 Shadows

```css
xs:       0 1px 2px rgba(0,0,0,0.04)
sm:       0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)
card:     0 2px 4px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)
elevated: 0 8px 16px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.03)
modal:    0 24px 48px rgba(0,0,0,0.10), 0 8px 16px rgba(0,0,0,0.06)
```

**Usage:**
- Default cards: `shadow-card`
- Hover states: `hover:shadow-elevated`
- Modals/dialogs: `shadow-modal`
- Buttons: `shadow-sm`

---

## 📏 Border Radius

```css
sm:   8px   (small elements, badges)
md:   12px  (buttons, inputs)
lg:   16px  (cards, containers)
xl:   20px  (large cards, modals)
full: 9999px (pills, avatars)
```

**Consistency:**
- Cards: `rounded-xl` (16px)
- Buttons: `rounded-xl` (16px)
- Inputs: `rounded-lg` (12px)
- Badges: `rounded-lg` (12px)

---

## ⚡ Transitions

```css
micro:  120ms (icon rotations, small changes)
fast:   180ms (buttons, hover states)
normal: 280ms (cards, modals)
slow:   400ms (page transitions)
```

**Easing:** `cubic-bezier(0.4, 0, 0.2, 1)`

**Usage:**
```tsx
// Fast (buttons, icons)
className="transition-fast"

// Normal (cards, containers)
className="transition-normal"

// Smooth (all properties)
className="transition-smooth"
```

---

## 🎨 Icon System

**Use Lucide React exclusively** for consistency.

### Icon Sizes
```tsx
// Small (inline with text)
<Icon className="w-4 h-4" />

// Medium (buttons, cards)
<Icon className="w-5 h-5" />

// Large (feature cards)
<Icon className="w-6 h-6" />

// Extra Large (empty states)
<Icon className="w-8 h-8" />
```

### Icon Colors
```tsx
// Default
<Icon className="w-5 h-5 text-graphite" />

// Active
<Icon className="w-5 h-5 text-charcoal" />

// Primary
<Icon className="w-5 h-5 text-purple" />

// YES
<Icon className="w-5 h-5 text-emerald" />

// NO
<Icon className="w-5 h-5 text-coral" />
```

---

## 🎯 Common Patterns

### Market Card
```tsx
<div className="bg-white rounded-xl p-6 border border-graphite/10 shadow-card hover:shadow-elevated hover:-translate-y-0.5 transition-normal">
  <div className="flex items-start justify-between mb-4">
    <span className="px-3 py-1 rounded-lg bg-purple/10 text-purple text-xs font-semibold">
      Politics
    </span>
    <span className="text-sm text-graphite">2d left</span>
  </div>
  <h3 className="text-lg font-semibold text-charcoal mb-3 leading-snug">
    Will Bitcoin reach $100k by end of 2024?
  </h3>
  <div className="flex items-center gap-4">
    <div className="flex-1">
      <div className="text-xs text-graphite mb-1">YES</div>
      <div className="text-xl font-bold text-emerald">65%</div>
    </div>
    <div className="flex-1">
      <div className="text-xs text-graphite mb-1">NO</div>
      <div className="text-xl font-bold text-coral">35%</div>
    </div>
  </div>
</div>
```

### Stat Card
```tsx
<div className="bg-white rounded-xl p-6 border border-graphite/10 shadow-card">
  <div className="flex items-center gap-3 mb-2">
    <div className="w-10 h-10 rounded-xl bg-purple/10 grid place-items-center">
      <Icon className="w-5 h-5 text-purple" />
    </div>
    <span className="text-sm font-medium text-graphite">Total Value</span>
  </div>
  <div className="text-3xl font-bold text-charcoal">₦125.5K</div>
  <div className="text-sm text-graphite mt-1">+12.5% this month</div>
</div>
```

### Input Field
```tsx
<div>
  <label className="block text-sm font-medium text-charcoal mb-2">
    Amount
  </label>
  <input
    type="number"
    className="w-full px-4 py-3 rounded-lg border border-graphite/20 bg-white text-charcoal placeholder:text-graphite/50 focus:border-purple focus:ring-4 focus:ring-purple/10 transition-fast"
    placeholder="Enter amount"
  />
</div>
```

---

## ✅ Do's

- ✅ Use consistent spacing (4px base)
- ✅ Use Lucide icons exclusively
- ✅ Use purple for primary actions
- ✅ Use green/red ONLY for YES/NO
- ✅ Use subtle shadows
- ✅ Use smooth transitions
- ✅ Use proper typography hierarchy
- ✅ Use rounded-xl for cards
- ✅ Use proper hover states
- ✅ Use semantic HTML

## ❌ Don'ts

- ❌ Mix icon libraries
- ❌ Use green/red for deposit/withdraw
- ❌ Use harsh shadows
- ❌ Use inconsistent spacing
- ❌ Use too many colors
- ❌ Use sharp corners (< 8px)
- ❌ Skip hover states
- ❌ Use poor contrast
- ❌ Use generic layouts
- ❌ Use weak typography

---

## 🚀 Implementation Checklist

- [ ] Replace all icon libraries with Lucide
- [ ] Update all button styles
- [ ] Fix spacing inconsistencies
- [ ] Update card styles
- [ ] Improve hover states
- [ ] Fix color usage (green/red)
- [ ] Update typography
- [ ] Add proper shadows
- [ ] Improve transitions
- [ ] Polish empty states

---

**Remember:** Every pixel matters. Flippe should feel premium, trustworthy, and handcrafted.
