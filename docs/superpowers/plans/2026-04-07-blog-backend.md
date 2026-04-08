# Blog Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Go backend API (Lambda + API Gateway) so blog posts and photos are sourced from MongoDB Atlas and S3 instead of being hardcoded in the frontend bundle.

**Architecture:** Monorepo with `frontend/` (React SPA on S3/CloudFront) and `backend/` (Go Lambda behind API Gateway at api.anbangz.me). MongoDB Atlas free tier stores post data; S3 + CloudFront serves photos. Dev and prod environments mirror the existing frontend pattern.

**Tech Stack:** Go 1.26, chi router, MongoDB Go driver, AWS Lambda Go adapter, AWS SDK v2 (S3, Secrets Manager), React 18, TypeScript, Terraform

**Spec:** `docs/superpowers/specs/2026-04-07-blog-backend-design.md`

---

## File Structure

### New files

```
backend/
  go.mod
  go.sum
  Makefile
  cmd/api/main.go                    # Lambda + local HTTP entry point
  internal/model/post.go             # Post, Photo structs
  internal/repository/post.go        # PostRepository interface + MongoDB impl
  internal/repository/post_test.go
  internal/service/post.go           # Post CRUD business logic
  internal/service/post_test.go
  internal/service/photo.go          # S3 photo operations
  internal/service/photo_test.go
  internal/handler/router.go         # Chi router wiring
  internal/handler/health.go         # GET /health
  internal/handler/post.go           # Post endpoints
  internal/handler/photo.go          # Photo endpoints
  internal/middleware/auth.go         # API key middleware
  internal/middleware/cors.go         # CORS middleware

frontend/src/api/client.ts           # API client module
frontend/src/views/blog-post/BlogPostPage.tsx   # Individual post page
frontend/src/views/blog-post/BlogPostPage.css

infrastructure-terraform/
  api-gateway.tf                     # API Gateway HTTP APIs + custom domains
  lambda.tf                          # Lambda functions + IAM roles
  s3-photos.tf                       # Photo S3 buckets + CloudFront distributions
  mongodb-secrets.tf                 # Secrets Manager secrets
  codebuild-backend.tf               # Backend build CodeBuild project
  codepipeline-backend.tf            # Backend deploy pipeline
  buildspec-backend-build.yml        # Go compile buildspec
  buildspec-backend-deploy.yml       # Lambda update buildspec
```

### Modified files

```
.gitignore                           # Add backend/ and frontend/ ignores
AGENTS.md                            # Update paths for new structure
infrastructure-terraform/buildspec.yml          # Update paths for frontend/
infrastructure-terraform/codebuild.tf           # Update buildspec path
infrastructure-terraform/codebuild-terraform.tf # Add new IAM permissions
frontend/src/blog/types.ts           # New BlogPost + Photo types
frontend/src/App.tsx                 # Add /blog/:slug route
frontend/src/views/blog/Blog.tsx     # API fetching, pagination, new data model
frontend/src/components/blog-post/BlogPost.tsx  # New data model (photos array)
frontend/src/components/lightbox/Lightbox.tsx    # Accept Photo[] props
frontend/src/components/blog-post/BlogPost.css  # Gallery styles
```

### Deleted files

```
src/blog/posts/index.ts              # Hardcoded post data (after move to frontend/)
src/blog/posts/welcome.md
src/blog/posts/the-end-of-trust-but-verify.md
src/static/images/portrait.jpg       # Blog placeholder images only
src/static/images/amazon-scout.jpg
```

---

## Phase 1: Repository Restructure

### Task 1: Move frontend files into frontend/ directory

**Files:**
- Move: `package.json`, `package-lock.json`, `tsconfig.json`, `webpack.config.js`, `index.html`, `src/` -> `frontend/`
- Delete: `backend/node_modules/` (empty placeholder directory)

- [ ] **Step 1: Remove empty backend placeholder**

```bash
rm -rf backend/
```

- [ ] **Step 2: Create frontend/ and move all frontend files**

```bash
mkdir -p frontend
git mv package.json frontend/
git mv package-lock.json frontend/
git mv tsconfig.json frontend/
git mv webpack.config.js frontend/
git mv index.html frontend/
git mv src frontend/
```

- [ ] **Step 3: Move dist/ if it exists (not tracked by git, just move it)**

```bash
mv dist frontend/dist 2>/dev/null || true
```

- [ ] **Step 4: Install dependencies in the new location**

```bash
cd frontend && npm install
```

- [ ] **Step 5: Verify the frontend builds**

```bash
cd frontend && npm run build
```

Expected: Build succeeds, `frontend/dist/bundle.js` is created. Webpack config uses `__dirname`-relative paths so no config changes needed.

- [ ] **Step 6: Verify the dev server starts**

```bash
cd frontend && npm start &
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://localhost:8080
kill %1
```

Expected: HTTP 200.

---

### Task 2: Update infrastructure references for frontend/ move

**Files:**
- Modify: `infrastructure-terraform/buildspec.yml`
- Modify: `infrastructure-terraform/codebuild.tf:74-77` (buildspec path)

- [ ] **Step 1: Update buildspec.yml to build from frontend/**

Replace the entire `infrastructure-terraform/buildspec.yml` with:

```yaml
version: 0.2

phases:
  install:
    runtime-versions:
      nodejs: 20
  build:
    commands:
      - cd frontend && npm run clean-build
artifacts:
  base-directory: ./frontend/dist
  files:
    - "**/*"
```

Key changes: `npm run clean-build` runs inside `frontend/`, artifacts come from `./frontend/dist`.

- [ ] **Step 2: Verify buildspec path in codebuild.tf is still correct**

The CodeBuild project at `infrastructure-terraform/codebuild.tf:76` already references `infrastructure-terraform/buildspec.yml` which is still at the same path. No change needed.

---

### Task 3: Update .gitignore and AGENTS.md

**Files:**
- Modify: `.gitignore`
- Modify: `AGENTS.md`

- [ ] **Step 1: Update .gitignore**

Replace `.gitignore` with:

```
node_modules
dist/*
frontend/node_modules
frontend/dist/*
backend/bin/
infrastructure-terraform/.terraform/
infrastructure-terraform/terraform.tfstate
infrastructure-terraform/terraform.tfstate.backup
infrastructure-terraform/terraform.tfstate.*.backup
```

- [ ] **Step 2: Update AGENTS.md repository layout section**

In `AGENTS.md`, update the `Repository Layout` section to reflect the new structure with `frontend/` and `backend/` directories. Update all path references throughout the file (e.g., `src/views/` becomes `frontend/src/views/`, development commands note `cd frontend` prefix).

Update the Development Commands section:

```
npm start          ->  cd frontend && npm start
npm run build      ->  cd frontend && npm run build
npm run clean      ->  cd frontend && npm run clean
npm run clean-build -> cd frontend && npm run clean-build
```

Add backend commands:

```
cd backend && make build    # Compile Go binary for Lambda
cd backend && make run      # Run local dev server on :8081
cd backend && make test     # Run Go tests
```

- [ ] **Step 3: Commit the restructure**

```bash
git add -A
git commit -m "refactor: move frontend files into frontend/ directory"
```

---

## Phase 2: Go Backend

### Task 4: Initialize Go module with dependencies

**Files:**
- Create: `backend/go.mod`
- Create: `backend/Makefile`

- [ ] **Step 1: Create the Go module**

```bash
mkdir -p backend
cd backend
go mod init github.com/anbangz/react_personal/backend
```

- [ ] **Step 2: Add dependencies**

```bash
cd backend
go get github.com/go-chi/chi/v5@latest
go get go.mongodb.org/mongo-driver/mongo@latest
go get go.mongodb.org/mongo-driver/bson@latest
go get github.com/aws/aws-lambda-go@latest
go get github.com/awslabs/aws-lambda-go-api-proxy@latest
go get github.com/aws/aws-sdk-go-v2@latest
go get github.com/aws/aws-sdk-go-v2/config@latest
go get github.com/aws/aws-sdk-go-v2/service/s3@latest
go get github.com/aws/aws-sdk-go-v2/service/secretsmanager@latest
```

- [ ] **Step 3: Create Makefile**

Create `backend/Makefile`:

```makefile
.PHONY: build run test clean

BINARY_NAME=bootstrap
BUILD_DIR=bin

build:
	GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -tags lambda.norpc -o $(BUILD_DIR)/$(BINARY_NAME) ./cmd/api/
	cd $(BUILD_DIR) && zip function.zip $(BINARY_NAME)

run:
	go run ./cmd/api/ -local

test:
	go test ./... -v

clean:
	rm -rf $(BUILD_DIR)
```

- [ ] **Step 4: Create directory structure**

```bash
cd backend
mkdir -p cmd/api internal/model internal/repository internal/service internal/handler internal/middleware bin
```

---

### Task 5: Define data models

**Files:**
- Create: `backend/internal/model/post.go`

- [ ] **Step 1: Create the Post and Photo models**

Create `backend/internal/model/post.go`:

```go
package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

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

// CreatePostRequest is the JSON body for POST /admin/posts.
type CreatePostRequest struct {
	Slug      string  `json:"slug"`
	Title     string  `json:"title"`
	Content   string  `json:"content"`
	Photos    []Photo `json:"photos,omitempty"`
	Published bool    `json:"published"`
}

// UpdatePostRequest is the JSON body for PUT /admin/posts/{slug}.
// All fields are pointers to support partial updates.
type UpdatePostRequest struct {
	Title     *string  `json:"title,omitempty"`
	Content   *string  `json:"content,omitempty"`
	Photos    *[]Photo `json:"photos,omitempty"`
	Published *bool    `json:"published,omitempty"`
}

// PaginatedResponse wraps a list response with pagination metadata.
type PaginatedResponse struct {
	Posts []Post `json:"posts"`
	Total int64  `json:"total"`
	Page  int    `json:"page"`
	Limit int    `json:"limit"`
}

// PhotoListItem represents a photo in the S3 listing.
type PhotoListItem struct {
	Key          string    `json:"key"`
	URL          string    `json:"url"`
	Size         int64     `json:"size"`
	LastModified time.Time `json:"lastModified"`
}

// ErrorResponse is a standard JSON error body.
type ErrorResponse struct {
	Error   string `json:"error"`
	Details string `json:"details,omitempty"`
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd backend && go build ./internal/model/
```

Expected: No errors.

---

### Task 6: Implement MongoDB repository

**Files:**
- Create: `backend/internal/repository/post.go`
- Create: `backend/internal/repository/post_test.go`

- [ ] **Step 1: Create the repository interface and MongoDB implementation**

Create `backend/internal/repository/post.go`:

```go
package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/anbangz/react_personal/backend/internal/model"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// PostRepository defines data access operations for posts.
type PostRepository interface {
	FindPublished(ctx context.Context, page, limit int) ([]model.Post, int64, error)
	FindAll(ctx context.Context, page, limit int) ([]model.Post, int64, error)
	FindBySlug(ctx context.Context, slug string, publishedOnly bool) (*model.Post, error)
	Create(ctx context.Context, post *model.Post) error
	Update(ctx context.Context, slug string, update bson.M) error
	Delete(ctx context.Context, slug string) error
}

// MongoPostRepository implements PostRepository using MongoDB.
type MongoPostRepository struct {
	collection *mongo.Collection
}

// NewMongoPostRepository creates a new repository backed by the given collection.
func NewMongoPostRepository(collection *mongo.Collection) *MongoPostRepository {
	return &MongoPostRepository{collection: collection}
}

func (r *MongoPostRepository) findPaginated(ctx context.Context, filter bson.M, page, limit int) ([]model.Post, int64, error) {
	total, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, fmt.Errorf("count documents: %w", err)
	}

	skip := int64((page - 1) * limit)
	opts := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}}).
		SetSkip(skip).
		SetLimit(int64(limit))

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, 0, fmt.Errorf("find: %w", err)
	}
	defer cursor.Close(ctx)

	var posts []model.Post
	if err := cursor.All(ctx, &posts); err != nil {
		return nil, 0, fmt.Errorf("decode: %w", err)
	}
	if posts == nil {
		posts = []model.Post{}
	}
	return posts, total, nil
}

func (r *MongoPostRepository) FindPublished(ctx context.Context, page, limit int) ([]model.Post, int64, error) {
	return r.findPaginated(ctx, bson.M{"published": true}, page, limit)
}

func (r *MongoPostRepository) FindAll(ctx context.Context, page, limit int) ([]model.Post, int64, error) {
	return r.findPaginated(ctx, bson.M{}, page, limit)
}

func (r *MongoPostRepository) FindBySlug(ctx context.Context, slug string, publishedOnly bool) (*model.Post, error) {
	filter := bson.M{"slug": slug}
	if publishedOnly {
		filter["published"] = true
	}

	var post model.Post
	err := r.collection.FindOne(ctx, filter).Decode(&post)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, fmt.Errorf("find one: %w", err)
	}
	return &post, nil
}

func (r *MongoPostRepository) Create(ctx context.Context, post *model.Post) error {
	post.ID = primitive.NewObjectID()
	now := time.Now().UTC()
	post.CreatedAt = now
	post.UpdatedAt = now
	if post.Photos == nil {
		post.Photos = []model.Photo{}
	}

	_, err := r.collection.InsertOne(ctx, post)
	if err != nil {
		return fmt.Errorf("insert: %w", err)
	}
	return nil
}

func (r *MongoPostRepository) Update(ctx context.Context, slug string, update bson.M) error {
	update["updatedAt"] = time.Now().UTC()
	result, err := r.collection.UpdateOne(
		ctx,
		bson.M{"slug": slug},
		bson.M{"$set": update},
	)
	if err != nil {
		return fmt.Errorf("update: %w", err)
	}
	if result.MatchedCount == 0 {
		return fmt.Errorf("post not found: %s", slug)
	}
	return nil
}

func (r *MongoPostRepository) Delete(ctx context.Context, slug string) error {
	result, err := r.collection.DeleteOne(ctx, bson.M{"slug": slug})
	if err != nil {
		return fmt.Errorf("delete: %w", err)
	}
	if result.DeletedCount == 0 {
		return fmt.Errorf("post not found: %s", slug)
	}
	return nil
}
```

- [ ] **Step 2: Create repository unit tests**

Create `backend/internal/repository/post_test.go`:

```go
package repository

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/anbangz/react_personal/backend/internal/model"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// These tests require a running MongoDB instance.
// Set MONGODB_URI env var to run them. They are skipped otherwise.

func setupTestDB(t *testing.T) (*mongo.Collection, func()) {
	t.Helper()
	uri := os.Getenv("MONGODB_URI")
	if uri == "" {
		t.Skip("MONGODB_URI not set, skipping integration test")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		t.Fatalf("connect: %v", err)
	}

	dbName := "anbangz_blog_test_" + time.Now().Format("20060102150405")
	collection := client.Database(dbName).Collection("posts")

	cleanup := func() {
		_ = client.Database(dbName).Drop(context.Background())
		_ = client.Disconnect(context.Background())
	}

	return collection, cleanup
}

func TestMongoPostRepository_CRUD(t *testing.T) {
	collection, cleanup := setupTestDB(t)
	defer cleanup()

	repo := NewMongoPostRepository(collection)
	ctx := context.Background()

	// Create
	post := &model.Post{
		Slug:      "test-post",
		Title:     "Test Post",
		Content:   "# Hello\nThis is a test.",
		Photos:    []model.Photo{},
		Published: true,
	}
	if err := repo.Create(ctx, post); err != nil {
		t.Fatalf("Create: %v", err)
	}
	if post.ID.IsZero() {
		t.Fatal("expected non-zero ID after create")
	}

	// FindBySlug
	found, err := repo.FindBySlug(ctx, "test-post", false)
	if err != nil {
		t.Fatalf("FindBySlug: %v", err)
	}
	if found == nil {
		t.Fatal("expected post, got nil")
	}
	if found.Title != "Test Post" {
		t.Errorf("expected title 'Test Post', got '%s'", found.Title)
	}

	// FindPublished
	posts, total, err := repo.FindPublished(ctx, 1, 10)
	if err != nil {
		t.Fatalf("FindPublished: %v", err)
	}
	if total != 1 {
		t.Errorf("expected total 1, got %d", total)
	}
	if len(posts) != 1 {
		t.Errorf("expected 1 post, got %d", len(posts))
	}

	// Update
	if err := repo.Update(ctx, "test-post", bson.M{"title": "Updated Title"}); err != nil {
		t.Fatalf("Update: %v", err)
	}
	found, _ = repo.FindBySlug(ctx, "test-post", false)
	if found.Title != "Updated Title" {
		t.Errorf("expected 'Updated Title', got '%s'", found.Title)
	}

	// Delete
	if err := repo.Delete(ctx, "test-post"); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	found, _ = repo.FindBySlug(ctx, "test-post", false)
	if found != nil {
		t.Fatal("expected nil after delete")
	}
}
```

- [ ] **Step 3: Verify it compiles**

```bash
cd backend && go build ./internal/repository/
```

Expected: No errors. (Tests are skipped without MONGODB_URI.)

---

### Task 7: Implement post service

**Files:**
- Create: `backend/internal/service/post.go`
- Create: `backend/internal/service/post_test.go`

- [ ] **Step 1: Create post service**

Create `backend/internal/service/post.go`:

```go
package service

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"github.com/anbangz/react_personal/backend/internal/model"
	"github.com/anbangz/react_personal/backend/internal/repository"
	"go.mongodb.org/mongo-driver/bson"
)

var slugRegex = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

// PostService handles business logic for blog posts.
type PostService struct {
	repo repository.PostRepository
}

// NewPostService creates a new PostService.
func NewPostService(repo repository.PostRepository) *PostService {
	return &PostService{repo: repo}
}

// ListPublished returns published posts with pagination.
func (s *PostService) ListPublished(ctx context.Context, page, limit int) (*model.PaginatedResponse, error) {
	page, limit = normalizePagination(page, limit)
	posts, total, err := s.repo.FindPublished(ctx, page, limit)
	if err != nil {
		return nil, err
	}
	return &model.PaginatedResponse{Posts: posts, Total: total, Page: page, Limit: limit}, nil
}

// ListAll returns all posts (including drafts) with pagination.
func (s *PostService) ListAll(ctx context.Context, page, limit int) (*model.PaginatedResponse, error) {
	page, limit = normalizePagination(page, limit)
	posts, total, err := s.repo.FindAll(ctx, page, limit)
	if err != nil {
		return nil, err
	}
	return &model.PaginatedResponse{Posts: posts, Total: total, Page: page, Limit: limit}, nil
}

// GetBySlug returns a single post by slug.
func (s *PostService) GetBySlug(ctx context.Context, slug string, publishedOnly bool) (*model.Post, error) {
	return s.repo.FindBySlug(ctx, slug, publishedOnly)
}

// Create validates and creates a new post.
func (s *PostService) Create(ctx context.Context, req model.CreatePostRequest) (*model.Post, error) {
	if err := validateCreateRequest(req); err != nil {
		return nil, err
	}

	// Check for duplicate slug
	existing, err := s.repo.FindBySlug(ctx, req.Slug, false)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, fmt.Errorf("slug already exists: %s", req.Slug)
	}

	post := &model.Post{
		Slug:      req.Slug,
		Title:     req.Title,
		Content:   req.Content,
		Photos:    req.Photos,
		Published: req.Published,
	}
	if err := s.repo.Create(ctx, post); err != nil {
		return nil, err
	}
	return post, nil
}

// Update applies partial updates to an existing post.
func (s *PostService) Update(ctx context.Context, slug string, req model.UpdatePostRequest) (*model.Post, error) {
	update := bson.M{}
	if req.Title != nil {
		title := strings.TrimSpace(*req.Title)
		if title == "" {
			return nil, fmt.Errorf("title cannot be empty")
		}
		update["title"] = title
	}
	if req.Content != nil {
		update["content"] = *req.Content
	}
	if req.Photos != nil {
		update["photos"] = *req.Photos
	}
	if req.Published != nil {
		update["published"] = *req.Published
	}
	if len(update) == 0 {
		return nil, fmt.Errorf("no fields to update")
	}

	if err := s.repo.Update(ctx, slug, update); err != nil {
		return nil, err
	}
	return s.repo.FindBySlug(ctx, slug, false)
}

// Delete removes a post by slug and returns the deleted post (for photo cleanup).
func (s *PostService) Delete(ctx context.Context, slug string) (*model.Post, error) {
	post, err := s.repo.FindBySlug(ctx, slug, false)
	if err != nil {
		return nil, err
	}
	if post == nil {
		return nil, fmt.Errorf("post not found: %s", slug)
	}
	if err := s.repo.Delete(ctx, slug); err != nil {
		return nil, err
	}
	return post, nil
}

// TruncateContent truncates post content for feed listings.
func TruncateContent(content string, maxLen int) string {
	if len(content) <= maxLen {
		return content
	}
	return content[:maxLen] + "..."
}

func validateCreateRequest(req model.CreatePostRequest) error {
	if strings.TrimSpace(req.Title) == "" {
		return fmt.Errorf("title is required")
	}
	if strings.TrimSpace(req.Slug) == "" {
		return fmt.Errorf("slug is required")
	}
	if !slugRegex.MatchString(req.Slug) {
		return fmt.Errorf("slug must be lowercase alphanumeric with hyphens (e.g. 'my-post')")
	}
	return nil
}

func normalizePagination(page, limit int) (int, int) {
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}
	return page, limit
}
```

- [ ] **Step 2: Create post service unit tests with a mock repository**

Create `backend/internal/service/post_test.go`:

```go
package service

import (
	"context"
	"testing"

	"github.com/anbangz/react_personal/backend/internal/model"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// mockPostRepo is a simple in-memory mock for testing.
type mockPostRepo struct {
	posts []model.Post
}

func (m *mockPostRepo) FindPublished(ctx context.Context, page, limit int) ([]model.Post, int64, error) {
	var result []model.Post
	for _, p := range m.posts {
		if p.Published {
			result = append(result, p)
		}
	}
	total := int64(len(result))
	start := (page - 1) * limit
	if start >= len(result) {
		return []model.Post{}, total, nil
	}
	end := start + limit
	if end > len(result) {
		end = len(result)
	}
	return result[start:end], total, nil
}

func (m *mockPostRepo) FindAll(ctx context.Context, page, limit int) ([]model.Post, int64, error) {
	total := int64(len(m.posts))
	start := (page - 1) * limit
	if start >= len(m.posts) {
		return []model.Post{}, total, nil
	}
	end := start + limit
	if end > len(m.posts) {
		end = len(m.posts)
	}
	return m.posts[start:end], total, nil
}

func (m *mockPostRepo) FindBySlug(ctx context.Context, slug string, publishedOnly bool) (*model.Post, error) {
	for i := range m.posts {
		if m.posts[i].Slug == slug {
			if publishedOnly && !m.posts[i].Published {
				return nil, nil
			}
			return &m.posts[i], nil
		}
	}
	return nil, nil
}

func (m *mockPostRepo) Create(ctx context.Context, post *model.Post) error {
	post.ID = primitive.NewObjectID()
	m.posts = append(m.posts, *post)
	return nil
}

func (m *mockPostRepo) Update(ctx context.Context, slug string, update bson.M) error {
	for i := range m.posts {
		if m.posts[i].Slug == slug {
			if title, ok := update["title"]; ok {
				m.posts[i].Title = title.(string)
			}
			if content, ok := update["content"]; ok {
				m.posts[i].Content = content.(string)
			}
			if published, ok := update["published"]; ok {
				m.posts[i].Published = published.(bool)
			}
			return nil
		}
	}
	return nil
}

func (m *mockPostRepo) Delete(ctx context.Context, slug string) error {
	for i := range m.posts {
		if m.posts[i].Slug == slug {
			m.posts = append(m.posts[:i], m.posts[i+1:]...)
			return nil
		}
	}
	return nil
}

func TestPostService_Create_Valid(t *testing.T) {
	repo := &mockPostRepo{}
	svc := NewPostService(repo)

	post, err := svc.Create(context.Background(), model.CreatePostRequest{
		Slug:      "hello-world",
		Title:     "Hello World",
		Content:   "# Hello",
		Published: true,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if post.Slug != "hello-world" {
		t.Errorf("expected slug 'hello-world', got '%s'", post.Slug)
	}
}

func TestPostService_Create_DuplicateSlug(t *testing.T) {
	repo := &mockPostRepo{}
	svc := NewPostService(repo)

	_, _ = svc.Create(context.Background(), model.CreatePostRequest{
		Slug: "hello-world", Title: "First", Published: true,
	})
	_, err := svc.Create(context.Background(), model.CreatePostRequest{
		Slug: "hello-world", Title: "Second", Published: true,
	})
	if err == nil {
		t.Fatal("expected error for duplicate slug")
	}
}

func TestPostService_Create_InvalidSlug(t *testing.T) {
	repo := &mockPostRepo{}
	svc := NewPostService(repo)

	_, err := svc.Create(context.Background(), model.CreatePostRequest{
		Slug: "Hello World!", Title: "Bad Slug", Published: true,
	})
	if err == nil {
		t.Fatal("expected error for invalid slug")
	}
}

func TestPostService_Create_EmptyTitle(t *testing.T) {
	repo := &mockPostRepo{}
	svc := NewPostService(repo)

	_, err := svc.Create(context.Background(), model.CreatePostRequest{
		Slug: "test", Title: "", Published: true,
	})
	if err == nil {
		t.Fatal("expected error for empty title")
	}
}

func TestTruncateContent(t *testing.T) {
	short := "hello"
	if TruncateContent(short, 300) != "hello" {
		t.Error("should not truncate short content")
	}
	long := make([]byte, 500)
	for i := range long {
		long[i] = 'a'
	}
	result := TruncateContent(string(long), 300)
	if len(result) != 303 { // 300 + "..."
		t.Errorf("expected length 303, got %d", len(result))
	}
}
```

- [ ] **Step 3: Run the tests**

```bash
cd backend && go test ./internal/service/ -v
```

Expected: All tests pass.

---

### Task 8: Implement photo service

**Files:**
- Create: `backend/internal/service/photo.go`
- Create: `backend/internal/service/photo_test.go`

- [ ] **Step 1: Create photo service**

Create `backend/internal/service/photo.go`:

```go
package service

import (
	"context"
	"fmt"
	"io"
	"path/filepath"
	"strings"
	"time"

	"github.com/anbangz/react_personal/backend/internal/model"
	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// S3API is the subset of the S3 client interface we use (for testability).
type S3API interface {
	PutObject(ctx context.Context, params *s3.PutObjectInput, optFns ...func(*s3.Options)) (*s3.PutObjectOutput, error)
	DeleteObject(ctx context.Context, params *s3.DeleteObjectInput, optFns ...func(*s3.Options)) (*s3.DeleteObjectOutput, error)
	ListObjectsV2(ctx context.Context, params *s3.ListObjectsV2Input, optFns ...func(*s3.Options)) (*s3.ListObjectsV2Output, error)
}

// PhotoService handles S3 photo operations.
type PhotoService struct {
	s3Client S3API
	bucket   string
	cdnURL   string // e.g. "https://photos.anbangz.me"
}

// NewPhotoService creates a new PhotoService.
func NewPhotoService(s3Client S3API, bucket string, cdnURL string) *PhotoService {
	return &PhotoService{s3Client: s3Client, bucket: bucket, cdnURL: cdnURL}
}

// Upload stores a photo in S3 and returns the CDN URL.
func (s *PhotoService) Upload(ctx context.Context, key string, contentType string, body io.Reader) (string, error) {
	key = sanitizeKey(key)
	_, err := s.s3Client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(key),
		Body:        body,
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return "", fmt.Errorf("upload to S3: %w", err)
	}
	return s.cdnURL + "/" + key, nil
}

// Delete removes a photo from S3.
func (s *PhotoService) Delete(ctx context.Context, key string) error {
	_, err := s.s3Client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("delete from S3: %w", err)
	}
	return nil
}

// List returns all photos in the S3 bucket.
func (s *PhotoService) List(ctx context.Context) ([]model.PhotoListItem, error) {
	var items []model.PhotoListItem
	paginator := s3.NewListObjectsV2Paginator(s.s3Client, &s3.ListObjectsV2Input{
		Bucket: aws.String(s.bucket),
	})

	for paginator.HasMorePages() {
		output, err := paginator.NextPage(ctx)
		if err != nil {
			return nil, fmt.Errorf("list S3 objects: %w", err)
		}
		for _, obj := range output.Contents {
			items = append(items, model.PhotoListItem{
				Key:          aws.ToString(obj.Key),
				URL:          s.cdnURL + "/" + aws.ToString(obj.Key),
				Size:         aws.ToInt64(obj.Size),
				LastModified: aws.ToTime(obj.LastModified),
			})
		}
	}
	if items == nil {
		items = []model.PhotoListItem{}
	}
	return items, nil
}

// KeyFromURL extracts the S3 key from a CDN URL.
func (s *PhotoService) KeyFromURL(url string) string {
	return strings.TrimPrefix(url, s.cdnURL+"/")
}

func sanitizeKey(key string) string {
	// Prefix with timestamp to avoid collisions
	ext := filepath.Ext(key)
	base := strings.TrimSuffix(filepath.Base(key), ext)
	// Replace spaces and special chars
	base = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '-' || r == '_' {
			return r
		}
		return '-'
	}, base)
	return fmt.Sprintf("%d-%s%s", time.Now().UnixMilli(), base, ext)
}
```

- [ ] **Step 2: Create photo service unit tests with a mock S3 client**

Create `backend/internal/service/photo_test.go`:

```go
package service

import (
	"bytes"
	"context"
	"io"
	"strings"
	"testing"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
)

type mockS3Client struct {
	objects map[string][]byte
}

func newMockS3() *mockS3Client {
	return &mockS3Client{objects: make(map[string][]byte)}
}

func (m *mockS3Client) PutObject(ctx context.Context, params *s3.PutObjectInput, optFns ...func(*s3.Options)) (*s3.PutObjectOutput, error) {
	data, _ := io.ReadAll(params.Body)
	m.objects[aws.ToString(params.Key)] = data
	return &s3.PutObjectOutput{}, nil
}

func (m *mockS3Client) DeleteObject(ctx context.Context, params *s3.DeleteObjectInput, optFns ...func(*s3.Options)) (*s3.DeleteObjectOutput, error) {
	delete(m.objects, aws.ToString(params.Key))
	return &s3.DeleteObjectOutput{}, nil
}

func (m *mockS3Client) ListObjectsV2(ctx context.Context, params *s3.ListObjectsV2Input, optFns ...func(*s3.Options)) (*s3.ListObjectsV2Output, error) {
	var contents []s3types.Object
	for key, data := range m.objects {
		size := int64(len(data))
		contents = append(contents, s3types.Object{
			Key:  aws.String(key),
			Size: &size,
		})
	}
	return &s3.ListObjectsV2Output{Contents: contents}, nil
}

func TestPhotoService_Upload(t *testing.T) {
	mock := newMockS3()
	svc := NewPhotoService(mock, "test-bucket", "https://photos.example.com")

	url, err := svc.Upload(context.Background(), "photo.jpg", "image/jpeg", bytes.NewReader([]byte("fake-image")))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.HasPrefix(url, "https://photos.example.com/") {
		t.Errorf("expected CDN URL prefix, got: %s", url)
	}
	if len(mock.objects) != 1 {
		t.Errorf("expected 1 object in mock, got %d", len(mock.objects))
	}
}

func TestPhotoService_List_Empty(t *testing.T) {
	mock := newMockS3()
	svc := NewPhotoService(mock, "test-bucket", "https://photos.example.com")

	items, err := svc.List(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 0 {
		t.Errorf("expected 0 items, got %d", len(items))
	}
}
```

- [ ] **Step 3: Run the tests**

```bash
cd backend && go test ./internal/service/ -v
```

Expected: All tests pass.

---

### Task 9: Implement middleware

**Files:**
- Create: `backend/internal/middleware/auth.go`
- Create: `backend/internal/middleware/cors.go`

- [ ] **Step 1: Create API key auth middleware**

Create `backend/internal/middleware/auth.go`:

```go
package middleware

import (
	"crypto/subtle"
	"encoding/json"
	"net/http"
)

// APIKeyAuth returns middleware that validates the X-API-Key header.
func APIKeyAuth(apiKey string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			provided := r.Header.Get("X-API-Key")
			if provided == "" {
				writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "missing X-API-Key header"})
				return
			}
			if subtle.ConstantTimeCompare([]byte(provided), []byte(apiKey)) != 1 {
				writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "invalid API key"})
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}
```

- [ ] **Step 2: Create CORS middleware**

Create `backend/internal/middleware/cors.go`:

```go
package middleware

import (
	"net/http"
)

// CORS returns middleware that sets CORS headers for the given origin.
func CORS(allowedOrigin string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-API-Key")
			w.Header().Set("Access-Control-Max-Age", "86400")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
```

- [ ] **Step 3: Verify compilation**

```bash
cd backend && go build ./internal/middleware/
```

Expected: No errors.

---

### Task 10: Implement HTTP handlers

**Files:**
- Create: `backend/internal/handler/health.go`
- Create: `backend/internal/handler/post.go`
- Create: `backend/internal/handler/photo.go`

- [ ] **Step 1: Create health handler**

Create `backend/internal/handler/health.go`:

```go
package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
)

// HealthHandler checks API and MongoDB health.
type HealthHandler struct {
	mongoClient *mongo.Client
}

// NewHealthHandler creates a new HealthHandler.
func NewHealthHandler(mongoClient *mongo.Client) *HealthHandler {
	return &HealthHandler{mongoClient: mongoClient}
}

func (h *HealthHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
	defer cancel()

	status := "ok"
	mongoStatus := "connected"

	if err := h.mongoClient.Ping(ctx, nil); err != nil {
		status = "degraded"
		mongoStatus = "disconnected: " + err.Error()
	}

	w.Header().Set("Content-Type", "application/json")
	if status != "ok" {
		w.WriteHeader(http.StatusServiceUnavailable)
	}
	json.NewEncoder(w).Encode(map[string]string{
		"status":  status,
		"mongodb": mongoStatus,
	})
}
```

- [ ] **Step 2: Create post handlers**

Create `backend/internal/handler/post.go`:

```go
package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/anbangz/react_personal/backend/internal/model"
	"github.com/anbangz/react_personal/backend/internal/service"
	"github.com/go-chi/chi/v5"
)

// PostHandler handles HTTP requests for blog posts.
type PostHandler struct {
	svc *service.PostService
}

// NewPostHandler creates a new PostHandler.
func NewPostHandler(svc *service.PostService) *PostHandler {
	return &PostHandler{svc: svc}
}

// ListPublished handles GET /posts
func (h *PostHandler) ListPublished(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	result, err := h.svc.ListPublished(r.Context(), page, limit)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	// Truncate content for feed
	for i := range result.Posts {
		result.Posts[i].Content = service.TruncateContent(result.Posts[i].Content, 300)
	}

	respondJSON(w, http.StatusOK, result)
}

// GetBySlug handles GET /posts/{slug}
func (h *PostHandler) GetBySlug(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	post, err := h.svc.GetBySlug(r.Context(), slug, true)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if post == nil {
		respondError(w, http.StatusNotFound, "post not found")
		return
	}
	respondJSON(w, http.StatusOK, post)
}

// ListAll handles GET /admin/posts
func (h *PostHandler) ListAll(w http.ResponseWriter, r *http.Request) {
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	result, err := h.svc.ListAll(r.Context(), page, limit)
	if err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, result)
}

// Create handles POST /admin/posts
func (h *PostHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req model.CreatePostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	post, err := h.svc.Create(r.Context(), req)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	respondJSON(w, http.StatusCreated, post)
}

// Update handles PUT /admin/posts/{slug}
func (h *PostHandler) Update(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	var req model.UpdatePostRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return
	}

	post, err := h.svc.Update(r.Context(), slug, req)
	if err != nil {
		respondError(w, http.StatusBadRequest, err.Error())
		return
	}
	respondJSON(w, http.StatusOK, post)
}

// Delete handles DELETE /admin/posts/{slug}
func (h *PostHandler) Delete(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "slug")
	_, err := h.svc.Delete(r.Context(), slug)
	if err != nil {
		respondError(w, http.StatusNotFound, err.Error())
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func respondJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func respondError(w http.ResponseWriter, status int, msg string) {
	respondJSON(w, status, model.ErrorResponse{Error: msg})
}
```

- [ ] **Step 3: Create photo handlers**

Create `backend/internal/handler/photo.go`:

```go
package handler

import (
	"fmt"
	"net/http"

	"github.com/anbangz/react_personal/backend/internal/service"
	"github.com/go-chi/chi/v5"
)

// PhotoHandler handles HTTP requests for photo management.
type PhotoHandler struct {
	svc *service.PhotoService
}

// NewPhotoHandler creates a new PhotoHandler.
func NewPhotoHandler(svc *service.PhotoService) *PhotoHandler {
	return &PhotoHandler{svc: svc}
}

// Upload handles POST /admin/photos (multipart/form-data)
func (h *PhotoHandler) Upload(w http.ResponseWriter, r *http.Request) {
	// Limit upload size to 10MB
	r.Body = http.MaxBytesReader(w, r.Body, 10<<20)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		respondError(w, http.StatusBadRequest, "file too large or invalid multipart form")
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		respondError(w, http.StatusBadRequest, "missing 'file' field: "+err.Error())
		return
	}
	defer file.Close()

	contentType := header.Header.Get("Content-Type")
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	url, err := h.svc.Upload(r.Context(), header.Filename, contentType, file)
	if err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("upload failed: %v", err))
		return
	}

	respondJSON(w, http.StatusCreated, map[string]string{"url": url})
}

// List handles GET /admin/photos
func (h *PhotoHandler) List(w http.ResponseWriter, r *http.Request) {
	items, err := h.svc.List(r.Context())
	if err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("list failed: %v", err))
		return
	}
	respondJSON(w, http.StatusOK, map[string]interface{}{"photos": items})
}

// Delete handles DELETE /admin/photos/{key}
func (h *PhotoHandler) Delete(w http.ResponseWriter, r *http.Request) {
	key := chi.URLParam(r, "*")
	if key == "" {
		respondError(w, http.StatusBadRequest, "missing photo key")
		return
	}

	if err := h.svc.Delete(r.Context(), key); err != nil {
		respondError(w, http.StatusInternalServerError, fmt.Sprintf("delete failed: %v", err))
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
```

- [ ] **Step 4: Verify compilation**

```bash
cd backend && go build ./internal/handler/
```

Expected: No errors.

---

### Task 11: Wire up router and Lambda entry point

**Files:**
- Create: `backend/internal/handler/router.go`
- Create: `backend/cmd/api/main.go`

- [ ] **Step 1: Create router wiring**

Create `backend/internal/handler/router.go`:

```go
package handler

import (
	"github.com/anbangz/react_personal/backend/internal/middleware"
	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"go.mongodb.org/mongo-driver/mongo"
)

// RouterConfig holds dependencies needed to build the router.
type RouterConfig struct {
	MongoClient   *mongo.Client
	PostHandler   *PostHandler
	PhotoHandler  *PhotoHandler
	APIKey        string
	AllowedOrigin string
}

// NewRouter builds the chi router with all routes and middleware.
func NewRouter(cfg RouterConfig) *chi.Mux {
	r := chi.NewRouter()

	// Global middleware
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.RequestID)
	r.Use(middleware.CORS(cfg.AllowedOrigin))

	// Health
	r.Get("/health", NewHealthHandler(cfg.MongoClient).ServeHTTP)

	// Public post endpoints
	r.Get("/posts", cfg.PostHandler.ListPublished)
	r.Get("/posts/{slug}", cfg.PostHandler.GetBySlug)

	// Admin endpoints (API key required)
	r.Route("/admin", func(r chi.Router) {
		r.Use(middleware.APIKeyAuth(cfg.APIKey))

		r.Get("/posts", cfg.PostHandler.ListAll)
		r.Post("/posts", cfg.PostHandler.Create)
		r.Put("/posts/{slug}", cfg.PostHandler.Update)
		r.Delete("/posts/{slug}", cfg.PostHandler.Delete)

		r.Post("/photos", cfg.PhotoHandler.Upload)
		r.Get("/photos", cfg.PhotoHandler.List)
		r.Delete("/photos/*", cfg.PhotoHandler.Delete)
	})

	return r
}
```

- [ ] **Step 2: Create the Lambda + local server entry point**

Create `backend/cmd/api/main.go`:

```go
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/anbangz/react_personal/backend/internal/handler"
	"github.com/anbangz/react_personal/backend/internal/repository"
	"github.com/anbangz/react_personal/backend/internal/service"
	"github.com/aws/aws-lambda-go/lambda"
	"github.com/awslabs/aws-lambda-go-api-proxy/httpadapter"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	local := flag.Bool("local", false, "run as local HTTP server instead of Lambda")
	port := flag.String("port", "8081", "local server port")
	flag.Parse()

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	// Config from environment
	mongoURI := mustEnv("MONGODB_URI")
	apiKey := mustEnv("API_KEY")
	s3Bucket := mustEnv("S3_BUCKET")
	cdnURL := mustEnv("PHOTOS_CDN_URL")
	allowedOrigin := getEnv("ALLOWED_ORIGIN", "https://anbangz.me")

	// Connect to MongoDB
	mongoClient, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("mongodb connect: %v", err)
	}
	if err := mongoClient.Ping(ctx, nil); err != nil {
		log.Fatalf("mongodb ping: %v", err)
	}
	log.Println("Connected to MongoDB")

	dbName := getEnv("MONGODB_DATABASE", "anbangz_blog_prod")
	collection := mongoClient.Database(dbName).Collection("posts")

	// Build services
	postRepo := repository.NewMongoPostRepository(collection)
	postSvc := service.NewPostService(postRepo)

	// S3 client
	awsCfg, err := awsconfig.LoadDefaultConfig(ctx)
	if err != nil {
		log.Fatalf("aws config: %v", err)
	}
	s3Client := s3.NewFromConfig(awsCfg)
	photoSvc := service.NewPhotoService(s3Client, s3Bucket, cdnURL)

	// Build router
	router := handler.NewRouter(handler.RouterConfig{
		MongoClient:   mongoClient,
		PostHandler:   handler.NewPostHandler(postSvc),
		PhotoHandler:  handler.NewPhotoHandler(photoSvc),
		APIKey:        apiKey,
		AllowedOrigin: allowedOrigin,
	})

	if *local {
		addr := fmt.Sprintf(":%s", *port)
		log.Printf("Starting local server on %s", addr)
		log.Fatal(http.ListenAndServe(addr, router))
	} else {
		lambda.Start(httpadapter.NewV2(router).ProxyWithContext)
	}
}

func mustEnv(key string) string {
	val := os.Getenv(key)
	if val == "" {
		log.Fatalf("required environment variable %s is not set", key)
	}
	return val
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
```

- [ ] **Step 4: Verify compilation**

```bash
cd backend && go build ./cmd/api/
```

Expected: Compiles successfully.

- [ ] **Step 5: Commit the backend**

```bash
git add backend/
git commit -m "feat: add Go backend with post/photo API, MongoDB repo, and Lambda handler"
```

---

## Phase 3: Terraform Infrastructure

### Task 12: Add Secrets Manager resources

**Files:**
- Create: `infrastructure-terraform/mongodb-secrets.tf`

- [ ] **Step 1: Create Secrets Manager secrets**

Create `infrastructure-terraform/mongodb-secrets.tf`:

```hcl
################################################################################
# Secrets Manager — Backend API secrets
################################################################################

resource "aws_secretsmanager_secret" "DevBackendMongoDBURI" {
  name        = "dev/blog-api/mongodb-uri"
  description = "MongoDB Atlas connection URI for the dev blog API"
}

resource "aws_secretsmanager_secret" "ProdBackendMongoDBURI" {
  name        = "prod/blog-api/mongodb-uri"
  description = "MongoDB Atlas connection URI for the prod blog API"
}

resource "aws_secretsmanager_secret" "DevBackendAPIKey" {
  name        = "dev/blog-api/api-key"
  description = "Admin API key for the dev blog API"
}

resource "aws_secretsmanager_secret" "ProdBackendAPIKey" {
  name        = "prod/blog-api/api-key"
  description = "Admin API key for the prod blog API"
}
```

Note: Secret **values** are set manually via the AWS Console or CLI after Terraform creates the secret resources. Never put secret values in Terraform code.

---

### Task 13: Add S3 photo buckets and CloudFront distributions

**Files:**
- Create: `infrastructure-terraform/s3-photos.tf`

- [ ] **Step 1: Create photo S3 buckets and CloudFront distributions**

Create `infrastructure-terraform/s3-photos.tf`:

```hcl
################################################################################
# S3 Photo Buckets
################################################################################

resource "aws_s3_bucket" "DevPhotoBucket" {
  bucket = "dev-photos.${var.website_domain}"
}

resource "aws_s3_bucket_public_access_block" "DevPhotoBucketPublicAccess" {
  bucket = aws_s3_bucket.DevPhotoBucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket" "ProdPhotoBucket" {
  bucket = "photos.${var.website_domain}"
}

resource "aws_s3_bucket_public_access_block" "ProdPhotoBucketPublicAccess" {
  bucket = aws_s3_bucket.ProdPhotoBucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

################################################################################
# CloudFront Origin Access Controls for Photo Buckets
################################################################################

resource "aws_cloudfront_origin_access_control" "PhotoOAC" {
  name                              = "photo-bucket-oac"
  description                       = "OAC for photo S3 buckets"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

################################################################################
# S3 Bucket Policies — allow CloudFront OAC access
################################################################################

resource "aws_s3_bucket_policy" "DevPhotoBucketPolicy" {
  bucket = aws_s3_bucket.DevPhotoBucket.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontOAC"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.DevPhotoBucket.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.DevPhotoDistribution.arn
        }
      }
    }]
  })
}

resource "aws_s3_bucket_policy" "ProdPhotoBucketPolicy" {
  bucket = aws_s3_bucket.ProdPhotoBucket.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontOAC"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.ProdPhotoBucket.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.ProdPhotoDistribution.arn
        }
      }
    }]
  })
}

################################################################################
# CloudFront Distributions for Photos
################################################################################

resource "aws_cloudfront_distribution" "DevPhotoDistribution" {
  enabled = true
  origin {
    domain_name              = aws_s3_bucket.DevPhotoBucket.bucket_regional_domain_name
    origin_id                = "S3-dev-photos"
    origin_access_control_id = aws_cloudfront_origin_access_control.PhotoOAC.id
  }

  price_class = "PriceClass_All"
  aliases     = ["dev-photos.${var.website_domain}"]

  lifecycle {
    ignore_changes = [web_acl_id]
  }

  default_cache_behavior {
    target_origin_id       = "S3-dev-photos"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # Managed-CachingOptimized
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.PersonalWebsiteSSLCertificate.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}

resource "aws_cloudfront_distribution" "ProdPhotoDistribution" {
  enabled = true
  origin {
    domain_name              = aws_s3_bucket.ProdPhotoBucket.bucket_regional_domain_name
    origin_id                = "S3-prod-photos"
    origin_access_control_id = aws_cloudfront_origin_access_control.PhotoOAC.id
  }

  price_class = "PriceClass_All"
  aliases     = ["photos.${var.website_domain}"]

  lifecycle {
    ignore_changes = [web_acl_id]
  }

  default_cache_behavior {
    target_origin_id       = "S3-prod-photos"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # Managed-CachingOptimized
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.PersonalWebsiteSSLCertificate.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }
}

################################################################################
# Route53 Records for Photo CDN
################################################################################

resource "aws_route53_record" "DevPhotoRecordSet" {
  zone_id = aws_route53_zone.PersonalWebsiteHostedZone.zone_id
  name    = "dev-photos.${var.website_domain}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.DevPhotoDistribution.domain_name
    zone_id                = aws_cloudfront_distribution.DevPhotoDistribution.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "ProdPhotoRecordSet" {
  zone_id = aws_route53_zone.PersonalWebsiteHostedZone.zone_id
  name    = "photos.${var.website_domain}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.ProdPhotoDistribution.domain_name
    zone_id                = aws_cloudfront_distribution.ProdPhotoDistribution.hosted_zone_id
    evaluate_target_health = false
  }
}
```

---

### Task 14: Add Lambda functions, IAM roles, and API Gateway

**Files:**
- Create: `infrastructure-terraform/lambda.tf`
- Create: `infrastructure-terraform/api-gateway.tf`

- [ ] **Step 1: Create Lambda functions and IAM roles**

Create `infrastructure-terraform/lambda.tf`:

```hcl
################################################################################
# Lambda IAM Roles
################################################################################

resource "aws_iam_role" "DevBackendAPILambdaRole" {
  name = "DevBackendAPILambdaRole"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "DevBackendAPILambdaPolicy" {
  name = "DevBackendAPILambdaPolicy"
  role = aws_iam_role.DevBackendAPILambdaRole.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "CloudWatchLogs"
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:${data.aws_caller_identity.current.account_id}:*"
      },
      {
        Sid      = "S3PhotoAccess"
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:DeleteObject", "s3:ListBucket", "s3:GetObject"]
        Resource = ["${aws_s3_bucket.DevPhotoBucket.arn}", "${aws_s3_bucket.DevPhotoBucket.arn}/*"]
      },
      {
        Sid      = "SecretsAccess"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [aws_secretsmanager_secret.DevBackendMongoDBURI.arn, aws_secretsmanager_secret.DevBackendAPIKey.arn]
      }
    ]
  })
}

resource "aws_iam_role" "BackendAPILambdaRole" {
  name = "BackendAPILambdaRole"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "BackendAPILambdaPolicy" {
  name = "BackendAPILambdaPolicy"
  role = aws_iam_role.BackendAPILambdaRole.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "CloudWatchLogs"
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:${data.aws_caller_identity.current.account_id}:*"
      },
      {
        Sid      = "S3PhotoAccess"
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:DeleteObject", "s3:ListBucket", "s3:GetObject"]
        Resource = ["${aws_s3_bucket.ProdPhotoBucket.arn}", "${aws_s3_bucket.ProdPhotoBucket.arn}/*"]
      },
      {
        Sid      = "SecretsAccess"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [aws_secretsmanager_secret.ProdBackendMongoDBURI.arn, aws_secretsmanager_secret.ProdBackendAPIKey.arn]
      }
    ]
  })
}

################################################################################
# Lambda Functions
################################################################################

# Placeholder zip — the real binary is deployed by the backend pipeline.
# On first terraform apply, create a dummy zip so the resource can be created.
# The pipeline will overwrite it immediately after.

resource "aws_lambda_function" "DevBackendAPIHandler" {
  function_name = "DevBackendAPIHandler"
  role          = aws_iam_role.DevBackendAPILambdaRole.arn
  handler       = "bootstrap"
  runtime       = "provided.al2023"
  architectures = ["x86_64"]
  timeout       = 30
  memory_size   = 128

  # Initial dummy — pipeline replaces this
  filename         = "${path.module}/lambda-placeholder.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda-placeholder.zip")

  environment {
    variables = {
      MONGODB_URI     = "PLACEHOLDER_SET_VIA_SECRETS"
      API_KEY         = "PLACEHOLDER_SET_VIA_SECRETS"
      MONGODB_DATABASE = "anbangz_blog_dev"
      S3_BUCKET       = aws_s3_bucket.DevPhotoBucket.bucket
      PHOTOS_CDN_URL  = "https://dev-photos.${var.website_domain}"
      ALLOWED_ORIGIN  = "https://dev.${var.website_domain}"
    }
  }

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}

resource "aws_lambda_function" "BackendAPIHandler" {
  function_name = "BackendAPIHandler"
  role          = aws_iam_role.BackendAPILambdaRole.arn
  handler       = "bootstrap"
  runtime       = "provided.al2023"
  architectures = ["x86_64"]
  timeout       = 30
  memory_size   = 128

  filename         = "${path.module}/lambda-placeholder.zip"
  source_code_hash = filebase64sha256("${path.module}/lambda-placeholder.zip")

  environment {
    variables = {
      MONGODB_URI     = "PLACEHOLDER_SET_VIA_SECRETS"
      API_KEY         = "PLACEHOLDER_SET_VIA_SECRETS"
      MONGODB_DATABASE = "anbangz_blog_prod"
      S3_BUCKET       = aws_s3_bucket.ProdPhotoBucket.bucket
      PHOTOS_CDN_URL  = "https://photos.${var.website_domain}"
      ALLOWED_ORIGIN  = "https://${var.website_domain}"
    }
  }

  lifecycle {
    ignore_changes = [filename, source_code_hash]
  }
}
```

Note: Before the first `terraform apply`, create a placeholder zip:

```bash
cd infrastructure-terraform
echo "placeholder" > bootstrap
zip lambda-placeholder.zip bootstrap
rm bootstrap
echo "lambda-placeholder.zip" >> ../.gitignore
```

The Lambda env vars show `PLACEHOLDER_SET_VIA_SECRETS` — the actual `main.go` reads secrets from Secrets Manager at startup. Alternatively, the env vars can be updated post-deploy to reference Secrets Manager ARNs. The simplest approach for now: update the Lambda env vars manually (or via a follow-up Terraform change) to use the actual secret values after secrets are populated.

- [ ] **Step 2: Create API Gateway and custom domains**

Create `infrastructure-terraform/api-gateway.tf`:

```hcl
################################################################################
# API Gateway HTTP APIs
################################################################################

resource "aws_apigatewayv2_api" "DevBackendAPI" {
  name          = "DevBackendAPI"
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_api" "BackendAPI" {
  name          = "BackendAPI"
  protocol_type = "HTTP"
}

################################################################################
# Lambda Integrations
################################################################################

resource "aws_apigatewayv2_integration" "DevBackendIntegration" {
  api_id                 = aws_apigatewayv2_api.DevBackendAPI.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.DevBackendAPIHandler.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "BackendIntegration" {
  api_id                 = aws_apigatewayv2_api.BackendAPI.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.BackendAPIHandler.invoke_arn
  payload_format_version = "2.0"
}

################################################################################
# Routes — catch-all to Lambda
################################################################################

resource "aws_apigatewayv2_route" "DevBackendCatchAll" {
  api_id    = aws_apigatewayv2_api.DevBackendAPI.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.DevBackendIntegration.id}"
}

resource "aws_apigatewayv2_route" "BackendCatchAll" {
  api_id    = aws_apigatewayv2_api.BackendAPI.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.BackendIntegration.id}"
}

################################################################################
# Stages (auto-deploy)
################################################################################

resource "aws_apigatewayv2_stage" "DevBackendStage" {
  api_id      = aws_apigatewayv2_api.DevBackendAPI.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_apigatewayv2_stage" "BackendStage" {
  api_id      = aws_apigatewayv2_api.BackendAPI.id
  name        = "$default"
  auto_deploy = true
}

################################################################################
# Lambda Permissions — allow API Gateway to invoke Lambda
################################################################################

resource "aws_lambda_permission" "DevBackendAPIGatewayInvoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.DevBackendAPIHandler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.DevBackendAPI.execution_arn}/*/*"
}

resource "aws_lambda_permission" "BackendAPIGatewayInvoke" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.BackendAPIHandler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.BackendAPI.execution_arn}/*/*"
}

################################################################################
# Custom Domain Names
################################################################################

resource "aws_apigatewayv2_domain_name" "DevAPIDomain" {
  domain_name = "dev-api.${var.website_domain}"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate.PersonalWebsiteSSLCertificate.arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

resource "aws_apigatewayv2_domain_name" "ProdAPIDomain" {
  domain_name = "api.${var.website_domain}"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate.PersonalWebsiteSSLCertificate.arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

################################################################################
# API Mappings
################################################################################

resource "aws_apigatewayv2_api_mapping" "DevAPIMapping" {
  api_id      = aws_apigatewayv2_api.DevBackendAPI.id
  domain_name = aws_apigatewayv2_domain_name.DevAPIDomain.id
  stage       = aws_apigatewayv2_stage.DevBackendStage.id
}

resource "aws_apigatewayv2_api_mapping" "ProdAPIMapping" {
  api_id      = aws_apigatewayv2_api.BackendAPI.id
  domain_name = aws_apigatewayv2_domain_name.ProdAPIDomain.id
  stage       = aws_apigatewayv2_stage.BackendStage.id
}

################################################################################
# Route53 Records for API
################################################################################

resource "aws_route53_record" "DevAPIRecordSet" {
  zone_id = aws_route53_zone.PersonalWebsiteHostedZone.zone_id
  name    = "dev-api.${var.website_domain}"
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.DevAPIDomain.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.DevAPIDomain.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "ProdAPIRecordSet" {
  zone_id = aws_route53_zone.PersonalWebsiteHostedZone.zone_id
  name    = "api.${var.website_domain}"
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.ProdAPIDomain.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.ProdAPIDomain.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = false
  }
}
```

Note: API Gateway HTTP API custom domains require the ACM cert to be in the **same region** as the API Gateway (us-west-2). The existing cert is in us-east-1 (for CloudFront). A new regional cert may be needed. If so, add:

```hcl
resource "aws_acm_certificate" "RegionalAPICert" {
  # Default provider is us-west-2
  domain_name               = "anbangz.me"
  subject_alternative_names = ["*.anbangz.me"]
  validation_method         = "DNS"
}

resource "aws_acm_certificate_validation" "RegionalAPICertValidation" {
  certificate_arn         = aws_acm_certificate.RegionalAPICert.arn
  validation_record_fqdns = [aws_route53_record.PersonalWebsiteSSLCertificateRecordSet.fqdn]
}
```

And reference `aws_acm_certificate.RegionalAPICert.arn` in the domain name configurations instead. The DNS validation record is already created by the existing cert (same domain, same validation), so no new Route53 record is needed.

---

### Task 15: Add backend CI/CD pipeline

**Files:**
- Create: `infrastructure-terraform/buildspec-backend-build.yml`
- Create: `infrastructure-terraform/buildspec-backend-deploy.yml`
- Create: `infrastructure-terraform/codebuild-backend.tf`
- Create: `infrastructure-terraform/codepipeline-backend.tf`

- [ ] **Step 1: Create backend build buildspec**

Create `infrastructure-terraform/buildspec-backend-build.yml`:

```yaml
version: 0.2

phases:
  install:
    runtime-versions:
      golang: 1.22
  build:
    commands:
      - cd backend
      - GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -tags lambda.norpc -o bin/bootstrap ./cmd/api/
      - cd bin && zip function.zip bootstrap

artifacts:
  base-directory: backend/bin
  files:
    - function.zip
```

- [ ] **Step 2: Create backend deploy buildspec**

Create `infrastructure-terraform/buildspec-backend-deploy.yml`:

```yaml
version: 0.2

phases:
  build:
    commands:
      - aws lambda update-function-code --function-name $LAMBDA_FUNCTION_NAME --zip-file fileb://function.zip

artifacts:
  files: []
```

- [ ] **Step 3: Create backend CodeBuild projects**

Create `infrastructure-terraform/codebuild-backend.tf`:

```hcl
################################################################################
# Backend API CodeBuild Projects
################################################################################

resource "aws_codebuild_project" "BackendAPIBuild" {
  name         = "BackendAPIBuild"
  description  = "Compiles Go backend binary for Lambda"
  service_role = aws_iam_role.PersonalWebsiteCodebuildRole.arn

  environment {
    compute_type = "BUILD_GENERAL1_SMALL"
    type         = "LINUX_CONTAINER"
    image        = "aws/codebuild/standard:7.0"
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "infrastructure-terraform/buildspec-backend-build.yml"
  }

  artifacts {
    type = "CODEPIPELINE"
  }
}

resource "aws_codebuild_project" "BackendAPIDeploy" {
  name         = "BackendAPIDeploy"
  description  = "Deploys Go binary to Lambda function"
  service_role = aws_iam_role.PersonalWebsiteCodebuildRole.arn

  environment {
    compute_type = "BUILD_GENERAL1_SMALL"
    type         = "LINUX_CONTAINER"
    image        = "aws/codebuild/standard:7.0"

    environment_variable {
      name  = "LAMBDA_FUNCTION_NAME"
      value = aws_lambda_function.BackendAPIHandler.function_name
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "infrastructure-terraform/buildspec-backend-deploy.yml"
  }

  artifacts {
    type = "CODEPIPELINE"
  }
}
```

- [ ] **Step 4: Create backend pipeline**

Create `infrastructure-terraform/codepipeline-backend.tf`:

```hcl
################################################################################
# Backend API Pipeline
################################################################################

resource "aws_codepipeline" "BackendAPIPipeline" {
  name          = "BackendAPIPipeline"
  role_arn      = aws_iam_role.PersonalWebsitePipelineRole.arn
  pipeline_type = "V2"

  artifact_store {
    location = aws_s3_bucket.PersonalWebsitePipelineBucket.bucket
    type     = "S3"
  }

  trigger {
    provider_type = "CodeStarSourceConnection"

    git_configuration {
      source_action_name = "Source"

      push {
        branches {
          includes = ["master"]
        }

        file_paths {
          includes = ["backend/**"]
        }
      }
    }
  }

  stage {
    name = "Source"
    action {
      name             = "Source"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        ConnectionArn    = aws_codestarconnections_connection.github.arn
        FullRepositoryId = "anbangz/react_personal"
        BranchName       = "master"
        DetectChanges    = "false"
      }
    }
  }

  stage {
    name = "Build"
    action {
      name             = "Build"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["source_output"]
      output_artifacts = ["build_output"]

      configuration = {
        ProjectName = aws_codebuild_project.BackendAPIBuild.name
      }
    }
  }

  stage {
    name = "DeployDev"
    action {
      name            = "DeployDev"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      version         = "1"
      input_artifacts = ["build_output"]

      configuration = {
        ProjectName          = aws_codebuild_project.BackendAPIDeploy.name
        EnvironmentVariables = jsonencode([{
          name  = "LAMBDA_FUNCTION_NAME"
          value = aws_lambda_function.DevBackendAPIHandler.function_name
          type  = "PLAINTEXT"
        }])
      }
    }
  }

  stage {
    name = "DeployProd"
    action {
      name            = "DeployProd"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      version         = "1"
      input_artifacts = ["build_output"]

      configuration = {
        ProjectName = aws_codebuild_project.BackendAPIDeploy.name
      }
    }
  }
}
```

---

### Task 16: Update TerraformCodeBuildPolicy with new IAM permissions

**Files:**
- Modify: `infrastructure-terraform/codebuild-terraform.tf`

- [ ] **Step 1: Add new IAM permission statements to TerraformCodeBuildPolicy**

Add the following statements to the `TerraformCodeBuildPolicy` policy JSON in `infrastructure-terraform/codebuild-terraform.tf`, inside the `Statement` array (before the closing `]`):

```json
    {
      "Sid": "LambdaManagement",
      "Effect": "Allow",
      "Action": [
        "lambda:CreateFunction",
        "lambda:GetFunction",
        "lambda:GetFunctionConfiguration",
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration",
        "lambda:DeleteFunction",
        "lambda:AddPermission",
        "lambda:RemovePermission",
        "lambda:GetPolicy",
        "lambda:ListVersionsByFunction",
        "lambda:TagResource",
        "lambda:UntagResource",
        "lambda:ListTags"
      ],
      "Resource": "*"
    },
    {
      "Sid": "APIGatewayManagement",
      "Effect": "Allow",
      "Action": [
        "apigateway:GET",
        "apigateway:POST",
        "apigateway:PUT",
        "apigateway:PATCH",
        "apigateway:DELETE"
      ],
      "Resource": "*"
    },
    {
      "Sid": "SecretsManagerManagement",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:CreateSecret",
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:DeleteSecret",
        "secretsmanager:PutSecretValue",
        "secretsmanager:TagResource",
        "secretsmanager:UntagResource",
        "secretsmanager:GetResourcePolicy",
        "secretsmanager:PutResourcePolicy",
        "secretsmanager:DeleteResourcePolicy"
      ],
      "Resource": "*"
    }
```

Also extend the `IAMManagement` statement's `Resource` array to allow the new Lambda roles:

```json
"Resource": [
  "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/PersonalWebsite*",
  "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/Terraform*",
  "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/DevBackendAPI*",
  "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/BackendAPI*"
]
```

And extend `S3BucketManagement` resources to include the photo buckets:

```json
"Resource": [
  "arn:aws:s3:::${var.website_domain}",
  "arn:aws:s3:::www.${var.website_domain}",
  "arn:aws:s3:::dev.${var.website_domain}",
  "arn:aws:s3:::photos.${var.website_domain}",
  "arn:aws:s3:::dev-photos.${var.website_domain}",
  "${aws_s3_bucket.PersonalWebsitePipelineBucket.arn}",
  "${aws_s3_bucket.TerraformStateBucket.arn}"
]
```

Also add `lambda:UpdateFunctionCode` to the `PersonalWebsiteCodebuildPolicy` in `codebuild.tf` so the deploy CodeBuild project can update Lambda:

```json
{
  "Effect": "Allow",
  "Action": ["lambda:UpdateFunctionCode"],
  "Resource": [
    "${aws_lambda_function.DevBackendAPIHandler.arn}",
    "${aws_lambda_function.BackendAPIHandler.arn}"
  ]
}
```

- [ ] **Step 2: Commit infrastructure changes**

```bash
git add infrastructure-terraform/
git commit -m "feat: add Terraform infrastructure for backend API (Lambda, API Gateway, S3, Secrets)"
```

---

## Phase 4: Frontend Changes

### Task 17: Update TypeScript types

**Files:**
- Modify: `frontend/src/blog/types.ts`

- [ ] **Step 1: Replace types.ts with new data model**

Replace `frontend/src/blog/types.ts` with:

```typescript
export interface Photo {
  src: string;
  caption?: string;
  order: number;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  photos: Photo[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedPostsResponse {
  posts: BlogPost[];
  total: number;
  page: number;
  limit: number;
}
```

---

### Task 18: Create API client module

**Files:**
- Create: `frontend/src/api/client.ts`

- [ ] **Step 1: Create the API client**

Create `frontend/src/api/client.ts`:

```typescript
import { BlogPost, PaginatedPostsResponse } from "../blog/types";

function getApiBaseUrl(): string {
  const hostname = window.location.hostname;
  if (hostname === "anbangz.me" || hostname === "www.anbangz.me") {
    return "https://api.anbangz.me";
  }
  if (hostname === "dev.anbangz.me") {
    return "https://dev-api.anbangz.me";
  }
  // Local development
  return "http://localhost:8081";
}

const API_BASE = getApiBaseUrl();

async function fetchJSON<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${response.status}`);
  }
  return response.json();
}

export async function fetchPosts(
  page: number = 1,
  limit: number = 10
): Promise<PaginatedPostsResponse> {
  return fetchJSON<PaginatedPostsResponse>(
    `/posts?page=${page}&limit=${limit}`
  );
}

export async function fetchPost(slug: string): Promise<BlogPost> {
  return fetchJSON<BlogPost>(`/posts/${slug}`);
}
```

---

### Task 19: Update BlogPostCard component

**Files:**
- Modify: `frontend/src/components/blog-post/BlogPost.tsx`
- Modify: `frontend/src/components/blog-post/BlogPost.css`

- [ ] **Step 1: Rewrite BlogPostCard for new data model**

Replace `frontend/src/components/blog-post/BlogPost.tsx` with:

```typescript
import * as React from "react";
import ReactMarkdown from "react-markdown";
import { BlogPost, Photo } from "../../blog/types";
import "./BlogPost.css";

interface BlogPostCardProps {
  post: BlogPost;
  onPhotoClick?: (photoIndex: number) => void;
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};

export const BlogPostCard: React.FunctionComponent<BlogPostCardProps> = ({
  post,
  onPhotoClick,
}) => {
  const heroPhoto: Photo | undefined = post.photos?.[0];
  const hasPhotos = post.photos && post.photos.length > 0;

  return (
    <article className="blog-post">
      <div className="blog-post__meta">
        <time className="blog-post__date" dateTime={post.createdAt}>
          {formatDate(post.createdAt)}
        </time>
      </div>
      <h2 className="blog-post__title">{post.title}</h2>

      {heroPhoto && (
        <button
          className="blog-post__photo-btn"
          onClick={() => onPhotoClick?.(0)}
          aria-label={`View photo: ${heroPhoto.caption || post.title}`}
        >
          <img
            className="blog-post__photo"
            src={heroPhoto.src}
            alt={heroPhoto.caption || post.title}
          />
        </button>
      )}

      {heroPhoto?.caption && (
        <p className="blog-post__caption">{heroPhoto.caption}</p>
      )}

      {hasPhotos && post.photos.length > 1 && (
        <div className="blog-post__gallery-hint">
          +{post.photos.length - 1} more photo{post.photos.length > 2 ? "s" : ""}
        </div>
      )}

      {post.content && post.content.trim() && (
        <div className="blog-post__body">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>
      )}
    </article>
  );
};
```

- [ ] **Step 2: Add gallery hint style to BlogPost.css**

Append to `frontend/src/components/blog-post/BlogPost.css`:

```css
.blog-post__gallery-hint {
  font-size: 0.85rem;
  color: #888;
  margin-bottom: 0.75rem;
}
```

---

### Task 20: Update Lightbox component

**Files:**
- Modify: `frontend/src/components/lightbox/Lightbox.tsx`

- [ ] **Step 1: Update Lightbox to accept Photo[] instead of BlogPost[]**

Replace `frontend/src/components/lightbox/Lightbox.tsx` with:

```typescript
import * as React from "react";
import { Photo } from "../../blog/types";
import "./Lightbox.css";

interface LightboxProps {
  photos: Photo[];
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export const Lightbox: React.FunctionComponent<LightboxProps> = ({
  photos,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}) => {
  const photo = photos[currentIndex];

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onPrev, onNext]);

  if (!photo) return null;

  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Photo lightbox" onClick={onClose}>
      <button className="lightbox__close" onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="Close">
        &#x2715;
      </button>

      {photos.length > 1 && (
        <button
          className="lightbox__arrow lightbox__arrow--prev"
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          aria-label="Previous photo"
        >
          &#x2039;
        </button>
      )}

      <div className="lightbox__content" onClick={(e) => e.stopPropagation()}>
        <img
          className="lightbox__image"
          src={photo.src}
          alt={photo.caption || "Photo"}
        />
        {photo.caption && (
          <p className="lightbox__caption">{photo.caption}</p>
        )}
      </div>

      {photos.length > 1 && (
        <button
          className="lightbox__arrow lightbox__arrow--next"
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          aria-label="Next photo"
        >
          &#x203A;
        </button>
      )}

      <div className="lightbox__counter">
        {currentIndex + 1} / {photos.length}
      </div>
    </div>
  );
};
```

---

### Task 21: Update Blog feed page with API fetching and pagination

**Files:**
- Modify: `frontend/src/views/blog/Blog.tsx`
- Modify: `frontend/src/views/blog/Blog.css`

- [ ] **Step 1: Rewrite Blog.tsx with data fetching**

Replace `frontend/src/views/blog/Blog.tsx` with:

```typescript
import * as React from "react";
import { Link } from "react-router-dom";
import { BlogPost, Photo } from "../../blog/types";
import { BlogPostCard } from "../../components/blog-post/BlogPost";
import { Lightbox } from "../../components/lightbox/Lightbox";
import { Footer } from "../footer/Footer";
import { fetchPosts } from "../../api/client";
import "./Blog.css";

const POSTS_PER_PAGE = 10;

export const Blog = () => {
  const [posts, setPosts] = React.useState<BlogPost[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxPhotos, setLightboxPhotos] = React.useState<Photo[]>([]);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchPosts(page, POSTS_PER_PAGE)
      .then((result) => {
        if (!cancelled) {
          setPosts(result.posts);
          setTotal(result.total);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [page]);

  const handlePhotoClick = React.useCallback(
    (post: BlogPost, photoIndex: number) => {
      if (post.photos && post.photos.length > 0) {
        setLightboxPhotos(post.photos);
        setLightboxIndex(photoIndex);
        setLightboxOpen(true);
      }
    },
    []
  );

  const handlePrev = React.useCallback(
    () => setLightboxIndex((i) => (i - 1 + lightboxPhotos.length) % lightboxPhotos.length),
    [lightboxPhotos.length]
  );

  const handleNext = React.useCallback(
    () => setLightboxIndex((i) => (i + 1) % lightboxPhotos.length),
    [lightboxPhotos.length]
  );

  const totalPages = Math.ceil(total / POSTS_PER_PAGE);

  return (
    <div>
      <section className="section">
        <div className="container">
          <div className="blog-feed">
            <h1>Blog</h1>
            <hr />

            {loading && <p className="blog-feed__loading">Loading...</p>}

            {error && (
              <div className="blog-feed__error">
                <p>Failed to load posts: {error}</p>
                <button
                  className="button is-small"
                  onClick={() => setPage(page)}
                >
                  Retry
                </button>
              </div>
            )}

            {!loading && !error && posts.length === 0 && (
              <p className="blog-feed__empty">
                No posts yet. Check back soon.
              </p>
            )}

            {!loading &&
              !error &&
              posts.map((post) => (
                <div key={post.slug}>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="blog-feed__post-link"
                  >
                    <h2 className="blog-post__title">{post.title}</h2>
                  </Link>
                  <BlogPostCard
                    post={post}
                    onPhotoClick={(idx) => handlePhotoClick(post, idx)}
                  />
                </div>
              ))}

            {!loading && !error && totalPages > 1 && (
              <nav className="blog-feed__pagination" aria-label="Pagination">
                <button
                  className="button is-small"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </button>
                <span className="blog-feed__page-info">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="button is-small"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </button>
              </nav>
            )}
          </div>
        </div>
      </section>

      {lightboxOpen && lightboxPhotos.length > 0 && (
        <Lightbox
          photos={lightboxPhotos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}

      <Footer />
    </div>
  );
};
```

- [ ] **Step 2: Add pagination and loading styles to Blog.css**

Replace `frontend/src/views/blog/Blog.css` with:

```css
.blog-feed {
  max-width: 720px;
  margin: 0 auto;
}

.blog-feed__empty,
.blog-feed__loading {
  color: #888;
  font-style: italic;
}

.blog-feed__error {
  color: #cc0000;
  margin-bottom: 1rem;
}

.blog-feed__post-link {
  text-decoration: none;
  color: inherit;
}

.blog-feed__post-link:hover .blog-post__title {
  color: #3273dc;
}

.blog-feed__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #e8e8e8;
}

.blog-feed__page-info {
  font-size: 0.9rem;
  color: #666;
}
```

---

### Task 22: Create individual blog post page

**Files:**
- Create: `frontend/src/views/blog-post/BlogPostPage.tsx`
- Create: `frontend/src/views/blog-post/BlogPostPage.css`

- [ ] **Step 1: Create BlogPostPage component**

Create `frontend/src/views/blog-post/BlogPostPage.tsx`:

```typescript
import * as React from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { BlogPost, Photo } from "../../blog/types";
import { Lightbox } from "../../components/lightbox/Lightbox";
import { Footer } from "../footer/Footer";
import { fetchPost } from "../../api/client";
import "./BlogPostPage.css";

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};

export const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = React.useState<BlogPost | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);

  React.useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchPost(slug)
      .then((result) => {
        if (!cancelled) {
          setPost(result);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [slug]);

  const handlePrev = React.useCallback(
    () => setLightboxIndex((i) => {
      const photos = post?.photos || [];
      return (i - 1 + photos.length) % photos.length;
    }),
    [post]
  );

  const handleNext = React.useCallback(
    () => setLightboxIndex((i) => {
      const photos = post?.photos || [];
      return (i + 1) % photos.length;
    }),
    [post]
  );

  if (loading) {
    return (
      <div>
        <section className="section">
          <div className="container">
            <div className="blog-post-page">
              <p className="blog-post-page__loading">Loading...</p>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div>
        <section className="section">
          <div className="container">
            <div className="blog-post-page">
              <p className="blog-post-page__error">
                {error || "Post not found."}
              </p>
              <Link to="/blog" className="button is-small">
                Back to Blog
              </Link>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  const photos: Photo[] = post.photos || [];

  return (
    <div>
      <section className="section">
        <div className="container">
          <div className="blog-post-page">
            <Link to="/blog" className="blog-post-page__back">
              &larr; Back to Blog
            </Link>

            <article>
              <time
                className="blog-post-page__date"
                dateTime={post.createdAt}
              >
                {formatDate(post.createdAt)}
              </time>
              <h1 className="blog-post-page__title">{post.title}</h1>

              {photos.length > 0 && (
                <div className="blog-post-page__gallery">
                  {photos.map((photo, idx) => (
                    <button
                      key={idx}
                      className="blog-post-page__gallery-btn"
                      onClick={() => {
                        setLightboxIndex(idx);
                        setLightboxOpen(true);
                      }}
                      aria-label={`View photo: ${photo.caption || `Photo ${idx + 1}`}`}
                    >
                      <img
                        className="blog-post-page__gallery-img"
                        src={photo.src}
                        alt={photo.caption || `Photo ${idx + 1}`}
                      />
                    </button>
                  ))}
                </div>
              )}

              {post.content && post.content.trim() && (
                <div className="blog-post-page__body">
                  <ReactMarkdown>{post.content}</ReactMarkdown>
                </div>
              )}
            </article>
          </div>
        </div>
      </section>

      {lightboxOpen && photos.length > 0 && (
        <Lightbox
          photos={photos}
          currentIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onPrev={handlePrev}
          onNext={handleNext}
        />
      )}

      <Footer />
    </div>
  );
};
```

- [ ] **Step 2: Create BlogPostPage.css**

Create `frontend/src/views/blog-post/BlogPostPage.css`:

```css
.blog-post-page {
  max-width: 720px;
  margin: 0 auto;
}

.blog-post-page__back {
  display: inline-block;
  margin-bottom: 1.5rem;
  color: #3273dc;
  text-decoration: none;
}

.blog-post-page__back:hover {
  text-decoration: underline;
}

.blog-post-page__date {
  font-size: 0.8rem;
  color: #888;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.blog-post-page__title {
  margin-top: 0.25rem !important;
  margin-bottom: 1.5rem !important;
}

.blog-post-page__gallery {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.blog-post-page__gallery-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  flex: 1 1 calc(50% - 0.25rem);
  max-width: calc(50% - 0.25rem);
}

.blog-post-page__gallery-img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 3px;
  transition: opacity 0.2s;
}

.blog-post-page__gallery-btn:hover .blog-post-page__gallery-img {
  opacity: 0.9;
}

.blog-post-page__body {
  color: #333;
  line-height: 1.7;
}

.blog-post-page__body p {
  margin-bottom: 0.75rem;
}

.blog-post-page__loading,
.blog-post-page__error {
  color: #888;
  font-style: italic;
}

.blog-post-page__error {
  color: #cc0000;
  margin-bottom: 1rem;
}
```

---

### Task 23: Update App.tsx routing and clean up old data

**Files:**
- Modify: `frontend/src/App.tsx`
- Delete: `frontend/src/blog/posts/` (entire directory)

- [ ] **Step 1: Add /blog/:slug route to App.tsx**

Replace `frontend/src/App.tsx` with:

```typescript
import * as React from "react";

import { BrowserRouter, Routes, Route } from "react-router-dom";

import { Homepage } from "./views/home/Homepage";
import { Blog } from "./views/blog/Blog";
import { BlogPostPage } from "./views/blog-post/BlogPostPage";
import { Navbar } from "./views/navbar/Navbar";

// App-wide CSS import
import "./App.css";

export const App = () => (
  <BrowserRouter>
    <div className="app-layout">
      <div className="app-layout__navbar">
        <Navbar />
      </div>
      <div className="app-layout__body">
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPostPage />} />
        </Routes>
      </div>
    </div>
  </BrowserRouter>
);
```

- [ ] **Step 2: Delete old hardcoded blog data**

```bash
rm -rf frontend/src/blog/posts/
```

This removes `index.ts`, `welcome.md`, and `the-end-of-trust-but-verify.md`.

- [ ] **Step 3: Remove blog placeholder images (used only by old blog posts)**

```bash
rm frontend/src/static/images/portrait.jpg
rm frontend/src/static/images/amazon-scout.jpg
```

The remaining images (`amazon-logo.jpg`, `berkeley-seal.jpg`, `riptide-logo.jpg`) are used by other parts of the site and stay.

- [ ] **Step 4: Verify the frontend builds**

```bash
cd frontend && npm run build
```

Expected: Build succeeds with zero errors.

- [ ] **Step 5: Commit frontend changes**

```bash
git add -A
git commit -m "feat: update frontend to fetch blog data from backend API"
```

---

### Task 24: Visual verification with Playwright

- [ ] **Step 1: Start the frontend dev server**

```bash
cd frontend && npm start &
```

Wait for it to be ready on http://localhost:8080.

- [ ] **Step 2: Verify homepage loads correctly**

Use Playwright MCP to navigate to `http://localhost:8080` and take a screenshot. Confirm:
- Homepage renders (TitleBanner, ThisSite, Resume, Roadmap, ContactMe, Footer)
- No console errors
- Navbar links work

- [ ] **Step 3: Verify blog page renders (with loading/error state)**

Navigate to `http://localhost:8080/blog`. Since no backend is running locally, expect to see the error state ("Failed to load posts") with a Retry button. This confirms the API client is wired up and the error handling works.

- [ ] **Step 4: Stop the dev server**

```bash
kill %1
```

---

### Task 25: Update AGENTS.md with final structure and commit all

- [ ] **Step 1: Final review of AGENTS.md**

Ensure AGENTS.md reflects:
- New repo structure (`frontend/`, `backend/`, `infrastructure-terraform/`)
- Updated development commands for both frontend and backend
- Backend-specific conventions (Go patterns, Lambda deployment)
- New infrastructure resources (API Gateway, Lambda, S3 photos, Secrets Manager)
- Updated CI/CD pipeline descriptions (3 pipelines: app, backend, terraform)

- [ ] **Step 2: Final commit**

```bash
git add -A
git commit -m "docs: update AGENTS.md for monorepo structure with backend"
```

---

## Post-Implementation Manual Steps

These steps require manual action outside of code and are not automated:

1. **MongoDB Atlas**: Create free tier M0 cluster, create `anbangz_blog_dev` and `anbangz_blog_prod` databases, create a database user, whitelist 0.0.0.0/0.
2. **Secrets Manager**: Set secret values via AWS Console/CLI for all 4 secrets (dev/prod MongoDB URI and API key).
3. **Lambda env vars**: After secrets are populated, update Lambda env vars to use the actual secret values (or modify `main.go` to read from Secrets Manager directly, which is the recommended approach).
4. **Lambda placeholder zip**: Create `infrastructure-terraform/lambda-placeholder.zip` before first `terraform apply`.
5. **ACM regional cert**: If the existing us-east-1 cert doesn't work for API Gateway in us-west-2, create the regional cert resource as noted in Task 14.
6. **Seed data**: Use the admin API to create initial blog posts from the old hardcoded content.
