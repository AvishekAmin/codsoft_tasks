# Contact Management System REST API

> **CodSoft Internship Task 2: Backend Development**  
> Complete, functional, secure, tested, and documented Contact Management System REST API developed with Node.js, Express.js, PostgreSQL, and Prisma ORM.

---

## 1. Project Overview

The **Contact Management System REST API** is a robust backend service designed to allow registered users to securely manage their personal and professional contacts. Built according to modern RESTful architecture and clean separation of concerns, it strictly isolates each user's address book while providing flexible keyword search, granular filtering, sorting, pagination, data normalization, and database-level duplicate prevention.

### Key Highlights
- **Owner-Scoped Personal Isolation**: Each contact belongs strictly to the authenticated user who created it (`ownerId`). Cross-user access, modification, deletion, or enumeration is strictly prevented.
- **Relational Integrity via PostgreSQL & Prisma**: Uses PostgreSQL with Prisma ORM to define normalized relations, foreign key cascades, and unique constraints.
- **Multi-Tenant Duplicate Prevention**: Scoped duplicate prevention per user via PostgreSQL partial unique indexes (`contacts_ownerId_email_unique` and `contacts_ownerId_phone_unique`), allowing different users to store common contacts without collision while preventing duplicates within a single account.
- **Flexible Contact Methods**: Enforces that every contact contains at least one communication channel (email or phone), while allowing either to be individually optional.
- **Normalized Data Formats**: Normalizes emails (lowercase, trimmed) and phone numbers (clean E.164-compatible formatting, removing formatting symbols while preserving international dial codes).
- **Keyword Search & Granular Filtering**: Fast search across contact name, email, and phone number, alongside combined filters for company name, city, and country.
- **Defensive Validation & Mass-Assignment Protection**: All request payloads, queries, and URL parameters validated using Zod schemas with `.strict()`.
- **Production-Grade Security**: HTTP security headers via Helmet, configurable CORS, express-rate-limit throttling on authentication endpoints, bcrypt password hashing, and persistent JWT revocation on logout.
- **Complete Interactive Documentation**: Swagger UI dashboard conforming to OpenAPI 3.0.3 at `/api-docs` and an importable Postman collection.
- **Automated Test Suite**: 78 unit and integration tests covering positive flows, negative flows, boundary conditions, and cross-user security isolation using Jest and Supertest.

---

## 2. Technology Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Runtime** | Node.js | v25.x (ES Modules) | High-performance asynchronous JavaScript engine |
| **Framework** | Express.js | ^4.21.2 | Modular HTTP router and middleware pipeline |
| **Database** | PostgreSQL | 14+ | Relational persistence with foreign keys and partial unique indexes |
| **ORM** | Prisma | ^6.4.1 | Schema modeling, migrations, and query generation |
| **Validation** | Zod | ^3.24.2 | Defensive input validation, normalization, and parameter parsing |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`) | ^9.0.2 | Stateless Bearer token authentication with JTI revocation |
| **Password Hashing** | `bcryptjs` | ^3.0.3 | Secure adaptive salt-and-hash password protection |
| **Security Headers** | Helmet | ^8.0.0 | Secures HTTP headers against MIME-sniffing, XSS, and clickjacking |
| **CORS** | `cors` | ^2.8.5 | Cross-Origin Resource Sharing with configurable allowed origins |
| **Rate Limiting** | `express-rate-limit` | ^7.5.0 | Request throttling against brute-force authentication attacks |
| **Documentation** | Swagger UI (`swagger-ui-express`, `yamljs`) | ^5.0.1 | OpenAPI 3.0 interactive documentation dashboard |
| **Testing** | Jest & Supertest | ^29.7.0 / ^7.0.0 | Unit and HTTP integration test runner |
| **Development** | Nodemon | ^3.1.9 | File watcher and live server reload |

---

## 3. Database Design and Schema

The application uses PostgreSQL with Prisma ORM.

### Entity Relationship Diagram

```
┌─────────────────────────────────┐
│              users              │
├─────────────────────────────────┤
│ id (UUID, PK)                   │ 1
│ name (VARCHAR)                  │───┐
│ email (VARCHAR, Unique)         │   │
│ passwordHash (VARCHAR)          │   │
│ createdAt (TIMESTAMP)           │   │
│ updatedAt (TIMESTAMP)           │   │
└─────────────────────────────────┘   │
                │ 1                   │
                │                     │
                │ *                   │ *
                ▼                     ▼
┌─────────────────────────────────┐ ┌─────────────────────────────────┐
│         revoked_tokens          │ │            contacts             │
├─────────────────────────────────┤ ├─────────────────────────────────┤
│ id (UUID, PK)                   │ │ id (UUID, PK)                   │
│ tokenId (VARCHAR, Unique)       │ │ ownerId (UUID, FK -> users.id)  │
│ userId (UUID, FK -> users.id)   │ │ name (VARCHAR)                  │
│ expiresAt (TIMESTAMP)           │ │ email (VARCHAR, Nullable)       │
│ createdAt (TIMESTAMP)           │ │ phone (VARCHAR, Nullable)       │
└─────────────────────────────────┘ │ addressLine1 (VARCHAR, Nullable)│
                                    │ addressLine2 (VARCHAR, Nullable)│
                                    │ city (VARCHAR, Nullable)        │
                                    │ state (VARCHAR, Nullable)       │
                                    │ postalCode (VARCHAR, Nullable)  │
                                    │ country (VARCHAR, Nullable)     │
                                    │ companyName (VARCHAR, Nullable) │
                                    │ jobTitle (VARCHAR, Nullable)    │
                                    │ notes (TEXT, Nullable)          │
                                    │ createdAt (TIMESTAMP)           │
                                    │ updatedAt (TIMESTAMP)           │
                                    ├─────────────────────────────────┤
                                    │ UNIQUE (ownerId, email) WHERE !=│
                                    │ UNIQUE (ownerId, phone) WHERE !=│
                                    │ CHECK (email IS NOT NULL OR     │
                                    │        phone IS NOT NULL)       │
                                    └─────────────────────────────────┘
```

### Models Description

#### A. User (`users`)
- `id`: UUID Primary Key.
- `name`: Full name of user.
- `email`: Normalized, lowercase, unique user email address.
- `passwordHash`: Salted bcrypt password hash (never returned in API responses).
- `createdAt`, `updatedAt`: Timestamps.

#### B. Contact (`contacts`)
- `id`: UUID Primary Key.
- `ownerId`: Foreign Key references `users(id)` with `ON DELETE CASCADE`.
- `name`: Required contact full name (cannot be whitespace).
- `email`: Optional email address, trimmed and converted to lowercase.
- `phone`: Optional phone number, normalized into E.164 clean format.
- `addressLine1`, `addressLine2`, `city`, `state`, `postalCode`, `country`: Structured address components.
- `companyName`, `jobTitle`: Professional information.
- `notes`: Additional notes or meeting remarks.
- `createdAt`, `updatedAt`: Automatic audit timestamps.

#### C. RevokedToken (`revoked_tokens`)
- `id`: UUID Primary Key.
- `tokenId`: Unique JWT identifier (`jti`) revoked upon user logout.
- `userId`: Optional Foreign Key to `users(id)` with cascade deletion.
- `expiresAt`: Timestamp when token would expire naturally.

---

## 4. Multi-Tenant Duplicate Prevention and Partial Unique Indexes

In a personal contact manager, duplicate prevention must be scoped to each user:
1. Two contacts owned by the **same user** must not share the same normalized email address.
2. Two contacts owned by the **same user** must not share the same normalized phone number.
3. Two **different users** may legitimately store the same external person's email or phone number.
4. Contacts may have optional emails or optional phones (e.g. phone-only or email-only contacts). Therefore, null values must not collide.

### PostgreSQL Partial Unique Indexes
To guarantee database-level enforcement that holds true even under high-concurrency race conditions, the migration `prisma/migrations/20261101000000_init/migration.sql` creates:

```sql
-- Partial unique index for non-null emails per owner
CREATE UNIQUE INDEX "contacts_ownerId_email_unique" 
ON "contacts"("ownerId", "email") 
WHERE "email" IS NOT NULL;

-- Partial unique index for non-null phones per owner
CREATE UNIQUE INDEX "contacts_ownerId_phone_unique" 
ON "contacts"("ownerId", "phone") 
WHERE "phone" IS NOT NULL;

-- Check constraint ensuring at least one contact method
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_at_least_one_contact_method" 
CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL);
```

When concurrent requests attempt to insert identical contact information, PostgreSQL enforces relational isolation and throws error `23505` (Prisma error `P2002`), which our centralized error middleware translates into a client-friendly `409 Conflict` response.

---

## 5. Contact Ownership and Privacy Rules

Personal contact information is strictly protected:
- **No Shared Contact Pool**: There is no public or global contact list.
- **Owner ID From Authenticated Token**: `ownerId` is extracted solely from `req.user.id` verified via JWT, never accepted from user request bodies.
- **Query Scoping**: Every database lookup (`findMany`, `findFirst`, `count`) includes `{ where: { ownerId: req.user.id } }`.
- **404 Not Found for Inaccessible Contacts**: If User A requests or attempts to mutate a contact owned by User B, the API returns `404 Not Found` (rather than `403 Forbidden`) to avoid disclosing whether a foreign contact ID exists in the system.

---

## 6. API Endpoint Reference

All endpoints use the prefix `/api/v1`.

### A. Health Monitoring
| Method | Endpoint | Auth | Description | Status Codes |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | None | Returns uptime and database connectivity | `200` |

### B. Authentication
| Method | Endpoint | Auth | Description | Status Codes |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/register` | None (Rate Limited) | Register a new user account | `201`, `400`, `409` |
| `POST` | `/api/v1/auth/login` | None (Rate Limited) | Authenticate user and issue JWT | `200`, `400`, `401` |
| `GET` | `/api/v1/auth/me` | Bearer Token | Retrieve authenticated user profile | `200`, `401` |
| `POST` | `/api/v1/auth/logout` | Bearer Token | Revoke active JWT identifier in database | `200`, `401` |

### C. Contacts
| Method | Endpoint | Auth | Description | Status Codes |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/contacts` | Bearer Token | Create new contact under authenticated user | `201`, `400`, `409` |
| `GET` | `/api/v1/contacts` | Bearer Token | List contacts with search, filters, pagination | `200`, `400`, `401` |
| `GET` | `/api/v1/contacts/search`| Bearer Token | Convenience search endpoint (`?q=...`) | `200`, `401` |
| `GET` | `/api/v1/contacts/:contactId` | Bearer Token | Retrieve single contact by UUID | `200`, `400`, `404` |
| `PATCH`| `/api/v1/contacts/:contactId` | Bearer Token | Partially update contact details | `200`, `400`, `404`, `409` |
| `DELETE`| `/api/v1/contacts/:contactId`| Bearer Token | Permanently delete owned contact | `204`, `400`, `404` |

---

## 7. Request and Response Conventions

### Success Response Envelope
```json
{
  "success": true,
  "message": "Contact created successfully",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "ownerId": "a123e456-e89b-12d3-a456-426614174001",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+15551234567",
    "companyName": "TechCorp",
    "jobTitle": "Lead Engineer",
    "city": "San Francisco",
    "country": "USA",
    "createdAt": "2026-11-01T03:30:00.000Z",
    "updatedAt": "2026-11-01T03:30:00.000Z"
  }
}
```

### Paginated Response Envelope
```json
{
  "success": true,
  "message": "Contacts retrieved successfully",
  "data": {
    "items": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "phone": "+15551234567"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalItems": 1,
      "totalPages": 1
    }
  }
}
```

### Error Response Envelope
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email address format"
    }
  ]
}
```

---

## 8. Installation and Setup Instructions

### Prerequisites
- **Node.js**: v18+ (tested on Node.js v25.6.1)
- **NPM**: v9+ (tested on v11.9.0)
- **PostgreSQL**: PostgreSQL 14+ instance running locally or via cloud (e.g., Supabase, Neon, AWS RDS)

### 1. Clone & Navigate to Project Directory
```bash
cd C:\MajorProject\codsoft_tasks\contact-management-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` and set your database connection details and a secure 32+ character JWT secret:
```env
PORT=5002
NODE_ENV=development
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/contact_management?schema=public
DATABASE_URL_TEST=postgresql://postgres:YOUR_PASSWORD@localhost:5432/contact_management_test?schema=public
JWT_SECRET=c8e71f92e06d44b58e61280a827429dbeaf67280fbe954bc2fa24564ad7fe128
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=10
CORS_ORIGIN=http://localhost:3000
```

### 4. Create the PostgreSQL Database
Connect to your PostgreSQL server via `psql` or pgAdmin and run:
```sql
CREATE DATABASE contact_management;
CREATE DATABASE contact_management_test;
```

### 5. Generate Prisma Client and Run Migrations
```bash
# Generate Prisma Client
npm run prisma:generate

# Apply database migrations
npm run prisma:deploy
```

### 6. (Optional) Seed Sample Demonstration Data
To populate sample users and realistic contacts:
```bash
npm run seed
```
**Seed Accounts Created**:
- User 1: `avishek@example.com` / `Password123!` (contains 5 contacts)
- User 2: `priya@example.com` / `Password123!` (contains 2 contacts)

### 7. Start the Development Server
```bash
npm run dev
```
Or for production:
```bash
npm start
```
The server will start at `http://localhost:5002`.

---

## 9. Running Automated Tests

The testing suite contains **78 tests** across unit and integration test suites:

```bash
# Run all unit and integration tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

### Test Coverage Highlights
- **Auth Integration (`auth.test.js`)**: Registration, password policies, duplicate email prevention, login, JWT issuance, profile retrieval, and logout token revocation.
- **Contact CRUD Integration (`contact.test.js`)**: Creation, retrieval, partial update, deletion (204 No Content), contact method requirement enforcement, and UUID validation.
- **Multi-Tenant Ownership & Duplicate Scoping (`ownershipDuplicate.test.js`)**: Strict owner scoping, 404 access denial for cross-user operations, per-user email and phone duplicate rejection, and multi-tenant isolation.
- **Search & Pagination (`searchPagination.test.js`)**: Keyword search across name, email, and phone, combined filtering, ascending/descending sorting, limit clamping, and convenience search endpoints.
- **Unit Tests (`validators.test.js`, `queryUtils.test.js`, `phoneUtils.test.js`, `auth.service.test.js`)**: Zod schema edge cases, pagination boundary calculations, phone normalization rules, and token generation.

---

## 10. Interactive Swagger Documentation

The interactive OpenAPI 3.0 documentation dashboard is available directly in the browser:

```
http://localhost:5002/api-docs
```

To test authenticated endpoints in Swagger:
1. Call `POST /api/v1/auth/login` with your credentials.
2. Copy the returned `data.token`.
3. Click the green **Authorize** button at the top right of the Swagger UI.
4. Enter `Bearer <token>` and click **Authorize**.
5. All subsequent requests in Swagger will include the authorization header.

---

## 11. Postman Collection

An importable Postman collection is located at:
```
postman/contact-management-api.postman_collection.json
```

### How to Import and Use in Postman:
1. Open Postman.
2. Click **Import** (top left) and select `postman/contact-management-api.postman_collection.json`.
3. The collection includes automatic tests scripts that:
   - Save the JWT token to the `authToken` collection variable upon login.
   - Save created contact IDs to the `contactId` variable for subsequent GET, PATCH, and DELETE requests.
   - Store a second user's token (`user2Token`) to test and demonstrate cross-user access denial in real-time.

---

## 12. Security Implementation

1. **Password Protection**: Passwords hashed using `bcryptjs` with configurable adaptive work factor (`BCRYPT_SALT_ROUNDS=10`). Password hashes are never returned in responses.
2. **Defensive Validation**: Strict Zod schemas eliminate unexpected fields and prevent mass assignment attacks.
3. **HTTP Hardening**: Helmet sets security headers including `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and CSP defaults.
4. **Rate Limiting**: Throttles brute-force attempts on registration and login endpoints (30 requests per 15 minutes window).
5. **Payload Size Limitation**: Request body parser capped at 10KB to prevent memory exhaustion and DoS attacks.
6. **Token Invalidation on Logout**: Active JWT IDs are recorded in the PostgreSQL `revoked_tokens` table and verified on every authenticated request.
7. **No Information Leaks**: Production error middleware conceals stack traces, SQL syntax errors, and database connection strings.

---

## 13. Project Architecture

```
contact-management-system/
├── prisma/
│   ├── schema.prisma                       # Source of truth for database schema
│   ├── migrations/
│   │   └── 20261101000000_init/
│   │       └── migration.sql               # Initial PostgreSQL migration with partial indexes
│   └── seed.js                             # Database seed script for demonstration
├── src/
│   ├── config/
│   │   ├── env.js                          # Validated environment configuration
│   │   ├── db.js                           # Prisma Client instance & health checker
│   │   └── testDb.js                       # In-memory relational simulator for testing
│   ├── controllers/
│   │   ├── auth.controller.js              # Auth route handlers
│   │   ├── contact.controller.js           # Contact CRUD route handlers
│   │   └── health.controller.js            # System health handler
│   ├── services/
│   │   ├── auth.service.js                 # Authentication business logic & password hashing
│   │   └── contact.service.js              # Contact queries, mutations & duplicate prevention
│   ├── routes/
│   │   ├── auth.routes.js                  # Authentication endpoints
│   │   ├── contact.routes.js               # Contact endpoints
│   │   ├── health.routes.js                # Health check endpoint
│   │   └── index.js                        # Versioned API router (/api/v1)
│   ├── middleware/
│   │   ├── auth.middleware.js              # JWT Bearer verification & token blocklist check
│   │   ├── validate.middleware.js          # Zod request validation wrapper
│   │   ├── rateLimiter.middleware.js       # Express rate limiter configuration
│   │   ├── notFound.middleware.js          # 404 handler
│   │   └── error.middleware.js             # Centralized error handler & Prisma error mapper
│   ├── validators/
│   │   ├── auth.validator.js               # Registration & login schemas
│   │   └── contact.validator.js            # Contact CRUD & query validation schemas
│   ├── utils/
│   │   ├── response.js                     # Standard JSON response envelopes
│   │   ├── queryUtils.js                   # Search, filter, sorting & pagination builders
│   │   ├── phoneUtils.js                   # E.164 phone normalization & validation
│   │   └── logger.js                       # Redacted diagnostic logger
│   ├── app.js                              # Express application setup
│   └── server.js                           # HTTP server listener & graceful shutdown
├── tests/
│   ├── testHelper.js                       # Test users, tokens & database reset utilities
│   ├── unit/
│   │   ├── auth.service.test.js            # Unit tests for token generation & user sanitization
│   │   ├── phoneUtils.test.js              # Unit tests for phone normalization
│   │   ├── queryUtils.test.js              # Unit tests for pagination, sorting & where clauses
│   │   └── validators.test.js              # Unit tests for Zod validation schemas
│   └── integration/
│       ├── auth.test.js                    # Auth integration tests (register, login, me, logout)
│       ├── contact.test.js                 # Contact CRUD integration tests
│       ├── ownershipDuplicate.test.js      # Isolation & duplicate prevention integration tests
│       └── searchPagination.test.js        # Search, filter, sort & pagination integration tests
├── docs/
│   └── openapi.yaml                        # Complete OpenAPI 3.0 specification
├── postman/
│   └── contact-management-api.postman_collection.json # Importable Postman collection
├── .env.example                            # Template environment configuration
├── .gitignore                              # Git ignore rules
├── package.json                            # Scripts & dependencies
└── README.md                               # Project documentation
```

---

## 14. Troubleshooting

### 1. `DATABASE_URL` Connection Errors
Ensure PostgreSQL is running and credentials in `.env` match:
```bash
# Verify PostgreSQL port 5432
Test-NetConnection -ComputerName localhost -Port 5432
```
If connecting to a remote PostgreSQL database, append `?sslmode=require` to `DATABASE_URL`.

### 2. Prisma Client Out of Sync
If schema changes occur:
```bash
npm run prisma:generate
```

### 3. Port Conflict (Port 5002)
If port 5002 is already occupied, update `PORT=5003` in `.env`.

---

## 15. License and Internship Verification

Developed by an intern for **CodSoft Backend Development Internship Task 2: Contact Management System**.  
Released under the **ISC License**.
