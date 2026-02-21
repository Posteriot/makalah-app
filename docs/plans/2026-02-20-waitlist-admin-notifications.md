# Waitlist Admin Email Notifications — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Kirim email notifikasi ke semua admin/superadmin ketika ada event waitlist (pendaftaran baru, undangan terkirim, registrasi selesai).

**Architecture:** Satu `internalAction` terpusat (`notifyAdminsWaitlistEvent`) yang menerima event type dan entry data, resolve admin emails dari env vars, lalu kirim via `sendViaResend`. Mutations trigger action via `ctx.scheduler.runAfter(0, ...)`, actions call langsung.

**Tech Stack:** Convex (internalAction, scheduler), Resend API (existing `sendViaResend` helper)

**Design doc:** `docs/plans/2026-02-20-waitlist-admin-notifications-design.md`

---

### Task 1: Add `sendWaitlistAdminNotification` to authEmails.ts

**Files:**
- Modify: `convex/authEmails.ts` (append after line 102)

**Step 1: Add the email sender function**

Append this exported function at the end of `convex/authEmails.ts` (after `sendWaitlistInviteEmail`):

```typescript
export type WaitlistAdminEvent = "new_registration" | "invited" | "registered"

export async function sendWaitlistAdminNotification(
  adminEmails: string[],
  event: WaitlistAdminEvent,
  entryEmail: string,
  entryName: string,
): Promise<void> {
  if (adminEmails.length === 0) return

  const appUrl = process.env.SITE_URL ?? process.env.APP_URL ?? DEFAULT_APP_URL
  const dashboardUrl = `${appUrl}/dashboard/waitlist`
  const timestamp = new Date().toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  })

  const eventConfig: Record<WaitlistAdminEvent, { subject: string; label: string; color: string; description: string }> = {
    new_registration: {
      subject: `[Waitlist] Pendaftar Baru: ${entryName} (${entryEmail})`,
      label: "PENDAFTAR BARU",
      color: "#f59e0b",
      description: `<strong>${entryName}</strong> (${entryEmail}) baru saja mendaftar di waiting list.`,
    },
    invited: {
      subject: `[Waitlist] Undangan Terkirim: ${entryName} (${entryEmail})`,
      label: "UNDANGAN TERKIRIM",
      color: "#0ea5e9",
      description: `Undangan telah dikirim ke <strong>${entryName}</strong> (${entryEmail}).`,
    },
    registered: {
      subject: `[Waitlist] Registrasi Selesai: ${entryName} (${entryEmail})`,
      label: "REGISTRASI SELESAI",
      color: "#10b981",
      description: `<strong>${entryName}</strong> (${entryEmail}) telah berhasil mendaftar akun setelah diundang.`,
    },
  }

  const config = eventConfig[event]

  const html = `<div style="font-family: 'Geist Mono', 'SF Mono', monospace; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0f172a; color: #e2e8f0; border-radius: 8px;">
    <div style="border-bottom: 1px solid #334155; padding-bottom: 16px; margin-bottom: 24px;">
      <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8;">Makalah AI — Admin Notification</span>
    </div>
    <div style="display: inline-block; background: ${config.color}20; border: 1px solid ${config.color}40; border-radius: 4px; padding: 4px 10px; margin-bottom: 16px;">
      <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${config.color};">${config.label}</span>
    </div>
    <p style="font-size: 13px; color: #cbd5e1; margin: 0 0 16px 0; line-height: 1.6;">${config.description}</p>
    <div style="background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px;">
      <p style="font-size: 11px; color: #94a3b8; margin: 0 0 4px 0;">WAKTU</p>
      <p style="font-size: 13px; color: #f8fafc; margin: 0;">${timestamp}</p>
    </div>
    <div style="text-align: center; margin-top: 24px;">
      <a href="${dashboardUrl}" style="display: inline-block; background: #334155; color: #f8fafc; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; text-decoration: none; padding: 10px 24px; border-radius: 6px;">BUKA DASHBOARD</a>
    </div>
    <p style="font-size: 10px; color: #475569; margin: 16px 0 0 0; text-align: center;">Email otomatis dari sistem Makalah AI. Tidak perlu dibalas.</p>
  </div>`

  for (const adminEmail of adminEmails) {
    try {
      await sendViaResend(adminEmail, config.subject, html)
    } catch (error) {
      console.warn(`[Waitlist Admin] Failed to notify ${adminEmail}:`, error)
    }
  }
}
```

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --project convex/tsconfig.json 2>&1 | grep authEmails`
Expected: No errors related to authEmails.ts

**Step 3: Commit**

```bash
git add convex/authEmails.ts
git commit -m "feat(waitlist): add sendWaitlistAdminNotification email template"
```

---

### Task 2: Add `notifyAdminsWaitlistEvent` internalAction to waitlist.ts

**Files:**
- Modify: `convex/waitlist.ts` (add import for `internalAction`, add action at end of file)

**Step 1: Update imports at top of file**

At `convex/waitlist.ts:2`, the import already includes `internalMutation` and `action`. Add `internalAction`:

```typescript
// Line 2 — change from:
import { mutation, query, internalMutation, action } from "./_generated/server"
// to:
import { mutation, query, internalMutation, internalAction, action } from "./_generated/server"
```

**Step 2: Add the centralized notification action**

Append at end of `convex/waitlist.ts` (after line 271, after `sendInviteEmail`):

```typescript
// ════════════════════════════════════════════════════════════════
// Admin Notification (internal, called by scheduler or other actions)
// ════════════════════════════════════════════════════════════════

/**
 * Send email notification to all admins/superadmins about a waitlist event.
 * Called via ctx.scheduler.runAfter(0, ...) from mutations,
 * or directly from actions.
 */
export const notifyAdminsWaitlistEvent = internalAction({
  args: {
    event: v.union(
      v.literal("new_registration"),
      v.literal("invited"),
      v.literal("registered")
    ),
    entryEmail: v.string(),
    entryName: v.string(),
  },
  handler: async (_ctx, args) => {
    const superadminEmails = (process.env.SUPERADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)

    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)

    // Dedupe
    const allAdmins = [...new Set([...superadminEmails, ...adminEmails])]

    if (allAdmins.length === 0) {
      console.warn("[Waitlist Admin] No admin emails configured, skipping notification")
      return
    }

    const { sendWaitlistAdminNotification } = await import("./authEmails")
    await sendWaitlistAdminNotification(allAdmins, args.event, args.entryEmail, args.entryName)
  },
})
```

**Step 3: Verify no TypeScript errors**

Run: `npx tsc --noEmit --project convex/tsconfig.json 2>&1 | grep -E "waitlist|error"`
Expected: No errors

**Step 4: Commit**

```bash
git add convex/waitlist.ts
git commit -m "feat(waitlist): add notifyAdminsWaitlistEvent internalAction"
```

---

### Task 3: Trigger notification on new waitlist registration

**Files:**
- Modify: `convex/waitlist.ts` — `register` mutation (lines 15-57)

**Step 1: Add scheduler call after insert**

In `convex/waitlist.ts`, in the `register` mutation handler, after line 53 (`return entryId`), add scheduler call **before** the return:

```typescript
    // Insert new entry
    const entryId = await ctx.db.insert("waitlistEntries", {
      firstName,
      lastName,
      email,
      status: "pending",
      createdAt: Date.now(),
    })

    // Notify admins about new registration
    await ctx.scheduler.runAfter(0, internal.waitlist.notifyAdminsWaitlistEvent, {
      event: "new_registration" as const,
      entryEmail: email,
      entryName: `${firstName} ${lastName}`,
    })

    return entryId
```

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --project convex/tsconfig.json 2>&1 | grep -E "waitlist|error"`
Expected: No errors

**Step 3: Commit**

```bash
git add convex/waitlist.ts
git commit -m "feat(waitlist): notify admins on new registration"
```

---

### Task 4: Trigger notification on invite sent

**Files:**
- Modify: `convex/waitlist.ts` — `sendInviteEmail` action (lines 245-271)

**Step 1: Add notification call after invite email**

In `sendInviteEmail` handler, after `sendWaitlistInviteEmail` call (line 267), add:

```typescript
    // Send invite email via Resend
    const { sendWaitlistInviteEmail } = await import("./authEmails")
    await sendWaitlistInviteEmail(result.email, firstName, signupUrl)

    // Notify admins about invite sent
    const { sendWaitlistAdminNotification } = await import("./authEmails")
    const adminSuperadminEmails = [
      ...(process.env.SUPERADMIN_EMAILS ?? "").split(","),
      ...(process.env.ADMIN_EMAILS ?? "").split(","),
    ].map((e) => e.trim().toLowerCase()).filter(Boolean)
    const uniqueAdmins = [...new Set(adminSuperadminEmails)]
    await sendWaitlistAdminNotification(uniqueAdmins, "invited", result.email, `${result.firstName ?? ""} ${result.lastName ?? ""}`.trim() || "Unknown")

    return { email: result.email }
```

**WAIT — Design revision**: `sendInviteEmail` adalah public action. Lebih clean kalau kita tetap pake `notifyAdminsWaitlistEvent` internal action supaya admin email resolution tetap terpusat. Karena ini action context, kita bisa `ctx.runAction`:

```typescript
    // Send invite email via Resend
    const { sendWaitlistInviteEmail } = await import("./authEmails")
    await sendWaitlistInviteEmail(result.email, firstName, signupUrl)

    // Notify admins about invite sent
    await ctx.runAction(internal.waitlist.notifyAdminsWaitlistEvent, {
      event: "invited" as const,
      entryEmail: result.email,
      entryName: `${result.firstName ?? ""} ${result.lastName ?? ""}`.trim() || "Pengguna",
    })

    return { email: result.email }
```

**NOTE:** `ctx.runAction` is available in Convex action context to call other actions synchronously. Ini the cleaner approach — admin email resolution stays centralized.

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --project convex/tsconfig.json 2>&1 | grep -E "waitlist|error"`
Expected: No errors

**Step 3: Commit**

```bash
git add convex/waitlist.ts
git commit -m "feat(waitlist): notify admins on invite sent"
```

---

### Task 5: Trigger notification on waitlist user registration

**Files:**
- Modify: `convex/users.ts` (lines 265-280 `markWaitlistRegistered`, lines 290-358 `createAppUser`)

**Step 1: Change `markWaitlistRegistered` to return entry data**

Change the function signature and return type to return entry info when registration happened:

```typescript
/**
 * If email exists in waitlistEntries as "invited", mark as "registered".
 * Called during createAppUser to auto-detect waitlist signups.
 * Returns entry data if marked, null otherwise — used to trigger admin notification.
 */
async function markWaitlistRegistered(
  db: GenericDatabaseWriter<DataModel>,
  email: string
): Promise<{ firstName: string; lastName: string; email: string } | null> {
  const entry = await db
    .query("waitlistEntries")
    .withIndex("by_email", (q) => q.eq("email", email.toLowerCase().trim()))
    .unique()

  if (entry && entry.status === "invited") {
    await db.patch(entry._id, {
      status: "registered",
      registeredAt: Date.now(),
    })
    return { firstName: entry.firstName, lastName: entry.lastName, email: entry.email }
  }

  return null
}
```

**Step 2: Add import for `internal` in users.ts**

At top of `convex/users.ts`, add:

```typescript
import { internal } from "./_generated/api"
```

**Step 3: Trigger notification in `createAppUser` after `markWaitlistRegistered`**

In `createAppUser` handler, change the two call sites (lines 331 and 354):

Call site 1 (link candidate path, around line 330-332):
```typescript
    if (linkCandidate) {
      await ctx.db.patch(linkCandidate._id, {
        betterAuthUserId,
        lastLoginAt: Date.now(),
        updatedAt: Date.now(),
      })
      // Auto-detect waitlist registration
      const waitlistEntry = await markWaitlistRegistered(ctx.db, email)
      if (waitlistEntry) {
        await ctx.scheduler.runAfter(0, internal.waitlist.notifyAdminsWaitlistEvent, {
          event: "registered" as const,
          entryEmail: waitlistEntry.email,
          entryName: `${waitlistEntry.firstName} ${waitlistEntry.lastName}`,
        })
      }
      return linkCandidate._id
    }
```

Call site 2 (new user path, around line 353-354):
```typescript
    // Auto-detect waitlist registration
    const waitlistEntry = await markWaitlistRegistered(ctx.db, email)
    if (waitlistEntry) {
      await ctx.scheduler.runAfter(0, internal.waitlist.notifyAdminsWaitlistEvent, {
        event: "registered" as const,
        entryEmail: waitlistEntry.email,
        entryName: `${waitlistEntry.firstName} ${waitlistEntry.lastName}`,
      })
    }

    return newUserId
```

**Step 4: Verify no TypeScript errors**

Run: `npx tsc --noEmit --project convex/tsconfig.json 2>&1 | grep -E "users|error"`
Expected: No errors

**Step 5: Commit**

```bash
git add convex/users.ts
git commit -m "feat(waitlist): notify admins on waitlist user registration"
```

---

### Task 6: Manual integration test

**Step 1: Ensure Convex dev is running**

Run: `npm run convex:dev`

**Step 2: Verify ADMIN_EMAILS env var is set**

Check Convex dashboard environment variables — ensure `SUPERADMIN_EMAILS` and/or `ADMIN_EMAILS` contain at least one real email.

**Step 3: Test new_registration event**

Go to `/waitinglist`, register with a test email. Verify:
- Entry appears in admin dashboard
- Admin email received with subject `[Waitlist] Pendaftar Baru: ...`

**Step 4: Test invited event**

In admin dashboard, click "Undang" on the new entry. Verify:
- Entry status changes to "Diundang"
- Admin email received with subject `[Waitlist] Undangan Terkirim: ...`

**Step 5: Test registered event**

Open invite email, click sign-up link, create account. Verify:
- Entry status changes to "Terdaftar"
- Admin email received with subject `[Waitlist] Registrasi Selesai: ...`

**Step 6: Final commit**

```bash
git add -A
git commit -m "docs: add waitlist admin notifications implementation plan"
```
