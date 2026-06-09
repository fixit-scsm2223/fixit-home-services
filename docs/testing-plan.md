# Testing Plan

This document describes how the FixIt system will be tested.

## Testing Areas

The project will test:

1. Authentication
2. Role-based access
3. Customer workflow
4. Provider workflow
5. Admin workflow
6. Database operations
7. API responses
8. Responsive user interface
9. Android build using Capacitor

## Authentication Tests

- User can register successfully.
- User can log in with correct email and password.
- User cannot log in with wrong password.
- Protected pages cannot be accessed without login.
- JWT token is required for protected API routes.

## Role-Based Access Tests

- Customer can access customer pages only.
- Provider can access provider pages only.
- Admin can access admin pages only.
- Customer cannot access admin pages.
- Provider cannot verify other providers.

## Customer Workflow Tests

- Customer can browse service categories.
- Customer can browse verified providers.
- Customer can filter providers.
- Customer can view provider details.
- Customer can create a job booking.
- Customer can view booking history.
- Customer can confirm final cost.
- Customer can leave a review after completion.

## Provider Workflow Tests

- Provider can create a profile.
- Provider can select service categories.
- Provider can upload mock KYC document.
- Provider cannot go live before admin verification.
- Provider can view job requests.
- Provider can accept or reject jobs.
- Provider can update job status.
- Provider can enter final cost.

## Admin Workflow Tests

- Admin can view pending providers.
- Admin can verify providers.
- Admin can reject providers.
- Admin can manage service categories.
- Admin can view all jobs.

## API Tests

- API returns JSON responses.
- API uses correct HTTP status codes.
- API validates required fields.
- API blocks unauthorized access.
- API uses prepared statements for database queries.

## UI Tests

- Pages work on mobile screen size.
- Pages work on tablet screen size.
- Pages work on desktop screen size.
- Forms show validation messages.
- Navigation works correctly.

## Final Demo Test Flow

1. Register as provider.
2. Create provider profile.
3. Upload mock KYC document.
4. Login as admin.
5. Verify provider.
6. Login as customer.
7. Browse verified provider.
8. Create job booking.
9. Login as provider.
10. Accept job.
11. Update job status to in progress.
12. Mark job completed.
13. Enter final cost.
14. Login as customer.
15. Confirm final cost.
16. Submit review.
