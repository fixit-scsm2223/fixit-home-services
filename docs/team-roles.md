# Team Roles

This project is handled by two combined groups with a total of 7 members. The work is divided to satisfy three main conditions:

1. The work should be fair and balanced.
2. Each group should be able to work independently without waiting for the other group.
3. All P5 FixIt features, including must-have, should-have, stretch features, data model, and entrepreneurial angle, must be covered.

## Contribution Percentage

| Group   |   Members | Main Responsibility                          | Contribution |
| ------- | --------: | -------------------------------------------- | -----------: |
| Group A | 4 members | Customer + Provider Marketplace Workflow     |          57% |
| Group B | 3 members | Admin + Platform Management + Infrastructure |          43% |
| Total   | 7 members | Complete FixIt System                        |         100% |

Each member contributes approximately 14.3% of the project.

---

# Group A - Customer + Provider Marketplace Workflow

Group A handles the main marketplace workflow where a customer finds a provider, books a service, and the provider manages the job until completion.

Main workflow:

Customer searches providers → customer books service → provider accepts job → provider updates job status → customer confirms final cost → customer submits review.

## Member 1 - Customer Browsing and Filtering Lead

Member 1 handles the customer browsing part of the system.

Responsibilities:

* Home page
* Service category page
* Provider listing page
* Provider details page
* Customer search and filter features
* Filter providers by category, distance, price, and rating
* Responsive customer browsing interface

Covered features:

* Customer browses providers
* Customer filters providers by category, distance, price, and rating
* Service category display

---

## Member 2 - Booking, Job Ticket, Review, and Recurring Booking Lead

Member 2 handles the customer booking process.

Responsibilities:

* Create booking page
* Customer dashboard
* My bookings page
* Job ticket page
* Job status display for customer
* Final cost confirmation page
* Tip/rating prompt after job completion
* Review and rating page
* Recurring booking option

Covered features:

* Booking workflow
* Job ticket with status updates
* Final cost confirmation
* Review and rating system
* Tip/rating prompt
* Recurring bookings

---

## Member 3 - Provider Profile, Provider Jobs, and Availability Lead

Member 3 handles the provider side of the system.

Responsibilities:

* Provider profile page
* Provider dashboard
* Provider category selection
* Provider base rate, location, and photo
* Mock KYC upload page
* Provider job request page
* Accept/reject job page
* Job status update page
* Final cost entry page
* Provider availability calendar

Covered features:

* Provider profile with categories, rate, location, photo, and KYC upload
* Provider job management
* Provider accepts or rejects jobs
* Provider updates job status
* Provider enters final cost
* Provider availability calendar with auto-confirm slots

---

## Member 4 - Marketplace Backend, Authentication, Chat, and Booking APIs Lead

Member 4 handles the main backend connection for the customer and provider marketplace workflow.

Responsibilities:

* Customer registration and login API
* Provider registration and login API
* JWT authentication for customer and provider
* Role-based access for customer and provider
* Browse providers API
* Provider details API
* Create job API
* Customer job history API
* Provider job management API
* Review API
* In-app chat API
* Recurring booking API
* Marketplace integration testing

Covered features:

* JWT authentication
* Role-based access
* Customer/provider APIs
* Booking workflow backend
* Review backend
* In-app chat between customer and provider
* Recurring booking backend

---

# Group B - Admin + Platform Management + Infrastructure

Group B handles the admin control side and the system backbone. This includes provider verification, category management, database, security, testing, deployment, map, geolocation, and mobile build support.

Main workflow:

Admin verifies providers → admin manages categories → admin monitors jobs → system supports database, security, testing, deployment, and mobile build.

## Member 5 - Admin Verification, Safety, and Business Model Lead

Member 5 handles the admin verification and trust/safety part of the system.

Responsibilities:

* Admin dashboard
* Provider verification page
* Mock KYC document review
* Approve provider
* Reject provider
* Suspend provider
* View users and providers
* View provider applications
* Dispute and safety notes
* Entrepreneurial/business model section

Covered features:

* Admin verification before provider goes live
* Provider KYC review
* Trust and safety for private home visits
* Admin monitoring
* Revenue model: 12% commission
* Optional priority listing for providers
* Insurance add-on idea

---

## Member 6 - Database, Security, Service Categories, and API Contract Lead

Member 6 handles the database structure, security rules, service category management, and API contract.

Responsibilities:

* Main database schema
* ER diagram
* Seed data
* User table
* ServiceCategory table
* ProviderProfile table
* ProviderCategory table
* Job table
* Review table
* Message table
* User roles and permissions
* JWT role rules
* Input validation rules
* Prepared statements and database security
* Secure upload rules for KYC documents
* Service category CRUD API
* API contract documentation

Covered features:

* Suggested data model
* Service category catalogue
* JWT role-based access rules
* Secure KYC upload rules
* Database security
* API contract
* SQL injection prevention using prepared statements

---

## Member 7 - Map, Geolocation, Mobile Build, Testing, and Deployment Lead

Member 7 handles technical integration, mobile-related features, map features, testing, and deployment preparation.

Responsibilities:

* Map view of nearby providers using Leaflet and OpenStreetMap
* Customer location auto-detect using Capacitor Geolocation API
* Admin view all jobs page
* Admin job monitoring feature
* Connect admin monitoring pages with APIs
* API testing using Postman
* Testing plan
* Final demo test flow
* Capacitor Android build support
* Deployment guide
* Environment configuration
* GitHub integration support
* Final documentation checking
* Integration support between Group A and Group B

Covered features:

* Map view of nearby providers
* Customer location auto-detect
* Responsive UI and Capacitor mobile build
* Admin job monitoring
* Testing and deployment
* Final integration support

---

# Work Dependency Management

To avoid delays, the project is divided so that no group needs to wait for the other group to start development.

Group A can develop the Customer and Provider Marketplace Workflow using:

* Mock verified providers
* Mock service categories
* Sample job data
* Sample review data

Group B can develop the Admin, Platform Management, Database, Security, Testing, Deployment, and Mobile Build support using:

* Mock provider applications
* Sample user data
* Sample KYC data
* Sample service categories
* Sample job records

Both groups must agree first on the shared system rules:

## Shared User Roles

* customer
* provider
* admin

## Shared Job Statuses

* requested
* accepted
* rejected
* in_progress
* completed
* cost_pending
* closed
* reviewed

## Shared Provider Verification Statuses

* pending
* verified
* rejected
* suspended

## Shared API Response Format

Success response:

```json
{
  "success": true,
  "message": "Action completed successfully",
  "data": {}
}
```

Error response:

```json
{
  "success": false,
  "message": "Something went wrong",
  "errors": {}
}
```

After these shared rules are agreed, both groups can work independently in their own modules. During integration, Group A's customer/provider workflow will connect with Group B's admin verification and platform management module.

This approach reduces dependency, avoids duplicated work, and allows all members to contribute at the same time.

---

# Complete Feature Coverage

| P5 Feature                                                                      | Responsible Member                     |
| ------------------------------------------------------------------------------- | -------------------------------------- |
| Service category catalogue                                                      | Member 6                               |
| Provider profile with categories, rate, location, photo, and KYC upload         | Member 3                               |
| Admin verification before provider goes live                                    | Member 5                               |
| Customer browses and filters providers by category, distance, price, and rating | Member 1                               |
| Booking workflow: requested → accepted → in-progress → completed → reviewed     | Member 2, Member 3, Member 4           |
| Job ticket with status updates and final cost confirmation                      | Member 2, Member 3                     |
| JWT authentication with strict role-based access                                | Member 4, Member 6                     |
| Secure file upload for KYC                                                      | Member 3, Member 6                     |
| Responsive UI                                                                   | Member 1, Member 2, Member 3, Member 5 |
| Capacitor mobile build                                                          | Member 7                               |
| In-app chat between customer and provider                                       | Member 4                               |
| Map view of nearby providers using Leaflet and OpenStreetMap                    | Member 7                               |
| Tip/rating prompt after job completion                                          | Member 2                               |
| Provider availability calendar with auto-confirm slots                          | Member 3                               |
| Customer location auto-detect using Capacitor Geolocation API                   | Member 7                               |
| Recurring bookings                                                              | Member 2, Member 4                     |
| Revenue model and entrepreneurial angle                                         | Member 5, Member 7                     |
| Trust and safety for private home visits                                        | Member 5, Member 6                     |
| Database tables and ER diagram                                                  | Member 6                               |
| Testing and integration                                                         | Member 7 and all members               |

---

# Summary

This role split is final because it is fair, reduces dependency between groups, and covers all P5 FixIt features. Group A handles the complete customer and provider marketplace workflow, while Group B handles the admin, platform management, database, security, mobile, testing, deployment, and integration support.
