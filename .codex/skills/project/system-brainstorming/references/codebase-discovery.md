# Codebase Discovery (Read-Only)

Use this checklist to map structure and locate critical paths without running the app.

## Entry points
- Identify app/framework entrypoints (e.g., main server file, app router, routes).
- Find configuration files (e.g., package.json, build configs, env templates).

## Frontend
- Locate routing and page/layout structure.
- Locate UI components, shared utilities, and state/data hooks.

## Backend
- Locate API routes/controllers/handlers.
- Locate data access layer, schemas, and validation.

## Data
- Identify database or storage layers and schema definitions.
- Identify migrations or seeding logic.

## Integration points
- External services (auth, payments, email, analytics).
- Webhooks, background jobs, or queues.

## Quick scans (optional)
- Search for "TODO" or "FIXME" for known gaps.
- Search for auth/permission guards.
- Search for caching and performance hints.

## Findings to capture
- Bottlenecks, coupling points, and ownership boundaries.
- Modules that are risky to change.
- Missing tests or thin test coverage areas.
