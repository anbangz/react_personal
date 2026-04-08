# Blog Backend Design

**Date:** 2026-04-07
**Status:** Draft

## Overview

Add a Go backend API to the personal website so that blog posts and photos are sourced from MongoDB Atlas and S3 rather than hardcoded in the frontend bundle. The frontend remains a static React SPA on S3/CloudFront; it fetches blog data from the API at runtime.

## Decisions

| Decision | Choice |
|----------|--------|
| Backend scope | API-only (frontend stays on S3/CloudFront) |
| Language | Go |
| Database | MongoDB Atlas free tier (M0) |
| Photo storage | S3 + CloudFront CDN |
| Hosting | AWS Lambda + API Gateway (HTTP API) |
| Admin interface | API endpoints only (admin UI planned later) |
| Auth | API key (`X-API-Key` header) for admin endpoints; public read endpoints are unauthenticated |
| API domain | `api.anbangz.me` (prod), `dev-api.anbangz.me` (dev) |
| Repo structure | Monorepo with `frontend/` and `backend/` directories |

## Repository Structure

```
/
├── AGENTS.md
├── README.md
├── .github/
├── .gitignore
├── frontend/                        # React SPA (moved from current root)
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── webpack.config.js
│   ├── src/
│   │   ├── index.tsx
│   │   ├── App.tsx
│   │   ├── declarations.d.ts
│   │   ├── api/                     # New: API client module
│   │   ├── static/images/           # Non-blog static assets (logos, etc.)
│   │   ├── blog/                    # Types only; hardcoded posts removed
│   │   ├── components/
│   │   │   ├── widgets/
│   │   │   ├── blog-post/
│   │   │   └── lightbox/
│   │   └── views/
│   └── dist/
├── backend/                         # New Go module
│   ├── go.mod
│   ├── go.sum
│   ├── cmd/
│   │   └── api/
│   │       └── main.go              # Lambda handler entry point
│   ├── internal/
│   │   ├── handler/                 # HTTP handlers
│   │   ├── model/                   # Go structs (Post, Photo)
│   │   ├── repository/              # MongoDB data access
│   │   ├── service/                 # Business logic (S3 upload, post CRUD)
│   │   └── middleware/              # API key auth, CORS, logging
│   └── Makefile
└── infrastructure-terraform/        # Terraform (existing + new resources)
    ├── main.tf
    ├── api-gateway.tf               # New
    ├── lambda.tf                    # New
    ├── s3-photos.tf                 # New
    ├── mongodb-secrets.tf           # New
    ├── codepipeline.tf              # Updated paths for frontend/
    ├── codebuild.tf                 # Updated paths for frontend/
    ├── codebuild-backend.tf         # New
    ├── codepipeline-backend.tf      # New
    ├── buildspec.yml                # Updated paths for frontend/
    ├── buildspec-backend.yml        # New
    └── ...
```

## Data Model

### MongoDB: `posts` collection

Database names: `anbangz_blog_dev` (dev), `anbangz_blog_prod` (prod), both on the same Atlas M0 cluster.

```json
{
  "_id": ObjectId,
  "slug": "rome-trip",
  "title": "A Week in Rome",
  "content": "# A Week in Rome\nWe arrived on a Tuesday...",
  "photos": [
    {
      "src": "https://photos.anbangz.me/rome-sunset.jpg",
      "caption": "Sunset over the Colosseum",
      "order": 0
    }
  ],
  "published": true,
  "createdAt": ISODate("2026-02-28T00:00:00Z"),
  "updatedAt": ISODate("2026-02-28T00:00:00Z")
}
```

Key fields:

- **`slug`**: Unique, human-readable identifier. Indexed unique. Used in URLs (`/blog/rome-trip`).
- **`content`**: Raw markdown. The frontend renders it with `react-markdown`.
- **`photos`**: Embedded array of `{ src, caption?, order }`. Empty array for text-only posts. `photos[0]` serves as the hero image in the blog feed.
- **`published`**: Draft/published toggle. Public API only returns `published: true`.
- **`createdAt` / `updatedAt`**: Timestamps for sorting (descending by `createdAt`) and auditing.

No `type` field -- every post can have both markdown content and photos.

### Go structs

```go
type Photo struct {
    Src     string `bson:"src" json:"src"`
    Caption string `bson:"caption,omitempty" json:"caption,omitempty"`
    Order   int    `bson:"order" json:"order"`
}

type Post struct {
    ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
    Slug      string             `bson:"slug" json:"slug"`
    Title     string             `bson:"title" json:"title"`
    Content   string             `bson:"content" json:"content"`
    Photos    []Photo            `bson:"photos,omitempty" json:"photos"`
    Published bool               `bson:"published" json:"published"`
    CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
    UpdatedAt time.Time          `bson:"updatedAt" json:"updatedAt"`
}
```

### Frontend TypeScript types

```typescript
interface Photo {
  src: string;
  caption?: string;
  order: number;
}

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  photos: Photo[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
}
```

## API Design

Base URLs: `https://api.anbangz.me` (prod), `https://dev-api.anbangz.me` (dev).

### Public endpoints (no auth)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check. Returns 200 + MongoDB connection status. |
| `GET` | `/posts` | List published posts, sorted by `createdAt` desc. Supports `?page=1&limit=10`. Returns posts with truncated `content` (first 300 chars). Response: `{ posts: [...], total: N, page: N, limit: N }`. |
| `GET` | `/posts/{slug}` | Get a single published post by slug. Returns full content + photos. |

### Admin endpoints (`X-API-Key` header required)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/admin/posts` | Create a post. Body: JSON with `title`, `slug`, `content`, `photos`, `published`. |
| `PUT` | `/admin/posts/{slug}` | Update a post. Partial updates supported. |
| `DELETE` | `/admin/posts/{slug}` | Delete a post and its associated S3 photos. |
| `GET` | `/admin/posts` | List all posts including drafts. |
| `POST` | `/admin/photos` | Upload a photo (`multipart/form-data`). Stores in S3, returns CloudFront URL. |
| `GET` | `/admin/photos` | List all photos in S3 (URLs, sizes, last modified). Paginated. |
| `DELETE` | `/admin/photos/{key}` | Delete a photo from S3. |

Photo upload is decoupled from post creation: upload photos first, get URLs, then reference them in the post's `photos` array or inline in markdown.

## Infrastructure

### Existing wildcard ACM certificate

The existing cert (`anbangz.me` + `*.anbangz.me`) covers all new subdomains. No new certificate needed.

### New AWS resources (dev + prod pairs)

| Resource | Dev | Prod |
|----------|-----|------|
| API Gateway (HTTP API) | `DevBackendAPI` | `BackendAPI` |
| API Gateway custom domain | `dev-api.anbangz.me` | `api.anbangz.me` |
| Lambda function | `DevBackendAPIHandler` | `BackendAPIHandler` |
| S3 bucket (photos) | `dev-photos.anbangz.me` | `photos.anbangz.me` |
| CloudFront distribution (photos) | `DevPhotoDistribution` | `PhotoDistribution` |
| Route53 A records | `dev-api.anbangz.me`, `dev-photos.anbangz.me` | `api.anbangz.me`, `photos.anbangz.me` |
| Secrets Manager secrets | `dev/blog-api/mongodb-uri`, `dev/blog-api/api-key` | `prod/blog-api/mongodb-uri`, `prod/blog-api/api-key` |
| Lambda IAM execution role | `DevBackendAPILambdaRole` | `BackendAPILambdaRole` |

Separate IAM roles per environment so that each Lambda can only access its own S3 bucket and Secrets Manager secrets. This prevents a dev misconfiguration from touching prod data.

Lambda environment variables determine which MongoDB database and S3 bucket to use per environment.

### CloudFront constraints

Per AGENTS.md, this account's CloudFront pricing plan:
- Rejects custom cache policies. The photo CDN distributions must use an AWS-managed cache policy (e.g., `Managed-CachingOptimized`, ID `658327ea-f89d-4fab-a63d-7e88639e58f6`).
- Requires a WAF web ACL attachment. New distributions should use `lifecycle { ignore_changes = [web_acl_id] }` to avoid Terraform conflicts if the ACL is managed externally.

### CORS

- Dev Lambda: `Access-Control-Allow-Origin: https://dev.anbangz.me`
- Prod Lambda: `Access-Control-Allow-Origin: https://anbangz.me`

### MongoDB Atlas

- Free tier M0 cluster, provisioned manually via Atlas UI.
- Two databases on the same cluster: `anbangz_blog_dev`, `anbangz_blog_prod`.
- Connection URIs stored in Secrets Manager (one per environment).
- Network access: allow 0.0.0.0/0 (Lambda IPs are dynamic). Credentials in the connection string provide security.

### Backend pipeline

**`BackendAPIPipeline`**: Single pipeline, deploys dev then prod (matching existing app pipeline pattern).

| Stage | Description |
|-------|-------------|
| Source | CodeStar connection, `master` branch, V2 pipeline with file path filter on `backend/**` |
| Build | CodeBuild: compile Go binary for `linux/amd64`, zip as Lambda deployment package |
| DeployDev | CodeBuild: `aws lambda update-function-code` on `DevBackendAPIHandler` |
| DeployProd | CodeBuild: `aws lambda update-function-code` on `BackendAPIHandler` |

### Frontend pipeline update

The existing `PersonalWebsitePipeline` buildspec paths update for the `frontend/` directory move. The build stage runs `npm run clean-build` from within `frontend/`. Deploy stages and cache invalidation remain the same.

## Frontend Changes

### New: API client module (`frontend/src/api/`)

- `fetchPosts(page, limit)` -- paginated post list
- `fetchPost(slug)` -- single post by slug
- API base URL derived from current hostname at runtime:
  - `dev.anbangz.me` -> `https://dev-api.anbangz.me`
  - `anbangz.me` -> `https://api.anbangz.me`
  - `localhost:8080` (webpack dev server) -> `http://localhost:8081` (local Go server)

### Local development

- **Frontend**: `npm start` from `frontend/` runs webpack dev server on `localhost:8080` as before.
- **Backend**: The Go server has a `net/http` adapter (in addition to the Lambda handler) so it can run as a normal HTTP server locally on port 8081. A `make run` target in `backend/Makefile` starts it. Environment variables (`MONGODB_URI`, `API_KEY`, `S3_BUCKET`, `PHOTOS_CDN_URL`, `ALLOWED_ORIGIN`) are set via a local `.env` file (gitignored) or shell exports. The local server connects to the `anbangz_blog_dev` MongoDB database.

### Updated components

- **`Blog.tsx`**: Replace static `blogPosts` import with `useEffect`/`useState` fetch. Add loading state, error state, pagination.
- **`BlogPostCard.tsx`**: Remove `type` field logic. Show `photos[0]` as hero image if present. Render markdown body.
- **`Lightbox.tsx`**: Accept `Photo[]` instead of `BlogPost[]`.
- **New route `/blog/:slug`**: Individual post page. Fetches single post by slug. Renders full content + photo gallery with lightbox.

### Cleanup

- Remove `src/blog/posts/` (hardcoded data, markdown files, image imports).
- Update `src/blog/types.ts` with new `BlogPost` and `Photo` interfaces.
- Remove blog placeholder images (`portrait.jpg`, `amazon-scout.jpg`) from `src/static/images/`. Non-blog images (logos, seals) stay.

### Directory move

All current root-level frontend files move into `frontend/`:
- `package.json`, `package-lock.json`, `tsconfig.json`, `webpack.config.js`, `index.html` -> `frontend/`
- `src/` -> `frontend/src/`
- `dist/` -> `frontend/dist/`
- `.vscode/` stays at repo root (editor config is repo-level)

## Error Handling

### Backend

- MongoDB connection failure on cold start: Lambda returns 503 with retry-after header.
- Invalid slug / post not found: 404 with JSON error body.
- Invalid API key: 401.
- Missing API key on admin endpoint: 401.
- Photo upload failure (S3): 500 with error detail.
- Request validation errors (missing title, duplicate slug): 400 with field-level error messages.

### Frontend

- API unreachable: Show error message with retry button.
- Loading state: Show skeleton/spinner while fetching posts.
- Empty state: "No posts yet. Check back soon." (matches current behavior).
- 404 on individual post: Show not-found message.

## Testing

### Backend

- Unit tests for handlers, services, and repository layer using Go's `testing` package.
- Repository tests use a test MongoDB instance or mock.
- Integration test: spin up the Lambda handler locally (using `net/http` adapter) and test the full request/response cycle.

### Frontend

- No test suite exists today. Frontend testing is out of scope for this initial implementation but the architecture does not preclude adding tests later.

## Out of Scope

- Admin UI (planned for later).
- Blog post categories, tags, or search.
- Comments system.
- RSS feed.
- Image processing (resizing, thumbnails).
- Rate limiting (API Gateway has built-in throttling as a basic safeguard).
