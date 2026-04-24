# Blog Redesign: Editorial List Feed — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the blog feed from an inline-reading archive to a title-first editorial list of compact cards, and reorder the post page to title-first layout.

**Architecture:** Add a `summary` field to the backend Post model. Rewrite the frontend feed card component to show cover image + title + summary + date. Update the post page to render title above date. No new endpoints or routes.

**Tech Stack:** Go 1.24, MongoDB, React 18, TypeScript, Bulma CSS, plain CSS with BEM naming.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/internal/model/post.go` | Modify | Add `Summary` field to `Post`, `CreatePostRequest`, `UpdatePostRequest` |
| `backend/internal/service/post.go` | Modify | Map `Summary` in `Create` |
| `backend/internal/service/post_test.go` | Modify | Update mock `Update` to handle `summary`; add test for summary in create |
| `frontend/src/blog/types.ts` | Modify | Add `summary?: string` to `BlogPost` |
| `frontend/src/components/blog-post/BlogPost.tsx` | Rewrite | New `BlogFeedCard` component |
| `frontend/src/components/blog-post/BlogPost.css` | Rewrite | New card styles |
| `frontend/src/views/blog/Blog.tsx` | Modify | Use new card, entire card as link, remove inline content |
| `frontend/src/views/blog/Blog.css` | Modify | Adjust feed styles |
| `frontend/src/views/blog-post/BlogPostPage.tsx` | Modify | Reorder to title-first |
| `frontend/src/views/blog-post/BlogPostPage.css` | Modify | Adjust visual hierarchy |

---

### Task 1: Add `summary` field to backend model

**Files:**
- Modify: `backend/internal/model/post.go`

- [ ] **Step 1: Add `Summary` to `Post` struct**

In `backend/internal/model/post.go`, add `Summary` after `Content`:

```go
type Post struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Slug      string             `bson:"slug" json:"slug"`
	Title     string             `bson:"title" json:"title"`
	Summary   string             `bson:"summary,omitempty" json:"summary,omitempty"`
	Content   string             `bson:"content" json:"content"`
	Photos    []Photo            `bson:"photos,omitempty" json:"photos"`
	Published bool               `bson:"published" json:"published"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time          `bson:"updatedAt" json:"updatedAt"`
}
```

- [ ] **Step 2: Add `Summary` to `CreatePostRequest`**

```go
type CreatePostRequest struct {
	Slug      string  `json:"slug"`
	Title     string  `json:"title"`
	Summary   string  `json:"summary,omitempty"`
	Content   string  `json:"content"`
	Photos    []Photo `json:"photos,omitempty"`
	Published bool    `json:"published"`
}
```

- [ ] **Step 3: Add `Summary` to `UpdatePostRequest`**

```go
type UpdatePostRequest struct {
	Title     *string  `json:"title,omitempty"`
	Summary   *string  `json:"summary,omitempty"`
	Content   *string  `json:"content,omitempty"`
	Photos    *[]Photo `json:"photos,omitempty"`
	Published *bool    `json:"published,omitempty"`
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/internal/model/post.go
git commit -m "feat(backend): add summary field to Post model and request types"
```

---

### Task 2: Wire `summary` through service layer

**Files:**
- Modify: `backend/internal/service/post.go`
- Modify: `backend/internal/service/post_test.go`

- [ ] **Step 1: Map `Summary` in `Create` method**

In `backend/internal/service/post.go`, update the `Create` method's post construction (around line 66-72):

```go
	post := &model.Post{
		Slug:      req.Slug,
		Title:     req.Title,
		Summary:   req.Summary,
		Content:   req.Content,
		Photos:    req.Photos,
		Published: req.Published,
	}
```

- [ ] **Step 2: Handle `Summary` in `Update` method**

In `backend/internal/service/post.go`, add summary handling in the `Update` method, after the `Content` block (around line 91):

```go
	if req.Summary != nil {
		update["summary"] = *req.Summary
	}
```

- [ ] **Step 3: Update mock `Update` in test to handle `summary`**

In `backend/internal/service/post_test.go`, update the mock `Update` method (around line 67-83) to handle the summary field:

```go
func (m *mockPostRepo) Update(ctx context.Context, slug string, update bson.M) error {
	for i := range m.posts {
		if m.posts[i].Slug == slug {
			if title, ok := update["title"]; ok {
				m.posts[i].Title = title.(string)
			}
			if summary, ok := update["summary"]; ok {
				m.posts[i].Summary = summary.(string)
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
```

- [ ] **Step 4: Add test for summary in create**

Append to `backend/internal/service/post_test.go`:

```go
func TestPostService_Create_WithSummary(t *testing.T) {
	repo := &mockPostRepo{}
	svc := NewPostService(repo)

	post, err := svc.Create(context.Background(), model.CreatePostRequest{
		Slug:      "summary-test",
		Title:     "Summary Test",
		Summary:   "A short summary for the feed.",
		Content:   "# Full content here",
		Published: true,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if post.Summary != "A short summary for the feed." {
		t.Errorf("expected summary to be set, got %q", post.Summary)
	}
}
```

- [ ] **Step 5: Run tests**

Run: `cd backend && make test`
Expected: All tests pass, including the new `TestPostService_Create_WithSummary`.

- [ ] **Step 6: Commit**

```bash
git add backend/internal/service/post.go backend/internal/service/post_test.go
git commit -m "feat(backend): wire summary field through service layer"
```

---

### Task 3: Add `summary` to frontend types

**Files:**
- Modify: `frontend/src/blog/types.ts`

- [ ] **Step 1: Add `summary` to `BlogPost` interface**

Update `frontend/src/blog/types.ts`:

```typescript
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  content: string;
  photos: Photo[];
  published: boolean;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/blog/types.ts
git commit -m "feat(frontend): add summary field to BlogPost type"
```

---

### Task 4: Rewrite `BlogFeedCard` component

**Files:**
- Rewrite: `frontend/src/components/blog-post/BlogPost.tsx`
- Rewrite: `frontend/src/components/blog-post/BlogPost.css`

- [ ] **Step 1: Rewrite `BlogPost.tsx` as `BlogFeedCard`**

Replace the entire contents of `frontend/src/components/blog-post/BlogPost.tsx`:

```tsx
import * as React from "react";
import { BlogPost } from "../../blog/types";
import "./BlogPost.css";

interface BlogFeedCardProps {
  post: BlogPost;
}

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
};

const truncateContent = (content: string, maxLen: number): string => {
  const runes = Array.from(content);
  if (runes.length <= maxLen) {
    return content;
  }
  return runes.slice(0, maxLen).join("") + "...";
};

export const BlogFeedCard: React.FunctionComponent<BlogFeedCardProps> = ({
  post,
}) => {
  const coverPhoto = post.photos?.[0];
  const summary = post.summary || truncateContent(post.content || "", 160);

  return (
    <article className="blog-feed-card">
      {coverPhoto && (
        <div className="blog-feed-card__image-wrapper">
          <img
            className="blog-feed-card__image"
            src={coverPhoto.src}
            alt={coverPhoto.caption || post.title}
          />
        </div>
      )}
      <div className="blog-feed-card__text">
        <h2 className="blog-feed-card__title">{post.title}</h2>
        {summary && (
          <p className="blog-feed-card__summary">{summary}</p>
        )}
        <time
          className="blog-feed-card__date"
          dateTime={post.createdAt}
        >
          {formatDate(post.createdAt)}
        </time>
      </div>
    </article>
  );
};
```

- [ ] **Step 2: Rewrite `BlogPost.css` for card layout**

Replace the entire contents of `frontend/src/components/blog-post/BlogPost.css`:

```css
.blog-feed-card {
  display: flex;
  flex-direction: row;
  gap: 1rem;
  align-items: flex-start;
  border: 1px solid var(--border-default);
  border-radius: 12px;
  padding: 1rem;
  transition: box-shadow 0.2s, border-color 0.2s;
}

.blog-feed-card:hover {
  border-color: var(--link-color);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.blog-feed-card__image-wrapper {
  flex-shrink: 0;
  width: 150px;
  height: 100px;
  overflow: hidden;
  border-radius: 8px;
}

.blog-feed-card__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.blog-feed-card__text {
  flex: 1;
  min-width: 0;
}

.blog-feed-card__title {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0 !important;
  color: var(--text-primary);
}

.blog-feed-card__summary {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0 0 0.75rem 0;
  line-height: 1.5;
}

.blog-feed-card__date {
  font-size: 0.75rem;
  color: var(--text-muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* Responsive: stack on small screens */
@media screen and (max-width: 600px) {
  .blog-feed-card {
    flex-direction: column;
  }

  .blog-feed-card__image-wrapper {
    width: 100%;
    height: 180px;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/blog-post/BlogPost.tsx frontend/src/components/blog-post/BlogPost.css
git commit -m "feat(frontend): rewrite BlogFeedCard as compact editorial card"
```

---

### Task 5: Update blog feed page to use new card

**Files:**
- Modify: `frontend/src/views/blog/Blog.tsx`
- Modify: `frontend/src/views/blog/Blog.css`

- [ ] **Step 1: Rewrite `Blog.tsx` to use `BlogFeedCard`**

Replace the entire contents of `frontend/src/views/blog/Blog.tsx`:

```tsx
import * as React from "react";
import { Link } from "react-router-dom";
import { BlogPost } from "../../blog/types";
import { BlogFeedCard } from "../../components/blog-post/BlogPost";
import { Footer } from "../footer/Footer";
import { fetchPosts } from "../../api/client";
import "./Blog.css";

const POSTS_PER_PAGE = 10;

export const Blog = () => {
  const [posts, setPosts] = React.useState<BlogPost[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [reloadToken, setReloadToken] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

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
  }, [page, reloadToken]);

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
                  onClick={() => setReloadToken((token) => token + 1)}
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
                <Link
                  key={post.slug}
                  to={`/blog/${post.slug}`}
                  className="blog-feed__post-link"
                >
                  <BlogFeedCard post={post} />
                </Link>
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

      <Footer />
    </div>
  );
};
```

Key changes from current:
- Removed `lightboxOpen`, `lightboxPhotos`, `lightboxIndex` state and all lightbox handlers.
- Removed `Lightbox` component import and render.
- Entire card is wrapped in a `<Link>`, no separate title link.
- Uses `BlogFeedCard` instead of `BlogPostCard`.
- No `onPhotoClick` prop — photos are not interactive on the feed.

- [ ] **Step 2: Update `Blog.css`**

Replace the entire contents of `frontend/src/views/blog/Blog.css`:

```css
.blog-feed {
  max-width: 720px;
  margin: 0 auto;
}

.blog-feed__empty,
.blog-feed__loading {
  color: var(--text-muted);
  font-style: italic;
}

.blog-feed__error {
  color: var(--text-error);
  margin-bottom: 1rem;
}

.blog-feed__post-link {
  display: block;
  text-decoration: none;
  color: inherit;
  margin-bottom: 1rem;
}

.blog-feed__post-link:hover {
  text-decoration: none;
}

.blog-feed__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-default);
}

.blog-feed__page-info {
  font-size: 0.9rem;
  color: var(--text-muted);
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/blog/Blog.tsx frontend/src/views/blog/Blog.css
git commit -m "feat(frontend): update blog feed to use editorial card layout"
```

---

### Task 6: Update blog post page to title-first layout

**Files:**
- Modify: `frontend/src/views/blog-post/BlogPostPage.tsx`
- Modify: `frontend/src/views/blog-post/BlogPostPage.css`

- [ ] **Step 1: Reorder `BlogPostPage.tsx` to title-first**

Replace the entire contents of `frontend/src/views/blog-post/BlogPostPage.tsx`:

```tsx
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
              <h1 className="blog-post-page__title">{post.title}</h1>
              <time
                className="blog-post-page__date"
                dateTime={post.createdAt}
              >
                {formatDate(post.createdAt)}
              </time>

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

The only structural change: `<h1>` title now renders before `<time>` date (previously date was first).

- [ ] **Step 2: Update `BlogPostPage.css` for title-first spacing**

Replace the entire contents of `frontend/src/views/blog-post/BlogPostPage.css`:

```css
.blog-post-page {
  max-width: 720px;
  margin: 0 auto;
}

.blog-post-page__back {
  display: inline-block;
  margin-bottom: 1.5rem;
  color: var(--link-color);
  text-decoration: none;
}

.blog-post-page__back:hover {
  text-decoration: underline;
}

.blog-post-page__title {
  margin-top: 0 !important;
  margin-bottom: 0.5rem !important;
}

.blog-post-page__date {
  display: block;
  font-size: 0.8rem;
  color: var(--text-muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 1.5rem;
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
  color: var(--text-primary);
  line-height: 1.7;
}

.blog-post-page__body p {
  margin-bottom: 0.75rem;
}

.blog-post-page__loading,
.blog-post-page__error {
  color: var(--text-muted);
  font-style: italic;
}

.blog-post-page__error {
  color: var(--text-error);
  margin-bottom: 1rem;
}
```

Key change: `__date` gets `display: block` and `margin-bottom: 1.5rem` to create visual separation between date and gallery, since it now sits below the title instead of above it.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/blog-post/BlogPostPage.tsx frontend/src/views/blog-post/BlogPostPage.css
git commit -m "feat(frontend): reorder blog post page to title-first layout"
```

---

### Task 7: Build verification and visual check

**Files:** None (verification only)

- [ ] **Step 1: Run backend tests**

Run: `cd backend && make test`
Expected: All tests pass.

- [ ] **Step 2: Run frontend build**

Run: `cd frontend && npm run build`
Expected: Build succeeds with zero errors.

- [ ] **Step 3: Start dev server and visually verify**

Run: `cd frontend && npm start`

Verify in browser at `http://localhost:8080/blog`:
- Feed shows compact cards with cover image, title, summary, and date.
- Title is the most prominent element on each card.
- Date is small and at the bottom of the card text.
- Entire card is clickable and navigates to post page.
- No lightbox triggers on the feed.
- Cards stack vertically on narrow viewports.

Verify at `http://localhost:8080/blog/:slug`:
- Title renders first, then date, then photos, then body.
- Lightbox still works on the post page.
- Back link still works.

- [ ] **Step 4: Self-review all changed files**

Audit for:
- TypeScript hygiene (no `any`, explicit types)
- Accessibility (`alt` on images, `aria-label` on buttons, `dateTime` on `<time>`)
- BEM naming consistency
- Dark mode compatibility (all colors use CSS variables)
- No unused imports or dead code

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address review findings from blog redesign"
```
