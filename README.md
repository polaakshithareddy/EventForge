# EventForge ⚡

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-22.x-green?logo=node.js" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-4.21-lightgrey?logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/React-18.x-blue?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Vite-5.4-purple?logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/MongoDB-7.x-green?logo=mongodb" alt="MongoDB" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?logo=tailwind-css" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Tests-62%20Passed%20(Server)-success" alt="Server Tests" />
  <img src="https://img.shields.io/badge/Tests-4%20Passed%20(Client)-success" alt="Client Tests" />
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License" />
</p>

A production-grade, enterprise Corporate Event & Conference Management platform built with the MERN stack (MongoDB, Express.js, React 18, Node.js) and powered by contextual Generative AI assistants.

---

## 📑 Table of Contents
- [🌟 Key Capabilities](#-key-capabilities)
- [🏗️ System Architecture](#️-system-architecture)
- [🛡️ Core Architectural Principles](#️-core-architectural-principles)
- [🚀 Quick Start Guide](#-quick-start-guide)
- [🔑 Demo Credentials & Accounts](#-demo-credentials--accounts)
- [📡 Complete API Reference](#-complete-api-reference)
- [🔐 Environment Variables](#-environment-variables)
- [🧪 Testing & Verification](#-testing--verification)
- [🐳 Docker Deployment](#-docker-deployment)
- [📂 Repository Structure](#-repository-structure)

---

## 🌟 Key Capabilities

- 🔐 **Dual-Layer RBAC & Multi-Tenancy**: Organization subscription limits (`maxEvents`, `maxAttendees`), platform roles (`admin`, `user`), and event-scoped memberships (`organizer`, `staff`, `speaker`, `sponsor`).
- 🎟️ **Ticketing, Payment Lifecycle & QR Check-In**: Multi-tier ticketing (`paid`, `free`, `unpaid`, `refunded`), organizer "Mark as Paid" action, instant cryptographic QR pass generation, and real-time duplicate check-in prevention.
- 🕒 **Conflict-Free Scheduling in UTC**: Automatic room double-booking detection, presenter time clash prevention, and multi-day multi-track visual agenda builders.
- 💎 **Sponsorship & Exhibition Studio**: Tiered sponsor showcases (Platinum, Gold, Silver, Bronze, Partner), booth double-booking collision prevention, and authenticated private document/contract storage.
- 📊 **Executive Analytics & Reporting**: Real-time capacity meters, check-in velocity timelines, ticket sales breakdown, printable 2-column attendee badge sheets, and RFC 4180 CSV roster streaming.
- 🤖 **Generative AI Copilot & Planning Tools**: Floating AI copilot drawer, attendee personalized schedule matcher, 1-click multi-track agenda generator, marketing copy creator, and speaker bio polisher.

---

## 🏗️ System Architecture

```
                          ┌─────────────────────────────────────┐
                          │         React 18 + Vite SPA         │
                          │   (Tailwind CSS, Zustand, React Q)  │
                          └──────────────────┬──────────────────┘
                                             │ HTTP / JSON
                                             ▼
                          ┌─────────────────────────────────────┐
                          │         Express.js REST API         │
                          │  (Helmet, CORS, Rate-Limit, Zod)    │
                          └──────┬───────────┬────────────┬─────┘
                                 │           │            │
                     ┌───────────▼──┐  ┌─────▼─────┐  ┌───▼─────────────┐
                     │ Auth & RBAC  │  │ Services  │  │ AI Service Layer│
                     │ (JWT + HMAC) │  │(Analytics)│  │ (Copy, Agenda)  │
                     └───────────┬──┘  └─────┬─────┘  └───┬─────────────┘
                                 │           │            │
                                 └───────────┼────────────┘
                                             │ Mongoose ODM
                                             ▼
                               ┌───────────────────────────┐
                               │       MongoDB 7.x         │
                               │(Indexes, UTC Dates, Slugs)│
                               └───────────────────────────┘
```

---

## 🛡️ Core Architectural Principles

1. **`Registration.paymentStatus` Lifecycle**: (`unpaid`, `paid`, `free`, `refunded`) with an organizer "Mark as Paid" endpoint for accurate verified revenue metrics without requiring a third-party payment gateway.
2. **Hashed Refresh Token Rotation**: Refresh tokens are stored SHA-256 hashed in MongoDB with automatic family invalidation on token reuse.
3. **Attendee Access via Registration**: Attendees access event portals through `Registration` records; `EventMembership` is reserved for team members (`organizer`, `staff`, `speaker`, `sponsor`).
4. **Email Invite Stubs**: Organizers invite speakers, sponsors, and staff by email, provisioning role memberships with signed activation tokens.
5. **Organization Subscription Enforcement**: Strict checks for `maxEvents` and `maxAttendees` with descriptive 403 Forbidden errors.
6. **Pure UTC Everywhere**: All start and end dates are stored and compared in UTC to eliminate timezone ambiguity during conflict detection.
7. **Authenticated Private File Storage**: Sponsor contracts and private speaker documents are served through authenticated streaming routes (`GET /api/v1/sponsors/:id/contract`).
8. **Public Unauthenticated Discovery**: Public event lists and event detail pages are accessible without login.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v20+ or v22+ LTS
- **MongoDB**: 6.x or 7.x (local service or Docker)
- **Git**: Installed and configured

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/polaakshithareddy/EventForge.git
cd EventForge

# Setup Server
cd server
cp .env.example .env
npm install

# Setup Client
cd ../client
cp .env.example .env
npm install
```

### 2. Seed Database with Realistic Demo Data

Populate the database with organizations, events, multi-track sessions, sponsors, registrations, and user accounts:

```bash
cd server
npm run seed
```

### 3. Start Development Servers

```bash
# Terminal 1: Backend API (port 5000)
cd server
npm run dev

# Terminal 2: Frontend Client (port 5173)
cd client
npm run dev
```

Visit **[http://localhost:5173](http://localhost:5173)** in your browser!

---

## 🔑 Demo Credentials & Accounts

All seeded demo accounts use the standard password: **`Password123!`**

| Role | Email | Description & Permissions |
|------|-------|---------------------------|
| **Superadmin** | `admin@eventforge.com` | Full platform administration across all tenants |
| **Lead Organizer** | `organizer@eventforge.com` | TechForge Global Director (Events, Sessions, Analytics, Sponsors) |
| **Second Organizer**| `sarah.organizer@eventforge.com` | InnovateX Media Lead Organizer |
| **Keynote Speaker** | `elena.rostova@ai-horizon.org` | Presenter at Global AI & Cloud Summit (Frontier AI) |
| **Speaker** | `marcus.chen@distributed-systems.io` | Systems Architect (Cloud Scale Track) |
| **VIP Attendee** | `attendee@eventforge.com` | Verified attendee with paid VIP pass and QR code |
| **General Attendee**| `jordan.lee@fintech.test` | Checked-in attendee with complimentary pass |
| **Unpaid Attendee** | `rachel.green@designhub.test` | Attendee with unpaid registration (ready for "Mark as Paid") |
| **Sponsor Rep** | `jensen.rep@nvidia.com` | Nvidia Cloud Technologies Platinum Booth Representative |

---

## 📡 Complete API Reference

### Health & System
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/health` | Service uptime, MongoDB connectivity state, and environment |

### Authentication & Profiles
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/auth/register` | Register new user account & optional organization |
| `POST` | `/api/v1/auth/login` | Authenticate with email/password; returns JWT + HTTP-only cookie |
| `POST` | `/api/v1/auth/refresh` | Rotate refresh token and issue new access token |
| `POST` | `/api/v1/auth/logout` | Revoke active refresh token family |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile and memberships |

### Events & Venues
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/events/public` | Public event directory with search, type, and location filters |
| `GET` | `/api/v1/events/public/:slug` | Public event details with tickets, schedule, speakers, and sponsors |
| `GET` | `/api/v1/events` | List events belonging to the user's organization |
| `POST` | `/api/v1/events` | Create new event (enforces `maxEvents` and venue conflicts) |
| `PATCH` | `/api/v1/events/:id` | Update event settings, capacity, or published status |
| `GET` | `/api/v1/venues` | List organization venues |
| `POST` | `/api/v1/venues` | Create a new physical venue with capacity and amenities |

### Registrations & Check-In
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/registrations` | Register for an event (enforces `maxAttendees` & generates QR pass) |
| `GET` | `/api/v1/registrations/my` | List all registrations for the logged-in attendee |
| `GET` | `/api/v1/registrations/event/:eventId` | Organizer roster of all event registrations |
| `POST` | `/api/v1/registrations/event/:eventId/checkin` | Check in attendee via ticket code or QR payload |
| `PATCH` | `/api/v1/registrations/:id/pay` | Organizer action to mark a ticket as paid |
| `DELETE` | `/api/v1/registrations/:id` | Cancel registration |

### Sessions & Speakers
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/sessions/event/:eventId` | List all scheduled sessions for an event |
| `GET` | `/api/v1/sessions/event/:eventId/schedule` | Multi-track aggregated schedule grouped by day and track |
| `GET` | `/api/v1/sessions/event/:eventId/speakers` | List distinguished speakers and their presentations |
| `POST` | `/api/v1/sessions/event/:eventId` | Schedule session (enforces room & speaker conflict detection) |
| `POST` | `/api/v1/sessions/event/:eventId/speakers/invite` | Invite speaker by email stub |
| `DELETE` | `/api/v1/sessions/:id` | Remove session |

### Sponsors & Exhibitors
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/sponsors/event/:eventId/public` | Public tiered sponsors showcase (Platinum to Partner) |
| `GET` | `/api/v1/sponsors/event/:eventId` | Organizer sponsor management list |
| `POST` | `/api/v1/sponsors/event/:eventId` | Add sponsor (with booth double-booking conflict check) |
| `POST` | `/api/v1/sponsors/event/:eventId/upload-contract` | Upload private sponsorship contract (PDF/DOCX) |
| `GET` | `/api/v1/sponsors/:id/contract` | Authenticated download of private sponsorship agreement |
| `POST` | `/api/v1/sponsors/:id/invite` | Invite sponsor representative |

### Analytics & Reporting
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/analytics/event/:eventId` | Executive KPIs: revenue, capacity utilization, check-in velocity |
| `GET` | `/api/v1/analytics/event/:eventId/export/attendees` | Stream RFC 4180 CSV attendee manifest |
| `GET` | `/api/v1/analytics/event/:eventId/badges` | Badge data for printable credential sheets |

### Generative AI Copilot
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/ai/generate-event-copy` | Generate marketing descriptions, taglines, and social posts |
| `POST` | `/api/v1/ai/generate-agenda` | Generate multi-track agenda structures and session titles |
| `POST` | `/api/v1/ai/polish-speaker-bio` | Polish speaker biographies and recommend talk topics |
| `POST` | `/api/v1/ai/recommend-sessions` | Score sessions against attendee role and interests |
| `POST` | `/api/v1/ai/copilot-chat` | Interactive chat assistant for ticketing, marketing, and logistics |

---

## 🔐 Environment Variables

### Backend (`server/.env`)
| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Runtime environment (`development`, `production`, `test`) | `development` |
| `PORT` | API listening port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/eventforge` |
| `JWT_ACCESS_SECRET` | Secret key for signing short-lived access tokens | Required |
| `JWT_REFRESH_SECRET`| Secret key for signing long-lived refresh tokens | Required |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifespan | `15m` |
| `JWT_REFRESH_EXPIRES_IN`| Refresh token lifespan | `7d` |
| `CLIENT_URL` | Allowed origin for CORS headers | `http://localhost:5173` |
| `UPLOAD_DIR` | Directory for authenticated files | `uploads` |
| `MAX_FILE_SIZE` | Max upload size in bytes (10MB) | `10485760` |

### Frontend (`client/.env`)
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Base URL for REST API endpoints | `http://localhost:5000/api/v1` |

---

## 🧪 Testing & Verification

The codebase maintains full automated test coverage across all layers:

```bash
# Run all server integration test suites (62 tests across 8 suites)
cd server
npm test

# Run server test coverage report
npm run test:coverage

# Run client unit tests (Vitest)
cd client
npm test

# Verify production client build (Vite bundle verification)
npm run build
```

---

## 🐳 Docker Deployment

To launch the complete application stack (MongoDB 7 + Node.js API + NGINX SPA Reverse Proxy) in production containers:

```bash
# Start all containers in background
docker-compose up --build -d

# Verify container health
docker-compose ps
```
- **Web App**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **MongoDB**: `localhost:27017`

---

## 📂 Repository Structure

```
EventForge/
├── client/                     # React 18 SPA (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── api/                # API client modules
│   │   ├── components/         # Shared UI components (AI Copilot, modals)
│   │   ├── layouts/            # Navigation and layout wrappers
│   │   ├── pages/              # View pages (Events, Studio, Analytics)
│   │   ├── store/              # Zustand auth & UI state
│   │   └── tests/              # Vitest test specs
│   ├── nginx.conf              # SPA production routing config
│   └── Dockerfile              # Multi-stage production container build
├── server/                     # Express.js REST API
│   ├── src/
│   │   ├── config/             # DB and environment configuration
│   │   ├── controllers/        # Route controllers
│   │   ├── middleware/         # Auth, RBAC, upload, error handlers
│   │   ├── models/             # Mongoose schemas (Event, User, Registration, etc.)
│   │   ├── routes/             # Express API routers
│   │   ├── seed/               # Database seeding engine
│   │   ├── services/           # Business logic (AI, Analytics, Email stubs)
│   │   ├── tests/              # Jest integration test suites
│   │   └── validators/         # Zod request validation schemas
│   └── Dockerfile              # API server container definition
├── docker-compose.yml          # Container orchestration (Mongo, API, Client)
├── PROGRESS.md                 # Development phase tracker
└── README.md                   # Project documentation
```

---

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.
