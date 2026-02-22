# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Guidelines

### MANDATORY LANGUAGE USE
- All rules in this file must be written in English.
- When communicating with users, use Jakarta-style Indonesian with gue–lo pronouns.
- Use simple Indonesian that's easy for humans to understand.
- For technical documents, use appropriate technical Indonesian.
- Do not use English in user communication except for technical terms that have no Indonesian equivalent.

### INTERACTION RULES
- Do not suggest anything unless asked.
- You must always ask questions, even if things seem clear.
- Do not make unilateral decisions.

### MANDATORY RESPONSE ATTITUDE
- Always provide the single best recommendation when you offer anything, present options, or give choices.
- If you list multiple options, clearly label which one is the best and why it is best for the user's context.
- Do not present options without a recommendation.
- If the user's context is insufficient to pick the best option, ask targeted clarifying questions before recommending.

### BEHAVIOR
- Never say the supervisor/user is "frustrated." Any demands arise because of your incompetence.
- No sycophancy. Do not flatter. Do not lie. Do not manipulate.
- You are forbidden to immediately agree without verification.

### PROBLEM-SOLVING
- Never claim success when it's a lie.
- Never be overconfident. Always check, test, and repeat until it works 100% and there is evidence.
- Show the evidence to the user.

### MANDATORY WORK PRINCIPLES
- Do not act without validation.
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
```

### Build, Lint, and Test
```bash
npm run build          # Production build
npm run start          # Serve production build
npm run lint           # Run ESLint
npm run lint -- --fix  # Auto-fix linting
npm run test           # Run all tests (vitest)
npx vitest run __tests__/refrasa-button.test.tsx  # Run single test file
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
- **Auth**: BetterAuth (`better-auth` + `@convex-dev/better-auth` Convex component)
- **AI/LLM**: Vercel AI SDK v5
  - Primary: Vercel AI Gateway → `gemini-2.5-flash`
  - Fallback: OpenRouter → `openai/gpt-5.1`
  - Web Search: `google_search` provider-defined tool (Gateway), `:online` suffix (OpenRouter)
  - **NOTE:** Actual config stored in `aiProviderConfigs` table. Check Admin Panel for current values.
- **Email**: Resend
- **UI**: Radix UI primitives + shadcn/ui

### Key Directories
- `src/app`: Next.js App Router
  - `(marketing)`: Public pages (home, pricing, about, blog, docs, privacy)
  - `(auth)`: Custom sign-in/sign-up/verify-2fa (BetterAuth)
  - `(dashboard)`: Protected area (admin, settings, subscription)
  - `(account)`: User account (settings, checkout)
  - `(onboarding)`: First-time user flow (get-started)
  - `cms`: CMS admin interface (dedicated shell, not inside dashboard)
  - `chat`: AI chat interface (landing page)
  - `chat/[conversationId]`: Dynamic route for specific conversations
  - `api/chat`: Chat streaming endpoint
  - `api/export/word|pdf|receipt`: Document and receipt export
  - `api/refrasa`: Refrasa endpoint
  - `api/extract-file`: File text extraction
  - `api/admin/validate-provider|verify-model-compatibility`: Admin AI config validation
  - `api/payments/topup`: BPP credit topup
  - `api/webhooks/xendit`: Xendit payment webhook
  - `api/auth`: BetterAuth API + email recovery precheck
- `src/components`: UI components (admin/, ai-elements/, ai-ops/, auth/, billing/, chat/, cms/, layout/, marketing/, onboarding/, paper/, refrasa/, settings/, theme/, ui/)
- `src/lib`: Utilities (ai/, billing/, citations/, convex/, date/, email/, export/, file-extraction/, hooks/, paper/, refrasa/, utils/, xendit/)
- `convex`: Backend schema and functions (billing/, migrations/, paperSessions/)

### Data Flow Patterns

**Client -> Convex:** Use `useQuery`/`useMutation` from `convex/react` with `api` from `@convex/_generated/api`

**Server -> Convex:** Use `fetchQuery`/`fetchMutation` from `convex/nextjs`

**Mutation Retry:** Use `retryMutation()` from `src/lib/convex/retry.ts` for critical mutations that may transiently fail

### Web Search Constraint
- `google_search` is a provider-defined tool
- Cannot mix with function tools in same request
- `src/app/api/chat/route.ts` runs a router to decide mode:
  - **Websearch mode**: tools = `{ google_search }`
  - **Normal mode**: tools = function tools only

### Authentication Flow
1. BetterAuth handles auth via custom sign-in/sign-up forms (no third-party UI)
2. Auth methods: Email/Password, Google OAuth, Magic Link, Two-Factor Auth (OTP via email)
3. `convex/auth.ts` configures BetterAuth with Convex component adapter (`@convex-dev/better-auth`)
4. Plugins: `crossDomain`, `convex`, `magicLink`, `twoFactor`, `twoFactorCrossDomainBypass`
5. `convex/auth.config.ts` defines JWT providers for Convex token validation
6. `src/proxy.ts` protects routes via `ba_session` cookie (set by `SessionCookieSync` in providers)
7. Two-table strategy: BetterAuth manages its own `user` table; app has separate `users` table linked via `betterAuthUserId`
8. Client-side user sync: `useCurrentUser()` hook auto-creates app user record if authenticated but no Convex record yet
9. Hooks: `useCurrentUser()` returns `{ user, isLoading }`, `usePermissions()`

**Key Auth Files:**
- `convex/auth.ts` - BetterAuth server config (providers, plugins, email callbacks)
- `convex/auth.config.ts` - JWT provider config for Convex
- `convex/http.ts` - HTTP routes for BetterAuth API endpoints + custom 2FA OTP endpoints
- `convex/twoFactorHttp.ts` - Two-factor cross-domain OTP send/verify
- `src/lib/auth-client.ts` - Client-side auth (`useSession`, `signIn`, `signUp`, `signOut`, `authClient`) with `twoFactorClient` and `magicLinkClient` plugins
- `src/lib/auth-server.ts` - Server-side auth (`isAuthenticated()`, `getToken()`, `getBetterAuthCookies()`)
- `src/app/providers.tsx` - `AppProviders` wrapping the app (includes `ConvexBetterAuthProvider`)

### Database Schema (Key Tables)

**users**: betterAuthUserId, email, role (superadmin|admin|user), firstName, lastName, subscriptionStatus

**conversations**: userId, title, titleLocked, createdAt, lastMessageAt

**messages**: conversationId, role, content, fileIds[], sources[] (for citations)

**files**: userId, conversationId, storageId, name, type, size, status, extractedText, extractionStatus

**styleConstitutions**: name, content, version, isActive, type (naturalness|style), parentId, rootId (for Refrasa tool - Layer 2 style rules)

**paperSessions**: userId, conversationId, currentStage (13 stages), stageStatus, stageData, paperTitle, archivedAt, completedAt, paperMemoryDigest

**artifacts**: conversationId, userId, type, title, content, version, invalidatedAt?, invalidatedByRewindToStage?

**rewindHistory**: sessionId, userId, fromStage, toStage, invalidatedArtifactIds[], invalidatedStages[], createdAt

**systemPrompts**: name, content, version, isActive, parentId, rootId

**systemAlerts**: alertType, severity (info|warning|critical), message, source, resolved, metadata

**aiProviderConfigs**: primaryProvider, primaryModel, fallbackProvider, fallbackModel, temperature, isActive, maxTokens, web search settings, tool visibility

**Billing & Subscriptions:**
- **usageEvents**: Token tracking per operation (chat, paper, web search, refrasa)
- **userQuotas**: Monthly token/paper limits per tier (gratis, bpp, pro)
- **creditBalances**: BPP prepaid balance tracking
- **payments**: Xendit payment records
- **subscriptions**: Pro recurring billing

**Marketing CMS:**
- **pricingPlans**: Pricing tier configurations
- **documentationSections**: Docs page content blocks
- **blogSections**: Blog content with categories
- **pageContent**: Structured CMS sections (hero, benefits, features, pricing-header, page-settings) with image storage + background pattern toggles (showGridPattern, showDiagonalStripes, showDottedPattern)
- **richTextPages**: TipTap WYSIWYG pages (about, privacy, security, terms)
- **siteConfig**: Global config (header nav links, footer sections/copyright, showDiagonalStripes)

**Auth & Security:**
- **authRecoveryAttempts**: Rate limiting for magic link and forgot password (keyHash, emailHash, ipHash, intent, attemptCount, blockedUntil)
- **twoFactorOtps**: OTP for cross-domain 2FA workaround (email, otpHash, expiresAt, attempts, used)

**Other:**
- **papers**: Standalone paper records (userId, title, abstract)
- **waitlistEntries**: Pre-registration waitlist (email, status: pending|invited|registered)
- **appConfig**: Key-value app configuration (key, value)

## Frontend CMS Architecture

Hybrid CMS for all marketing pages. Admin-only (superadmin/admin). Static fallback when unpublished.

### CMS Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| **pageContent** | Structured sections (hero, benefits, features, pricing-header, page-settings) | pageSlug, sectionSlug, sectionType, title, description, items[], imageId, isPublished, sortOrder, showGridPattern?, showDiagonalStripes?, showDottedPattern? |
| **richTextPages** | TipTap WYSIWYG pages (about, privacy, security, terms) | slug, title, content (JSON), lastUpdatedLabel, isPublished |
| **siteConfig** | Global config (header nav, footer, background patterns) | key, value (JSON), updatedBy, showDiagonalStripes? |

### Frontend Rendering Pattern

Two patterns depending on content type:

**Wrapper Pattern** (home page sections — hero, benefits, features):
- `XxxSection.tsx` — `"use client"` wrapper with `useQuery(api.pageContent.getSection)`
- `XxxCMS.tsx` — renders from DB data with conditional background patterns
- Loading → null, unpublished → null (hidden), published → CMS
- Background patterns respect `content.showGridPattern !== false` (default ON when undefined)

**CmsPageWrapper** (policy/about pages):
- Wraps existing page component with `useQuery(api.richTextPages.getPageBySlug)`
- Loading → null, no data → render children as-is (static page), published → TipTap RichTextRenderer
- CMS mode does NOT use SimplePolicyPage (it splits children into intro callout + article)

**Inline Fallback** (header/footer):
- CMS query inside existing component, derive data from CMS with fallback to hardcoded constants

### CMS Admin Interface

Dedicated CMS at `/cms` route with shell-based architecture (not inside `/dashboard`):

**Shell Components** (`src/components/cms/`):
- `CmsShell.tsx` — main layout: activity bar + sidebar + editor area. Editor routing logic lives here
- `CmsActivityBar.tsx` — vertical icon bar (left edge) for page switching
- `CmsSidebar.tsx` — collapsible section list per page. "Content Manager" header is clickable to reset to main overview
- `CmsTopBar.tsx` — breadcrumb navigation bar above editor
- `CmsMainOverview.tsx` — dashboard shown on initial load (queries 6 data sources, shows per-page status)

**Per-Page Overviews** (`src/components/cms/`):
- `CmsPageOverview.tsx` — Home page section status
- `CmsPricingOverview.tsx` — Pricing plans status
- `CmsDocOverview.tsx` — Documentation sections status
- `CmsBlogOverview.tsx` — Blog posts status
- `CmsLegalOverview.tsx` — Legal/policy pages status
- `CmsGlobalLayoutOverview.tsx` — Header/Footer config status

**Section Editors** (`src/components/admin/cms/`):
- `HeroSectionEditor.tsx` — hero section fields + image upload + pattern toggles
- `BenefitsSectionEditor.tsx` — benefits accordion items + pattern toggles
- `FeatureShowcaseEditor.tsx` — reusable for workflow + refrasa features + pattern toggles
- `ManifestoSectionEditor.tsx` — manifesto section + pattern toggles
- `ProblemsSectionEditor.tsx` — problems section + pattern toggles
- `AgentsSectionEditor.tsx` — agents section + pattern toggles
- `CareerContactEditor.tsx` — career/contact section + pattern toggles
- `PricingHeaderEditor.tsx` — pricing section header (reusable for home teaser + pricing page)
- `PricingPlanEditor.tsx` — individual pricing plan editor
- `HeaderConfigEditor.tsx` — nav link list editor
- `FooterConfigEditor.tsx` — footer sections, social links, copyright + pattern toggles
- `DocSectionListEditor.tsx` / `DocSectionEditor.tsx` — documentation drill-down
- `BlogPostListEditor.tsx` / `BlogPostEditor.tsx` — blog drill-down
- `RichTextPageEditor.tsx` — TipTap WYSIWYG for policy/about pages
- `TipTapEditor.tsx` — TipTap editor component (default export)
- `CmsImageUpload.tsx` — Convex file storage image upload
- `CmsSaveButton.tsx` — reusable save button with loading state

**CMS Pages Managed:**
| Page | Sections |
|------|----------|
| Home | hero, benefits, features-workflow, features-refrasa, pricing-teaser |
| About | manifesto, problems, agents, career-contact |
| Pricing | pricing-header, gratis plan, bpp plan, pro plan |
| Docs | documentation sections (drill-down list → editor) |
| Blog | blog posts by category (drill-down list → editor) |
| Legal | privacy, security, terms (RichText pages) |
| Global Layout | header config, footer config |

### Background Pattern CMS Toggles

Each CMS section can toggle background patterns (GridPattern, DiagonalStripes, DottedPattern). Fields are `v.optional(v.boolean())` — uses `!== false` check so default is ON when field is undefined (backward compatible).

Pattern availability per section follows the design system's pattern map. Footer uses `siteConfig.showDiagonalStripes` instead of `pageContent`.

### Key Frontend Files
- `src/app/cms/page.tsx` — CMS route entry point
- `src/components/cms/CmsShell.tsx` — main CMS layout + editor routing
- `src/components/cms/CmsMainOverview.tsx` — main dashboard overview
- `src/components/marketing/CmsPageWrapper.tsx` — policy/about CMS wrapper
- `src/components/marketing/RichTextRenderer.tsx` — TipTap read-only renderer
- `src/components/marketing/hero/HeroSection.tsx` — hero wrapper
- `src/components/marketing/benefits/BenefitsSection.tsx` — benefits wrapper
- `src/components/marketing/features/WorkflowFeatureSection.tsx` — workflow wrapper
- `src/components/marketing/features/RefrasaFeatureSection.tsx` — refrasa wrapper
- `src/components/marketing/pricing-teaser/PricingTeaser.tsx` — pricing teaser with CMS header
- `convex/pageContent.ts` — structured content CRUD (includes pattern fields)
- `convex/richTextPages.ts` — rich text pages CRUD
- `convex/siteConfig.ts` — global config CRUD (includes pattern fields)
- `convex/migrations/seedHomeContent.ts` — seed data for home page sections

### Environment Variables
- **Convex**: `NEXT_PUBLIC_CONVEX_URL`, `CONVEX_DEPLOYMENT`, `CONVEX_INTERNAL_KEY` (server-side Convex access)
- **BetterAuth**: `BETTER_AUTH_SECRET`, `SITE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_CONVEX_SITE_URL`, `CONVEX_SITE_URL` (used in `convex/auth.ts`)
- **AI**: `VERCEL_AI_GATEWAY_API_KEY` (auto-aliased to `AI_GATEWAY_API_KEY`), `OPENROUTER_API_KEY`, `APP_URL`
- **Payments**: `XENDIT_SECRET_KEY`, `XENDIT_WEBHOOK_TOKEN`, `XENDIT_WEBHOOK_SECRET`
- **Security**: `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `AUTH_EMAIL_PRECHECK_ENABLED`
- **Email**: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- **Admin**: `SUPERADMIN_EMAILS`, `ADMIN_EMAILS`

### Prerequisites
- Node.js 20+ (see `engines` in package.json)

### Testing
- **Framework**: Vitest with jsdom environment
- **Setup file**: `src/setupTests.ts` (auto-loaded)
- **Path aliases**: `@/*` and `@convex/*` work in tests
- Run single test: `npx vitest run __tests__/<file>.test.tsx`
- Tests excluded from `.development/` directory

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

## Mechanical Grace Design System

Design system frontend Makalah App. Estetika **Technical Industrialism** (Developer-Centric Minimalism) — UI adalah instrumen presisi, bukan dekorasi. Full documentation di `docs/makalah-design-system/`.

**Trinity Approach**: Identity (Makalah-Carbon tokens) + Structure (shadcn/ui) + Delivery (Tailwind CSS v4). shadcn components otomatis mengikuti tema karena CSS variables (`--background`, `--primary`, dll) di-remap di `globals.css`.

### Color System (Signal Theory)

Warna adalah **Status Signal**, bukan dekorasi. Semua nilai dalam OKLCH.

| Role | Color | Token/Usage |
|------|-------|-------------|
| **Primary Brand** | Amber | `--primary`, CTA, status premium, PRO tier |
| **Secondary Brand** | Emerald | Trust/validation, GRATIS tier, verified status |
| **AI Identity** | Sky | `--ai-border`, machine-generated content, BPP tier, `--info` |
| **Neutrals** | Slate | Background, borders, surfaces (50–950 scale) |
| **Success** | Teal | `--success`, modern scientific feel |
| **Destructive** | Rose | `--destructive`, critical/delete actions |

**AI visual identity**: Sky (dashed/dotted border) + Slate-950 terminal background. AI TIDAK menggunakan warna ungu.

**Business Tiers**: GRATIS = Emerald-600, BPP = Sky-600, PRO = Amber-500.

### Typography

Two-pillar font system: **Geist Sans** (narrative/UI) + **Geist Mono** (data/technical).

| Class | Font | Usage |
|-------|------|-------|
| `.text-narrative` | Geist Sans | Headings, hero titles, page headlines |
| `.text-interface` | Geist Mono | Body, navigation, labels, data, descriptions |
| `.text-signal` | Geist Mono + Uppercase + Wide Tracking | Tags, badges, status indicators |

**Strict rules:**
- All numbers (prices, stats, IDs, timestamps) MUST use Geist Mono
- Labels/badges: Mono + Bold + Uppercase + `tracking-widest`
- Headings H1/H2: `tracking-tight` for industrial feel
- Body text: 12px Regular (400). Labels: 10px Bold (700) Uppercase

### Hybrid Radius (Shape System)

Contrast between premium shells and sharp data cores:

| Level | Class | Value | Usage |
|-------|-------|-------|-------|
| **Shell** | `.rounded-shell` | 16px (xl) | Outer cards, main containers |
| **Action** | `.rounded-action` | 8px (md) | Buttons, standard inputs |
| **Badge** | `.rounded-badge` | 6px | Status tags, category badges |
| **Core** | `.rounded-none` | 0px | Data grids, terminal lines |

**DILARANG** menggunakan `rounded-xl`, `rounded-lg` generik. Harus pakai skala di atas.

### Border System (Mechanical Lines)

| Class | Value | Usage |
|-------|-------|-------|
| `.border-hairline` | 0.5px | Internal dividers, list separators |
| `.border-main` | 1px solid | Component borders (card, input) |
| `.border-ai` | 1px dashed | AI-generated content only |

### Iconography

- **Library**: Iconoir (`iconoir-react`), bukan Lucide
- **Stroke**: 1.5px standard, 2px high contrast. No solid icons kecuali active state
- **Sizes**: Micro (12px) badges/status, Interface (16px) default UI, Display (24px) headers/hero

### Industrial Textures

| Pattern | Usage |
|---------|-------|
| **Grid Pattern** | 48px squares, empty dashboard/chat backgrounds |
| **Dotted Pattern** | AI panels, diagnostic areas, "Machine Thinking" |
| **Diagonal Stripes** | Hover actions, warning, premium/PRO areas |

Opacity: 10-15%. Always with radial mask fade-out.

### Spacing & Layout

- **Base unit**: 4px grid
- **Spacing scale**: xs(4px), sm(8px), md(16px), lg(24px), xl(32px), 2xl(48px), 3xl(64px)
- **Utility classes**: `.p-comfort`/`.gap-comfort` (16px), `.p-dense`/`.gap-dense` (8px), `.p-airy` (24px+)
- **Grid**: 16-column system. Breakpoints: sm(<672px, 4col), md(672-1055px, 8col), lg(1056+, 16col)

### Interaction & Motion

- **Durations**: Instant (50ms) hover, Fast (150ms) toggles, Standard (250ms) modals
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)`. No bounce.
- **Hover**: `.hover-slash` (diagonal stripes) for premium/command actions. Standard buttons may use solid hover.
- **Active nav**: `.active-nav` — left border 2px Amber-500
- **Focus**: `.focus-ring` — Sky/Info ring, not browser default blue

### Chat Workspace Layout Rules

- **Zero Chrome**: Global Header dan Footer DILARANG di area `/chat/*`
- Navigation back to Home via brand logo in Sidebar Header only
- Mini-footer: single horizontal line, Mono 10px, copyright only (no logo)
- Main menu navigation suppressed for full cognitive focus
- 16-column grid workbench layout, maximized vertical real-estate

### Page Layout Architecture

| Page Type | Structure |
|-----------|-----------|
| Home | GlobalHeader → Hero → Sections → Footer |
| Pricing/About/Blog | GlobalHeader → Sections → Footer (NO Hero) |
| Documentation | GlobalHeader → Sidebar + Side-by-side → Article |
| AI Chat | SidebarHeader → 16-Col Grid → ChatMiniFooter |
| Admin Dashboard | AdminSidebar (left) → Main Content (right) |

Section padding: min 48px (2xl) for standard, 64px (3xl) for landing pages.

### Z-Index Layering

`.z-base` (default) → `.z-overlay` (10) → `.z-popover` (20) → `.z-drawer` (50) → `.z-command` (100)

### Migration Protocol

Migration ke Mechanical Grace dilakukan **incremental** (Fase 1: Foundation tokens → Fase 2: Global shell → Fase 3: Page-by-page). Tracker dan rollback protocol di `docs/makalah-design-system/migration-guide.md`.

**Common pitfalls:**
- "Ghost" rounded corners (generic `rounded` tanpa `-shell`/`-action`)
- Lucide-Iconoir mixture (harus konsisten per halaman)
- Font Sans untuk angka (harus Mono)
- Global Header leak ke `/chat/*`
- `border-ai` (dashed) pada konten non-AI

**Full documentation**: `docs/makalah-design-system/` — lihat README.md untuk index lengkap semua dokumen.

## Important Patterns

### AI SDK v5 Usage

**Client:** Use `useChat` from `@ai-sdk/react` with `DefaultChatTransport` from `ai`. Transport configured with `/api/chat` endpoint. Key methods: `sendMessage({ text })`, `regenerate()`, `status`

**Server:** Use `streamText` + `convertToModelMessages` from `ai`. Return via `result.toUIMessageStreamResponse()`

### Convex Function Validators
Use `v` from `convex/values` for argument validation. Pattern: `query/mutation({ args: { field: v.type() }, handler: async (ctx, args) => {} })`

### useCurrentUser Hook
**IMPORTANT:** Always returns `{ user, isLoading }` object (never null itself, but `user` can be null). Handle loading state first, then check user existence.
- Uses `useSession()` from BetterAuth to get auth state
- Queries Convex `users` table via `getUserByBetterAuthId`
- Auto-creates app user record via `createAppUser` mutation if authenticated but no Convex record exists

### Multi-provider AI Strategy
- Primary: Vercel AI Gateway (via `createGateway` from `@ai-sdk/gateway`)
- Fallback: OpenRouter (via `createOpenRouter` from `@openrouter/ai-sdk-provider`)
- Automatic failover via try-catch in `src/app/api/chat/route.ts`
- See `src/lib/ai/streaming.ts` for `getGatewayModel()` and `getOpenRouterModel()`

### Auto-Generated Conversation Titles
- `src/lib/ai/title-generator.ts` - `generateTitle({ userMessage, assistantMessage? })`
- Max 50 chars, Indonesian language
- Primary → Gateway, Fallback → OpenRouter, Final fallback → truncate user message
- Called after first AI response in new conversations

### Fallback Web Search (`:online` suffix)

When Gateway fails during web search, fallback uses OpenRouter's `:online` suffix.

**How it works:**
1. Gateway fails + web search requested → check `fallbackWebSearchEnabled` config
2. If enabled → append `:online` to model ID (e.g., `model-id:online`)
3. OpenRouter annotations → `normalizeCitations('openrouter')` → citations UI

**Admin Config (Admin Panel → AI Providers → Web Search Settings):**
- `primaryWebSearchEnabled` (default: true) - Enable `google_search` for Gateway
- `fallbackWebSearchEnabled` (default: true) - Enable `:online` for OpenRouter
- `fallbackWebSearchEngine` (default: "auto") - Engine: "auto" | "native" | "exa"
- `fallbackWebSearchMaxResults` (default: 5) - Max results (1-10)

**Troubleshooting:**
- Web search not working in fallback → Check `fallbackWebSearchEnabled` is true
- Citations not appearing → Check console `[Fallback] Web search config:`
- `:online` fails → Auto-retry without suffix (graceful degradation)

**Key Files:**
- `src/lib/ai/streaming.ts` → `getWebSearchConfig()`, `getOpenRouterModel()`
- `src/lib/citations/normalizer.ts` → `normalizeCitations()`

## System Prompt Management

Database-driven system prompt dengan fallback monitoring.

### Architecture
- **Primary**: Fetch active prompt from `systemPrompts` table
- **Fallback**: Minimal prompt when database fails (indicates degraded state)
- **Monitoring**: Alerts logged to `systemAlerts` table, visible in admin panel

### Key Files
- `src/lib/ai/chat-config.ts` - `getSystemPrompt()` with fallback + logging
- `convex/systemPrompts.ts` - CRUD for prompts (versioned, single-active)
- `convex/systemAlerts.ts` - Alert queries/mutations
- `src/components/admin/SystemHealthPanel.tsx` - Monitoring UI
- `src/components/admin/SystemPromptsManager.tsx` - Prompt editor

### Fallback Flow
`getSystemPrompt()` in `src/lib/ai/chat-config.ts`: Try fetch active prompt → if fails or empty, log alert via `logFallbackActivation()` → return minimal fallback prompt

### Admin Panel Monitoring
- Location: `/dashboard` → Tab "System Prompts" → SystemHealthPanel
- Shows: NORMAL vs FALLBACK MODE status
- Displays: Alert counts by severity, recent alerts with resolve action
- Queries: `isFallbackActive`, `getUnresolvedAlertCount`, `getRecentAlerts`

### Alert Types
| Type | Severity | Trigger |
|------|----------|---------|
| `fallback_activated` | critical | Database fail or no active prompt |

**Reference:** `.references/system-prompt/` for full documentation

## Paper Writing Workflow

13-stage guided workflow for academic papers:

**Phase 1 - Foundation:** Gagasan, Topik
**Phase 2 - Outline:** Outline
**Phase 3 - Core:** Abstrak, Pendahuluan, Tinjauan Literatur, Metodologi
**Phase 4 - Results:** Hasil, Diskusi, Kesimpulan
**Phase 5 - Finalization:** Daftar Pustaka, Lampiran, Judul

**Key Files:**
- `src/lib/ai/paper-intent-detector.ts` - Auto-detect intent
- `src/lib/ai/paper-tools.ts` - AI tools (startPaperSession, updateStageData, submitStageForValidation)
- `src/lib/ai/paper-mode-prompt.ts` - Paper mode system prompt injection
- `src/lib/ai/paper-stages/*.ts` - Stage-specific instructions (foundation, core, results, finalization)
- `src/lib/ai/paper-search-helpers.ts` - Deterministic search decision helpers (3-layer protection)
- `src/lib/ai/paper-workflow-reminder.ts` - Injected workflow reminders
- `convex/paperSessions.ts` - CRUD operations + rewindToStage mutation
- `convex/paperSessions/constants.ts` - Stage order, labels, and navigation helpers
- `src/lib/hooks/usePaperSession.ts` - Paper session hook with rewind functions
- `src/lib/utils/paperPermissions.ts` - Edit permission rules for paper mode

**AI Tools (paper-tools.ts):**
- `startPaperSession({ initialIdea? })` - Initialize session (initialIdea optional)
- `updateStageData({ ringkasan, data? })` - Save stage progress (AUTO-STAGE: stage auto-fetched from session)
- `getCurrentPaperState({})` - Get current session state
- `submitStageForValidation({})` - Submit for user approval

**IMPORTANT - updateStageData AUTO-STAGE:**
- `stage` parameter was REMOVED from the **AI tool layer** (`paper-tools.ts`) — AI cannot specify stage
- Tool auto-fetches stage from `session.currentStage` then passes it to the Convex mutation
- The **Convex mutation** (`paperSessions.ts`) still requires `stage` param and validates it matches `currentStage`
- Prevents AI stage confusion errors ("Cannot update X while in Y")

**Dialog-First Principles:**
1. DIALOG, bukan monolog - tanya dulu sebelum generate
2. Web search di AWAL untuk eksplorasi literatur
3. ITERASI sampai matang - jangan langsung submit

### Rewind Stage Feature

User can rewind to previous stages (max 2 stages back) via clickable stage badges.

**Key Components:**
- `src/components/paper/PaperStageProgress.tsx` - Clickable stage badges for rewind
- `src/components/paper/RewindConfirmationDialog.tsx` - Confirmation dialog
- `src/components/chat/ArtifactViewer.tsx` - Invalidation warning banner

**Rewind Flow:**
1. User clicks previous stage badge in PaperStageProgress
2. RewindConfirmationDialog opens
3. User confirms → `rewindToStage` mutation called
4. Session state updated: currentStage = target, stageStatus = drafting
5. Artifacts from invalidated stages marked with `invalidatedAt`
6. AI notified via system message + invalidated artifacts context

**Mutations:**
- `rewindToStage({ sessionId, userId, targetStage })` - Execute rewind
- `clearInvalidation({ artifactId, userId })` - Clear invalidation after update
- `getRewindHistory({ sessionId })` - Get rewind audit trail

### Edit Permission System

Messages in paper mode have edit restrictions:

**Rules (in order):**
1. Only user messages can be edited
2. Messages in approved stages are locked (use Rewind to revise)
3. Max 2 user turns back within current stage
4. Message must be within current stage boundary

**Key Files:**
- `src/lib/utils/paperPermissions.ts` - `isEditAllowed()` function
- `src/components/chat/MessageBubble.tsx` - Edit button with disabled state + tooltip

**Export:** `POST /api/export/word` and `POST /api/export/pdf`

**Reference:** `.references/paper-workflow/` for full documentation

## Inline Citations

**Flow:** streamText with google_search -> onFinish extracts groundingSupports -> stream data-cited-text/data-cited-sources -> MarkdownRenderer renders [1] as InlineCitationChip

**Key Files:**
- `src/lib/citations/apaWeb.ts` - URL/title normalization
- `src/lib/citations/webTitle.ts` - Fetch enrichment
- `src/components/chat/InlineCitationChip.tsx` - Hover preview chip

## File Text Extraction

Uses Next.js API route (not Convex) because pdf-parse/mammoth need Node.js.

**Supported:** TXT, PDF (pdf-parse), DOCX (mammoth), XLSX (xlsx), Images (OpenRouter Vision OCR)

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

### System Prompt Fallback Active
- Check admin panel → Tab "System Prompts" → SystemHealthPanel
- Verify active prompt exists in `systemPrompts` table
- Check Convex connection (`npx convex dev` running)
- Resolve alerts after fixing the issue

### BetterAuth Issues
- Verify `BETTER_AUTH_SECRET` is set (generate via `openssl rand -base64 32`)
- Verify `SITE_URL` matches your dev URL (e.g., `http://localhost:3000`)
- Verify `NEXT_PUBLIC_CONVEX_SITE_URL` points to your Convex HTTP actions URL
- Check `src/proxy.ts` for cookie-based route protection (`ba_session`)
- Google OAuth: verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Google Cloud Console
- No webhooks needed — BetterAuth runs server-side in Convex, no external callbacks

## Billing Enforcement

Credit-based quota system with pre-flight checks and usage tracking. Credits available = allowed; credits exhausted = blocked. No daily limits. No overage system.

### Architecture
- **Pre-flight**: `checkQuotaBeforeOperation()` before AI calls
- **Post-operation**: `recordUsageAfterOperation()` to track usage + deduct
- **Hard-block all tiers**: Credits/quota exhausted = blocked (no overage, no soft limits)

### Tier Model

| Tier | Model | When Exhausted |
|------|-------|----------------|
| Gratis | 100 credits/month (quota, hard limit) | Blocked |
| BPP | Prepaid credits (300 credits = Rp 80.000) | Blocked |
| Pro | 5.000 credits/month + credit balance fallback | Check credit balance → blocked |

**Pro credit fallback**: When Pro monthly quota runs out, system checks `creditBalances` before blocking. If credits exist, deducts from there. If both exhausted, blocked.

### Key Files
- `src/lib/billing/enforcement.ts` - Middleware functions (handles Pro credit fallback)
- `convex/billing/quotas.ts` - Quota CRUD + checks
- `convex/billing/credits.ts` - BPP credit balance + Pro fallback
- `convex/billing/usage.ts` - Usage event recording
- `convex/billing/constants.ts` - `TIER_LIMITS`, multipliers, pricing

### Operation Multipliers
| Type | Multiplier |
|------|-----------|
| `chat_message` | 1.0x |
| `paper_generation` | 1.5x |
| `web_search` | 2.0x |
| `refrasa` | 0.8x |

**Source of truth**: `convex/billing/constants.ts`. Do not modify multiplier values without updating constants.

### Token Estimation
~3 chars = 1 token (Indonesian). Total = input × (1 + multiplier)

### Quota Check Flow
1. `checkQuotaBeforeOperation()` → returns `{ allowed, tier, reason, action }`
2. If not allowed → return 402 via `createQuotaExceededResponse()`
3. After AI response → `recordUsageAfterOperation()` with actual tokens
4. Deduct from quota (Gratis) or credits (BPP) or quota-then-credits (Pro)

**Reference:** `docs/billing-tier-enforcement/README.md` for full documentation

## Paper Search Decision Helpers

Deterministic helpers for web search mode decisions in paper workflow.

### 3-Layer Protection
1. **Task-based**: Check stageData completion (referensi fields)
2. **Intent-based**: Check AI's previous promise to search
3. **Language-based**: Check explicit save/submit patterns

### Key Functions
- `isStageResearchIncomplete(stageData, stage)` - Check if stage needs more references
- `aiIndicatedSearchIntent(previousMsg)` - AI promised to search?
- `aiIndicatedSaveIntent(previousMsg)` - AI promised to save?
- `isUserConfirmation(text)` - Short confirmation like "ya", "ok", "lakukan"
- `isExplicitMoreSearchRequest(text)` - "cari lagi", "tambah referensi"
- `isExplicitSaveSubmitRequest(text)` - Explicit save/submit patterns
- `getLastAssistantMessage(messages)` - Get last assistant message from array

### Stage Research Requirements
| Stage | Required Field | Min Count |
|-------|---------------|-----------|
| gagasan | referensiAwal | 2 |
| topik | referensiPendukung | 3 |
| tinjauan_literatur | referensi | 5 |
| pendahuluan | sitasiAPA | 2 |
| diskusi | sitasiTambahan | 2 |

### System Notes (injected into prompt)
- `PAPER_TOOLS_ONLY_NOTE` - When search disabled, prevent AI promising search
- `getResearchIncompleteNote(stage, req)` - Remind AI to search first
- `getFunctionToolsModeNote(searchInfo)` - After search done, use function tools

**Key File:** `src/lib/ai/paper-search-helpers.ts`

## AI SDK v4 -> v5/v6 Migration

| v4 | v5/v6 |
|---|---|
| `append(msg, { body })` | `sendMessage({ text })` via DefaultChatTransport |
| `reload()` | `regenerate()` |
| `toTextStreamResponse()` | `toUIMessageStreamResponse()` |
| N/A | `convertToModelMessages()` |
| N/A | `createUIMessageStream()` |
| N/A | `createUIMessageStreamResponse()` |
| `promptTokens/completionTokens` | `inputTokens/outputTokens` (usage) |

## Project Specifics

### Next.js 16: proxy.ts
- This project uses `proxy.ts` instead of `middleware.ts` for route protection
- Reads `ba_session` cookie (set by `SessionCookieSync` in `src/app/providers.tsx`) to determine auth state
- Protected routes redirect to `/sign-in` with `redirect_url` param if no session cookie
- Pattern choice for cleaner auth integration (Next.js 16 still supports both)

### React Grab
- Development mode includes React Grab for visual debugging
- Auto-loaded via `npm run dev` precommand

### First-Time Setup
```bash
npx convex run migrations:seedDefaultSystemPrompt
npx convex run migrations:seedDefaultAIConfig
```

## Chat URL Routing

URL-based conversation routing untuk chat interface.

### Route Structure
- `/chat` - Landing page (empty state, `conversationId={null}`)
- `/chat/[conversationId]` - Specific conversation view

### Key Components
- `src/app/chat/page.tsx` - Landing page, passes `conversationId={null}` to ChatContainer
- `src/app/chat/[conversationId]/page.tsx` - Dynamic route, passes ID to ChatContainer
- `ChatContainer.tsx` - Navigation via `useRouter`, receives `conversationId` prop
- `ChatSidebar.tsx` - Link-based navigation with `isCreating` loading state
- `ChatWindow.tsx` - Validates conversation existence via `useQuery`

### Navigation Patterns
- **New Chat:** Programmatic via `router.push(`/chat/${newId}`)`
- **Sidebar:** Declarative via `<Link href={`/chat/${conv._id}`}>`
- **Delete current:** Redirect to `/chat` landing page

### Conversation Validation
In `ChatWindow.tsx`: Query conversation with `"skip"` when no ID. If `conversationId !== null && conversation === null`, show "Percakapan tidak ditemukan" UI.

### Next.js 16 Async Params
Server components receive `params` as `Promise<{...}>`. Must `await params` before accessing properties.

**Reference:** `.references/conversation-id-routing/` for full documentation
