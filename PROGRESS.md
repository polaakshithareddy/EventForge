# EventForge — Progress Tracker

## Approved Design Changes (from plan review)
1. **`Registration.paymentStatus`** added: `unpaid | paid | free | refunded`. Organizer "mark as paid" action for accurate revenue analytics. No payment gateway.
2. **RefreshToken collection**: Refresh tokens stored hashed with rotation and logout invalidation support.
3. **Attendee access via Registration**: Attendees access events through a `Registration` record, NOT `EventMembership`. Only organizer, staff, speaker, and sponsor use `EventMembership`.
4. **Invite flow**: Organizers invite speakers, sponsors, and staff by email. Creates `EventMembership` + sends invite link (email stub). Invitee registers/links account via signed token.
5. **Organization subscription limits**: `maxEvents` enforced on event creation, `maxAttendees` enforced on registration. Clear 403 errors.
6. **UTC dates everywhere**: All dates stored in UTC. Conflict detection compares UTC values. `Event.timezone` is for display only.
7. **Authenticated file serving**: Sponsor assets and speaker materials served through authenticated routes, not static files.
8. **Public pages in Phase 2**: Public landing page and public event list/detail pages (no auth) added to Phase 2 scope.

---

## Phase 0 — Scaffold & Foundation ✅

**Status:** Complete  
**Date:** 2026-09-24

### What was built
- Monorepo structure with `/server` and `/client`
- Full tooling: ESLint (flat config), Prettier, Jest (server), Vitest (client)
- Express.js API with production middleware stack (helmet, cors, rate-limit, mongo-sanitize, morgan)
- MongoDB connection with retry logic (5 retries, 5s delay)
- Custom `AppError` class hierarchy (NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, ValidationError, RateLimitError)
- Async handler wrapper for clean error propagation
- Global error handler (Mongoose, JWT, duplicate key errors → proper HTTP status codes)
- Rate limiters: general (100/15min), auth (20/15min), AI (30/15min)
- Health endpoint: `GET /api/v1/health` — returns status, uptime, MongoDB connection state, environment
- React app (Vite): Tailwind CSS, React Router v6, Zustand stores, React Query, Axios client with refresh interceptor
- Landing page with hero, features section, CTA
- 404 page
- Docker Compose (mongo + api + client) with Dockerfiles and nginx config
- Architecture docs and ERD in `/docs`

### Files created

#### Root
- `.gitignore`
- `docker-compose.yml`
- `README.md`
- `PROGRESS.md`
- `docs/architecture.md`

#### Server (`/server`)
- `package.json` — ES modules, all dependencies (bcryptjs, express, mongoose, jwt, zod, etc.)
- `.env.example` — all env vars documented
- `eslint.config.js` — flat ESLint config for Node
- `.prettierrc.json`
- `jest.config.js` — ESM support with experimental VM modules
- `Dockerfile`
- `src/config/env.js` — centralized env var loading
- `src/config/db.js` — MongoDB connection with retry
- `src/utils/AppError.js` — error class hierarchy
- `src/middleware/asyncHandler.js` — async route wrapper
- `src/middleware/errorHandler.js` — global error middleware
- `src/middleware/rateLimiter.js` — rate limit configs
- `src/routes/index.js` — route aggregator
- `src/routes/health.routes.js` — health check endpoint
- `src/app.js` — Express app configuration
- `src/server.js` — server entry point with graceful shutdown
- `src/tests/health.test.js` — health endpoint + 404 + error handling tests
- `src/tests/download-mongo.js` — helper to pre-download MongoDB binary

#### Client (`/client`)
- `package.json` — React, Vite, Tailwind, Zustand, React Query, etc.
- `.env.example`
- `vite.config.js` — with API proxy and Vitest config
- `tailwind.config.js` — custom primary color palette
- `postcss.config.js`
- `index.html`
- `eslint.config.js` — React-specific ESLint
- `.prettierrc.json`
- `Dockerfile` — multi-stage build with nginx
- `nginx.conf` — SPA routing + API proxy
- `public/vite.svg` — favicon
- `src/main.jsx` — app entry with providers (QueryClient, Router, Toaster)
- `src/App.jsx` — root component
- `src/index.css` — Tailwind directives + component classes (btn-primary, btn-secondary, input-field, card)
- `src/routes/index.jsx` — route definitions
- `src/layouts/MainLayout.jsx` — header + main + footer layout
- `src/pages/HomePage.jsx` — landing page (hero, features, CTA)
- `src/pages/NotFoundPage.jsx` — 404 page
- `src/api/client.js` — Axios instance with refresh token interceptor
- `src/store/authStore.js` — Zustand auth state
- `src/store/uiStore.js` — Zustand UI state
- `src/tests/setup.js` — test setup (jest-dom)
- `src/tests/App.test.jsx` — 4 tests (homepage render, hero, features, nav)

### API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Health check (status, uptime, MongoDB state) |

### Test Results
- **Client:** ✅ 4/4 tests passing (Vitest)
- **Server:** ✅ 6/6 tests passing (Jest) — requires MongoDB binary download on first run (~600MB, cached after)

### How to run
```bash
# Server
cd server
cp .env.example .env
npm install
npm run dev          # starts on :5000

# Client
cd client
cp .env.example .env
npm install
npm run dev          # starts on :5173

# Tests
cd server && npm test
cd client && npm test

# Docker (full stack)
docker-compose up --build
```

### Key decisions
- **bcryptjs** instead of bcrypt (pure JS, no native compilation needed on Windows)
- **Zustand + React Query** for state management (lighter than Redux Toolkit)
- **Tailwind v3** for stable, well-documented CSS utility framework
- **Jest with `--experimental-vm-modules`** for ESM support in server tests
- **mongodb-memory-server** timeout set to 120s in beforeAll for first-run binary download

---

## Phase 1 — Auth & RBAC ✅

**Status:** Complete  
**Date:** 2026-09-24

### What was built
- **Models**: `User`, `Organization`, `RefreshToken`, `EventMembership`
- **Auth Service**: Registration, Login, Logout, and Token Refresh using hashed refresh tokens in the database and rotation/family invalidation for token reuse protection.
- **Middleware**: `requireAuth`, `requireRole` (global RBAC), `requireEventRole` (event-scoped RBAC), `validate` (Zod integration)
- **Controllers & Routes**: 
  - `auth`: `/register`, `/login`, `/refresh`, `/logout`, `/me`
  - `admin`: CRUD endpoints for Users and Organizations
- **Frontend**: 
  - `authStore` configured with Zustand.
  - `LoginPage` and `RegisterPage` with form validation (React Hook Form + Zod).
  - `ProtectedRoute` wrapper component for authenticated routing.
  - Basic `DashboardPage` scaffolding.

### Test Results
- **Server:** 13/13 tests passing, covering auth flows (register, duplicate prevention, login, refresh, profile fetch, logout).
- **Client:** All Vite builds and lint tests passing.

---

## Phase 2 — Events & Venues ✅

**Status:** Complete  
**Date:** 2026-09-24

### What was built
- **Models**: `Venue` (org-scoped, address, capacity, amenities) and `Event` (UTC dates, ticket tiers, sessions, multi-tenant org scoping, slug generation, virtual options).
- **Organization Subscription Enforcement**: Enforced `maxEvents` on event creation with 403 Forbidden and clear error message (User-approved change #5).
- **UTC Venue Conflict Detection**: Accurate detection preventing double-booking of physical venues during overlapping UTC time intervals, returning 409 Conflict (User-approved change #6).
- **Event Roles & Membership**: Creator automatically assigned `organizer` role via `EventMembership`. Role-scoped permissions on sessions and event editing (User-approved change #3).
- **Team Invites**: Organizer invite flow via email stub for speakers, staff, and sponsors creating `EventMembership` records (User-approved change #4).
- **Public Event Discovery**: Public event directory (`GET /api/v1/events/public`) and detail views (`GET /api/v1/events/public/:slug`) requiring no authentication (User-approved change #8).
- **Frontend Pages & Features**:
  - `PublicEventsPage`: Search, category/type filter, city filter, responsive event cards, ticket price displays, and pagination.
  - `PublicEventDetailPage`: Event hero, tabs for Overview, Agenda/Schedule, and Venue Information, ticket tiers display, registration CTA.
  - `DashboardPage`: Metrics (Total Events, Published, Active Venues), event table with status badges and quick actions.
  - `EventWizardPage`: 4-step event builder (Basics, Date & Venue, Tickets & Capacity, Review & Publish) with validation and draft/publish controls.
  - `VenuesPage`: Organization venue management with add-venue modal and capacity metrics.
  - `MainLayout`: Header updated with "Explore Events", "Venues", and "+ Create Event" shortcuts.

### Test Results
- **Server:** 23/23 tests passing (`health.test.js`, `auth.test.js`, and `event.test.js`).
- **Client:** All Vite builds passing (0 errors) and Vitest tests passing.

---

## Phase 3 — Registrations, Tickets & QR Codes ✅

**Status:** Complete  
**Date:** 2026-09-24

### What was built
- **Models**: `Registration` with unique `ticketCode`, QR code data URL image, check-in tracking (`checkedIn`, `checkedInAt`), and `paymentStatus` lifecycle (User-approved change #1).
- **Payment Status & Organizer Actions**: Initial payment status defaults to `'free'` for zero-price tickets and `'unpaid'` for paid tickets. Built organizer action endpoint (`PATCH /api/v1/registrations/:id/pay`) allowing organizers to mark passes as paid for accurate revenue tracking (User-approved change #1).
- **Attendee Direct Access**: Attendee access is derived from `Registration`, keeping `EventMembership` strictly for organizers, staff, speakers, and sponsors (User-approved change #3).
- **QR Code Generation**: Integrated `qrcode` to generate cryptographic/JSON payload data URLs containing ticket code, event ID, user identity, and metadata.
- **Check-In System**: Built check-in endpoint (`POST /api/v1/registrations/event/:eventId/checkin`) supporting both ticket codes and full QR JSON payloads, preventing duplicate check-ins with 409 conflict and timestamped logs.
- **Organization Subscription Enforcement**: Enforced `maxAttendees` limit with 403 Forbidden when an organization reaches capacity (User-approved change #5).
- **Confirmation Email**: Dispatched registration confirmation email stub via `sendEmail` containing ticket tier, price, ticket code, and check-in instructions.
- **Frontend Pages & Features**:
  - `PublicEventDetailPage`: Integrated registration modal allowing ticket tier selection, optional attendee notes, and instant digital pass display with scannable QR code.
  - `MyTicketsPage`: Attendee dashboard (`/my-tickets`) showing all registered events, status badges, view pass modal with high-res QR code, and cancellation options.
  - `EventAttendeesPage`: Organizer portal (`/dashboard/events/:id/attendees`) with live check-in scanner console, revenue & attendance metrics (Paid, Unpaid, Free, Checked-In), and "Mark as Paid" action button.
  - Navigation & Table links updated across `DashboardPage`, `MainLayout`, and router.

### Test Results
- **Server:** 33/33 tests passing (`health.test.js`, `auth.test.js`, `event.test.js`, and `registration.test.js`).
- **Client:** All Vite builds passing (0 errors) and Vitest tests passing.

---

## Phase 4 — Sessions, Speakers & Multi-Track Scheduling ✅

**Status:** Complete  
**Date:** 2026-09-24

### What was built
- **Models**: Dedicated `Session` model with multi-track support (color, track name), room assignment, UTC date ranges, and populated `speakers`. Enhanced `User` model with speaker profile fields (`bio`, `company`, `jobTitle`, `socialLinks`, `speakerTopics`).
- **UTC Conflict Detection (User-approved change #6)**:
  - **Room Double-Booking Detection**: Validates physical room availability in UTC time windows, returning 409 Conflict if another session is already scheduled in the same room.
  - **Speaker Double-Booking Detection**: Validates that a presenter cannot be scheduled in two simultaneous or overlapping sessions across different rooms.
- **Speaker Invitation Flow (User-approved change #4)**:
  - Organizers invite distinguished presenters by email (`POST /api/v1/sessions/event/:eventId/speakers/invite`), automatically provisioning `EventMembership` with role `'speaker'` and dispatching invite links via `sendEmail` stub.
  - Speakers and organizers can update bios, company affiliations, and expertise topics.
- **Multi-Track Visual Schedule Aggregator**:
  - `GET /api/v1/sessions/event/:eventId/schedule`: Automatically groups sessions by day and track, extracting distinct track colors for clean multi-column or visual timeline rendering.
- **Frontend Pages & Features**:
  - `EventSessionsPage`: Organizer Schedule & Speaker Studio (`/dashboard/events/:id/sessions`) with day/track timeline, "Add Session" modal (with instant room/speaker conflict prevention), and "Invite Speaker" modal.
  - `PublicEventDetailPage`: Added multi-day tabbed schedule with color-coded track pills, room assignments, UTC timing, and dedicated **Speakers Directory** showcasing headshots, bios, and presentation links.
  - Updated `MainLayout.jsx` with an interactive user profile dropdown menu.
  - Updated `DashboardPage.jsx` table with direct links to "Manage Schedule & Speakers".

### Test Results
- **Server:** 40/40 tests passing across all 5 test suites (`health.test.js`, `auth.test.js`, `event.test.js`, `registration.test.js`, `session.test.js`).
- **Client:** All Vite builds passing (0 errors) and Vitest tests passing.

---

## Phase 5 — Sponsors & Exhibitors ✅

**Status:** Complete  
**Date:** 2026-09-24

### What was built
- **Models & Storage**:
  - `Sponsor` model ([`server/src/models/Sponsor.js`](file:///d:/EventForge/server/src/models/Sponsor.js)) supporting tiers (`platinum`, `gold`, `silver`, `bronze`, `partner`), logo & website links, primary contacts, booth assignments, and representative lists.
- **Booth Double-Booking Conflict Prevention**:
  - Validates physical exhibition booth availability per event, returning 409 Conflict if a booth is already allocated to another sponsor.
- **Authenticated Private File Storage & Serving (User-approved change #7)**:
  - Secure upload middleware ([`server/src/middleware/upload.js`](file:///d:/EventForge/server/src/middleware/upload.js)) saving sponsorship contracts into an unexposed private directory with strict MIME and size controls.
  - Authenticated route `GET /api/v1/sponsors/:id/contract`: Verifies that only superadmins, authorized event organizers/staff, or assigned sponsor representatives can download the private agreement, rejecting unauthorized requests with 401/403.
- **Sponsor Representative Invitation Flow (User-approved change #4)**:
  - Organizers invite sponsor booth reps by email (`POST /api/v1/sponsors/:id/invite`), creating `EventMembership` with role `'sponsor'` and sending an invitation link via `sendEmail` stub.
- **Frontend Pages & Features**:
  - `EventSponsorsPage` ([`client/src/pages/EventSponsorsPage.jsx`](file:///d:/EventForge/client/src/pages/EventSponsorsPage.jsx)): Comprehensive organizer portal for adding/editing sponsors, setting tiers, managing contracts, inviting representatives, and exploring an interactive Exhibition Floor / Booth directory.
  - `PublicEventDetailPage` ([`client/src/pages/PublicEventDetailPage.jsx`](file:///d:/EventForge/client/src/pages/PublicEventDetailPage.jsx)): Tiered sponsor showcase tab (Platinum spotlight cards, Gold cards, Silver/Bronze/Community Partner badge grids) and quick links.
  - `DashboardPage` ([`client/src/pages/DashboardPage.jsx`](file:///d:/EventForge/client/src/pages/DashboardPage.jsx)): Added direct **"Sponsors"** action button to the events management table.
  - Client API helper ([`client/src/api/sponsors.js`](file:///d:/EventForge/client/src/api/sponsors.js)) with multipart FormData uploads and blob download utilities.

### Test Results
- **Server:** 51/51 tests passing across all 6 test suites (`health.test.js`, `auth.test.js`, `event.test.js`, `registration.test.js`, `session.test.js`, `sponsor.test.js`).
- **Client:** All Vite builds passing (0 errors) and Vitest tests passing (4/4).

---

## Phase 6 — Analytics, Reports & Exports ✅

**Status:** Complete  
**Date:** 2026-09-24

### What was built
- **Event KPI & Revenue Aggregation Engine**:
  - `AnalyticsService` ([`server/src/services/analytics.service.js`](file:///d:/EventForge/server/src/services/analytics.service.js)) performs MongoDB aggregation pipelines over registrations, tickets, sessions, and sponsors.
  - Computes capacity utilization rate (`confirmed / capacity`), check-in attendance rate (`checkedIn / confirmed`), total verified revenue from paid tickets, and payment lifecycle breakdowns (paid, free, unpaid, refunded).
  - Calculates ticket sales and revenue distribution per ticket tier.
  - Aggregates hourly check-in velocity and attendee arrival timelines.
- **RFC 4180 CSV Attendee Roster Streaming Export**:
  - Secure endpoint `GET /api/v1/analytics/event/:eventId/export/attendees`:
  - Formats full attendee manifest (Attendee Name, Email, Company, Job Title, Ticket Tier, Price, Payment Status, Ticket Code, Check-in status, Timestamps, Notes) with RFC-compliant quote escaping.
  - Streams with `Content-Type: text/csv; charset=utf-8` and `Content-Disposition: attachment; filename="<event-slug>-attendees.csv"`.
- **Attendee Credential & Badge Printing Engine**:
  - Secure endpoint `GET /api/v1/analytics/event/:eventId/badges` providing print-ready badge records with high-res QR codes, ticket codes, attendee roles, and event information.
- **Frontend Pages & Features**:
  - `EventAnalyticsPage` ([`client/src/pages/EventAnalyticsPage.jsx`](file:///d:/EventForge/client/src/pages/EventAnalyticsPage.jsx)): Dedicated analytics command center (`/dashboard/events/:id/analytics`) displaying revenue metrics, capacity utilization meters, check-in rate gauges, ticket tier revenue bars, and arrival velocity timelines.
  - **Attendee Badge Printing Studio**: Interactive modal with print-optimized CSS (`@media print`) rendering 2-column credential badges with scannable QR codes for thermal badge printers or paper badge sheets (`window.print()`).
  - **One-Click CSV Export**: Downloads live attendee roster spreadsheet with a single click.
  - Navigation updates: Added **"Analytics"** button to the `DashboardPage` events management table and **"Analytics & Reports"** link to the `PublicEventDetailPage` Organizer Mode bar.

### Test Results
- **Server:** 56/56 tests passing across all 7 test suites (`health.test.js`, `auth.test.js`, `event.test.js`, `registration.test.js`, `session.test.js`, `sponsor.test.js`, `analytics.test.js`).
- **Client:** All Vite builds passing (0 errors) and Vitest tests passing (4/4).

---

## Phase 7 — AI Assistant & Copilot Features ✅

**Status:** Complete  
**Date:** 2026-09-24

### What was built
- **Backend AI Engine & Services** ([`server/src/services/ai.service.js`](file:///d:/EventForge/server/src/services/ai.service.js)):
  - **Marketing Copy Generator** (`generateEventMarketingCopy`): Generates engaging event descriptions, punchy taglines, executive summaries, multi-platform social media teasers, key takeaways, and suggested SEO tags based on event title, type, tone, and topics.
  - **Multi-Track Agenda Builder** (`generateStructuredAgenda`): Automatically generates cohesive multi-track session plans, durations, track themes with hex colors, and room assignments.
  - **Speaker Bio Polisher & Talk Recommender** (`polishSpeakerBio`): Transforms raw speaker notes into publication-ready bios and generates 3 tailored talk titles.
  - **Attendee Smart Schedule Matcher** (`recommendPersonalizedSchedule`): Scores and matches public event sessions against attendee professional roles, interests, and tracks, curating an optimal itinerary with match scores and rationales.
  - **Interactive Organizer Copilot Assistant** (`chatWithCopilot`): Context-aware event operations assistant answering questions about pricing tiers, marketing copy, sponsor deliverables, and day-of-event logistics.
- **Backend AI API Routes & Controllers**:
  - Mounted under `/api/v1/ai` with rate-limiting, optional/required auth, and strict Zod validation:
    - `POST /api/v1/ai/generate-event-copy`
    - `POST /api/v1/ai/generate-agenda`
    - `POST /api/v1/ai/polish-speaker-bio`
    - `POST /api/v1/ai/recommend-sessions`
    - `POST /api/v1/ai/copilot-chat`
- **Frontend AI Copilot & Assistive Modals**:
  - **Global AI Copilot Drawer** ([`client/src/components/AiCopilotModal.jsx`](file:///d:/EventForge/client/src/components/AiCopilotModal.jsx)): Floating, animated AI assistant button in [`client/src/layouts/MainLayout.jsx`](file:///d:/EventForge/client/src/layouts/MainLayout.jsx) with quick prompt chips, real-time message streaming simulation, event context selector, and one-click copy to clipboard.
  - **Attendee Schedule Recommender** ([`client/src/components/AiScheduleRecommenderModal.jsx`](file:///d:/EventForge/client/src/components/AiScheduleRecommenderModal.jsx)): Modal embedded in the Schedule tab of [`client/src/pages/PublicEventDetailPage.jsx`](file:///d:/EventForge/client/src/pages/PublicEventDetailPage.jsx) allowing attendees to select interest tags, specify their role, and receive curated session recommendations.
  - **Organizer AI Marketing Copy Generator**: Integrated into Step 1 of the event creation wizard ([`client/src/pages/EventWizardPage.jsx`](file:///d:/EventForge/client/src/pages/EventWizardPage.jsx)) with "✨ Auto-Fill with AI" to generate descriptions and tags in real time.
  - **Organizer AI Multi-Track Agenda Builder**: Integrated into [`client/src/pages/EventSessionsPage.jsx`](file:///d:/EventForge/client/src/pages/EventSessionsPage.jsx) with track and room auto-generation, preview modal, and one-click scheduling of all sessions into the event database.
  - **Speaker Bio Enhancer**: Integrated into the "Invite Speaker" modal of [`client/src/pages/EventSessionsPage.jsx`](file:///d:/EventForge/client/src/pages/EventSessionsPage.jsx) with "✨ Polish with AI".

### Test Results
- **Server:** 62/62 tests passing across all 8 test suites (`health.test.js`, `auth.test.js`, `event.test.js`, `registration.test.js`, `session.test.js`, `sponsor.test.js`, `analytics.test.js`, `ai.test.js`).
- **Client:** All Vite builds passing (0 errors) and Vitest tests passing (4/4).

---

## Phase 8 — Polish, Final System Verification & Deployment Preparation ✅

**Status:** Complete  
**Date:** 2026-09-24

### What was built & verified
- **Comprehensive Database Seeding Engine** ([`server/src/seed/index.js`](file:///d:/EventForge/server/src/seed/index.js)):
  - Generates full demo ecosystem: Superadmin, Organizers, Keynote Presenters, Attendees, and Sponsor Booth Representatives.
  - Seeds 2 active multi-tenant Organizations (`TechForge Global`, `InnovateX Media`).
  - Seeds 3 physical Venues with capacities and amenities.
  - Seeds 3 realistic Events (Flagship Summit, Cybersecurity Conference, Developer Workshop) with dates, capacities, and ticket tiers.
  - Seeds 5 multi-track sessions across 3 distinct rooms with speakers.
  - Seeds 4 tiered sponsors (Platinum, Gold, Silver, Partner) with booth numbers and representative assignments.
  - Seeds 4 attendee registrations with authentic QR code Data URLs, mixed payment statuses (`paid`, `free`, `unpaid`), and checked-in records.
  - Executable anytime via `npm run seed`.
- **Security Hardening & Middleware Audit**:
  - Validated rate limiters on general, auth, and AI routes.
  - Verified body parser limits, mongo sanitization, helmet headers, and CORS credentials.
  - Verified authenticated private file streaming for sponsor contracts and speaker materials.
- **Docker Compose & Deployment Configuration**:
  - `docker-compose.yml` orchestrating MongoDB 7, Express.js API, and multi-stage NGINX React client.
  - Documented `.env.example` configurations for all server and client variables.
- **Comprehensive Documentation**:
  - Updated [`README.md`](file:///d:/EventForge/README.md) with complete system architecture, 8 approved design decisions, quick start instructions, demo credentials table, and full API endpoint directory across all 8 modules.
- **End-to-End System Tests**:
  - Server: 62/62 tests passing across all 8 suites (`health`, `auth`, `event`, `registration`, `session`, `sponsor`, `analytics`, `ai`).
  - Client: All Vitest unit tests passing (4/4) and production build succeeding in 2.4s with 0 errors.

---

## 🏆 Project Delivery Complete!
EventForge is fully built, tested, seeded, and verified from Phase 0 through Phase 8.


