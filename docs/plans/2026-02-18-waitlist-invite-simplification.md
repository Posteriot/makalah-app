# Waitlist Invite Simplification — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace magic link invite system with simple signup link email, cleanup dead code, and auto-detect registration in createAppUser.

**Architecture:** Admin sends invite → Convex action marks entry as invited + sends email via Resend with plain `/sign-up` link → User signs up normally → `createAppUser` auto-detects waitlist email and marks as registered.

**Tech Stack:** Convex (action + mutation), Resend API (email), React (dashboard UI)

---

### Task 1: Create Convex action to send invite email

**Files:**
- Modify: `convex/waitlist.ts` (add new action after line 433)
- Modify: `convex/authEmails.ts` (add new invite email template)

**Step 1: Add invite email template to `convex/authEmails.ts`**

Add after `sendWaitlistInviteMagicLinkEmail` (which will be removed later). This uses the existing `sendViaResend` helper.

```typescript
export async function sendWaitlistInviteEmail(
  email: string,
  firstName: string,
  signupUrl: string
): Promise<void> {
  await sendViaResend(
    email,
    "Undangan Bergabung — Makalah AI",
    `<div style="font-family: 'Geist Sans', -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0f172a; color: #e2e8f0; border-radius: 8px;">
      <div style="border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 24px;">
        <span style="font-size: 11px; font-family: 'Geist Mono', monospace; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8;">Makalah AI — Undangan Waiting List</span>
      </div>
      <p style="font-size: 15px; color: #f8fafc; margin: 0 0 8px 0;">Halo, ${firstName}!</p>
      <p style="font-size: 13px; color: #cbd5e1; margin: 0 0 24px 0;">Kamu telah diundang untuk bergabung dengan Makalah AI. Klik tombol di bawah untuk mendaftar — pilih Google atau buat akun dengan email dan password.</p>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${signupUrl}" style="display: inline-block; background: #f59e0b; color: #0f172a; font-family: 'Geist Mono', monospace; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; text-decoration: none; padding: 12px 32px; border-radius: 6px;">DAFTAR SEKARANG</a>
      </div>
      <p style="font-size: 11px; color: #64748b; margin: 0 0 8px 0;">Setelah mendaftar, kamu bisa langsung mulai menyusun paper dengan Makalah AI.</p>
      <p style="font-size: 11px; color: #64748b; margin: 0;">Kalau kamu tidak merasa mendaftar di Makalah AI, abaikan email ini.</p>
    </div>`
  );
}
```

**Step 2: Add Convex action `sendInviteEmail` to `convex/waitlist.ts`**

Import `action` from `"./_generated/server"` and add at the end of the file. This needs to be an `action` (not mutation) because it does an HTTP call (Resend API) via the email function.

```typescript
import { action } from "./_generated/server"
import { internal } from "./_generated/api"

/**
 * Send invite email to a waitlist entry (admin only).
 * Marks entry as invited, then sends signup link email via Resend.
 */
export const sendInviteEmail = action({
  args: {
    adminUserId: v.id("users"),
    entryId: v.id("waitlistEntries"),
  },
  handler: async (ctx, args) => {
    // Mark entry as invited (admin role check inside mutation)
    const result = await ctx.runMutation(internal.waitlist.inviteSingleInternal, {
      adminUserId: args.adminUserId as string,
      entryId: args.entryId as string,
    })

    if (!result) {
      throw new Error("Entry tidak ditemukan atau sudah diundang")
    }

    const firstName = result.firstName ?? "Pengguna"
    const appUrl = process.env.APP_URL ?? "https://makalah.ai"
    const signupUrl = `${appUrl}/sign-up`

    // Send invite email via Resend
    const { sendWaitlistInviteEmail } = await import("./authEmails")
    await sendWaitlistInviteEmail(result.email, firstName, signupUrl)

    return { email: result.email }
  },
})
```

**Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS (no type errors)

**Step 4: Commit**

```bash
git add convex/waitlist.ts convex/authEmails.ts
git commit -m "feat(waitlist): add sendInviteEmail action with plain signup link"
```

---

### Task 2: Update WaitlistDashboard to use new Convex action

**Files:**
- Modify: `src/components/admin/WaitlistDashboard.tsx:98-130` (replace handleInvite)

**Step 1: Replace `handleInvite` function**

Change import: add `useAction` from `convex/react`.
Add: `const sendInviteEmailAction = useAction(api.waitlist.sendInviteEmail)` near other hooks.

Replace `handleInvite` (lines 98-130) with:

```typescript
const handleInvite = async (entryId: Id<"waitlistEntries">) => {
  setInvitingId(entryId)
  try {
    const result = await sendInviteEmailAction({
      adminUserId: userId,
      entryId,
    })
    toast.success(`Undangan dikirim ke ${result.email}`)
  } catch (error) {
    console.error("Invite error:", error)
    toast.error("Gagal mengirim undangan", {
      description: error instanceof Error ? error.message : "Terjadi kesalahan",
    })
  } finally {
    setInvitingId(null)
  }
}
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add src/components/admin/WaitlistDashboard.tsx
git commit -m "feat(waitlist): update dashboard to use Convex action instead of HTTP fetch"
```

---

### Task 3: Add auto-detect registration in createAppUser

**Files:**
- Modify: `convex/users.ts:311-328` (add waitlist detection after user creation)

**Step 1: Add waitlist detection at end of `createAppUser` handler**

After the new user is created (or existing user is linked), check if their email exists in `waitlistEntries` with status `invited` and mark as `registered`.

Add this block before the final `return` in each of the 3 branches (already linked, migration link, new user). Best approach: extract to a helper and call after all branches resolve.

After the existing handler logic, before the final return of each path, add a shared helper call. Actually, simplest approach — add it at the very end of the handler, after all return paths are consolidated:

Restructure the handler to capture the userId, then run waitlist check:

```typescript
handler: async (ctx, { betterAuthUserId, email, firstName, lastName }) => {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity || identity.subject !== betterAuthUserId) {
    throw new Error("Unauthorized")
  }

  // 1. Already linked by betterAuthUserId
  const alreadyLinked = await ctx.db
    .query("users")
    .withIndex("by_betterAuthUserId", (q) =>
      q.eq("betterAuthUserId", betterAuthUserId)
    )
    .unique()

  if (alreadyLinked) return alreadyLinked._id

  // 2. Find existing user by email (migration linking)
  const existingByEmail = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", email))
    .collect()

  const linkCandidate = existingByEmail
    .filter((u) => !u.betterAuthUserId)
    .sort((a, b) => (b.lastLoginAt ?? 0) - (a.lastLoginAt ?? 0))[0]

  if (linkCandidate) {
    await ctx.db.patch(linkCandidate._id, {
      betterAuthUserId,
      lastLoginAt: Date.now(),
      updatedAt: Date.now(),
    })
    // Auto-detect waitlist registration
    await markWaitlistRegistered(ctx.db, email)
    return linkCandidate._id
  }

  // 3. No match — create new user
  const now = Date.now()
  const role: UserRole = SUPERADMIN_EMAILS.includes(email.toLowerCase())
    ? "superadmin"
    : "user"

  const newUserId = await ctx.db.insert("users", {
    betterAuthUserId,
    email,
    firstName,
    lastName,
    role,
    emailVerified: false,
    subscriptionStatus: role === "superadmin" ? "unlimited" : "free",
    createdAt: now,
    lastLoginAt: now,
  })

  // Auto-detect waitlist registration
  await markWaitlistRegistered(ctx.db, email)

  return newUserId
},
```

Add helper function above `createAppUser`:

```typescript
/**
 * If email exists in waitlistEntries as "invited", mark as "registered".
 * Called during createAppUser to auto-detect waitlist signups.
 */
async function markWaitlistRegistered(
  db: GenericDatabaseWriter<DataModel>,
  email: string
) {
  const entry = await db
    .query("waitlistEntries")
    .withIndex("by_email", (q) => q.eq("email", email.toLowerCase().trim()))
    .unique()

  if (entry && entry.status === "invited") {
    await db.patch(entry._id, {
      status: "registered",
      registeredAt: Date.now(),
    })
  }
}
```

Note: Import `GenericDatabaseWriter` from `convex/server` and `DataModel` from `./_generated/dataModel` (DataModel is already imported if used elsewhere, verify).

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add convex/users.ts
git commit -m "feat(waitlist): auto-detect waitlist registration in createAppUser"
```

---

### Task 4: Verify sign-in page hides signup link in waitlist mode

**Files:**
- Read: `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:457,584`

**Step 1: Verify existing behavior**

The sign-in page already hides both:
- Google OAuth button + divider (line 457: `{!isWaitlistMode && (`)
- "Belum punya akun? Daftar" footer (line 584: `{!isWaitlistMode && (`)

This is already correctly implemented. No changes needed.

**Step 2: Also check the error message signup link**

Line 547-559: The `SIGNUP_DISABLED_ERROR_CODE` error shows a "daftar" link to `/sign-up`. This link appears when Google OAuth fails because account doesn't exist. In waitlist mode, Google OAuth is hidden, so this error can't trigger. No change needed.

**Step 3: Commit** — skip, no changes.

---

### Task 5: Cleanup magic link code

**Files:**
- Delete: `convex/waitlistInviteHttp.ts`
- Modify: `convex/http.ts:1-54` (remove import and routes)
- Modify: `convex/auth.ts:1-137` (remove _pendingInvite, setPendingInvite, invite branch in sendMagicLink)
- Modify: `convex/authEmails.ts:71-94` (remove sendWaitlistInviteMagicLinkEmail)

**Step 1: Delete `convex/waitlistInviteHttp.ts`**

```bash
rm convex/waitlistInviteHttp.ts
```

**Step 2: Remove waitlist routes from `convex/http.ts`**

Remove import of `sendInviteMagicLink` (line 5) and the two routes (lines 43-52):

Before:
```typescript
import { sendInviteMagicLink } from "./waitlistInviteHttp";
```

After: (remove this line entirely)

Remove lines 42-52:
```typescript
// Waitlist invite: send magic link email
http.route({
  path: "/api/waitlist/send-invite",
  method: "POST",
  handler: sendInviteMagicLink,
});
http.route({
  path: "/api/waitlist/send-invite",
  method: "OPTIONS",
  handler: sendInviteMagicLink,
});
```

**Step 3: Remove `_pendingInvite` and `setPendingInvite` from `convex/auth.ts`**

Remove lines 15-25 (import of `sendWaitlistInviteMagicLinkEmail`, `_pendingInvite` variable, `setPendingInvite` function).

In the `sendMagicLink` callback (line 106-114), remove the invite branch:

Before:
```typescript
sendMagicLink: async ({ email, url }) => {
  if (_pendingInvite) {
    const { firstName } = _pendingInvite;
    _pendingInvite = null;
    await sendWaitlistInviteMagicLinkEmail(email, firstName, url);
    return;
  }
  await sendMagicLinkEmail(email, url);
},
```

After:
```typescript
sendMagicLink: async ({ email, url }) => {
  await sendMagicLinkEmail(email, url);
},
```

Also remove `setPendingInvite` from exports (line 23) and the `sendWaitlistInviteMagicLinkEmail` import (line 15).

**Step 4: Remove `sendWaitlistInviteMagicLinkEmail` from `convex/authEmails.ts`**

Remove lines 71-94 (the `sendWaitlistInviteMagicLinkEmail` function). Keep the new `sendWaitlistInviteEmail` added in Task 1.

**Step 5: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS (no references to deleted code)

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor(waitlist): remove magic link invite code (waitlistInviteHttp, pendingInvite, old email template)"
```

---

### Task 6: Cleanup dead code in `convex/waitlist.ts`

**Files:**
- Modify: `convex/waitlist.ts`

**Step 1: Remove `getByToken` query (lines 131-162)**

This query validates invite tokens for the magic link flow. No longer needed since we don't use tokens.

**Step 2: Remove `inviteSingle` mutation (lines 332-367)**

This generates `inviteToken` — no longer needed. Note: keep `inviteSingleInternal` (used by the new `sendInviteEmail` action).

**Step 3: Remove `bulkInvite` mutation (lines 227-264)**

Generates invite tokens for bulk invite — dead code now.

**Step 4: Remove `resendInvite` mutation (lines 292-326)**

Generates new invite token — dead code.

**Step 5: Remove `enforceGratisTier` internal mutation (lines 415-433)**

The gratis tier enforcement is already handled in `markAsRegistered` (lines 87-98). No need for a separate internal mutation.

**Step 6: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS. If anything references deleted functions, fix those references.

**Step 7: Commit**

```bash
git add convex/waitlist.ts
git commit -m "refactor(waitlist): remove dead code (token-based invite, bulkInvite, enforceGratisTier)"
```

---

### Task 7: Update waitlist confirmation email text

**Files:**
- Modify: `src/lib/email/resend.ts:31-46`

**Step 1: Update confirmation email text**

The current text says "mengirimkan magic link ke email ini. Klik link tersebut untuk langsung masuk — akunmu akan otomatis dibuat."

Replace with text about receiving a signup link:

```typescript
text: `${greeting}

Terima kasih sudah mendaftar di waiting list Makalah App.

Email kamu (${to}) sudah terdaftar. Saat giliran kamu tiba, kami akan mengirimkan email undangan berisi link pendaftaran. Klik link tersebut untuk membuat akun — bisa pakai Google atau email dan password.

Penting: Jika email undangan tidak ditemukan di inbox, periksa folder spam.

Sambil menunggu, kamu bisa:
- Follow perkembangan kami di sosial media
- Baca dokumentasi di website kami

Sampai jumpa di Makalah App!

Salam,
Tim Makalah`,
```

**Step 2: Commit**

```bash
git add src/lib/email/resend.ts
git commit -m "fix(waitlist): update confirmation email text to reflect signup link instead of magic link"
```

---

### Task 8: Set APP_URL env var and manual verification

**Step 1: Set Convex env var**

```bash
npx convex env set APP_URL http://localhost:3000
```

**Step 2: Run full type check**

```bash
npx tsc --noEmit
```

**Step 3: Run linter**

```bash
npm run lint
```

**Step 4: Manual test checklist**

1. Start dev servers: `npm run dev` + `npx convex dev`
2. Go to admin panel → Waiting List dashboard
3. Add a test entry to waitlist (or use existing pending entry)
4. Click "Undang" → verify toast shows success
5. Check Resend dashboard or email inbox for invite email
6. Verify email contains link to `http://localhost:3000/sign-up`
7. Click link → verify it goes to sign-up page
8. Sign up → verify `waitlistEntries` status changes to "registered"
9. Go to sign-in page → verify no signup link visible when waitlist mode is ON

**Step 5: Commit any fixes from verification**

---

## Summary of changes by file

| File | Action | What |
|------|--------|------|
| `convex/waitlistInviteHttp.ts` | DELETE | Entire magic link HTTP action |
| `convex/http.ts` | MODIFY | Remove import + 2 routes |
| `convex/auth.ts` | MODIFY | Remove `_pendingInvite`, `setPendingInvite`, invite branch in sendMagicLink |
| `convex/authEmails.ts` | MODIFY | Remove `sendWaitlistInviteMagicLinkEmail`, add `sendWaitlistInviteEmail` |
| `convex/waitlist.ts` | MODIFY | Add `sendInviteEmail` action, remove `getByToken`, `inviteSingle`, `bulkInvite`, `resendInvite`, `enforceGratisTier` |
| `convex/users.ts` | MODIFY | Add `markWaitlistRegistered` helper, call in `createAppUser` |
| `src/components/admin/WaitlistDashboard.tsx` | MODIFY | Replace `fetch()` with `useAction()` |
| `src/lib/email/resend.ts` | MODIFY | Update confirmation email text |
| `src/app/(auth)/sign-in/...` | NO CHANGE | Already hides signup link in waitlist mode |
