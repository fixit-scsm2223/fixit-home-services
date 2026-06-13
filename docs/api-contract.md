# API Contract

Base URL:

```text
/api
```

## Standard JSON Response

Success:

```json
{
  "success": true,
  "message": "Action completed successfully",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Something went wrong",
  "errors": {}
}
```

---

## User Roles

```text
customer
provider
admin
```

---

## Job Statuses

```text
requested
accepted
rejected
in_progress
completed
cost_pending
closed
reviewed
```

---

## Provider Verification Statuses

```text
pending
verified
rejected
suspended
```

---

# Auth APIs

```text
POST /auth/register
POST /auth/login
GET /auth/me
POST /auth/logout
```

Purpose:

* Register new users.
* Log in users and return JWT token.
* Get current logged-in user information.
* Log out user on frontend by removing token.

---

# Public APIs

```text
GET /categories
GET /providers
GET /providers/{id}
GET /providers/{id}/reviews
GET /providers/nearby
```

Purpose:

* Show service categories.
* Show verified providers only.
* Show provider details.
* Show provider reviews.
* Support nearby provider search for map and geolocation feature.

---

# Customer APIs

```text
POST /jobs
GET /customer/jobs
GET /jobs/{id}
PUT /jobs/{id}/confirm-cost
POST /jobs/{id}/review
POST /jobs/{id}/tip-prompt
POST /recurring-bookings
GET /customer/recurring-bookings
PUT /recurring-bookings/{id}
DELETE /recurring-bookings/{id}
```

Purpose:

* Customer creates a job booking.
* Customer views booking history.
* Customer views job ticket details.
* Customer confirms final cost.
* Customer submits rating and review.
* Customer receives tip/rating prompt after job completion.
* Customer creates and manages recurring bookings.

---

# Provider APIs

```text
POST /provider/profile
GET /provider/profile
PUT /provider/profile
POST /provider/kyc
PUT /provider/categories

GET /provider/jobs
PUT /jobs/{id}/accept
PUT /jobs/{id}/reject
PUT /jobs/{id}/status
PUT /jobs/{id}/final-cost

POST /provider/availability
GET /provider/availability
PUT /provider/availability/{id}
DELETE /provider/availability/{id}
```

Purpose:

* Provider creates and updates profile.
* Provider uploads mock KYC document.
* Provider selects service categories.
* Provider views job requests.
* Provider accepts or rejects jobs.
* Provider updates job status.
* Provider enters final cost.
* Provider manages availability calendar and auto-confirm slots.

---

# Chat APIs

```text
GET /jobs/{id}/messages
POST /jobs/{id}/messages
```

Purpose:

* Customer and provider can view messages for an accepted job.
* Customer and provider can send messages related to a job.

---

# Admin APIs

```text
GET /admin/dashboard
GET /admin/providers/pending
GET /admin/providers
GET /admin/providers/{id}
PUT /admin/providers/{id}/verify
PUT /admin/providers/{id}/reject
PUT /admin/providers/{id}/suspend

POST /admin/categories
PUT /admin/categories/{id}
DELETE /admin/categories/{id}

GET /admin/users
GET /admin/jobs
GET /admin/jobs/{id}
POST /admin/jobs/{id}/safety-note
GET /admin/disputes
POST /admin/disputes
PUT /admin/disputes/{id}
```

Purpose:

* Admin views dashboard summary.
* Admin views pending provider applications.
* Admin verifies, rejects, or suspends providers.
* Admin manages service categories.
* Admin views users and jobs.
* Admin adds safety notes.
* Admin manages disputes or trust/safety issues.

---

# File Upload Rules

## KYC Upload

```text
POST /provider/kyc
```

Request type:

```text
multipart/form-data
```

Allowed file types:

```text
PDF
JPG
PNG
```

Purpose:

* Provider uploads mock KYC document.
* System stores file path in ProviderProfile.
* Admin can review the uploaded document before verification.

---

# API Access Rules

## Public Access

```text
GET /categories
GET /providers
GET /providers/{id}
GET /providers/{id}/reviews
```

## Customer Access

```text
POST /jobs
GET /customer/jobs
PUT /jobs/{id}/confirm-cost
POST /jobs/{id}/review
POST /recurring-bookings
```

## Provider Access

```text
POST /provider/profile
POST /provider/kyc
GET /provider/jobs
PUT /jobs/{id}/accept
PUT /jobs/{id}/reject
PUT /jobs/{id}/status
PUT /jobs/{id}/final-cost
POST /provider/availability
```

## Admin Access

```text
GET /admin/dashboard
GET /admin/providers
PUT /admin/providers/{id}/verify
POST /admin/categories
GET /admin/jobs
POST /admin/jobs/{id}/safety-note
```

---

# Notes

* All protected APIs require JWT authentication.
* Role-based access must be checked before processing protected requests.
* API responses must use JSON format.
* Backend must use prepared statements with PDO.
* Input validation must be applied on both frontend and backend.
* Error responses should include clear messages and suitable HTTP status codes.
