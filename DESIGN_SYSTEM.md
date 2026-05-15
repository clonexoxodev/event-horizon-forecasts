# Flippe Design System

## Brand Colors

### Primary Colors

**Charcoal (Main Text)**
```
Color: hsl(220, 13%, 18%)
Usage: Primary text, headings, important content
Class: text-charcoal
```

**Flippe Purple (Brand Accent)**
```
Color: hsl(271, 70%, 60%)
Usage: Primary buttons, links, brand elements, active states
Class: bg-purple, text-purple, border-purple
Soft variant: hsl(271, 70%, 95%) - bg-purple-soft
```

**Graphite (Secondary Text)**
```
Color: hsl(220, 9%, 46%)
Usage: Secondary text, labels, placeholders, muted content
Class: text-graphite
```

**Off-White (Background)**
```
Color: hsl(30, 18%, 97%)
Usage: Card backgrounds, elevated surfaces
Class: bg-off-white
```

### Action Colors

**Emerald (YES/UP Only)**
```
Color: hsl(142, 50%, 45%)
Usage: ONLY for YES or UP forecast actions
Class: bg-emerald, text-emerald
Soft variant: hsl(142, 50%, 95%) - bg-emerald-soft
```

**Coral (NO/DOWN Only)**
```
Color: hsl(350, 70%, 55%)
Usage: ONLY for NO or DOWN forecast actions
Class: bg-coral, text-coral
Soft variant: hsl(350, 70%, 95%) - bg-coral-soft
```

## Color Usage Rules

### ✅ Correct Usage

**YES/NO Forecast Buttons:**
```tsx
// YES button
<Button className="bg-emerald text-white">
  YES — 60%
</Button>

// NO button
<Button className="bg-coral text-white">
  NO — 40%
</Button>
```

**Deposit/Withdraw Buttons:**
```tsx
// Deposit - Use brand purple
<Button className="bg-purple text-white">
  Deposit
</Button>

// Withdraw - Use neutral outline
<Button variant="outline" className="border-graphite/20 text-charcoal">
  Withdraw
</Button>
```

**Primary Actions:**
```tsx
// Use brand purple for primary actions
<Button className="bg-purple text-white">
  Create Market
</Button>

<Button className="bg-purple text-white">
  Confirm Forecast
</Button>
```

**Secondary Actions:**
```tsx
// Use neutral outline for secondary actions
<Button variant="outline" className="border-graphite/20 text-charcoal">
  Cancel
</Button>
```

### ❌ Incorrect Usage

**Don't use green/red for deposit/withdraw:**
```tsx
// WRONG - Don't use green for deposit
<Button className="bg-emerald">Deposit</Button>

// WRONG - Don't use red for withdraw
<Button className="bg-coral">Withdraw</Button>
```

**Don't use green/red for generic actions:**
```tsx
// WRONG - Green/red are only for YES/NO
<Button className="bg-emerald">Save</Button>
<Button className="bg-coral">Delete</Button>
```

## Typography

### Font Family
```css
font-family: 'Inter', system-ui, sans-serif
```

### Font Sizes

| Size | Class | Usage |
|------|-------|-------|
| 32px | text-h1 | Page titles |
| 24px | text-h2 | Section headings |
| 18px | text-h3 | Card titles |
| 16px | text-h4 | Subsection headings |
| 14px | text-body | Body text (default) |
| 12px | text-small | Small text, captions |
| 11px | text-tiny | Labels, badges (uppercase) |

### Font Weights

| Weight | Class | Usage |
|--------|-------|-------|
| 700 | font-extrabold | Page titles, important numbers |
| 600 | font-semibold | Headings, buttons, labels |
| 400 | font-normal | Body text, descriptions |

## Spacing

### Container Padding
```tsx
<div className="container py-10 px-6">
  {/* Content */}
</div>
```

### Card Spacing
```tsx
<div className="p-6 space-y-6">
  {/* Card content */}
</div>
```

### Grid Gaps
```tsx
// Small gap
<div className="grid gap-3">

// Medium gap
<div className="grid gap-4">

// Large gap
<div className="grid gap-6">
```

## Shadows

### Shadow Levels

**Extra Small (xs)**
```
Usage: Subtle elevation
Class: shadow-xs
```

**Small (sm)**
```
Usage: Buttons, small cards
Class: shadow-sm
```

**Card**
```
Usage: Main cards, panels
Class: shadow-card
```

**Elevated**
```
Usage: Dropdowns, popovers, hover states
Class: shadow-elevated
```

**Modal**
```
Usage: Modals, dialogs
Class: shadow-modal
```

## Border Radius

| Size | Class | Usage |
|------|-------|-------|
| 8px | rounded-sm | Small elements |
| 12px | rounded-md | Buttons, inputs |
| 16px | rounded-lg | Cards, panels |
| 20px | rounded-xl | Large cards |
| 9999px | rounded-full | Pills, badges, avatars |

## Transitions

### Duration

| Speed | Class | Usage |
|-------|-------|-------|
| 120ms | transition-micro | Hover states |
| 180ms | transition-fast | Button clicks |
| 280ms | transition-normal | Default |
| 400ms | transition-slow | Complex animations |

### Timing Function
```
cubic-bezier(0.4, 0, 0.2, 1) - smooth
```

## Component Patterns

### Primary Button
```tsx
<Button className="bg-purple hover:bg-purple/90 text-white font-semibold rounded-xl shadow-sm transition-fast hover:scale-[1.02] active:scale-[0.98]">
  Primary Action
</Button>
```

### Secondary Button
```tsx
<Button variant="outline" className="border-graphite/20 text-charcoal hover:bg-graphite/5 font-semibold rounded-xl transition-fast">
  Secondary Action
</Button>
```

### YES Button
```tsx
<Button className="bg-emerald hover:bg-emerald/90 text-white font-bold rounded-xl transition-fast">
  <TrendingUp className="w-4 h-4 mr-2" />
  YES — 60%
</Button>
```

### NO Button
```tsx
<Button className="bg-coral hover:bg-coral/90 text-white font-bold rounded-xl transition-fast">
  <TrendingUp className="w-4 h-4 rotate-180 mr-2" />
  NO — 40%
</Button>
```

### Card
```tsx
<div className="bg-off-white rounded-2xl p-6 shadow-card border border-graphite/10">
  {/* Card content */}
</div>
```

### Badge
```tsx
// Status badge
<span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-graphite/10 text-graphite border border-graphite/20">
  Active
</span>

// YES badge
<span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-soft text-emerald">
  YES
</span>

// NO badge
<span className="text-xs font-bold px-2 py-0.5 rounded-full bg-coral-soft text-coral">
  NO
</span>
```

### Input
```tsx
<Input
  placeholder="Enter amount..."
  className="h-12 rounded-xl border-2 focus:border-purple transition-fast"
/>
```

### Progress Bar
```tsx
<div className="h-3 rounded-full bg-coral-soft overflow-hidden">
  <div
    className="h-full bg-emerald rounded-full transition-all duration-700"
    style={{ width: `${yesPercent}%` }}
  />
</div>
```

## State Colors

### Active State
```tsx
className="bg-purple/10 text-purple"
```

### Hover State
```tsx
className="hover:bg-graphite/5 hover:text-charcoal"
```

### Disabled State
```tsx
className="opacity-50 cursor-not-allowed"
```

### Loading State
```tsx
<div className="animate-shimmer bg-graphite/10" />
```

## Icon Sizes

| Size | Class | Usage |
|------|-------|-------|
| 12px | w-3 h-3 | Tiny icons in badges |
| 16px | w-4 h-4 | Standard icons in buttons |
| 20px | w-5 h-5 | Icons in headers |
| 24px | w-6 h-6 | Large icons |

## Animations

### Fade In
```tsx
className="animate-fade-in"
```

### Fade Up
```tsx
className="animate-fade-up"
style={{ animationDelay: `${index * 30}ms` }}
```

### Shimmer (Loading)
```tsx
className="animate-shimmer"
```

### Pulse
```tsx
className="animate-pulse"
```

### Scale on Hover
```tsx
className="hover:scale-[1.02] active:scale-[0.98] transition-fast"
```

## Layout Patterns

### Page Container
```tsx
<div className="min-h-screen flex flex-col bg-background pb-20 md:pb-0">
  <Header />
  <main className="flex-1 container py-10 max-w-4xl">
    {/* Page content */}
  </main>
  <Footer />
  <MobileNav />
</div>
```

### Two Column Grid
```tsx
<div className="grid lg:grid-cols-2 gap-6">
  {/* Columns */}
</div>
```

### Three Column Grid
```tsx
<div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Columns */}
</div>
```

### Stats Grid
```tsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Stat cards */}
</div>
```

## Responsive Design

### Breakpoints
```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1400px
```

### Mobile-First Approach
```tsx
// Mobile: 2 columns, Desktop: 4 columns
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

// Hide on mobile, show on desktop
<div className="hidden md:block">

// Show on mobile, hide on desktop
<div className="md:hidden">
```

## Accessibility

### Focus States
```tsx
className="focus:outline-none focus:ring-2 focus:ring-purple focus:ring-offset-2"
```

### ARIA Labels
```tsx
<button aria-label="Close modal">
  <X className="w-4 h-4" />
</button>
```

### Keyboard Navigation
- All interactive elements must be keyboard accessible
- Use proper semantic HTML (button, a, input)
- Maintain logical tab order

## Best Practices

### Do's ✅
- Use brand purple for primary actions
- Use emerald ONLY for YES/UP forecasts
- Use coral ONLY for NO/DOWN forecasts
- Use neutral colors for deposit/withdraw
- Maintain consistent spacing
- Use smooth transitions
- Follow mobile-first approach
- Use semantic HTML

### Don'ts ❌
- Don't use green/red for deposit/withdraw
- Don't mix random colors
- Don't use inconsistent spacing
- Don't skip hover/focus states
- Don't use inline styles (use Tailwind)
- Don't ignore mobile responsiveness
- Don't use non-semantic HTML

## Color Palette Summary

| Color | Hex | Usage |
|-------|-----|-------|
| Charcoal | #2D3142 | Main text |
| Graphite | #6B7280 | Secondary text |
| Purple | #A855F7 | Brand accent, primary actions |
| Purple Soft | #F3E8FF | Purple backgrounds |
| Emerald | #10B981 | YES/UP only |
| Emerald Soft | #D1FAE5 | YES backgrounds |
| Coral | #EF4444 | NO/DOWN only |
| Coral Soft | #FEE2E2 | NO backgrounds |
| Off-White | #FAF9F7 | Card backgrounds |
| White | #FFFFFF | Page background |

## Implementation Checklist

- [x] Brand colors defined in Tailwind config
- [x] Typography system established
- [x] Shadow system implemented
- [x] Border radius standardized
- [x] Transition timing defined
- [x] Component patterns documented
- [x] Deposit/Withdraw buttons use brand colors
- [x] YES/NO buttons use green/red only
- [x] Consistent spacing throughout
- [x] Mobile-responsive design
- [x] Smooth animations
- [x] Accessibility features

## Maintenance

### Adding New Colors
1. Add to `tailwind.config.ts`
2. Document usage in this file
3. Update component patterns
4. Test across all pages

### Updating Components
1. Follow existing patterns
2. Use design system colors
3. Maintain consistency
4. Test responsiveness
5. Check accessibility

## Support

For design questions or inconsistencies:
1. Check this documentation
2. Review existing components
3. Follow established patterns
4. Maintain brand consistency
