# ER Diagram

## Main Tables

The FixIt system uses these main tables:

- User
- ServiceCategory
- ProviderProfile
- ProviderCategory
- Job
- Review
- Message

## Relationships

### User

- One customer user can create many jobs.
- One provider user can have one provider profile.
- One admin user can verify many providers.

### ProviderProfile

- ProviderProfile belongs to one User.
- ProviderProfile can have many ServiceCategories through ProviderCategory.
- ProviderProfile can receive many Jobs.

### ServiceCategory

- One ServiceCategory can belong to many ProviderProfiles.
- One ServiceCategory can be used in many Jobs.

### Job

- Job belongs to one customer User.
- Job belongs to one ProviderProfile.
- Job belongs to one ServiceCategory.
- Job can have one Review.
- Job can have many Messages.

### Review

- Review belongs to one Job.
- Review is created by a customer after the job is completed.

### Message

- Message belongs to one Job.
- Message is sent by one User.
