# Tier-Aware Promote/Demote Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace binary promote/demote (user↔admin) with tier-aware promote/demote that supports free↔bpp↔pro↔admin transitions.

**Architecture:** Refactor the backend `demoteToUser` mutation to accept a target tier. Refactor the frontend `UserList.tsx` to render tier-aware promote/demote buttons and a unified dialog showing available tier options based on the user's current position in the hierarchy.

**Tech Stack:** Convex mutations (TypeScript), React (Next.js), shadcn AlertDialog

---

### Task 1: Refactor `demoteToUser` → `demoteFromAdmin` backend mutation

**Files:**
- Modify: `convex/adminUserManagement.ts:69-123`

**Step 1: Rename and add `targetTier` arg**

Replace the `demoteToUser` mutation (lines 69-123) with `demoteFromAdmin`:

```typescript
/**
 * Demote admin to user role with specified subscription tier
 * Requires superadmin permission
 */
export const demoteFromAdmin = mutation({
  args: {
    targetUserId: v.id("users"),
    targetTier: v.union(v.literal("free"), v.literal("bpp"), v.literal("pro")),
  },
  handler: async (ctx, args) => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Tidak terautentikasi")
    }

    // Get requestor user from Convex
    const requestor = await ctx.db
      .query("users")
      .withIndex("by_betterAuthUserId", (q) =>
        q.eq("betterAuthUserId", identity.subject)
      )
      .unique()

    if (!requestor) {
      throw new Error("User tidak ditemukan")
    }

    // Check superadmin permission
    await requireRole(ctx.db, requestor._id, "superadmin")

    // Get target user
    const targetUser = await ctx.db.get(args.targetUserId)
    if (!targetUser) {
      throw new Error("User target tidak ditemukan")
    }

    // Cannot demote superadmin
    if (targetUser.role === "superadmin") {
      throw new Error("Tidak bisa mengubah role superadmin")
    }

    // Can only demote admin
    if (targetUser.role !== "admin") {
      throw new Error("User bukan admin, gunakan updateSubscriptionTier")
    }

    const tierLabels: Record<string, string> = { free: "Gratis", bpp: "BPP", pro: "Pro" }

    // Update to user with specified tier
    await ctx.db.patch(args.targetUserId, {
      role: "user",
      subscriptionStatus: args.targetTier,
      updatedAt: Date.now(),
    })

    return {
      success: true,
      message: `${targetUser.email} berhasil diturunkan menjadi user (${tierLabels[args.targetTier]})`,
    }
  },
})
```

**Step 2: Verify Convex compiles**

Run: `npx convex dev` (check no type errors in terminal)
Expected: No errors, function registered as `adminUserManagement.demoteFromAdmin`

**Step 3: Commit**

```bash
git add convex/adminUserManagement.ts
git commit -m "refactor: rename demoteToUser → demoteFromAdmin with targetTier arg"
```

---

### Task 2: Refactor `UserList.tsx` — tier-aware promote/demote logic

**Files:**
- Modify: `src/components/admin/UserList.tsx`

This task covers the state, types, handlers, and action logic. UI rendering is Task 3.

**Step 1: Update types and constants**

At the top of the file, update the types and add tier hierarchy constants:

Replace line 40-41:
```typescript
type SubscriptionTier = "free" | "bpp" | "pro"
type DialogAction = "promote" | "demote" | "delete" | "changeTier"
```
With:
```typescript
type SubscriptionTier = "free" | "bpp" | "pro"
type TierOrAdmin = SubscriptionTier | "admin"
type DialogAction = "promote" | "demote" | "delete"
```

Also update `pendingTier` state (currently line 93):
```typescript
// Before:
const [pendingTier, setPendingTier] = useState<SubscriptionTier | null>(null)
// After:
const [pendingTier, setPendingTier] = useState<TierOrAdmin | null>(null)
```

Add after `TIER_OPTIONS` (after line 47):
```typescript
const TIER_HIERARCHY: readonly string[] = ["free", "bpp", "pro", "unlimited"]

const ADMIN_OPTION = { value: "admin" as const, label: "ADMIN", color: "bg-rose-600 text-white" }

function getPromoteOptions(subscriptionStatus: string, role: string, currentUserRole: string): Array<{ value: string; label: string; color: string }> {
  if (role === "admin" || role === "superadmin") return []
  const currentIndex = TIER_HIERARCHY.indexOf(subscriptionStatus === "unlimited" ? "unlimited" : subscriptionStatus)
  const tierOptions = TIER_OPTIONS.filter((_, i) => i > currentIndex)
  // Only superadmin can promote to admin
  if (currentUserRole === "superadmin") {
    return [...tierOptions, ADMIN_OPTION]
  }
  return tierOptions
}

function getDemoteOptions(subscriptionStatus: string, role: string, currentUserRole: string): Array<{ value: string; label: string; color: string }> {
  if (role === "superadmin") return []
  if (role === "admin") {
    // Only superadmin can demote admin
    if (currentUserRole !== "superadmin") return []
    return [...TIER_OPTIONS].reverse()
  }
  const currentIndex = TIER_HIERARCHY.indexOf(subscriptionStatus)
  return TIER_OPTIONS.filter((_, i) => i < currentIndex).reverse()
}
```

**Step 2: Update mutation import and handlers**

Replace line 96-97:
```typescript
const demoteToUser = useMutation(api.adminUserManagement.demoteToUser)
const updateTier = useMutation(api.adminUserManagement.updateSubscriptionTier)
```
With:
```typescript
const demoteFromAdmin = useMutation(api.adminUserManagement.demoteFromAdmin)
const updateTier = useMutation(api.adminUserManagement.updateSubscriptionTier)
```

Replace `handleTierClick` (lines 114-120) and add new handler. Remove `handleTierClick` entirely. Replace `handlePromoteClick` and `handleDemoteClick` (lines 99-107):
```typescript
const handlePromoteClick = (user: User) => {
  setSelectedUser(user)
  setPendingTier(null)
  setDialogAction("promote")
}

const handleDemoteClick = (user: User) => {
  setSelectedUser(user)
  setPendingTier(null)
  setDialogAction("demote")
}
```

**Step 3: Update `handleConfirm`**

Replace `handleConfirm` (lines 140-175) with:
```typescript
const handleConfirm = async () => {
  if (!selectedUser || !dialogAction) return
  if (dialogAction !== "delete" && !pendingTier) return

  setIsLoading(true)
  try {
    if (dialogAction === "delete") {
      const message = await deleteUserFromAdmin(selectedUser)
      toast.success(message)
    } else if (pendingTier === "admin") {
      // Promote to admin (role change)
      const result = await promoteToAdmin({ targetUserId: selectedUser._id })
      toast.success(result.message)
    } else if (selectedUser.role === "admin") {
      // Demote from admin to specific tier
      const result = await demoteFromAdmin({
        targetUserId: selectedUser._id,
        targetTier: pendingTier as "free" | "bpp" | "pro",
      })
      toast.success(result.message)
    } else {
      // Tier change for regular user
      const result = await updateTier({
        targetUserId: selectedUser._id,
        newTier: pendingTier as "free" | "bpp" | "pro",
      })
      toast.success(result.message)
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Terjadi kesalahan"
    toast.error(errorMessage)
  } finally {
    setIsLoading(false)
    setSelectedUser(null)
    setDialogAction(null)
    setPendingTier(null)
  }
}
```

Note: The guard uses two lines — first checks `selectedUser`/`dialogAction`, then skips `pendingTier` check for delete actions.

**Step 4: Update `getAvailableActions` and `getPrimaryAction`**

Replace `getAvailableActions` (lines 212-224):
```typescript
const getAvailableActions = (user: User): DialogAction[] => {
  const actions: DialogAction[] = []
  const promoteOpts = getPromoteOptions(user.subscriptionStatus, user.role, currentUserRole)
  const demoteOpts = getDemoteOptions(user.subscriptionStatus, user.role, currentUserRole)
  if (promoteOpts.length > 0) actions.push("promote")
  if (demoteOpts.length > 0) actions.push("demote")
  // Delete permissions unchanged
  if (currentUserRole === "superadmin" && user.role !== "superadmin") {
    actions.push("delete")
  } else if (currentUserRole === "admin" && user.role === "user") {
    actions.push("delete")
  }
  return actions
}
```

Remove `getPrimaryAction` (lines 229-234) — no longer needed, both promote and demote can coexist.

**Step 5: Commit**

```bash
git add src/components/admin/UserList.tsx
git commit -m "refactor: tier-aware promote/demote logic in UserList"
```

---

### Task 3: Refactor `UserList.tsx` — UI rendering

**Files:**
- Modify: `src/components/admin/UserList.tsx`

**Step 1: Replace `renderPrimaryActionCell` with tier-aware buttons**

Replace `renderPrimaryActionCell` (lines 238-267) with:
```typescript
const renderPromoteDemoteCell = (user: User) => {
  const promoteOpts = getPromoteOptions(user.subscriptionStatus, user.role, currentUserRole)
  const demoteOpts = getDemoteOptions(user.subscriptionStatus, user.role, currentUserRole)

  if (promoteOpts.length === 0 && demoteOpts.length === 0) {
    return <span className="text-narrative text-muted-foreground">-</span>
  }

  return (
    <div className="flex items-center gap-1.5">
      {promoteOpts.length > 0 && (
        <button
          className="focus-ring inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-action border-main border border-border px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-slate-200 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => handlePromoteClick(user)}
          disabled={isLoading}
        >
          <ArrowUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Promote</span>
        </button>
      )}
      {demoteOpts.length > 0 && (
        <button
          className="focus-ring inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-action border-main border border-border px-2 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => handleDemoteClick(user)}
          disabled={isLoading}
        >
          <ArrowDown className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span>Demote</span>
        </button>
      )}
    </div>
  )
}
```

Also replace `renderMobilePrimaryActionIconCell` (lines 286-317) with:
```typescript
const renderMobilePromoteDemoteCell = (user: User) => {
  const promoteOpts = getPromoteOptions(user.subscriptionStatus, user.role, currentUserRole)
  const demoteOpts = getDemoteOptions(user.subscriptionStatus, user.role, currentUserRole)

  if (promoteOpts.length === 0 && demoteOpts.length === 0) {
    return <span className="text-muted-foreground">-</span>
  }

  return (
    <div className="flex items-center gap-1">
      {promoteOpts.length > 0 && (
        <button
          type="button"
          aria-label="Promote user"
          onClick={() => handlePromoteClick(user)}
          disabled={isLoading}
          className="focus-ring inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-action border-main border border-border text-emerald-600 transition-colors hover:bg-slate-200 dark:text-emerald-400 dark:hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}
      {demoteOpts.length > 0 && (
        <button
          type="button"
          aria-label="Demote user"
          onClick={() => handleDemoteClick(user)}
          disabled={isLoading}
          className="focus-ring inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-action border-main border border-border text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
```

**Step 2: Make subscription badge static (remove clickable behavior)**

Replace subscription column rendering in `renderDynamicCell` (lines 351-377) with:
```typescript
if (columnKey === "subscription") {
  const tierOption = TIER_OPTIONS.find((t) => t.value === user.subscriptionStatus)
  return (
    <span className={cn(
      "inline-flex items-center rounded-badge px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase",
      tierOption?.color ?? "bg-slate-700 text-slate-100"
    )}>
      {tierOption?.label ?? user.subscriptionStatus}
    </span>
  )
}
```

Remove `EditPencil` from the import (line 19) if no longer used elsewhere.

**Step 3: Update `renderDynamicCell` to use new render functions**

Replace lines 391-397:
```typescript
if (columnKey === "promoteAction") {
  return renderPrimaryActionCell(user)
}
```
With:
```typescript
if (columnKey === "promoteAction") {
  return renderPromoteDemoteCell(user)
}
```

And update the mobile ternary (lines 568-584) to use `renderMobilePromoteDemoteCell` instead of `renderMobilePrimaryActionIconCell`.

**Step 4: Update the dialog to show tier options for promote/demote**

Replace the AlertDialog content (lines 613-696). The dialog title and body should be:
```typescript
<AlertDialogTitle>
  {dialogAction === "promote"
    ? "Promote User"
    : dialogAction === "demote"
      ? "Demote User"
      : "Hapus User"}
</AlertDialogTitle>
<AlertDialogDescription asChild>
  {dialogAction === "promote" || dialogAction === "demote" ? (
    <div className="space-y-3">
      <p>
        Pilih tier baru untuk <span className="font-medium text-foreground">{selectedUser?.email}</span>:
      </p>
      {/* Current tier indicator */}
      {(() => {
        const currentTierOption = selectedUser?.role === "admin"
          ? { label: "ADMIN (UNLIMITED)", color: "bg-rose-600 text-white" }
          : TIER_OPTIONS.find((t) => t.value === selectedUser?.subscriptionStatus)
        return currentTierOption ? (
          <div className="rounded-action border-2 border-border px-3 py-2 text-center opacity-50">
            <span className={cn(
              "inline-flex items-center rounded-badge px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
              currentTierOption.color
            )}>
              {currentTierOption.label}
            </span>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">Saat ini</p>
          </div>
        ) : null
      })()}
      <div className="flex flex-wrap gap-2">
        {(dialogAction === "promote"
          ? getPromoteOptions(selectedUser?.subscriptionStatus ?? "free", selectedUser?.role ?? "user", currentUserRole)
          : getDemoteOptions(selectedUser?.subscriptionStatus ?? "free", selectedUser?.role ?? "user", currentUserRole)
        ).map((option) => {
          const isSelected = pendingTier === option.value
          const isAdminOption = option.value === "admin"
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setPendingTier(option.value)}
              className={cn(
                "flex-1 min-w-[80px] rounded-action border-2 px-3 py-2 text-center transition-all",
                isSelected
                  ? isAdminOption
                    ? "border-rose-500 bg-rose-500/10"
                    : "border-primary bg-primary/10"
                  : isAdminOption
                    ? "border-rose-500/30 hover:border-rose-500"
                    : "border-border hover:border-muted-foreground"
              )}
            >
              <span className={cn(
                "inline-flex items-center rounded-badge px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase",
                option.color
              )}>
                {option.label}
              </span>
            </button>
          )
        })}
      </div>
      {pendingTier === "admin" && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          User akan mendapatkan akses admin panel.
        </p>
      )}
      {dialogAction === "demote" && selectedUser?.role === "admin" && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          User akan kehilangan akses admin panel.
        </p>
      )}
    </div>
  ) : (
    <p>
      Apakah Anda yakin ingin menghapus {selectedUser?.email}? User akan dihapus dan tidak bisa login lagi.
    </p>
  )}
</AlertDialogDescription>
```

Update the confirm button disabled state:
```typescript
disabled={isLoading || (dialogAction !== "delete" && !pendingTier)}
```

Update confirm button label:
```typescript
{isLoading
  ? "Memproses..."
  : dialogAction === "delete"
    ? "Hapus"
    : "Konfirmasi"}
```

**Step 5: Remove unused code**

- Remove `handleTierClick` function
- Remove `EditPencil` from iconoir-react import if unused
- Remove `"changeTier"` from `DialogAction` type (already done in Task 2 Step 1)

**Step 6: Verify dev server compiles**

Run: `npm run dev` or check terminal for compilation errors
Expected: No TypeScript errors, page renders correctly

**Step 7: Commit**

```bash
git add src/components/admin/UserList.tsx
git commit -m "feat: tier-aware promote/demote UI with unified dialog"
```

---

### Task 4: Update documentation references

**Files:**
- Modify: `.references/tools-apis-list/documentation.md` (line ~592)
- Modify: `.references/tools-apis-list/README.md` (line ~276)

**Step 1: Update mutation name in docs**

In both files, replace `demoteToUser` with `demoteFromAdmin` and update the description to mention `targetUserId, targetTier`.

**Step 2: Commit**

```bash
git add .references/tools-apis-list/documentation.md .references/tools-apis-list/README.md
git commit -m "docs: update demoteFromAdmin mutation reference"
```

---

### Task 5: Manual verification

**Step 1: Test as superadmin**

Open admin panel → User Management. Verify:
- GRATIS user: shows Promote button only → click → dialog with BPP, PRO, ADMIN options
- BPP user: shows Promote + Demote → Promote dialog: PRO, ADMIN. Demote dialog: GRATIS
- PRO user: shows Promote + Demote → Promote dialog: ADMIN. Demote dialog: BPP, GRATIS
- Admin: shows Demote button only → dialog with PRO, BPP, GRATIS options
- Superadmin row: "Cannot modify"
- Subscription badge is static (not clickable)

**Step 2: Test promote flow**

- Promote GRATIS user → BPP: verify subscriptionStatus changes, role stays "user"
- Promote BPP user → PRO: verify subscriptionStatus changes, role stays "user"
- Promote PRO user → ADMIN: verify role changes to "admin", subscriptionStatus to "unlimited"

**Step 3: Test demote flow**

- Demote admin → PRO: verify role changes to "user", subscriptionStatus to "pro"
- Demote PRO → GRATIS: verify subscriptionStatus changes, role stays "user"

**Step 4: Test fullscreen view**

- Open fullscreen modal, verify same buttons and behavior work there

**Step 5: Test permission boundaries**

- Login as admin (not superadmin): verify "ADMIN" option does NOT appear in promote dialog, verify admin rows do NOT show demote button

**Step 6: Final commit**

```bash
git commit -m "chore: verified tier-aware promote/demote working end-to-end"
```
