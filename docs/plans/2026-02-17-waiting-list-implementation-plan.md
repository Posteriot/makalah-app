# Waiting List Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a toggleable "Waiting List" mode that replaces the normal frontend during early public launch, restricting access to gratis tier only and requiring admin-invited registration.

**Architecture:** Convex `appConfig` table stores `waitlistMode` boolean. `useWaitlistMode()` hook provides real-time reactivity. All UI components conditionally render based on this flag. Invite flow uses BetterAuth admin plugin for auto-account creation.

**Tech Stack:** Next.js 16, Convex, BetterAuth (admin plugin), Resend, Tailwind CSS 4

**Design Doc:** `docs/plans/2026-02-17-waiting-list-feature-design.md`

---

## Task 1: Add `appConfig` Table to Convex Schema

**Files:**
- Modify: `convex/schema.ts:888-904` (before closing `})`)
- Modify: `convex/schema.ts:888-903` (update `waitlistEntries`)

**Step 1: Update `waitlistEntries` schema**

Add `firstName` and `lastName` fields to the existing `waitlistEntries` table definition in `convex/schema.ts`:

```typescript
waitlistEntries: defineTable({
  firstName: v.string(),
  lastName: v.string(),
  email: v.string(),
  status: v.union(
    v.literal("pending"),
    v.literal("invited"),
    v.literal("registered")
  ),
  invitedAt: v.optional(v.number()),
  registeredAt: v.optional(v.number()),
  inviteToken: v.optional(v.string()),
  inviteTokenExpiresAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_email", ["email"])
  .index("by_status", ["status", "createdAt"])
  .index("by_invite_token", ["inviteToken"]),
```

**Step 2: Add `appConfig` table BEFORE the closing `})`**

```typescript
appConfig: defineTable({
  key: v.string(),
  value: v.boolean(),
  updatedAt: v.number(),
  updatedBy: v.string(),
})
  .index("by_key", ["key"]),
```

**Step 3: Verify schema compiles**

Run: `npx convex dev --once` (or check that the running `npx convex dev` picks up changes)
Expected: Schema pushed successfully, no errors

**Step 4: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(waitlist): add appConfig table and name fields to waitlistEntries"
```

---

## Task 2: Create `convex/appConfig.ts` — Queries & Mutations

**Files:**
- Create: `convex/appConfig.ts`

**Step 1: Create the file**

```typescript
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireRole } from "./permissions"

/**
 * Get the current waitlist mode status.
 * Returns false if no config entry exists (default: off).
 */
export const getWaitlistMode = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", "waitlistMode"))
      .unique()

    return config?.value ?? false
  },
})

/**
 * Toggle waitlist mode on/off (admin/superadmin only).
 */
export const setWaitlistMode = mutation({
  args: {
    adminUserId: v.id("users"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.adminUserId, "admin")

    const existing = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", "waitlistMode"))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.enabled,
        updatedAt: Date.now(),
        updatedBy: args.adminUserId,
      })
    } else {
      await ctx.db.insert("appConfig", {
        key: "waitlistMode",
        value: args.enabled,
        updatedAt: Date.now(),
        updatedBy: args.adminUserId,
      })
    }

    return { success: true }
  },
})
```

**Step 2: Verify it compiles**

Run: Check `npx convex dev` output — no errors
Expected: Functions registered successfully

**Step 3: Commit**

```bash
git add convex/appConfig.ts
git commit -m "feat(waitlist): add appConfig Convex functions for waitlist mode toggle"
```

---

## Task 3: Update `convex/waitlist.ts` — Add Name Fields

**Files:**
- Modify: `convex/waitlist.ts`

**Step 1: Update `register` mutation args and handler**

Change the `register` mutation to accept `firstName` and `lastName`:

```typescript
export const register = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim()
    const firstName = args.firstName.trim()
    const lastName = args.lastName.trim()

    if (!firstName || !lastName) {
      throw new Error("Nama depan dan nama belakang wajib diisi")
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error("Format email tidak valid")
    }

    // Check if email already exists
    const existing = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique()

    if (existing) {
      throw new Error("Email sudah terdaftar di waiting list")
    }

    // Insert new entry
    const entryId = await ctx.db.insert("waitlistEntries", {
      firstName,
      lastName,
      email,
      status: "pending",
      createdAt: Date.now(),
    })

    return entryId
  },
})
```

**Step 2: Update `getByToken` query to return name fields**

In the success return of `getByToken`:

```typescript
return {
  valid: true,
  email: entry.email,
  firstName: entry.firstName,
  lastName: entry.lastName,
  entryId: entry._id,
}
```

**Step 3: Add `inviteSingle` mutation**

Add after the existing `resendInvite` mutation:

```typescript
/**
 * Invite a single waitlist entry (admin only).
 * Generates token and returns data for email sending.
 */
export const inviteSingle = mutation({
  args: {
    adminUserId: v.id("users"),
    entryId: v.id("waitlistEntries"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.adminUserId, "admin")

    const entry = await ctx.db.get(args.entryId)
    if (!entry) {
      throw new Error("Entry tidak ditemukan")
    }

    if (entry.status !== "pending") {
      throw new Error("Entry sudah diundang atau terdaftar")
    }

    const now = Date.now()
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000 // 7 days
    const inviteToken = crypto.randomUUID()

    await ctx.db.patch(args.entryId, {
      status: "invited",
      invitedAt: now,
      inviteToken,
      inviteTokenExpiresAt: expiresAt,
    })

    return {
      email: entry.email,
      firstName: entry.firstName,
      lastName: entry.lastName,
      inviteToken,
    }
  },
})
```

**Step 4: Verify**

Run: Check `npx convex dev` output
Expected: No errors, updated functions registered

**Step 5: Commit**

```bash
git add convex/waitlist.ts
git commit -m "feat(waitlist): add name fields to register, add inviteSingle mutation"
```

---

## Task 4: Create `useWaitlistMode` Hook

**Files:**
- Create: `src/lib/hooks/useWaitlistMode.ts`

**Step 1: Create the hook**

```typescript
"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"

/**
 * Hook to check if waitlist mode is currently active.
 * Uses Convex reactivity — updates instantly when admin toggles.
 */
export function useWaitlistMode() {
  const waitlistMode = useQuery(api.appConfig.getWaitlistMode)

  return {
    isWaitlistMode: waitlistMode ?? false,
    isLoading: waitlistMode === undefined,
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/hooks/useWaitlistMode.ts
git commit -m "feat(waitlist): add useWaitlistMode hook"
```

---

## Task 5: Update `WaitlistForm.tsx` — Add Name Fields

**Files:**
- Modify: `src/components/auth/WaitlistForm.tsx`

**Step 1: Update the form component**

Replace the form to include firstName and lastName inputs. Key changes:
- Add `firstName` and `lastName` state
- Add name input fields before email
- Update `registerMutation` call with name args
- Keep existing error handling and success flow

The mutation call changes from:
```typescript
await registerMutation({ email })
```
to:
```typescript
await registerMutation({ firstName, lastName, email })
```

Add two input fields before the email field:
- First name with `User` icon from iconoir
- Last name with `User` icon from iconoir

Both with the same styling as the email input.

**Step 2: Commit**

```bash
git add src/components/auth/WaitlistForm.tsx
git commit -m "feat(waitlist): add firstName and lastName to WaitlistForm"
```

---

## Task 6: Update `GlobalHeader.tsx` — Conditional Menu

**Files:**
- Modify: `src/components/layout/header/GlobalHeader.tsx`

**Step 1: Import and use the hook**

Add import:
```typescript
import { useWaitlistMode } from "@/lib/hooks/useWaitlistMode"
```

Inside `GlobalHeader` function, add:
```typescript
const { isWaitlistMode } = useWaitlistMode()
```

**Step 2: Filter NAV_LINKS based on waitlist mode**

Replace static `NAV_LINKS` usage with a computed version:

```typescript
const visibleNavLinks = isWaitlistMode
  ? NAV_LINKS.filter((link) => link.href !== "/blog")
  : NAV_LINKS
```

Then use `visibleNavLinks` instead of `NAV_LINKS` in both desktop nav and mobile menu rendering.

**Step 3: Commit**

```bash
git add src/components/layout/header/GlobalHeader.tsx
git commit -m "feat(waitlist): hide Blog menu in waitlist mode"
```

---

## Task 7: Update `HeroCTA.tsx` — Conditional CTA

**Files:**
- Modify: `src/components/marketing/hero/HeroCTA.tsx`

**Step 1: Import and use waitlist mode**

```typescript
import { useWaitlistMode } from "@/lib/hooks/useWaitlistMode"
```

**Step 2: Update rendering logic**

When `isWaitlistMode` is true:
- Show text "Daftarkan email untuk menggunakan Makalah AI, lalu tunggu undangan kami" above the button
- Change CTA text from "AYO MULAI" to "IKUT DAFTAR TUNGGU"
- Change href to `/waiting-list` (regardless of auth state)

```typescript
export function HeroCTA() {
  const { data: session, isPending: isSessionPending } = useSession()
  const isSignedIn = !!session
  const { hasCompletedOnboarding, isLoading: isOnboardingLoading } = useOnboardingStatus()
  const { isWaitlistMode } = useWaitlistMode()

  const getHref = (): string => {
    if (isWaitlistMode) return "/waiting-list"
    if (!isSignedIn) return "/sign-up"
    if (hasCompletedOnboarding) return "/chat"
    return "/get-started"
  }

  const isLoading = isSessionPending || (!isWaitlistMode && isSignedIn && isOnboardingLoading)

  return (
    <div className="flex flex-col items-center lg:items-start w-full mt-4 gap-3">
      {isWaitlistMode && (
        <p className="text-interface text-sm text-muted-foreground text-center lg:text-left max-w-md">
          Daftarkan email untuk menggunakan Makalah AI, lalu tunggu undangan kami
        </p>
      )}
      <SectionCTA href={getHref()} isLoading={isLoading}>
        {isWaitlistMode ? "IKUT DAFTAR TUNGGU" : "AYO MULAI"}
      </SectionCTA>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add src/components/marketing/hero/HeroCTA.tsx
git commit -m "feat(waitlist): conditional hero CTA for waitlist mode"
```

---

## Task 8: Update Pricing Components — Disable BPP/Pro Cards

**Files:**
- Modify: `src/components/marketing/pricing-teaser/TeaserCard.tsx`
- Modify: `src/components/marketing/pricing-teaser/PricingTeaser.tsx`
- Modify: `src/components/marketing/pricing/PricingCard.tsx`
- Modify: `src/app/(marketing)/pricing/page.tsx`

**Step 1: Add waitlist mode to PricingTeaser**

In `PricingTeaser.tsx`, import `useWaitlistMode` and pass `isWaitlistMode` to `TeaserCard`:

```typescript
const { isWaitlistMode } = useWaitlistMode()
```

Pass `isWaitlistMode` as prop to TeaserCard components.

**Step 2: Update TeaserCard**

When `isWaitlistMode` is true and plan is NOT "gratis" (name check or slug):
- Add visual opacity/disabled state (`opacity-50 pointer-events-none` or similar)
- Show overlay/badge "Segera Hadir" on the card

**Step 3: Update PricingCard and PricingPage**

Same pattern: import `useWaitlistMode`, pass to cards, disable BPP/Pro with "Segera Hadir" button.

In `PricingCard.tsx`, when waitlist mode is active and plan slug is not "gratis":
- Replace CTA button text with "SEGERA HADIR"
- Make button disabled
- Add reduced opacity styling

**Step 4: Commit**

```bash
git add src/components/marketing/pricing-teaser/ src/components/marketing/pricing/ src/app/\(marketing\)/pricing/
git commit -m "feat(waitlist): disable BPP/Pro pricing cards in waitlist mode"
```

---

## Task 9: Update Get-Started Page — Disable Non-Gratis Plans

**Files:**
- Modify: `src/app/(onboarding)/get-started/page.tsx`

**Step 1: Import and use waitlist mode**

```typescript
import { useWaitlistMode } from "@/lib/hooks/useWaitlistMode"
```

In the component:
```typescript
const { isWaitlistMode } = useWaitlistMode()
```

**Step 2: Override plan disabled state when waitlist is active**

In the `getStartedPlans` mapping, when `isWaitlistMode` is true, force all plans to `isDisabled: true` and `ctaLabel: "Segera Hadir"`.

Since this page currently only shows BPP and Pro plans (TARGET_PLAN_ORDER = ["bpp", "pro"]), all cards will be disabled in waitlist mode. The aside text already says "Kamu berada di paket gratis" which is correct context.

**Step 3: Commit**

```bash
git add src/app/\(onboarding\)/get-started/page.tsx
git commit -m "feat(waitlist): disable paid plans in get-started during waitlist mode"
```

---

## Task 10: Update Sign-In Page — Hide Google OAuth + Sign-Up Link

**Files:**
- Modify: `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`

**Step 1: Import useWaitlistMode**

```typescript
import { useWaitlistMode } from "@/lib/hooks/useWaitlistMode"
```

In the component:
```typescript
const { isWaitlistMode } = useWaitlistMode()
```

**Step 2: Conditionally hide Google OAuth button**

Wrap the Google OAuth button and divider in `{!isWaitlistMode && (...)}`:

```typescript
{!isWaitlistMode && (
  <>
    {/* Google OAuth button */}
    <button type="button" onClick={handleGoogleSignIn} ...>
      ...MASUK DENGAN GOOGLE...
    </button>

    {/* Divider */}
    <div className="flex items-center gap-4 w-full">...</div>
  </>
)}
```

**Step 3: Conditionally hide "Belum punya akun? Daftar" footer**

Wrap the footer link in `{!isWaitlistMode && (...)}`:

```typescript
{!isWaitlistMode && (
  <p className="text-muted-foreground text-xs font-sans text-center mt-4">
    Belum punya akun?{" "}
    <Link href={signUpHref} ...>Daftar</Link>
  </p>
)}
```

**Step 4: Also hide signup_disabled error message link in waitlist mode**

In the error display, when `isWaitlistMode`, don't show the "daftar" link.

**Step 5: Commit**

```bash
git add src/app/\(auth\)/sign-in/
git commit -m "feat(waitlist): hide Google OAuth and sign-up link in waitlist mode"
```

---

## Task 11: Update `UserDropdown.tsx` — Add "Waiting List" Menu for Admin

**Files:**
- Modify: `src/components/layout/header/UserDropdown.tsx`

**Step 1: Add import**

```typescript
import { UserPlus } from "iconoir-react"
```

**Step 2: Add "Waiting List" menu item**

Inside the `{isAdmin && (...)}` block, after the "AI Ops" link, add:

```typescript
<Link
  href="/dashboard/waitlist"
  onClick={() => setIsOpen(false)}
  className="flex items-center gap-dense p-dense text-sm font-medium text-narrative text-foreground dark:text-slate-50 hover:bg-slate-900 hover:text-slate-50 transition-colors rounded-action dark:hover:bg-slate-100 dark:hover:text-slate-900"
>
  <UserPlus className="icon-interface" />
  <span>Waiting List</span>
</Link>
```

**Step 3: Also add to mobile menu in GlobalHeader**

In `GlobalHeader.tsx`, inside the `{isAdmin && (...)}` section of the mobile menu accordion, add the same link:

```typescript
<Link
  href="/dashboard/waitlist"
  className="w-full flex items-center gap-3 px-2 py-2 text-[11px] text-narrative text-foreground rounded-action hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
  onClick={() => setMobileMenuState({ isOpen: false, pathname })}
>
  <UserPlus className="icon-interface" />
  <span>Waiting List</span>
</Link>
```

**Step 4: Commit**

```bash
git add src/components/layout/header/UserDropdown.tsx src/components/layout/header/GlobalHeader.tsx
git commit -m "feat(waitlist): add Waiting List menu item for admin in user dropdown"
```

---

## Task 12: Create Admin-Login Page

**Files:**
- Create: `src/app/(auth)/admin-login/page.tsx`
- Modify: `src/proxy.ts` (add `/admin-login` and `/accept-invite` to public routes)

**Step 1: Create admin-login page**

Minimal page using `AuthWideCard` (same as sign-in), with only Google OAuth button:

```typescript
"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "@/lib/auth-client"
import { AuthWideCard } from "@/components/auth/AuthWideCard"
import { useState } from "react"
import { toast } from "sonner"
import { RefreshDouble } from "iconoir-react"
import { getRedirectUrl } from "@/lib/utils/redirectAfterAuth"

export default function AdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const callbackURL = getRedirectUrl(searchParams, "/dashboard")

  async function handleGoogleSignIn() {
    setIsLoading(true)
    try {
      await signIn.social({
        provider: "google",
        callbackURL,
      })
    } catch {
      toast.error("Gagal masuk dengan Google. Silakan coba lagi.")
      setIsLoading(false)
    }
  }

  return (
    <AuthWideCard
      title="Admin Login"
      subtitle="Halaman ini khusus untuk administrator"
      showBackButton
      onBackClick={() => router.back()}
    >
      <div className="w-full space-y-5">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="group relative overflow-hidden inline-flex w-full items-center justify-center gap-2 rounded-action h-10 px-4 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span
            className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
            aria-hidden="true"
          />
          <span className="relative z-10 inline-flex items-center gap-2">
            {isLoading ? <RefreshDouble className="h-4 w-4 animate-spin" /> : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            MASUK DENGAN GOOGLE
          </span>
        </button>

        <p className="text-xs text-center text-muted-foreground font-mono">
          Jika kamu bukan administrator, silakan kembali ke{" "}
          <button
            type="button"
            onClick={() => router.push("/sign-in")}
            className="text-foreground hover:underline"
          >
            halaman masuk
          </button>
          .
        </p>
      </div>
    </AuthWideCard>
  )
}
```

**Step 2: Update proxy.ts public routes**

Add `/admin-login` and `/accept-invite` to PUBLIC_ROUTES array:

```typescript
const PUBLIC_ROUTES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/verify-2fa",
  "/api",
  "/about",
  "/pricing",
  "/blog",
  "/documentation",
  "/waiting-list",
  "/privacy",
  "/admin-login",
  "/accept-invite",
]
```

**Step 3: Commit**

```bash
git add src/app/\(auth\)/admin-login/ src/proxy.ts
git commit -m "feat(waitlist): add admin-login page and update public routes"
```

---

## Task 13: Add BetterAuth Admin Plugin

**Files:**
- Modify: `convex/auth.ts`

**Step 1: Add admin plugin import**

```typescript
import { magicLink, twoFactor, admin } from "better-auth/plugins"
```

**Step 2: Add admin plugin to plugins array**

In the `plugins` array of `createAuthOptions`, add `admin()`:

```typescript
plugins: [
  crossDomain({ siteUrl }),
  convex({ authConfig }),
  magicLink({
    sendMagicLink: async ({ email, url }) => {
      await sendMagicLinkEmail(email, url)
    },
    expiresIn: 300,
  }),
  twoFactor({
    skipVerificationOnEnable: true,
    otpOptions: {
      sendOTP: async ({ user, otp }) => {
        await sendTwoFactorOtpEmail(user.email, otp)
      },
    },
  }),
  twoFactorCrossDomainBypass(),
  admin(), // Enables admin.createUser() for waitlist invite flow
],
```

**Step 3: Verify compilation**

Run: Check `npx convex dev` — no errors
Expected: BetterAuth admin plugin active

**Step 4: Commit**

```bash
git add convex/auth.ts
git commit -m "feat(waitlist): add BetterAuth admin plugin for user creation"
```

---

## Task 14: Create Accept-Invite API Route

**Files:**
- Create: `src/app/api/accept-invite/route.ts`

**Step 1: Create the API route**

This route handles auto-account creation when invited user clicks the email link.

```typescript
import { NextRequest, NextResponse } from "next/server"
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import { authClient } from "@/lib/auth-client"

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Token tidak valid" },
        { status: 400 }
      )
    }

    // 1. Validate token
    const tokenResult = await fetchQuery(api.waitlist.getByToken, { token })

    if (!tokenResult.valid) {
      return NextResponse.json(
        { error: tokenResult.error || "Token tidak valid" },
        { status: 400 }
      )
    }

    const { email, firstName, lastName } = tokenResult

    // 2. Check if email already has a BetterAuth account
    // Use admin API to create user — will fail if email exists
    const appUrl = process.env.APP_URL || process.env.SITE_URL || "http://localhost:3000"
    const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL

    try {
      // Call BetterAuth admin.createUser via HTTP
      const createUserResponse = await fetch(`${convexSiteUrl}/api/auth/admin/create-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: `${firstName} ${lastName}`.trim(),
          password: crypto.randomUUID(), // Temporary password — user sets real one in settings
          role: "user",
        }),
      })

      if (!createUserResponse.ok) {
        const errorData = await createUserResponse.json().catch(() => ({}))
        // If user already exists, redirect to sign-in
        if (createUserResponse.status === 409 || errorData?.code === "USER_ALREADY_EXISTS") {
          return NextResponse.json(
            { error: "Email sudah terdaftar. Silakan masuk.", redirectUrl: "/sign-in" },
            { status: 409 }
          )
        }
        throw new Error(errorData?.message || "Gagal membuat akun")
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("sudah terdaftar")) {
        return NextResponse.json(
          { error: error.message, redirectUrl: "/sign-in" },
          { status: 409 }
        )
      }
      console.error("[accept-invite] Create user failed:", error)
      return NextResponse.json(
        { error: "Gagal membuat akun. Silakan coba lagi." },
        { status: 500 }
      )
    }

    // 3. Mark waitlist entry as registered
    await fetchMutation(api.waitlist.markAsRegistered, { email })

    // 4. Return success — client will redirect to sign-in for first login
    return NextResponse.json({
      success: true,
      email,
      redirectUrl: `/sign-in?email=${encodeURIComponent(email)}&fromInvite=true`,
    })
  } catch (error) {
    console.error("[accept-invite] Error:", error)
    return NextResponse.json(
      { error: "Terjadi kesalahan. Silakan coba lagi." },
      { status: 500 }
    )
  }
}
```

**NOTE:** The exact BetterAuth admin API endpoint path may vary. Check `better-auth` documentation for the correct path when the admin plugin is enabled. It may be `/api/auth/admin/create-user` or similar. The implementation should be adjusted based on the actual BetterAuth admin API.

**Step 2: Commit**

```bash
git add src/app/api/accept-invite/
git commit -m "feat(waitlist): add accept-invite API route for auto-account creation"
```

---

## Task 15: Create Accept-Invite Page (Client)

**Files:**
- Create: `src/app/(auth)/accept-invite/page.tsx`

**Step 1: Create the page**

```typescript
"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { AuthWideCard } from "@/components/auth/AuthWideCard"
import { RefreshDouble, WarningCircle, CheckCircle } from "iconoir-react"
import Link from "next/link"

type PageState = "validating" | "creating" | "success" | "error"

export default function AcceptInvitePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")

  const [state, setState] = useState<PageState>("validating")
  const [error, setError] = useState<string | null>(null)
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null)

  // Validate token via Convex
  const tokenResult = useQuery(
    api.waitlist.getByToken,
    token ? { token } : "skip"
  )

  // Auto-create account when token is valid
  useEffect(() => {
    if (!token || state !== "validating") return
    if (tokenResult === undefined) return // Still loading

    if (!tokenResult.valid) {
      setState("error")
      setError(tokenResult.error || "Token tidak valid")
      return
    }

    // Token valid — create account
    setState("creating")

    fetch("/api/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) {
          setState("error")
          setError(data.error || "Gagal membuat akun")
          if (data.redirectUrl) setRedirectUrl(data.redirectUrl)
          return
        }
        setState("success")
        // Redirect to sign-in with email pre-filled
        setTimeout(() => {
          router.push(data.redirectUrl || "/sign-in")
        }, 2000)
      })
      .catch(() => {
        setState("error")
        setError("Terjadi kesalahan jaringan. Silakan coba lagi.")
      })
  }, [token, tokenResult, state, router])

  if (!token) {
    return (
      <AuthWideCard title="Link Tidak Valid" subtitle="Token undangan tidak ditemukan.">
        <div className="text-center space-y-4 w-full">
          <WarningCircle className="h-12 w-12 text-destructive mx-auto" />
          <Link href="/" className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
            Kembali ke beranda
          </Link>
        </div>
      </AuthWideCard>
    )
  }

  const titles: Record<PageState, { title: string; subtitle: string }> = {
    validating: { title: "Memvalidasi Undangan", subtitle: "Memeriksa token undangan..." },
    creating: { title: "Menyiapkan Akun", subtitle: "Membuat akun untuk kamu..." },
    success: { title: "Akun Berhasil Dibuat!", subtitle: "Mengalihkan ke halaman masuk..." },
    error: { title: "Undangan Tidak Valid", subtitle: error || "Terjadi kesalahan" },
  }

  const { title, subtitle } = titles[state]

  return (
    <AuthWideCard title={title} subtitle={subtitle}>
      <div className="text-center space-y-4 w-full">
        {(state === "validating" || state === "creating") && (
          <RefreshDouble className="h-12 w-12 text-primary mx-auto animate-spin" />
        )}

        {state === "success" && (
          <CheckCircle className="h-12 w-12 text-success mx-auto" />
        )}

        {state === "error" && (
          <>
            <WarningCircle className="h-12 w-12 text-destructive mx-auto" />
            {redirectUrl ? (
              <Link
                href={redirectUrl}
                className="text-xs font-mono text-foreground hover:underline"
              >
                Masuk ke akun yang sudah ada
              </Link>
            ) : (
              <p className="text-xs font-mono text-muted-foreground">
                Hubungi administrator untuk mendapatkan undangan baru.
              </p>
            )}
          </>
        )}
      </div>
    </AuthWideCard>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/\(auth\)/accept-invite/
git commit -m "feat(waitlist): add accept-invite page for invite link handling"
```

---

## Task 16: Update Email Templates

**Files:**
- Modify: `src/lib/email/resend.ts`

**Step 1: Update `sendWaitlistConfirmationEmail` to include name**

```typescript
export async function sendWaitlistConfirmationEmail({
  to,
  firstName,
}: BaseEmailParams & { firstName?: string }): Promise<void> {
  // ... existing guard ...
  const greeting = firstName ? `Halo ${firstName}!` : "Halo!"
  // Update email text to use greeting
}
```

**Step 2: Update `sendWaitlistInviteEmail` to use `/accept-invite` route**

Change the invite link from:
```typescript
const inviteLink = `${appUrl}/sign-up?invite=${inviteToken}`
```
to:
```typescript
const inviteLink = `${appUrl}/accept-invite?token=${inviteToken}`
```

Also add `firstName` param and personalize greeting.

**Step 3: Update server action in `actions.ts`**

Update `sendConfirmationEmail` to accept and pass `firstName`:
```typescript
export async function sendConfirmationEmail(email: string, firstName?: string): Promise<void> {
  await sendWaitlistConfirmationEmail({ to: email, firstName })
}
```

**Step 4: Commit**

```bash
git add src/lib/email/resend.ts src/app/\(auth\)/waiting-list/actions.ts
git commit -m "feat(waitlist): update email templates with names and accept-invite link"
```

---

## Task 17: Create Waitlist Dashboard Page

**Files:**
- Create: `src/app/(dashboard)/dashboard/waitlist/page.tsx`
- Create: `src/components/admin/WaitlistDashboard.tsx`
- Modify: `src/components/admin/adminPanelConfig.ts` (remove waitlist tab)

**Step 1: Create the dashboard page**

```typescript
"use client"

import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { WaitlistDashboard } from "@/components/admin/WaitlistDashboard"

export default function WaitlistDashboardPage() {
  const { user, isLoading } = useCurrentUser()
  const router = useRouter()

  const isAdmin = user?.role === "admin" || user?.role === "superadmin"

  useEffect(() => {
    if (!isLoading && user && !isAdmin) {
      router.replace("/")
    }
  }, [isLoading, user, isAdmin, router])

  if (isLoading || !user || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-interface text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return <WaitlistDashboard userId={user._id} />
}
```

**Step 2: Create WaitlistDashboard component**

Evolve from existing `WaitlistManager.tsx` — same features plus:
- Toggle switch at top for enabling/disabling waitlist mode
- Individual "Undang" button per row (uses `inviteSingle` instead of bulk)
- Layout matches admin panel styling
- Full page layout (not a tab)

Key sections:
1. **Header**: "Waiting List" title + toggle switch (calls `appConfig.setWaitlistMode`)
2. **Stats row**: Same as WaitlistManager stats
3. **Table**: firstName, lastName, email, status, date, actions (Undang/Hapus)

**Step 3: Remove waitlist tab from admin panel config**

In `adminPanelConfig.ts`, remove the waitlist entry from `ADMIN_SIDEBAR_ITEMS`:

```typescript
// Remove this entry:
{
  id: "waitlist",
  label: "Waiting List",
  icon: UserPlus,
  headerTitle: "Waiting List",
  headerDescription: "Kelola pendaftar waiting list dan kirim undangan",
  headerIcon: UserPlus,
},
```

Also remove the `UserPlus` import if no longer used.

**Step 4: Remove WaitlistManager rendering from admin panel**

Find and update the admin panel page/component that renders `WaitlistManager` for the "waitlist" tab — remove that case/section.

**Step 5: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/waitlist/ src/components/admin/WaitlistDashboard.tsx src/components/admin/adminPanelConfig.ts
git commit -m "feat(waitlist): create dedicated waitlist dashboard page with toggle"
```

---

## Task 18: Seed Default Config

**Files:**
- Create: `convex/migrations/seedWaitlistConfig.ts` (or add to existing migrations)

**Step 1: Create seed script**

```typescript
import { mutation } from "../_generated/server"

export const seedWaitlistConfig = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", "waitlistMode"))
      .unique()

    if (!existing) {
      await ctx.db.insert("appConfig", {
        key: "waitlistMode",
        value: false,
        updatedAt: Date.now(),
        updatedBy: "system",
      })
      return { created: true }
    }

    return { created: false, existing: true }
  },
})
```

**Step 2: Run seed**

```bash
npm run convex -- run migrations/seedWaitlistConfig:seedWaitlistConfig
```

**Step 3: Commit**

```bash
git add convex/migrations/
git commit -m "feat(waitlist): add seed migration for waitlist config"
```

---

## Task 19: Integration Testing — Manual Verification

**Step 1: Test waitlist mode toggle**

1. Go to `/dashboard/waitlist` as admin
2. Toggle "Aktifkan" on
3. Verify:
   - Home page hero shows "IKUT DAFTAR TUNGGU"
   - Blog menu hidden from header
   - Pricing page shows BPP/Pro as "Segera Hadir"
   - Sign-in page hides Google OAuth and sign-up link

**Step 2: Test waitlist registration**

1. Navigate to `/waiting-list`
2. Fill firstName, lastName, email
3. Submit → verify confirmation toast + redirect to home
4. Check Convex dashboard — entry exists with "pending" status

**Step 3: Test admin invite**

1. Go to `/dashboard/waitlist`
2. Click "Undang" on a pending entry
3. Verify email sent (check Resend dashboard or test email)
4. Verify entry status changed to "invited"

**Step 4: Test accept invite**

1. Click invite link from email → `/accept-invite?token=XXX`
2. Verify account created
3. Verify redirect to sign-in page
4. Sign in with email + temporary flow
5. Verify user is gratis tier

**Step 5: Test toggle off**

1. Toggle waitlist mode off
2. Verify all pages return to "Sistem Sekarang"
3. Verify existing users still exist

**Step 6: Test admin-login**

1. Navigate to `/admin-login`
2. Verify only Google OAuth button shown
3. Login as admin → verify redirect to dashboard

---

## Task Summary

| # | Task | Type | Dependencies |
|---|------|------|-------------|
| 1 | Add appConfig table + update waitlistEntries schema | Backend | None |
| 2 | Create convex/appConfig.ts | Backend | Task 1 |
| 3 | Update convex/waitlist.ts with names + inviteSingle | Backend | Task 1 |
| 4 | Create useWaitlistMode hook | Frontend | Task 2 |
| 5 | Update WaitlistForm with name fields | Frontend | Task 3 |
| 6 | Update GlobalHeader — hide Blog | Frontend | Task 4 |
| 7 | Update HeroCTA — conditional CTA | Frontend | Task 4 |
| 8 | Update Pricing — disable BPP/Pro | Frontend | Task 4 |
| 9 | Update Get-Started — disable plans | Frontend | Task 4 |
| 10 | Update Sign-In — hide OAuth/signup | Frontend | Task 4 |
| 11 | Update UserDropdown — add WL menu | Frontend | None |
| 12 | Create admin-login page + update proxy | Frontend | None |
| 13 | Add BetterAuth admin plugin | Backend | None |
| 14 | Create accept-invite API route | Backend | Task 13 |
| 15 | Create accept-invite page | Frontend | Task 14 |
| 16 | Update email templates | Backend | Task 3 |
| 17 | Create waitlist dashboard page | Frontend | Tasks 2, 3, 4 |
| 18 | Seed default config | Backend | Task 2 |
| 19 | Integration testing | QA | All tasks |
