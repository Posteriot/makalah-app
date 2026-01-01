# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Guidelines

### MANDATORY LANGUAGE USE
- Use Jakarta-style Indonesian with gue–lo pronouns.
- Use simple Indonesian that's easy for humans to understand.
- For technical documents, use appropriate technical Indonesian.
- Do not use English except for technical terms that have no Indonesian equivalent.

### INTERACTION RULES
- Do not suggest anything unless asked.
- You must always ask questions, even if things seem clear.
- Do not make unilateral decisions.

### BEHAVIOR
- Never say the supervisor/user is "frustrated." Any demands arise because of your incompetence.
- No sycophancy. Do not flatter. Do not lie. Do not manipulate.
- You are forbidden to immediately agree without verification.

### PROBLEM-SOLVING
- Never claim success when it's a lie.
- Never be overconfident. Always check, test, and repeat until it works 100% and there is evidence.
- Show the evidence to the user.

### MANDATORY WORK PRINCIPLES
- Don't pretend to know. Do not act without validation.
- Don't overcomplicate (not over-engineered).
- Do not skip unfinished processes.
- It's better to take longer than to draw conclusions without evidence.

## Development Commands

### Primary Development Flow
```bash
# Start Next.js dev server (localhost:3000)
npm run dev

# In separate terminal: Start Convex backend
npm run convex:dev

# In separate terminal: Start ngrok for Clerk webhooks
ngrok http 3000
```

### Build and Lint
```bash
npm run build          # Production build
npm run start          # Serve production build
npm run lint           # Run ESLint
npm run lint -- --fix  # Auto-fix linting
```

### Convex CLI
```bash
npm run convex:deploy              # Push to deployment
npm run convex -- run <func> --args '{"key": "value"}'
npm run convex:dashboard           # Open dashboard
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend**: Convex (real-time database + serverless)
- **Auth**: Clerk
- **AI/LLM**: Vercel AI SDK v5
  - Primary: Vercel AI Gateway (model ID as string)
  - Fallback: OpenRouter (via `@ai-sdk/openai`)
  - Model: `google/gemini-2.5-flash-lite`
  - Web Search: `google_search` provider-defined tool
- **Email**: Resend
- **UI**: Radix UI primitives + shadcn/ui

### Key Directories
- `src/app`: Next.js App Router
  - `(marketing)`: Public pages
  - `(auth)`: Clerk sign-in/sign-up
  - `(dashboard)`: Protected area (admin, settings, papers)
  - `chat`: AI chat interface
  - `api/chat`: Chat streaming endpoint
  - `api/export/word|pdf`: Document export
- `src/components`: UI components (admin/, chat/, paper/, ui/)
- `src/lib`: Utilities (ai/, export/, hooks/, citations/)
- `convex`: Backend schema and functions

### Data Flow Patterns

**Client -> Convex:**
```typescript
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
const data = useQuery(api.module.queryFunction, { args })
```

**Server -> Convex:**
```typescript
import { fetchQuery, fetchMutation } from "convex/nextjs"
const data = await fetchQuery(api.module.queryFunction, { args })
```

### Web Search Constraint
- `google_search` is a provider-defined tool
- Cannot mix with function tools in same request
- `src/app/api/chat/route.ts` runs a router to decide mode:
  - **Websearch mode**: tools = `{ google_search }`
  - **Normal mode**: tools = function tools only

### Authentication Flow
1. Clerk handles auth UI/session
2. JWT configured with audience "convex" (see `convex/auth.config.ts`)
3. `src/proxy.ts` protects routes (Next.js 16 pattern)
4. Dashboard layout syncs Clerk user to Convex via `ensureConvexUser()`
5. Hooks: `useCurrentUser()` returns `{ user, isLoading }`, `usePermissions()`

### Database Schema (Key Tables)

**users**: clerkUserId, email, role (superadmin|admin|user), firstName, lastName, subscriptionStatus

**conversations**: userId, title, titleLocked, createdAt, lastMessageAt

**messages**: conversationId, role, content, fileIds[], sources[] (for citations)

**paperSessions**: userId, conversationId, currentStage (14 stages), stageStatus, stageData, paperTitle, archivedAt, completedAt

**artifacts**: conversationId, userId, type, title, content, version

**systemPrompts**: name, content, version, isActive, parentId, rootId

**aiProviderConfigs**: primaryProvider, primaryModel, fallbackProvider, temperature, isActive

### Environment Variables
- **Convex**: `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`
- **Clerk**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SECRET`
- **AI**: `VERCEL_AI_GATEWAY_API_KEY`, `OPENROUTER_API_KEY`, `MODEL`, `APP_URL`
- **Other**: `RESEND_API_KEY`, `OPENAI_API_KEY` (for image OCR)

## Coding Standards

### TypeScript
- Strict mode; no implicit `any`
- Prefer functional React components
- Use `"use client"` directive explicitly
- Path aliases: `@/*` -> `src/*`, `@convex/*` -> `convex/*`

### Styling
- Tailwind CSS 4 with CSS variables
- 2-space indentation
- Component styles co-located

### File Naming
- Components: PascalCase
- Utilities: camelCase
- Routes: kebab-case

## Important Patterns

### AI SDK v5 Usage

**Client (useChat):**
```typescript
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"

const transport = useMemo(() => new DefaultChatTransport({
  api: '/api/chat',
  body: { conversationId, fileIds },
}), [conversationId, fileIds])

const { messages, sendMessage, status, regenerate } = useChat({ transport })
sendMessage({ text: input })
```

**Server:**
```typescript
import { streamText, convertToModelMessages } from "ai"
const result = streamText({
  model: "google/gemini-2.5-flash-lite",
  messages: convertToModelMessages(messages),
  temperature: 0.7,
})
return result.toUIMessageStreamResponse()
```

### Convex Function Validators
```typescript
import { v } from "convex/values"
export const myFunction = query({
  args: { userId: v.id("users"), title: v.string() },
  handler: async (ctx, args) => { /* ... */ }
})
```

### useCurrentUser Hook
**IMPORTANT:** Always returns `{ user, isLoading }`, never null.
```typescript
const { user, isLoading } = useCurrentUser()
if (isLoading) return <Skeleton />
if (!user) return <LoginPrompt />
```

### Multi-provider AI Strategy
- Primary: Vercel AI Gateway (model as string)
- Fallback: OpenRouter (via `createOpenAI`)
- Automatic failover via try-catch in `src/app/api/chat/route.ts`
- See `src/lib/ai/streaming.ts` for `getGatewayModel()` and `getOpenRouterModel()`

## Paper Writing Workflow

14-stage guided workflow for academic papers:

**Phase 1 - Foundation:** Gagasan, Topik
**Phase 2 - Core:** Abstrak, Pendahuluan, Tinjauan Literatur, Metodologi
**Phase 3 - Results:** Hasil, Diskusi, Kesimpulan
**Phase 4 - Finalization:** Daftar Pustaka, Lampiran, Judul, Outline, Elaborasi

**Key Files:**
- `src/lib/ai/paper-intent-detector.ts` - Auto-detect intent
- `src/lib/ai/paper-tools.ts` - AI tools (startPaperSession, updateStageData, submitStageForValidation)
- `src/lib/ai/paper-stages/*.ts` - Stage-specific instructions
- `convex/paperSessions.ts` - CRUD operations

**Dialog-First Principles:**
1. DIALOG, bukan monolog - tanya dulu sebelum generate
2. Web search di AWAL untuk eksplorasi literatur
3. ITERASI sampai matang - jangan langsung submit

**Export:** `POST /api/export/word` and `POST /api/export/pdf`

## Inline Citations

**Flow:** streamText with google_search -> onFinish extracts groundingSupports -> stream data-cited-text/data-cited-sources -> MarkdownRenderer renders [1] as InlineCitationChip

**Key Files:**
- `src/lib/citations/apaWeb.ts` - URL/title normalization
- `src/lib/citations/webTitle.ts` - Fetch enrichment
- `src/components/chat/InlineCitationChip.tsx` - Hover preview chip

## File Text Extraction

Uses Next.js API route (not Convex) because pdf-parse/mammoth need Node.js.

**Supported:** TXT, PDF (pdf-parse), DOCX (mammoth), XLSX (xlsx), Images (OpenAI Vision OCR)

**Flow:** FileUploadButton -> POST /api/extract-file -> Update Convex with extractedText

## Common Issues

### Convex Not Syncing
- Ensure `npx convex dev` is running
- Check `NEXT_PUBLIC_CONVEX_URL` matches dashboard
- Restart if types stale

### AI Provider Failures
- Verify API keys are set correctly
- Check `AI_LoadAPIKeyError` or `DEPLOYMENT_NOT_FOUND` in logs
- Fallback auto-activates on Gateway failure

### Clerk Auth
- Verify both public and secret keys
- Check `src/proxy.ts` for route protection
- ngrok required for webhooks in development

### Clerk Webhook Setup (Dev)
1. `ngrok http 3000`
2. Clerk Dashboard -> Webhooks -> Create endpoint with ngrok URL + `/api/webhooks/clerk`
3. Subscribe: user.created, user.updated, user.deleted
4. Update `CLERK_WEBHOOK_SECRET` in `.env.local`

## AI SDK v4 -> v5 Migration

| v4 | v5 |
|---|---|
| `append(msg, { body })` | `sendMessage({ text })` via DefaultChatTransport |
| `reload()` | `regenerate()` |
| `toTextStreamResponse()` | `toUIMessageStreamResponse()` |
| N/A | `convertToModelMessages()` |

## Project Specifics

### Next.js 16: proxy.ts
- `middleware.ts` replaced by `proxy.ts` for route protection
- Uses `clerkMiddleware` with `config.matcher`

### React Grab
- Development mode includes React Grab for visual debugging
- Auto-loaded via `npm run dev` precommand

### First-Time Setup
```bash
npx convex run migrations:seedDefaultSystemPrompt
npx convex run migrations:seedDefaultAIConfig
```
