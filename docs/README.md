# GitGud

A GitHub-style platform for forking, editing, and collaboratively merging structured notes.

## Overview

GitGud organizes knowledge into **repositories of notes** — a repository is a named, public-or-private collection of sections arranged in a nested tree, where each section holds one rich-text note. Instead of editing someone else's repo directly, you **fork** it, edit inside your own copy, and submit a **merge request**; the owner reviews a rendered text diff and approves or rejects.

**Core loop:** discover a public repo → fork it → edit a note → submit a merge request → owner reviews the diff → approve (applies the change and credits you) or reject.

## Key Features

- **Accounts** — email/username signup, login by email *or* username, JWT sessions via an `httpOnly` cookie, change password.
- **Repositories & notes** — create/rename/delete repos; nested section tree; TipTap rich-text editor (headings, lists, bold, links, images); every save creates a version with an optional change summary and full history/restore.
- **Forking** — deep-copy any public repo (tree + notes + version history) with automatic name de-duplication (`<name>` → `<name> (fork)` → `<name> (fork 2)` …).
- **Merge requests** — propose changes from a fork targeting the original note; flat server-side text diff (diff-match-patch); approve (merges content + writes a version credited to the submitter), reject with feedback, cancel; one pending MR per note.
- **Discovery & stars** — searchable public repo browser, star/unstar, scoped lists (owned / forked / starred / discover).
- **Profiles** — public profile pages with contribution stats, editable profile (username, display name, bio) and avatar upload.

## Tech Stack

| Layer        | Technology                                   | Version                                      |
|--------------|----------------------------------------------|----------------------------------------------|
| Backend      | NestJS (`@nestjs/core`, `@nestjs/common`)    | ^11.0.1                                      |
| ORM          | Prisma + `@prisma/adapter-pg` driver adapter | ^7.0.0 / ^7.9.1                              |
| Database     | PostgreSQL                                   | 15 (`postgres:15-alpine` in Docker)          |
| Backend auth | bcryptjs, passport-jwt / jsonwebtoken        | ^3.0.3 / ^4.0.1                              |
| Backend diff | diff-match-patch                             | ^1.0.5                                       |
| Frontend     | Next.js                                      | 16.2.10                                      |
| UI library   | React / React DOM                            | 19.2.4                                       |
| Editor       | TipTap (`@tiptap/react`, starter-kit, etc.)  | ^3.31.3                                      |
| Icons        | lucide-react                                 | ^1.28.0                                      |
| Runtime      | Node.js                                      | 20 (`node:20-alpine` in both Dockerfiles, no `engines` field) |

## Project Structure

```
git-gud/
├── backend/            # NestJS API
│   ├── prisma/         # schema.prisma, migrations/, seed.ts + seed-data.json
│   └── src/            # app entry, auth/, repo/, merge-request/, prisma/, common/
├── frontend/           # Next.js app (App Router)
│   └── src/
│       ├── app/        # routes: dashboard, discover, repos, merges, settings, profile, auth
│       ├── components/ # Navbar, SidePanel, NoteEditor, SectionTree, RepoBrowser, …
│       └── lib/        # API clients: api.ts, http.ts, notes.ts, mergeRequests.ts, …
├── docs/               # PROJECT_REPORT.md, workflow.md
├── docker-compose.yml  # postgres + backend + frontend
└── .env.example        # environment template
```

## Getting Started

### Prerequisites

- **Docker** with Docker Compose (recommended path) — the whole stack (Postgres, backend, frontend) runs under `docker-compose.yml`.
- Without Docker: **Node.js 20** (both Dockerfiles use `node:20-alpine`; there is no `engines` field declaring a stricter range) and npm, plus a **PostgreSQL 15** instance you can point `DATABASE_URL` at.

### Environment variables

Copy `.env.example` to `.env` in the repo root. Everything has a working local default except `DATABASE_URL` for non-Docker runs.

| Variable              | Required | Default                       | Description                                                    |
|-----------------------|----------|-------------------------------|----------------------------------------------------------------|
| `POSTGRES_USER`       | Docker   | `postgres`                    | DB user (used by the `postgres` container)                     |
| `POSTGRES_PASSWORD`   | Docker   | `postgres`                    | DB password (used by the `postgres` container)                 |
| `POSTGRES_DB`         | Docker   | `syllabus_aggregator`         | DB name (used by the `postgres` container)                     |
| `POSTGRES_PORT`       | Docker   | `5432`                        | Host port mapped to the DB container                           |
| `API_PORT`            | No       | `4000`                        | Host port mapped to the backend container                      |
| `PORT`                | No       | `4000`                        | Backend listen port (`process.env.PORT ?? 4000` in `main.ts`)  |
| `DATABASE_URL`        | Non-Docker | (built by Compose)         | Prisma connection string; required if you skip Docker          |
| `JWT_SECRET`          | No*      | `dev-secret-change-me`        | JWT signing secret (`jwt.utils.ts` has this hard-coded fallback) |
| `NEXT_PUBLIC_API_URL` | No       | `http://localhost:4000`       | Frontend → backend base URL (`frontend/src/lib/http.ts`)       |

\* `JWT_SECRET` has a dev fallback baked into `jwt.utils.ts` — override it in `.env` for anything beyond local dev. `DATABASE_URL` and `NEXT_PUBLIC_API_URL` were **added to `.env.example`** because code references them (they were missing).

### Option A — Docker (recommended)

```bash
cp .env.example .env   # optional — local defaults work as-is
docker compose up --build
```

The frontend, backend, and postgres containers start on `GitGud_network` sharing a `pgdata` volume. The backend container runs `npm run start:dev`, which runs `prisma migrate deploy && prisma generate` before launching — so **migrations are applied automatically on boot**. Seeding is manual (see below).

### Option B — Without Docker

Start Postgres 15 yourself, then run each app separately.

**Backend** (`backend/`):
```bash
cd backend
npm install
export DATABASE_URL=postgresql://<user>:<password>@localhost:5432/syllabus_aggregator?schema=public
npx prisma migrate deploy
npm run start:dev   # == prisma migrate deploy && prisma generate && nest start --watch
```

**Frontend** (`frontend/`):
```bash
cd frontend
npm install
npm run dev
```

### Database migrations & seed

- **Migrations:** `prisma migrate deploy` applies committed migrations (run automatically by `start:dev` and by the Docker backend container). During development you may also use `npm run db:migrate` (runs `docker compose exec backend npx prisma migrate dev`).
- **Seed:** `backend/prisma/seed.ts` loads `backend/prisma/seed-data.json` (5 users, 15 repos, forks, MRs, stars). There is **no** `prisma db seed` config, so run it directly:
  ```bash
  cd backend && npx ts-node prisma/seed.ts
  # or inside Docker:
  docker compose exec backend npx ts-node prisma/seed.ts
  ```
  Seed data uses credentials defined inside `seed-data.json`.

### Default ports / URLs

| Service  | URL / Port                 |
|----------|----------------------------|
| Frontend | http://localhost:3000      |
| Backend  | http://localhost:4000      |
| Postgres | `localhost:5432` (or `POSTGRES_PORT`) |

Backend CORS only allows `http://localhost:3000` (`main.ts`), and the API is accessed with `credentials: "include"` (cookie-based sessions). Static avatar uploads are served by the backend at `/uploads/avatars/`.

## Available Scripts

**Backend** (`backend/package.json`):

| Script          | Command                                                        |
|-----------------|----------------------------------------------------------------|
| `start`         | `nest start`                                                   |
| `start:dev`     | `prisma migrate deploy && prisma generate && nest start --watch` |
| `start:debug`   | `nest start --debug --watch`                                   |
| `start:prod`    | `node dist/main`                                               |
| `build`         | `nest build`                                                   |
| `lint`          | `eslint "{src,apps,libs,test}/**/*.ts" --fix`                  |
| `format`        | `prettier --write` on src/test TS files                        |
| `test` / `test:watch` / `test:cov` / `test:debug` / `test:e2e` | Jest variants |
| `db:migrate` / `db:generate` | Run `prisma migrate dev` / `prisma generate` inside the Docker backend container |

**Frontend** (`frontend/package.json`):

| Script   | Command                 |
|----------|-------------------------|
| `dev`    | `next dev --webpack`    |
| `build`  | `next build --webpack`  |
| `start`  | `next start`            |
| `lint`   | `eslint`                |

> Note: the repo has Jest scaffolding but **no test files are shipped** — `npm test` will report no matching specs.

## Documentation

- **[docs/workflow.md](docs/workflow.md)** — for a full walkthrough of every feature, API route, and business rule (auth → repositories/notes → forking → merge requests → profiles), see `workflow.md`.
- **[docs/PROJECT_REPORT.md](docs/PROJECT_REPORT.md)** — architecture, database design, security audit summary.