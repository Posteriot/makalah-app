# Clerk to BetterAuth Migration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Clerk authentication with BetterAuth (Convex-native) supporting Google OAuth, email/password, and magic link.

**Architecture:** BetterAuth runs as a Convex Component (`@convex-dev/better-auth`). Auth tables (`user`, `session`, `account`, `verification`) live inside Convex. Next.js proxies auth API calls to the Convex HTTP router. Custom auth UI built with shadcn/ui + Mechanical Grace design system.

**Tech Stack:** BetterAuth 1.4.9, @convex-dev/better-auth, Convex 1.31+, Next.js 16, React 19, Resend (email), shadcn/ui

**Design Doc:** `docs/plans/2026-02-13-clerk-to-betterauth-migration.md`

---

## Phase 1: Foundation — BetterAuth Backend Setup

### Task 1: Install packages and configure environment

**Files:**
- Modify: `package.json`
- Modify: `.env.local`
- Modify: `.env.example`

**Step 1: Install BetterAuth packages**

Run:
```bash
npm install better-auth@1.4.9 --save-exact
npm install @convex-dev/better-auth
```

Expected: Both packages added to `package.json` dependencies.

**Step 2: Comment out Clerk env vars and add BetterAuth vars in `.env.local`**

Comment out (DO NOT DELETE):
```
# CLERK (commented out — kept for rollback safety)
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
# CLERK_SECRET_KEY=sk_test_...
# CLERK_WEBHOOK_SECRET=whsec_...
# NEXT_PUBLIC_CLERK_SOCIAL_PROVIDERS=google
```

Add new vars:
```
# BetterAuth
BETTER_AUTH_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
SITE_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<your existing Google OAuth client ID>
GOOGLE_CLIENT_SECRET=<your existing Google OAuth client secret>
```

**Step 3: Update `.env.example` to reflect BetterAuth vars**

Add BetterAuth entries, comment out Clerk entries. Mirror structure from Step 2.

**Step 4: Set Convex environment variables**

Run:
```bash
npx convex env set BETTER_AUTH_SECRET "<your-generated-secret>"
npx convex env set SITE_URL "http://localhost:3000"
npx convex env set GOOGLE_CLIENT_ID "<your-client-id>"
npx convex env set GOOGLE_CLIENT_SECRET "<your-client-secret>"
```

Also set `CONVEX_SITE_URL` if not already set (check via `npx convex env list`):
```bash
npx convex env set CONVEX_SITE_URL "<your-convex-deployment-url>"
```

Note: `CONVEX_SITE_URL` is the HTTP Actions URL, typically `https://<deployment-name>.convex.site`. Check Convex dashboard → Settings → URL & Deploy Key.

**Step 5: Add `NEXT_PUBLIC_CONVEX_SITE_URL` to `.env.local`**

```
NEXT_PUBLIC_CONVEX_SITE_URL=<same as CONVEX_SITE_URL above>
```

This is needed by the Next.js auth-server utilities to proxy auth requests to Convex.

**Step 6: Commit**

```bash
git add package.json package-lock.json .env.example
git commit -m "chore: install better-auth packages, update env config"
```

---

### Task 2: Create Convex BetterAuth component configuration

**Files:**
- Create: `convex/convex.config.ts`
- Create: `convex/auth.ts` (REWRITE — currently has Clerk helpers)
- Modify: `convex/auth.config.ts` (REWRITE — currently has Clerk JWT config)

**Step 1: Create `convex/convex.config.ts`**

This registers BetterAuth as a Convex Component.

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";

const app = defineApp();
app.use(betterAuth);

export default app;
```

**Step 2: Rewrite `convex/auth.config.ts`**

Replace the Clerk JWT config with BetterAuth auth config. This config tells Convex how to validate auth tokens.

```typescript
// convex/auth.config.ts
export default {
  providers: [
    {
      // BetterAuth Convex component handles token validation
      // The domain and applicationID are no longer needed
      type: "customFunction" as const,
    },
  ],
};
```

IMPORTANT: The exact format of this file depends on what `@convex-dev/better-auth` expects. Check the package's README or the `convex` plugin source. If the above format doesn't work, the `convex()` plugin in `convex/auth.ts` may generate/override this config automatically. In that case, keep this file minimal or as an empty export:

```typescript
// convex/auth.config.ts
// BetterAuth Convex plugin handles auth configuration
const authConfig = {};
export default authConfig;
```

Verify by running `npx convex dev` and checking for errors.

**Step 3: Rewrite `convex/auth.ts`**

Replace all Clerk helper functions with BetterAuth component client and auth configuration.

```typescript
// convex/auth.ts
import { components } from "./_generated/api";
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { magicLink } from "better-auth/plugins";
import { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL!;

// Create the BetterAuth component client
export const authComponent = createClient<DataModel>(components.betterAuth, {
  verbose: false,
});

// BetterAuth configuration
export const createAuthOptions = (ctx: GenericCtx<DataModel>) =>
  ({
    baseURL: siteUrl,
    trustedOrigins: [siteUrl],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        // Wire to Resend — implement in Task 5
        console.log(`[Auth] Password reset for ${user.email}: ${url}`);
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        // Wire to Resend — implement in Task 5
        console.log(`[Auth] Verification for ${user.email}: ${url}`);
      },
    },
    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },
    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google"],
      },
    },
    plugins: [
      crossDomain({ siteUrl }),
      convex({ authConfig }),
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          // Wire to Resend — implement in Task 5
          console.log(`[Auth] Magic link for ${email}: ${url}`);
        },
        expiresIn: 300, // 5 minutes
      }),
    ],
  }) satisfies BetterAuthOptions;

// Export createAuth function (used by HTTP router and component helpers)
export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));

// Export client API for use in Convex queries
export const { getAuthUser } = authComponent.clientApi();
```

**Step 4: Run `npx convex dev` to verify**

Run:
```bash
npx convex dev
```

Expected: Convex should recognize the BetterAuth component and generate schema. Check for any import or configuration errors. The component will auto-create its required tables.

**Step 5: Commit**

```bash
git add convex/convex.config.ts convex/auth.config.ts convex/auth.ts
git commit -m "feat: configure BetterAuth as Convex component"
```

---

### Task 3: Register BetterAuth HTTP routes

**Files:**
- Create: `convex/http.ts`

**Step 1: Create HTTP router with BetterAuth routes**

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Register BetterAuth routes (sign-in, sign-up, OAuth callbacks, etc.)
// CORS required for client-side framework support
authComponent.registerRoutes(http, createAuth, { cors: true });

export default http;
```

**Step 2: Run `npx convex dev` to verify routes are registered**

Run:
```bash
npx convex dev
```

Expected: No errors. BetterAuth routes should be available at the Convex deployment URL.

**Step 3: Commit**

```bash
git add convex/http.ts
git commit -m "feat: register BetterAuth HTTP routes on Convex router"
```

---

### Task 4: Update Convex schema (remove Clerk fields)

**Files:**
- Modify: `convex/schema.ts`

**Step 1: Remove Clerk-specific fields from users table**

In `convex/schema.ts`, update the `users` table definition:

Remove these fields:
- `clerkUserId: v.string()`
- `clerkSyncStatus: v.optional(...)`
- `clerkDeletedAt: v.optional(v.number())`

Remove these indexes:
- `.index("by_clerkUserId", ["clerkUserId"])`
- `.index("by_clerkSyncStatus", ["clerkSyncStatus"])`

Keep all other fields and indexes (`by_role`, `by_email`).

The resulting `users` table should look like:

```typescript
users: defineTable({
  // Auth identity — BetterAuth user ID stored via ctx.auth.getUserIdentity().subject
  betterAuthUserId: v.optional(v.string()), // Maps to BetterAuth's user._id
  email: v.string(),
  role: v.string(), // "superadmin" | "admin" | "user"
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  emailVerified: v.boolean(),
  subscriptionStatus: v.string(), // "free" | "pro" | "canceled" | etc.
  createdAt: v.number(),
  lastLoginAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
  // Payment integration
  xenditCustomerId: v.optional(v.string()),
  // Onboarding
  hasCompletedOnboarding: v.optional(v.boolean()),
  // Account linking UX
  hasSeenLinkingNotice: v.optional(v.boolean()),
})
  .index("by_role", ["role"])
  .index("by_email", ["email"])
  .index("by_betterAuthUserId", ["betterAuthUserId"]),
```

IMPORTANT NOTE: BetterAuth's Convex Component creates its OWN `user` table (managed by the component). Your app's `users` table is SEPARATE. You have two choices:

**Option A (Recommended):** Keep your app's `users` table as an "extension" table. After BetterAuth creates a user, create a corresponding app `users` record with role, subscription, etc. Link via `betterAuthUserId`.

**Option B:** Use BetterAuth's user table directly and add custom fields. This requires schema extensions which may conflict with component updates.

Go with **Option A** — it's safer and gives you full control over app-specific fields.

**Step 2: Verify schema compiles**

Run:
```bash
npx convex dev
```

Expected: Schema should compile. Existing data will need to be cleared (staging, so this is OK).

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "refactor: remove Clerk fields from users schema, add betterAuthUserId"
```

---

### Task 5: Wire email sending (Resend) to BetterAuth callbacks

**Files:**
- Modify: `convex/auth.ts` (update placeholder callbacks)
- Modify or verify: `src/lib/email/resend.ts` (existing Resend integration)

**Step 1: Check existing Resend integration**

Read `src/lib/email/resend.ts` to understand the current email sending pattern. The app already uses Resend for welcome emails.

**Step 2: Create auth email templates**

Create email sending functions that BetterAuth callbacks will use. Since BetterAuth callbacks run in Convex context, you need Convex actions or mutations that call Resend.

Create `convex/authEmails.ts`:

```typescript
// convex/authEmails.ts
import { action } from "./_generated/server";
import { v } from "convex/values";

// These are called from BetterAuth callbacks
// For now, use console.log as placeholder.
// Wire to Resend API when ready.

export const sendVerificationEmail = action({
  args: { email: v.string(), url: v.string() },
  handler: async (_ctx, { email, url }) => {
    // TODO: Wire to Resend
    // Use RESEND_API_KEY from env
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn("[Auth Email] RESEND_API_KEY not set, skipping email");
      return;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Makalah AI <noreply@makalah.ai>",
        to: email,
        subject: "Verifikasi Email — Makalah AI",
        html: `<p>Klik link berikut untuk verifikasi email Anda:</p><p><a href="${url}">${url}</a></p>`,
      }),
    });

    if (!response.ok) {
      console.error("[Auth Email] Failed to send verification:", await response.text());
    }
  },
});

export const sendMagicLinkEmail = action({
  args: { email: v.string(), url: v.string() },
  handler: async (_ctx, { email, url }) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn("[Auth Email] RESEND_API_KEY not set, skipping email");
      return;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Makalah AI <noreply@makalah.ai>",
        to: email,
        subject: "Masuk ke Makalah AI",
        html: `<p>Klik link berikut untuk masuk:</p><p><a href="${url}">Masuk ke Makalah AI</a></p><p>Link ini berlaku selama 5 menit.</p>`,
      }),
    });

    if (!response.ok) {
      console.error("[Auth Email] Failed to send magic link:", await response.text());
    }
  },
});

export const sendPasswordResetEmail = action({
  args: { email: v.string(), url: v.string() },
  handler: async (_ctx, { email, url }) => {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn("[Auth Email] RESEND_API_KEY not set, skipping email");
      return;
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Makalah AI <noreply@makalah.ai>",
        to: email,
        subject: "Reset Password — Makalah AI",
        html: `<p>Klik link berikut untuk reset password:</p><p><a href="${url}">${url}</a></p>`,
      }),
    });

    if (!response.ok) {
      console.error("[Auth Email] Failed to send password reset:", await response.text());
    }
  },
});
```

**Step 3: Update `convex/auth.ts` callbacks to use Resend**

Replace the `console.log` placeholders in `createAuthOptions` with actual calls:

```typescript
emailAndPassword: {
  enabled: true,
  requireEmailVerification: true,
  sendResetPassword: async ({ user, url }) => {
    // Note: BetterAuth callbacks run in Convex context
    // Direct fetch to Resend API
    await sendPasswordResetViaResend(user.email, url);
  },
},
emailVerification: {
  sendVerificationEmail: async ({ user, url }) => {
    await sendVerificationViaResend(user.email, url);
  },
},
```

Note: The exact pattern for calling Resend from BetterAuth callbacks depends on whether those callbacks run in a Convex action context or bare Node.js context. If they can't do `fetch` directly, use `ctx.runAction()` to call the Convex actions created above. Test this during implementation.

**Step 4: Commit**

```bash
git add convex/authEmails.ts convex/auth.ts
git commit -m "feat: wire BetterAuth email callbacks to Resend"
```

---

## Phase 2: Client Integration — Next.js Setup

### Task 6: Create BetterAuth client and server utilities

**Files:**
- Create: `src/lib/auth-client.ts`
- Create: `src/lib/auth-server.ts`

**Step 1: Create client-side auth instance**

```typescript
// src/lib/auth-client.ts
import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [convexClient(), magicLinkClient()],
});

// Re-export commonly used methods for convenience
export const {
  signIn,
  signUp,
  signOut,
  useSession,
} = authClient;
```

**Step 2: Create server-side auth utilities**

```typescript
// src/lib/auth-server.ts
import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

export const {
  handler,
  isAuthenticated,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
  preloadAuthQuery,
} = convexBetterAuthNextJs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
});
```

**Step 3: Commit**

```bash
git add src/lib/auth-client.ts src/lib/auth-server.ts
git commit -m "feat: create BetterAuth client and server utilities"
```

---

### Task 7: Create Next.js auth API route proxy

**Files:**
- Create: `src/app/api/auth/[...all]/route.ts`

**Step 1: Create catch-all auth route**

This proxies auth requests from the client to the Convex deployment.

```typescript
// src/app/api/auth/[...all]/route.ts
import { handler } from "@/lib/auth-server";

export const { GET, POST } = handler;
```

**Step 2: Verify route is accessible**

Run `npm run dev` and check that `http://localhost:3000/api/auth/ok` returns a response (BetterAuth health check endpoint).

**Step 3: Commit**

```bash
git add "src/app/api/auth/[...all]/route.ts"
git commit -m "feat: add Next.js auth API proxy route"
```

---

### Task 8: Rewrite providers.tsx (replace ClerkProvider)

**Files:**
- Rewrite: `src/app/providers.tsx`

**Step 1: Replace ClerkProvider with ConvexBetterAuthProvider**

```typescript
// src/app/providers.tsx
"use client"

import type { ReactNode } from "react"
import { ConvexReactClient } from "convex/react"
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react"
import { ThemeProvider } from "next-themes"
import { ThemeEnforcer } from "@/components/theme/ThemeEnforcer"
import { authClient } from "@/lib/auth-client"

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL

const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <ThemeEnforcer />
      {convexClient ? (
        <ConvexBetterAuthProvider
          client={convexClient}
          authClient={authClient}
        >
          {children}
        </ConvexBetterAuthProvider>
      ) : (
        children
      )}
    </ThemeProvider>
  )
}
```

Notes:
- `ClerkProvider`, `ConvexProviderWithClerk`, `useAuth` from Clerk — all removed
- `@clerk/localizations` import removed
- `AccountLinkingNotice` removed (will be re-added later in Task 14)
- No Indonesian localization config needed (custom UI handles this)

**Step 2: Verify app renders**

Run:
```bash
npm run dev
```

Expected: App should render (auth will be broken until remaining tasks complete, but no crash).

**Step 3: Commit**

```bash
git add src/app/providers.tsx
git commit -m "refactor: replace ClerkProvider with ConvexBetterAuthProvider"
```

---

### Task 9: Rewrite proxy.ts (route protection)

**Files:**
- Rewrite: `src/proxy.ts`

**Step 1: Replace clerkMiddleware with cookie-based check**

```typescript
// src/proxy.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_ROUTES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/api",
  "/about",
  "/pricing",
  "/blog",
  "/documentation",
  "/waiting-list",
  "/privacy",
]

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  )
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Lightweight cookie check — real auth validation happens per-page
  // BetterAuth stores session in cookies. Check for session cookie presence.
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token")

  if (!sessionCookie) {
    const signInUrl = new URL("/sign-in", request.url)
    const redirectPath = `${request.nextUrl.pathname}${request.nextUrl.search}`
    signInUrl.searchParams.set("redirect_url", redirectPath)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}
```

IMPORTANT: The cookie name `better-auth.session_token` may differ. Check BetterAuth docs or test locally to confirm the exact cookie name. In production with HTTPS, it may be prefixed with `__Secure-`.

**Step 2: Commit**

```bash
git add src/proxy.ts
git commit -m "refactor: replace clerkMiddleware with cookie-based route protection"
```

---

## Phase 3: Convex Backend — Auth Helper Rewrites

### Task 10: Rewrite Convex auth helpers

**Files:**
- Already rewritten in Task 2: `convex/auth.ts`
- Create: `convex/authHelpers.ts` (app-level auth helpers)

**Step 1: Create app-level auth helpers**

These replace the old Clerk-based helpers from the original `convex/auth.ts` (`getAuthUser`, `requireAuthUser`, `requireAuthUserId`, etc.)

```typescript
// convex/authHelpers.ts
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { authComponent } from "./auth";

type AnyCtx = QueryCtx | MutationCtx;

/**
 * Get the currently authenticated BetterAuth user.
 * Returns the app's users table record (not BetterAuth's internal user).
 */
export async function getAppUser(ctx: AnyCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  // identity.subject = BetterAuth user ID
  const user = await ctx.db
    .query("users")
    .withIndex("by_betterAuthUserId", (q) =>
      q.eq("betterAuthUserId", identity.subject)
    )
    .unique();

  return user ?? null;
}

/**
 * Require authenticated user. Throws if not authenticated.
 */
export async function requireAppUser(ctx: AnyCtx): Promise<Doc<"users">> {
  const user = await getAppUser(ctx);
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

/**
 * Validate that the requesting user matches the given userId.
 */
export async function requireAppUserId(
  ctx: AnyCtx,
  userId: Id<"users">
): Promise<Doc<"users">> {
  const user = await requireAppUser(ctx);
  if (user._id !== userId) {
    throw new Error("Unauthorized");
  }
  return user;
}

/**
 * Validate conversation ownership.
 */
export async function requireConversationOwner(
  ctx: AnyCtx,
  conversationId: Id<"conversations">
) {
  const authUser = await requireAppUser(ctx);
  const conversation = await ctx.db.get(conversationId);
  if (!conversation) {
    throw new Error("Conversation tidak ditemukan");
  }
  if (conversation.userId !== authUser._id) {
    throw new Error("Tidak memiliki akses ke conversation ini");
  }
  return { authUser, conversation };
}

/**
 * Defensive version: Return conversation + authUser if owner, null otherwise.
 */
export async function getConversationIfOwner(
  ctx: AnyCtx,
  conversationId: Id<"conversations">
): Promise<{ authUser: Doc<"users">; conversation: Doc<"conversations"> } | null> {
  const authUser = await getAppUser(ctx);
  if (!authUser) return null;

  const conversation = await ctx.db.get(conversationId);
  if (!conversation) return null;
  if (conversation.userId !== authUser._id) return null;

  return { authUser, conversation };
}

/**
 * Validate paper session ownership.
 */
export async function requirePaperSessionOwner(
  ctx: AnyCtx,
  sessionId: Id<"paperSessions">
) {
  const authUser = await requireAppUser(ctx);
  const session = await ctx.db.get(sessionId);
  if (!session) {
    throw new Error("Session not found");
  }
  if (session.userId !== authUser._id) {
    throw new Error("Unauthorized");
  }
  return { authUser, session };
}

/**
 * Validate file ownership.
 */
export async function requireFileOwner(ctx: AnyCtx, fileId: Id<"files">) {
  const authUser = await requireAppUser(ctx);
  const file = await ctx.db.get(fileId);
  if (!file) {
    throw new Error("File tidak ditemukan");
  }
  if (file.userId !== authUser._id) {
    throw new Error("Unauthorized");
  }
  return { authUser, file };
}
```

**Step 2: Update all imports across Convex functions**

Every file that currently imports from `convex/auth.ts` (the old Clerk helpers) needs to import from `convex/authHelpers.ts` instead.

Find all files that import from `./auth` or `../auth`:
```bash
grep -r "from.*['\"]\.\/auth['\"]" convex/ --include="*.ts" -l
grep -r "from.*['\"]\.\.\/auth['\"]" convex/ --include="*.ts" -l
```

For each file, update:
- `import { getAuthUser } from "./auth"` → `import { getAppUser } from "./authHelpers"`
- `import { requireAuthUser } from "./auth"` → `import { requireAppUser } from "./authHelpers"`
- `import { requireAuthUserId } from "./auth"` → `import { requireAppUserId } from "./authHelpers"`
- `import { requireConversationOwner } from "./auth"` → `import { requireConversationOwner } from "./authHelpers"`
- `import { getConversationIfOwner } from "./auth"` → `import { getConversationIfOwner } from "./authHelpers"`
- `import { requirePaperSessionOwner } from "./auth"` → `import { requirePaperSessionOwner } from "./authHelpers"`
- `import { requireFileOwner } from "./auth"` → `import { requireFileOwner } from "./authHelpers"`

**Step 3: Verify Convex compiles**

Run:
```bash
npx convex dev
```

Expected: No import errors. All Convex functions should compile.

**Step 4: Commit**

```bash
git add convex/authHelpers.ts convex/
git commit -m "refactor: rewrite Convex auth helpers for BetterAuth"
```

---

### Task 11: Simplify convex/users.ts (remove Clerk sync)

**Files:**
- Modify: `convex/users.ts`

**Step 1: Remove Clerk-specific functions**

Delete these functions entirely:
- `createUserFromWebhook` — no more webhooks
- `markUserDeletedFromWebhook` — no more webhooks
- `reconcileWithClerkSnapshot` — no more Clerk reconciliation
- `createUser` (the ensureConvexUser mutation) — no more layout sync

Remove these imports/types:
- `ClerkSyncStatus` type
- `clerkSnapshotUserValidator` validator
- `SUPERADMIN_EMAIL` hardcoded email (move to env or keep if still needed for role assignment)

**Step 2: Update remaining functions**

Functions that reference `clerkUserId` need updating:
- `getUserByClerkId` → Replace with `getUserByBetterAuthId` that uses `by_betterAuthUserId` index
- `getOnboardingStatus` → Update to use `by_betterAuthUserId` index
- `completeOnboarding` → Update to use `by_betterAuthUserId` index
- `markLinkingNoticeSeen` → Update to use `by_betterAuthUserId` index
- `listAllUsers` → Remove `clerkSyncStatus` filter

**Step 3: Add user creation function for BetterAuth signup**

Add a function that creates the app user record when BetterAuth creates a user. This can be called from a BetterAuth `databaseHooks.user.create.after` hook or from the client after signup.

```typescript
// In convex/users.ts
export const createAppUser = mutationGeneric({
  args: {
    betterAuthUserId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, { betterAuthUserId, email, firstName, lastName }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== betterAuthUserId) {
      throw new Error("Unauthorized");
    }

    // Check if already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_betterAuthUserId", (q) =>
        q.eq("betterAuthUserId", betterAuthUserId)
      )
      .unique();

    if (existing) return existing._id;

    const now = Date.now();
    const role = email === SUPERADMIN_EMAIL ? "superadmin" : "user";

    return await ctx.db.insert("users", {
      betterAuthUserId,
      email,
      firstName,
      lastName,
      role,
      emailVerified: false,
      subscriptionStatus: "free",
      createdAt: now,
      lastLoginAt: now,
    });
  },
});
```

**Step 4: Verify and commit**

Run:
```bash
npx convex dev
```

```bash
git add convex/users.ts
git commit -m "refactor: remove Clerk sync functions, add BetterAuth user creation"
```

---

## Phase 4: Frontend — Hook Rewrites

### Task 12: Rewrite useCurrentUser hook

**Files:**
- Rewrite: `src/lib/hooks/useCurrentUser.ts`

**Step 1: Replace Clerk hook with BetterAuth session**

```typescript
// src/lib/hooks/useCurrentUser.ts
"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { useSession } from "@/lib/auth-client"

/**
 * Hook to get current app user (Convex users table).
 * ALWAYS returns object { user, isLoading } — never null.
 */
export function useCurrentUser() {
  const { data: session, isPending: isSessionLoading } = useSession()

  const convexUser = useQuery(
    api.users.getUserByBetterAuthId,
    session?.user?.id ? { betterAuthUserId: session.user.id } : "skip"
  )

  // Session still loading
  if (isSessionLoading) {
    return { user: null, isLoading: true }
  }

  // Not authenticated
  if (!session?.user) {
    return { user: null, isLoading: false }
  }

  // Convex query still loading
  if (convexUser === undefined) {
    return { user: null, isLoading: true }
  }

  return { user: convexUser, isLoading: false }
}
```

**Step 2: Add `getUserByBetterAuthId` query to `convex/users.ts`**

```typescript
export const getUserByBetterAuthId = queryGeneric({
  args: { betterAuthUserId: v.string() },
  handler: async ({ db }, { betterAuthUserId }) => {
    return await db
      .query("users")
      .withIndex("by_betterAuthUserId", (q) =>
        q.eq("betterAuthUserId", betterAuthUserId)
      )
      .unique();
  },
});
```

**Step 3: Commit**

```bash
git add src/lib/hooks/useCurrentUser.ts convex/users.ts
git commit -m "refactor: rewrite useCurrentUser for BetterAuth sessions"
```

---

### Task 13: Update GlobalHeader and UserDropdown

**Files:**
- Modify: `src/components/layout/header/GlobalHeader.tsx`
- Modify: `src/components/layout/header/UserDropdown.tsx`

**Step 1: Replace Clerk imports in GlobalHeader**

Replace:
```typescript
import { SignedIn, SignedOut, useUser, useClerk } from "@clerk/nextjs"
```

With:
```typescript
import { Authenticated, Unauthenticated } from "convex/react"
import { useSession, signOut } from "@/lib/auth-client"
```

Then replace all usages:
- `<SignedIn>` → `<Authenticated>`
- `<SignedOut>` → `<Unauthenticated>`
- `const { user: clerkUser } = useUser()` → `const { data: session } = useSession()`
- `const { signOut } = useClerk()` → use imported `signOut`
- `clerkUser?.firstName` → `session?.user?.name?.split(" ")[0] || "User"`
- `clerkUser?.lastName` → derived from name or from convexUser
- `handleSignOut` → `await signOut()`

**Step 2: Update UserDropdown similarly**

Replace Clerk hooks with BetterAuth equivalents. The UserDropdown uses `useUser()` and `useClerk()` — replace with `useSession()` and `signOut`.

**Step 3: Commit**

```bash
git add src/components/layout/header/GlobalHeader.tsx src/components/layout/header/UserDropdown.tsx
git commit -m "refactor: replace Clerk hooks in header components"
```

---

### Task 14: Update Settings components

**Files:**
- Modify: `src/components/settings/ProfileTab.tsx`
- Modify: `src/components/settings/SecurityTab.tsx`
- Modify: `src/app/(account)/settings/page.tsx`

**Step 1: Rewrite ProfileTab**

Remove Clerk `useUser()` and `user.update()`. Replace with:
- Profile data from `useCurrentUser()` (Convex)
- Profile updates via Convex mutation (`api.users.updateProfile`)
- Profile image: For now, remove `setProfileImage` (Clerk built-in). Add Convex file storage upload later.

**Step 2: Rewrite SecurityTab**

Remove Clerk `useUser()`, `user.updatePassword()`, and `user.externalAccounts`. Replace with:
- Password change via `authClient.changePassword()`
- Connected accounts via BetterAuth account query or Convex query
- Remove `isClerkAPIResponseError` error handling

**Step 3: Update settings page**

Remove `useUser()` from `@clerk/nextjs`. Use `useCurrentUser()` and `useSession()` instead.

**Step 4: Commit**

```bash
git add src/components/settings/ src/app/\(account\)/settings/page.tsx
git commit -m "refactor: rewrite settings components for BetterAuth"
```

---

### Task 15: Update ThemeEnforcer

**Files:**
- Modify: `src/components/theme/ThemeEnforcer.tsx`

**Step 1: Replace Clerk hook**

Replace `useUser()` from `@clerk/nextjs` with `useSession()` from `@/lib/auth-client`.

Check `session?.user` instead of `clerkUser` to determine if user is authenticated.

**Step 2: Commit**

```bash
git add src/components/theme/ThemeEnforcer.tsx
git commit -m "refactor: replace Clerk hook in ThemeEnforcer"
```

---

## Phase 5: Auth UI — Custom Sign-In/Sign-Up

### Task 16: Rewrite sign-in page

**Files:**
- Rewrite: `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
  - NOTE: Route structure may change. BetterAuth doesn't need `[[...sign-in]]` catch-all.
  - Consider moving to `src/app/(auth)/sign-in/page.tsx` (simple route).

**Step 1: Create custom sign-in form**

Build a Mechanical Grace styled sign-in form with three auth methods:

1. **Google OAuth button** (primary CTA)
2. **Email/Password form**
3. **Magic Link option** (secondary)

Use shadcn/ui components: `Button`, `Input`, `Label`, `Separator`.

Key auth client calls:
```typescript
// Google OAuth
await signIn.social({ provider: "google", callbackURL: "/chat" })

// Email/Password
await signIn.email({ email, password })

// Magic Link
await authClient.signIn.magicLink({ email })
```

Follow Mechanical Grace design:
- Container: `rounded-shell`, dark surface
- Buttons: `rounded-action`, industrial styling with hover-slash
- Inputs: `rounded-action`, `border-main`, Geist Mono
- Typography: Geist Sans headings, Geist Mono labels

Preserve the `AuthWideCard` wrapper if it's still applicable.

**Step 2: Handle redirect after sign-in**

Read `redirect_url` from search params and redirect after successful auth.

**Step 3: Verify sign-in works**

Test each method manually:
- Google OAuth: redirects to Google → comes back authenticated
- Email/Password: shows error for wrong password, succeeds for correct
- Magic Link: sends email (check Resend logs or console)

**Step 4: Commit**

```bash
git add "src/app/(auth)/sign-in/"
git commit -m "feat: build custom sign-in page with Mechanical Grace design"
```

---

### Task 17: Rewrite sign-up page

**Files:**
- Rewrite: `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`
  - Same route structure consideration as Task 16.

**Step 1: Create custom sign-up form**

Similar to sign-in but with:
- First name / Last name fields
- Email + Password
- Google OAuth button
- Invite token validation (preserve existing logic from `api.waitlist.getByToken`)

Key auth client call:
```typescript
await signUp.email({
  email,
  password,
  name: `${firstName} ${lastName}`,
})
```

**Step 2: After signup, create app user**

After BetterAuth creates the auth user, create the app user record in Convex:

```typescript
// After successful signup
const result = await signUp.email({ email, password, name })
if (result.data?.user) {
  await createAppUserMutation({
    betterAuthUserId: result.data.user.id,
    email,
    firstName,
    lastName,
  })
}
```

**Step 3: Preserve invite token flow**

Keep the `InvitedUserLeftContent` and `InvalidTokenContent` components. They don't depend on Clerk.

**Step 4: Commit**

```bash
git add "src/app/(auth)/sign-up/"
git commit -m "feat: build custom sign-up page with invite token support"
```

---

## Phase 6: Cleanup — Remove Clerk Completely

### Task 18: Remove Clerk-specific files

**Files:**
- Delete: `src/app/api/webhooks/clerk/route.ts`
- Delete: `scripts/reconcile-clerk-users.mjs`
- Delete: `src/lib/utils/redirectAfterAuth.ts` (if no longer needed)

**Step 1: Delete files**

```bash
rm src/app/api/webhooks/clerk/route.ts
rm scripts/reconcile-clerk-users.mjs
```

Check if `redirectAfterAuth.ts` is imported anywhere else before deleting:
```bash
grep -r "redirectAfterAuth" src/ --include="*.ts" --include="*.tsx" -l
```

If only used in old sign-up page (now rewritten), delete it.

**Step 2: Remove `sync:clerk:reconcile` script from package.json**

Remove the line:
```json
"sync:clerk:reconcile": "node scripts/reconcile-clerk-users.mjs",
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove Clerk webhook handler, reconciliation script"
```

---

### Task 19: Uninstall Clerk packages

**Files:**
- Modify: `package.json`

**Step 1: Remove Clerk packages**

```bash
npm uninstall @clerk/nextjs @clerk/localizations @clerk/themes svix
```

Note: `svix` was only used for Clerk webhook verification. If it's not used elsewhere, remove it.

**Step 2: Verify no remaining Clerk imports**

```bash
grep -r "@clerk" src/ convex/ --include="*.ts" --include="*.tsx" -l
grep -r "convex/react-clerk" src/ --include="*.ts" --include="*.tsx" -l
```

Expected: No matches. If any remain, update those files.

**Step 3: Build check**

```bash
npm run build
```

Expected: Clean build with no Clerk-related errors.

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: uninstall Clerk packages"
```

---

### Task 20: Update remaining server-side files

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/app/(account)/layout.tsx`
- Modify: `src/app/api/extract-file/route.ts`
- Modify: `src/app/api/admin/users/delete/route.ts`

**Step 1: Simplify dashboard layout**

Remove `ensureConvexUser()`, `auth()`, `currentUser()` from Clerk. The layout becomes a simple wrapper:

```typescript
// src/app/(dashboard)/layout.tsx
import type { ReactNode } from "react"
import { GlobalHeader } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <GlobalHeader />
      <main className="dashboard-main">{children}</main>
      <Footer />
    </div>
  )
}
```

Note: Auth protection is handled by proxy.ts (middleware) + per-page `<Authenticated>` wrappers.

**Step 2: Simplify account layout similarly**

Same pattern — remove Clerk imports and `ensureConvexUser()`.

**Step 3: Update extract-file route**

Replace `auth()` from `@clerk/nextjs/server` with BetterAuth server session:

```typescript
import { getToken, isAuthenticated } from "@/lib/auth-server"
```

Use `isAuthenticated()` to check auth, `getToken()` to get Convex token for `fetchMutation`.

**Step 4: Update admin users delete route**

Replace `clerkClient().users.deleteUser()` with direct Convex user deletion (or BetterAuth admin API if available). Since BetterAuth owns the auth user, you may need to call BetterAuth's admin delete endpoint.

**Step 5: Commit**

```bash
git add src/app/\(dashboard\)/layout.tsx src/app/\(account\)/layout.tsx src/app/api/
git commit -m "refactor: remove Clerk from server layouts and API routes"
```

---

## Phase 7: Verification

### Task 21: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update auth sections**

Replace all Clerk references with BetterAuth:
- Update "Authentication Flow" section
- Update "Environment Variables" section
- Update "Clerk Auth" in Common Issues
- Remove "Clerk Webhook Setup" section
- Add "BetterAuth Setup" section
- Update architecture overview

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for BetterAuth migration"
```

---

### Task 22: End-to-end verification

**Step 1: Start all services**

```bash
# Terminal 1
npm run dev

# Terminal 2
npx convex dev
```

**Step 2: Test auth flows**

Manual testing checklist:

- [ ] Sign up with email/password → user created in BetterAuth + app users table
- [ ] Sign in with email/password → session created, redirected to /chat
- [ ] Sign in with Google OAuth → redirect to Google → callback → authenticated
- [ ] Magic link sign in → email received → click link → authenticated
- [ ] Sign out → session destroyed, redirected to /sign-in
- [ ] Protected routes → unauthenticated redirect to /sign-in
- [ ] Settings page → profile shows correct data
- [ ] Settings → password change works
- [ ] Settings → connected accounts shows Google if linked
- [ ] Chat works while authenticated (messages, conversations)
- [ ] Paper workflow works while authenticated
- [ ] Admin panel works for admin users

**Step 3: Test edge cases**

- [ ] Sign up with same email via Google + password → accounts linked
- [ ] Expired session → redirected to sign-in
- [ ] Invalid route → proper 404
- [ ] Mobile menu auth state correct

**Step 4: Build check**

```bash
npm run build
npm run lint
```

Expected: Clean build, no lint errors.

**Step 5: Run existing tests**

```bash
npm run test
```

Fix any broken tests (likely tests that mock Clerk hooks).

**Step 6: Final commit**

```bash
git add -A
git commit -m "test: verify BetterAuth migration end-to-end"
```

---

### Task 23: Update Google Cloud Console

**This is a manual task (not code).**

1. Go to Google Cloud Console → APIs & Services → Credentials
2. Edit your OAuth 2.0 Client ID
3. **Add** Authorized redirect URI: `{CONVEX_SITE_URL}/api/auth/callback/google`
   - The exact callback URL depends on how BetterAuth registers its routes on the Convex HTTP router. Check the Convex dashboard → HTTP Actions to see the registered routes.
4. **Keep** the old Clerk callback URI commented/noted (don't delete yet, in case rollback)
5. **Add** Authorized JavaScript origin: `http://localhost:3000` (if not already)
6. Save

Also, if using production domain:
- Add `https://makalah.ai` as authorized origin
- Add production callback URL

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| **1. Foundation** | 1-5 | Install packages, Convex component, HTTP routes, schema, email |
| **2. Client** | 6-9 | Auth client/server utils, API proxy, providers, middleware |
| **3. Backend** | 10-11 | Auth helpers, simplify users.ts |
| **4. Hooks** | 12-15 | useCurrentUser, GlobalHeader, Settings, ThemeEnforcer |
| **5. Auth UI** | 16-17 | Custom sign-in/sign-up pages |
| **6. Cleanup** | 18-19 | Remove Clerk files and packages |
| **7. Verify** | 20-23 | Server files, CLAUDE.md, E2E testing, Google Console |

Total: 23 tasks, ~23 commits, incremental and reversible.
