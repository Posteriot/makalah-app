# Clerk Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove all Clerk artifacts from codebase after BetterAuth migration.

**Architecture:** Single atomic sweep — edit all files, deploy Convex schema, commit once.

**Tech Stack:** Convex schema, Node.js (npm), env files

---

### Task 1: Remove legacy Clerk fields from Convex schema

**Files:**
- Modify: `convex/schema.ts:53-56`

**Step 1: Remove 3 Clerk fields and their comment**

In `convex/schema.ts`, delete lines 53-56:

```diff
     betterAuthUserId: v.optional(v.string()),
-    // Legacy Clerk fields (kept optional for existing data compatibility)
-    clerkUserId: v.optional(v.string()),
-    clerkSyncStatus: v.optional(v.string()),
-    clerkDeletedAt: v.optional(v.number()),
     email: v.string(),
```

---

### Task 2: Remove clerkDeletedAt filter from users.ts

**Files:**
- Modify: `convex/users.ts:297-299`

**Step 1: Simplify account linking filter**

In `convex/users.ts`, update the filter to remove `clerkDeletedAt` check:

```diff
-    // Pick the best match: prefer active (no clerkDeletedAt), most recent login
+    // Pick the best match: prefer unlinked user, most recent login
     const linkCandidate = existingByEmail
-      .filter((u) => !u.betterAuthUserId && !u.clerkDeletedAt)
+      .filter((u) => !u.betterAuthUserId)
       .sort((a, b) => (b.lastLoginAt ?? 0) - (a.lastLoginAt ?? 0))[0]
```

---

### Task 3: Remove @clerk/localizations from package.json

**Files:**
- Modify: `package.json:25`

**Step 1: Remove the dependency**

Delete line 25 from `package.json`:

```diff
-    "@clerk/localizations": "^3.35.2",
```

**Step 2: Update lockfile**

Run: `npm install`
Expected: `@clerk/localizations` removed from `node_modules` and `package-lock.json` updated.

---

### Task 4: Delete migration script

**Files:**
- Delete: `scripts/reconcile-clerk-users.mjs`

**Step 1: Remove file**

```bash
rm scripts/reconcile-clerk-users.mjs
```

Check if `scripts/` directory is now empty. If so, remove it too.

---

### Task 5: Clean environment files

**Files:**
- Modify: `.env.local` (lines 4, 5, 10, 14, 15, 17-22)
- Delete: `.env.local.bak`
- Modify: `.env.example` (lines 9-13)

**Step 1: Remove Clerk vars from `.env.local`**

Delete these lines:
- Line 4: `BACKEND_API_URL=https://api.clerk.com`
- Line 5: `CLERK_SECRET_KEY=sk_test_...`
- Line 10: `FRONTEND_API_URL=https://artistic-hawk-97.clerk.accounts.dev`
- Line 14: `JWKS_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----"`
- Line 15: `JWKS_URL=https://artistic-hawk-97.clerk.accounts.dev/.well-known/jwks.json`
- Line 17: `NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL=/`
- Line 18: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...`
- Line 19: `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/chat`
- Line 20: `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- Line 21: `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/get-started`
- Line 22: `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`

**Step 2: Delete `.env.local.bak`**

```bash
rm .env.local.bak
```

**Step 3: Remove Clerk section from `.env.example`**

Delete lines 9-13:

```diff
-# Clerk (Auth) — commented out, kept for rollback reference
-# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""
-# CLERK_SECRET_KEY=""
-# CLERK_WEBHOOK_SECRET=""
-# NEXT_PUBLIC_CLERK_SOCIAL_PROVIDERS="google"
-
```

---

### Task 6: Deploy Convex and verify

**Step 1: Deploy Convex schema**

Run: `npx convex deploy --yes`
Expected: Schema deployed without Clerk fields. No errors.

**Step 2: Verify no Clerk references remain in code**

Run: `grep -ri "clerk" src/ convex/ scripts/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.mjs"`
Expected: No output (zero matches).

Run: `grep -ri "clerk" .env.local .env.example`
Expected: No output.

---

### Task 7: Commit, push, PR, merge

**Step 1: Stage and commit**

```bash
git add -A
git commit -m "chore: remove all Clerk artifacts from codebase"
```

**Step 2: Push and create PR**

```bash
git push origin main
```

Or create branch + PR if preferred.
