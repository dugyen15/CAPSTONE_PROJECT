# CST Cafe Backend

Express + PostgreSQL API for the CST Cafe app.

## Setup
1. `npm install`
2. Copy `.env.example` to `.env` and fill in your database password, `JWT_SECRET` and `STAFF_INVITE_CODE`.
3. Create the database from `cst_cafe_db.sql` (do this once, see your database notes).
4. `npm run dev` (server starts on http://localhost:5000)
5. With the server running, `npm run test:smoke` checks every route (set `STAFF_INVITE_CODE` in your shell first).

## Accounts
- Customers sign up at `POST /api/auth/signup` (password 6+ characters).
- Staff sign up at `POST /api/staff/auth/signup` and must send `inviteCode` matching `STAFF_INVITE_CODE` (password 8+ characters).
- Customers and staff live in separate tables; a customer token can never use a staff route.
- Send the token as `Authorization: Bearer <token>`.

## Routes
| Area | Route | Who |
|---|---|---|
| Auth | `POST /api/auth/signup`, `/login`, `GET/PATCH /api/auth/me` | customer |
| Staff auth | `POST /api/staff/auth/signup`, `/login`, `GET/PATCH /api/staff/auth/me` | staff |
| Menu | `GET /api/menu`, `/api/menu/categories`, `/api/menu/:id` | public |
| Menu admin | `POST /api/menu`, `PUT/DELETE /api/menu/:id` | staff |
| Settings | `GET /api/settings` (takeaway fee) | public |
| Tables | `GET /api/tables?time=&duration=&partySize=` | public |
| Orders | `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`, `POST /api/orders/:id/cancel` | customer |
| Order handling | `GET /api/orders`, `PATCH /api/orders/:id/status`, `/delayed`, `/payment` | staff |
| Bookings | `POST /api/bookings`, `GET /api/bookings`, `POST /api/bookings/:id/cancel` | customer |
| Booking handling | `GET /api/bookings`, `PATCH /api/bookings/:id/status` | staff |
| Feedback | `POST /api/feedback` (anyone), `GET /api/feedback` (staff) | |
| Notifications | `GET /api/notifications`, `POST /read-all`, `PATCH /:id/read` | staff |

Prices and totals are always calculated by the server from the database, never trusted from the browser.
