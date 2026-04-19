# Local Development Guide

This guide walks you through running the frontend and backend locally for development.

## Prerequisites

- **Node.js** (for frontend)
- **Go 1.22+** (for backend)
- **mongosh** or **MongoDB Compass** (optional, for browsing local database)

## Quick Start

### 1. Start the backend

Run from the `backend/` directory:

```bash
MONGODB_URI="mongodb+srv://dbUser:YOUR_PASSWORD@websitecluster.8sqgquq.mongodb.net/anbangz_blog_local" \
API_KEY="your-dev-api-key" \
MONGODB_DATABASE="anbangz_blog_local" \
ALLOWED_ORIGIN="http://localhost:8080" \
make run
```

The backend runs at **http://localhost:8081**

### 2. Start the frontend (in a new terminal)

Run from the `frontend/` directory:

```bash
npm start
```

The frontend runs at **http://localhost:8080** and proxies API calls to the backend.

## Connecting to the Right Database

| Database | Use For | Connection String |
|----------|---------|------------------|
| `anbangz_blog_local` | Local frontend dev | Use your MongoDB Atlas URI with `/anbangz_blog_local` |
| `anbangz_blog_dev` | Testing dev environment | Use `/anbangz_blog_dev` |
| `anbangz_blog_prod` | Never locally! | — |

## Creating Blog Posts

Use the admin API to create posts:

```bash
curl -X POST http://localhost:8081/admin/posts \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-dev-api-key" \
  -d '{
    "slug": "my-first-post",
    "title": "My First Post",
    "content": "Hello world! This is my first blog post.",
    "published": true
  }'
```

## Common Issues

- **CORS errors:** Make sure `ALLOWED_ORIGIN=http://localhost:8080` is set when running the backend.
- **Empty posts:** Check you're pointing to the right database (`MONGODB_DATABASE`).
- **Auth failures:** Verify your `API_KEY` matches what's in Secrets Manager.

## Testing Production Build Locally

```bash
# Run from backend/ directory
make build  # Outputs to backend/bin/

# Run from frontend/ directory
npm run build && npx serve frontend/dist
```

## Other Useful Commands

Run from the respective `frontend/` or `backend/` directory.

| Action | Frontend | Backend |
|--------|----------|---------|
| Dev server | `npm start` | `make run` |
| Production build | `npm run build` | `make build` |
| Tests | — | `make test` |
| Clean | `npm run clean` | `make clean` |
