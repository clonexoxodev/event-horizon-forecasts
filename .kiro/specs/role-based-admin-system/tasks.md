# Implementation Plan: Role-Based Admin System

## Overview

This implementation plan breaks down the role-based admin system into discrete coding tasks. The system introduces a three-tier permission model (user, admin, super_admin) with secure, hierarchical access control. Implementation follows a bottom-up approach: database schema → backend middleware → backend routes → frontend auth → frontend components → integration.

## Tasks

- [x] 1. Database schema and migration
  - [x] 1.1 Add role column to users table with constraints
    - Add role column with CHECK constraint for valid values
    - Set default value to 'user'
    - Create index on role column for efficient queries
    - Add migration to set fehintoluwaolu@gmail.com to 'super_admin'
    - _Requirements: 1.1, 1.2, 1.3, 2.3_

  - [ ]* 1.2 Write property test for role enum validation
    - **Property 1: Role Enum Validation**
    - **Validates: Requirements 1.1**

- [x] 2. Backend authentication middleware updates
  - [x] 2.1 Update auth middleware to fetch role from database
    - Modify requireAuth middleware to fetch current role on each request
    - Attach role to request object alongside userId
    - Ensure role is fetched fresh, not from cached token
    - _Requirements: 12.1, 12.2_

  - [x] 2.2 Modify login endpoint to handle primary super admin
    - Check if email is fehintoluwaolu@gmail.com
    - If yes, ensure role is set to 'super_admin' in database
    - Include role in login response
    - _Requirements: 2.1, 2.3, 2.4_

  - [x] 2.3 Modify signup endpoint to handle primary super admin
    - Check if email is fehintoluwaolu@gmail.com during signup
    - If yes, set role to 'super_admin' instead of default 'user'
    - Include role in signup response
    - _Requirements: 2.2, 2.3_

  - [x] 2.4 Update /api/auth/me endpoint to include role
    - Fetch fresh role from database
    - Include role in response payload
    - _Requirements: 12.4_

  - [ ]* 2.5 Write property test for default role assignment
    - **Property 2: Default Role Assignment**
    - **Validates: Requirements 1.2**

  - [ ]* 2.6 Write property test for primary super admin auto-provisioning
    - **Property 4: Primary Super Admin Auto-Provisioning**
    - **Validates: Requirements 2.3, 2.4**

- [x] 3. Backend role authorization middleware
  - [x] 3.1 Create requireRole middleware
    - Accept required role(s) as parameter
    - Fetch current role from database using userId
    - Compare against required role using hierarchy (user=0, admin=1, super_admin=2)
    - Return 403 if role insufficient
    - Log authorization attempts
    - _Requirements: 10.1, 10.2, 10.4, 10.5_

  - [x] 3.2 Create protectPrimarySuperAdmin middleware
    - Check if target userId corresponds to fehintoluwaolu@gmail.com
    - Return 403 with specific error if attempting to modify primary super admin
    - Log protection events
    - _Requirements: 2.5, 4.3_

  - [ ]* 3.3 Write property test for self-role modification prevention
    - **Property 3: Self-Role Modification Prevention**
    - **Validates: Requirements 1.4, 11.2**

  - [ ]* 3.4 Write property test for primary super admin protection
    - **Property 5: Primary Super Admin Protection**
    - **Validates: Requirements 2.5, 4.3**

  - [ ]* 3.5 Write unit tests for requireRole middleware
    - Test all role combinations (user, admin, super_admin)
    - Test 403 responses for insufficient roles
    - Test successful authorization for sufficient roles
    - _Requirements: 10.1, 10.2_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Backend admin management endpoints
  - [x] 5.1 Create POST /api/admin/add-admin endpoint
    - Apply requireAuth and requireRole('super_admin') middleware
    - Validate email in request body
    - Check if user exists in database
    - Return 400 if user not found
    - Check if user already has admin or super_admin role
    - Return 409 if already admin
    - Update user role to 'admin'
    - Return success response with user object
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 5.2 Create POST /api/admin/remove-admin endpoint
    - Apply requireAuth, requireRole('super_admin'), and protectPrimarySuperAdmin middleware
    - Validate userId in request body
    - Check if user exists
    - Return 404 if user not found
    - Update user role from 'admin' to 'user'
    - Return success response with user object
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 5.3 Create GET /api/admin/list-admins endpoint
    - Apply requireAuth and requireRole('super_admin') middleware
    - Query all users with role 'admin' or 'super_admin'
    - Mark fehintoluwaolu@gmail.com with isPrimary flag
    - Return array of admin objects with id, email, username, role, isPrimary
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 5.4 Create GET /api/admin/analytics endpoint
    - Apply requireAuth and requireRole('super_admin') middleware
    - Query total users count
    - Query total forecasts count
    - Query total volume sum
    - Query active markets count
    - Query resolved markets count
    - Query pending markets count
    - Return analytics object with all fields
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 5.5 Write property test for add admin email validation
    - **Property 6: Add Admin Email Validation**
    - **Validates: Requirements 3.2, 3.4**

  - [ ]* 5.6 Write property test for add admin role update
    - **Property 7: Add Admin Role Update**
    - **Validates: Requirements 3.3**

  - [ ]* 5.7 Write property test for remove admin role downgrade
    - **Property 8: Remove Admin Role Downgrade**
    - **Validates: Requirements 4.2**

  - [ ]* 5.8 Write property test for analytics response completeness
    - **Property 14: Analytics Response Completeness**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7**

  - [ ]* 5.9 Write property test for admin list completeness
    - **Property 15: Admin List Completeness**
    - **Validates: Requirements 8.1**

  - [ ]* 5.10 Write property test for admin list response structure
    - **Property 16: Admin List Response Structure**
    - **Validates: Requirements 8.3, 8.4**

  - [ ]* 5.11 Write property test for admin list access restriction
    - **Property 17: Admin List Access Restriction**
    - **Validates: Requirements 8.5**

  - [ ]* 5.12 Write unit tests for admin management endpoints
    - Test add-admin success and error cases
    - Test remove-admin success and error cases
    - Test list-admins response structure
    - Test analytics response structure
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 8.1, 7.1_

- [ ] 6. Backend market management endpoints
  - [x] 6.1 Update POST /api/markets/create endpoint
    - Apply requireAuth and requireRole('admin') middleware
    - Validate market creation payload
    - Create market in database
    - Return market object
    - _Requirements: 5.1_

  - [x] 6.2 Update PUT /api/markets/:marketId endpoint
    - Apply requireAuth and requireRole('admin') middleware
    - Validate marketId parameter
    - Validate update payload
    - Update market in database
    - Return updated market object
    - _Requirements: 5.2_

  - [x] 6.3 Update POST /api/markets/:marketId/resolve endpoint
    - Apply requireAuth and requireRole('admin') middleware
    - Validate marketId parameter
    - Validate winningSide in payload
    - Check if market already resolved
    - Return 400 if already resolved
    - Resolve market in database
    - Return resolved market object
    - _Requirements: 5.3_

  - [x] 6.4 Update POST /api/markets/:marketId/close endpoint
    - Apply requireAuth and requireRole('admin') middleware
    - Validate marketId parameter
    - Close market in database
    - Return closed market object
    - _Requirements: 5.4_

  - [ ]* 6.5 Write property test for admin market management authorization
    - **Property 10: Admin Market Management Authorization**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

  - [ ]* 6.6 Write property test for user market management denial
    - **Property 11: User Market Management Denial**
    - **Validates: Requirements 5.5**

  - [ ]* 6.7 Write property test for admin cannot manage admins
    - **Property 12: Admin Cannot Manage Admins**
    - **Validates: Requirements 6.1, 6.2**

  - [ ]* 6.8 Write property test for admin cannot access super admin routes
    - **Property 13: Admin Cannot Access Super Admin Routes**
    - **Validates: Requirements 6.4**

  - [ ]* 6.9 Write unit tests for market management endpoints
    - Test create, edit, resolve, close with admin role
    - Test 403 responses for user role
    - Test error cases (not found, already resolved)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 7. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [-] 8. Frontend auth context updates
  - [x] 8.1 Update AuthUser type to include role field
    - Add role field with type 'user' | 'admin' | 'super_admin'
    - Update all AuthUser usages across the codebase
    - _Requirements: 12.4_

  - [x] 8.2 Create role utility functions
    - Implement hasRole(user, role) function with hierarchy check
    - Implement isSuperAdmin(user) function
    - Implement isAdmin(user) function
    - Export functions from auth context
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 8.3 Update auth context to fetch and store role
    - Modify login function to extract role from response
    - Modify signup function to extract role from response
    - Modify loadUser function to fetch role from /api/auth/me
    - Store role in AuthUser state
    - _Requirements: 12.3, 12.4, 12.5_

  - [ ]* 8.4 Write unit tests for role utility functions
    - Test hasRole with all role combinations
    - Test isSuperAdmin with all roles
    - Test isAdmin with all roles
    - Test null user handling
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [-] 9. Frontend route guards
  - [x] 9.1 Create ProtectedRoute component
    - Accept children, requiredRole, and redirectTo props
    - Check if user is authenticated
    - Redirect to login if not authenticated
    - Check if user has required role using hasRole utility
    - Redirect to home if role insufficient
    - Render children if authorized
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 9.2 Write property test for frontend user route blocking
    - **Property 18: Frontend User Route Blocking**
    - **Validates: Requirements 9.1**

  - [ ]* 9.3 Write property test for frontend admin route blocking
    - **Property 19: Frontend Admin Route Blocking**
    - **Validates: Requirements 9.2**

  - [ ]* 9.4 Write property test for frontend admin route access
    - **Property 20: Frontend Admin Route Access**
    - **Validates: Requirements 9.3**

  - [ ]* 9.5 Write property test for frontend super admin route access
    - **Property 21: Frontend Super Admin Route Access**
    - **Validates: Requirements 9.4**

  - [ ]* 9.6 Write property test for frontend unauthenticated redirect
    - **Property 22: Frontend Unauthenticated Redirect**
    - **Validates: Requirements 9.5**

  - [ ]* 9.7 Write unit tests for ProtectedRoute component
    - Test redirect to login for unauthenticated users
    - Test redirect to home for insufficient role
    - Test rendering children for authorized users
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 10. Frontend admin dashboard page
  - [x] 10.1 Create AdminDashboard component
    - Create market creation form with fields (question, description, currency, minPosition, maxPosition, closesAt)
    - Implement form submission to POST /api/markets/create
    - Display active markets list
    - Add edit, close, and resolve buttons for each market
    - Implement edit market functionality (PUT /api/markets/:marketId)
    - Implement close market functionality (POST /api/markets/:marketId/close)
    - Implement resolve market functionality (POST /api/markets/:marketId/resolve)
    - Display market statistics
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 10.2 Write unit tests for AdminDashboard component
    - Test market creation form submission
    - Test market edit functionality
    - Test market close functionality
    - Test market resolve functionality
    - Test error handling
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [-] 11. Frontend super admin dashboard page
  - [x] 11.1 Create SuperAdminDashboard component
    - Create analytics section with cards for totalUsers, totalForecasts, totalVolume, activeMarkets, resolvedMarkets, pendingMarkets
    - Fetch analytics from GET /api/admin/analytics
    - Create admin management section
    - Create add admin form with email input
    - Implement add admin functionality (POST /api/admin/add-admin)
    - Fetch admin list from GET /api/admin/list-admins
    - Display admin list with email, username, and role
    - Add remove button for each admin (except primary super admin)
    - Implement remove admin functionality (POST /api/admin/remove-admin)
    - Display primary super admin indicator
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.8, 3.1, 4.1, 8.1, 8.2, 8.3, 8.4_

  - [ ]* 11.2 Write unit tests for SuperAdminDashboard component
    - Test analytics display
    - Test add admin form submission
    - Test admin list rendering
    - Test remove admin functionality
    - Test primary super admin protection (no remove button)
    - Test error handling
    - _Requirements: 7.1, 3.1, 4.1, 8.1_

- [-] 12. Frontend routing and navigation updates
  - [x] 12.1 Add protected routes to App.tsx
    - Add /admin route with ProtectedRoute wrapper (requiredRole='admin')
    - Add /super-admin route with ProtectedRoute wrapper (requiredRole='super_admin')
    - Wire AdminDashboard component to /admin route
    - Wire SuperAdminDashboard component to /super-admin route
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [x] 12.2 Update navigation component to show/hide admin links
    - Show "Admin" link if user role is 'admin' or 'super_admin'
    - Show "Super Admin" link if user role is 'super_admin'
    - Hide admin links for regular users
    - Use isAdmin and isSuperAdmin utility functions
    - _Requirements: 9.1, 9.2_

  - [ ]* 12.3 Write unit tests for navigation component
    - Test admin link visibility for admin role
    - Test admin link visibility for super_admin role
    - Test admin link hidden for user role
    - Test super admin link visibility for super_admin role
    - Test super admin link hidden for admin role
    - _Requirements: 9.1, 9.2_

- [x] 13. Backend authorization property tests
  - [ ]* 13.1 Write property test for backend user authorization
    - **Property 23: Backend User Authorization**
    - **Validates: Requirements 10.1**

  - [ ]* 13.2 Write property test for backend admin authorization
    - **Property 24: Backend Admin Authorization**
    - **Validates: Requirements 10.2**

  - [ ]* 13.3 Write property test for backend unauthenticated authorization
    - **Property 25: Backend Unauthenticated Authorization**
    - **Validates: Requirements 10.3**

- [x] 14. Immediate role effect verification
  - [ ]* 14.1 Write property test for immediate role effect
    - **Property 9: Immediate Role Effect**
    - **Validates: Requirements 4.4, 12.3**

  - [ ]* 14.2 Write integration test for role change immediate effect
    - Create user, promote to admin, verify admin access
    - Demote admin to user, verify access revoked
    - Test without requiring re-login
    - _Requirements: 4.4, 12.3_

- [x] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property-based tests use fast-check with minimum 100 iterations
- Backend middleware is critical security component - requires 100% test coverage
- Primary super admin email (fehintoluwaolu@gmail.com) is hardcoded in backend
- Role hierarchy: user (0) < admin (1) < super_admin (2)
- All role checks performed on backend with fresh database fetch
- Frontend route guards provide UX, backend authorization provides security
- Checkpoints ensure incremental validation throughout implementation
