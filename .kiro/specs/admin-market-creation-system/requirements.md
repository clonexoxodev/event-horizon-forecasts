# Requirements Document

## Introduction

The Admin Market Creation System enables authorized administrators to create, manage, and resolve prediction markets on the Flippe platform. This system provides a professional interface for market lifecycle management, from draft creation through resolution and archival, with comprehensive validation, audit trails, and real-time data display.

## Glossary

- **Admin_User**: A user with administrative privileges authorized to create and manage markets
- **Market**: A prediction market with a question, outcome options, pricing, and lifecycle dates
- **Market_Form**: The administrative interface for creating and editing markets
- **Market_Question**: The primary question text that defines what the market is predicting
- **Category**: A classification label for organizing markets by topic
- **Market_Type**: The structure of market outcomes (binary or multiple choice)
- **YES_Price**: The initial price percentage for the affirmative outcome (0-100)
- **NO_Price**: The initial price percentage for the negative outcome (0-100)
- **Close_Date**: The date and time when trading on the market ends
- **Resolution_Date**: The date and time when the market outcome is determined
- **Resolution_Source**: A text description or URL documenting the outcome verification source
- **Market_Status**: The current lifecycle state (draft, active, paused, resolved, archived)
- **Pool_Amount**: The total trading volume in the market
- **Participant_Count**: The number of unique users who have traded in the market
- **Audit_Trail**: A chronological record of all changes made to a market
- **Draft_Market**: A market in draft status that has not been published
- **Active_Market**: A published market accepting trades
- **Paused_Market**: A temporarily suspended market not accepting trades
- **Resolved_Market**: A market with a determined outcome
- **Archived_Market**: A resolved market moved to archive status
- **Validation_Feedback**: Real-time error or warning messages displayed during form input
- **Toast_Notification**: A temporary success or error message displayed to the user
- **Confirmation_Dialog**: A modal requiring explicit user confirmation before destructive actions
- **Market_Display**: The public-facing view showing market details and statistics
- **Image_Storage**: The system component handling market image uploads
- **Database**: The persistent data store for market information
- **API_Endpoint**: A server interface for market CRUD operations
- **Rich_Text_Editor**: An input component supporting formatted text for descriptions
- **Country_Filter**: An optional geographic classification for markets


## Requirements

### Requirement 1: Market Creation Form

**User Story:** As an Admin_User, I want to create new markets through a comprehensive form, so that I can publish prediction markets for users to trade.

#### Acceptance Criteria

1. THE Market_Form SHALL include a required Market_Question text input field
2. THE Market_Form SHALL include a required Category dropdown field
3. THE Market_Form SHALL include an optional Country_Filter dropdown field
4. THE Market_Form SHALL include a required Market_Type selection (binary or multiple choice)
5. THE Market_Form SHALL include a customizable YES label text input field
6. THE Market_Form SHALL include a customizable NO label text input field
7. THE Market_Form SHALL include a YES_Price numeric input field accepting values 0-100
8. THE Market_Form SHALL include a NO_Price numeric input field accepting values 0-100
9. THE Market_Form SHALL include a required Close_Date datetime picker accepting only future dates
10. THE Market_Form SHALL include a required Resolution_Date datetime picker
11. THE Market_Form SHALL include a Resolution_Source text input field accepting text or URL
12. THE Market_Form SHALL include a Rich_Text_Editor for market description
13. THE Market_Form SHALL include an image upload component for market icons
14. THE Market_Form SHALL include a Market_Status dropdown field

### Requirement 2: Price Validation

**User Story:** As an Admin_User, I want automatic price validation, so that market prices remain mathematically consistent.

#### Acceptance Criteria

1. WHEN YES_Price and NO_Price are both entered, THE Market_Form SHALL validate that their sum equals 100
2. WHEN YES_Price is modified, THE Market_Form SHALL display Validation_Feedback if the sum does not equal 100
3. WHEN NO_Price is modified, THE Market_Form SHALL display Validation_Feedback if the sum does not equal 100
4. THE Market_Form SHALL prevent submission when YES_Price plus NO_Price does not equal 100
5. THE Market_Form SHALL validate that YES_Price is between 0 and 100 inclusive
6. THE Market_Form SHALL validate that NO_Price is between 0 and 100 inclusive

### Requirement 3: Date Validation

**User Story:** As an Admin_User, I want automatic date validation, so that market timelines are logically consistent.

#### Acceptance Criteria

1. WHEN Close_Date is selected, THE Market_Form SHALL validate that it is a future date
2. WHEN Resolution_Date is selected, THE Market_Form SHALL validate that it is after Close_Date
3. THE Market_Form SHALL display Validation_Feedback when Close_Date is not a future date
4. THE Market_Form SHALL display Validation_Feedback when Resolution_Date is not after Close_Date
5. THE Market_Form SHALL prevent submission when date validation fails

### Requirement 4: Required Field Validation

**User Story:** As an Admin_User, I want clear indication of required fields, so that I can complete the form correctly.

#### Acceptance Criteria

1. THE Market_Form SHALL display a visual indicator for the Market_Question required field
2. THE Market_Form SHALL display a visual indicator for the Category required field
3. WHEN Market_Question is empty, THE Market_Form SHALL display Validation_Feedback on submission attempt
4. WHEN Category is not selected, THE Market_Form SHALL display Validation_Feedback on submission attempt
5. THE Market_Form SHALL prevent submission when any required field is empty

### Requirement 5: Real-Time Validation Feedback

**User Story:** As an Admin_User, I want immediate validation feedback, so that I can correct errors as I type.

#### Acceptance Criteria

1. WHEN a validation rule is violated, THE Market_Form SHALL display Validation_Feedback within 500ms
2. THE Validation_Feedback SHALL appear adjacent to the invalid field
3. THE Validation_Feedback SHALL describe the specific validation error
4. WHEN a validation error is corrected, THE Market_Form SHALL remove Validation_Feedback within 500ms
5. THE Market_Form SHALL use distinct visual styling for fields with validation errors

### Requirement 6: Draft Market Creation

**User Story:** As an Admin_User, I want to save markets as drafts, so that I can complete them later.

#### Acceptance Criteria

1. WHEN Market_Status is set to draft, THE Market_Form SHALL allow submission with incomplete optional fields
2. WHEN a draft is saved, THE Database SHALL store the market with draft status
3. WHEN a draft is saved, THE Market_Form SHALL display a Toast_Notification confirming success
4. THE Market_Form SHALL auto-save draft changes every 30 seconds
5. WHEN auto-save completes, THE Market_Form SHALL display a subtle save indicator

### Requirement 7: Active Market Publication

**User Story:** As an Admin_User, I want to publish markets, so that users can begin trading.

#### Acceptance Criteria

1. WHEN Market_Status is set to active, THE Market_Form SHALL validate all required fields before submission
2. WHEN an active market is published, THE Database SHALL store the market with active status
3. WHEN an active market is published, THE Market_Display SHALL show the market to all users
4. WHEN publication succeeds, THE Market_Form SHALL display a Toast_Notification confirming success
5. WHEN publication fails, THE Market_Form SHALL display a Toast_Notification with the error message

### Requirement 8: Market Editing Restrictions

**User Story:** As an Admin_User, I want appropriate editing restrictions based on market status, so that active markets maintain integrity.

#### Acceptance Criteria

1. WHEN editing a Draft_Market, THE Market_Form SHALL allow modification of all fields
2. WHEN editing an Active_Market, THE Market_Form SHALL allow modification of description and Resolution_Source only
3. WHEN editing an Active_Market, THE Market_Form SHALL disable Market_Question, Category, Market_Type, and price fields
4. WHEN editing a Resolved_Market, THE Market_Form SHALL disable all fields except Market_Status
5. WHEN editing an Archived_Market, THE Market_Form SHALL disable all fields

### Requirement 9: Market Status Transitions

**User Story:** As an Admin_User, I want to change market status, so that I can manage the market lifecycle.

#### Acceptance Criteria

1. WHEN an Active_Market status is changed to paused, THE Database SHALL update the market to Paused_Market
2. WHEN a Paused_Market status is changed to active, THE Database SHALL update the market to Active_Market
3. WHEN an Active_Market or Paused_Market is resolved, THE Database SHALL update the market to Resolved_Market
4. WHEN a Resolved_Market status is changed to archived, THE Database SHALL update the market to Archived_Market
5. WHEN a status transition occurs, THE Market_Form SHALL display a Confirmation_Dialog before applying the change

### Requirement 10: Market Deletion

**User Story:** As an Admin_User, I want to delete draft markets, so that I can remove unwanted entries.

#### Acceptance Criteria

1. WHERE a market is a Draft_Market, THE Market_Form SHALL display a delete action
2. WHEN delete is triggered on a Draft_Market, THE Market_Form SHALL display a Confirmation_Dialog
3. WHEN deletion is confirmed, THE Database SHALL permanently remove the Draft_Market
4. WHEN deletion succeeds, THE Market_Form SHALL display a Toast_Notification and redirect to the market list
5. WHERE a market is not a Draft_Market, THE Market_Form SHALL not display a delete action

### Requirement 11: Image Upload

**User Story:** As an Admin_User, I want to upload market images, so that markets have visual appeal.

#### Acceptance Criteria

1. WHEN an image is selected, THE Market_Form SHALL validate the file type is an image format
2. WHEN an image is selected, THE Market_Form SHALL validate the file size is under 5MB
3. WHEN image validation passes, THE Image_Storage SHALL upload the image and return a URL
4. WHEN upload succeeds, THE Market_Form SHALL display a preview of the uploaded image
5. WHEN upload fails, THE Market_Form SHALL display a Toast_Notification with the error message

### Requirement 12: Market Display Statistics

**User Story:** As a user, I want to see market statistics, so that I can make informed trading decisions.

#### Acceptance Criteria

1. THE Market_Display SHALL show the Pool_Amount for the market
2. THE Market_Display SHALL show the Participant_Count for the market
3. THE Market_Display SHALL show live YES percentage based on current trading prices
4. THE Market_Display SHALL show live NO percentage based on current trading prices
5. THE Market_Display SHALL update statistics within 2 seconds when trades occur

### Requirement 13: Market Display Countdown

**User Story:** As a user, I want to see time remaining, so that I know when trading closes.

#### Acceptance Criteria

1. WHILE Close_Date is in the future, THE Market_Display SHALL show a countdown timer
2. THE Market_Display SHALL update the countdown timer every second
3. THE Market_Display SHALL display the countdown in days, hours, minutes, and seconds format
4. WHEN Close_Date is reached, THE Market_Display SHALL display "Trading Closed" instead of the countdown
5. THE Market_Display SHALL use distinct visual styling for markets closing within 24 hours

### Requirement 14: Market Display Metadata

**User Story:** As a user, I want to see market metadata, so that I understand the market context.

#### Acceptance Criteria

1. THE Market_Display SHALL show the Category as a visual badge
2. THE Market_Display SHALL show the Market_Status as a visual indicator
3. WHERE Resolution_Source is a URL, THE Market_Display SHALL render it as a clickable link
4. WHERE Resolution_Source is text, THE Market_Display SHALL display it as plain text
5. WHERE Country_Filter is set, THE Market_Display SHALL display the country name or flag

### Requirement 15: Admin Market List

**User Story:** As an Admin_User, I want to view all markets in a list, so that I can manage them efficiently.

#### Acceptance Criteria

1. THE Admin_User interface SHALL display a list of all markets
2. THE market list SHALL show Market_Question, Market_Status, Close_Date, and Pool_Amount for each market
3. THE market list SHALL provide a search input filtering by Market_Question
4. THE market list SHALL provide filter dropdowns for Market_Status and Category
5. THE market list SHALL provide sort options for Close_Date, Pool_Amount, and creation date

### Requirement 16: Bulk Actions

**User Story:** As an Admin_User, I want to perform bulk actions, so that I can manage multiple markets efficiently.

#### Acceptance Criteria

1. THE market list SHALL provide checkboxes for selecting multiple markets
2. WHEN markets are selected, THE market list SHALL display bulk action buttons
3. THE market list SHALL provide a bulk pause action for Active_Market selections
4. THE market list SHALL provide a bulk archive action for Resolved_Market selections
5. WHEN a bulk action is triggered, THE market list SHALL display a Confirmation_Dialog showing the count of affected markets

### Requirement 17: Market Data Export

**User Story:** As an Admin_User, I want to export market data, so that I can analyze markets externally.

#### Acceptance Criteria

1. THE market list SHALL provide an export action
2. WHEN export is triggered, THE API_Endpoint SHALL generate a CSV file with all market data
3. THE CSV file SHALL include Market_Question, Category, Market_Status, Close_Date, Resolution_Date, Pool_Amount, and Participant_Count
4. WHEN export completes, THE market list SHALL trigger a file download
5. THE export SHALL include only markets matching current filters and search criteria

### Requirement 18: Role-Based Access Control

**User Story:** As a system administrator, I want admin features restricted to authorized users, so that market integrity is maintained.

#### Acceptance Criteria

1. THE Market_Form SHALL be accessible only to Admin_User accounts
2. WHEN a non-admin user attempts to access the Market_Form, THE system SHALL redirect to an unauthorized page
3. THE market list admin view SHALL be accessible only to Admin_User accounts
4. THE API_Endpoint for market creation SHALL validate Admin_User authorization
5. THE API_Endpoint for market modification SHALL validate Admin_User authorization

### Requirement 19: Audit Trail

**User Story:** As a system administrator, I want an audit trail of market changes, so that I can track administrative actions.

#### Acceptance Criteria

1. WHEN a market is created, THE Audit_Trail SHALL record the Admin_User, timestamp, and action
2. WHEN a market is modified, THE Audit_Trail SHALL record the Admin_User, timestamp, changed fields, and old values
3. WHEN a market status changes, THE Audit_Trail SHALL record the Admin_User, timestamp, old status, and new status
4. WHEN a market is deleted, THE Audit_Trail SHALL record the Admin_User, timestamp, and deleted market data
5. THE Audit_Trail SHALL be immutable and append-only

### Requirement 20: Database Constraints

**User Story:** As a system administrator, I want database-level validation, so that data integrity is enforced.

#### Acceptance Criteria

1. THE Database SHALL enforce a NOT NULL constraint on Market_Question
2. THE Database SHALL enforce a NOT NULL constraint on Category
3. THE Database SHALL enforce a CHECK constraint that YES_Price is between 0 and 100
4. THE Database SHALL enforce a CHECK constraint that NO_Price is between 0 and 100
5. THE Database SHALL enforce a CHECK constraint that Close_Date is after the creation timestamp

### Requirement 21: API Endpoints

**User Story:** As a developer, I want RESTful API endpoints, so that I can integrate market management into the application.

#### Acceptance Criteria

1. THE API_Endpoint SHALL provide a POST endpoint for creating markets
2. THE API_Endpoint SHALL provide a GET endpoint for retrieving market details
3. THE API_Endpoint SHALL provide a PUT endpoint for updating markets
4. THE API_Endpoint SHALL provide a DELETE endpoint for deleting Draft_Market entries
5. THE API_Endpoint SHALL provide a GET endpoint for listing markets with pagination, filtering, and sorting

### Requirement 22: Form State Management

**User Story:** As an Admin_User, I want reliable form state, so that my inputs are not lost.

#### Acceptance Criteria

1. WHEN navigating away from the Market_Form with unsaved changes, THE Market_Form SHALL display a Confirmation_Dialog
2. WHEN the browser is closed with unsaved draft changes, THE Market_Form SHALL restore the form state on next visit
3. THE Market_Form SHALL store form state in browser local storage
4. WHEN form submission fails, THE Market_Form SHALL preserve all entered values
5. WHEN returning to edit a market, THE Market_Form SHALL populate all fields with current values

### Requirement 23: Responsive Design

**User Story:** As an Admin_User, I want the interface to work on all devices, so that I can manage markets from anywhere.

#### Acceptance Criteria

1. THE Market_Form SHALL display in a single column layout on screens narrower than 768px
2. THE Market_Form SHALL display in a two column layout on screens 768px and wider
3. THE market list SHALL display in a card layout on screens narrower than 768px
4. THE market list SHALL display in a table layout on screens 768px and wider
5. THE Market_Display SHALL adapt layout for optimal readability on all screen sizes

### Requirement 24: Accessibility Compliance

**User Story:** As a user with disabilities, I want accessible interfaces, so that I can use the platform effectively.

#### Acceptance Criteria

1. THE Market_Form SHALL provide ARIA labels for all form inputs
2. THE Market_Form SHALL support keyboard navigation for all interactive elements
3. THE Market_Form SHALL maintain a logical tab order through form fields
4. THE Validation_Feedback SHALL be announced to screen readers when displayed
5. THE Market_Form SHALL maintain a minimum color contrast ratio of 4.5:1 for all text

### Requirement 25: Market Preview

**User Story:** As an Admin_User, I want to preview markets before publishing, so that I can verify appearance.

#### Acceptance Criteria

1. THE Market_Form SHALL provide a preview action
2. WHEN preview is triggered, THE Market_Form SHALL display the market using the Market_Display component
3. THE preview SHALL show all entered data including Market_Question, description, prices, and dates
4. THE preview SHALL display in a modal overlay
5. THE preview modal SHALL provide a close action returning to the Market_Form

### Requirement 26: Toast Notifications

**User Story:** As an Admin_User, I want clear feedback on actions, so that I know when operations succeed or fail.

#### Acceptance Criteria

1. WHEN a market is successfully created, THE system SHALL display a Toast_Notification with success message
2. WHEN a market is successfully updated, THE system SHALL display a Toast_Notification with success message
3. WHEN an operation fails, THE system SHALL display a Toast_Notification with error message
4. THE Toast_Notification SHALL automatically dismiss after 5 seconds
5. THE Toast_Notification SHALL provide a manual dismiss action

### Requirement 27: Confirmation Dialogs

**User Story:** As an Admin_User, I want confirmation before destructive actions, so that I can avoid mistakes.

#### Acceptance Criteria

1. WHEN deleting a Draft_Market, THE system SHALL display a Confirmation_Dialog
2. WHEN changing status to resolved, THE system SHALL display a Confirmation_Dialog
3. WHEN performing bulk actions, THE system SHALL display a Confirmation_Dialog
4. THE Confirmation_Dialog SHALL clearly describe the action and its consequences
5. THE Confirmation_Dialog SHALL provide explicit confirm and cancel actions

### Requirement 28: Premium UI Design

**User Story:** As a user, I want a professional interface, so that the platform feels trustworthy.

#### Acceptance Criteria

1. THE Market_Form SHALL use a clean, minimal design with ample whitespace
2. THE Market_Form SHALL use a professional color palette consistent with fintech aesthetics
3. THE Market_Form SHALL use clear typography with appropriate font sizes and weights
4. THE Market_Display SHALL use subtle shadows and borders for visual hierarchy
5. THE interface SHALL use smooth transitions for state changes and interactions

### Requirement 29: Real-Time Market Data Updates

**User Story:** As a user, I want live market data, so that I see current information.

#### Acceptance Criteria

1. WHEN a trade occurs, THE Market_Display SHALL update Pool_Amount within 2 seconds
2. WHEN a new participant trades, THE Market_Display SHALL update Participant_Count within 2 seconds
3. WHEN prices change, THE Market_Display SHALL update YES and NO percentages within 2 seconds
4. THE Market_Display SHALL establish a real-time connection for data updates
5. WHEN the real-time connection fails, THE Market_Display SHALL fall back to polling every 5 seconds

### Requirement 30: Market Resolution

**User Story:** As an Admin_User, I want to resolve markets with outcomes, so that users receive payouts.

#### Acceptance Criteria

1. WHEN resolving a market, THE Market_Form SHALL provide outcome selection (YES, NO, or invalid)
2. WHEN an outcome is selected, THE Market_Form SHALL require Resolution_Source to be populated
3. WHEN resolution is submitted, THE Database SHALL update the market to Resolved_Market with the outcome
4. WHEN resolution succeeds, THE system SHALL trigger payout calculations for participants
5. WHEN resolution is submitted, THE Market_Form SHALL display a Confirmation_Dialog requiring explicit confirmation

