```sql
-- FixIt sample seed data

USE fixit_db;

-- =========================
-- Clear old data
-- =========================

DELETE FROM safety_notes;
DELETE FROM recurring_bookings;
DELETE FROM provider_availability;
DELETE FROM messages;
DELETE FROM reviews;
DELETE FROM jobs;
DELETE FROM provider_categories;
DELETE FROM provider_profiles;
DELETE FROM service_categories;
DELETE FROM users;

ALTER TABLE users AUTO_INCREMENT = 1;
ALTER TABLE service_categories AUTO_INCREMENT = 1;
ALTER TABLE provider_profiles AUTO_INCREMENT = 1;
ALTER TABLE provider_categories AUTO_INCREMENT = 1;
ALTER TABLE jobs AUTO_INCREMENT = 1;
ALTER TABLE reviews AUTO_INCREMENT = 1;
ALTER TABLE messages AUTO_INCREMENT = 1;
ALTER TABLE provider_availability AUTO_INCREMENT = 1;
ALTER TABLE recurring_bookings AUTO_INCREMENT = 1;
ALTER TABLE safety_notes AUTO_INCREMENT = 1;

-- =========================
-- Users
-- Password for all sample users: password
-- =========================

INSERT INTO users (name, email, password_hash, role, phone) VALUES
('Admin User', 'admin@fixit.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi', 'admin', '0100000001'),
('Ammar Customer', 'customer@fixit.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi', 'customer', '0100000002'),
('Ali Plumber', 'plumber@fixit.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi', 'provider', '0100000003'),
('Sara Cleaner', 'cleaner@fixit.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi', 'provider', '0100000004'),
('Omar Electrician', 'electrician@fixit.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi', 'provider', '0100000005');

-- =========================
-- Service Categories
-- =========================

INSERT INTO service_categories (name, description, icon_url) VALUES
('Plumbing', 'Pipe repair, leaking tap repair, toilet repair, and water-related services.', 'icons/plumbing.png'),
('Electrical', 'Fan installation, light repair, socket repair, and small electrical services.', 'icons/electrical.png'),
('Cleaning', 'Room cleaning, deep cleaning, and move-in or move-out cleaning services.', 'icons/cleaning.png'),
('Gardening', 'Grass cutting, garden cleaning, and plant maintenance.', 'icons/gardening.png'),
('AC Service', 'Air-conditioner cleaning, inspection, and basic maintenance.', 'icons/ac.png');

-- =========================
-- Provider Profiles
-- =========================

INSERT INTO provider_profiles
(user_id, bio, location, latitude, longitude, base_rate, photo_url, verification_status, kyc_doc_url)
VALUES
(3, 'Experienced plumber for small apartment repairs and emergency leaks.', 'Taman Universiti, Skudai', 1.5375000, 103.6306000, 50.00, 'photos/ali-plumber.jpg', 'verified', 'uploads/kyc/ali-plumber.pdf'),
(4, 'Reliable cleaner for student rooms, apartments, and deep cleaning jobs.', 'Kangkar Pulai, Johor', 1.5602000, 103.6109000, 40.00, 'photos/sara-cleaner.jpg', 'verified', 'uploads/kyc/sara-cleaner.pdf'),
(5, 'Electrical service provider for fan, lighting, and socket installation.', 'Skudai, Johor', 1.5339000, 103.6608000, 60.00, 'photos/omar-electrician.jpg', 'pending', 'uploads/kyc/omar-electrician.pdf');

-- =========================
-- Provider Categories
-- =========================

INSERT INTO provider_categories (provider_id, category_id) VALUES
(1, 1),
(1, 5),
(2, 3),
(2, 4),
(3, 2);

-- =========================
-- Jobs / Bookings
-- =========================

INSERT INTO jobs
(customer_id, provider_id, category_id, status, scheduled_at, address, description, total)
VALUES
(2, 1, 1, 'reviewed', '2026-07-01 10:00:00', 'Block A, Student Apartment, Skudai', 'Kitchen sink pipe is leaking.', 70.00),
(2, 2, 3, 'accepted', '2026-07-03 14:00:00', 'Block B, Student Apartment, Skudai', 'Need deep cleaning for one room.', 45.00),
(2, 1, 5, 'requested', '2026-07-05 09:00:00', 'Block C, Student Apartment, Skudai', 'AC needs basic cleaning service.', 0.00);

-- =========================
-- Reviews
-- =========================

INSERT INTO reviews (job_id, rating, comment) VALUES
(1, 5, 'Good service. The provider arrived on time and fixed the leak quickly.');

-- =========================
-- Messages
-- =========================

INSERT INTO messages (job_id, sender_id, body) VALUES
(2, 2, 'Hi, can you come on time for the cleaning job?'),
(2, 4, 'Yes, I will arrive at 2 PM.'),
(3, 2, 'Is AC cleaning available this weekend?');

-- =========================
-- Provider Availability
-- =========================

INSERT INTO provider_availability
(provider_id, available_date, start_time, end_time, auto_confirm)
VALUES
(1, '2026-07-05', '09:00:00', '12:00:00', TRUE),
(1, '2026-07-06', '14:00:00', '18:00:00', FALSE),
(2, '2026-07-03', '13:00:00', '17:00:00', TRUE),
(3, '2026-07-04', '10:00:00', '15:00:00', FALSE);

-- =========================
-- Recurring Bookings
-- =========================

INSERT INTO recurring_bookings
(customer_id, provider_id, category_id, frequency, start_date, end_date, address, status)
VALUES
(2, 2, 3, 'weekly', '2026-07-10', '2026-08-10', 'Block B, Student Apartment, Skudai', 'active');

-- =========================
-- Safety Notes / Disputes
-- =========================

INSERT INTO safety_notes (job_id, admin_id, note) VALUES
(2, 1, 'Admin note: Customer requested provider to confirm arrival time before the job.');
```
