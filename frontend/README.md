# Frontend

This folder contains the Vue 3 frontend for the FixIt local home services marketplace.

## Frontend Stack

* Vue 3
* Vue Router
* Pinia
* HTML
* CSS
* JavaScript
* Axios or Fetch API
* Responsive mobile-first design

## Main Frontend Modules

### Authentication Module

* Login page
* Register page
* Role-based navigation
* Store JWT token after login

### Customer Module

* Customer home page
* Service category page
* Provider listing page
* Provider details page
* Provider search and filters
* Create booking page
* My bookings page
* Job ticket page
* Final cost confirmation
* Review and rating page
* Recurring booking page

### Provider Module

* Provider dashboard
* Provider profile page
* Provider category selection
* Mock KYC upload page
* Provider job requests page
* Accept or reject job page
* Job status update page
* Final cost entry page
* Provider availability calendar

### Admin Module

* Admin dashboard
* Provider verification page
* KYC review page
* Manage service categories page
* View users and providers page
* View all jobs page
* Dispute and safety notes page

## Frontend Responsibilities

The frontend is responsible for:

* Displaying pages for customer, provider, and admin users
* Connecting to the backend API
* Sending JWT token with protected API requests
* Showing validation messages
* Displaying job status updates
* Supporting responsive design for mobile, tablet, and desktop
* Preparing the web app for Capacitor Android build

## Suggested Folder Structure

```text
frontend/
├── src/
│   ├── assets/
│   ├── components/
│   ├── router/
│   ├── stores/
│   ├── views/
│   │   ├── auth/
│   │   ├── customer/
│   │   ├── provider/
│   │   └── admin/
│   └── App.vue
```

## Notes

The frontend will use Vue Router for page navigation and Pinia for state management. It will communicate with the PHP Slim backend using REST API requests.
## UI Theme

All frontend modules must follow the shared UI style guide in:

```text
docs/ui-style-guide.md
