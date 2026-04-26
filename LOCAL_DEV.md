# Local Development Guide

This guide walks you through running the frontend and backend locally for development.

## Prerequisites

- **Node.js** (for frontend)
- **Go 1.24+** (for backend)
- **mongosh** or **MongoDB Compass** (optional, for browsing the Atlas-backed development databases)
- **AWS credentials and region configuration** on your machine if you want to test local photo uploads, with permission to access the local photo bucket/CDN setup

## Quick Start

### 1. Start the backend

Run from the `backend/` directory:

```bash
MONGODB_URI="mongodb+srv://dbUser:YOUR_PASSWORD@websitecluster.8sqgquq.mongodb.net/anbangz_blog_local" \
API_KEY="your-dev-api-key" \
S3_BUCKET="local-photos.anbangz.me" \
PHOTOS_CDN_URL="https://local-photos.anbangz.me" \
MONGODB_DATABASE="anbangz_blog_local" \
ALLOWED_ORIGIN="http://localhost:8080" \
make run
```

The backend runs at **http://localhost:8081**

> Local photo uploads use the dedicated AWS-backed local photo environment at `local-photos.anbangz.me`, which is separate from both `dev-photos.anbangz.me` and `photos.anbangz.me`.

### 2. Start the frontend (in a new terminal)

Run from the `frontend/` directory:

```bash
npm start
```

The frontend runs at **http://localhost:8080** and makes API requests directly to **http://localhost:8081** in local development.

## Connecting to the Right Database

| Database | Use For | Connection String |
|----------|---------|------------------|
| `anbangz_blog_local` | Local app workflow / local backend dev | Use your MongoDB Atlas URI with `/anbangz_blog_local` |
| `anbangz_blog_dev` | Testing dev environment | Use `/anbangz_blog_dev` |
| `anbangz_blog_prod` | Never locally! | — |

## Local vs Dev vs Prod Photo Infrastructure

| Environment | MongoDB Database | S3 / CDN Target |
|-------------|------------------|-----------------|
| Local | `anbangz_blog_local` | `local-photos.anbangz.me` |
| Dev | `anbangz_blog_dev` | `dev-photos.anbangz.me` |
| Prod | `anbangz_blog_prod` | `photos.anbangz.me` |

For local backend runs, always use the `local-photos.anbangz.me` values so local uploads do not pollute the shared dev photo environment.

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

## Verifying Local Photo Configuration

Once the Terraform infrastructure is applied, this should resolve successfully:

```bash
curl -I https://local-photos.anbangz.me
```

If DNS and CloudFront are set up correctly, you should receive an HTTP response from CloudFront rather than a DNS failure.

## Common Issues

- **CORS errors:** Make sure `ALLOWED_ORIGIN=http://localhost:8080` is set when running the backend.
- **Empty posts:** Check you're pointing to the right database (`MONGODB_DATABASE`).
- **Auth failures:** First verify the `X-API-Key` header matches the `API_KEY` value you used to start the backend locally. If you are intentionally relying on secret-backed config instead of a directly exported env var, then verify the configured value matches what's in Secrets Manager.

## Testing Production Build Locally

```bash
# Run from backend/ directory
make build  # Outputs to backend/bin/

# Run from frontend/ directory
npm run build && npx serve dist
```

## Other Useful Commands

Run from the respective `frontend/` or `backend/` directory.

| Action | Frontend | Backend |
|--------|----------|---------|
| Dev server | `npm start` | `make run` |
| Production build | `npm run build` | `make build` |
| Tests | `npm test` | `make test` |
| Clean | `npm run clean` | `make clean` |
