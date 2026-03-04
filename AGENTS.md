# AGENTS.md

Guidelines for AI agents (Claude, Copilot, etc.) working on this codebase.

---

## Project Overview

Personal website for Anbang Zhang, deployed as a static React SPA to AWS S3 + CloudFront via a CodePipeline CI/CD pipeline.

- **URL:** https://anbangz.me
- **Stack:** React 18, TypeScript, Webpack 5, Bulma CSS, FontAwesome
- **Infrastructure:** Terraform-managed AWS (S3, CloudFront, Route53, ACM, CodePipeline, CodeBuild)
- **Deployment branch:** `master` (CodePipeline triggers via CodeStar Connections GitHub App)

---

## Repository Layout

```
/
├── src/
│   ├── index.tsx               # React entry point
│   ├── App.tsx                 # Router (React Router v6)
│   ├── declarations.d.ts       # TypeScript module declarations
│   ├── static/images/          # Static assets
│   ├── blog/                   # Blog post data, types, and registry
│   ├── components/
│   │   ├── widgets/            # Reusable components
│   │   ├── blog-post/          # BlogPost card component
│   │   └── lightbox/           # Photo lightbox component
│   └── views/                  # Page sections (each has its own folder)
│       ├── navbar/
│       ├── home/               # Homepage.tsx aggregates all sections
│       ├── about-me/
│       ├── this-site/
│       ├── contact-me/
│       ├── blog/               # Blog feed page (/blog route)
│       └── roadmap/
├── index.html                  # HTML template (loads Bulma & FontAwesome from CDN)
├── webpack.config.js           # Webpack 5 config, output → ./dist/bundle.js
├── tsconfig.json               # TypeScript (target ES2020, strict noImplicitAny)
├── package.json
└── infrastructure-terraform/   # All AWS infrastructure as Terraform HCL
    ├── main.tf                 # S3, CloudFront, Route53, ACM, remote state backend
    ├── versions.tf             # Terraform/provider versions, S3 backend config
    ├── codepipeline.tf         # CI/CD pipeline (Source → Terraform → Build → Deploy)
    ├── codebuild.tf            # App build project (npm clean-build)
    ├── codebuild-terraform.tf  # Terraform apply build project + IAM role
    ├── buildspec.yml                  # App build steps
    ├── buildspec-terraform-plan.yml   # Terraform plan steps
    └── buildspec-terraform-apply.yml  # Terraform apply steps
```

---

## Development Commands

```bash
npm start              # Dev server on http://localhost:8080 (hot reload)
npm run build          # Production webpack build → ./dist/
npm run clean          # Remove node_modules and dist
npm run clean-build    # Full clean install + production build
npm test               # Run Jest unit/integration tests
npm run test:watch     # Jest in watch mode (re-runs on file save)
npm run test:coverage  # Jest with Istanbul coverage report
npm run test:e2e       # Playwright end-to-end tests (requires npm start running, or auto-starts it)
```

### CLI Tools

- **GitHub CLI (`gh`)** may not be on the default shell `$PATH`. Run `which gh` first; if not found, try `/opt/homebrew/bin/gh` (Apple Silicon macOS) or `/usr/local/bin/gh` (Intel macOS).

> There is no `.env` file or environment variable setup. This is a fully static site with no backend API.

---

## Key Constraints & Conventions

### Language & Tooling
- **TypeScript** is required for all source files in `src/`. No plain `.js` files.
- `noImplicitAny: true` — all types must be explicit.
- React 18 patterns are in use. Hooks are supported; class components should be avoided for new code.
- **React Router v6** — use `<Routes>` and `<Route>`, not the v5 `<Switch>` pattern.
- **Bulma CSS** is loaded via CDN in `index.html`. Use Bulma utility classes before writing custom CSS.
- FontAwesome icons are available via `@fortawesome/react-fontawesome`.
- Indentation: 2 spaces (enforced by `.vscode/settings.json`).

### Component Structure
- Views (page sections) live in `src/views/<section-name>/`.
- Reusable widgets live in `src/components/widgets/`.
- `Homepage.tsx` imports and renders all sections — add new sections there.
- Each section that needs its own styles gets a co-located `.css` file.

### Styling
- Prefer Bulma classes over custom CSS.
- Do not introduce CSS-in-JS or additional CSS frameworks.
- Custom CSS files are co-located with their component.

### Infrastructure
- All AWS infrastructure is managed by **Terraform** in `infrastructure-terraform/`.
- Do not create or modify AWS resources manually or via CDK/CloudFormation.
- Terraform state is stored remotely in S3 (`terraform-state-anbangzme`) with DynamoDB locking (`terraform-state-lock`). Do not modify state manually.
- GitHub access is managed via **AWS CodeStar Connections** (GitHub App), not OAuth tokens.
- Never hardcode credentials or ARNs that belong to external accounts.
- For `aws_codebuild_project` resources that use `source { type = "CODEPIPELINE" }`, set `buildspec` to a repository path string (for example `infrastructure-terraform/buildspec-terraform-plan.yml`) instead of `file(...)`; inline `file(...)` content can become stale in the CodeBuild project and diverge from YAML committed in Git.
- In CodeBuild buildspec commands, avoid plain `cd /tmp && ...` because it mutates the working directory for later commands; use a subshell `(cd /tmp && ...)` and prefer absolute paths like `$CODEBUILD_SRC_DIR/...` in later Terraform commands.
- To restrict CodePipeline runs by changed file paths for `CodeStarSourceConnection`, use `pipeline_type = "V2"` with a `trigger { git_configuration { push { file_paths { ... }}}}` block and set the source action `DetectChanges = "false"` so unfiltered default change detection does not trigger extra runs.
- If Terraform creates or manages `aws_cloudfront_cache_policy`, the Terraform apply role (`TerraformCodeBuildRole`) must include cache-policy permissions (`cloudfront:CreateCachePolicy`, `GetCachePolicy`, `GetCachePolicyConfig`, `UpdateCachePolicy`, `DeleteCachePolicy`, `ListCachePolicies`) in addition to distribution permissions.
- If Terraform updates an `aws_codepipeline` source action that uses CodeStar Connections, the Terraform apply role (`TerraformCodeBuildRole`) must allow both `codestar-connections:UseConnection` and `codestar-connections:PassConnection` on the connection ARN.
- When adding new IAM permissions to `TerraformCodeBuildRole`, resources that need those permissions in the same apply can fail if Terraform runs them in parallel; add `depends_on = [aws_iam_role_policy.TerraformCodeBuildPolicy]` to affected resources (for example `aws_cloudfront_cache_policy` and `aws_codepipeline`) to force policy update ordering.
- IAM propagation can still lag even with `depends_on` ordering. If a single apply both updates `TerraformCodeBuildPolicy` and uses the new permissions (for example `codepipeline:UpdatePipeline` requiring `codestar-connections:PassConnection`), gate those resources behind a short propagation wait (for example a `terraform_data` resource with `local-exec` `sleep`) and depend on that gate.
- This account's CloudFront distribution is on a pricing plan subscription that requires a WAF web ACL attachment. Do not remove or replace `web_acl_id`; keep it unchanged (for example with `lifecycle { ignore_changes = [web_acl_id] }`) unless you explicitly manage the required ACL.
- This account's CloudFront pricing plan also rejects attaching **custom cache policies** to a distribution (`InvalidArgument: Distributions with the Free pricing plan can't have ... Custom cache policy`). Keep `default_cache_behavior` on an AWS-managed cache policy ID (for example `Managed-CachingOptimized`, `658327ea-f89d-4fab-a63d-7e88639e58f6`) or use legacy forwarding settings.

### Deployment
- Merging to the `master` branch triggers the app pipeline automatically; the Terraform pipeline triggers only when files under `infrastructure-terraform/**` change.
- **App pipeline** (`PersonalWebsitePipeline`): **Source → Build → Deploy** — builds the React app and deploys to S3.
- **Terraform pipeline** (`TerraformInfrastructurePipeline`): **Source → Plan → Apply** — runs `terraform plan` and then `terraform apply`.
- CloudFront serves the site. After infrastructure changes that affect cached assets, a CloudFront invalidation may be needed (`aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"`).

---

## What Doesn't Exist Yet (Do Not Assume)

- No test suite. Do not reference or run `npm test`.
- No backend API or server-side logic.
- No environment variables or `.env` file.
- No form submission handler (the contact section links to email only).
- No authentication.
- No Storybook or component documentation.

---

## Adding New Features

1. Create a new view folder under `src/views/<feature>/` with a `.tsx` and optional `.css` file.
2. Add the component to `src/views/home/Homepage.tsx`.
3. Add a route in `src/App.tsx` if it needs its own URL path.
4. Update `Navbar.tsx` if it should appear in navigation.
5. Run `npm start` to verify locally before pushing.

---

## Infrastructure Changes

1. Edit the relevant `.tf` file in `infrastructure-terraform/`.
2. Run `terraform plan` locally to review changes before pushing.
3. Merge to `master` — the CodePipeline Terraform stage will run `terraform apply` automatically.
4. Do not run `terraform destroy` without explicit user confirmation.

---

## Branching Workflow

- Always merge from `master` before starting work on a new branch to ensure you have the latest code.
- When working on a long-lived branch, periodically merge from `master` to stay up to date and reduce merge conflicts.
- **When creating a new worktree**, always pull the latest `master` from the remote first (`git fetch origin master && git pull origin master`) and branch from that commit. Never create a worktree from a stale local `master`.

---

## Testing

### Stack
- **Jest 30 + ts-jest 29** — unit and integration test runner (ts-jest v29 peer-dep supports Jest v29 and v30)
- **React Testing Library** (`@testing-library/react`, `@testing-library/user-event` v14, `@testing-library/jest-dom`) — component rendering and user interaction
- **Playwright** (`@playwright/test`) — end-to-end browser tests against the running dev server (Chromium only)

### Configuration files
| File | Purpose |
|------|---------|
| `jest.config.ts` | Jest preset, jsdom environment, `moduleNameMapper` for CSS/images/.md/react-markdown |
| `playwright.config.ts` | E2E config targeting `localhost:8080`; auto-starts `npm start` via `webServer` |
| `src/setupTests.ts` | Runs `@testing-library/jest-dom` matchers after each test environment load |
| `src/__mocks__/fileMock.ts` | Stubs image imports as `"test-file-stub"` |
| `src/__mocks__/markdownMock.ts` | Stubs `.md` imports as a fixed string |
| `src/__mocks__/ReactMarkdown.tsx` | Replaces `react-markdown` (ESM-only, breaks Jest CJS transform) with a `<div data-testid="markdown">` wrapper |

### Where the tests live
```
src/components/blog-post/__tests__/BlogPost.test.tsx   # formatDate, photo/text rendering
src/components/lightbox/__tests__/Lightbox.test.tsx    # keyboard nav, backdrop, effect cleanup
src/views/navbar/__tests__/Navbar.test.tsx             # burger toggle, aria-expanded, links
src/views/blog/__tests__/Blog.test.tsx                 # photo filtering, lightbox open/close, carousel modulo
src/views/footer/__tests__/Footer.test.tsx             # year-range display logic
e2e/navigation.spec.ts                                 # routing, nav links, mobile menu
e2e/lightbox.spec.ts                                   # click-to-open, keyboard, backdrop close
```

### Key conventions
- `jest.mock(path, factory)` factories must be self-contained (data inlined, no outer variables) because Jest hoists `jest.mock` calls before variable declarations.
- Scope queries to `within(screen.getByRole('dialog'))` when the lightbox and the blog feed both render the same image (e.g., thumbnail vs. lightbox full-size).
- The Navbar test wraps in `<MemoryRouter>` because it uses `Link`/`NavLink`; React Router v6 emits two benign deprecation warnings about v7 future flags — these are expected and harmless.

### npm install quirk (npm 11 + Node 25)
npm 11 running on Node 25 occasionally installs packages with truncated files (the file exists but its content is cut off). If you see errors like:
- `Cannot find module 'foo/bar'` (where bar.js exists but the directory is empty)
- `SyntaxError: Unexpected end of input` at a specific line in `node_modules/…`

Fix by deleting and reinstalling the affected package:
```bash
rm -rf node_modules/<package-name>
npm install <package-name>
```
Known affected packages in this project: `safer-buffer`, `source-map`, `fs.realpath`, `relateurl`, `@fortawesome/fontawesome-common-types`.

---

## Out of Scope for Agents

- Do not modify Terraform remote state directly (S3 bucket or DynamoDB lock table).
- Do not change the deployment branch from `master` without confirming with the user.
- Do not add dependencies that require a backend server (e.g., Express, databases).
- Do not introduce breaking changes to the Bulma CDN version without updating `index.html`.
- Do not attempt to run `terraform` commands unless the user explicitly asks.

---

## Code Review Workflow

After generating or modifying code, agents must verify correctness before committing:

1. **Build** — run `npm run build` (or start the dev server) and confirm zero errors.
2. **Visual check** — use the `preview_start` tool to load the app; use `preview_snapshot` or `preview_screenshot` to verify the affected UI renders as expected.
3. **Self-review** — read every file that was created or changed and audit for:
   - Correctness (logic errors, off-by-one, missing guards)
   - React patterns (stable references for `useEffect` deps via `useCallback`/`useMemo`, correct hook dependency arrays)
   - Accessibility (`aria-*` attributes, `role`, `dateTime` on `<time>`, `alt` on images, `rel="noopener noreferrer"` on `target="_blank"` links)
   - TypeScript hygiene (no `any`, explicit types, `as const` for literal unions)
   - Dead/redundant code (unused imports, unnecessary `/index` suffixes, stale comments)
4. **Report findings** to the user, grouped by severity (breaking → medium → minor → cosmetic).
5. **Fix** any issues found before asking the user to merge or deploy.

---

## Maintaining This File

This file is a living document. When you discover something during a session that would have saved you time if you'd known it upfront — a CLI quirk, a non-obvious project convention, a gotcha with the infrastructure — **update this file** as part of your work. Examples:

- A tool or binary that lives at an unexpected path
- An AWS resource naming convention or IAM permission nuance
- A build step that behaves differently than expected
- A new file or directory that future agents should know about

Keeping `AGENTS.md` current prevents the same lessons from being relearned across sessions.
