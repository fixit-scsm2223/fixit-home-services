# FixIt Project Scope

FixIt is a cross-platform local home services marketplace for booking verified local service providers. The system connects customers who need small home services with trusted providers such as plumbers, electricians, cleaners, gardeners, and AC technicians.

## Target Users

1. Customer
2. Service Provider
3. Administrator

## Core Features

* User registration and login
* Hashed password storage
* JWT authentication
* Role-based access
* Service category catalogue
* Provider profile with categories, rate, location, photo, and mock KYC document upload
* Admin provider verification before provider goes live
* Customer browsing and filtering of providers by category, distance, price, and rating
* Customer booking workflow
* Booking status flow: requested → accepted → in_progress → completed → reviewed
* Job ticket with status updates
* Final cost confirmation
* Review and rating system
* Secure file upload for mock KYC document
* Responsive UI
* Capacitor Android build

## Should-Have Features

* In-app chat between customer and provider after booking is accepted
* Map view of nearby providers using Leaflet and OpenStreetMap
* Tip/rating prompt after job completion

## Stretch / Innovation Features

* Provider availability calendar with auto-confirm slots
* Customer location auto-detect using Capacitor Geolocation API
* Recurring bookings, such as weekly cleaning

## Main Workflow

1. Provider registers and creates a profile.
2. Provider selects service categories, sets base rate, location, and uploads a mock KYC document.
3. Admin reviews and verifies the provider.
4. Customer browses verified providers.
5. Customer filters providers by category, distance, price, and rating.
6. Customer books a service.
7. Provider accepts or rejects the job.
8. Provider updates the job status.
9. Provider enters the final cost.
10. Customer confirms the final cost.
11. Customer leaves a review and rating.

## Out of Scope

* Real online payment gateway
* Real government KYC verification
* Real-time GPS tracking
* Professional insurance processing
* Full production-level dispute resolution
* iOS mobile build
