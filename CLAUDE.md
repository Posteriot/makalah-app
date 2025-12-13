# CLAUDE.md

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
    - `/admin`: Admin panel for user management (superadmin/admin only)
    - `/settings`: User profile settings
    - `/dashboard`: Redirects to settings
  - `chat`: AI chat interface with conversation history
  - `api/chat`: Chat API endpoint with streaming support
  - `api/webhooks/clerk`: Clerk webhook handler for user events
- **`src/components`**: Reusable UI components
  - `admin/`: Admin panel components (UserList, AdminNavLink, RoleBadge)
  - `settings/`: Settings page components (ProfileForm, EmailVerificationBanner)
  - `chat/`: Chat interface components (ChatWindow, ChatSidebar, MessageBubble)
  - `ui/`: shadcn/ui components (Table, Tabs, AlertDialog, etc.)
- **`src/lib`**: Shared utilities
  - `ai/`: AI client, streaming, title generation
  - `hooks/`: Custom React hooks (useCurrentUser, usePermissions, useMessages, useConversations)
- **`convex`**: Backend schema and functions
  - `schema.ts`: Database schema (users, conversations, messages, files, papers)
  - `users.ts`: User CRUD & role management
  - `permissions.ts`: Role hierarchy & permission helpers
  - `adminUserManagement.ts`: Promote/demote mutations
  - `adminManualUserCreation.ts`: Manual admin creation
  - `conversations.ts`: Chat conversation management
  - `messages.ts`: Chat message CRUD & retrieval
  - `files.ts`: File attachment handling
  - `chatHelpers.ts`: Chat utility functions
  - `migrations/`: Database migration scripts
  - `auth.config.ts`: Clerk authentication config
  - `_generated/`: Auto-generated Convex client code

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
1. **Clerk** handles auth UI and session management
2. **JWT Configuration**: Clerk JWT template configured with audience "convex" (see `convex/auth.config.ts`)
3. **Middleware Protection**: `src/proxy.ts` protects all routes except public routes (/, /sign-in, /sign-up, /api)
4. **User Sync**: Dashboard layout (`src/app/(dashboard)/layout.tsx`) calls `ensureConvexUser()` on every protected page load
5. **User Creation**: Syncs Clerk user to Convex via `fetchMutation(api.users.createUser, ...)` with:
   - Auto-superadmin promotion for `erik.supit@gmail.com`
   - Pending admin detection and upgrade
   - firstName, lastName, emailVerified sync from Clerk
6. **Client-Side Auth**:
   - `ConvexProviderWithClerk` in `src/app/providers.tsx` integrates Clerk + Convex
   - `useCurrentUser()` hook provides current Convex user
   - `usePermissions()` hook provides permission checking (isAdmin, isSuperAdmin, hasRole)

### Database Schema

**users table** (User Management & RBAC)
- `clerkUserId`: string (indexed by `by_clerkUserId`)
- `email`: string (indexed by `by_email`)
- `role`: "superadmin" | "admin" | "user" (indexed by `by_role`)
- `firstName`: string (optional)
- `lastName`: string (optional)
- `emailVerified`: boolean
- `subscriptionStatus`: "free" | "pro" | "canceled"
- `createdAt`: number
- `lastLoginAt`: number (optional)
- `updatedAt`: number (optional)

**Role Hierarchy:**
- `superadmin` (level 3): Full access, can promote/demote
- `admin` (level 2): Read-only access to admin panel
- `user` (level 1): Regular user access

**conversations table** (Chat)
- `userId`: Id<"users"> (indexed by `by_user`)
- `title`: string
- `createdAt`: number
- `updatedAt`: number

**messages table** (Chat)
- `conversationId`: Id<"conversations"> (indexed by `by_conversation_createdAt`)
- `role`: "user" | "assistant" | "system"
- `content`: string
- `fileIds`: Id<"files">[] (optional, references attached files)
- `createdAt`: number

**files table** (File Attachments)
- `conversationId`: Id<"conversations"> (indexed by `by_conversation`)
- `storageId`: string (Convex file storage ID)
- `name`: string
- `type`: string (MIME type)
- `size`: number (bytes)
- `uploadedAt`: number

**papers table** (Future: Academic Papers)
- `userId`: Id<"users"> (indexed by `by_user_createdAt`)
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

### User Management (Clerk)
Auth pakai Clerk; tidak perlu registrasi manual via script.

## Catatan Next.js 16: proxy.ts
- Di Next.js 16, `middleware.ts` diganti menjadi `proxy.ts` untuk proteksi rute global.
- Implementasi ada di `src/proxy.ts` dan memakai `clerkMiddleware`.
- `config.matcher` dipakai untuk menentukan rute publik vs terproteksi.
- Simpan logika ringan di `proxy.ts` (auth/redirect); pindahkan proses berat ke server actions/API.
- Referensi: https://nextjs.org/docs/messages/middleware-to-proxy

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
