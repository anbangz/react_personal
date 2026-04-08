# AGENTS.md

Guidelines for AI agents (Claude, Copilot, etc.) working on this codebase.

---

## Project Overview

Personal website for Anbang Zhang with a Go backend API for blog content management. The frontend is a static React SPA deployed to AWS S3 + CloudFront. The backend is a Go Lambda behind API Gateway, using MongoDB Atlas for data and S3 for photo storage.

- **URL:** https://anbangz.me (frontend), https://api.anbangz.me (backend API)
- **Frontend stack:** React 18, TypeScript, Webpack 5, Bulma CSS, FontAwesome
- **Backend stack:** Go 1.26, chi router, MongoDB Go driver, AWS Lambda, API Gateway HTTP API
- **Infrastructure:** Terraform-managed AWS (S3, CloudFront, Route53, ACM, CodePipeline, CodeBuild, Lambda, API Gateway, Secrets Manager)
- **Deployment branch:** `master` (CodePipeline triggers via CodeStar Connections GitHub App)

---

## Repository Layout

```
/
├── frontend/
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── webpack.config.js           # Webpack 5 config, output → ./dist/bundle.js
│   ├── index.html                  # HTML template (loads Bulma & FontAwesome from CDN)
│   └── src/
│       ├── index.tsx               # React entry point
│       ├── App.tsx                 # Router (React Router v6)
│       ├── declarations.d.ts       # TypeScript module declarations
│       ├── api/client.ts           # API client for backend
│       ├── static/images/          # Static assets
│       ├── blog/types.ts           # Blog data types
│       ├── components/
│       │   ├── widgets/            # Reusable components
│       │   ├── blog-post/          # BlogPost card component
│       │   └── lightbox/           # Photo lightbox component
│       └── views/                  # Page sections (each has its own folder)
│           ├── navbar/
│           ├── home/               # Homepage.tsx aggregates all sections
│           ├── about-me/
│           ├── this-site/
│           ├── contact-me/
│           ├── blog/               # Blog feed page (/blog route)
│           ├── blog-post/          # Individual blog post page (/blog/:slug)
│           └── roadmap/
├── backend/
│   ├── go.mod
│   ├── go.sum
│   ├── Makefile
│   ├── cmd/api/main.go             # Lambda + local HTTP entry point
│   └── internal/
│       ├── model/post.go           # Post, Photo structs
│       ├── repository/post.go      # PostRepository interface + MongoDB impl
│       ├── service/post.go         # Post CRUD business logic
│       ├── service/photo.go        # S3 photo operations
│       ├── handler/router.go       # Chi router wiring
│       ├── handler/health.go       # GET /health
│       ├── handler/post.go         # Post endpoints
│       ├── handler/photo.go        # Photo endpoints
│       ├── middleware/auth.go      # API key middleware
│       └── middleware/cors.go      # CORS middleware
└── infrastructure-terraform/       # All AWS infrastructure as Terraform HCL
    ├── main.tf                     # S3, CloudFront, Route53, ACM, remote state backend
    ├── versions.tf                 # Terraform/provider versions, S3 backend config
    ├── codepipeline.tf             # Frontend CI/CD pipeline (Source → Build → Deploy)
    ├── codepipeline-backend.tf     # Backend CI/CD pipeline (Source → Build → Deploy)
    ├── codebuild.tf                # Frontend build project
    ├── codebuild-backend.tf        # Backend build + deploy projects
    ├── codebuild-terraform.tf      # Terraform apply build project + IAM role
    ├── lambda.tf                   # Lambda functions + IAM roles
    ├── api-gateway.tf              # API Gateway HTTP APIs + custom domains
    ├── s3-photos.tf                # Photo S3 buckets + CloudFront distributions
    ├── mongodb-secrets.tf          # Secrets Manager secrets
    ├── buildspec.yml               # Frontend build steps
    ├── buildspec-backend-build.yml # Backend Go compile steps
    ├── buildspec-backend-deploy.yml # Backend Lambda deploy steps
    ├── buildspec-terraform-plan.yml   # Terraform plan steps
    └── buildspec-terraform-apply.yml  # Terraform apply steps
```

---

## Development Commands

### Frontend

```bash
cd frontend && npm start          # Dev server on http://localhost:8080 (hot reload)
cd frontend && npm run build      # Production webpack build → ./dist/
cd frontend && npm run clean      # Remove node_modules and dist
cd frontend && npm run clean-build  # Full clean install + production build
npm test           # Not implemented — no test suite exists
```

### Backend

```bash
cd backend && make build    # Compile Go binary for Lambda (linux/amd64)
cd backend && make run      # Run local dev server on :8081
cd backend && make test     # Run Go tests
```

### CLI Tools

- **GitHub CLI (`gh`)** may not be on the default shell `$PATH`. Run `which gh` first; if not found, try `/opt/homebrew/bin/gh` (Apple Silicon macOS) or `/usr/local/bin/gh` (Intel macOS).

> The frontend is a static site with no `.env` file. The backend requires environment variables (`MONGODB_URI`, `API_KEY`, `S3_BUCKET`, `PHOTOS_CDN_URL`) — set these locally for `make run`.

---

## Key Constraints & Conventions

### Language & Tooling
- **TypeScript** is required for all source files in `frontend/src/`. No plain `.js` files.
- `noImplicitAny: true` — all types must be explicit.
- React 18 patterns are in use. Hooks are supported; class components should be avoided for new code.
- **React Router v6** — use `<Routes>` and `<Route>`, not the v5 `<Switch>` pattern.
- **Bulma CSS** is loaded via CDN in `index.html`. Use Bulma utility classes before writing custom CSS.
- FontAwesome icons are available via `@fortawesome/react-fontawesome`.
- Indentation: 2 spaces (enforced by `.vscode/settings.json`).

### Component Structure
- Views (page sections) live in `frontend/src/views/<section-name>/`.
- Reusable widgets live in `frontend/src/components/widgets/`.
- `Homepage.tsx` imports and renders all sections — add new sections there.
- Each section that needs its own styles gets a co-located `.css` file.
- **Static images** in `frontend/src/static/images/` are imported by multiple components (TitleBanner, AboutMe, Resume). Do not delete images without checking all import references first (`portrait.jpg` is used by TitleBanner and AboutMe; `amazon-scout.jpg` is used by Resume).

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
- **Backend pipeline** (`BackendAPIPipeline`): **Source → Build → DeployDev → DeployProd** — compiles the Go binary and deploys to Lambda. Triggers only when files under `backend/**` change.
- **Terraform pipeline** (`TerraformInfrastructurePipeline`): **Source → Plan → Apply** — runs `terraform plan` and then `terraform apply`.
- CloudFront serves the site. After infrastructure changes that affect cached assets, a CloudFront invalidation may be needed (`aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"`).

---

## What Doesn't Exist Yet (Do Not Assume)

- No frontend test suite. Do not reference or run `npm test`. Backend has Go unit tests (`make test`).
- No form submission handler (the contact section links to email only).
- No admin UI for blog management (API-only via `X-API-Key` auth header).
- No Storybook or component documentation.
- MongoDB Atlas and Secrets Manager values are not yet populated — the infrastructure is defined in Terraform but requires manual setup (see Post-Implementation Manual Steps in the plan).

---

## Adding New Features

1. Create a new view folder under `frontend/src/views/<feature>/` with a `.tsx` and optional `.css` file.
2. Add the component to `frontend/src/views/home/Homepage.tsx`.
3. Add a route in `frontend/src/App.tsx` if it needs its own URL path.
4. Update `Navbar.tsx` if it should appear in navigation.
5. Run `cd frontend && npm start` to verify locally before pushing.

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

---

## Out of Scope for Agents

- Do not modify Terraform remote state directly (S3 bucket or DynamoDB lock table).
- Do not change the deployment branch from `master` without confirming with the user.
- Do not add dependencies that require a backend server (e.g., Express, databases) to the frontend.
- Do not introduce breaking changes to the Bulma CDN version without updating `index.html`.
- Do not attempt to run `terraform` commands unless the user explicitly asks.

---

## Code Review Workflow

After generating or modifying code, agents must verify correctness before committing:

1. **Build** — run `cd frontend && npm run build` (or start the dev server) and confirm zero errors.
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
