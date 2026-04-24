# Blog Redesign: Editorial List Feed

**Date:** 2026-04-23
**Status:** Draft

---

## Problem

The current blog feed renders full post content inline, making `/blog` a reading page rather than a discovery page. Dates appear above titles, diminishing the user's ability to scan by topic. There is no summary field — the full markdown body is the only preview.

## Design Direction

**Editorial List** — a title-first, single-column feed of compact cards. Each card has one cover photo, a prominent title, a short summary, and quiet date metadata. The feed helps readers choose a story quickly; the post page is where reading happens.

---

## User Experience

- `/blog` is a discovery page, not a reading page.
- Each post appears as a compact card. The title is the strongest visual signal.
- The cover image supports recognition and tone but does not outrank the title.
- Clicking anywhere on a card navigates to `/blog/:slug`.
- Full post content lives only on the post page.

## Page Structure

### `/blog` (Feed)

- Page heading ("Blog") with optional short intro.
- Single-column list of `BlogFeedCard` components.
- No featured/promoted post treatment initially (can be layered in later).
- Pagination stays, visually lighter than the cards.

### `/blog/:slug` (Post Page)

- Large title first.
- Date below the title, not above.
- Lead photo or photo gallery near the top.
- Full markdown body beneath.
- Back-to-blog link, visually understated.
- Lightbox remains for viewing photos at full size.

## BlogFeedCard Layout

```
┌──────────────────────────────────────────────┐
│ ┌─────────┐                                  │
│ │  Cover   │  Title (strong, 1.05rem bold)    │
│ │  Photo   │                                  │
│ │ 150×96   │  Summary (0.9rem, 2-4 lines)     │
│ │          │                                  │
│ └─────────┘  Apr 2026 (0.75rem, muted)        │
└──────────────────────────────────────────────┘
```

- Desktop: horizontal card (image left, text right).
- Mobile: stacked (image on top, text below).
- Entire card is a `<Link>` to the post page.
- Image uses consistent aspect ratio across all cards.
- No lightbox trigger on the feed.
- No inline markdown rendering on the feed.

## BlogPostPage Layout (Updated)

```
← Back to Blog

Title (h1, large)
April 23, 2026 (date, muted, below title)

[Lead photo — larger display]
[Additional photos — gallery or inline]

Body content (markdown)
```

Key changes from current:
- Title moves above date (currently date is above title).
- Photo placement stays similar but the visual ordering is title → date → photos → body.

## Content Model

### New field: `summary`

A short string (1-3 sentences) written for the feed, separate from `content`.

**Backend (`Post` struct in Go):**
```go
Summary string `bson:"summary,omitempty" json:"summary,omitempty"`
```

**Frontend (`BlogPost` interface):**
```typescript
summary?: string;
```

**API behavior:**
- `summary` is included in both list and detail responses.
- If `summary` is empty, the feed card falls back to truncating `content` to ~160 characters.
- `CreatePostRequest` and `UpdatePostRequest` gain a `summary` field.

### Cover image

- The first photo in `photos[]` (by `order`) is the cover image.
- No new field needed — determined by array position.

### Existing fields unchanged

`id`, `slug`, `title`, `content`, `photos`, `published`, `createdAt`, `updatedAt` — all stay as-is.

## Component Changes

| Component | Action | Notes |
|-----------|--------|-------|
| `BlogPostCard` (`components/blog-post/`) | Rewrite | Becomes `BlogFeedCard`: cover image + title + summary + date. No inline markdown. |
| `BlogPost.css` | Rewrite | New card styles for horizontal layout with responsive stacking. |
| `Blog.tsx` (`views/blog/`) | Update | Remove inline content rendering. Use new card component. Entire card is a link. |
| `Blog.css` | Update | Adjust feed layout, lighter pagination. |
| `BlogPostPage.tsx` (`views/blog-post/`) | Update | Reorder: title first, date second, photos below, body last. |
| `BlogPostPage.css` | Update | Adjust visual hierarchy for new ordering. |
| `types.ts` (`blog/`) | Update | Add `summary?: string` to `BlogPost`. |
| `client.ts` (`api/`) | No change | API client already fetches full post objects. |

## Backend Changes

| File | Action | Notes |
|------|--------|-------|
| `model/post.go` | Update | Add `Summary` to `Post`, `CreatePostRequest`, `UpdatePostRequest`. |
| `repository/post.go` | No change | MongoDB driver handles new field automatically. |
| `service/post.go` | No change | Pass-through; no summary-specific logic. |
| `handler/post.go` | No change | Serialization picks up new field from model. |

## Styling Approach

- Continue using co-located CSS with BEM naming.
- Use existing CSS variables (`--text-primary`, `--text-muted`, `--border-default`, etc.) for theming.
- Card border and radius follow existing patterns (see current `BlogPost.css`).
- Image aspect ratio enforced via `object-fit: cover` with fixed height.
- Responsive breakpoint: stack card vertically below ~600px viewport width.

## What Gets Removed

- Full markdown rendering in the feed.
- Gallery hint text in the feed card.
- Photo lightbox trigger in the feed.
- Date-first visual ordering on both feed and post page.

## What Stays

- Pagination logic and controls.
- Lightbox on the post page.
- React Router structure (`/blog`, `/blog/:slug`).
- Bulma layout classes (`.section`, `.container`).
- Dark mode theming via CSS variables.
- Accessibility patterns (aria-labels, semantic HTML, alt text).

## Out of Scope

- Featured/promoted post treatment (future enhancement).
- Tag or category system.
- Search or filtering.
- Infinite scroll (pagination stays).
- RSS feed.
