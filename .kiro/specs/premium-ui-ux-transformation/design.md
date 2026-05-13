# Design Document: Premium UI/UX Transformation

## Overview

This design document specifies the technical approach for transforming Event Horizon Forecasts (Flippe) into a premium prediction platform with world-class UI/UX. The transformation focuses on enhancing existing components through a comprehensive design system, refined interaction patterns, and sophisticated visual treatments.

### Design Philosophy

The premium transformation follows these core principles:

1. **Sophistication over Flash**: Use subtle, refined visual treatments rather than bright, attention-grabbing effects
2. **Clarity through Hierarchy**: Establish clear visual relationships through typography, spacing, and color
3. **Responsive Fluidity**: Ensure seamless adaptation across all device sizes with mobile-first thinking
4. **Interaction Delight**: Provide smooth, purposeful animations that enhance rather than distract
5. **Trust through Polish**: Every detail contributes to a sense of professionalism and reliability

### Scope

This design enhances the existing React + TypeScript + TailwindCSS application without changing the underlying architecture. The transformation includes:

- Design system foundation (colors, typography, spacing, shadows)
- Component enhancements (MarketCard, Header, Footer, PredictionPanel)
- Interaction patterns (hover states, transitions, animations)
- Responsive behavior (mobile-first layouts, breakpoints)
- Accessibility compliance (WCAG AA standards)


## Architecture

### System Architecture

The premium UI/UX transformation operates at the presentation layer, enhancing the existing component architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Design System│  │  Components  │  │  Animations  │      │
│  │   (Tokens)   │  │  (Enhanced)  │  │   (System)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    Pages     │  │    Hooks     │  │     API      │      │
│  │  (Existing)  │  │  (Existing)  │  │  (Existing)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Design System Architecture

The design system is implemented through three layers:

1. **Token Layer**: CSS custom properties defining primitive values (colors, spacing, typography)
2. **Component Layer**: React components consuming tokens with enhanced styling
3. **Pattern Layer**: Reusable interaction patterns and animations

### Technology Stack

- **Framework**: React 18 with TypeScript
- **Styling**: TailwindCSS 3.x with custom configuration
- **Animations**: CSS transitions + TailwindCSS animate plugin
- **Icons**: Lucide React
- **Routing**: React Router v6
- **State**: React Context (existing auth system)


## Components and Interfaces

### Design System Foundation

#### Color Palette

The premium color palette uses sophisticated, muted tones that convey trust and professionalism:

```css
/* Primary Colors */
--color-charcoal: hsl(220, 13%, 18%);        /* Soft dark charcoal */
--color-graphite: hsl(220, 9%, 46%);         /* Warm graphite */
--color-off-white: hsl(30, 18%, 97%);        /* Elegant off-white */
--color-purple: hsl(271, 70%, 60%);          /* Subtle purple (brand) */

/* Prediction Colors */
--color-emerald: hsl(142, 50%, 45%);         /* Muted emerald (YES) */
--color-emerald-soft: hsl(142, 50%, 95%);    /* Emerald background */
--color-coral: hsl(350, 70%, 55%);           /* Muted coral (NO) */
--color-coral-soft: hsl(350, 70%, 95%);      /* Coral background */

/* Semantic Colors */
--color-border: hsl(220, 13%, 91%);          /* Subtle borders */
--color-muted: hsl(220, 9%, 65%);            /* Muted text */
```

**TailwindCSS Configuration**:

```typescript
// tailwind.config.ts
colors: {
  charcoal: 'hsl(220, 13%, 18%)',
  graphite: 'hsl(220, 9%, 46%)',
  'off-white': 'hsl(30, 18%, 97%)',
  purple: {
    DEFAULT: 'hsl(271, 70%, 60%)',
    soft: 'hsl(271, 70%, 95%)',
  },
  emerald: {
    DEFAULT: 'hsl(142, 50%, 45%)',
    soft: 'hsl(142, 50%, 95%)',
  },
  coral: {
    DEFAULT: 'hsl(350, 70%, 55%)',
    soft: 'hsl(350, 70%, 95%)',
  },
}
```


#### Typography System

The typography system uses Inter font with a clear 5-level hierarchy:

```css
/* Typography Scale */
--font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Heading Levels */
--text-h1: 32px;    /* Page titles */
--text-h2: 24px;    /* Section headings */
--text-h3: 18px;    /* Card titles */
--text-h4: 16px;    /* Subsection headings */
--text-body: 14px;  /* Body text, minimum size */
--text-small: 12px; /* Labels, captions */
--text-tiny: 11px;  /* Uppercase labels */

/* Font Weights */
--font-regular: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;

/* Line Heights */
--leading-tight: 1.2;   /* Headings */
--leading-normal: 1.5;  /* Body text */
--leading-relaxed: 1.7; /* Long-form content */

/* Letter Spacing */
--tracking-tight: -0.02em;  /* Large headings */
--tracking-normal: 0;       /* Body text */
--tracking-wide: 0.05em;    /* Uppercase labels */
```

**TailwindCSS Configuration**:

```typescript
// tailwind.config.ts
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
},
fontSize: {
  'h1': ['32px', { lineHeight: '1.2', fontWeight: '700' }],
  'h2': ['24px', { lineHeight: '1.2', fontWeight: '600' }],
  'h3': ['18px', { lineHeight: '1.2', fontWeight: '600' }],
  'h4': ['16px', { lineHeight: '1.2', fontWeight: '600' }],
  'body': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
  'small': ['12px', { lineHeight: '1.5', fontWeight: '400' }],
  'tiny': ['11px', { lineHeight: '1.5', fontWeight: '600', letterSpacing: '0.05em' }],
}
```


#### Spacing System

The spacing system uses 4px increments for consistent rhythm:

```css
/* Spacing Scale (4px base) */
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

**Usage Guidelines**:
- **4px (space-1)**: Icon padding, tight spacing
- **8px (space-2)**: Small gaps between related elements
- **12px (space-3)**: Navigation item spacing
- **16px (space-4)**: Card internal padding, standard gaps
- **24px (space-6)**: Section spacing within components
- **32px (space-8)**: Spacing between distinct sections
- **48px+ (space-12+)**: Major page sections

#### Shadow and Elevation System

Shadows create depth without appearing heavy:

```css
/* Shadow Levels */
--shadow-card: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03);
--shadow-elevated: 0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
--shadow-modal: 0 20px 40px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.08);
```

**TailwindCSS Configuration**:

```typescript
// tailwind.config.ts
boxShadow: {
  'card': '0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03)',
  'elevated': '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)',
  'modal': '0 20px 40px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.08)',
}
```

#### Border Radius Standards

Consistent corner rounding creates visual cohesion:

```css
/* Border Radius */
--radius-sm: 8px;   /* Small elements, chips */
--radius-md: 12px;  /* Buttons, inputs */
--radius-lg: 16px;  /* Cards, panels */
--radius-xl: 20px;  /* Large containers */
--radius-full: 9999px; /* Pills, avatars */
```


### Enhanced MarketCard Component

The MarketCard is the primary browsing interface, requiring careful balance of information density and visual appeal.

#### Component Structure

```tsx
<Link to={`/market/${id}`} className="market-card">
  {/* Header: Icon + Category */}
  <div className="market-card-header">
    <div className="market-icon">{icon}</div>
    <span className="category-badge">{category}</span>
  </div>

  {/* Question */}
  <h3 className="market-question">{question}</h3>

  {/* Probability Visualization */}
  <div className="probability-section">
    <div className="probability-labels">
      <span className="yes-label">YES {yesPercent}%</span>
      <span className="no-label">NO {noPercent}%</span>
    </div>
    <div className="probability-bar">
      <div className="yes-fill" style={{width: `${yesPercent}%`}} />
    </div>
  </div>

  {/* Action Buttons */}
  <div className="action-buttons">
    <button className="yes-button">YES · {yesPercent}%</button>
    <button className="no-button">NO · {noPercent}%</button>
  </div>

  {/* Footer: Stats */}
  <div className="market-stats">
    <span className="pool-stat">{pool}</span>
    <span className="traders-stat">{traders}</span>
    <span className="time-stat">{closesIn}</span>
  </div>
</Link>
```

#### Styling Specifications

```css
.market-card {
  /* Base */
  background: hsl(30, 18%, 97%);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid hsl(220, 13%, 91%, 0.5);
  box-shadow: var(--shadow-card);
  
  /* Hover State */
  transition: all 180ms cubic-bezier(0.4, 0, 0.2, 1);
}

.market-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-elevated);
  border-color: hsl(220, 13%, 91%);
}

.market-card:active {
  transform: translateY(-2px) scale(0.99);
}

/* Icon Container */
.market-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: hsl(220, 9%, 46%, 0.1);
  display: grid;
  place-items: center;
  font-size: 24px;
}

/* Question */
.market-question {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  color: hsl(220, 13%, 18%);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 44px;
}

/* Probability Bar */
.probability-bar {
  height: 8px;
  border-radius: 9999px;
  background: hsl(350, 70%, 95%);
  overflow: hidden;
}

.yes-fill {
  height: 100%;
  background: hsl(142, 50%, 45%);
  border-radius: 9999px;
  transition: width 700ms cubic-bezier(0.4, 0, 0.2, 1);
}
```


#### Action Button Specifications

```css
/* YES Button */
.yes-button {
  background: hsl(142, 50%, 95%);
  color: hsl(142, 50%, 45%);
  border: 1px solid hsl(142, 50%, 45%, 0.2);
  border-radius: 12px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 700;
  transition: all 180ms cubic-bezier(0.4, 0, 0.2, 1);
}

.yes-button:hover {
  background: hsl(142, 50%, 45%);
  color: white;
  border-color: hsl(142, 50%, 45%);
}

.yes-button:active {
  transform: scale(0.95);
}

/* NO Button */
.no-button {
  background: hsl(350, 70%, 95%);
  color: hsl(350, 70%, 55%);
  border: 1px solid hsl(350, 70%, 55%, 0.2);
  border-radius: 12px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 700;
  transition: all 180ms cubic-bezier(0.4, 0, 0.2, 1);
}

.no-button:hover {
  background: hsl(350, 70%, 55%);
  color: white;
  border-color: hsl(350, 70%, 55%);
}

.no-button:active {
  transform: scale(0.95);
}
```

#### Category Badge Styling

```typescript
const categoryColors = {
  Finance: 'bg-blue-50 text-blue-600 border-blue-200',
  Politics: 'bg-amber-50 text-amber-600 border-amber-200',
  Trending: 'bg-rose-50 text-rose-600 border-rose-200',
  Entertainment: 'bg-purple-50 text-purple-600 border-purple-200',
  Economy: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  Technology: 'bg-sky-50 text-sky-600 border-sky-200',
  Others: 'bg-gray-50 text-gray-600 border-gray-200',
};
```

```css
.category-badge {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 10px;
  border-radius: 9999px;
  border: 1px solid;
}
```


### Premium Header Component

The header provides navigation, search, and user controls with refined styling.

#### Component Structure

```tsx
<header className="header">
  <div className="header-container">
    {/* Logo */}
    <Link to="/" className="logo">
      Flippe<span className="logo-dot">.</span>
    </Link>

    {/* Search Bar (Desktop) */}
    <div className="search-container">
      <SearchIcon />
      <input placeholder="Search markets..." />
    </div>

    {/* Navigation & User Controls */}
    <nav className="nav-controls">
      {user ? (
        <>
          <div className="balance-chip">{balance}</div>
          <NavLink to="/notifications" className="nav-icon">
            <BellIcon />
            <span className="notification-dot" />
          </NavLink>
          <NavLink to="/wallet" className="nav-link">Wallet</NavLink>
          <NavLink to="/portfolio" className="nav-link">Portfolio</NavLink>
          <NavLink to="/dashboard" className="nav-link">Dashboard</NavLink>
          <NavLink to="/profile" className="avatar">
            <UserIcon />
          </NavLink>
        </>
      ) : (
        <>
          <Link to="/login" className="nav-link">Log in</Link>
          <Link to="/signup" className="signup-button">Sign up free</Link>
        </>
      )}
    </nav>
  </div>
</header>
```

#### Styling Specifications

```css
.header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: hsla(30, 18%, 97%, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid hsl(220, 13%, 91%, 0.6);
}

.header-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
}

/* Logo */
.logo {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: hsl(220, 13%, 18%);
  transition: opacity 180ms;
}

.logo:hover {
  opacity: 0.8;
}

.logo-dot {
  color: hsl(271, 70%, 60%);
  font-size: 24px;
}

/* Search Bar */
.search-container {
  position: relative;
  flex: 1;
  max-width: 320px;
}

.search-container input {
  width: 100%;
  height: 36px;
  padding-left: 36px;
  padding-right: 12px;
  background: hsl(220, 9%, 46%, 0.08);
  border: 1px solid transparent;
  border-radius: 12px;
  font-size: 14px;
  transition: all 180ms;
}

.search-container input:focus {
  background: hsl(30, 18%, 97%);
  border-color: hsl(271, 70%, 60%, 0.4);
  outline: none;
}
```


#### Navigation Controls

```css
/* Balance Chip */
.balance-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  height: 36px;
  background: hsl(271, 70%, 60%, 0.1);
  border: 1px solid hsl(271, 70%, 60%, 0.2);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: hsl(271, 70%, 60%);
}

.balance-chip::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: hsl(271, 70%, 60%);
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Nav Icon Button */
.nav-icon {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: hsl(220, 9%, 46%);
  transition: all 180ms;
}

.nav-icon:hover {
  background: hsl(220, 9%, 46%, 0.08);
  color: hsl(220, 13%, 18%);
}

.nav-icon.active {
  background: hsl(271, 70%, 60%, 0.1);
  color: hsl(271, 70%, 60%);
}

/* Nav Link */
.nav-link {
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: hsl(220, 9%, 46%);
  transition: all 180ms;
}

.nav-link:hover {
  background: hsl(220, 9%, 46%, 0.08);
  color: hsl(220, 13%, 18%);
}

.nav-link.active {
  background: hsl(271, 70%, 60%, 0.1);
  color: hsl(271, 70%, 60%);
}

/* Avatar */
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: hsl(220, 13%, 18%);
  color: hsl(30, 18%, 97%);
  display: grid;
  place-items: center;
  box-shadow: var(--shadow-card);
  transition: all 180ms;
}

.avatar:hover {
  background: hsl(220, 13%, 25%);
}

.avatar.active {
  background: hsl(271, 70%, 60%);
}
```


### Premium Prediction Panel Component

The prediction panel replaces modal dialogs with a more elegant side panel (desktop) or bottom sheet (mobile).

#### Component Structure

```tsx
<div className={`prediction-panel ${isOpen ? 'open' : ''}`}>
  <div className="panel-backdrop" onClick={onClose} />
  
  <div className="panel-content">
    {/* Header */}
    <div className="panel-header">
      <div className="market-icon">{icon}</div>
      <button onClick={onClose} className="close-button">
        <XIcon />
      </button>
    </div>

    {/* Market Question */}
    <h3 className="panel-question">{question}</h3>

    {/* Current Odds */}
    <div className="current-odds">
      <span className="yes-odd">YES {yesPercent}%</span>
      <span className="no-odd">NO {noPercent}%</span>
    </div>

    {/* Side Selection */}
    <div className="side-selector">
      <button 
        className={`side-button yes ${side === 'YES' ? 'selected' : ''}`}
        onClick={() => setSide('YES')}
      >
        YES
      </button>
      <button 
        className={`side-button no ${side === 'NO' ? 'selected' : ''}`}
        onClick={() => setSide('NO')}
      >
        NO
      </button>
    </div>

    {/* Amount Input */}
    <div className="amount-section">
      <label>Amount</label>
      <div className="amount-input-wrapper">
        <span className="currency-symbol">₦</span>
        <input 
          type="number" 
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
        />
      </div>
      <span className="balance-info">Balance: {balance}</span>
    </div>

    {/* Potential Returns */}
    <div className="returns-section">
      <div className="return-row">
        <span>Potential Return</span>
        <span className="return-value">{potentialReturn}</span>
      </div>
      <div className="return-row">
        <span>Potential Profit</span>
        <span className="profit-value">{potentialProfit}</span>
      </div>
    </div>

    {/* Confirm Button */}
    <button className="confirm-button" disabled={!isValid}>
      {isLoading ? <Spinner /> : `Place ${side} Prediction`}
    </button>
  </div>
</div>
```


#### Desktop Panel Styling

```css
/* Desktop: Side Panel */
@media (min-width: 1024px) {
  .prediction-panel {
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    z-index: 50;
    pointer-events: none;
  }

  .prediction-panel.open {
    pointer-events: auto;
  }

  .panel-backdrop {
    position: absolute;
    inset: 0;
    background: hsl(220, 13%, 18%, 0.4);
    backdrop-filter: blur(4px);
    opacity: 0;
    transition: opacity 300ms;
  }

  .prediction-panel.open .panel-backdrop {
    opacity: 1;
  }

  .panel-content {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 480px;
    background: hsl(30, 18%, 97%);
    box-shadow: var(--shadow-modal);
    padding: 32px;
    overflow-y: auto;
    transform: translateX(100%);
    transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .prediction-panel.open .panel-content {
    transform: translateX(0);
  }
}
```

#### Mobile Bottom Sheet Styling

```css
/* Mobile: Bottom Sheet */
@media (max-width: 1023px) {
  .prediction-panel {
    position: fixed;
    inset: 0;
    z-index: 50;
    pointer-events: none;
  }

  .prediction-panel.open {
    pointer-events: auto;
  }

  .panel-backdrop {
    position: absolute;
    inset: 0;
    background: hsl(220, 13%, 18%, 0.4);
    backdrop-filter: blur(4px);
    opacity: 0;
    transition: opacity 300ms;
  }

  .prediction-panel.open .panel-backdrop {
    opacity: 1;
  }

  .panel-content {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    max-height: 90vh;
    background: hsl(30, 18%, 97%);
    border-radius: 20px 20px 0 0;
    box-shadow: var(--shadow-modal);
    padding: 24px;
    overflow-y: auto;
    transform: translateY(100%);
    transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .prediction-panel.open .panel-content {
    transform: translateY(0);
  }

  /* Handle indicator for mobile */
  .panel-content::before {
    content: '';
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 4px;
    background: hsl(220, 9%, 46%, 0.3);
    border-radius: 9999px;
  }
}
```


#### Panel Interactive Elements

```css
/* Side Selector Buttons */
.side-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 24px 0;
}

.side-button {
  padding: 16px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  border: 2px solid;
  transition: all 180ms;
}

.side-button.yes {
  background: hsl(142, 50%, 95%);
  color: hsl(142, 50%, 45%);
  border-color: hsl(142, 50%, 45%, 0.2);
}

.side-button.yes.selected {
  background: hsl(142, 50%, 45%);
  color: white;
  border-color: hsl(142, 50%, 45%);
  box-shadow: 0 0 0 4px hsl(142, 50%, 45%, 0.2);
}

.side-button.no {
  background: hsl(350, 70%, 95%);
  color: hsl(350, 70%, 55%);
  border-color: hsl(350, 70%, 55%, 0.2);
}

.side-button.no.selected {
  background: hsl(350, 70%, 55%);
  color: white;
  border-color: hsl(350, 70%, 55%);
  box-shadow: 0 0 0 4px hsl(350, 70%, 55%, 0.2);
}

/* Amount Input */
.amount-input-wrapper {
  position: relative;
  margin: 8px 0;
}

.amount-input-wrapper input {
  width: 100%;
  height: 56px;
  padding: 0 16px 0 40px;
  background: white;
  border: 2px solid hsl(220, 13%, 91%);
  border-radius: 12px;
  font-size: 24px;
  font-weight: 600;
  transition: all 180ms;
}

.amount-input-wrapper input:focus {
  border-color: hsl(271, 70%, 60%);
  outline: none;
  box-shadow: 0 0 0 4px hsl(271, 70%, 60%, 0.1);
}

.currency-symbol {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 24px;
  font-weight: 600;
  color: hsl(220, 9%, 46%);
}

/* Confirm Button */
.confirm-button {
  width: 100%;
  height: 56px;
  background: hsl(271, 70%, 60%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  margin-top: 24px;
  transition: all 180ms;
}

.confirm-button:hover:not(:disabled) {
  background: hsl(271, 70%, 55%);
  transform: translateY(-2px);
  box-shadow: var(--shadow-elevated);
}

.confirm-button:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

.confirm-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```


### Professional Footer Component

The footer provides essential links with minimal, professional styling.

#### Component Structure

```tsx
<footer className="footer">
  <div className="footer-container">
    {/* Brand Section */}
    <div className="footer-brand">
      <Link to="/" className="footer-logo">
        Flippe<span className="logo-dot">.</span>
      </Link>
      <p className="footer-description">
        A simple, transparent platform for forecasting real-world outcomes 
        and earning from accuracy.
      </p>
      <div className="social-links">
        <a href="#" className="social-icon"><TwitterIcon /></a>
        <a href="#" className="social-icon"><LinkedInIcon /></a>
        <a href="#" className="social-icon"><TelegramIcon /></a>
      </div>
      <div className="status-indicator">
        <span className="status-dot" />
        All systems operational
      </div>
    </div>

    {/* Link Sections */}
    <div className="footer-section">
      <h4>Product</h4>
      <ul>
        <li><a href="#">About</a></li>
        <li><a href="#">How It Works</a></li>
        <li><a href="#">Markets</a></li>
      </ul>
    </div>

    <div className="footer-section">
      <h4>Support</h4>
      <ul>
        <li><a href="#">Help Center</a></li>
        <li><a href="#">Contact</a></li>
      </ul>
    </div>

    <div className="footer-section">
      <h4>Legal</h4>
      <ul>
        <li><a href="#">Terms of Service</a></li>
        <li><a href="#">Privacy Policy</a></li>
        <li><a href="#">Risk Disclaimer</a></li>
      </ul>
    </div>
  </div>

  {/* Bottom Bar */}
  <div className="footer-bottom">
    <span>© 2026 Flippe Technologies Ltd. All rights reserved.</span>
    <span>Participation involves risk. Only use funds you can afford to lose.</span>
  </div>
</footer>
```

#### Styling Specifications

```css
.footer {
  border-top: 1px solid hsl(220, 13%, 91%, 0.6);
  background: hsl(30, 18%, 97%, 0.5);
  margin-top: 80px;
}

.footer-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 56px 24px;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 40px;
}

@media (max-width: 768px) {
  .footer-container {
    grid-template-columns: 1fr 1fr;
    gap: 32px;
  }
  
  .footer-brand {
    grid-column: 1 / -1;
  }
}

/* Brand Section */
.footer-logo {
  font-size: 18px;
  font-weight: 700;
  color: hsl(220, 13%, 18%);
}

.footer-description {
  font-size: 14px;
  line-height: 1.6;
  color: hsl(220, 9%, 46%);
  margin: 12px 0 20px;
  max-width: 320px;
}

/* Social Links */
.social-links {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.social-icon {
  width: 32px;
  height: 32px;
  border-radius: 12px;
  border: 1px solid hsl(220, 13%, 91%);
  display: grid;
  place-items: center;
  color: hsl(220, 9%, 46%);
  transition: all 180ms;
}

.social-icon:hover {
  background: hsl(220, 9%, 46%, 0.08);
  color: hsl(220, 13%, 18%);
  border-color: hsl(220, 13%, 18%, 0.3);
}

/* Link Sections */
.footer-section h4 {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: hsl(220, 13%, 18%);
  margin-bottom: 16px;
}

.footer-section ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-section li {
  margin-bottom: 10px;
}

.footer-section a {
  font-size: 14px;
  color: hsl(220, 9%, 46%);
  transition: color 180ms;
}

.footer-section a:hover {
  color: hsl(220, 13%, 18%);
}

/* Bottom Bar */
.footer-bottom {
  border-top: 1px solid hsl(220, 13%, 91%, 0.6);
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: hsl(220, 9%, 46%);
}

@media (max-width: 640px) {
  .footer-bottom {
    flex-direction: column;
    gap: 8px;
  }
}
```


### Loading and Empty States

#### Skeleton Screen Component

```tsx
const MarketCardSkeleton = () => (
  <div className="skeleton-card">
    <div className="skeleton-header">
      <div className="skeleton-icon" />
      <div className="skeleton-badge" />
    </div>
    <div className="skeleton-title" />
    <div className="skeleton-title short" />
    <div className="skeleton-bar" />
    <div className="skeleton-buttons">
      <div className="skeleton-button" />
      <div className="skeleton-button" />
    </div>
    <div className="skeleton-footer">
      <div className="skeleton-stat" />
      <div className="skeleton-stat" />
      <div className="skeleton-stat" />
    </div>
  </div>
);
```

#### Skeleton Styling

```css
.skeleton-card {
  background: hsl(30, 18%, 97%);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid hsl(220, 13%, 91%, 0.5);
}

.skeleton-icon,
.skeleton-badge,
.skeleton-title,
.skeleton-bar,
.skeleton-button,
.skeleton-stat {
  background: linear-gradient(
    90deg,
    hsl(220, 9%, 46%, 0.1) 0%,
    hsl(220, 9%, 46%, 0.15) 50%,
    hsl(220, 9%, 46%, 0.1) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: 8px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.skeleton-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
}

.skeleton-badge {
  width: 80px;
  height: 24px;
  border-radius: 9999px;
}

.skeleton-title {
  height: 20px;
  margin: 16px 0 8px;
}

.skeleton-title.short {
  width: 60%;
}

.skeleton-bar {
  height: 8px;
  margin: 16px 0;
  border-radius: 9999px;
}

.skeleton-button {
  height: 40px;
  border-radius: 12px;
}

.skeleton-stat {
  height: 16px;
  width: 60px;
}
```

#### Empty State Component

```tsx
const EmptyState = ({ icon, title, description, action }) => (
  <div className="empty-state">
    <div className="empty-icon">{icon}</div>
    <h3 className="empty-title">{title}</h3>
    <p className="empty-description">{description}</p>
    {action && (
      <button className="empty-action">{action}</button>
    )}
  </div>
);
```

```css
.empty-state {
  text-align: center;
  padding: 64px 24px;
  max-width: 400px;
  margin: 0 auto;
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 24px;
  border-radius: 16px;
  background: hsl(220, 9%, 46%, 0.08);
  display: grid;
  place-items: center;
  font-size: 32px;
  color: hsl(220, 9%, 46%);
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: hsl(220, 13%, 18%);
  margin-bottom: 8px;
}

.empty-description {
  font-size: 14px;
  line-height: 1.6;
  color: hsl(220, 9%, 46%);
  margin-bottom: 24px;
}

.empty-action {
  padding: 12px 24px;
  background: hsl(271, 70%, 60%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  transition: all 180ms;
}

.empty-action:hover {
  background: hsl(271, 70%, 55%);
  transform: translateY(-2px);
}
```


## Data Models

### Design Token Model

The design system uses a structured token model for consistency:

```typescript
interface DesignTokens {
  colors: {
    charcoal: string;
    graphite: string;
    offWhite: string;
    purple: ColorScale;
    emerald: ColorScale;
    coral: ColorScale;
  };
  spacing: {
    1: string;  // 4px
    2: string;  // 8px
    3: string;  // 12px
    4: string;  // 16px
    6: string;  // 24px
    8: string;  // 32px
    12: string; // 48px
    16: string; // 64px
  };
  typography: {
    fontFamily: string;
    fontSize: FontSizeScale;
    fontWeight: FontWeightScale;
    lineHeight: LineHeightScale;
  };
  shadows: {
    card: string;
    elevated: string;
    modal: string;
  };
  borderRadius: {
    sm: string;  // 8px
    md: string;  // 12px
    lg: string;  // 16px
    xl: string;  // 20px
    full: string; // 9999px
  };
  transitions: {
    fast: string;    // 180ms
    normal: string;  // 300ms
    slow: string;    // 500ms
    easing: string;  // cubic-bezier(0.4, 0, 0.2, 1)
  };
}

interface ColorScale {
  DEFAULT: string;
  soft: string;
}

interface FontSizeScale {
  h1: [string, { lineHeight: string; fontWeight: string }];
  h2: [string, { lineHeight: string; fontWeight: string }];
  h3: [string, { lineHeight: string; fontWeight: string }];
  h4: [string, { lineHeight: string; fontWeight: string }];
  body: [string, { lineHeight: string; fontWeight: string }];
  small: [string, { lineHeight: string; fontWeight: string }];
  tiny: [string, { lineHeight: string; fontWeight: string; letterSpacing: string }];
}
```

### Component State Model

Components maintain consistent state patterns:

```typescript
interface InteractiveState {
  isHovered: boolean;
  isActive: boolean;
  isFocused: boolean;
  isDisabled: boolean;
  isLoading: boolean;
}

interface AnimationState {
  isAnimating: boolean;
  animationPhase: 'enter' | 'active' | 'exit';
  duration: number;
}

interface ResponsiveState {
  breakpoint: 'mobile' | 'tablet' | 'desktop';
  isTouchDevice: boolean;
  prefersReducedMotion: boolean;
}
```

### Responsive Breakpoint Model

```typescript
interface Breakpoints {
  sm: '640px';   // Mobile landscape, small tablets
  md: '768px';   // Tablets
  lg: '1024px';  // Desktop
  xl: '1280px';  // Large desktop
}

interface ResponsiveValue<T> {
  base: T;      // Mobile first (< 640px)
  sm?: T;       // >= 640px
  md?: T;       // >= 768px
  lg?: T;       // >= 1024px
  xl?: T;       // >= 1280px
}
```

