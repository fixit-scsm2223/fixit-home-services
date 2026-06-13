# Backend

This folder contains the PHP Slim 4 REST API for the FixIt local home services marketplace.

## Backend Stack

* PHP Slim 4
* PDO
* MySQL
* JWT authentication
* JSON REST API

## Main Backend Responsibilities

The backend is responsible for:

* User registration and login
* Password hashing
* JWT token generation and verification
* Role-based access control
* Customer APIs
* Provider APIs
* Admin APIs
* Job booking workflow
* Provider verification workflow
* Review and rating system
* In-app chat API
* Secure mock KYC file upload
* Database connection using PDO prepared statements

## Main API Modules

### Auth

* Register user
* Login user
* Get current logged-in user

### Customer

* Browse service categories
* Browse verified providers
* Create job booking
* View booking history
* Confirm final cost
* Submit review and rating

### Provider

* Create and update provider profile
* Upload mock KYC document
* Select service categories
* View job requests
* Accept or reject jobs
* Update job status
* Enter final cost
* Manage availability

### Admin

* View dashboard
* Verify, reject, or suspend providers
* Manage service categories
* View users and jobs
* Add dispute or safety notes

## Database

The backend connects to the MySQL database named:

```text
fixit_db
```

Main tables:

* users
* service_categories
* provider_profiles
* provider_categories
* jobs
* reviews
* messages
* provider_availability
* recurring_bookings
* safety_notes

## Security Rules

* Passwords must be hashed before storing in the database.
* Protected routes must require JWT token.
* Role-based access must be checked for customer, provider, and admin routes.
* Database queries must use PDO prepared statements.
* Input validation must be applied before inserting or updating data.
* KYC uploads must check file type and file size.
* API responses must return JSON with proper HTTP status codes.

## Notes

This backend follows the required project stack: PHP Slim 4, PDO, MySQL, JWT authentication, and RESTful JSON API.
