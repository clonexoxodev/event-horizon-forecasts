# Requirements Document

## Introduction

This document defines the requirements for a professional role-based admin system for Flippe, a prediction platform. The system implements three distinct roles (user, admin, super_admin) with hierarchical permissions, ensuring secure access control for platform administration and market management.

## Glossary

- **System**: The role-based admin system for Flippe
- **User**: A normal platform user with standard access privileges
- **Admin**: A privileged user who can manage markets but cannot manage other admins
- **Super_Admin**: The highest privilege user who can manage admins and access all platform analytics
- **Primary_Super_Admin**: The permanent super admin with email fehintoluwaolu@gmail.com
- **Role**: A classification that determines user permissions (user, admin, or super_admin)
- **Admin_Route**: A protected endpoint or page accessible only to admin or super_admin roles
- **Super_Admin_Route**: A protected endpoint or page accessible only to super_admin role
- **Admin_Dashboard**: The interface where super_admin manages admins and views analytics
- **Market**: A prediction market that users can forecast on
- **Profile**: A user account record in the database
- **Auth_Provider**: Supabase authentication service
- **Role_Check**: A security validation that verifies user role before granting access

## Requirements

### Requirement 1: Role Management

**User Story:** As a platform owner, I want a three-tier role system, so that I can control access to administrative functions.

#### Acceptance Criteria

1. THE System SHALL support exactly three roles: user, admin, and super_admin
2. WHEN a new user signs up, THE System SHALL assign the role "user" by default
3. THE System SHALL store the role field in the users table
4. THE System SHALL prevent users from modifying their own role directly

### Requirement 2: Primary Super Admin Auto-Provisioning

**User Story:** As the platform owner, I want my email to automatically become super admin, so that I always have full platform access.

#### Acceptance Criteria

1. WHEN a user with email "fehintoluwaolu@gmail.com" signs in, THE System SHALL verify if a profile exists
2. IF the profile does not exist for email "fehintoluwaolu@gmail.com", THEN THE System SHALL create a new profile automatically
3. WHEN a user with email "fehintoluwaolu@gmail.com" signs in, THE System SHALL set the role to "super_admin"
4. THE System SHALL execute the role assignment for "fehintoluwaolu@gmail.com" on every sign-in to ensure permanence
5. THE System SHALL prevent any user from removing super_admin role from "fehintoluwaolu@gmail.com"

### Requirement 3: Admin Assignment by Super Admin

**User Story:** As a super admin, I want to add admins by email, so that I can delegate market management responsibilities.

#### Acceptance Criteria

1. WHERE the user has role "super_admin", THE System SHALL provide an interface to add admins by email
2. WHEN a super admin submits an email to add as admin, THE System SHALL verify the email exists in the users table
3. IF the email exists in the users table, THEN THE System SHALL update the role to "admin"
4. IF the email does not exist in the users table, THEN THE System SHALL return an error message indicating the user must sign up first
5. THE System SHALL prevent adding "fehintoluwaolu@gmail.com" to the admin list as a regular admin

### Requirement 4: Admin Removal by Super Admin

**User Story:** As a super admin, I want to remove admin access, so that I can revoke privileges when needed.

#### Acceptance Criteria

1. WHERE the user has role "super_admin", THE System SHALL provide an interface to remove admin access
2. WHEN a super admin removes admin access from a user, THE System SHALL change the role from "admin" to "user"
3. THE System SHALL prevent removal of super_admin role from "fehintoluwaolu@gmail.com"
4. WHEN admin access is removed, THE System SHALL immediately revoke access to all Admin_Routes for that user

### Requirement 5: Market Management by Admins

**User Story:** As an admin, I want to create and manage markets, so that I can maintain the prediction platform.

#### Acceptance Criteria

1. WHERE the user has role "admin" or "super_admin", THE System SHALL allow creating new markets
2. WHERE the user has role "admin" or "super_admin", THE System SHALL allow editing existing markets
3. WHERE the user has role "admin" or "super_admin", THE System SHALL allow resolving markets with a winning side
4. WHERE the user has role "admin" or "super_admin", THE System SHALL allow closing markets before the scheduled close time
5. WHERE the user has role "user", THE System SHALL deny access to market management functions

### Requirement 6: Admin Permission Restrictions

**User Story:** As a platform owner, I want admins to have limited permissions, so that they cannot escalate privileges or manage other admins.

#### Acceptance Criteria

1. WHERE the user has role "admin", THE System SHALL deny access to add other admins
2. WHERE the user has role "admin", THE System SHALL deny access to remove admin access from any user
3. WHERE the user has role "admin", THE System SHALL deny access to modify the Primary_Super_Admin
4. WHERE the user has role "admin", THE System SHALL deny access to Super_Admin_Routes
5. WHERE the user has role "admin", THE System SHALL deny access to view the admin management section

### Requirement 7: Super Admin Dashboard Analytics

**User Story:** As a super admin, I want to view platform analytics, so that I can monitor platform health and activity.

#### Acceptance Criteria

1. WHERE the user has role "super_admin", THE System SHALL display total users count
2. WHERE the user has role "super_admin", THE System SHALL display total forecasts count
3. WHERE the user has role "super_admin", THE System SHALL display total volume in monetary units
4. WHERE the user has role "super_admin", THE System SHALL display active markets count
5. WHERE the user has role "super_admin", THE System SHALL display resolved markets count
6. WHERE the user has role "super_admin", THE System SHALL display pending markets count
7. WHERE the user has role "super_admin", THE System SHALL display a platform activity feed
8. WHERE the user has role "super_admin", THE System SHALL display an admin management section

### Requirement 8: Admin List Visibility

**User Story:** As a super admin, I want to view all admins, so that I can see who has administrative access.

#### Acceptance Criteria

1. WHERE the user has role "super_admin", THE System SHALL display a list of all users with role "admin"
2. WHERE the user has role "super_admin", THE System SHALL display the Primary_Super_Admin in the admin list with a special indicator
3. THE System SHALL display admin email addresses in the admin list
4. THE System SHALL display admin usernames in the admin list
5. WHERE the user has role "admin" or "user", THE System SHALL deny access to view the admin list

### Requirement 9: Frontend Route Protection

**User Story:** As a platform owner, I want protected routes on the frontend, so that unauthorized users cannot access admin interfaces.

#### Acceptance Criteria

1. WHEN a user with role "user" attempts to access an Admin_Route, THE System SHALL redirect to the home page
2. WHEN a user with role "admin" attempts to access a Super_Admin_Route, THE System SHALL redirect to the home page
3. WHEN a user with role "admin" or "super_admin" accesses an Admin_Route, THE System SHALL render the requested page
4. WHEN a user with role "super_admin" accesses a Super_Admin_Route, THE System SHALL render the requested page
5. WHEN an unauthenticated user attempts to access an Admin_Route or Super_Admin_Route, THE System SHALL redirect to the login page

### Requirement 10: Backend Route Protection

**User Story:** As a platform owner, I want protected API endpoints, so that unauthorized users cannot perform admin actions via direct API calls.

#### Acceptance Criteria

1. WHEN a user with role "user" calls an admin API endpoint, THE System SHALL return HTTP 403 Forbidden
2. WHEN a user with role "admin" calls a super admin API endpoint, THE System SHALL return HTTP 403 Forbidden
3. WHEN an unauthenticated user calls an admin or super admin API endpoint, THE System SHALL return HTTP 401 Unauthorized
4. THE System SHALL perform Role_Check on the backend for every admin and super admin API endpoint
5. THE System SHALL validate the user session token before performing any Role_Check

### Requirement 11: Privilege Escalation Prevention

**User Story:** As a platform owner, I want to prevent privilege escalation, so that users cannot gain unauthorized admin access.

#### Acceptance Criteria

1. THE System SHALL reject any direct database update that attempts to change a user role without proper authorization
2. THE System SHALL reject any API request that attempts to modify the role field in the users table from a non-super_admin user
3. THE System SHALL log all role modification attempts for security auditing
4. THE System SHALL validate that role changes originate from authenticated super_admin sessions
5. IF a user attempts to modify their own role via API manipulation, THEN THE System SHALL reject the request and log the attempt

### Requirement 12: Role Persistence and Session Management

**User Story:** As a user, I want my role to be checked on every request, so that role changes take effect immediately.

#### Acceptance Criteria

1. WHEN a user makes an authenticated request, THE System SHALL fetch the current role from the database
2. THE System SHALL not cache role information in the session token beyond the initial authentication
3. WHEN a user's role is changed by a super admin, THE System SHALL apply the new role on the user's next request
4. THE System SHALL include the user role in the Auth_Provider context for frontend access control
5. THE System SHALL refresh the user role when the authentication context is reloaded
