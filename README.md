# FixIt - Local Home Services Marketplace

FixIt is a cross-platform local home services marketplace that connects customers with verified local service providers for services such as plumbing, electrical work, cleaning, gardening, and AC service.

## Project Information

Course: SCSM2223 Cross-Platform Application Development
Project: P5 FixIt
Tagline: Plumbing, electrical, cleaning — verified locals, one tap away.

## Main Idea

FixIt helps customers find trusted local service providers, book home services, track job progress, confirm the final cost, and leave reviews. Service providers can manage their profiles, receive job requests, update job status, and enter final cost. Administrators can verify providers, manage service categories, monitor jobs, and support trust and safety.

## Main Users

1. Customer
2. Service Provider
3. Administrator

## Tech Stack

* Frontend: Vue 3, Vue Router, Pinia
* Backend: PHP Slim 4
* Database: MySQL using PDO
* Authentication: JWT
* Mobile: Capacitor Android build
* API Format: RESTful JSON API

## Core Features

* User registration and login
* Hashed password storage
* JWT authentication
* Role-based access
* Service category catalogue
* Provider profile with categories, rate, location, photo, and mock KYC upload
* Admin provider verification
* Customer browsing and filtering by category, distance, price, and rating
* Customer booking workflow
* Job ticket with status updates
* Final cost confirmation
* Review and rating system
* Secure file upload for mock KYC document
* Responsive web UI
* Capacitor Android build

## Should-Have and Innovation Features

* In-app chat between customer and provider
* Map view of nearby providers using Leaflet and OpenStreetMap
* Tip/rating prompt after job completion
* Provider availability calendar
* Customer location auto-detect using Capacitor Geolocation API
* Recurring bookings

## Folder Structure

```text
fixit-home-services/
├── frontend/
├── backend/
├── database/
├── docs/
├── .gitignore
└── README.md
```

## Documentation

Project documentation is stored in the `docs` folder:

* Project scope
* Team roles
* API contract
* ER diagram explanation
* Testing plan
* Deployment guide

## Team Split

The work is divided between two combined groups.

### Group A - Customer + Provider Marketplace Workflow

Group A handles the customer and provider workflow, including customer browsing, booking, provider job management, final cost confirmation, reviews, chat, and recurring bookings.

### Group B - Admin + Platform Management + Infrastructure

Group B handles admin verification, category management, database, security, map/geolocation, testing, deployment, mobile build support, and integration.

## Database

The MySQL database is named:

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

## Notes

This project follows the required course stack: Vue 3, PHP Slim 4, PDO, MySQL, JWT authentication, and Capacitor Android build.
