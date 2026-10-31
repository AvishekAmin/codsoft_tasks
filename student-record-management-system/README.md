# Student Record Management REST API

> **CodSoft Internship Task 1: Backend Development**  
> Complete, functional, secure, tested, and documented Student Record Management REST API developed with Node.js, Express.js, PostgreSQL, and Prisma ORM.

---

## 1. Project Overview

The **Student Record Management REST API** is a robust backend application designed to manage student academic records, course catalogs, and enrollment lifecycle events. Built according to industry standards for RESTful API architecture, it enforces relational integrity at both the application level and the database level using PostgreSQL foreign keys, unique constraints, and atomic transactions.

### Key Highlights
- **Normalized PostgreSQL Schema**: Student, Course, Enrollment, User, and RevokedToken models.
- **Relational Integrity**: Enforced foreign keys (`ON DELETE RESTRICT`) preventing accidental deletion of students or courses with historical academic records.
- **Role-Based Access Control (RBAC)**: Secure JWT authentication with strict `ADMIN` and `STAFF` permission boundaries.
- **Atomic Transactions**: Multi-step enrollment operations (checks, duplicate prevention, withdrawal reactivation) execute inside database transactions.
- **Defensive Input Validation**: Request schemas validated using Zod, preventing mass assignment and malformed payloads.
- **Production-Grade Security**: HTTP headers via Helmet, configurable CORS, express-rate-limit protection on authentication endpoints, and bcrypt password hashing.
- **Comprehensive API Documentation**: Interactive Swagger UI at `/api-docs` conforming to OpenAPI 3.0.3, plus an importable Postman collection.
- **Automated Testing Suite**: 68 unit and integration tests covering positive, negative, and edge-case scenarios with Jest and Supertest.

---

## 2. Technology Stack

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Runtime** | Node.js | v25.x (ES Modules) | High-performance asynchronous JavaScript engine |
| **Framework** | Express.js | ^4.21.2 | Modular HTTP router and middleware pipeline |
| **Database** | PostgreSQL | 14+ | Relational data persistence with ACID constraints |
| **ORM** | Prisma | ^6.4.1 | Type-safe schema definition, migrations, and query generation |
| **Authentication** | JSON Web Tokens (`jsonwebtoken`) | ^9.0.2 | Stateless Bearer token authentication with JTI revocation |
| **Hashing** | `bcryptjs` | ^3.0.3 | Secure adaptive salt-and-hash password protection |
| **Validation** | `zod` | ^3.24.2 | Schema parsing and validation for request parameters, bodies, and queries |
| **Security Headers** | `helmet` | ^8.0.0 | Secures HTTP headers against MIME-sniffing, XSS, and clickjacking |
| **CORS** | `cors` | ^2.8.5 | Cross-origin resource sharing configuration |
| **Rate Limiter** | `express-rate-limit` | ^7.5.0 | Request throttling against brute-force authentication attacks |
| **Documentation** | Swagger UI (`swagger-ui-express`, `yamljs`) | ^5.0.1 | OpenAPI 3.0 interactive documentation dashboard |
| **Testing** | Jest & Supertest | ^29.7.0 / ^7.0.0 | Unit and HTTP integration test runner |
| **Development** | Nodemon | ^3.1.9 | File watcher and live server reload |

---

## 3. PostgreSQL Database Design

The relational database uses a normalized third-normal-form (3NF) architecture with Prisma ORM:

```
┌─────────────────────────┐             ┌─────────────────────────┐
│        students         │             │         courses         │
├─────────────────────────┤             ├─────────────────────────┤
│ id (UUID, PK)           │ 1         * │ id (UUID, PK)           │
│ studentCode (VARCHAR, U)│───┐     ┌───│ courseCode (VARCHAR, U) │
│ firstName (VARCHAR)     │   │     │   │ title (VARCHAR)         │
│ lastName (VARCHAR)      │   │     │   │ description (TEXT)      │
│ email (VARCHAR, U)      │   │     │   │ department (VARCHAR)    │
│ phone (VARCHAR)         │   │     │   │ credits (INT)           │
│ dateOfBirth (TIMESTAMP) │   │     │   │ instructor (VARCHAR)    │
│ gender (VARCHAR)        │   │     │   │ status (CourseStatus)   │
│ address (TEXT)          │   │     │   │ createdAt (TIMESTAMP)   │
│ status (StudentStatus)  │   │     │   │ updatedAt (TIMESTAMP)   │
│ createdAt (TIMESTAMP)   │   │     │   └─────────────────────────┘
│ updatedAt (TIMESTAMP)   │   │     │                1
└─────────────────────────┘   │     │                │
                              │     │                │
                              ▼     ▼                *
                 ┌──────────────────────────────────────┐
                 │             enrollments              │
                 ├──────────────────────────────────────┤
                 │ id (UUID, PK)                        │
                 │ studentId (UUID, FK -> students.id)  │
                 │ courseId (UUID, FK -> courses.id)    │
                 │ enrollmentDate (TIMESTAMP)           │
                 │ status (EnrollmentStatus)            │
                 │ grade (DOUBLE PRECISION)             │
                 │ createdAt (TIMESTAMP)                │
                 │ updatedAt (TIMESTAMP)                │
                 ├──────────────────────────────────────┤
                 │ UNIQUE (studentId, courseId)         │
                 └──────────────────────────────────────┘
```

### Models and Relational Constraints

#### A. Student (`students`)
- `id`: UUID Primary Key.
- `studentCode`: Unique, uppercase string identifier (e.g., `CS2026-001`).
- `firstName`, `lastName`: Required text strings.
- `email`: Normalized lowercase unique email.
- `phone`, `dateOfBirth`, `gender`, `address`: Optional contact details.
- `status`: Enum (`ACTIVE`, `INACTIVE`), defaults to `ACTIVE`.
- **Integrity Rule**: Foreign key constraint prevents deleting any student who has records in `enrollments`. Setting `status = 'INACTIVE'` is the supported safe deactivation method.

#### B. Course (`courses`)
- `id`: UUID Primary Key.
- `courseCode`: Unique alphanumeric uppercase course code (e.g., `CS301`).
- `title`: Required course title.
- `department`: Academic department.
- `credits`: Integer credit weight between 1 and 10.
- `instructor`: Assigned faculty instructor.
- `status`: Enum (`ACTIVE`, `INACTIVE`), defaults to `ACTIVE`.
- **Integrity Rule**: Courses with historical or active student enrollments cannot be deleted; setting `status = 'INACTIVE'` retires the course while preserving enrollment history.

#### C. Enrollment (`enrollments`)
- Represents the many-to-many relationship between `Student` and `Course`.
- `studentId`: Foreign Key references `students(id)` with `ON DELETE RESTRICT`.
- `courseId`: Foreign Key references `courses(id)` with `ON DELETE RESTRICT`.
- `enrollmentDate`: Timestamp of enrollment.
- `status`: Enum (`ENROLLED`, `COMPLETED`, `WITHDRAWN`).
- `grade`: Optional numeric score between `0.0` and `100.0`.
- **Constraint**: `@@unique([studentId, courseId])` guarantees that a student cannot have duplicate concurrent enrollment records for the same course.
- **Re-enrollment Policy**: If a student who previously `WITHDRAWN` from a course re-enrolls, the system reactivates the existing record rather than failing or creating duplicate records.

#### D. User (`users`)
- Administrative and staff portal accounts.
- `email`: Unique normalized email address.
- `passwordHash`: Bcrypt-hashed password. Never exposed in API responses.
- `role`: Enum (`ADMIN`, `STAFF`). Public registration always creates `STAFF`.

#### E. RevokedToken (`revoked_tokens`)
- Persistent token blocklist storing JWT IDs (`tokenId`/`jti`) and expiration timestamps.
- Explicitly validated on each request; tokens invalidated upon logout cannot be reused.

---

## 4. Role-Based Access Control (RBAC)

| Resource / Endpoint | Method | Permitted Roles | Notes |
| :--- | :--- | :--- | :--- |
| `/api/v1/health` | `GET` | Public | Unrestricted health monitoring |
| `/api/v1/auth/register` | `POST` | Public | Registers `STAFF` account; escalation to `ADMIN` rejected |
| `/api/v1/auth/login` | `POST` | Public | Rate-limited authentication |
| `/api/v1/auth/me` | `GET` | `ADMIN`, `STAFF` | Requires Bearer token |
| `/api/v1/auth/logout` | `POST` | `ADMIN`, `STAFF` | Revokes current JWT identifier |
| `/api/v1/students` | `GET`, `POST` | `ADMIN`, `STAFF` | Create and view student records |
| `/api/v1/students/:id` | `GET`, `PATCH` | `ADMIN`, `STAFF` | View and update student details |
| `/api/v1/students/:id` | `DELETE` | **`ADMIN` Only** | Prohibited (409) if student has enrollments |
| `/api/v1/students/:id/enrollments`| `GET` | `ADMIN`, `STAFF` | View student course history |
| `/api/v1/courses` | `GET` | `ADMIN`, `STAFF` | View course catalog |
| `/api/v1/courses` | `POST` | **`ADMIN` Only** | Add new courses to catalog |
| `/api/v1/courses/:id` | `PATCH` | `ADMIN`, `STAFF` | Update course details |
| `/api/v1/courses/:id` | `DELETE` | **`ADMIN` Only** | Prohibited (409) if course has enrollments |
| `/api/v1/courses/:id/students` | `GET` | `ADMIN`, `STAFF` | View enrolled students |
| `/api/v1/enrollments` | `POST` | `ADMIN`, `STAFF` | Enroll student in active course |
| `/api/v1/enrollments` | `GET` | `ADMIN`, `STAFF` | Filter & paginate enrollments |
| `/api/v1/enrollments/:id` | `GET`, `PATCH` | `ADMIN`, `STAFF` | View & update status/grades |
| `/api/v1/enrollments/:id` | `DELETE` | **`ADMIN` Only** | Delete enrollment record |

---

## 5. Prerequisites

Before running the backend, ensure your environment has:
- **Node.js**: Version 18.x, 20.x, or 25.x (`node -v`)
- **npm**: Version 9.x or higher (`npm -v`)
- **PostgreSQL**: Version 14, 15, or 16 installed locally or hosted remotely

---

## 6. Installation & Setup Instructions

### Step 1: Navigate to Project Directory
```powershell
cd C:\MajorProject\codsoft_tasks\student-record-management-api
```

### Step 2: Install Dependencies
```powershell
npm install
```

### Step 3: Configure Environment Variables
Copy the `.env.example` file to `.env`:
```powershell
copy .env.example .env
```

Edit `.env` to match your local PostgreSQL configuration:
```env
PORT=5001
NODE_ENV=development
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/student_record_management?schema=public
DATABASE_URL_TEST=postgresql://postgres:your_password@localhost:5432/student_record_management_test?schema=public
JWT_SECRET=super_secret_jwt_key_at_least_32_characters_long_123456
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=10
CORS_ORIGIN=http://localhost:3000
ADMIN_NAME=System Administrator
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin@SecurePassword123!
```

> **Note**: Port `5001` is configured by default so this project runs alongside other tasks without port collisions.

### Step 4: Create PostgreSQL Database
In PostgreSQL (`psql` or pgAdmin):
```sql
CREATE DATABASE student_record_management;
CREATE DATABASE student_record_management_test;
```

### Step 5: Generate Prisma Client & Apply Migrations
```powershell
# Generate Prisma Client
npm run prisma:generate

# Apply database migration
npm run prisma:deploy
```

### Step 6: Seed Default Administrator Account
Execute the idempotent seed script to create the initial admin account:
```powershell
npm run seed
```
This script reads credentials from `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `.env` and safely updates or creates the account without creating duplicate records.

### Complete One-Step Database Setup
Alternatively, run the combined setup script:
```powershell
npm run db:setup
```

---

## 7. Running the Application

### Start Development Server (with Auto-Reload)
```powershell
npm run dev
```

### Start Production Server
```powershell
npm start
```

When started, the API outputs:
```
====================================================
Student Record Management API (CodSoft Task 1)
Environment : development
Server URL  : http://localhost:5001
API Base    : http://localhost:5001/api/v1
Swagger Docs: http://localhost:5001/api-docs
Health Check: http://localhost:5001/api/v1/health
====================================================
```

---

## 8. Interactive API Documentation (Swagger UI)

Once the server is running, open your browser to:
[http://localhost:5001/api-docs](http://localhost:5001/api-docs)

The interactive Swagger UI lets you:
- Inspect request schemas and response formats.
- View validation requirements and status codes.
- Authorize requests directly using your Bearer JWT token.
- Execute live API calls directly from your browser.

---

## 9. Postman Collection

An importable Postman collection is included in:
`postman/student-record-api.postman_collection.json`

### Import Instructions
1. Open **Postman**.
2. Click **Import** in the upper left.
3. Select `student-record-api.postman_collection.json`.
4. The collection is configured with automated test scripts:
   - Calling **Login as Admin** automatically stores `adminToken`.
   - Calling **Register Staff Account** automatically stores `staffToken`.
   - Creating a Student, Course, or Enrollment automatically stores their UUIDs for subsequent test requests.

---

## 10. Automated Testing

The project includes unit and integration tests powered by **Jest** and **Supertest**:
- **Unit Tests**: Query parameter parsers, sorting tie-breakers, pagination metadata, Zod schemas, JWT generation, and password hashing.
- **Integration Tests**: Supertest HTTP calls verifying registration, login, logout, token revocation, Student CRUD, Course CRUD, and transactional Enrollment rules.

### Run All Tests
```powershell
npm test
```

### Run Unit Tests Only
```powershell
npm run test:unit
```

### Run Integration Tests Only
```powershell
npm run test:integration
```

---

## 11. API Endpoints & Usage Examples

### 1. Health Check
`GET /api/v1/health`

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Student Record Management API is healthy",
  "data": {
    "status": "UP",
    "timestamp": "2026-11-01T02:40:00.000Z",
    "uptimeSeconds": 45,
    "environment": "development",
    "database": {
      "type": "PostgreSQL",
      "connected": true
    }
  }
}
```

---

### 2. Authentication

#### Register Staff Account
`POST /api/v1/auth/register`

**Request Body:**
```json
{
  "name": "Jane Staff",
  "email": "jane.staff@example.com",
  "password": "Password123!"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "7b58c701-a1b2-4c3d-8e4f-5a6b7c8d9e0f",
      "name": "Jane Staff",
      "email": "jane.staff@example.com",
      "role": "STAFF",
      "createdAt": "2026-11-01T02:41:00.000Z",
      "updatedAt": "2026-11-01T02:41:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### User Login
`POST /api/v1/auth/login`

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "Admin@SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "a0000000-0000-0000-0000-000000000001",
      "name": "System Administrator",
      "email": "admin@example.com",
      "role": "ADMIN"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 3. Students

#### Create Student
`POST /api/v1/students`  
*Headers*: `Authorization: Bearer <TOKEN>`

**Request Body:**
```json
{
  "studentCode": "CS2026-001",
  "firstName": "Avishek",
  "lastName": "Kumar",
  "email": "avishek.kumar@example.com",
  "phone": "+91-9876543210",
  "dateOfBirth": "2002-05-15T00:00:00.000Z",
  "gender": "Male",
  "address": "Sector 62, Noida, UP, India",
  "status": "ACTIVE"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Student record created successfully",
  "data": {
    "id": "c1f72b53-4e89-4a92-963d-0b73c4e36512",
    "studentCode": "CS2026-001",
    "firstName": "Avishek",
    "lastName": "Kumar",
    "email": "avishek.kumar@example.com",
    "phone": "+91-9876543210",
    "dateOfBirth": "2002-05-15T00:00:00.000Z",
    "gender": "Male",
    "address": "Sector 62, Noida, UP, India",
    "status": "ACTIVE",
    "createdAt": "2026-11-01T02:42:00.000Z",
    "updatedAt": "2026-11-01T02:42:00.000Z"
  }
}
```

#### Search, Filter, Sort & Paginate Students
`GET /api/v1/students?page=1&limit=10&search=avishek&status=ACTIVE&sort=createdAt&order=desc`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Students retrieved successfully",
  "data": {
    "items": [
      {
        "id": "c1f72b53-4e89-4a92-963d-0b73c4e36512",
        "studentCode": "CS2026-001",
        "firstName": "Avishek",
        "lastName": "Kumar",
        "email": "avishek.kumar@example.com",
        "status": "ACTIVE",
        "_count": {
          "enrollments": 1
        }
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

#### Safe Deletion Protection (Referential Integrity)
`DELETE /api/v1/students/:id`  
If the student has dependent enrollment records, the API rejects deletion with a `409 Conflict`:

**Response (409 Conflict):**
```json
{
  "success": false,
  "message": "Cannot delete student 'CS2026-001': record has 1 dependent enrollment(s). To preserve historical academic records, deactivate the student by setting status to INACTIVE instead.",
  "errors": [
    "Cannot delete student 'CS2026-001': record has 1 dependent enrollment(s). To preserve historical academic records, deactivate the student by setting status to INACTIVE instead."
  ]
}
```

---

### 4. Courses

#### Create Course (Admin Only)
`POST /api/v1/courses`

**Request Body:**
```json
{
  "courseCode": "CS301",
  "title": "Database Management Systems",
  "description": "Relational schema design, SQL, normalization, and transactions",
  "department": "Computer Science",
  "credits": 4,
  "instructor": "Dr. Alan Turing",
  "status": "ACTIVE"
}
```

---

### 5. Enrollments

#### Enroll Student in Course
`POST /api/v1/enrollments`

**Request Body:**
```json
{
  "studentId": "c1f72b53-4e89-4a92-963d-0b73c4e36512",
  "courseId": "f2a83c74-5e90-4b81-872e-1c84d5e47623",
  "status": "ENROLLED"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Student enrolled successfully",
  "data": {
    "id": "d3b94e85-6f01-4c92-983f-2d95e6f58734",
    "studentId": "c1f72b53-4e89-4a92-963d-0b73c4e36512",
    "courseId": "f2a83c74-5e90-4b81-872e-1c84d5e47623",
    "status": "ENROLLED",
    "grade": null,
    "enrollmentDate": "2026-11-01T02:43:00.000Z",
    "student": {
      "id": "c1f72b53-4e89-4a92-963d-0b73c4e36512",
      "studentCode": "CS2026-001",
      "firstName": "Avishek",
      "lastName": "Kumar",
      "email": "avishek.kumar@example.com",
      "status": "ACTIVE"
    },
    "course": {
      "id": "f2a83c74-5e90-4b81-872e-1c84d5e47623",
      "courseCode": "CS301",
      "title": "Database Management Systems",
      "department": "Computer Science",
      "credits": 4,
      "status": "ACTIVE"
    }
  }
}
```

#### Update Grade / Status
`PATCH /api/v1/enrollments/:id`

**Request Body:**
```json
{
  "status": "COMPLETED",
  "grade": 92.5
}
```

---

## 12. Standard HTTP Status Codes

| Code | Reason | Meaning |
| :--- | :--- | :--- |
| `200 OK` | Success | Record(s) retrieved or updated successfully |
| `201 Created` | Created | Resource successfully created or re-activated |
| `204 No Content` | Deleted | Resource deleted successfully; empty body |
| `400 Bad Request` | Client Error | Malformed syntax, invalid UUID, or business rule failure (e.g., enrolling inactive student) |
| `401 Unauthorized`| Auth Error | Missing, invalid, expired, or revoked JWT Bearer token |
| `403 Forbidden` | RBAC Error | Authenticated user lacks required permissions (e.g. non-admin attempting course creation) |
| `404 Not Found` | Not Found | Resource with the requested ID does not exist |
| `409 Conflict` | Conflict | Duplicate student code, duplicate email, active duplicate enrollment, or prohibited deletion |
| `429 Too Many Requests` | Throttled | Exceeded authentication rate limiter |
| `500 Server Error` | Internal | Unhandled server error (details masked in production) |

---

## 13. Project Structure

```
student-record-management-api/
├── docs/
│   └── openapi.yaml           # OpenAPI 3.0.3 specification
├── postman/
│   └── student-record-api.postman_collection.json # Postman collection
├── prisma/
│   ├── migrations/
│   │   └── 20261101000000_init/
│   │       └── migration.sql  # Initial PostgreSQL migration
│   ├── schema.prisma          # Prisma schema definition
│   └── seed.js                # Idempotent administrator seed script
├── src/
│   ├── config/
│   │   ├── db.js              # Prisma Client & connection pool
│   │   ├── env.js             # Zod environment validation
│   │   └── testDb.js          # In-memory database simulator for automated tests
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── course.controller.js
│   │   ├── enrollment.controller.js
│   │   └── student.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js # Bearer token verification & revocation check
│   │   ├── error.middleware.js# Centralized error handler
│   │   ├── notFound.middleware.js
│   │   ├── role.middleware.js # Role-based access control (ADMIN/STAFF)
│   │   └── validate.middleware.js # Zod request validation
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── course.routes.js
│   │   ├── enrollment.routes.js
│   │   ├── health.routes.js
│   │   ├── index.js           # API route aggregator (/api/v1)
│   │   └── student.routes.js
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── course.service.js
│   │   ├── enrollment.service.js
│   │   └── student.service.js
│   ├── utils/
│   │   ├── apiError.js        # Standard ApiError class
│   │   ├── apiResponse.js     # Standard ApiResponse formatter
│   │   ├── asyncHandler.js    # Promise error wrapper
│   │   └── queryUtils.js      # Pagination, sorting & filtering helpers
│   ├── app.js                 # Express application setup
│   └── server.js              # HTTP server entry point
├── tests/
│   ├── integration/
│   │   ├── auth.test.js
│   │   ├── course.test.js
│   │   ├── enrollment.test.js
│   │   └── student.test.js
│   ├── unit/
│   │   ├── auth.service.test.js
│   │   ├── queryUtils.test.js
│   │   └── validators.test.js
│   └── testHelper.js          # Test fixtures and token generators
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 14. Troubleshooting

### 1. Database Connection Refused (`ECONNREFUSED 127.0.0.1:5432`)
- Ensure PostgreSQL service is started:
  ```powershell
  # Windows Services
  Start-Service postgresql*
  ```
- Verify credentials, username, and database name in `.env`.

### 2. Port Conflict (`EADDRINUSE: port 5001 already in use`)
- Change `PORT=5002` in `.env`.
- Or terminate the existing process occupying port 5001.

### 3. Prisma Schema Changed
If you modify `prisma/schema.prisma`:
```powershell
npm run prisma:generate
npx prisma migrate dev --name <migration_name>
```

---

## 15. License & Evaluation Note

Developed for the **CodSoft Backend Development Internship (Task 1: Student Record Management System)**.  
Follows modern Node.js backend engineering practices, clean architecture, RESTful standards, and PostgreSQL referential integrity.
