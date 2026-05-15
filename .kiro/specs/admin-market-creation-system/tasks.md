# Implementation Plan: Admin Market Creation System

## Overview

This implementation plan breaks down the admin market creation system into discrete, actionable coding tasks. The system enables authorized administrators to create, manage, and resolve prediction markets with comprehensive validation, audit trails, and real-time data synchronization.

**Tech Stack:**
- Backend: TypeScript, Express, Supabase (PostgreSQL), Zod validation
- Frontend: React, TypeScript, React Router, Tailwind CSS, Radix UI, React Hook Form
- Testing: Vitest, fast-check (property-based testing)
- Real-time: WebSocket with polling fallback

**Implementation Strategy:**
- Build backend foundation first (database, API, validation)
- Add frontend components incrementally
- Integrate real-time features
- Add comprehensive testing throughout
- Wire everything together at the end

## Tasks

### 1. Database Schema and Migrations

- [x] 1.1 Create markets table with all fields and constraints
  - Add all columns: id, question, description, category, country_filter, market_type, yes_label, no_label, yes_price, no_price, close_date, resolution_date, resolution_source, outcome, status, pool_amount_smallest_unit, participant_count, currency, image_url, created_by, updated_at, resolved_at, archived_at
  - Add CHECK constraints: price_sum_equals_100, resolution_after_close, close_date_future
  - Add CHECK constraints for price ranges (0-100), status enum, outcome enum, market_type enum, currency enum
  - Add NOT NULL constraints on required fields
  - Create indexes: status, category, close_date, created_at, country_filter, active markets partial index
  - _Requirements: 1.1-1.14, 2.5, 2.6, 3.1, 3.2, 4.1, 4.2, 20.1-20.5_

- [x] 1.2 Create market_audit_trail table
  - Add columns: id, market_id, admin_user_id, action_timestamp, action_type, changed_fields (JSONB), snapshot_before (JSONB), snapshot_after (JSONB), ip_address, user_agent
  - Add foreign key constraints with CASCADE on market deletion
  - Create indexes: market_id, admin_user_id, action_timestamp, action_type
  - Add immutability rules: prevent UPDATE and DELETE operations
  - _Requirements: 19.1-19.5_


- [x] 1.3 Create database triggers for automatic timestamp updates
  - Implement update_updated_at_column() trigger function
  - Implement set_resolved_at() trigger function (sets timestamp when status changes to 'resolved')
  - Implement set_archived_at() trigger function (sets timestamp when status changes to 'archived')
  - Attach triggers to markets table
  - _Requirements: 9.3, 9.4_

- [ ]* 1.4 Write property test for database constraints
  - **Property 1: Price Sum Invariant**
  - **Validates: Requirements 2.1, 2.4, 2.5, 2.6, 20.3, 20.4**
  - Test that database accepts prices summing to 100 and rejects others
  - Test that database enforces price range 0-100

- [ ]* 1.5 Write property test for date constraints
  - **Property 2: Date Ordering Invariant**
  - **Validates: Requirements 3.1, 3.2, 3.5, 20.5**
  - Test that database accepts resolution_date > close_date > creation time
  - Test that database rejects invalid date orderings

### 2. Backend Validation Layer

- [x] 2.1 Create Zod validation schemas for market operations
  - Implement MarketCreateSchema with all field validations
  - Implement MarketUpdateSchema for partial updates
  - Implement StatusChangeSchema for status transitions
  - Implement BulkActionSchema for bulk operations
  - Add custom refinements: price sum validation, date ordering validation
  - _Requirements: 2.1-2.6, 3.1-3.5, 4.3-4.5_

- [x] 2.2 Implement status transition validation logic
  - Create VALID_TRANSITIONS map defining allowed transitions
  - Implement isValidTransition() function
  - Create EDITABLE_FIELDS_BY_STATUS map
  - Implement canEditField() function
  - _Requirements: 8.1-8.5, 9.1-9.4_

- [ ]* 2.3 Write property test for status transitions
  - **Property 7: Valid Status Transitions**
  - **Validates: Requirements 9.1-9.4**
  - Test all valid transitions are allowed
  - Test all invalid transitions are rejected

- [ ]* 2.4 Write property test for edit restrictions
  - **Property 6: Status-Based Edit Restrictions**
  - **Validates: Requirements 8.1, 8.2, 8.4, 8.5**
  - Test field editability based on market status
  - Generate random field/status combinations

### 3. Backend API Endpoints - Market CRUD

- [x] 3.1 Implement POST /api/admin/markets endpoint
  - Add role-based auth middleware (admin/super_admin only)
  - Validate request body with MarketCreateSchema
  - Insert market into database
  - Create audit trail entry
  - Return created market with 201 status
  - Handle validation errors (400), auth errors (401, 403), database errors (500)
  - _Requirements: 6.1-6.3, 7.1-7.5, 18.1-18.5, 19.1, 21.1_

- [ ]* 3.2 Write property test for market creation validation
  - **Property 3: Required Field Validation**
  - **Validates: Requirements 4.3-4.5, 20.1-20.2**
  - Test that API rejects requests with missing required fields
  - Generate random combinations of missing fields

- [ ]* 3.3 Write property test for admin-only access
  - **Property 21: Admin-Only Access Control**
  - **Validates: Requirements 18.1-18.5**
  - Test that admin/super_admin can create markets
  - Test that regular users receive 403 error


- [x] 3.4 Implement GET /api/markets/:marketId endpoint
  - Fetch market by ID from database
  - Calculate computed fields: pool_amount, current_yes_percentage, current_no_percentage, time_remaining_seconds, is_closing_soon, is_closed
  - Return market with 200 status
  - Handle not found (404), database errors (500)
  - _Requirements: 12.1-12.5, 13.1-13.5, 14.1-14.5, 21.2_

- [x] 3.5 Implement PUT /api/admin/markets/:marketId endpoint
  - Add role-based auth middleware (admin/super_admin only)
  - Fetch existing market from database
  - Validate status-based edit restrictions using canEditField()
  - Validate request body with MarketUpdateSchema
  - Update market in database with optimistic locking (version field)
  - Create audit trail entry with changed fields
  - Return updated market with 200 status
  - Handle validation errors (400), auth errors (401, 403), not found (404), concurrent modification (409), database errors (500)
  - _Requirements: 8.1-8.5, 18.1-18.5, 19.2, 21.3, 22.4_

- [ ]* 3.6 Write property test for form state preservation on error
  - **Property 25: Form State Preservation on Error**
  - **Validates: Requirements 22.4**
  - Test that failed updates return error without modifying database
  - Verify original values remain unchanged

- [x] 3.7 Implement DELETE /api/admin/markets/:marketId endpoint
  - Add role-based auth middleware (admin/super_admin only)
  - Fetch market from database
  - Validate market status is 'draft'
  - Delete market from database (audit trail entries cascade)
  - Create audit trail entry with full market snapshot
  - Return success message with 200 status
  - Handle validation errors (400), auth errors (401, 403), not found (404), database errors (500)
  - _Requirements: 10.1-10.5, 18.1-18.5, 19.4, 21.4_

- [ ]* 3.8 Write property test for draft-only deletion
  - **Property 8: Draft-Only Deletion**
  - **Validates: Requirements 10.3**
  - Test that only draft markets can be deleted
  - Test that non-draft markets return 400 error

### 4. Backend API Endpoints - Market Status and Bulk Operations

- [x] 4.1 Implement PATCH /api/admin/markets/:marketId/status endpoint
  - Add role-based auth middleware (admin/super_admin only)
  - Fetch market from database
  - Validate status transition using isValidTransition()
  - If resolving, validate outcome and resolution_source are provided
  - Update market status in database
  - If resolved, trigger payout calculation service
  - Create audit trail entry
  - Return updated market with 200 status
  - Handle validation errors (400), auth errors (401, 403), not found (404), database errors (500)
  - _Requirements: 9.1-9.5, 18.1-18.5, 19.3, 27.1, 28.1, 29.1, 30.1-30.5_

- [ ]* 4.2 Write property test for resolution requirements
  - **Property 27: Resolution Source Requirement**
  - **Validates: Requirements 30.2**
  - Test that resolution requires resolution_source field
  - Test that resolution without source returns 400 error

- [ ]* 4.3 Write property test for resolution status update
  - **Property 28: Resolution Status Update**
  - **Validates: Requirements 30.3**
  - Test that resolution updates status to 'resolved' and stores outcome
  - Generate random outcomes (YES, NO, INVALID)


- [x] 4.4 Implement GET /api/admin/markets endpoint with filtering and pagination
  - Add role-based auth middleware (admin/super_admin only)
  - Parse query parameters: status, category, search, sort, order, page, limit
  - Build dynamic SQL query with WHERE clauses for filters
  - Apply search filter on question field (case-insensitive ILIKE)
  - Apply sorting with ORDER BY clause
  - Apply pagination with LIMIT and OFFSET
  - Count total matching records
  - Return markets array and pagination metadata
  - Handle auth errors (401, 403), database errors (500)
  - _Requirements: 15.1-15.5, 18.1-18.5, 21.5_

- [ ]* 4.5 Write property test for search filtering
  - **Property 14: Search Filtering**
  - **Validates: Requirements 15.3**
  - Test that search returns only markets with matching question text
  - Generate random search terms and verify results

- [ ]* 4.6 Write property test for status and category filtering
  - **Property 15: Status and Category Filtering**
  - **Validates: Requirements 15.4**
  - Test that filters return only matching markets
  - Generate random filter combinations

- [ ]* 4.7 Write property test for sorting consistency
  - **Property 16: Sorting Consistency**
  - **Validates: Requirements 15.5**
  - Test that results are correctly ordered by sort field and direction
  - Generate random sort options and verify ordering

- [x] 4.8 Implement PATCH /api/admin/markets/bulk-status endpoint
  - Add role-based auth middleware (admin/super_admin only)
  - Validate request body with BulkActionSchema
  - Fetch all markets by IDs
  - Validate each market can perform the requested status change
  - Update all valid markets in a transaction
  - Create audit trail entries for each update
  - Return success count and array of failed operations with reasons
  - Handle validation errors (400), auth errors (401, 403), database errors (500)
  - _Requirements: 16.1-16.5, 18.1-18.5, 19.3_

- [ ]* 4.9 Write property test for bulk pause authorization
  - **Property 17: Bulk Pause Authorization**
  - **Validates: Requirements 16.3**
  - Test that bulk pause only works on active markets
  - Test that pausing non-active markets returns error

- [ ]* 4.10 Write property test for bulk archive authorization
  - **Property 18: Bulk Archive Authorization**
  - **Validates: Requirements 16.4**
  - Test that bulk archive only works on resolved markets
  - Test that archiving non-resolved markets returns error

### 5. Backend API Endpoints - Image Upload and Export

- [x] 5.1 Implement POST /api/admin/markets/upload-image endpoint
  - Add role-based auth middleware (admin/super_admin only)
  - Use multer middleware for multipart/form-data parsing
  - Validate file type is image (JPEG, PNG, GIF, WebP)
  - Validate file size is under 5MB
  - Upload image to Supabase Storage (market-images bucket)
  - Return public image URL with 200 status
  - Handle validation errors (400), auth errors (401, 403), upload errors (500)
  - _Requirements: 11.1-11.5, 18.1-18.5_

- [ ]* 5.2 Write property test for image type validation
  - **Property 9: Image Type Validation**
  - **Validates: Requirements 11.1**
  - Test that only image formats are accepted
  - Test that non-image files return 400 error

- [ ]* 5.3 Write property test for image size validation
  - **Property 10: Image Size Validation**
  - **Validates: Requirements 11.2**
  - Test that files under 5MB are accepted
  - Test that files over 5MB return 400 error


- [x] 5.4 Implement GET /api/admin/markets/export endpoint
  - Add role-based auth middleware (admin/super_admin only)
  - Parse query parameters (same as list endpoint filters)
  - Fetch all matching markets from database
  - Generate CSV with columns: id, question, category, status, close_date, resolution_date, pool_amount, participant_count, outcome, created_at, resolved_at
  - Set response headers: Content-Type: text/csv, Content-Disposition with timestamp filename
  - Stream CSV data to response
  - Handle auth errors (401, 403), database errors (500)
  - _Requirements: 17.1-17.5, 18.1-18.5_

- [ ]* 5.5 Write property test for CSV export completeness
  - **Property 19: CSV Export Completeness**
  - **Validates: Requirements 17.2, 17.3**
  - Test that CSV includes all required columns
  - Verify data integrity in exported rows

- [ ]* 5.6 Write property test for filtered export consistency
  - **Property 20: Filtered Export Consistency**
  - **Validates: Requirements 17.5**
  - Test that export respects active filters
  - Generate random filter combinations and verify exported data

- [x] 5.7 Implement GET /api/admin/markets/:marketId/audit endpoint
  - Add role-based auth middleware (admin/super_admin only)
  - Parse pagination query parameters
  - Fetch audit trail entries for market with admin user details
  - Apply pagination
  - Return audit entries array and pagination metadata
  - Handle auth errors (401, 403), not found (404), database errors (500)
  - _Requirements: 18.1-18.5, 19.1-19.5_

- [ ]* 5.8 Write property test for comprehensive audit logging
  - **Property 22: Comprehensive Audit Logging**
  - **Validates: Requirements 19.1-19.4**
  - Test that all operations create audit entries
  - Verify audit entries contain required fields

- [ ]* 5.9 Write property test for audit trail immutability
  - **Property 23: Audit Trail Immutability**
  - **Validates: Requirements 19.5**
  - Test that audit entries cannot be updated or deleted
  - Attempt UPDATE and DELETE operations and verify they fail

### 6. Backend Middleware and Error Handling

- [ ] 6.1 Create audit logging middleware
  - Implement middleware that intercepts all market operations
  - Extract admin user ID, IP address, user agent from request
  - Capture before and after snapshots for updates
  - Insert audit trail entry into database
  - Handle errors gracefully without blocking main operation
  - _Requirements: 19.1-19.5_

- [ ] 6.2 Create centralized error handling middleware
  - Implement global error handler for Express
  - Map database constraint errors to API error codes
  - Map Zod validation errors to field-specific error responses
  - Log errors to audit trail for admin actions
  - Return consistent error response format
  - _Requirements: All error handling requirements_

- [ ]* 6.3 Write unit tests for error handling
  - Test validation error responses (400)
  - Test authentication error responses (401)
  - Test authorization error responses (403)
  - Test not found error responses (404)
  - Test conflict error responses (409)
  - Test database error responses (500)

### 7. Real-Time WebSocket Server

- [ ] 7.1 Implement WebSocket server for market updates
  - Create WebSocket server using ws library
  - Implement connection handling with authentication
  - Create room-based subscriptions (per market ID)
  - Implement broadcast function for market updates
  - Handle connection errors and cleanup
  - _Requirements: 29.1-29.5_


- [ ] 7.2 Integrate WebSocket broadcasts with market operations
  - Add broadcast calls after market creation
  - Add broadcast calls after market updates
  - Add broadcast calls after status changes
  - Add broadcast calls after trade operations (pool_amount, participant_count updates)
  - Include computed fields in broadcast payload
  - _Requirements: 29.1-29.5_

- [ ]* 7.3 Write unit tests for WebSocket functionality
  - Test connection establishment
  - Test room subscription
  - Test broadcast delivery
  - Test connection cleanup

### 8. Frontend - Market Form Component

- [ ] 8.1 Create MarketForm component structure
  - Set up React Hook Form with Zod validation
  - Create form layout with responsive design (single column < 768px, two columns >= 768px)
  - Add form state management with useReducer
  - Implement form initialization from existing market data
  - Add loading and submitting states
  - _Requirements: 1.1-1.14, 22.1-22.5, 23.1-23.5_

- [ ] 8.2 Implement form input fields
  - Add question text input with character counter (10-500)
  - Add category dropdown with all available categories
  - Add country filter dropdown (optional, ISO codes)
  - Add market type radio buttons (binary/multiple choice)
  - Add YES label and NO label text inputs
  - Add YES price and NO price number inputs (0-100)
  - Add close date datetime picker (future dates only)
  - Add resolution date datetime picker
  - Add resolution source text input
  - Add rich text editor for description (using Tiptap or similar)
  - Add status dropdown
  - Add currency dropdown (NGN/USD)
  - Add ARIA labels for accessibility
  - Maintain logical tab order
  - _Requirements: 1.1-1.14, 24.1-24.5_

- [ ] 8.3 Implement real-time validation with debouncing
  - Add price sum validation (YES + NO = 100) with 300ms debounce
  - Add date ordering validation with 300ms debounce
  - Add required field validation on blur
  - Display validation errors adjacent to fields
  - Show/hide errors within 500ms
  - Apply error styling to invalid fields
  - Announce errors to screen readers
  - _Requirements: 2.1-2.6, 3.1-3.5, 4.1-4.5, 5.1-5.5, 24.1-24.5_

- [ ]* 8.4 Write property test for price sum validation
  - **Property 1: Price Sum Invariant**
  - **Validates: Requirements 2.1, 2.4, 2.5, 2.6**
  - Test that form validation accepts prices summing to 100
  - Test that form validation rejects other sums

- [ ]* 8.5 Write property test for date validation
  - **Property 2: Date Ordering Invariant**
  - **Validates: Requirements 3.1, 3.2**
  - Test that form validation accepts valid date orderings
  - Test that form validation rejects invalid orderings

- [ ] 8.6 Implement status-based field restrictions
  - Disable all fields except description/resolution_source for active/paused markets
  - Disable all fields except status for resolved markets
  - Disable all fields for archived markets
  - Show visual indicators for disabled fields
  - _Requirements: 8.1-8.5_

- [ ]* 8.7 Write unit tests for form validation
  - Test required field validation
  - Test price range validation
  - Test date validation
  - Test field length validation
  - Test error message display


### 9. Frontend - Image Upload Component

- [ ] 9.1 Create ImageUpload component
  - Add file input with drag-and-drop support
  - Implement client-side file type validation (JPEG, PNG, GIF, WebP)
  - Implement client-side file size validation (< 5MB)
  - Show image preview after selection
  - Display upload progress indicator
  - Handle upload errors with toast notifications
  - Call POST /api/admin/markets/upload-image endpoint
  - Update form state with returned image URL
  - _Requirements: 11.1-11.5_

- [ ]* 9.2 Write unit tests for image upload component
  - Test file type validation
  - Test file size validation
  - Test preview display
  - Test error handling
  - Test successful upload flow

### 10. Frontend - Form State Persistence

- [ ] 10.1 Implement auto-save functionality
  - Create useAutoSave hook with 30-second interval
  - Save draft to backend via PUT endpoint
  - Show subtle save indicator on success
  - Handle save errors gracefully
  - Only auto-save when form is dirty and status is draft
  - _Requirements: 6.4-6.5_

- [ ] 10.2 Implement local storage persistence
  - Create useFormPersistence hook
  - Save form state to localStorage on every change
  - Load form state from localStorage on mount
  - Clear localStorage on successful submission
  - Show confirmation dialog when navigating away with unsaved changes
  - _Requirements: 22.1-22.3_

- [ ]* 10.3 Write property test for form state persistence
  - **Property 24: Form State Persistence**
  - **Validates: Requirements 22.2**
  - Test that form state is restored from localStorage
  - Generate random form data and verify persistence

- [ ]* 10.4 Write unit tests for auto-save
  - Test auto-save triggers after 30 seconds
  - Test auto-save only runs for dirty forms
  - Test auto-save only runs for draft status
  - Test save indicator display

### 11. Frontend - Form Actions and Dialogs

- [ ] 11.1 Implement form submission handlers
  - Create handleSubmit function for create/update operations
  - Call appropriate API endpoint based on mode (create/edit)
  - Handle success with toast notification and navigation
  - Handle errors with field-specific or general error display
  - Preserve form values on error
  - _Requirements: 6.1-6.3, 7.1-7.5, 22.4_

- [ ] 11.2 Implement status change confirmation dialogs
  - Create ConfirmationDialog component
  - Show dialog before status changes (pause, resolve, archive)
  - Display clear description of action and consequences
  - Provide explicit confirm and cancel buttons
  - Call PATCH /api/admin/markets/:id/status on confirm
  - _Requirements: 9.5, 27.1_

- [ ] 11.3 Implement delete confirmation dialog
  - Show dialog before deleting draft markets
  - Display warning about permanent deletion
  - Call DELETE /api/admin/markets/:id on confirm
  - Navigate to market list on success
  - Only show delete button for draft markets
  - _Requirements: 10.1-10.5_

- [ ] 11.4 Implement market preview modal
  - Create preview button in form
  - Show MarketDisplay component in modal overlay
  - Display all entered form data
  - Provide close button to return to form
  - _Requirements: 25.1-25.5_

- [ ]* 11.5 Write unit tests for form actions
  - Test successful submission flow
  - Test error handling flow
  - Test confirmation dialog display
  - Test delete flow for draft markets
  - Test preview modal display


### 12. Frontend - Market Display Component

- [ ] 12.1 Create MarketDisplay component structure
  - Set up responsive layout (adapts to all screen sizes)
  - Add premium UI styling with clean design, professional color palette, clear typography
  - Use subtle shadows and borders for visual hierarchy
  - Add smooth transitions for state changes
  - Ensure 4.5:1 color contrast ratio for accessibility
  - _Requirements: 23.5, 28.1-28.5_

- [ ] 12.2 Implement market metadata display
  - Display market question prominently
  - Show category as visual badge
  - Show status as visual indicator with color coding
  - Display country flag/name if country_filter is set
  - Show market image if available
  - Display market description with rich text rendering
  - _Requirements: 14.1-14.5_

- [ ] 12.3 Implement market statistics display
  - Display pool_amount formatted with currency
  - Display participant_count
  - Show current YES percentage
  - Show current NO percentage
  - Update statistics when data changes
  - _Requirements: 12.1-12.5_

- [ ] 12.4 Implement countdown timer
  - Calculate time remaining until close_date
  - Display countdown in days, hours, minutes, seconds format
  - Update countdown every second
  - Show "Trading Closed" when close_date is reached
  - Apply distinct styling for markets closing within 24 hours
  - _Requirements: 13.1-13.5_

- [ ]* 12.5 Write property test for countdown display logic
  - **Property 12: Countdown Display Logic**
  - **Validates: Requirements 13.1, 13.3**
  - Test countdown calculation for various future dates
  - Verify format is correct

- [ ] 12.6 Implement resolution source display
  - Detect if resolution_source is URL (starts with http:// or https://)
  - Render URLs as clickable links
  - Render non-URLs as plain text
  - _Requirements: 14.3-14.4_

- [ ]* 12.7 Write property test for resolution source URL detection
  - **Property 13: Resolution Source URL Detection**
  - **Validates: Requirements 14.3, 14.4**
  - Test URL detection logic
  - Generate random URLs and text strings

- [ ]* 12.8 Write unit tests for MarketDisplay component
  - Test metadata rendering
  - Test statistics display
  - Test countdown timer updates
  - Test resolution source rendering
  - Test responsive layout

### 13. Frontend - Real-Time Market Updates

- [ ] 13.1 Create useMarketRealTimeSync hook
  - Establish WebSocket connection to market room
  - Handle connection open, message, error, close events
  - Update market data state on message receipt
  - Implement fallback to polling on connection failure
  - Poll every 5 seconds when WebSocket unavailable
  - Track connection status (connected/disconnected/fallback)
  - Clean up connections on unmount
  - _Requirements: 29.1-29.5_

- [ ] 13.2 Integrate real-time updates into MarketDisplay
  - Use useMarketRealTimeSync hook
  - Update displayed statistics within 2 seconds of changes
  - Show connection status indicator
  - Handle reconnection gracefully
  - _Requirements: 29.1-29.5_

- [ ]* 13.3 Write unit tests for real-time sync
  - Test WebSocket connection establishment
  - Test message handling and state updates
  - Test fallback to polling on error
  - Test cleanup on unmount


### 14. Frontend - Market List Component

- [ ] 14.1 Create MarketList component structure
  - Set up responsive layout (card layout < 768px, table layout >= 768px)
  - Add premium UI styling consistent with design system
  - Implement pagination controls
  - Add loading states
  - _Requirements: 15.1-15.2, 23.3-23.4, 28.1-28.5_

- [ ] 14.2 Implement search and filter controls
  - Add search input for question field with debouncing (300ms)
  - Add status filter dropdown (all, draft, active, paused, resolved, archived)
  - Add category filter dropdown
  - Add sort dropdown (close_date, pool_amount, created_at)
  - Add sort order toggle (asc/desc)
  - Update URL query parameters on filter changes
  - Call GET /api/admin/markets with filter parameters
  - _Requirements: 15.3-15.5_

- [ ] 14.3 Implement market list display
  - Display market cards/rows with: question, status badge, close_date, pool_amount
  - Add click handler to navigate to market detail/edit page
  - Show empty state when no markets match filters
  - Handle loading and error states
  - _Requirements: 15.1-15.2_

- [ ]* 14.4 Write unit tests for market list
  - Test search functionality
  - Test filter functionality
  - Test sorting functionality
  - Test pagination
  - Test responsive layout switching

### 15. Frontend - Bulk Actions

- [ ] 15.1 Implement bulk selection functionality
  - Add checkboxes to each market row/card
  - Add "select all" checkbox in header
  - Track selected market IDs in state
  - Show bulk action buttons when markets are selected
  - Display count of selected markets
  - _Requirements: 16.1-16.2_

- [ ] 15.2 Implement bulk pause action
  - Add "Pause Selected" button (only enabled when active markets selected)
  - Show confirmation dialog with count of markets to pause
  - Call PATCH /api/admin/markets/bulk-status with action: 'pause'
  - Display success toast with count of paused markets
  - Display errors for failed operations
  - Refresh market list after operation
  - _Requirements: 16.3, 16.5_

- [ ] 15.3 Implement bulk archive action
  - Add "Archive Selected" button (only enabled when resolved markets selected)
  - Show confirmation dialog with count of markets to archive
  - Call PATCH /api/admin/markets/bulk-status with action: 'archive'
  - Display success toast with count of archived markets
  - Display errors for failed operations
  - Refresh market list after operation
  - _Requirements: 16.4, 16.5_

- [ ]* 15.4 Write unit tests for bulk actions
  - Test selection functionality
  - Test bulk pause flow
  - Test bulk archive flow
  - Test confirmation dialogs
  - Test error handling

### 16. Frontend - CSV Export

- [ ] 16.1 Implement CSV export functionality
  - Add "Export" button to market list
  - Call GET /api/admin/markets/export with current filters
  - Trigger file download with timestamp filename
  - Show loading indicator during export
  - Display success/error toast
  - _Requirements: 17.1-17.5_

- [ ]* 16.2 Write unit tests for CSV export
  - Test export button click
  - Test file download trigger
  - Test loading state
  - Test error handling


### 17. Frontend - Toast Notifications

- [ ] 17.1 Implement toast notification system
  - Use sonner library (already in dependencies)
  - Create toast helper functions for success, error, info types
  - Configure auto-dismiss after 5 seconds
  - Add manual dismiss button
  - Position toasts appropriately (top-right or bottom-right)
  - Ensure toasts are accessible (announced to screen readers)
  - _Requirements: 26.1-26.5_

- [ ] 17.2 Integrate toasts throughout application
  - Add success toast for market creation
  - Add success toast for market updates
  - Add success toast for status changes
  - Add success toast for bulk operations
  - Add success toast for image uploads
  - Add error toasts for all failed operations
  - _Requirements: 6.3, 7.4-7.5, 11.5, 26.1-26.5_

- [ ]* 17.3 Write unit tests for toast notifications
  - Test toast display
  - Test auto-dismiss timing
  - Test manual dismiss
  - Test accessibility announcements

### 18. Frontend - Routing and Navigation

- [ ] 18.1 Set up admin routes
  - Create /admin/markets route for market list
  - Create /admin/markets/new route for market creation
  - Create /admin/markets/:id/edit route for market editing
  - Create /admin/markets/:id route for market detail view
  - Add route guards to check admin/super_admin role
  - Redirect non-admin users to unauthorized page
  - _Requirements: 18.1-18.3_

- [ ] 18.2 Create navigation components
  - Add "Create Market" button in market list
  - Add "Edit" button in market detail view
  - Add "Back to List" navigation in forms
  - Add breadcrumb navigation
  - _Requirements: Navigation UX_

- [ ]* 18.3 Write unit tests for routing
  - Test route rendering
  - Test route guards
  - Test navigation flows
  - Test unauthorized redirects

### 19. Frontend - Audit Trail Viewer

- [ ] 19.1 Create AuditTrail component
  - Fetch audit entries from GET /api/admin/markets/:id/audit
  - Display entries in chronological order (newest first)
  - Show admin user, timestamp, action type for each entry
  - Display changed fields with old and new values
  - Implement pagination for large audit trails
  - Add filtering by action type
  - _Requirements: 19.1-19.5_

- [ ] 19.2 Integrate audit trail into market detail page
  - Add "Audit Trail" tab or section
  - Display AuditTrail component
  - Ensure only admin/super_admin can view
  - _Requirements: 19.1-19.5_

- [ ]* 19.3 Write unit tests for audit trail viewer
  - Test audit entry display
  - Test pagination
  - Test filtering
  - Test changed fields rendering

### 20. Integration and Wiring

- [ ] 20.1 Connect frontend to backend APIs
  - Create API client service with axios or fetch
  - Implement authentication token handling
  - Add request/response interceptors
  - Handle CORS configuration
  - Add retry logic for failed requests
  - _Requirements: All API integration_

- [ ] 20.2 Implement form initialization from market data
  - Fetch market data when editing existing market
  - Populate all form fields with current values
  - Handle loading states
  - Handle not found errors
  - _Requirements: 22.5_

- [ ]* 20.3 Write property test for form initialization
  - **Property 26: Form Initialization from Market Data**
  - **Validates: Requirements 22.5**
  - Test that form fields are correctly populated from market data
  - Generate random market data and verify initialization


- [ ] 20.4 Wire resolution flow end-to-end
  - Connect resolution form to status change endpoint
  - Ensure outcome and resolution_source are captured
  - Trigger payout calculation on backend
  - Display success confirmation
  - Update market display to show resolved status
  - _Requirements: 30.1-30.5_

- [ ]* 20.5 Write property test for resolution triggers payouts
  - **Property 29: Resolution Triggers Payouts**
  - **Validates: Requirements 30.4**
  - Test that resolution calls payout service
  - Verify payout calculation is triggered

- [ ] 20.6 Test complete market lifecycle flow
  - Create draft market through form
  - Edit draft market
  - Publish to active status
  - Attempt to edit locked fields (verify rejection)
  - Edit allowed fields (description, resolution_source)
  - Pause market
  - Resume market
  - Resolve market with outcome
  - Archive market
  - Verify audit trail has all entries
  - _Requirements: All lifecycle requirements_

### 21. Checkpoint - Core Functionality Complete

- [ ] 21.1 Ensure all tests pass
  - Run all unit tests
  - Run all property-based tests
  - Fix any failing tests
  - Ensure test coverage meets requirements (API routes 100%, validation 100%, business logic 90%)
  - Ask the user if questions arise

### 22. Documentation

- [ ] 22.1 Create API documentation
  - Document all endpoints with request/response examples
  - Document error codes and meanings
  - Document authentication requirements
  - Document rate limits if applicable
  - Use OpenAPI/Swagger format
  - _Requirements: Developer documentation_

- [ ] 22.2 Create admin user guide
  - Document how to create markets
  - Document market lifecycle and status transitions
  - Document bulk operations
  - Document export functionality
  - Include screenshots and examples
  - _Requirements: User documentation_

- [ ] 22.3 Create testing documentation
  - Document how to run tests
  - Document property-based test configuration
  - Document test coverage requirements
  - Document how to add new tests
  - _Requirements: Testing documentation_

### 23. Final Checkpoint - Complete System Verification

- [ ] 23.1 Perform end-to-end testing
  - Test complete market creation flow
  - Test all status transitions
  - Test bulk operations
  - Test real-time updates
  - Test image uploads
  - Test CSV export
  - Test audit trail
  - Test error handling
  - Test accessibility with screen reader
  - Test responsive design on multiple devices
  - Ensure all tests pass, ask the user if questions arise

## Notes

### Task Conventions

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Property-based tests validate universal correctness properties from the design document
- Unit tests validate specific examples, edge cases, and component behavior
- Checkpoints ensure incremental validation and provide opportunities for user feedback

### Implementation Order Rationale

1. **Database First**: Establishes data integrity constraints at the lowest level
2. **Backend API**: Builds on database with validation and business logic
3. **Frontend Components**: Consumes backend APIs with rich user interactions
4. **Real-Time Features**: Adds live updates on top of core functionality
5. **Integration**: Wires everything together and tests complete flows
6. **Documentation**: Captures implementation details for maintainability

### Testing Strategy

- **Property-Based Tests**: Validate universal properties across all inputs (29 properties from design)
- **Unit Tests**: Validate specific functionality and edge cases
- **Integration Tests**: Validate complete workflows and component interactions
- **Manual Testing**: Validate UX, accessibility, and visual design

### Coverage Requirements

- Backend API routes: 100% (critical security component)
- Validation layer: 100% (data integrity)
- Business logic: 90%
- Frontend components: 70% (visual components less critical)

### Accessibility Compliance

All components must meet WCAG 2.1 AA standards:
- ARIA labels on all inputs
- Keyboard navigation support
- Logical tab order
- Screen reader announcements for dynamic content
- 4.5:1 color contrast ratio minimum

### Premium UI Requirements

- Clean, minimal design with ample whitespace
- Professional fintech color palette
- Clear typography with appropriate font sizes and weights
- Subtle shadows and borders for visual hierarchy
- Smooth transitions for state changes
- Responsive design for all screen sizes
