# EventForge — Architecture & Design Decisions

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    React Client (Vite + Tailwind)                │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌───────────┐  │
│  │  Zustand  │  │ React Query  │  │ Router v6 │  │  Axios    │  │
│  │  (auth,   │  │ (server     │  │ (role     │  │  (interc- │  │
│  │   UI)     │  │  state)     │  │  guards)  │  │   eptors) │  │
│  └──────────┘  └──────────────┘  └───────────┘  └─────┬─────┘  │
└───────────────────────────────────────────────────────┼─────────┘
                                                        │ HTTP
┌───────────────────────────────────────────────────────┼─────────┐
│                    Express.js API Server               │         │
│  ┌─────────────────────────────────────────────────────┤         │
│  │ Middleware Pipeline:                                │         │
│  │  helmet → cors → rate-limit → body-parse →         │         │
│  │  mongo-sanitize → morgan → auth → RBAC             │         │
│  └─────────────────────────────────────────────────────┘         │
│  ┌──────────┐  ┌──────────────┐  ┌───────────┐  ┌───────────┐  │
│  │  Routes  │→ │ Controllers  │→ │ Services  │→ │  Models   │  │
│  │  (thin)  │  │  (thin)      │  │ (business │  │ (Mongoose)│  │
│  └──────────┘  └──────────────┘  │  logic)   │  └─────┬─────┘  │
│                                  └─────┬─────┘        │         │
│  ┌──────────┐  ┌──────────────┐        │              │         │
│  │ AI Svc   │  │ Email Svc    │        │              │         │
│  │ (Gemini/ │  │ (nodemailer  │  ┌─────┴─────┐        │         │
│  │  Mock)   │  │  stub)       │  │ Validators│        │         │
│  └──────────┘  └──────────────┘  │ (Zod)     │        │         │
│                                  └───────────┘        │         │
└───────────────────────────────────────────────────────┼─────────┘
                                                        │
┌───────────────────────────────────────────────────────┼─────────┐
│                       MongoDB 7                       │         │
│  Organizations, Users, Events, EventMemberships,      │         │
│  Sessions, Speakers, Sponsors, Registrations,         │         │
│  TicketCategories, Coupons, RefreshTokens, etc.       │         │
└─────────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Authentication & Token Strategy
- **Access tokens**: Short-lived JWTs (15 min), sent in httpOnly cookies.
- **Refresh tokens**: Stored **hashed** in a `RefreshToken` collection. Supports rotation (one-time use) and logout invalidation by deleting the record. Family-based revocation prevents token theft replay.
- **Password hashing**: bcrypt with salt rounds = 12.

### 2. Authorization Model
- **Global role** (`User.globalRole`): `admin` or `user`. Admins manage the platform.
- **Event-scoped roles** via `EventMembership`: `organizer`, `staff`, `speaker`, `sponsor`. Each membership links a user to an event with a specific role.
- **Attendee access**: Derived from having a `Registration` for the event — no EventMembership needed. This keeps the membership table lean (only operational roles) and allows attendees to register for multiple events naturally.
- **Middleware chain**: `requireAuth` → `requireRole(...)` or `requireEventRole(eventIdParam, ...roles)`.

### 3. Organization & Multi-Tenancy
- Every Event, Venue belongs to an Organization.
- Organization-scoped queries enforce tenant isolation (e.g., `Event.find({ organization: req.user.organization })`).
- **Subscription limits** enforced at the service layer:
  - `maxEvents`: checked on event creation.
  - `maxAttendees`: checked on registration.
  - Returns clear `403` errors when limits are exceeded.

### 4. Registration & Payment Tracking
- `Registration.paymentStatus`: `unpaid | paid | free | refunded`.
- Organizers can "mark as paid" to track revenue accurately without a payment gateway.
- Revenue analytics aggregates `amountPaid` only for `paid` and `free` registrations.

### 5. Invite Flow
- Organizers invite speakers, sponsors, and staff by email.
- Creates an `EventMembership` immediately with a pending state.
- Sends an email (stub) with an invite link containing a signed token.
- The invitee can register/set a password and link their account via the invite token.

### 6. Dates & Timezone Handling
- **All dates stored in UTC** in MongoDB (native `Date` type).
- **Event.timezone**: IANA timezone string (e.g., `America/New_York`) for display purposes only.
- **Conflict detection** compares UTC values — no timezone conversion during validation.
- Client handles display conversion using the event's timezone.

### 7. File Upload Security
- Uploaded files stored in `/uploads` directory (not served as static files).
- **Authenticated routes** serve sponsor assets, speaker materials, and other protected files.
- `multer` enforces file type whitelist and size limits (10 MB default).
- Files streamed through Express with proper auth checks.

### 8. AI Service Layer
- Provider-agnostic: supports Gemini, Anthropic, or mock (via `AI_PROVIDER` env var).
- **Mock/fallback** returns deterministic canned responses — all features work without an API key.
- `AIAuditLog` captures: user, feature, prompt metadata (not raw prompts), output summary, provider, latency, status.
- Rate-limited separately from other endpoints.

### 9. API Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "message": "Description of the result",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### 10. Error Response Format
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```
Status codes: 400 (validation), 401 (unauthenticated), 403 (unauthorized / limit exceeded), 404 (not found), 409 (conflict), 429 (rate limit), 500 (server error). No stack traces in production.
