# Dental Clinic Booking System — Backend

## Overview
Backend API for a dental clinic booking system. Built with Node.js + Express, using Firebase Admin (Firestore) for data storage. The frontend is hosted separately (Netlify per README); this repo contains the API only.

## Tech Stack
- Runtime: Node.js 20 (CommonJS)
- Framework: Express 5
- Database: Firebase Firestore (via `firebase-admin`)
- Auth: JWT (`bcryptjs` for password hashing)
- Uploads: `multer` (files served from `/uploads`)
- Rate limiting: `express-rate-limit`
- CORS: `cors` (allowlist for the Netlify frontend and local dev)

## Project Layout
- `server.js` — entry point; mounts routes, seeds services, starts listener
- `config/firebase.js` — Firebase Admin init (validates env, returns Firestore `db`)
- `routes/` — route definitions (`auth`, `dentistRoutes`, `serviceRoutes`, `bookingRoutes`, `public`, `index`)
- `controllers/` — handlers for each domain (auth, dentists, services, bookings, health)
- `middleware/` — `authMiddleware` (JWT verify), `roleMiddleware`, `rateLimiter`, `requireSuperAdmin`
- `utils/` — `seedServices` (idempotent seed of 12 default services), `auditLogger`
- `uploads/` — uploaded images served statically at `/uploads`

## API Endpoints (high level)
- `GET /ping` — liveness check
- `GET /api/health` — health status
- `POST /api/auth/login`, `POST /api/auth/refresh-token`, `GET /api/auth/me`
- `GET /api/auth/admins`, `POST /api/auth/create-admin`, `DELETE /api/auth/delete-admin/:id` (super_admin only)
- `GET|POST|PATCH|DELETE /api/services`, `/api/dentists`, `/api/bookings`
- `GET /api/public/services`, `GET /api/public/dentists` — unauthenticated
- `GET /uploads/<file>` — static uploaded media

## Environment / Secrets
Required (server exits without these):
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (BEGIN/END private key block; `\n` escapes are auto-converted)
- `JWT_SECRET` (auto-generated on first setup)

Optional:
- `JWT_EXPIRES_IN` (default `15m`)
- `PORT` (default `5000`)

## Replit Setup
- Workflow `Start application` runs `npm start` on port 5000 (webview).
- Express binds on all interfaces by default — preview proxy works out of the box.
- Deployment configured as `autoscale` with run command `npm start`.

## Notes
- On startup the server seeds 12 default services into Firestore if the `services` collection is empty (idempotent).
- CORS allowlist is hardcoded in `server.js`; add new frontend origins there if needed.
