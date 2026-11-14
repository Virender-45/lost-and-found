# Lost & Found Management System (Node.js + MongoDB)

This starter keeps the supplied HTML/CSS pages and adds a Node.js/Express backend, MongoDB models, authentication, and user/admin routes.

## Features included
- User registration and login.
- Password hashing with bcrypt.
- JWT session stored in an HttpOnly cookie.
- Public registration always creates `user` accounts; the role is never accepted from the browser.
- Admin account created separately using `seed-admin.js`.
- Signed-in users can submit reports and view/delete their own reports.
- Public item list shows only approved reports.
- Admin can approve/reject reports, mark them resolved, delete reports, view users, and delete user accounts.
- Basic security headers and login rate limiting.

## Requirements
- Node.js 18+ recommended.
- MongoDB locally or a MongoDB Atlas database.

## Setup
1. Open this folder in VS Code / terminal.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env`.
   - Set `MONGODB_URI` to your local MongoDB URI or MongoDB Atlas connection string.
   - Set `JWT_SECRET` to a long, random secret.
   - Set `ADMIN_EMAIL`, `ADMIN_NAME`, and a strong `ADMIN_PASSWORD` (at least 12 characters).
4. Create the admin account:
   ```bash
   npm run create-admin
   ```
5. Start the app:
   ```bash
   npm run dev
   ```
6. Visit `http://localhost:3000` in your browser. Do not open the HTML files directly from File Explorer; the API needs the Express server.

## Admin login
Use the email and password you configured in `.env` at `http://localhost:3000/login.html`. Do not share the `.env` file or commit it to Git.

## API overview
- `POST /api/auth/register` — create a normal user account.
- `POST /api/auth/login` — log in.
- `POST /api/auth/logout` — log out.
- `GET /api/auth/me` — current session.
- `GET /api/items` — list approved reports (optional `?status=Lost` or `?status=Found`).
- `POST /api/items` — create a report (login required; starts as Pending).
- `GET /api/items/mine` — current user's reports.
- `DELETE /api/items/:id` — delete own report or any report as admin.
- `GET /api/admin/summary` — admin-only statistics.
- `GET /api/admin/items` — admin-only all reports.
- `PATCH /api/admin/items/:id` — admin-only approval/resolution changes.
- `GET /api/admin/users` — admin-only user list.
- `DELETE /api/admin/users/:id` — admin-only delete user and their reports.

## Before public deployment
- Set `COOKIE_SECURE=true` when using HTTPS.
- Use a strong unique JWT secret and strong admin password.
- Add HTTPS, backups, monitoring, and more complete validation/rate limiting.
- Review contact-number privacy before exposing it on public approved reports; this starter preserves your current UI's behavior of displaying the contact number.
