# Requirements Document

## Introduction

This document specifies the requirements for refactoring the Flippe marketplace system from a standalone global page to market-specific position listings. The refactor will integrate position listings directly into individual market detail pages, showing only listings relevant to each specific market. This change improves user experience by providing contextual access to secondary market positions while browsing markets.

## Glossary

- **Position_Listing**: A secondary market offer where a user sells their existing market position to another user
- **Market_Detail_Page**: The page displaying information about a specific prediction market, including question, prices, and statistics
- **Marketplace_Page**: The current standalone page at `/marketplace` route showing all position listings globally (to be deprecated)
- **Listing_Section**: The UI component within Market_Detail_Page that displays position listings for that market
- **Active_Listing**: A position listing with status "active" that is available for purchase
- **Market_Status**: The state of a market, either "open", "closed", or "resolved"
- **Asking_Price**: The price in smallest currency units (kobo for NGN) that a seller requests for their position
- **Current_Market_Price**: The real-time percentage price (0-100) for YES or NO positions in a market
- **Listing_Code**: An 8-character unique alphanumeric identifier for a position listing
- **Position**: A user's stake in a market, including side (YES/NO), entry price, and current value
- **Seller**: The user who owns a position and creates a listing to sell it
- **Buyer**: The user who purchases a position listing from a seller

## Requirements

### Requirement 1: Display Market-Specific Position Listings

**User Story:** As a forecaster, I want to see position listings for a specific market on that market's detail page, so that I can discover secondary market opportunities while researching the market.

#### Acceptance Criteria

1. WHEN a user navigates to Market_Detail_Page, THE Listing_Section SHALL display all Active_Listings where the listing's position market_id matches the current market's id
2. THE Listing_Section SHALL appear below the forecast buttons on Market_Detail_Page
3. FOR EACH Active_Listing displayed, THE Listing_Section SHALL show the Seller username, position side (YES/NO), quantity, purchase price, Current_Market_Price, Asking_Price, buy button, share button, and Listing_Code
4. WHEN no Active_Listings exist for the current market, THE Listing_Section SHALL display an empty state message
5. THE Listing_Section SHALL order listings by created_at timestamp in descending order (newest first)

### Requirement 2: Filter Listings by Market

**User Story:** As a developer, I want the listing fetch function to accept a market identifier parameter, so that the system can retrieve only relevant listings for each market.

#### Acceptance Criteria

1. THE fetchAllListings function SHALL accept an optional marketId parameter of type string
2. WHEN marketId parameter is provided, THE fetchAllListings function SHALL return only Active_Listings where the associated position's market_id equals the provided marketId
3. WHEN marketId parameter is not provided, THE fetchAllListings function SHALL return all Active_Listings across all markets (backward compatibility)
4. THE fetchAllListings function SHALL join position_listings with positions table to access market_id for filtering
5. THE fetchAllListings function SHALL maintain existing behavior for listing data structure and calculations

### Requirement 3: Enforce Pricing Rules Based on Market Status

**User Story:** As a platform operator, I want listing prices to be validated against market status, so that sellers cannot exploit closed markets by setting unrealistic prices.

#### Acceptance Criteria

1. WHEN Market_Status is "open" AND a seller creates or updates a listing, THE System SHALL validate that Asking_Price does not exceed Current_Market_Price for that position's side
2. WHEN Market_Status is "closed" OR Market_Status is "resolved", THE System SHALL allow any Asking_Price value greater than zero
3. IF Asking_Price validation fails, THEN THE System SHALL return an error message indicating the price constraint violation
4. THE Listing_Section SHALL display Current_Market_Price alongside Asking_Price for buyer comparison
5. THE System SHALL calculate Current_Market_Price from the market's yes_pool and no_pool values in real-time

### Requirement 4: Remove Standalone Marketplace Navigation

**User Story:** As a product manager, I want the standalone marketplace page removed from navigation, so that users access listings through market-specific contexts only.

#### Acceptance Criteria

1. THE System SHALL remove the `/marketplace` route from the application routing configuration
2. THE Navigation_Component SHALL not display any link or button to the Marketplace_Page
3. THE Mobile_Navigation_Component SHALL not display any link or button to the Marketplace_Page
4. THE Marketplace_Page component file SHALL remain in the codebase but not be accessible via routing (deprecated for potential future use)
5. WHEN a user attempts to access `/marketplace` URL directly, THE System SHALL redirect to the home page or display a 404 error

### Requirement 5: Maintain Listing Purchase Functionality

**User Story:** As a buyer, I want to purchase position listings from the market detail page, so that I can acquire positions without navigating away from the market context.

#### Acceptance Criteria

1. WHEN a Buyer clicks the buy button on a listing in Listing_Section, THE System SHALL initiate the purchase flow using the existing purchaseListing function
2. THE System SHALL verify the Buyer has sufficient balance before completing the purchase
3. WHEN a purchase completes successfully, THE System SHALL remove the listing from Listing_Section display immediately
4. WHEN a purchase fails, THE System SHALL display an error message to the Buyer without removing the listing
5. THE System SHALL update the position owner from Seller to Buyer upon successful purchase

### Requirement 6: Support Listing Sharing from Market Context

**User Story:** As a seller, I want to share my position listing with a direct link, so that I can promote my listing to potential buyers outside the platform.

#### Acceptance Criteria

1. WHEN a user clicks the share button on a listing in Listing_Section, THE System SHALL generate a shareable URL containing the Listing_Code
2. THE System SHALL copy the shareable URL to the user's clipboard
3. THE System SHALL display a confirmation message indicating the link was copied
4. THE shareable URL format SHALL be `{origin}/listing/{Listing_Code}`
5. WHEN a user navigates to a shareable listing URL, THE System SHALL display the listing detail page with purchase option

### Requirement 7: Preserve Responsive Design Standards

**User Story:** As a mobile user, I want the position listings section to work seamlessly on my device, so that I can browse and purchase listings on any screen size.

#### Acceptance Criteria

1. THE Listing_Section SHALL implement mobile-first responsive design using TailwindCSS
2. WHEN viewport width is below 768px, THE Listing_Section SHALL display listings in a single column layout
3. WHEN viewport width is 768px or above, THE Listing_Section SHALL display listings in a multi-column grid layout
4. THE Listing_Section SHALL use brand colors: purple for primary actions, emerald for YES positions, coral for NO positions
5. THE Listing_Section SHALL maintain consistent spacing, typography, and visual hierarchy with existing Market_Detail_Page components

### Requirement 8: Handle Sold Listings Automatically

**User Story:** As a system administrator, I want sold listings to disappear from display automatically, so that users only see available listings without manual intervention.

#### Acceptance Criteria

1. THE fetchAllListings function SHALL filter out listings where status is "sold" or "cancelled"
2. THE fetchAllListings function SHALL only return listings where status equals "active"
3. WHEN a listing status changes from "active" to "sold", THE Listing_Section SHALL not display that listing on subsequent renders
4. THE System SHALL update listing status to "sold" immediately after successful purchase transaction
5. THE System SHALL not require manual refresh for sold listings to disappear from Listing_Section

### Requirement 9: Maintain Database Schema Compatibility

**User Story:** As a backend developer, I want the refactor to use existing database schema, so that no migration or schema changes are required.

#### Acceptance Criteria

1. THE System SHALL use the existing position_listings table without schema modifications
2. THE System SHALL access market_id through the positions table foreign key relationship
3. THE System SHALL use existing indexes on position_listings for query performance
4. THE System SHALL maintain existing position_listings columns: id, position_id, listing_code, asking_price, status, buyer_id, sold_at, created_at, updated_at
5. THE System SHALL continue to enforce existing constraints: asking_price_positive, status CHECK constraint, and foreign key relationships

### Requirement 10: Optimize Query Performance for Market-Specific Filtering

**User Story:** As a platform operator, I want listing queries to perform efficiently, so that market detail pages load quickly even with many listings.

#### Acceptance Criteria

1. THE fetchAllListings function SHALL use database joins to filter by market_id rather than client-side filtering
2. THE System SHALL leverage the existing idx_positions_market_id index for market filtering queries
3. THE System SHALL limit listing queries to return maximum 100 listings per market
4. THE System SHALL order listings by created_at DESC using the existing idx_position_listings_created_at index
5. WHEN a market has more than 100 Active_Listings, THE Listing_Section SHALL display the 100 most recent listings

