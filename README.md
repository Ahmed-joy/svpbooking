# RAWAS — Node.js + React migration (deployment candidate)

This is a **partial migration/deployment candidate**, not a complete replacement of the Laravel application. Frontend: React/Vite; backend: Express/Node.js; database: existing MySQL schema. Compatible with Railway's Node.js deployment.

## Implemented
- Client and admin/staff login with existing Laravel bcrypt hashes (including `$2y$` compatibility), HTTP-only cookie JWT sessions, database-backed role/status checks.
- Client registration, client/admin dashboards, client read-only credentials, exam bookings, credit history and credit orders; admin read-only user directory; shared sessions and credit packages.
- Responsive React UI and API health route.

## Not yet implemented — do not use this version for live transactions
External PACC OTP and credentials authorization, booking/reschedule/cancel, live payment processor, printable tickets/certificates, secure vault/payment cards and full admin CRUD. Manual credit review/approval and package/status management **are** implemented, but not production-tested. Those require provider credentials, additional API/edge-case inspection and explicit integration testing. **Never store card CVV** in MySQL.

## Local setup
1. Install Node.js 20+ and MySQL 8+.
2. Import `schema.mysql.sql` into your MySQL database or connect to your existing Laravel MySQL DB after creating a backup.
3. Copy `.env.example` to `.env`, fill database connection fields and a long random `JWT_SECRET`.
4. Run `npm install`, `npm run build`, then `npm start`. For development: `npm run dev` (React) and `npm start` (API) in separate terminals.
5. Open http://localhost:3000 after build, or http://localhost:5173 in development. Health: `/api/health`.

## Railway
1. Push the contents of this folder to GitHub. Connect a new Railway service to that repository.
2. Provision MySQL or connect an existing database. Import the provided schema where necessary.
3. Add environment variables from `.env.example` (**not** the Laravel `.env`). Railway supplies PORT automatically.
4. Set Build command `npm install && npm run build`; Start command `npm start`.
5. Connect to your Railway-generated domain. Existing user passwords should authenticate against a correctly migrated MySQL `users` table.

## Security
The original source ZIP contains `.env` and may contain secrets. This output intentionally **does not copy** those secrets or vendor/assets. Rotate any exposed live API credentials before public deployment. Use production HTTPS, restrict DB network access and test permission enforcement. This starter has no seeded admin user—use your existing database or provision an admin securely outside public registration.

## Migration update (October 2026)

Added manual credit-order workflow: clients select an enabled package and gateway and submit a payment transaction reference; admins can review and approve/reject once. Approval adds credits and inserts a credit transaction under row locks in a single MySQL transaction. Only admins can manage packages or suspend/activate client accounts. The merchant must independently verify each payment transaction reference before approval. No real payment is performed here.

### Important deployment precautions

* Do not upload the original Laravel `.env`, database dumps containing real personal information, or stored API keys to GitHub.
* Configure Railway `JWT_SECRET` as a random 32+ character value, and add `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` using Railway's MySQL connection details. Set `NODE_ENV=production`.
* Import `schema.mysql.sql` only into a **new empty** MySQL database. Before connecting to an existing Laravel database, compare schema and take a verified backup; this schema is a migration approximation and is not guaranteed to match the production database.
* Never migrate, store or process card CVV or raw card numbers; use a PCI-compliant hosted payment provider/tokenization service instead. Existing Laravel card data needs a separate security review.
* External exam booking, OTP, automatic payment confirmation and PACC credential refresh are intentionally disabled until tested with authorized provider test credentials.
* Before serving real customers: install dependencies, run `npm run check && npm run build`, test database integration, user and admin roles, session protection, manual credit approval with real transactions, backups, CSRF protections and monitoring. Those integration tests have not been completed here.

## Feature verification / go-live gates

- Implemented in code: account registration/login, dashboards, read-only own bookings/credentials, admin user listing, manual credit orders, package create/toggle, account suspend/activate, one-time order approval/rejection with database transaction locks.
- Blocked pending provider access and independent review: actual PACC authorization/OTP, exam booking/rescheduling/cancellation, automated payment settlement, card tokenization, SMS/mail delivery. **Do not represent any of these as live.**
- Must test before production: package/review workflows against a disposable MySQL instance; authentication permissions, original schema alignment, payment reference reconciliation, Railway build and network TLS.
- Export only code to your GitHub repository. This ZIP deliberately excludes credentials, card databases, Laravel environment files and any live customer data.
- Security hardening: browser cross-origin write prevention, rate limiting, HTTPS-required production origin validation, restricted administrator actions; independent penetration review still needed.
