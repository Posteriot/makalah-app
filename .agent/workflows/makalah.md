---
description: rules
---

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

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Primary Development Flow
```bash
# Start Next.js dev server (runs on localhost:3000)
npm run dev

# In a separate terminal: Start Convex backend dev mode (syncs schema and functions)
npx convex dev
```

### Build and Lint
```bash
# Production build (fails on type/lint errors)
npm run build

# Serve production build
npm run start

# Run ESLint
npm run lint

# Auto-fix linting issues
npm run lint -- --fix
```

### Convex CLI Commands
```bash
# Push schema/functions to Convex deployment
npx convex deploy

# Run a specific Convex function
npx convex run <functionName> --args '{"key": "value"}'

# Open Convex dashboard
npx convex dashboard

# View all Convex CLI options
npx convex -h
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend**: Convex (real-time database and serverless functions)
- **Authentication**: Clerk
- **AI/LLM**: Vercel AI SDK with dual provider setup (AI Gateway primary, OpenRouter fallback)
- **Email**: Resend
- **Payments**: Xendit (configured but not yet implemented)
- **UI Components**: Radix UI primitives with custom styling

### Key Directories
- **`src/app`**: Next.js App Router with route groups:
  - `(marketing)`: Public pages (home, pricing, about)
  - `(auth)`: Clerk sign-in/sign-up pages
  - `(dashboard)`: Protected dashboard area
  - `chat`: AI chat interface
  - `api/ai`: AI-related API routes
- **`src/components`**: Reusable UI components (Radix UI-based)
- **`src/lib`**: Shared utilities, AI client, email helpers
  - `ai/`: AI client and failover logic
  - `email/`: Email templates and sending logic
- **`convex`**: Backend schema and functions (queries, mutations)
  - `schema.ts`: Database schema (users, papers tables)
  - `users.ts`: User CRUD operations
  - `papers.ts`: Paper metadata operations
  - `_generated/`: Auto-generated Convex client code
- **`src/proxy.ts`**: Clerk Middleware for route protection


### Data Flow Patterns

**Client → Convex (React)**
```typescript
// In client components
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"

const data = useQuery(api.module.queryFunction, { args })
const mutate = useMutation(api.module.mutationFunction)
```

**Server → Convex (Next.js Server Components/API Routes)**
```typescript
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "@convex/_generated/api"

const data = await fetchQuery(api.module.queryFunction, { args })
await fetchMutation(api.module.mutationFunction, { args })
```

**AI Provider Setup**
- Primary: Vercel AI Gateway (requires `AI_GATEWAY_URL` + `AI_GATEWAY_API_KEY`)
- Fallback: OpenRouter (requires `OPENROUTER_API_KEY`)
- The `basicGenerateText()` function in `src/lib/ai/client.ts` handles automatic failover

### Authentication Flow
1. `src/proxy.ts` (Clerk Middleware) protects routes and handles session verification
2. Clerk handles auth UI and session management
2. Dashboard layout (`src/app/(dashboard)/layout.tsx`) calls `ensureConvexUser()` on every protected page load
3. This syncs the Clerk user to Convex `users` table using `fetchMutation(api.users.createUser, ...)`
4. Convex user records include `clerkUserId`, `email`, `subscriptionStatus`

### Database Schema
**users table**
- `clerkUserId`: string (indexed)
- `email`: string
- `subscriptionStatus`: "free" | "pro" | "canceled"
- `createdAt`: number

**papers table**
- `userId`: Id<"users"> (indexed with createdAt)
- `title`: string
- `abstract`: string
- `createdAt`: number
- `updatedAt`: number

### Environment Variables
Required variables (see `.env.example`):
- **Convex**: `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`
- **Clerk**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- **AI**: `AI_GATEWAY_URL`, `AI_GATEWAY_API_KEY` (or `VERCEL_AI_GATEWAY_TOKEN`), `OPENROUTER_API_KEY` (fallback)
- **Resend**: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- **Xendit**: `XENDIT_SECRET_KEY` (payments, not yet implemented)

## Coding Standards

### Language and Communication
**CRITICAL**: This project follows Jakarta-style Indonesian with gue–lo pronouns for all communications, comments, and user-facing text. Technical terms without Indonesian equivalents may use English.

### TypeScript Conventions
- Strict mode enabled; no implicit `any`
- Prefer functional React components
- Use `"use client"` directive explicitly for client components
- Path aliases: `@/*` → `src/*`, `@convex/*` → `convex/*`

### Styling
- Tailwind CSS 4 with design system via CSS variables
- 2-space indentation
- Component styles co-located (no separate CSS files)
- Extract shared variants to utilities in `src/lib/utils.ts`

### File Naming
- Components/utilities: PascalCase for components, camelCase for utilities
- Route segments: kebab-case (Next.js convention)
- Convex functions: camelCase exports in kebab-case files (e.g., `papers.ts`)

## Important Patterns

### Convex Function Validators
Always use validators for all Convex function arguments:
```typescript
import { v } from "convex/values"

export const myFunction = query({
  args: {
    userId: v.id("users"),
    title: v.string(),
    optional: v.optional(v.string()),
  },
  handler: async (ctx, args) => { /* ... */ }
})
```

### Error Handling in AI Routes
The AI client (`src/lib/ai/client.ts`) implements automatic failover. When creating new AI routes, use `basicGenerateText()` which tries AI Gateway first, then falls back to OpenRouter.

### Convex Schema Changes
After modifying `convex/schema.ts`:
1. Save the file
2. Convex dev mode auto-regenerates `convex/_generated/*`
3. Restart Next.js dev server if types don't update immediately

### Adding New Tables
1. Define in `convex/schema.ts` with validators
2. Create corresponding functions file (e.g., `convex/tableName.ts`)
3. Add indexes for common query patterns
4. Export queries/mutations with proper validators

## Common Issues

### Convex Not Syncing
- Ensure `npx convex dev` is running in a separate terminal
- Check `NEXT_PUBLIC_CONVEX_URL` matches your Convex dashboard
- Verify `convex/_generated/` files exist and are up-to-date

### Type Errors with Convex
- Generated types come from `convex/_generated/api.d.ts`
- If types are stale, restart `npx convex dev`
- Never edit files in `convex/_generated/` manually

### AI Provider Failures
- Check both `AI_GATEWAY_URL` + `AI_GATEWAY_API_KEY` are set
- Verify OpenRouter key is valid for fallback
- Review error logs for specific provider issues

### Clerk Auth Not Working
- Verify both public and secret keys are set
- Check middleware config if adding new protected routes
- Ensure `ClerkProvider` wraps app in `src/app/providers.tsx`

## Project Specifics

### React Grab Integration
Development mode includes React Grab for visual debugging:
- Auto-loaded via `npm run dev` precommand
- Scripts injected in `src/app/layout.tsx` (development only)
- Do not remove these scripts without coordinating with the team

### Convex Functions Style
This project uses `mutationGeneric` and `queryGeneric` instead of standard `mutation`/`query`:
- Located in `convex/server` package
- Provides better type inference
- Use same validator/handler pattern

### Multi-provider AI Strategy
The codebase is architected for resilience:
1. Primary requests go through Vercel AI Gateway (cost optimization, caching)
2. Automatic fallback to OpenRouter if Gateway fails
3. Direct provider keys (OpenAI, Google) reserved for future use
4. Never bypass this pattern in new AI routes without discussion
