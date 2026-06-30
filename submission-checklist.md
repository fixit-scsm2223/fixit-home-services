# FixIt Submission Checklist

## Repository Structure

- [x] Frontend source is in `frontend/`
- [x] Backend source is in `backend/`
- [x] Existing database files are in `database/`
- [x] Documentation is in `docs/`
- [x] Capacitor Android wrapper is in `frontend/android/`
- [x] Generated dependency folders are ignored
- [x] Real `.env` files are ignored

## Frontend

- [ ] `cd frontend && pnpm install`
- [ ] `cd frontend && pnpm run build`
- [ ] `frontend/.env.production` contains deployed API URL
- [ ] No production build points to Laragon or localhost

## Backend

- [ ] `cd backend && composer install`
- [ ] `cd backend && php -S 127.0.0.1:8090 -t public public/index.php`
- [ ] `GET /api/health` returns API health
- [ ] `backend/.env` has real MySQL credentials
- [ ] `JWT_SECRET` has at least 32 characters
- [ ] `STRIPE_SECRET_KEY` is set for payment testing
- [ ] KYC storage folder is writable

## Database

- [ ] `database/schema.sql` imports successfully
- [ ] `database/seed.sql` imports successfully
- [ ] Existing tables are preserved
- [ ] Existing seed accounts work
- [ ] No separate Android-only database exists

## Authentication and Roles

- [ ] Customer login works
- [ ] Provider login works
- [ ] Admin login works
- [ ] JWT-protected `/api/auth/me` works
- [ ] Customer routes reject non-customer roles
- [ ] Provider routes reject non-provider roles
- [ ] Admin routes reject non-admin roles

## Main Flows

- [ ] Customer marketplace and dashboard load
- [ ] Booking creation works
- [ ] My Bookings and job ticket load
- [ ] Provider job accept/status/final cost flow works
- [ ] Customer cost confirmation works
- [ ] Payment intent and payment confirmation work
- [ ] Provider KYC upload/download works
- [ ] Review/rating submission works
- [ ] Admin dashboard/bootstrap loads real data

## Deployment

- [ ] Frontend static host has SPA fallback to `index.html`
- [ ] Backend web root points to `backend/public`
- [ ] Production `APP_ALLOWED_ORIGINS` includes frontend origin
- [ ] Production `APP_ALLOWED_ORIGINS` includes Capacitor origins
- [ ] Production API URL is configured in frontend env files
- [ ] No secrets are committed

## Capacitor Android

- [ ] `frontend/capacitor.config.json` has app ID and `webDir=dist`
- [ ] `frontend/.env.android` points to deployed API URL, or to `http://10.0.2.2:8090/api` only for local emulator testing
- [ ] `cd frontend && pnpm run cap:sync:android`
- [ ] Android Studio opens `frontend/android`
- [ ] Android app launches
- [ ] Android app logs in through deployed API
- [ ] Android app shows real database-backed data
