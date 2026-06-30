-- ============================================================
-- FixIt — Unified database schema (fixit_db)
-- Merges the auth + provider + customer modules into ONE schema.
--
-- Canonical job statuses (8, per shared rules):
--   requested, accepted, rejected, in_progress, completed,
--   cost_pending, closed, reviewed
-- Cancellation is tracked OUTSIDE status via jobs.cancelled (D1).
--
-- Compatibility note: the customer-domain controllers select
--   u.name / sc.title / pp.photo_url / pp.verification_status
-- while the provider/auth code writes full_name / name / photo_path /
-- kyc_status. To avoid editing ~15 query sites, those aliases are
-- provided as STORED GENERATED columns (read-only mirrors).
-- ============================================================

CREATE DATABASE IF NOT EXISTS fixit_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fixit_db;
SET NAMES utf8mb4;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS safety_notes;
DROP TABLE IF EXISTS job_status_history;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS provider_settings;
DROP TABLE IF EXISTS provider_availability;
DROP TABLE IF EXISTS provider_categories;
DROP TABLE IF EXISTS recurring_bookings;
DROP TABLE IF EXISTS jobs;
DROP TABLE IF EXISTS service_categories;
DROP TABLE IF EXISTS provider_profiles;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------- users (auth) ----------
CREATE TABLE users (
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name         VARCHAR(120) NOT NULL,
    name              VARCHAR(120) AS (full_name) STORED,        -- compat: customer code selects u.name
    username          VARCHAR(30)  NOT NULL UNIQUE,
    email             VARCHAR(190) NOT NULL UNIQUE,
    phone             VARCHAR(30)  NOT NULL,
    password_hash     VARCHAR(255) NOT NULL,
    role              ENUM('customer','provider','admin') NOT NULL DEFAULT 'customer',
    status            ENUM('active','suspended') NOT NULL DEFAULT 'active',
    suspension_reason VARCHAR(255) NULL,
    email_verified_at TIMESTAMP NULL,
    otp_code_hash     VARCHAR(255) NULL,
    otp_expires_at    TIMESTAMP NULL,
    reset_token_hash  CHAR(64) NULL,
    reset_expires_at  TIMESTAMP NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_role (role),
    INDEX idx_users_reset (reset_token_hash)
) ENGINE=InnoDB;

-- ---------- service_categories ----------
CREATE TABLE service_categories (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(80) NOT NULL UNIQUE,                     -- canonical (customer code)
    title       VARCHAR(80) AS (name) STORED,                    -- compat: provider code selects sc.title
    description VARCHAR(255) NULL,
    icon        VARCHAR(16) NULL,
    icon_url    VARCHAR(255) NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------- provider_profiles ----------
CREATE TABLE provider_profiles (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id             BIGINT UNSIGNED NOT NULL UNIQUE,
    business_name       VARCHAR(120) NULL,
    bio                 TEXT NOT NULL,
    location            VARCHAR(160) NOT NULL,
    latitude            DECIMAL(10,7) NULL,
    longitude           DECIMAL(10,7) NULL,
    photo_path          VARCHAR(255) NULL,
    photo_url           VARCHAR(255) AS (photo_path) STORED,     -- compat: customer code selects pp.photo_url
    base_rate           DECIMAL(10,2) UNSIGNED NOT NULL,
    service_category    VARCHAR(80) NOT NULL,
    kyc_document_path   VARCHAR(255) NOT NULL,
    kyc_original_name   VARCHAR(255) NOT NULL,
    kyc_status          ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    -- compat: customer catalog filters/selects pp.verification_status
    verification_status VARCHAR(10) AS (CASE kyc_status WHEN 'approved' THEN 'verified' WHEN 'rejected' THEN 'rejected' ELSE 'pending' END) STORED,
    availability_mode   ENUM('auto','manual','offline') NOT NULL DEFAULT 'manual',
    kyc_submitted_at    TIMESTAMP NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_provider_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- provider_categories (M:N) ----------
CREATE TABLE provider_categories (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    provider_id BIGINT UNSIGNED NOT NULL,
    category_id BIGINT UNSIGNED NOT NULL,
    UNIQUE KEY uniq_provider_category (provider_id, category_id),
    CONSTRAINT fk_pc_profile FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE,
    CONSTRAINT fk_pc_service FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- jobs (superset: customer booking + provider ticket) ----------
CREATE TABLE jobs (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_ref          VARCHAR(20) NULL UNIQUE,                 -- set by provider on accept
    customer_id         BIGINT UNSIGNED NOT NULL,
    provider_id         BIGINT UNSIGNED NOT NULL,
    category_id         BIGINT UNSIGNED NULL,
    service_title       VARCHAR(120) NULL,
    address             VARCHAR(255) NOT NULL,
    scheduled_at        DATETIME NOT NULL,
    status              ENUM('requested','accepted','rejected','in_progress','completed','cost_pending','closed','reviewed') NOT NULL DEFAULT 'requested',
    cancelled           TINYINT(1) NOT NULL DEFAULT 0,           -- D1: cancellation lives outside status
    cancelled_at        TIMESTAMP NULL,
    notes               TEXT NULL,
    estimated_cost      DECIMAL(10,2) NOT NULL DEFAULT 0,        -- customer's estimate
    initial_estimate    DECIMAL(10,2) NULL,                      -- provider's offered rate
    labour_cost         DECIMAL(10,2) NULL,
    materials_cost      DECIMAL(10,2) NULL,
    final_cost          DECIMAL(10,2) NULL,
    cost_confirmed      TINYINT(1) NOT NULL DEFAULT 0,
    cost_note           TEXT NULL,
    admin_note          TEXT NULL,                              -- internal note set by admin job monitoring
    tip_amount          DECIMAL(10,2) NULL,
    distance_km         DECIMAL(6,2) NULL,
    is_recurring        TINYINT(1) NOT NULL DEFAULT 0,
    recurring_frequency ENUM('weekly','biweekly','monthly') NULL,
    parent_job_id       BIGINT UNSIGNED NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_jobs_customer (customer_id),
    INDEX idx_jobs_provider (provider_id),
    INDEX idx_jobs_status (status),
    INDEX idx_jobs_parent (parent_job_id),
    CONSTRAINT fk_jobs_customer FOREIGN KEY (customer_id) REFERENCES users(id),
    CONSTRAINT fk_jobs_provider FOREIGN KEY (provider_id) REFERENCES provider_profiles(id),
    CONSTRAINT fk_jobs_category FOREIGN KEY (category_id) REFERENCES service_categories(id),
    CONSTRAINT fk_jobs_parent   FOREIGN KEY (parent_job_id) REFERENCES jobs(id)
) ENGINE=InnoDB;
-- ---------- payments ----------
CREATE TABLE payments (
    id                        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    job_id                    BIGINT UNSIGNED NOT NULL UNIQUE,
    customer_id               BIGINT UNSIGNED NOT NULL,
    provider_id               BIGINT UNSIGNED NOT NULL,
    amount                    DECIMAL(10,2) UNSIGNED NOT NULL,
    currency                  CHAR(3) NOT NULL DEFAULT 'myr',
    stripe_payment_intent_id  VARCHAR(255) NULL UNIQUE,
    transaction_reference     VARCHAR(100) NOT NULL UNIQUE,
    status                    ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
    created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_payments_customer (customer_id),
    INDEX idx_payments_provider (provider_id),
    INDEX idx_payments_status (status),

    CONSTRAINT fk_payments_job
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    CONSTRAINT fk_payments_customer
        FOREIGN KEY (customer_id) REFERENCES users(id),
    CONSTRAINT fk_payments_provider
        FOREIGN KEY (provider_id) REFERENCES provider_profiles(id)
) ENGINE=InnoDB;
-- ---------- reviews ----------
CREATE TABLE reviews (
    id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    job_id      BIGINT UNSIGNED NOT NULL UNIQUE,
    customer_id BIGINT UNSIGNED NULL,
    provider_id BIGINT UNSIGNED NULL,
    rating      TINYINT UNSIGNED NOT NULL,
    comment     TEXT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT fk_reviews_job      FOREIGN KEY (job_id)      REFERENCES jobs(id) ON DELETE CASCADE,
    CONSTRAINT fk_reviews_customer FOREIGN KEY (customer_id) REFERENCES users(id),
    CONSTRAINT fk_reviews_provider FOREIGN KEY (provider_id) REFERENCES provider_profiles(id)
) ENGINE=InnoDB;

-- ---------- messages (job chat) ----------
CREATE TABLE messages (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    job_id     BIGINT UNSIGNED NOT NULL,
    sender_id  BIGINT UNSIGNED NOT NULL,
    body       TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_msg_job    FOREIGN KEY (job_id)    REFERENCES jobs(id) ON DELETE CASCADE,
    CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- ---------- provider_availability ----------
CREATE TABLE provider_availability (
    id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    provider_id  BIGINT UNSIGNED NOT NULL,
    blocked_date DATE NOT NULL,
    UNIQUE KEY uniq_provider_date (provider_id, blocked_date),
    CONSTRAINT fk_avail_profile FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- provider_settings ----------
CREATE TABLE provider_settings (
    provider_id   BIGINT UNSIGNED PRIMARY KEY,
    max_radius    SMALLINT UNSIGNED NOT NULL DEFAULT 25,
    notifications VARCHAR(40) NOT NULL DEFAULT 'In-App Push',
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_settings_profile FOREIGN KEY (provider_id) REFERENCES provider_profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- job_status_history ----------
CREATE TABLE job_status_history (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    job_id     BIGINT UNSIGNED NOT NULL,
    status     VARCHAR(30) NOT NULL,
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_history_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- safety_notes (admin console) ----------
CREATE TABLE safety_notes (
    id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    note       VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------- recurring_bookings (customer module; optional, parent_job_id is the active path) ----------
CREATE TABLE recurring_bookings (
    id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id    BIGINT UNSIGNED NOT NULL,
    provider_id    BIGINT UNSIGNED NOT NULL,
    category_id    BIGINT UNSIGNED NULL,
    frequency      ENUM('weekly','biweekly','monthly') NOT NULL,
    scheduled_time TIME NOT NULL,
    address        VARCHAR(255) NOT NULL,
    notes          TEXT NULL,
    status         ENUM('active','paused','cancelled') NOT NULL DEFAULT 'active',
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_rb_customer FOREIGN KEY (customer_id) REFERENCES users(id),
    CONSTRAINT fk_rb_provider FOREIGN KEY (provider_id) REFERENCES provider_profiles(id),
    CONSTRAINT fk_rb_category FOREIGN KEY (category_id) REFERENCES service_categories(id)
) ENGINE=InnoDB;
