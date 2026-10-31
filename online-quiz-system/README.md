# Online Quiz System Backend REST API

**CodSoft Internship — Backend Development (Task 5)**  
*Developed with Node.js, Express.js, MongoDB, Mongoose, and Zod.*

---

## 1. Project Overview & Features

The **Online Quiz System Backend API** is a secure, production-grade RESTful API designed to manage and conduct online quizzes with automated server-side evaluation, timer enforcement, question randomization, leaderboards, and detailed analytics.

### Key Features
- **Role-Based Access Control (RBAC):** Distinct roles for `admin` (management) and `participant` (quiz taking).
- **Administrative Quiz & Question Control:** Admins create draft quizzes, attach questions, configure scoring parameters, and publish once validated.
- **Server-Side Scoring Engine:** Automatic evaluation accounting for custom marks per question, negative marking, question counts, and percentage calculations clamped safely at zero.
- **Timer Enforcement:** Server-tracked timestamps enforce quiz deadlines; late answer submissions are rejected, and expired attempts are finalized automatically.
- **Question Randomization:** Generates an isolated Fisher-Yates shuffled question order per participant attempt without mutating the base quiz.
- **Data Privacy & Anti-Cheating:** Answer keys (`isCorrect`) are strictly stripped from all participant responses during attempts and quiz listings.
- **Certificate Eligibility:** Result persistence flags certificate eligibility dynamically based on the configured pass percentage threshold.
- **Real-Time Leaderboard & Tie-Breaking:** Fast, paginated leaderboards ordered by higher score, lower completion time, and earlier submission time. Participant privacy is preserved (no emails or passwords leaked).
- **Aggregated Analytics:**
  - *Admin Quiz Stats:* Attempt counts, unique participants, average/high/low scores, pass rates.
  - *Participant Stats:* Completed quizzes, pass rate, average score, and recent exam history.
- **Interactive Documentation:** OpenAPI 3.0 specification served via Swagger UI at `/api-docs`.
- **Pre-configured Postman Collection:** Ready-to-import Postman collection with automated token extraction and test scripts.

---

## 2. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Runtime** | Node.js (v18+) | Server-side JavaScript execution (ES Modules) |
| **Framework** | Express.js (v4.x) | Minimalist web and REST API routing framework |
| **Database** | MongoDB & Mongoose (v8.x) | Document database & Object Data Modeling (ODM) |
| **Security** | Helmet, CORS, express-rate-limit | HTTP header hardening, cross-origin control, and IP rate limiting |
| **Auth** | JSON Web Tokens (JWT) & bcryptjs | Stateless Bearer authentication & password hashing |
| **Validation** | Zod (v3.x) | Strict schema validation for request bodies, params, and queries |
| **Documentation** | Swagger UI Express & OpenAPI 3.0 | Interactive API documentation at `/api-docs` |
| **Testing** | Jest & Supertest | Automated unit and integration testing suite |

---

## 3. Architecture & Directory Structure

The project follows a clean separation of concerns:

```
online-quiz-system/
├── docs/
│   └── openapi.yaml           # OpenAPI 3.0 API Specification
├── postman/
│   └── online-quiz-api.postman_collection.json # Automated Postman test collection
├── scripts/
│   └── seedAdmin.js           # Idempotent administrator creation script
├── src/
│   ├── config/
│   │   ├── db.js              # Mongoose database connection & lifecycle
│   │   └── env.js             # Environment variable validation & defaults
│   ├── controllers/
│   │   ├── auth.controller.js        # Registration, login, profile, logout
│   │   ├── quiz.controller.js        # Quiz CRUD, publish, filters
│   │   ├── question.controller.js    # Question CRUD & option verification
│   │   ├── attempt.controller.js     # Attempt lifecycle, answering, submission
│   │   ├── leaderboard.controller.js # Public rankings & tie-breakers
│   │   └── stats.controller.js       # Admin & personal performance analytics
│   ├── middleware/
│   │   ├── auth.middleware.js        # JWT Bearer token authentication & blacklist check
│   │   ├── role.middleware.js        # Role validation (admin vs participant)
│   │   ├── validate.middleware.js    # Zod request validator
│   │   ├── notFound.middleware.js    # 404 Route handler
│   │   └── error.middleware.js       # Centralized error handler & status mapper
│   ├── models/
│   │   ├── User.js            # Participant & Admin accounts
│   │   ├── Quiz.js            # Quiz rules, duration, status, and marks
│   │   ├── Question.js        # MCQ questions and answer choices
│   │   ├── QuizAttempt.js     # Participant attempts, question order, answers
│   │   ├── QuizResult.js      # Finalized scores, percentage, pass status
│   │   └── TokenBlocklist.js  # Revoked JWT tokens with MongoDB TTL auto-expiry
│   ├── routes/
│   │   ├── index.js           # Main router aggregator mounted at /api/v1
│   │   ├── auth.routes.js     # Authentication routes
│   │   ├── quiz.routes.js     # Quiz management routes
│   │   ├── question.routes.js # Question management routes
│   │   ├── attempt.routes.js  # Quiz taking & answer submission routes
│   │   ├── user.routes.js     # User profile and history routes
│   │   └── health.routes.js   # Health check & system status route
│   ├── services/
│   │   ├── quiz.service.js    # Attempt finalization & shuffling utilities
│   │   └── scoring.service.js # Pure evaluation logic & scoring calculations
│   ├── utils/
│   │   ├── apiError.js        # Structured error wrapper class
│   │   ├── apiResponse.js     # Standardized JSON response builder
│   │   └── asyncHandler.js    # Express async exception wrapper
│   ├── app.js                 # Express application initialization & middleware
│   └── server.js              # HTTP server startup & graceful shutdown
├── tests/
│   ├── testHelper.js          # In-memory / isolated test DB harness
│   ├── unit/
│   │   └── scoring.service.test.js # Comprehensive scoring engine tests
│   └── integration/
│       ├── auth.test.js       # Registration, login, and logout tests
│       ├── quiz.test.js       # Quiz & question administrative tests
│       ├── attempt.test.js    # Quiz attempt, privacy, and answering tests
│       └── leaderboard.test.js# Leaderboard ordering & analytics tests
├── .env.example               # Environment template
├── .gitignore
├── package.json
└── README.md
```

---

## 4. Prerequisites & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher (`node -v`)
- **npm**: v9.0.0 or higher (`npm -v`)
- **MongoDB**: Local MongoDB instance running on `mongodb://127.0.0.1:27017` or a MongoDB Atlas URI.

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Environment Configuration
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

Verify or configure your `.env` variables:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/online-quiz-system
JWT_SECRET=your_super_secret_jwt_key_min_32_characters_long
JWT_EXPIRES_IN=24h
BCRYPT_SALT_ROUNDS=10
CORS_ORIGIN=*

# Initial Administrator Credentials (used by seed:admin)
ADMIN_NAME="System Administrator"
ADMIN_EMAIL=admin@codsoft.quiz
ADMIN_PASSWORD=AdminSecurePassword123!
```

### 3. Seed Initial Administrator
Run the built-in seed script to create the initial admin account safely (this command is idempotent and will not create duplicate accounts):
```bash
npm run seed:admin
```

### 4. Running the Application
To run in development mode with auto-reload (Nodemon):
```bash
npm run dev
```

To run in production mode:
```bash
npm start
```

The server will start at `http://localhost:5000`.
- **Health Check:** `GET http://localhost:5000/api/v1/health`
- **Swagger Documentation:** `http://localhost:5000/api-docs`

---

## 5. Automated Tests

The test suite includes **22 automated tests** across 5 test suites covering unit logic and integration flows.

Run all tests:
```bash
npm test
```

### Test Coverage Highlights:
1. **Scoring Logic (`scoring.service.test.js`):**
   - 100% correct answers evaluation.
   - All wrong answers evaluation.
   - Unanswered questions calculation.
   - Negative marking deduction.
   - Floor clamping at 0 (prevents negative scores).
   - Exact boundary checks at `passPercentage`.
   - Division-by-zero protection.
2. **Authentication Flow (`auth.test.js`):**
   - Role enforcement (public registration always creates `participant`).
   - Duplicate email rejection (409 Conflict).
   - Password hashing and verification with bcrypt.
   - Token revocation upon logout (invalidates token on blocklist).
3. **Quiz & Question Integrity (`quiz.test.js`):**
   - Role protection (participants cannot create or publish quizzes).
   - Minimum 2 options and exactly 1 correct answer constraint.
   - Publishing validation (cannot publish a quiz with 0 questions).
   - Isolation (participants only see published quizzes).
4. **Attempt Flow & Anti-Cheating (`attempt.test.js`):**
   - Stripping of `isCorrect` from options in participant endpoints.
   - Attempt ownership check (Participant B cannot access or modify Participant A's attempt).
   - Idempotent submission (repeated submit returns existing result without altering score).
   - Rejection of answer edits after submission.
5. **Leaderboard & Analytics (`leaderboard.test.js`):**
   - Score ordering and tie-breaking.
   - Participant privacy verification (no email/password leakage).
   - Aggregated pass rates and average scores.

---

## 6. Authentication & Security Design

1. **Bearer Token Authentication:**
   - Every protected request requires an `Authorization: Bearer <JWT>` header.
   - JWT tokens include user ID, role, and expiration timestamp.
2. **Strict Role Separation:**
   - Public registration route `POST /api/v1/auth/register` creates `role: participant`. Any client-supplied `role` parameter is safely ignored.
   - Admin operations (`POST /api/v1/quizzes`, `POST /api/v1/quizzes/:id/questions`, etc.) are protected by `requireAdmin` middleware.
3. **Ownership Verification:**
   - Participants can only view, answer, and submit attempts they own. Accessing another participant's attempt yields `403 Forbidden`.
4. **Token Revocation (Logout):**
   - When `POST /api/v1/auth/logout` is called, the JWT token is stored in the `TokenBlocklist` collection with a MongoDB TTL index that expires automatically when the token reaches its `exp` time. Revoked tokens are immediately rejected by `auth.middleware.js`.
5. **Rate Limiting & Hardening:**
   - Express rate limiters protect authentication endpoints against brute-force attacks (max 30 requests per 15 minutes).
   - Helmet sets HTTP security headers and Express enforces a 100kb payload size limit against Denial-of-Service attacks.

---

## 7. Scoring Algorithm & Timer Rules

### Evaluation Formula
```
score = Math.max(0, (correctCount * marksPerQuestion) - (wrongCount * negativeMarks))
totalMarks = questionCount * marksPerQuestion
percentage = (score / totalMarks) * 100
unansweredCount = questionCount - correctCount - wrongCount
passed = percentage >= passPercentage
certificateEligible = passed
```

### Rounding & Clamping Policy:
- **Score:** Clamped at `0` if negative deductions exceed marks scored. Rounded to 2 decimal places.
- **Percentage:** Rounded to 2 decimal places (`(score / totalMarks) * 100`).
- **Pass Threshold:** A participant passes and qualifies for a certificate if their percentage is greater than or equal to the quiz's `passPercentage`.

### Timer Enforcement
- When an attempt starts, the server records `startedAt` (UTC).
- Deadline is calculated as `startedAt + (durationMinutes * 60 * 1000)`.
- When answers are submitted or questions are requested, the server checks if the current time exceeds the deadline (plus a 10-second grace window for network latency).
- Overdue attempts are automatically finalized and further answer updates are blocked with a `400 Bad Request`.

---

## 8. Complete API Endpoint Reference

All endpoints are prefixed with `/api/v1`.

### 1. System Health
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | Returns database connection state, uptime, and timestamp |

### 2. Authentication
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Public | Register a new participant account |
| `POST` | `/auth/login` | Public | Login with email and password |
| `GET` | `/auth/me` | Authenticated | Retrieve current user profile |
| `POST` | `/auth/logout` | Authenticated | Invalidate and revoke current JWT token |

### 3. Quiz Management
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/quizzes` | Admin | Create a new draft quiz |
| `GET` | `/quizzes` | Public / Auth | List quizzes with pagination, search, and status filter |
| `GET` | `/quizzes/:quizId` | Public / Auth | Retrieve quiz details and question count |
| `PATCH` | `/quizzes/:quizId` | Admin | Update quiz settings (restricted if attempts exist) |
| `DELETE` | `/quizzes/:quizId` | Admin | Delete draft quiz (blocked if attempts exist) |
| `PATCH` | `/quizzes/:quizId/publish` | Admin | Publish quiz (requires at least 1 question) |

### 4. Question Management
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/quizzes/:quizId/questions` | Admin | Add question with options and exactly 1 correct answer |
| `GET` | `/quizzes/:quizId/questions` | Admin | List all questions of a quiz with answer keys |
| `PATCH` | `/questions/:questionId` | Admin | Update question text or options |
| `DELETE` | `/questions/:questionId` | Admin | Delete question |

### 5. Quiz Taking & Answer Submission
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/quizzes/:quizId/attempts` | Participant | Start or resume a quiz attempt |
| `GET` | `/attempts/:attemptId/questions`| Participant (Owner) | Retrieve questions in assigned order (answers stripped) |
| `PATCH`| `/attempts/:attemptId/answers`  | Participant (Owner) | Save or update selected answers during active attempt |
| `POST` | `/attempts/:attemptId/submit`   | Participant (Owner) | Finalize attempt, evaluate score, and persist result |
| `GET`  | `/attempts/:attemptId/result`   | Participant / Admin | View finalized score, marks, percentage, and pass state |
| `GET`  | `/users/me/attempts`            | Participant | Paginated history of participant's attempts |

### 6. Leaderboards & Analytics
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/quizzes/:quizId/leaderboard` | Public / Auth | View ranked leaderboard (tie-broken by score & time) |
| `GET` | `/quizzes/:quizId/statistics`  | Admin | View aggregated attempts, average score, and pass rate |
| `GET` | `/users/me/statistics`         | Participant | View personal exam statistics, averages, and recent results |

---

## 9. Representative Request & Response Payloads

### 1. Register Participant
**`POST /api/v1/auth/register`**
```json
{
  "name": "Alex Johnson",
  "email": "alex@university.edu",
  "password": "SecurePassword123!"
}
```
**Response (`201 Created`):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "6ae62dfaccabbb2cd616bbec",
      "name": "Alex Johnson",
      "email": "alex@university.edu",
      "role": "participant",
      "createdAt": "2026-10-31T18:05:00.000Z",
      "updatedAt": "2026-10-31T18:05:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 2. Create Quiz (Admin)
**`POST /api/v1/quizzes`**
```json
{
  "title": "Computer Networks & Protocols",
  "description": "Assess OSI Model, TCP/IP, and routing concepts.",
  "durationMinutes": 20,
  "marksPerQuestion": 2,
  "negativeMarks": 0.5,
  "passPercentage": 60,
  "randomizeQuestions": true
}
```
**Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Quiz created successfully as draft",
  "data": {
    "quiz": {
      "_id": "6ae62dfaccabbb2cd616bbf0",
      "title": "Computer Networks & Protocols",
      "description": "Assess OSI Model, TCP/IP, and routing concepts.",
      "durationMinutes": 20,
      "marksPerQuestion": 2,
      "negativeMarks": 0.5,
      "passPercentage": 60,
      "randomizeQuestions": true,
      "status": "draft",
      "createdBy": "6ae62cf37efbf22486f772dc"
    },
    "questionCount": 0
  }
}
```

### 3. Add Question (Admin)
**`POST /api/v1/quizzes/:quizId/questions`**
```json
{
  "text": "Which layer of the OSI model handles end-to-end communication and reliability?",
  "options": [
    { "text": "Network Layer", "isCorrect": false },
    { "text": "Transport Layer", "isCorrect": true },
    { "text": "Data Link Layer", "isCorrect": false },
    { "text": "Session Layer", "isCorrect": false }
  ]
}
```

### 4. Participant Questions Retrieval (Anti-Cheating Check)
**`GET /api/v1/attempts/:attemptId/questions`**
```json
{
  "success": true,
  "message": "Attempt questions retrieved successfully",
  "data": {
    "attemptId": "6ae62dfaccabbb2cd616bc04",
    "quizTitle": "Computer Networks & Protocols",
    "durationMinutes": 20,
    "remainingSeconds": 1185,
    "questions": [
      {
        "_id": "6ae62dfaccabbb2cd616bbf2",
        "text": "Which layer of the OSI model handles end-to-end communication and reliability?",
        "options": [
          { "_id": "6ae62dfaccabbb2cd616bbf3", "text": "Network Layer" },
          { "_id": "6ae62dfaccabbb2cd616bbf4", "text": "Transport Layer" },
          { "_id": "6ae62dfaccabbb2cd616bbf5", "text": "Data Link Layer" },
          { "_id": "6ae62dfaccabbb2cd616bbf6", "text": "Session Layer" }
        ]
      }
    ]
  }
}
```
*(Notice: `isCorrect` is completely stripped to prevent inspect-element cheating).*

### 5. Finalized Result & Certificate Status
**`POST /api/v1/attempts/:attemptId/submit`**
```json
{
  "success": true,
  "message": "Quiz attempt submitted and evaluated successfully",
  "data": {
    "result": {
      "attemptId": "6ae62dfaccabbb2cd616bc04",
      "userId": "6ae62dfaccabbb2cd616bbec",
      "quizId": "6ae62dfaccabbb2cd616bbf0",
      "correctCount": 4,
      "wrongCount": 1,
      "unansweredCount": 0,
      "score": 7.5,
      "totalMarks": 10,
      "percentage": 75,
      "passed": true,
      "certificateEligible": true,
      "timeTakenSeconds": 485,
      "createdAt": "2026-10-31T18:15:00.000Z"
    }
  }
}
```

---

## 10. Postman Testing Guide

An importable Postman collection is included at `postman/online-quiz-api.postman_collection.json`.

### How to Import and Use:
1. Open **Postman**.
2. Click **Import** (top left) and select `postman/online-quiz-api.postman_collection.json`.
3. The collection is pre-configured with environment variables:
   - `baseUrl`: `http://localhost:5000/api/v1`
   - Automated test scripts automatically store `adminToken`, `participantToken`, `quizId`, `questionId`, and `attemptId` across requests.
4. Recommended test sequence:
   1. Run `Check Health Status` in `1. System Health`.
   2. Run `Login Administrator` in `2. Authentication`.
   3. Run `Create Draft Quiz [Admin]` in `3. Quiz Management`.
   4. Run `Add Question to Quiz` in `4. Question Management`.
   5. Run `Publish Quiz [Admin]` in `3. Quiz Management`.
   6. Run `Register Participant` in `2. Authentication`.
   7. Run `Start Quiz Attempt [Participant]` in `5. Attempts & Answer Submission`.
   8. Run `Get Attempt Questions [Answers Hidden]` to verify privacy.
   9. Run `Submit & Finalize Attempt`.
   10. Inspect results and rankings in `6. Leaderboards & Analytics`.

---

## 11. Defense & B.Tech Project Explanation Notes

When presenting this project for an internship or academic evaluation, highlight these architectural decisions:

1. **Why ES Modules (`"type": "module"`)?**
   Modern standard in JavaScript, matches modern Node.js best practices, enables native dynamic imports and cleaner syntax.
2. **How is Cheating Prevented?**
   Evaluation happens strictly on the backend. The client never receives correct answers until after submission. Score calculations, percentage formulas, and certificate eligibility are 100% computed on the server.
3. **How does Question Randomization Work without Altering the Quiz?**
   When an attempt starts, Fisher-Yates shuffling is applied only to the array of question IDs assigned to that specific `QuizAttempt.questionOrder`. The original `Question` documents and `Quiz` remain unchanged.
4. **How are Overdue Attempts Handled?**
   No brittle client-side timers. The attempt start timestamp `startedAt` is stored in MongoDB. Every answer save or submit action compares `Date.now()` with `startedAt + durationMinutes`. Overdue attempts are automatically finalized.
5. **How is Idempotency Maintained?**
   `QuizResult.attemptId` is defined with a unique index. Repeated clicks on the submit endpoint or network retries will return the existing finalized score rather than recalculating or double-counting attempts.
