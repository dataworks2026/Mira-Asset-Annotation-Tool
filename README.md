# Infrastructure Annotation Application

A CVAT-like web application for structural engineers to annotate infrastructure inspection images with damage classifications (bounding boxes, damage type, severity, component codes).

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Fabric.js v6
- **Backend**: FastAPI, Python 3.10, PyMongo
- **Database**: MongoDB 7
- **Storage**: AWS S3 (presigned URLs)
- **Queue**: AWS SQS (image-processing-queue)
- **Infrastructure**: Docker Compose (3 containers)

## Quick Start

### Prerequisites

- Docker and Docker Compose
- AWS account with S3 bucket and SQS queue configured

### 1. Configure environment

Copy `.env.example` to `.env` and fill in your AWS credentials:

```bash
cp .env.example .env
```

Required values:
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
- `S3_BUCKET_NAME` — your S3 bucket for image storage
- `SQS_QUEUE_URL` — full URL to your SQS queue
- `AWS_REGION` — AWS region (default: us-east-1)

Your S3 bucket must have CORS configured to allow PUT/GET from `http://localhost:3000`.

### 2. Start the application

```bash
docker compose up --build -d
```

This starts three containers:
- `annotation-mongodb` — MongoDB 7 on port 27017
- `annotation-backend` — FastAPI on port 8000 (hot-reload enabled)
- `annotation-frontend` — Next.js on port 3000 (hot-reload enabled)

### 3. Seed the admin user

```bash
docker exec annotation-backend python -m app.seed
```

Default credentials: `admin@miraintel.com` / `admin123`

### 4. Open the app

Navigate to [http://localhost:3000](http://localhost:3000)

## Testing

### Backend tests (pytest)

```bash
docker exec annotation-backend pytest tests/ -v
```

26 tests covering auth, health, images, and inspections (including completion + SQS).

### Frontend type check

```bash
docker exec annotation-frontend npx tsc --noEmit
```

### E2E tests (Playwright)

Requires containers running. Run from the host machine:

```bash
cd frontend
npm run test:e2e
```

12 tests covering authentication, inspection CRUD, and completion workflows.

## Architecture

### Backend (`/backend`)

```
app/
  main.py              — FastAPI app, CORS, router registration
  config.py            — Pydantic settings from .env
  database.py          — MongoDB connection singleton
  seed.py              — Admin user seeder
  auth/                — JWT authentication (bcrypt, login endpoint)
  inspections/         — Inspection CRUD + completion + SQS service
  images/              — Image upload (S3 presigned URLs), annotation save
tests/                 — pytest test suite
```

### Frontend (`/frontend`)

```
src/
  app/                 — Next.js pages (login, inspections, annotate)
  components/
    annotations/       — AnnotationCanvas (Fabric.js), toolbar, labels, list
    images/            — ImageUploader, ImageGallery, ImageThumbnail, ImageModal
    inspections/       — InspectionForm, InspectionList, CompletionModal
    layout/            — Header, AuthGuard
    ui/                — Badge, Toast
  contexts/            — AuthContext (JWT token management)
  hooks/               — useAuth, useInspections, useImages, useAnnotations
  lib/                 — API client, reference data (damage types, severity, components)
  types/               — TypeScript interfaces
e2e/                   — Playwright E2E tests
```

## Key Features

- **JWT Authentication** — bcrypt passwords, 24-hour token expiry
- **Inspection Management** — create, list, view, complete inspections
- **Image Upload** — drag-and-drop upload via S3 presigned URLs with per-file progress
- **Image Gallery** — responsive grid with thumbnails, lightbox viewer, annotation status badges
- **Annotation Canvas** — Fabric.js v6 bounding box drawing/editing with keyboard shortcuts
- **Damage Classification** — 8 damage types, 4 severity levels (color-coded), 11 component codes
- **Save/Load** — explicit save with dirty state tracking and unsaved changes warning
- **Inspection Completion** — marks inspection as completed, sends SQS message with annotation summaries
- **Read-Only Mode** — completed inspections disable annotation editing
- **Toast Notifications** — success/error feedback for save and completion actions

## Keyboard Shortcuts (Annotation Workspace)

| Key | Action |
|-----|--------|
| V | Select mode |
| B | Draw box mode |
| Delete/Backspace | Delete selected annotation |
| Arrow Left/Right | Navigate between images |
| Ctrl/Cmd+S | Save annotations |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Authenticate user |
| GET | `/api/health` | Health check |
| POST | `/api/inspections` | Create inspection |
| GET | `/api/inspections` | List inspections |
| GET | `/api/inspections/{id}` | Get inspection |
| POST | `/api/inspections/{id}/complete` | Complete inspection (sends SQS) |
| POST | `/api/inspections/{id}/upload-urls` | Get presigned upload URLs |
| GET | `/api/inspections/{id}/images` | List images |
| GET | `/api/images/{id}` | Get single image |
| PUT | `/api/images/{id}/annotations` | Save annotations |
