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
8. File upload security
9. In-app chat
10. Map and geolocation features
11. Provider availability
12. Recurring bookings
13. Responsive user interface
14. Android build using Capacitor
15. Deployment and final integration

## Authentication Tests

* User can register successfully.
* User can log in with correct email and password.
* User cannot log in with wrong password.
* Password is stored as a hashed password.
* Protected pages cannot be accessed without login.
* JWT token is required for protected API routes.
* Invalid or expired JWT token is rejected.

## Role-Based Access Tests

* Customer can access customer pages only.
* Provider can access provider pages only.
* Admin can access admin pages only.
* Customer cannot access admin pages.
* Customer cannot access provider-only job management pages.
* Provider cannot verify other providers.
* Provider cannot access admin-only category management.
* Admin can access provider verification and monitoring pages.

## Customer Workflow Tests

* Customer can browse service categories.
* Customer can browse verified providers.
* Customer can filter providers by category.
* Customer can filter providers by distance.
* Customer can filter providers by price.
* Customer can filter providers by rating.
* Customer can view provider details.
* Customer can create a job booking.
* Customer can view booking history.
* Customer can view job ticket details.
* Customer can track job status.
* Customer can confirm final cost.
* Customer can receive a rating prompt after job completion.
* Customer can leave a review after completion.

## Provider Workflow Tests

* Provider can create a profile.
* Provider can enter location, base rate, and bio.
* Provider can upload a profile photo.
* Provider can select service categories.
* Provider can upload mock KYC document.
* Provider cannot go live before admin verification.
* Provider can view job requests.
* Provider can accept or reject jobs.
* Provider can update job status.
* Provider can enter final cost.
* Provider can manage availability calendar.
* Provider can create auto-confirm availability slots.

## Admin Workflow Tests

* Admin can view pending providers.
* Admin can review mock KYC document.
* Admin can verify providers.
* Admin can reject providers.
* Admin can suspend providers.
* Admin can manage service categories.
* Admin can view all users.
* Admin can view all providers.
* Admin can view all jobs.
* Admin can add dispute or safety notes.
* Admin can monitor platform activity.

## Chat Tests

* Customer can send a message after booking is accepted.
* Provider can reply to customer message.
* Messages are linked to the correct job.
* Users cannot access messages for jobs they are not involved in.

## Map and Geolocation Tests

* Map view displays nearby providers.
* Provider location appears correctly on the map.
* Customer can use location auto-detect.
* Nearby provider search works based on customer location.
* The system handles location permission denied case.

## Recurring Booking Tests

* Customer can create a recurring booking.
* Customer can view recurring bookings.
* Customer can update recurring booking details.
* Customer can cancel recurring booking.
* Recurring booking does not create duplicate jobs incorrectly.

## File Upload Tests

* Provider can upload mock KYC document.
* Only allowed file types are accepted.
* Invalid file types are rejected.
* File size limit is checked.
* Uploaded file path is saved correctly.
* Admin can view uploaded KYC document.

## API Tests

* API returns JSON responses.
* API uses correct HTTP status codes.
* API validates required fields.
* API blocks unauthorized access.
* API uses prepared statements for database queries.
* API returns clear error messages.
* API protects customer, provider, and admin routes correctly.

## Database Tests

* User data is saved correctly.
* ProviderProfile is linked to User.
* ProviderCategory correctly links ProviderProfile and ServiceCategory.
* Job is linked to customer, provider, and service category.
* Review is linked to the correct job.
* Message is linked to the correct job and sender.
* Foreign key relationships work correctly.

## UI Tests

* Pages work on mobile screen size.
* Pages work on tablet screen size.
* Pages work on desktop screen size.
* Forms show validation messages.
* Navigation works correctly.
* Buttons and links are clear and usable.
* Main pages are readable and responsive.

## Android Build Tests

* App builds successfully using Capacitor.
* App opens on Android emulator or device.
* Main customer pages display correctly.
* Login works on Android build.
* Geolocation feature works or shows proper permission message.
* Navigation works on Android build.

## Final Demo Test Flow

1. Register as provider.
2. Create provider profile.
3. Select provider service categories.
4. Upload mock KYC document.
5. Login as admin.
6. Review pending provider.
7. Verify provider.
8. Login as customer.
9. Browse verified provider.
10. Filter provider by category, price, distance, or rating.
11. View provider details.
12. Create job booking.
13. Login as provider.
14. Accept job.
15. Update job status to in progress.
16. Send message between customer and provider.
17. Mark job completed.
18. Enter final cost.
19. Login as customer.
20. Confirm final cost.
21. Submit rating and review.
22. View provider on map.
23. Test Android build using Capacitor.

