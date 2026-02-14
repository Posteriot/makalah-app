# Clerk to BetterAuth Migration Design

**Date:** 2026-02-13
**Status:** Approved
**Approach:** Big Bang Migration (clean replacement)

## Context

Migrasi authentication dari Clerk (hosted auth SaaS) ke BetterAuth (self-hosted, Convex-native auth). App masih staging dengan test users yang bisa di-reset.

### Motivasi
- Full control atas auth flow, data user, session — tanpa vendor lock-in
- Convex-native auth (BetterAuth as Convex Component) — bukan lewat webhook + JWT template
- Simplifikasi stack — kurangi dependency ke third-party service

### Auth Methods (Target)
- Google OAuth (credentials sudah ada)
- Email/Password
- Magic Link (passwordless email)

### Auth UI
- Custom forms dengan shadcn/ui + Mechanical Grace design system

---

## Section 1: Schema Migration

### Users Table Transformation

| Current Field | Action | Notes |
|---|---|---|
| `clerkUserId` | **REMOVE** | Replaced by BetterAuth internal user ID |
| `email` | KEEP | BetterAuth `user.email` |
| `emailVerified` | KEEP | BetterAuth `user.emailVerified` |
| `firstName` / `lastName` | KEEP | May map to BetterAuth `user.name` |
| `role` | KEEP (custom) | App-specific, not in BetterAuth |
| `subscriptionStatus` | KEEP (custom) | App-specific |
| `xenditCustomerId` | KEEP (custom) | App-specific |
| `hasCompletedOnboarding` | KEEP (custom) | App-specific |
| `clerkSyncStatus` | **REMOVE** | No external sync needed |
| `clerkDeletedAt` | **REMOVE** | Handled by BetterAuth |
| `hasSeenLinkingNotice` | KEEP (custom) | App-specific |

### New Tables (BetterAuth Component)

| Table | Purpose | Key Fields |
|---|---|---|
| `session` | Active sessions | sessionToken, userId, expires |
| `account` | OAuth/linked accounts | provider, providerAccountId, userId |
| `verification` | Email verification / magic link tokens | token, email, expires |

### Strategy
Clean schema rebuild (staging, no real user data to preserve).

---

## Section 2: Auth Flow & Route Protection

### 2A. Authentication Flow

**Current (Clerk):**
```
User -> Clerk <SignIn/> -> Clerk server -> JWT "convex" audience -> Convex validates
```

**Target (BetterAuth):**
```
User -> Custom auth form -> BetterAuth client methods -> Convex HTTP router -> Session created -> Convex validates
```

**Auth Methods:**

| Method | Client Call | Notes |
|---|---|---|
| Google OAuth | `authClient.signIn.social({ provider: "google" })` | Redirect flow |
| Email/Password | `authClient.signIn.email({ email, password })` | Direct API call |
| Magic Link | `authClient.signIn.magicLink({ email })` | Email -> click link -> authenticated |

### 2B. Route Protection

**Target `proxy.ts`:**
- Lightweight cookie-only check (no DB call) via `getSessionCookie()`
- Real security check at per-page level via `<Authenticated>` from `convex/react`

### 2C. Provider Wrapper

**Current:**
```tsx
<ClerkProvider>
  <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
```

**Target:**
```tsx
<ConvexAuthProvider client={convexClient}>
```

### 2D. Server-side Auth (Layouts)

- `ensureConvexUser()` **deleted** — BetterAuth native di Convex, user created at sign-up
- No more dual sync mechanism (webhook + layout sync)

### 2E. Convex Functions Auth Check

**Current:**
```typescript
const identity = await ctx.auth.getUserIdentity()
const user = getUserByClerkId(ctx, identity.subject) // string index lookup
```

**Target:**
```typescript
const session = await getAuthSession(ctx) // BetterAuth session
const user = await ctx.db.get(session.userId) // direct ID lookup
```

---

## Section 3: Component Impact Map

### 3A. Files to Rewrite Completely

| File | Current | Target |
|---|---|---|
| `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` | Clerk `<SignIn />` | Custom sign-in form |
| `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` | Clerk `<SignUp />` + invite token | Custom sign-up form + invite validation |
| `src/app/providers.tsx` | `ClerkProvider` + `ConvexProviderWithClerk` | `ConvexAuthProvider` |
| `src/components/auth/AccountLinkingNotice.tsx` | Clerk `useUser()` + `externalAccounts` | BetterAuth session + account query |

### 3B. Files to Modify (Hook Replacement)

| File | Clerk Hook | BetterAuth Replacement |
|---|---|---|
| `src/lib/hooks/useCurrentUser.ts` | `useUser()` -> `getUserByClerkId` | `useSession()` -> direct user from session |
| `src/components/layout/header/GlobalHeader.tsx` | `useUser()`, `useClerk()`, `<SignedIn/SignedOut>` | BetterAuth client, `<Authenticated/Unauthenticated>` |
| `src/components/layout/header/UserDropdown.tsx` | `useUser()`, `useClerk().signOut()` | `useSession()`, `authClient.signOut()` |
| `src/components/settings/ProfileTab.tsx` | `user.update()`, `user.setProfileImage()` | Convex mutation, BetterAuth password change |
| `src/components/settings/SecurityTab.tsx` | `user.updatePassword()`, `user.externalAccounts` | BetterAuth password + account listing |
| `src/components/theme/ThemeEnforcer.tsx` | `useUser()` | `useSession()` |
| `src/app/(account)/settings/page.tsx` | `useUser()` | `useSession()` |

### 3C. Server-side Files to Modify

| File | Current | Target |
|---|---|---|
| `src/proxy.ts` | `clerkMiddleware` | Cookie-based middleware |
| `src/app/(dashboard)/layout.tsx` | `auth()`, `currentUser()`, `ensureConvexUser()` | Remove auth sync |
| `src/app/(account)/layout.tsx` | Same | Same |
| `src/app/api/extract-file/route.ts` | `auth()` -> `getToken()` | BetterAuth server session |
| `src/app/api/admin/users/delete/route.ts` | `clerkClient().users.deleteUser()` | Direct Convex delete |

### 3D. Convex Backend Files

| File | Current | Target |
|---|---|---|
| `convex/auth.config.ts` | Clerk JWT config | DELETE/REPLACE with BetterAuth component config |
| `convex/auth.ts` | `getUserByClerkId()`, `requireAuthUser()` | Rewrite: lookup by BetterAuth user ID |
| `convex/users.ts` | `createUserFromWebhook`, `reconcileWithClerkSnapshot` | Simplify: remove webhook/sync functions |
| `convex/schema.ts` | `clerkUserId` field + Clerk indexes | Remove Clerk fields, add BetterAuth tables |

### 3E. Files to Delete

| File | Reason |
|---|---|
| `src/app/api/webhooks/clerk/route.ts` | No more Clerk webhooks |
| `scripts/reconcile-clerk-users.mjs` | No more Clerk reconciliation |
| `src/lib/utils/redirectAfterAuth.ts` | BetterAuth handles redirects differently |

### 3F. Custom Auth UI (Mechanical Grace Design System)

**Sign-In Page:**
- Container: `rounded-shell` (16px), Slate surface
- Google OAuth button: Primary CTA, Amber, full-width
- Email + Password inputs: `rounded-action` (8px), `border-main`
- Magic link option: Secondary action
- "Belum punya akun?" link
- Font: Geist Mono (labels), Geist Sans (headings)

**Sign-Up Page:**
- Same container style
- Name fields (first + last), Email + Password
- Google OAuth button
- Invite token validation preserved

---

## Section 4: Risks, Gotchas & Mitigation

### 4A. Critical Risks

| Risk | Impact | Mitigation |
|---|---|---|
| BetterAuth Convex adapter still v0.10.x | API may change | Pin exact version (`better-auth@1.4.9`) |
| Sign-in/up MUST be client-side in Convex | Can't do server-side auth flow | Design all auth forms as client components |
| Session race condition | BetterAuth reflects auth before Convex validates | Always use `<Authenticated>` from `convex/react` |
| Email sending dependency | Magic link + verification need email service | Wire callbacks to Resend (already integrated) |
| Google OAuth callback URL change | Callback endpoint changes | Update Google Cloud Console redirect URIs |

### 4B. Non-Obvious Gotchas

1. `ctx.auth.getUserIdentity().subject` changes from clerkUserId to BetterAuth user ID
2. `ConvexProviderWithClerk` (from `convex/react-clerk`) deleted entirely
3. Profile image upload: Clerk built-in gone, implement via Convex file storage
4. Password reset: must wire to email service manually
5. Localization: `@clerk/localizations` gone, handle in custom UI (full control)
6. Admin user deletion: direct Convex delete instead of `clerkClient().users.deleteUser()`

### 4C. What Gets Simpler

| Before (Clerk) | After (BetterAuth) |
|---|---|
| Dual sync (webhook + layout) | No sync needed |
| `ensureConvexUser()` per page load | Not needed |
| Clerk webhook + ngrok for dev | Not needed |
| `clerkUserId` as foreign key | Direct Convex `_id` |
| 3 Clerk npm packages | 2 packages |
| Clerk SaaS billing | Self-hosted (free) |
| External dependency for auth uptime | Self-managed |

### 4D. Environment Variables

**COMMENT OUT (jangan hapus — safety net untuk rollback):**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `NEXT_PUBLIC_CLERK_SOCIAL_PROVIDERS`

**ADD:**
- `BETTER_AUTH_SECRET` (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `SITE_URL` (e.g., `http://localhost:3000`)
- `GOOGLE_CLIENT_ID` (existing)
- `GOOGLE_CLIENT_SECRET` (existing)

### 4E. Google Cloud Console Changes

**Remove:** Clerk callback URL (`https://artistic-hawk-97.clerk.accounts.dev/...`)
**Add:** BetterAuth callback URL (`{SITE_URL}/api/auth/callback/google` or Convex HTTP router path)

---

## Dependencies & Packages

### Remove (from package.json)
```
@clerk/nextjs
@clerk/localizations
@clerk/themes
convex/react-clerk (import, not separate package)
```

### Add
```
better-auth@1.4.9 (exact version)
@convex-dev/better-auth
```

---

## New File Structure (BetterAuth)

```
convex/
  betterAuth/          (NEW - Convex Component)
    convex.config.ts   (Component definition)
  auth.config.ts       (REWRITE - BetterAuth config)
  auth.ts              (REWRITE - Session helpers)
  schema.ts            (MODIFY - Remove Clerk fields, add BetterAuth tables)
  users.ts             (SIMPLIFY - Remove webhook/sync functions)
  http.ts              (MODIFY - Register BetterAuth routes)

src/
  app/
    (auth)/
      sign-in/page.tsx     (REWRITE - Custom form)
      sign-up/page.tsx     (REWRITE - Custom form)
    api/
      auth/[...all]/       (NEW - BetterAuth route handler proxy)
      webhooks/clerk/      (DELETE)
    providers.tsx           (REWRITE - ConvexAuthProvider)

  lib/
    auth/
      client.ts            (NEW - BetterAuth client instance)
      server.ts            (NEW - Server-side auth helpers)
    hooks/
      useCurrentUser.ts    (REWRITE - BetterAuth session based)
```
