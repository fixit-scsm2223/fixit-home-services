# FixIt Unified Service Platform

FixIt is a Vue 3, Vite, PHP Slim 4, and MySQL service platform for customer, provider, and admin workflows. The Android app uses Capacitor and connects to the same deployed Slim API and the same MySQL database through that API.

## Technology Stack

- Frontend: Vue 3, Vite, Pinia, Vue Router, Axios, Leaflet, Stripe.js
- Backend: PHP 8.1+, Slim 4, PDO MySQL, Firebase JWT, Stripe PHP
- Database: MySQL, schema and seed files in `database/`
- Android: Capacitor Android

## Folder Structure

```text
frontend/              Vue 3 application and Capacitor Android wrapper
backend/               PHP Slim API
database/              Existing schema.sql and seed.sql for fixit_db
docs/                  API and deployment documentation
submission-checklist.md
README.md
```

Generated folders such as `frontend/node_modules/`, `frontend/dist/`, `backend/vendor/`, and Android build outputs are ignored and should be recreated from lock files.

## Environment Files

Copy examples before running locally:

```powershell
Copy-Item frontend/.env.example frontend/.env
Copy-Item backend/.env.example backend/.env
```

For production and Android, copy and fill:

```powershell
Copy-Item frontend/.env.production.example frontend/.env.production
Copy-Item frontend/.env.android.example frontend/.env.android
Copy-Item backend/.env.production.example backend/.env.production
```

Do not commit real `.env` files.

## Database Setup

Use the existing database contract. Do not create a separate Android database.

```powershell
mysql -u root < database/schema.sql
mysql -u root fixit_db < database/seed.sql
```

Seeded demo accounts use password `CPAD8888`:

```text
customer / CPAD8888
provider / CPAD8888
admin / CPAD8888
```

## Local Frontend Setup

```powershell
cd frontend
pnpm install
pnpm run dev
```

The Vite dev server runs at `http://localhost:5173` and is also reachable on your LAN IP for mobile browser testing. In local development, `VITE_API_BASE_URL=/api` uses the Vite proxy to the backend on `127.0.0.1:8090`.

## Local Backend Setup

```powershell
cd backend
php composer.phar install
php -S 127.0.0.1:8090 -t public public/index.php
```

Or, if Composer is installed globally:

```powershell
cd backend
composer install
composer serve
```

Health check:

```powershell
Invoke-RestMethod http://127.0.0.1:8090/api/health
```

## Production Build

Set `frontend/.env.production`:

```text
VITE_API_BASE_URL=https://api.your-domain.example/api
VITE_STRIPE_PUBLIC_KEY=pk_live_or_test_replace_with_your_publishable_key
```

Then build:

```powershell
cd frontend
pnpm run build:production
```

Deploy `frontend/dist/` to the frontend host. Deploy `backend/public/` as the web root for the Slim API, with `backend/.env` configured for the production MySQL database.

## Capacitor Android

Android must use the deployed backend API URL. It must not use Laragon localhost or a separate database.

1. Fill `frontend/.env.android`:

```text
VITE_API_BASE_URL=https://api.your-domain.example/api
VITE_CAPACITOR_API_BASE_URL=https://api.your-domain.example/api
VITE_STRIPE_PUBLIC_KEY=pk_live_or_test_replace_with_your_publishable_key
```

For local emulator-only testing before deployment, use the same local Slim backend through the emulator host bridge:

```text
VITE_API_BASE_URL=http://10.0.2.2:8090/api
VITE_CAPACITOR_API_BASE_URL=http://10.0.2.2:8090/api
```

Keep the backend running on port `8090` while testing the Android app locally.

2. Build and sync:

```powershell
cd frontend
pnpm run cap:sync:android
```

3. Open or run Android:

```powershell
pnpm run cap:open:android
pnpm run cap:run:android
```

The Android app uses `frontend/capacitor.config.json`, `webDir=dist`, `appId=com.fixit.app`, and `androidScheme=http`. The generated Android manifest includes internet permission, and debug Android builds allow cleartext only so the emulator can reach the local HTTP backend during testing.

## Documentation

- API contract: `docs/API_CONTRACT.md`
- Deployment guide: `docs/DEPLOYMENT_GUIDE.md`
- Submission checklist: `submission-checklist.md`
