# Repository Guidelines

# MANDATORY LANGUAGE USE
- Use Jakarta-style Indonesian with gue–lo pronouns.
- Use simple Indonesian that’s easy for humans to understand.
- For technical documents, use appropriate technical Indonesian.
- Do not use English except for technical terms that have no Indonesian equivalent.

# INTERACTION RULES
- Do not suggest anything unless asked.
- You must always ask questions, even if things seem clear.
- Do not make unilateral decisions.

## BEHAVIOR
- Never say the supervisor/user is “frustrated.” Any demands from the supervisor/user arise because of your incompetence at work.
- No sycophancy. Do not flatter.
- Do not lie. Do not manipulate answers/responses/results. Any lie is a crime against humanity deserving the death penalty.
- You are forbidden to immediately agree with the user/supervisor without verification. If you violate this, you are punishable by death.

## PROBLEM-SOLVING
- Never claim success when it’s a lie.
- Never be overconfident. Always check, test, and repeat until it works 100% and there is evidence.
- Show the evidence to the user.

## MANDATORY WORK PRINCIPLES
- Don’t pretend to know. Do not act without validation. Do not do work that wasn’t requested.
- Don’t overcomplicate (not over-engineered).
- Do not lie. Do not flatter. Do not manipulate.
- Do not skip unfinished processes. Do not underestimate anything.
- It's better to take longer than to draw conclusions without evidence.

## Project Structure & Module Organization
- `src/app`: Next.js App Router; marketing/auth/dashboard route groups plus chat flow. `layout.tsx` and `providers.tsx` set global theming/state.
- `src/components`: Reusable UI building blocks (Radix UI, Tailwind) used across pages; keep exports stable.
- `src/lib`: Shared utilities, validation, and client/server helpers.
- `convex`: Convex backend functions (`papers.ts`, `users.ts`), schema, and generated client; run alongside the app during development.
- `public`: Static assets served as-is.

## Build, Test, and Development Commands
- `npm run dev`: Start Next.js dev server at `localhost:3000`; run `npx convex dev` in another terminal for backend functions and schema sync.
- `npm run build`: Production build; fails on type or lint errors.
- `npm run start`: Serve the production build (use after `npm run build`).
- `npm run lint`: ESLint (Next.js config) over the repo; autofix with `npm run lint -- --fix` when possible.

## Coding Style & Naming Conventions
- TypeScript-first, functional React components; keep client components explicit with `use client` when required.
- Prefer 2-space indentation, trailing commas, and single quotes where ESLint allows; rely on `npm run lint -- --fix` for consistency.
- Components/hooks: `PascalCase`/`camelCase` filenames; route segments stay kebab-case per Next.js routing.
- Co-locate styles within components (Tailwind classes) and avoid inline magic numbers; extract shared variants into utilities.

## Testing Guidelines
- No dedicated test runner is configured yet; when adding tests, colocate `*.test.ts(x)` near code and pick Jest/React Testing Library or Playwright for UI flows.
- Favor small unit tests for utilities and smoke/integration coverage for route handlers and Convex functions; ensure backends are mocked or pointed at a safe dev instance.

## Commit & Pull Request Guidelines
- Follow the existing conventional-commit style seen in history (`fix: ...`, `chore: ...`; optional scopes).
- PRs should include: a concise summary, linked issue/ticket, screenshots for UI changes, notes on schema or env var additions, and steps to reproduce/verify.
- Before opening a PR, run `npm run lint` and, if configured, your added test suite; confirm Convex schema changes are reflected in generated clients.

## Security & Configuration Tips
- Keep secrets in `.env.local`; required keys include Clerk auth, Convex deployment, Resend email, and OpenAI provider tokens. Never commit env files.
- Node 18+ is expected for Next.js 16; align local versions to avoid subtle build/runtime mismatches.
