# Task 1.2 Report: Create Convex Mutation and Query for Onboarding

## Summary

Added `getOnboardingStatus` query and `completeOnboarding` mutation to `convex/users.ts` for managing user onboarding completion status.

## Changes Made

### File: `convex/users.ts`

**Location:** After line 291 (before `updateProfile` mutation)

**Added:**

```typescript
// ════════════════════════════════════════════════════════════════
// Onboarding Status (untuk pricing flow redesign)
// ════════════════════════════════════════════════════════════════

// ONBOARDING-001: Get onboarding status for current user
export const getOnboardingStatus = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return { hasCompleted: false, isAuthenticated: false }
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique()

    if (!user) {
      return { hasCompleted: false, isAuthenticated: true }
    }

    return {
      hasCompleted: user.hasCompletedOnboarding ?? false,
      isAuthenticated: true,
    }
  },
})

// ONBOARDING-002: Mark onboarding as completed for current user
export const completeOnboarding = mutationGeneric({
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
      hasCompletedOnboarding: true,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})
```

## Design Decisions

### 1. Pattern: `mutationGeneric`/`queryGeneric` instead of `mutation`/`query`

The existing codebase uses the `Generic` variants for all Convex functions. Following this pattern ensures consistency and proper typing across the codebase.

### 2. No Args Required

Both functions use JWT identity from `ctx.auth.getUserIdentity()` instead of requiring user ID as an argument. This:
- Simplifies client-side calls
- Prevents users from querying/modifying other users' onboarding status
- Follows the existing pattern in the codebase

### 3. Return Value Shape for Query

```typescript
{ hasCompleted: boolean, isAuthenticated: boolean }
```

This allows clients to distinguish between:
- Not authenticated (`isAuthenticated: false`)
- Authenticated but user not found (`isAuthenticated: true, hasCompleted: false`)
- Normal case (`isAuthenticated: true, hasCompleted: true/false`)

## Verification Results

| Check | Result |
|-------|--------|
| Convex sync (`npm run convex:dev -- --once`) | Passed |
| TypeScript type check (`npx tsc --noEmit`) | Passed |
| ESLint (`npm run lint`) | Passed |

## Usage Pattern

### Client-side (React Hook - will be created in Task 1.3)

```typescript
// Query onboarding status
const status = useQuery(api.users.getOnboardingStatus)
const hasCompleted = status?.hasCompleted ?? false

// Complete onboarding
const completeOnboarding = useMutation(api.users.completeOnboarding)
await completeOnboarding()
```

## API Reference

### `api.users.getOnboardingStatus`

| Property | Type | Description |
|----------|------|-------------|
| (no args) | - | Uses JWT identity |
| Returns | `{ hasCompleted: boolean, isAuthenticated: boolean }` | Onboarding status |

### `api.users.completeOnboarding`

| Property | Type | Description |
|----------|------|-------------|
| (no args) | - | Uses JWT identity |
| Returns | `{ success: true }` | Confirmation |
| Throws | `Error("Unauthorized")` | If not authenticated |
| Throws | `Error("User not found")` | If user doesn't exist |

## Next Dependencies

This enables:
- **Task 1.3**: React hook `useOnboardingStatus()` that wraps these Convex functions
- **Task 3.1**: Welcome page `/get-started` to call `completeOnboarding()`
- **Task 5.3**: Hero CTA to read `hasCompletedOnboarding` status
