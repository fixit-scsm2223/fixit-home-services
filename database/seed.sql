-- ============================================================
-- FixIt — Unified seed data (fixit_db)
-- Demo accounts (all password: CPAD8888)
-- ============================================================
USE fixit_db;
SET NAMES utf8mb4;

-- Demo accounts: one per role. password_verify() accepts this bcrypt hash.
INSERT INTO users (full_name, username, email, phone, password_hash, role, email_verified_at) VALUES
('Demo Customer',      'customer', 'customer@fixit.test', '+60000000001', '$2b$12$row56jx4Oc3cZkJYIIZv6.610vFXbMPzgttApjwLQSIiwWKkrCfjK', 'customer', NOW()),
('Demo Provider',      'provider', 'provider@fixit.test', '+60000000002', '$2b$12$row56jx4Oc3cZkJYIIZv6.610vFXbMPzgttApjwLQSIiwWKkrCfjK', 'provider', NOW()),
('Demo Administrator', 'admin',    'admin@fixit.test',    '+60000000003', '$2b$12$row56jx4Oc3cZkJYIIZv6.610vFXbMPzgttApjwLQSIiwWKkrCfjK', 'admin',    NOW());

-- Service categories
INSERT INTO service_categories (name, description, icon) VALUES
('Plumbing',   'Leak repairs, installations', '🚰'),
('Electrical', 'Wiring, tripping faults',     '⚡'),
('Cleaning',   'Deep clean, sanitization',    '🧹'),
('Gardening',  'Lawn mowing, landscaping',    '🏡'),
('AC Service', 'Chemical wash, gas top-ups',  '❄️');

-- Verified provider profile for the demo provider (Skudai, Johor)
INSERT INTO provider_profiles
    (user_id, business_name, bio, location, latitude, longitude, base_rate, service_category, kyc_document_path, kyc_original_name, kyc_status)
SELECT id, 'Sara Cleaner Services', 'Verified FixIt demonstration provider with 5 years of experience.',
       'Skudai, Johor', 1.5375000, 103.6306000, 80.00, 'Cleaning', 'seed/demo-provider.pdf', 'demo-provider.pdf', 'approved'
FROM users WHERE username = 'provider';

-- Link the provider to the Cleaning category
INSERT INTO provider_categories (provider_id, category_id)
SELECT pp.id, sc.id
FROM provider_profiles pp
JOIN users u ON u.id = pp.user_id AND u.username = 'provider'
JOIN service_categories sc ON sc.name = 'Cleaning';

-- Default provider settings
INSERT INTO provider_settings (provider_id) SELECT id FROM provider_profiles;

-- Demo job #1: completed + reviewed (gives the provider a rating in the catalogue)
INSERT INTO jobs
    (ticket_ref, customer_id, provider_id, category_id, service_title, address, scheduled_at, status,
     estimated_cost, initial_estimate, labour_cost, materials_cost, final_cost, cost_confirmed)
SELECT 'FX-1001', c.id, pp.id, sc.id, 'Home Deep Cleaning', 'Flat Skudai Baru, Blok B-02, Johor',
       '2026-06-12 14:30:00', 'reviewed', 70.00, 70.00, 90.00, 15.00, 105.00, 1
FROM users c
JOIN provider_profiles pp ON pp.user_id = (SELECT id FROM users WHERE username = 'provider')
JOIN service_categories sc ON sc.name = 'Cleaning'
WHERE c.username = 'customer';

-- Review on the completed job
INSERT INTO reviews (job_id, customer_id, provider_id, rating, comment)
SELECT j.id, j.customer_id, j.provider_id, 5, 'Excellent deep clean, very thorough!'
FROM jobs j WHERE j.ticket_ref = 'FX-1001';

-- Demo job #2: an open request (shows in provider job-requests + customer bookings)
INSERT INTO jobs
    (customer_id, provider_id, category_id, service_title, address, scheduled_at, status, estimated_cost, initial_estimate)
SELECT c.id, pp.id, sc.id, 'Move-Out Cleaning', 'Taman Universiti, Jalan 4, Johor',
       '2026-06-28 10:00:00', 'requested', 85.00, 85.00
FROM users c
JOIN provider_profiles pp ON pp.user_id = (SELECT id FROM users WHERE username = 'provider')
JOIN service_categories sc ON sc.name = 'Cleaning'
WHERE c.username = 'customer';

-- A second, pending provider so the admin verification queue (S7) has something to act on.
INSERT INTO users (full_name, username, email, phone, password_hash, role, email_verified_at) VALUES
('Ali Plumber', 'plumber', 'plumber@fixit.test', '+60000000004', '$2b$12$row56jx4Oc3cZkJYIIZv6.610vFXbMPzgttApjwLQSIiwWKkrCfjK', 'provider', NOW());

INSERT INTO provider_profiles
    (user_id, business_name, bio, location, latitude, longitude, base_rate, service_category, kyc_document_path, kyc_original_name, kyc_status)
SELECT id, 'Ali Plumbing Services', 'Licensed plumbing professional handling repairs, installations, and urgent household callouts.',
       'Kempas, Johor', 1.5167000, 103.7000000, 90.00, 'Plumbing', 'seed/ali-plumber.pdf', 'ali-plumber.pdf', 'pending'
FROM users WHERE username = 'plumber';

INSERT INTO provider_categories (provider_id, category_id)
SELECT pp.id, sc.id
FROM provider_profiles pp
JOIN users u ON u.id = pp.user_id AND u.username = 'plumber'
JOIN service_categories sc ON sc.name = 'Plumbing';

INSERT INTO provider_settings (provider_id)
SELECT pp.id FROM provider_profiles pp JOIN users u ON u.id = pp.user_id AND u.username = 'plumber';

-- Safety & compliance notes (admin console, S7)
INSERT INTO safety_notes (note) VALUES
('All providers must submit valid CIDB or JKR licence.'),
('Background checks processed within 48 hours of submission.'),
('Zero-tolerance policy for fraudulent profiles — immediate ban.'),
('Emergency escalation: FixIt hotline is available 24/7.'),
('Re-verification is required every 12 months for all providers.');
