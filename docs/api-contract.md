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

## User Roles

```text
customer
provider
admin
```

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
```

---

# Customer APIs

```text
GET /categories
GET /providers
GET /providers/{id}
GET /providers/{id}/reviews

POST /jobs
GET /customer/jobs
GET /jobs/{id}
PUT /jobs/{id}/confirm-cost
POST /jobs/{id}/review
```

---

# Provider APIs

```text
POST /provider/profile
GET /provider/profile
PUT /provider/profile
POST /provider/kyc
POST /provider/categories

GET /provider/jobs
PUT /jobs/{id}/accept
PUT /jobs/{id}/reject
PUT /jobs/{id}/status
PUT /jobs/{id}/final-cost
```

---

# Admin APIs

```text
GET /admin/providers/pending
GET /admin/providers
PUT /admin/providers/{id}/verify
PUT /admin/providers/{id}/reject
PUT /admin/providers/{id}/suspend

POST /admin/categories
PUT /admin/categories/{id}
DELETE /admin/categories/{id}

GET /admin/jobs
```
