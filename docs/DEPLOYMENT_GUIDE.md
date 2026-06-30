# FixIt Deployment Guide

This guide keeps one system: one Vue frontend, one Slim API, and one MySQL database. Android connects to the same deployed API.

## 1. Frontend Deployment

1. Configure `frontend/.env.production`:

```text
VITE_API_BASE_URL=https://api.your-domain.example/api
VITE_CAPACITOR_API_BASE_URL=https://api.your-domain.example/api
VITE_STRIPE_PUBLIC_KEY=pk_live_or_test_replace_with_your_publishable_key
```

2. Build:

```powershell
cd frontend
pnpm install
pnpm run build:production
```

3. Deploy `frontend/dist/` to the static host.

SPA fallback must serve `index.html` for customer, provider, and admin routes.

## 2. Backend Deployment

Deploy `backend/` to a PHP 8.1+ host. The web document root must be:

```text
backend/public
```

Install PHP dependencies:

```powershell
cd backend
composer install --no-dev --optimize-autoloader
```

If Composer is not installed globally, use the bundled `composer.phar`:

```powershell
php composer.phar install --no-dev --optimize-autoloader
```

## 3. Backend Environment

Create `backend/.env` on the server:

```text
APP_ENV=production
APP_URL=https://your-frontend-domain.example
APP_ALLOWED_ORIGINS=https://your-frontend-domain.example,capacitor://localhost,http://localhost
DB_HOST=your-mysql-host.example
DB_PORT=3306
DB_NAME=fixit_db
DB_USER=fixit_user
DB_PASSWORD=replace-with-production-password
JWT_SECRET=replace-with-at-least-32-random-characters
JWT_TTL=3600
STRIPE_SECRET_KEY=sk_live_or_test_replace_with_your_secret_key
```

Use the same `DB_NAME`, tables, and schema for web and Android traffic.

## 4. MySQL Deployment

Import the existing schema and seed only when creating a fresh database:

```powershell
mysql -u fixit_user -p < database/schema.sql
mysql -u fixit_user -p fixit_db < database/seed.sql
```

For an existing production database, back it up before importing or migrating. Do not replace live data casually.

## 5. CORS Setup

The backend reads `APP_ALLOWED_ORIGINS`.

Include:

- production frontend origin, for example `https://your-frontend-domain.example`
- Capacitor origins: `capacitor://localhost` and `http://localhost`
- any staging frontend origin you actually deploy

Do not use `*` because the API carries JWT bearer tokens and file uploads.

## 6. File Uploads and KYC Storage

KYC files are stored under:

```text
backend/storage/kyc
```

Ensure this folder exists and is writable by the PHP process. Do not expose it directly as a public web folder. Downloads go through `/api/provider/kyc/download`.

## 7. Payment Configuration

Frontend uses:

```text
VITE_STRIPE_PUBLIC_KEY
```

Backend uses:

```text
STRIPE_SECRET_KEY
```

Keep test keys in development and real keys only in production environment files.

## 8. Capacitor Android Build

Android must use the deployed API URL, not `localhost`, Laragon, or a separate database.

1. Configure `frontend/.env.android`:

```text
VITE_API_BASE_URL=https://api.your-domain.example/api
VITE_CAPACITOR_API_BASE_URL=https://api.your-domain.example/api
VITE_STRIPE_PUBLIC_KEY=pk_live_or_test_replace_with_your_publishable_key
```

For local emulator testing before deployment, `frontend/.env.android` may temporarily point to:

```text
VITE_API_BASE_URL=http://10.0.2.2:8090/api
VITE_CAPACITOR_API_BASE_URL=http://10.0.2.2:8090/api
```

This still uses the same local Slim API and the same local MySQL database. Do not use this local URL for a production Android release.

2. Build and sync:

```powershell
cd frontend
pnpm install
pnpm run cap:sync:android
```

3. Open Android Studio:

```powershell
pnpm run cap:open:android
```

4. Run on emulator/device:

```powershell
pnpm run cap:run:android
```

The Android wrapper is in `frontend/android/`. Its manifest includes internet permission. Debug builds allow local HTTP traffic for emulator testing; release builds should use the deployed HTTPS API. The app loads the same Vue build from `frontend/dist/` and calls the same Slim API.

## 9. Production Smoke Checks

After deployment, verify:

- `GET https://api.your-domain.example/api/health`
- customer login and dashboard
- provider login and job dashboard
- admin login and bootstrap data
- booking creation and status updates
- Stripe payment intent creation
- KYC upload/download
- reviews and ratings
- Android app login against the deployed API
