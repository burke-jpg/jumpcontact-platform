# Contributing to JumpContact Platform

Thank you for your interest in contributing! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Style Guide](#style-guide)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

## Code of Conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

1. **Fork** the repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/your-username/jumpcontact-platform.git
   cd jumpcontact-platform
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Set up environment variables** — see the [README](README.md#environment-variables)
5. **Start the dev server**:
   ```bash
   npm run dev
   ```

## Development Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Run linting to catch issues:
   ```bash
   npm run lint
   ```
4. Test your build:
   ```bash
   npm run build
   ```
5. Commit with a clear message (see [Commit Messages](#commit-messages))
6. Push and open a pull request

## Pull Request Process

1. Ensure your branch is up to date with `main`
2. Fill out the [pull request template](.github/PULL_REQUEST_TEMPLATE.md)
3. Link any related issues
4. Wait for CI checks to pass
5. Request a review from a maintainer

### Commit Messages

Use conventional commit format:

```
type: short description

Optional longer description explaining the change.
```

**Types:**
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation changes
- `style:` — Code style (formatting, no logic change)
- `refactor:` — Code refactoring
- `test:` — Adding or updating tests
- `chore:` — Maintenance tasks

**Examples:**
```
feat: add agent filtering to call log page
fix: resolve timezone bug causing empty calls on Vercel
docs: update API reference with new endpoints
```

## Style Guide

### TypeScript

- Use TypeScript strict mode (already enabled)
- Prefer `interface` over `type` for object shapes
- Use descriptive variable names

### React

- Use functional components with hooks
- Keep components focused — one responsibility per component
- Co-locate component styles with Tailwind classes

### CSS / Tailwind

- Use Tailwind utility classes; avoid custom CSS where possible
- Follow the existing color scheme defined in `src/lib/constants.ts`
- Maintain the glass-morphism design pattern for cards

### File Naming

- React components: `PascalCase.tsx` (e.g., `LiveNowPage.tsx`)
- Utilities and libraries: `camelCase.ts` (e.g., `getDashboard.ts`)
- Data files: `camelCase.json` (e.g., `clients.json`)

## Reporting Bugs

Use the [Bug Report](https://github.com/burke-jpg/jumpcontact-platform/issues/new?template=bug_report.md) issue template and include:

- Steps to reproduce
- Expected vs. actual behavior
- Browser and OS details
- Screenshots if applicable

## Requesting Features

Use the [Feature Request](https://github.com/burke-jpg/jumpcontact-platform/issues/new?template=feature_request.md) issue template and describe:

- The problem you're trying to solve
- Your proposed solution
- Any alternatives you've considered

---

Thank you for contributing!
