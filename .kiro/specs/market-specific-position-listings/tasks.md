# Implementation Plan: Market-Specific Position Listings

## Overview

This implementation refactors the Flippe marketplace from a standalone global page to market-specific position listings integrated directly into individual market detail pages. The implementation will extend the existing `fetchAllListings()` API function, create new reusable components (`PositionListings` and `ListingCard`), integrate them into `MarketDetail.tsx`, implement market status-aware price validation, and remove the standalone marketplace route.

## Tasks

- [x] 1. Extend API layer with market filtering and price validation
  - [x] 1.1 Modify fetchAllListings() to accept optional marketId parameter
    - Update function signature in `event-horizon-forecasts-main/src/lib/positions.ts`
    - Add WHERE clause for market filtering: `AND (m.id = $marketId OR $marketId IS NULL)`
    - Maintain backward compatibility (no parameter = all listings)
    - Ensure query uses existing indexes for performance
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ]* 1.2 Write property test for market-specific filtering
    - **Property 1: Market-Specific Filtering**
    - **Validates: Requirements 1.1, 2.2**
    - Test that all returned listings belong to the specified market
    - Test that no listings from other markets are included
  
  - [ ]* 1.3 Write property test for data structure consistency
    - **Property 4: Data Structure Consistency**
    - **Validates: Requirements 2.5**
    - Test that all returned listings match the Position type interface
  
  - [x] 1.4 Create validateListingPrice() function
    - Add new function to `event-horizon-forecasts-main/src/lib/positions.ts`
    - Fetch market data (status, yes_pool, no_pool)
    - Calculate current market price: `(yes_pool / (yes_pool + no_pool)) * 100`
    - Implement validation logic: open markets enforce price <= current price
    - Return validation result with error message if applicable
    - _Requirements: 3.1, 3.2, 3.3, 3.5_
  
  - [ ]* 1.5 Write property tests for price validation
    - **Property 5: Open Market Price Validation**
    - **Validates: Requirements 3.1, 3.3**
    - Test that open markets reject asking prices exceeding current market price
    - **Property 6: Closed Market Price Flexibility**
    - **Validates: Requirements 3.2**
    - Test that closed/resolved markets accept any positive price
    - **Property 8: Market Price Calculation**
    - **Validates: Requirements 3.5**
    - Test price calculation formula for YES and NO positions

- [x] 2. Create reusable ListingCard component
  - [x] 2.1 Create ListingCard component file
    - Create `event-horizon-forecasts-main/src/components/ListingCard.tsx`
    - Define ListingCardProps interface with listing, onPurchase, onShare, disabled props
    - Implement responsive card layout with TailwindCSS
    - Display: side badge, discount, market question, asking price, current value, entry/current prices, listing code
    - Add Buy and Share buttons with loading/disabled states
    - Use brand colors: purple for primary, emerald for YES, coral for NO
    - _Requirements: 1.3, 3.4, 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ]* 2.2 Write property test for listing display completeness
    - **Property 2: Listing Display Completeness**
    - **Validates: Requirements 1.3**
    - Test that all required information is rendered in the card
  
  - [ ]* 2.3 Write property test for market price display
    - **Property 7: Market Price Display**
    - **Validates: Requirements 3.4**
    - Test that both current market price and asking price are visible
  
  - [ ]* 2.4 Write unit tests for ListingCard component
    - Test rendering with different listing data
    - Test button interactions (buy, share)
    - Test disabled state
    - Test responsive layout at 768px breakpoint
    - Test accessibility (ARIA labels, keyboard navigation)

- [x] 3. Create PositionListings container component
  - [x] 3.1 Create PositionListings component file
    - Create `event-horizon-forecasts-main/src/components/PositionListings.tsx`
    - Define PositionListingsProps interface with marketId and marketStatus props
    - Implement state management for listings, loading, and error states
    - Fetch listings on mount and when marketId changes using fetchAllListings(marketId)
    - Display loading skeleton during data fetch
    - Display empty state when no listings exist: "No positions listed for this market yet"
    - Render listings grid: 1 column mobile, 2-3 columns desktop (768px breakpoint)
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 7.1, 7.2, 7.3, 7.5_
  
  - [x] 3.2 Implement purchase flow in PositionListings
    - Add handlePurchase function that calls purchaseListing API
    - Verify buyer balance before purchase
    - Show loading state during purchase
    - Display error toast on purchase failure
    - Re-fetch listings on successful purchase (listing disappears automatically)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ]* 3.3 Write property tests for purchase flow
    - **Property 9: Balance Verification**
    - **Validates: Requirements 5.2**
    - Test that insufficient balance rejects purchase
    - **Property 10: Successful Purchase State Updates**
    - **Validates: Requirements 5.3, 5.5, 8.3, 8.4**
    - Test that successful purchase updates listing status and removes from display
    - **Property 11: Failed Purchase Preservation**
    - **Validates: Requirements 5.4**
    - Test that failed purchases keep listing active and visible
  
  - [x] 3.4 Implement share functionality in PositionListings
    - Add handleShare function that generates shareable URL: `{origin}/listing/{listingCode}`
    - Copy URL to clipboard using Clipboard API
    - Display toast confirmation: "Link copied to clipboard"
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
  
  - [ ]* 3.5 Write property test for shareable URL format
    - **Property 12: Shareable URL Format**
    - **Validates: Requirements 6.1, 6.4**
    - Test that generated URLs follow the correct format
  
  - [ ]* 3.6 Write unit tests for PositionListings component
    - Test loading state rendering
    - Test empty state rendering
    - Test error state rendering
    - Test listings grid rendering
    - Test purchase flow integration
    - Test share flow integration

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Integrate PositionListings into MarketDetail page
  - [x] 5.1 Update MarketDetail.tsx to include PositionListings component
    - Import PositionListings component in `event-horizon-forecasts-main/src/pages/MarketDetail.tsx`
    - Add PositionListings component below forecast buttons section
    - Pass marketId and marketStatus props from market data
    - Ensure consistent spacing and visual hierarchy with existing components
    - _Requirements: 1.1, 1.2, 7.5_
  
  - [ ]* 5.2 Write integration test for MarketDetail with listings
    - Test that PositionListings renders within MarketDetail
    - Test that correct marketId is passed to PositionListings
    - Test full purchase flow from MarketDetail context

- [x] 6. Remove standalone marketplace navigation
  - [x] 6.1 Remove /marketplace route from App.tsx
    - Open `event-horizon-forecasts-main/src/App.tsx`
    - Remove the Route component for `/marketplace` path
    - Keep Marketplace.tsx file in codebase (deprecated but not deleted)
    - _Requirements: 4.1, 4.4_
  
  - [x] 6.2 Remove marketplace links from navigation components
    - Update `event-horizon-forecasts-main/src/components/Header.tsx` to remove marketplace link
    - Update `event-horizon-forecasts-main/src/components/MobileNav.tsx` to remove marketplace link
    - _Requirements: 4.2, 4.3_
  
  - [ ]* 6.3 Write test to verify marketplace route is inaccessible
    - Test that navigating to `/marketplace` redirects or shows 404
    - Test that navigation components don't render marketplace links

- [ ] 7. Add property-based tests for remaining properties
  - [ ]* 7.1 Write property test for chronological ordering
    - **Property 3: Chronological Ordering**
    - **Validates: Requirements 1.5, 10.4**
    - Test that listings are ordered by created_at DESC
  
  - [ ]* 7.2 Write property test for active status filtering
    - **Property 13: Active Status Filtering**
    - **Validates: Requirements 8.1, 8.2**
    - Test that only active listings are returned (no sold/cancelled)
  
  - [ ]* 7.3 Write property test for automatic UI updates
    - **Property 14: Automatic UI Updates**
    - **Validates: Requirements 8.5**
    - Test that sold listings disappear without manual refresh
  
  - [ ]* 7.4 Write property test for database constraint enforcement
    - **Property 15: Database Constraint Enforcement**
    - **Validates: Requirements 9.5**
    - Test that invalid data is rejected by database
  
  - [ ]* 7.5 Write property test for result set limit
    - **Property 16: Result Set Limit**
    - **Validates: Requirements 10.3, 10.5**
    - Test that maximum 100 listings are returned
    - Test that most recent 100 are returned when more exist

- [ ] 8. Final checkpoint - Verify complete integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property-based tests use fast-check library with minimum 100 iterations
- All components use TailwindCSS with existing brand colors
- No database schema changes required - uses existing tables and indexes
- Backward compatibility maintained for fetchAllListings() function
- Marketplace.tsx file remains in codebase but is not accessible via routing
