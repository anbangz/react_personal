# AGENTS.md

Guidelines for AI agents (Claude, Copilot, etc.) working on this codebase.

---

## Project Overview

Personal website for Anbang Zhang, deployed as a static React SPA to AWS S3 + CloudFront via a CodePipeline CI/CD pipeline.

- **URL:** https://anbangz.me
- **Stack:** React 16, TypeScript, Webpack 4, Bulma CSS, FontAwesome
- **Infrastructure:** Terraform-managed AWS (S3, CloudFront, Route53, ACM, CodePipeline, CodeBuild)
- **Deployment branch:** `release` (CodePipeline polls this branch)

---

## Repository Layout

```
/
├── src/
│   ├── index.tsx               # React entry point
│   ├── App.tsx                 # Router (React Router v5)
│   ├── declarations.d.ts       # TypeScript module declarations
│   ├── static/images/          # Static assets
│   ├── components/widgets/     # Reusable components
│   └── views/                  # Page sections (each has its own folder)
│       ├── navbar/
│       ├── home/               # Homepage.tsx aggregates all sections
│       ├── about-me/
│       ├── this-site/
│       ├── contact-me/
│       └── roadmap/
├── index.html                  # HTML template (loads Bulma & FontAwesome from CDN)
├── webpack.config.js           # Webpack 4 config, output → ./dist/bundle.js
├── tsconfig.json               # TypeScript (target ES2015, strict noImplicitAny)
├── package.json
└── infrastructure-terraform/   # All AWS infrastructure as Terraform HCL
    ├── main.tf                 # S3, CloudFront, Route53, ACM
    ├── codepipeline.tf         # CI/CD pipeline
    ├── codebuild.tf            # Build project
    └── buildspec.yml           # CodeBuild steps (runs npm run clean-build)
```

---

## Development Commands

```bash
npm start          # Dev server on http://localhost:8080 (hot reload)
npm run build      # Production webpack build → ./dist/
npm run clean      # Remove node_modules and dist
npm run clean-build  # Full clean install + production build
npm test           # Not implemented — no test suite exists
```

> There is no `.env` file or environment variable setup. This is a fully static site with no backend API.

---

## Key Constraints & Conventions

### Language & Tooling
- **TypeScript** is required for all source files in `src/`. No plain `.js` files.
- `noImplicitAny: true` — all types must be explicit.
- React 16 patterns are in use. Hooks are supported; class components should be avoided for new code.
- **React Router v5** — not v6. Use `<Switch>` and `<Route>`, not `<Routes>`.
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
- `terraform.tfstate` is committed to the repo — do not delete or corrupt it.
- Secrets (GitHub OAuth token) are stored in **AWS Secrets Manager**, not in code or `.env` files.
- Never hardcode credentials or ARNs that belong to external accounts.

### Deployment
- Merging to the `release` branch triggers CodePipeline automatically.
- CodePipeline runs `npm run clean-build` via CodeBuild and deploys `./dist/` to S3.
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
2. Run `terraform plan` to review changes before applying.
3. Run `terraform apply` — state is stored locally in `terraform.tfstate`.
4. Do not run `terraform destroy` without explicit user confirmation.

---

## Out of Scope for Agents

- Do not modify `terraform.tfstate` or `terraform.tfstate.backup` directly.
- Do not change the deployment branch from `release` without confirming with the user.
- Do not add dependencies that require a backend server (e.g., Express, databases).
- Do not introduce breaking changes to the Bulma CDN version without updating `index.html`.
- Do not attempt to run `terraform` commands unless the user explicitly asks.
