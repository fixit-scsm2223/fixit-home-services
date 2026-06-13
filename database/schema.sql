```sql
-- FixIt database schema

CREATE DATABASE IF NOT EXISTS fixit_db;
USE fixit_db;

-- =========================
-- 1. Users
-- =========================

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('customer', 'provider', 'admin') NOT NULL,
    phone VARCHAR(30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 2. Service Categories
-- =========================

CREATE TABLE service_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 3. Provider Profiles
-- =========================

CREATE TABLE provider_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    bio TEXT,
    location VARCHAR(255),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    base_rate DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    photo_url VARCHAR(255),
    verification_status ENUM('pending', 'verified', 'rejected', 'suspended') DEFAULT 'pending',
    kyc_doc_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_provider_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
);

-- =========================
-- 4. Provider Categories
-- =========================

CREATE TABLE provider_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT NOT NULL,
    category_id INT NOT NULL,

    CONSTRAINT fk_provider_category_provider
        FOREIGN KEY (provider_id) REFERENCES provider_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_provider_category_category
        FOREIGN KEY (category_id) REFERENCES service_categories(id)
        ON DELETE CASCADE,

    UNIQUE (provider_id, category_id)
);

-- =========================
-- 5. Jobs / Bookings
-- =========================

CREATE TABLE jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    provider_id INT NOT NULL,
    category_id INT NOT NULL,
    status ENUM(
        'requested',
        'accepted',
        'rejected',
        'in_progress',
        'completed',
        'cost_pending',
        'closed',
        'reviewed'
    ) DEFAULT 'requested',
    scheduled_at DATETIME NOT NULL,
    address TEXT NOT NULL,
    description TEXT,
    total DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_job_customer
        FOREIGN KEY (customer_id) REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_job_provider
        FOREIGN KEY (provider_id) REFERENCES provider_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_job_category
        FOREIGN KEY (category_id) REFERENCES service_categories(id)
        ON DELETE CASCADE
);

-- =========================
-- 6. Reviews
-- =========================

CREATE TABLE reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL UNIQUE,
    rating INT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_review_job
        FOREIGN KEY (job_id) REFERENCES jobs(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_rating
        CHECK (rating BETWEEN 1 AND 5)
);

-- =========================
-- 7. Messages
-- =========================

CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    sender_id INT NOT NULL,
    body TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_message_job
        FOREIGN KEY (job_id) REFERENCES jobs(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_message_sender
        FOREIGN KEY (sender_id) REFERENCES users(id)
        ON DELETE CASCADE
);

-- =========================
-- 8. Provider Availability
-- =========================

CREATE TABLE provider_availability (
    id INT AUTO_INCREMENT PRIMARY KEY,
    provider_id INT NOT NULL,
    available_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    auto_confirm BOOLEAN DEFAULT FALSE,

    CONSTRAINT fk_availability_provider
        FOREIGN KEY (provider_id) REFERENCES provider_profiles(id)
        ON DELETE CASCADE
);

-- =========================
-- 9. Recurring Bookings
-- =========================

CREATE TABLE recurring_bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    provider_id INT NOT NULL,
    category_id INT NOT NULL,
    frequency ENUM('weekly', 'monthly') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    address TEXT NOT NULL,
    status ENUM('active', 'cancelled') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_recurring_customer
        FOREIGN KEY (customer_id) REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_recurring_provider
        FOREIGN KEY (provider_id) REFERENCES provider_profiles(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_recurring_category
        FOREIGN KEY (category_id) REFERENCES service_categories(id)
        ON DELETE CASCADE
);

-- =========================
-- 10. Safety Notes / Disputes
-- =========================

CREATE TABLE safety_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    admin_id INT NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_safety_job
        FOREIGN KEY (job_id) REFERENCES jobs(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_safety_admin
        FOREIGN KEY (admin_id) REFERENCES users(id)
        ON DELETE CASCADE
);
```
