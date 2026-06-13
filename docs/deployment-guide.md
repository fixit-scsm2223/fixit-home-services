# Deployment Guide

This document explains how the FixIt project will be deployed and prepared for the final demo.

## Parts to Deploy

The project has four main parts:

1. Vue 3 frontend
2. PHP Slim 4 backend API
3. MySQL database
4. Capacitor Android mobile build

---

## Frontend Deployment

The Vue frontend will be deployed to a public hosting platform.

Possible platforms:

* Vercel
* Netlify
* GitHub Pages

Frontend deployment should include:

* Public frontend URL
* Correct API base URL
* Production build using `npm run build`
* Responsive UI for mobile, tablet, and desktop
* Customer, provider, and admin routes working correctly

Environment variable example:

```text
VITE_API_BASE_URL=https://your-backend-url.com/api
```

---

## Backend Deployment

The PHP Slim 4 backend API will be deployed to a hosting platform that supports PHP.

Possible platforms:

* Render
* Railway
* InfinityFree
* 000webhost
* University server, if provided

Backend deployment should include:

* Public API URL
* Slim 4 routing working correctly
* PDO database connection
* JWT authentication
* Role-based access control
* JSON API responses
* CORS configuration for frontend access
* Secure file upload folder for mock KYC documents

---

## Database Deployment

The MySQL database will be deployed using a free or cloud database service.

Possible platforms:

* Railway MySQL
* Aiven
* Hosting provider MySQL database
* University database server, if provided

Database deployment should include:

* Running `schema.sql`
* Running `seed.sql`
* Creating required tables
* Adding sample users
* Adding sample service categories
* Adding sample providers and jobs for demo testing

Main database tables:

* User
* ServiceCategory
* ProviderProfile
* ProviderCategory
* Job
* Review
* Message

---

## File Upload Deployment

The system includes mock KYC document upload for service providers.

The deployment should make sure:

* Upload folder exists on the backend server
* File size limit is checked
* Only allowed file types are accepted
* Uploaded file path is stored in the database
* Admin can view the uploaded mock KYC document

Allowed file types:

* PDF
* JPG
* PNG

---

## Map and Geolocation Setup

The system may include map and location features.

Map feature:

* Leaflet
* OpenStreetMap

Geolocation feature:

* Capacitor Geolocation API

Deployment should check:

* Map displays correctly
* Nearby providers are shown correctly
* Location permission message appears if access is denied
* Android build handles geolocation permission properly

---

## Mobile Build

The web app will be wrapped using Capacitor for Android.

Mobile build steps:

1. Build the Vue frontend.
2. Add Capacitor to the project.
3. Add Android platform.
4. Sync the project.
5. Open Android Studio.
6. Run the app on emulator or Android device.

The Android build should show:

* Login page
* Customer pages
* Provider browsing
* Booking workflow
* Basic navigation
* Geolocation feature, if available

---

## Environment Variables

The project will use environment variables for security and configuration.

Frontend variables:

* API base URL

Backend variables:

* Database host
* Database name
* Database username
* Database password
* JWT secret key
* Upload folder path
* App environment

Example backend variables:

```text
DB_HOST=localhost
DB_NAME=fixit_db
DB_USER=root
DB_PASS=
JWT_SECRET=your_secret_key
UPLOAD_DIR=uploads/kyc
APP_ENV=production
```

---

## Deployment Responsibility

Deployment and final setup are mainly handled by Member 7, with support from all members.

Member 7 responsibilities:

* Deployment guide
* Environment configuration
* Capacitor Android build support
* Final demo test flow
* Integration support
* Checking that frontend, backend, database, and mobile build work together

---

## Final Demo Requirements

The final demo should show:

* Public frontend URL
* Working backend API
* MySQL database connection
* User registration and login
* JWT authentication
* Role-based access
* Admin provider verification
* Customer browsing and filtering
* Customer booking workflow
* Provider job status update
* Final cost confirmation
* Review and rating
* Optional chat, map, geolocation, or recurring booking features if completed
* Android build running on emulator or device

---

## Final Deployment Checklist

Before the final demo, the team should check:

* Frontend is deployed and accessible.
* Backend API is deployed and accessible.
* Database is connected successfully.
* Login works for customer, provider, and admin.
* Protected routes require JWT token.
* Role-based access works correctly.
* Provider verification works.
* Customer can book a service.
* Provider can update job status.
* Customer can confirm cost and submit review.
* Uploaded mock KYC document can be viewed by admin.
* Android build runs on emulator or device.
* Final demo data is prepared.
