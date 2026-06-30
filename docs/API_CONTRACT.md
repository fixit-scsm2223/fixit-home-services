# FixIt API Contract

Base path: `/api`

Response envelope for JSON endpoints:

```json
{
  "success": true,
  "message": "Operation message",
  "data": {}
}
```

Protected routes use `Authorization: Bearer <jwt>`.

## Public and Auth

| Method | Route | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | API health check |
| POST | `/api/auth/register` | Public | Register customer or provider |
| POST | `/api/auth/login` | Public | Login and receive JWT |
| GET | `/api/auth/me` | Authenticated | Return current user |
| POST | `/api/auth/logout` | Authenticated | Logout response for stateless JWT flow |
| POST | `/api/auth/verify-otp` | Public | Verify registration OTP |
| POST | `/api/auth/forgot-password` | Public | Request password reset instructions |

Login body:

```json
{ "username": "customer", "password": "CPAD8888" }
```

Customer registration body:

```json
{
  "full_name": "Demo Customer",
  "username": "customer2",
  "email": "customer2@example.com",
  "phone": "+60000000000",
  "password": "CPAD8888",
  "password_confirmation": "CPAD8888",
  "role": "customer"
}
```

Provider registration uses multipart form data with the same common fields plus `bio`, `location`, `base_rate`, `service_category`, and `kyc_document`.

## Public Catalog

| Method | Route | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/api/categories` | Public | List service categories |
| GET | `/api/providers` | Public | List verified providers |
| GET | `/api/providers/nearby?lat=1.53&lng=103.63&radius=10` | Public | List nearby verified providers |
| GET | `/api/providers/{id}` | Public | Show one provider |
| GET | `/api/providers/{id}/reviews` | Public | Show provider reviews |

Provider list query parameters: `category_id`, `min_price`, `max_price`, `min_rating`, `max_distance`, `lat`, `lng`, `search`, `sort`.

## Customer Bookings and Reviews

| Method | Route | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/api/bookings` | Customer | List current customer's bookings |
| POST | `/api/bookings` | Customer | Create booking request |
| GET | `/api/bookings/{id}` | Customer | Show one owned booking |
| PATCH | `/api/bookings/{id}/confirm-cost` | Customer | Confirm final provider cost |
| PATCH | `/api/bookings/{id}/cancel` | Customer | Cancel requested or accepted booking |
| PATCH | `/api/bookings/{id}/cancel-series` | Customer | Cancel future recurring occurrences |
| POST | `/api/bookings/{id}/review` | Customer | Submit review and optional tip |
| GET | `/api/reviews` | Customer | List current customer's reviews |

Create booking body:

```json
{
  "provider_id": 1,
  "category_id": 2,
  "scheduled_at": "2026-06-30 09:00",
  "address": "Skudai, Johor",
  "notes": "Describe the issue",
  "estimated_cost": 80,
  "is_recurring": false,
  "recurring_frequency": "weekly"
}
```

Review body:

```json
{ "rating": 5, "comment": "Great service", "tip_amount": 10 }
```

## Payment

| Method | Route | Role | Purpose |
| --- | --- | --- | --- |
| POST | `/api/payment/create-intent` | Customer | Create Stripe payment intent for a job |
| POST | `/api/payment/confirm` | Customer | Confirm payment in FixIt after Stripe success |
| GET | `/api/payment/pending-for-customer` | Customer | List pending customer payments |

Create intent body:

```json
{ "job_id": 14 }
```

Confirm body:

```json
{ "job_id": 14, "payment_intent_id": "pi_replace_with_stripe_id" }
```

## Provider

| Method | Route | Role | Purpose |
| --- | --- | --- | --- |
| POST | `/api/provider/profile` | Provider | Create provider profile if missing |
| GET | `/api/provider/profile` | Provider | Get provider profile |
| PUT | `/api/provider/profile` | Provider | Update provider profile/user fields |
| POST | `/api/provider/kyc` | Provider | Upload KYC document |
| GET | `/api/provider/kyc/download` | Provider | Download current KYC document |
| PUT | `/api/provider/categories` | Provider | Replace provider category links |
| GET | `/api/provider/jobs` | Provider | List provider jobs |
| GET | `/api/provider/availability` | Provider | List availability mode and blocked dates |
| POST | `/api/provider/availability` | Provider | Add blocked date |
| PUT | `/api/provider/availability/{id}` | Provider | Update blocked date or mode |
| DELETE | `/api/provider/availability/{id}` | Provider | Delete blocked date |
| GET | `/api/provider/earnings` | Provider | Earnings summary |
| POST | `/api/provider/earnings/withdraw` | Provider | Submit withdrawal request |
| GET | `/api/provider/reviews` | Provider | Provider reviews |
| GET | `/api/provider/analytics` | Provider | Monthly provider analytics |
| GET | `/api/provider/settings` | Provider | Provider settings |
| PUT | `/api/provider/settings` | Provider | Save provider settings |

Update profile body example:

```json
{
  "business_name": "Demo Provider",
  "bio": "Verified home-service provider",
  "address": "Skudai, Johor",
  "base_rate": 80,
  "availability_mode": "standard",
  "phone": "+60000000002"
}
```

KYC upload uses multipart form data field `document`. Allowed extensions are PDF, JPG, JPEG, and PNG, up to 5 MB.

Update categories body:

```json
{ "category_ids": [1, 2] }
```

Availability body:

```json
{ "blocked_date": "2026-07-01" }
```

Settings body:

```json
{ "max_radius": 25, "notifications": "In-App Push" }
```

## Provider Job Operations

| Method | Route | Role | Purpose |
| --- | --- | --- | --- |
| PUT | `/api/jobs/{id}/accept` | Provider | Accept requested job |
| PUT | `/api/jobs/{id}/reject` | Provider | Reject requested job |
| PUT | `/api/jobs/{id}/status` | Provider | Move job to an allowed next status |
| PUT | `/api/jobs/{id}/final-cost` | Provider | Submit final cost for customer confirmation |
| GET | `/api/jobs/{id}/messages` | Provider | List job messages |
| POST | `/api/jobs/{id}/messages` | Provider | Send job message |

Status body:

```json
{ "status": "in_progress" }
```

Final cost body:

```json
{ "labour_cost": 90, "materials_cost": 15, "note": "Parts replaced" }
```

Message body:

```json
{ "body": "I am on the way." }
```

## Admin

| Method | Route | Role | Purpose |
| --- | --- | --- | --- |
| GET | `/api/admin/bootstrap` | Admin | Load admin dashboard data |
| PATCH | `/api/admin/providers/{id}/status` | Admin | Approve, reject, suspend, or restore provider |
| PATCH | `/api/admin/users/{id}/status` | Admin | Update user status |
| PATCH | `/api/admin/jobs/{id}/admin-note` | Admin | Save admin note for job |
| PUT | `/api/admin/safety-notes` | Admin | Replace safety notes |

Admin status body examples:

```json
{ "status": "verified" }
```

```json
{ "status": "suspended" }
```

Admin job note body:

```json
{ "note": "Follow up with provider" }
```

Safety notes body:

```json
{ "notes": ["Review pending KYC documents.", "Monitor disputed jobs."] }
```
