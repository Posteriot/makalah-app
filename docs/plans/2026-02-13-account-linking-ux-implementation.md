# Account Linking UX Communication — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add UX communication (toast notification + micro-copy) so users are aware when Clerk auto-links their Google OAuth to an existing email+password account.

**Architecture:** A client-side detection component (`AccountLinkingNotice`) reads Clerk's `useUser()` data (passwordEnabled + externalAccounts) and a Convex flag (`hasSeenLinkingNotice`) to show a one-time persistent toast. Static micro-copy is added as sibling text below the `<SignIn />` and `<SignUp />` Clerk components.

**Tech Stack:** Clerk SDK (`useUser`), Convex (schema + mutation), sonner (toast), Iconoir (icon), Next.js App Router

---

### Task 1: Add `hasSeenLinkingNotice` field to Convex schema

**Files:**
- Modify: `convex/schema.ts:50-68` (users table definition)

**Step 1: Add the optional boolean field**

In `convex/schema.ts`, add `hasSeenLinkingNotice` to the users table, after `clerkDeletedAt`:

```ts
    clerkDeletedAt: v.optional(v.number()),
    // Account linking UX: track if user has seen the linking toast
    hasSeenLinkingNotice: v.optional(v.boolean()),
```

No index needed — this field is only read alongside the full user document.

**Step 2: Verify Convex dev accepts the schema change**

Run: `npx convex dev` (should already be running)
Expected: Schema pushed successfully, no errors.

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "schema: add hasSeenLinkingNotice to users table"
```

---

### Task 2: Add `markLinkingNoticeSeen` mutation to Convex

**Files:**
- Modify: `convex/users.ts` (add new mutation after `completeOnboarding`)

**Step 1: Write the mutation**

Add after the `completeOnboarding` mutation (around line 537):

```ts
// LINKING-001: Mark account linking notice as seen
export const markLinkingNoticeSeen = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Unauthorized")
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique()

    if (!user) {
      throw new Error("User not found")
    }

    await ctx.db.patch(user._id, {
      hasSeenLinkingNotice: true,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})
```

This follows the exact same pattern as `completeOnboarding` — authenticated user, lookup by Clerk ID, patch a boolean flag.

**Step 2: Verify types generate correctly**

Run: Check terminal running `npx convex dev`
Expected: No type errors. `api.users.markLinkingNoticeSeen` should be generated.

**Step 3: Commit**

```bash
git add convex/users.ts
git commit -m "feat: add markLinkingNoticeSeen mutation"
```

---

### Task 3: Create `AccountLinkingNotice` client component

**Files:**
- Create: `src/components/auth/AccountLinkingNotice.tsx`

**Step 1: Create the component**

```tsx
"use client"

import { useEffect, useRef } from "react"
import { useUser } from "@clerk/nextjs"
import { useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { toast } from "sonner"
import { InfoCircle } from "iconoir-react"

export function AccountLinkingNotice() {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser()
  const { user: convexUser, isLoading: isConvexLoading } = useCurrentUser()
  const markSeen = useMutation(api.users.markLinkingNoticeSeen)
  const hasShownRef = useRef(false)

  useEffect(() => {
    // Guard: wait for both data sources to load
    if (!isClerkLoaded || isConvexLoading) return
    if (!clerkUser || !convexUser) return

    // Guard: only show once per session
    if (hasShownRef.current) return

    // Guard: already seen
    if (convexUser.hasSeenLinkingNotice) return

    // Detection: user has BOTH password and external OAuth account
    const hasPassword = clerkUser.passwordEnabled
    const hasOAuth = clerkUser.externalAccounts.length > 0

    if (!hasPassword || !hasOAuth) return

    hasShownRef.current = true

    toast(
      <div className="flex gap-3">
        <InfoCircle className="h-4 w-4 text-info shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-sans text-xs font-semibold">
            Akun terhubung dengan Google
          </p>
          <p className="font-sans text-[11px] text-muted-foreground leading-relaxed">
            Anda sekarang bisa masuk pakai Google atau password — keduanya
            terhubung ke akun yang sama.
          </p>
        </div>
      </div>,
      {
        duration: Infinity,
        className: "!border !border-info/30",
        onDismiss: () => {
          markSeen().catch(console.error)
        },
        onAutoClose: () => {
          markSeen().catch(console.error)
        },
      }
    )
  }, [isClerkLoaded, isConvexLoading, clerkUser, convexUser, markSeen])

  return null
}
```

**Key decisions:**
- `useRef` prevents showing multiple toasts if component re-renders
- `duration: Infinity` makes it persistent (user must dismiss)
- `onDismiss` fires the mutation to mark as seen
- Uses `useCurrentUser()` for Convex data (consistent with codebase pattern)
- Uses `useUser()` from Clerk for `passwordEnabled` and `externalAccounts`
- Uses `--info` color token (sky) for border, per Mechanical Grace signal theory

**Step 2: Verify the component renders without errors**

Manually test: import the component in a page, confirm it renders `null` (no visible UI until toast fires).

**Step 3: Commit**

```bash
git add src/components/auth/AccountLinkingNotice.tsx
git commit -m "feat: add AccountLinkingNotice component with toast detection"
```

---

### Task 4: Mount `AccountLinkingNotice` in authenticated layouts

**Files:**
- Modify: `src/app/providers.tsx` (mount globally, component self-guards for unauthenticated state)

**Step 1: Add the component to AppProviders**

The simplest approach: mount `AccountLinkingNotice` inside the `ClerkProvider` + `ConvexProviderWithClerk` tree in `src/app/providers.tsx`. The component uses `useUser()` and `useCurrentUser()` which both handle unauthenticated states gracefully (return null/skip).

In `src/app/providers.tsx`, add the import and component:

```tsx
import { AccountLinkingNotice } from "@/components/auth/AccountLinkingNotice"
```

Then inside the `ConvexProviderWithClerk` wrapper (around line 27), add:

```tsx
<ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
  {children}
  <AccountLinkingNotice />
</ConvexProviderWithClerk>
```

This ensures the component is available on ALL authenticated pages (chat, dashboard, settings, etc.) without modifying each layout individually.

**Why here and not in individual layouts:**
- Chat layout is a server component — can't mount client components there
- Dashboard layout is also a server component
- `providers.tsx` is already a client component with access to both Clerk and Convex contexts
- The component self-guards: no toast if user is unauthenticated or conditions not met

**Step 2: Verify no hydration errors**

Run: `npm run dev`
Expected: No hydration mismatches. Component renders null for unauthenticated pages.

**Step 3: Commit**

```bash
git add src/app/providers.tsx
git commit -m "feat: mount AccountLinkingNotice in app providers"
```

---

### Task 5: Add micro-copy to sign-in page

**Files:**
- Modify: `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:119-130`

**Step 1: Add micro-copy below SignIn component**

Replace the return statement (lines 119-130):

```tsx
  return (
    <AuthWideCard
      title="Silakan masuk!"
      subtitle="Susun Paper terbaikmu, tanpa ribet, tinggal ngobrol!"
    >
      <SignIn
        fallbackRedirectUrl="/chat"
        appearance={appearance}
      />
      <p className="text-muted-foreground text-[10px] font-sans mt-3 text-center leading-relaxed">
        Akun Anda akan otomatis terhubung Google jika masuk menggunakan alamat email yang sama.
      </p>
    </AuthWideCard>
  )
```

**Step 2: Visual verification**

Run: Navigate to `/sign-in` in dev mode.
Expected: Small gray text below the Clerk form. Non-intrusive, readable.

**Step 3: Commit**

```bash
git add src/app/(auth)/sign-in/[[...sign-in]]/page.tsx
git commit -m "feat: add account linking micro-copy to sign-in page"
```

---

### Task 6: Add micro-copy to sign-up page

**Files:**
- Modify: `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`

**Step 1: Add micro-copy to all sign-up return paths**

There are 3 return statements in the sign-up page. Add the micro-copy to each one that renders a `<SignUp />` component (2 of 3 — the invalid token path doesn't show a form).

**Return path 1: Valid invite token (around line 253-258)**

```tsx
    return (
      <AuthWideCard
        title="Selamat datang!"
        subtitle="Kamu diundang untuk bergabung"
        customLeftContent={<InvitedUserLeftContent email={tokenValidation.email!} />}
      >
        <SignUp
          appearance={clerkAppearance}
          forceRedirectUrl={redirectUrl}
        />
        <p className="text-muted-foreground text-[10px] font-sans mt-3 text-center leading-relaxed">
          Akun Anda akan otomatis terhubung Google jika masuk menggunakan alamat email yang sama.
        </p>
      </AuthWideCard>
    )
```

**Return path 2: Default sign-up, no invite (around line 262-272)**

```tsx
  return (
    <AuthWideCard
      title="Ayo bergabung!"
      subtitle="Kolaborasi dengan AI, menyusun paper bermutu & akuntable"
    >
      <SignUp
        appearance={clerkAppearance}
        forceRedirectUrl={redirectUrl}
      />
      <p className="text-muted-foreground text-[10px] font-sans mt-3 text-center leading-relaxed">
        Akun Anda akan otomatis terhubung Google jika masuk menggunakan alamat email yang sama.
      </p>
    </AuthWideCard>
  )
```

**Step 2: Visual verification**

Run: Navigate to `/sign-up` in dev mode.
Expected: Same micro-copy as sign-in page. Consistent across both auth pages.

**Step 3: Commit**

```bash
git add src/app/(auth)/sign-up/[[...sign-up]]/page.tsx
git commit -m "feat: add account linking micro-copy to sign-up page"
```

---

### Task 7: Manual end-to-end testing

**Files:** None (testing only)

**Step 1: Test unauthenticated state**

1. Open `/sign-in` → verify micro-copy visible below form
2. Open `/sign-up` → verify micro-copy visible below form
3. Open `/` (home) → verify no toast shows

**Step 2: Test authenticated user WITHOUT both methods**

1. Sign in with email+password only (no Google linked)
2. Navigate to `/chat` → verify NO toast shows
3. Navigate to `/dashboard` → verify NO toast shows

**Step 3: Test authenticated user WITH both methods**

1. Sign in with Google on an account that has a password
2. Navigate to any authenticated page → verify toast shows
3. Dismiss the toast
4. Refresh page → verify toast does NOT show again (flag persisted)

**Step 4: Verify Convex flag**

1. After dismissing toast, check Convex dashboard → users table
2. Verify `hasSeenLinkingNotice: true` is set on the user

**Step 5: Commit (if any test fixes were needed)**

```bash
git add -A
git commit -m "fix: address issues found during e2e testing"
```

---

### Task 8: Final commit — consolidation (optional)

If all individual commits are clean, no consolidation needed. Otherwise:

```bash
git log --oneline -8  # Review recent commits
```

All done. The feature is complete.
