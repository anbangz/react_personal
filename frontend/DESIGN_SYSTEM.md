# Design System — Anbang Zhang Personal Website

> This document captures the design principles, visual language, and implementation patterns used across the frontend. Future agents should reference this when building new features or components to maintain consistency.

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Tech Stack](#tech-stack)
3. [Theming & Color System](#theming--color-system)
4. [Typography](#typography)
5. [Layout & Spacing](#layout--spacing)
6. [Component Patterns](#component-patterns)
7. [Accessibility Standards](#accessibility-standards)
8. [Animation & Motion](#animation--motion)
9. [File Organization](#file-organization)
10. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

---

## Design Philosophy

- **Clean & Minimal**: The site prioritizes content readability over visual flourish. White/light backgrounds with strong typographic hierarchy.
- **Berkeley Identity**: Primary accent colors come from UC Berkeley's brand palette (navy, gold). This creates personal brand consistency.
- **Content-First**: The homepage is a single scrollable page with anchored sections. Blog is a separate route with its own feed + detail pages.
- **Progressive Enhancement**: Dark mode is a visual enhancement, not required. All content is fully accessible in either theme.
- **Mobile-First Responsive**: The navbar breakpoint at 1023px is the primary responsive divider. Layouts use `flex-wrap` to reflow on narrow viewports.

---

## Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | React | 18.x | Functional components + hooks only |
| Language | TypeScript | 5.7.x | `noImplicitAny: true`. No `.js` files in `src/` |
| Router | React Router | v6 | `<Routes>`, `<Route>`, `useParams`, `useLocation` |
| CSS Framework | Custom CSS | — | `base.css` + component CSS |
| Icons | FontAwesome | 5.3.1 (CDN) + 6.7.2 (npm) | CDN for base JS; `@fortawesome/react-fontawesome` for React integration |
| Bundler | Webpack | 5.x | Custom `webpack.config.js` |
| Styling | Plain CSS | — | CSS files co-located with components. No CSS-in-JS |

**Key dependencies to know about:**
- `react-markdown` — used for blog post content rendering

---

## Theming & Color System

### Theme Architecture

- Theme state is managed by `ThemeContext` (`frontend/src/context/ThemeContext.tsx`)
- `data-theme="light" | "dark"` is set on `document.documentElement`
- Initial theme: checks `localStorage` → falls back to `prefers-color-scheme: dark` → defaults to `light`
- **All theme transitions are animated** via a global CSS rule (see [Animation & Motion](#animation--motion))

### Berkeley Brand Colors (Static)

These do NOT change between themes:

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-berkeley-navy` | `#003262` | Title banner background, AboutMe background |
| `--color-berkeley-metallic-gold` | `#c4820e` | `<hr>` dividers |
| `--color-berkeley-california-gold` | `#fdb515` | (defined but rarely used) |
| `--color-berkeley-founders-blue` | `#3b7ea1` | (defined but rarely used) |

### Semantic Color Tokens (Theme-Aware)

Defined in `App.css` `:root` and overridden in `[data-theme="dark"]`:

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--bg-page` | `#ffffff` | `#060f1c` | Page background |
| `--bg-surface` | `#f5f5f5` | `#0e1e35` | Elevated surfaces, navbar hover |
| `--bg-footer` | `hsl(0,0%,90%)` | `#060f1c` | Footer background |
| `--text-primary` | `#333333` | `#dce8f5` | Body text, headings |
| `--text-secondary` | `#666666` | `#7fb3d8` | Secondary text |
| `--text-muted` | `#888888` | `#a0bcd4` | Loading states, captions, hints |
| `--text-error` | `#cc0000` | `#cc4444` | Error messages |
| `--border-default` | `#e8e8e8` | `#1a3050` | Dividers, card borders |
| `--link-color` | `#3273dc` | `#3a7fc1` | `<a>` tags |

### Dark Mode Override Patterns

When overriding components for dark mode, use this pattern:

```css
[data-theme="dark"] .site-nav {
  background-color: var(--bg-page);
}

[data-theme="dark"] .site-nav__item,
[data-theme="dark"] .site-nav__toggle {
  color: var(--text-primary);
}

[data-theme="dark"] .site-nav__item:hover,
[data-theme="dark"] .site-nav__item:focus,
[data-theme="dark"] .site-nav__item.active {
  background-color: var(--bg-surface);
  color: var(--text-primary);
}
```

For `.button` elements, see `base.css` for the full override pattern.

---

## Typography

### Base Scale

Defined in `App.css`:

| Element | Size |
|---------|------|
| `h1` | `2rem` |
| `h2` | `1.5rem` |
| `h3` | `1.25rem` |

### Usage Patterns

- **Section headings** (`<h1>`): Used for major section titles ("Experience", "Education", "Blog")
- **Card/Item titles** (`<h2>`): Used for resume items, blog post titles
- **Subtitles** (`<h3>`): Job titles, dates, secondary labels
- **Body text**: `1rem` (`16px`). Line-height `1.7` in blog content areas
- **Meta text** (dates, captions): `0.8rem`–`0.9rem`, `color: var(--text-muted)`, often `text-transform: uppercase` with `letter-spacing: 0.04em`

### Font Family

System font stack: BlinkMacSystemFont, -apple-system, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", Helvetica, Arial, sans-serif. **Do not introduce custom web fonts.**

---

## Layout & Spacing

### Page Structure

```
App
├── Navbar (sticky/fixed, always visible)
├── AppContent (router outlet)
│   ├── Homepage
│   │   ├── TitleBanner (full-width, navy bg)
│   │   ├── ThisSite (section + container)
│   │   ├── Resume (section + container)
│   │   ├── ContactMe (section + container)
│   │   └── Footer (full-width, footer bg)
│   ├── Blog (section + container + Footer)
│   └── BlogPostPage (section + container + Footer)
```

### Custom Layout Patterns

- **Centered flex row with wrap**: `display: flex; flex-direction: row; flex-wrap: wrap; align-items: center; justify-content: center;` — used in TitleBanner, ResumeItem, AboutMe
- **Max-width content**: Blog and BlogPostPage use `max-width: 720px; margin: 0 auto;` for readable line lengths
- **Reverse layout**: ResumeItem uses `.experience-item--reverse` with `flex-direction: row-reverse` for alternating left/right image placement

---

## Component Patterns

### Component Structure Convention

Every component follows this structure:

```tsx
// frontend/src/views/<section>/<Section>.tsx
import * as React from "react";
import "./Section.css";           // Co-located CSS

export const Section = () => {
  return (
    <div id="section-id" className="section container">
      <h1>Title</h1>
      <hr />
      {/* content */}
    </div>
  );
};
```

### CSS Class Naming

- **BEM (Block Element Modifier)**:
  - Block: `.blog-post`
  - Element: `.blog-post__title`, `.blog-post__date`
  - Modifier: `.experience-item--reverse`, `.theme-toggle__icon--animating`
- **Utility classes**: `.centered` (flex centering) is defined in `Navbar.css` but used globally

### Props Interface Pattern

```tsx
export interface ComponentProps {
  title: string;
  subtitle?: string;
  reverse?: boolean;
  children?: React.ReactNode;
}

export const Component: React.FunctionComponent<ComponentProps> = (props) => {
  // ...
};
```

### Reusable Widgets

Widgets live in `frontend/src/components/widgets/`:
- `TrelloBoard.tsx` — external embed component

Shared components live in `frontend/src/components/`:
- `blog-post/BlogPost.tsx` — Blog post card (used in feed)
- `lightbox/Lightbox.tsx` — Photo lightbox modal
- `resume-item/ResumeItem.tsx` — Resume entry with image + text

### Image Handling

- Static images: `frontend/src/static/images/`
- Import with webpack: `import PortraitImg from "../../static/images/portrait.jpg";`
- Common images: `portrait.jpg` (used by TitleBanner and AboutMe), `amazon-scout.jpg`, `amazon-logo.jpg`, `riptide-logo.jpg`, `berkeley-seal.jpg`
- **Always provide `alt` text** on images (see [Accessibility](#accessibility-standards))

---

## Accessibility Standards

All new code must meet these standards:

1. **Images**: Every `<img>` must have a descriptive `alt` attribute. Decorative images should have empty `alt=""`.
2. **External links**: All `<a target="_blank">` must have `rel="noopener noreferrer"`.
3. **Buttons**: Must have `aria-label` if they don't contain visible text (e.g., icon buttons, photo lightbox triggers).
4. **Semantic HTML**: Use `<article>`, `<time dateTime="...">`, `<nav aria-label="...">`, `<footer>` where appropriate.
5. **Focus management**: Suppress click-linger outline without removing keyboard focus ring:
   ```css
   :focus:not(:focus-visible) {
     outline: none;
     box-shadow: none;
   }
   ```
6. **Form labels**: Not currently used, but if adding forms, every input needs an associated `<label>`.
7. **Color contrast**: All text on the navy banner is white (`#ffffff`). Ensure `--text-primary` / `--text-secondary` / `--text-muted` have sufficient contrast against `--bg-page` in both themes.

---

## Animation & Motion

### Global Theme Transition

```css
*,
*::before,
*::after {
  transition: background-color 0.4s ease, color 0.4s ease, border-color 0.4s ease;
}
```

This creates smooth color transitions when switching themes. **Be careful adding other transitions** — they will also animate on theme switch.

### Theme Toggle Animation

The sun/moon icon in the navbar uses a custom keyframe animation:

```css
@keyframes theme-icon-swap {
  0%   { transform: rotate(0deg)   scale(1); opacity: 1; }
  45%  { transform: rotate(160deg) scale(0); opacity: 0; }
  55%  { transform: rotate(200deg) scale(0); opacity: 0; }
  100% { transform: rotate(360deg) scale(1); opacity: 1; }
}
```

Duration is `0.4s`. The React component swaps the icon at `180ms` (halfway through the scale-out).

### Hover Effects

- Links: color change + underline on hover
- Blog post titles: `color: var(--link-color)` on hover via `.blog-feed__post-link:hover .blog-post__title`
- Photos: `opacity: 0.9` on hover with `transition: opacity 0.2s`
- Lightbox arrows: `opacity: 0.6` → `1` on hover

### Preferred Animation Values

| Effect | Duration | Easing |
|--------|----------|--------|
| Theme transition | 0.4s | ease |
| Photo hover | 0.2s | ease (default) |
| Lightbox controls | 0.15s | ease (default) |
| Icon swap | 0.4s | ease-in-out |

**Avoid**: Long durations (>0.5s), bounce/elastic easings, parallax scroll effects, or anything that could trigger motion sensitivity.

---

## File Organization

```
frontend/src/
├── index.tsx              # React 18 createRoot entry point
├── App.tsx                # Router + ThemeProvider + layout shell
├── App.css                # Global styles, CSS variables, theme overrides
├── declarations.d.ts      # TypeScript module declarations (images, etc.)
├── blog/types.ts          # BlogPost, Photo, PaginatedPostsResponse interfaces
├── api/client.ts          # fetch() wrappers for backend API
├── context/
│   └── ThemeContext.tsx   # Light/dark theme state + toggle
├── components/
│   ├── blog-post/         # BlogPost card component
│   ├── lightbox/          # Photo lightbox modal
│   ├── resume-item/       # Resume entry layout
│   └── widgets/           # Reusable micro-components (TrelloBoard, etc.)
├── views/                 # Page sections / routes
│   ├── home/
│   │   └── Homepage.tsx   # Aggregates all homepage sections
│   ├── navbar/
│   ├── title-banner/
│   ├── about-me/          # (older section, not in current Homepage)
│   ├── this-site/
│   ├── resume/
│   ├── contact-me/
│   ├── footer/
│   ├── blog/
│   └── blog-post/
└── static/images/         # Webpack-imported assets
```

### Rules for New Features

1. Create a new folder under `frontend/src/views/<feature-name>/`
2. Export a single main component from `<FeatureName>.tsx`
3. Co-locate styles in `<FeatureName>.css`
4. If it's a reusable piece, put it in `frontend/src/components/` instead
5. Add the section to `Homepage.tsx` if it belongs on the homepage
6. Add a route in `App.tsx` if it needs its own URL
7. Add a nav link in `Navbar.tsx` if it should be in the main nav

---

## Anti-Patterns to Avoid

1. **No CSS-in-JS**: Do not introduce styled-components, emotion, or inline style objects. Use co-located `.css` files.
2. **No class components**: Use functional components with hooks exclusively.
3. **No `any` types**: `noImplicitAny` is enabled. All props, state, and API responses must be typed.
4. **No Express/server-side rendering**: The frontend is a static SPA built by Webpack and served from S3.
5. **No custom web fonts**: Stick to the system font stack.
6. **No hardcoded colors**: Always use CSS custom properties (`var(--text-primary)`), never raw hex values in component CSS (except for Berkeley brand colors which are already defined as variables).
7. **No unscoped global CSS**: Global styles belong in `App.css` only. Component CSS should be scoped via BEM classes.
8. **No `switch` prop names for layout**: Use `reverse` (boolean) for alternating layouts, not `direction` or `align`.

---

## Quick Reference: Building a New Section

```tsx
// frontend/src/views/my-section/MySection.tsx
import * as React from "react";
import "./MySection.css";

export const MySection = () => {
  return (
    <div id="my-section" className="section container">
      <h1>My Section</h1>
      <hr />
      <p>Content goes here...</p>
    </div>
  );
};
```

```css
/* frontend/src/views/my-section/MySection.css */
/* Use semantic tokens for theme awareness */
.my-section {
  background-color: var(--bg-surface);
  color: var(--text-primary);
}

/* Add dark mode override if needed */
[data-theme="dark"] .my-section {
  border-color: var(--border-default);
}
```

Then:
1. Add `<MySection />` to `Homepage.tsx`
2. Add `<Link to="/#my-section">My Section</Link>` to `Navbar.tsx` if it belongs in nav
3. Run `cd frontend && npm start` to verify

---

*Last updated: 2025-01-XX*
