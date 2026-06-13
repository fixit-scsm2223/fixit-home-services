# ER Diagram

## Main Tables

The FixIt system uses seven main database tables:

* User
* ServiceCategory
* ProviderProfile
* ProviderCategory
* Job
* Review
* Message

These tables support the main functions of the system, including user accounts, service categories, provider profiles, job bookings, reviews, and communication between users.

---

## Table Descriptions

### User

The User table stores all system users, including customers, service providers, and administrators.

Main fields:

* id
* name
* email
* password_hash
* role
* phone

### ServiceCategory

The ServiceCategory table stores the types of services available in the system, such as plumbing, electrical work, cleaning, gardening, and AC service.

Main fields:

* id
* name
* description
* icon_url

### ProviderProfile

The ProviderProfile table stores additional information for users who register as service providers.

Main fields:

* id
* user_id
* bio
* location
* base_rate
* verification_status
* kyc_doc_url

### ProviderCategory

The ProviderCategory table links providers with the service categories they offer. This table is needed because one provider can offer many service categories, and one service category can be offered by many providers.

Main fields:

* id
* provider_id
* category_id

### Job

The Job table stores booking information created by customers.

Main fields:

* id
* customer_id
* provider_id
* category_id
* status
* scheduled_at
* address
* total

### Review

The Review table stores customer ratings and comments after a job is completed.

Main fields:

* id
* job_id
* rating
* comment
* created_at

### Message

The Message table stores messages between customers and providers related to a job.

Main fields:

* id
* job_id
* sender_id
* body
* sent_at

---

## Relationships

* One User can create many Jobs as a customer.
* One User can have one ProviderProfile as a service provider.
* One User can send many Messages.
* One ProviderProfile belongs to one User.
* One ProviderProfile can receive many Jobs.
* One ProviderProfile can offer many ServiceCategories through ProviderCategory.
* One ServiceCategory can be used in many Jobs.
* One ServiceCategory can belong to many ProviderProfiles through ProviderCategory.
* One Job belongs to one customer User.
* One Job belongs to one ProviderProfile.
* One Job belongs to one ServiceCategory.
* One Job can have one Review.
* One Job can have many Messages.
* One Message belongs to one Job.
* One Message is sent by one User.
