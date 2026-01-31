# Task 1.3 Report: Create Hook for Onboarding Status

## Summary

Created `useOnboardingStatus` React hook at `src/lib/hooks/useOnboardingStatus.ts` that wraps the Convex query and mutation created in Task 1.2.

## Changes Made

### File: `src/lib/hooks/useOnboardingStatus.ts` (New)

```typescript
"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { useCallback } from "react"

/**
 * Hook untuk mengecek dan update status onboarding user.
 * Digunakan untuk pricing flow redesign.
 *
 * @returns {Object}
 * - isLoading: true saat query masih loading
 * - isAuthenticated: true jika user authenticated
 * - hasCompletedOnboarding: true jika user sudah complete onboarding
 * - completeOnboarding: function untuk mark onboarding as completed
 */
export function useOnboardingStatus() {
  const status = useQuery(api.users.getOnboardingStatus)
  const completeOnboardingMutation = useMutation(api.users.completeOnboarding)

  const completeOnboarding = useCallback(async () => {
    await completeOnboardingMutation()
  }, [completeOnboardingMutation])

  return {
    isLoading: status === undefined,
    isAuthenticated: status?.isAuthenticated ?? false,
    hasCompletedOnboarding: status?.hasCompleted ?? false,
    completeOnboarding,
  }
}
```

## Design Decisions

### 1. Loading State Pattern

Using `status === undefined` to detect loading state, consistent with the existing `useCurrentUser` hook pattern in the codebase. Convex's `useQuery` returns:
- `undefined` when loading
- `null` when data not found (but in our case, the query always returns an object)
- The actual data when loaded

### 2. Default Values

All boolean values default to `false` when `status` is undefined or null:
- `isAuthenticated: status?.isAuthenticated ?? false`
- `hasCompletedOnboarding: status?.hasCompleted ?? false`

This ensures the hook always returns valid boolean values even during loading.

### 3. Memoized Mutation

`completeOnboarding` is wrapped in `useCallback` to prevent unnecessary re-renders when the function is passed as a prop to child components.

## Verification Results

| Check | Result |
|-------|--------|
| TypeScript type check (`npx tsc --noEmit`) | Passed |
| ESLint (`npm run lint`) | Passed |

## API Reference

### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `isLoading` | `boolean` | `true` while Convex query is loading |
| `isAuthenticated` | `boolean` | `true` if user is authenticated |
| `hasCompletedOnboarding` | `boolean` | `true` if user completed onboarding |
| `completeOnboarding` | `() => Promise<void>` | Function to mark onboarding complete |

## Usage Examples

### Check onboarding status and redirect

```typescript
// In a page component
const { isLoading, hasCompletedOnboarding } = useOnboardingStatus()

if (isLoading) return <Loading />

if (!hasCompletedOnboarding) {
  router.push('/get-started')
}
```

### Complete onboarding and navigate

```typescript
// In get-started page
const { completeOnboarding } = useOnboardingStatus()

const handleSkip = async () => {
  await completeOnboarding()
  router.push('/chat')
}
```

### Conditional CTA based on onboarding status

```typescript
// In Hero component
const { isAuthenticated, hasCompletedOnboarding } = useOnboardingStatus()

const getHref = () => {
  if (!isAuthenticated) return '/sign-up'
  if (hasCompletedOnboarding) return '/chat'
  return '/get-started'
}
```

## Dependencies

### Requires
- Task 1.1: `hasCompletedOnboarding` field in schema
- Task 1.2: `getOnboardingStatus` query and `completeOnboarding` mutation

### Enables
- Task 3.1: Welcome page `/get-started` flow
- Task 5.3: Hero CTA first-time detection
- OnboardingHeader close button logic (Task 2.2)

## Phase 1 Complete

With this task, Phase 1 (Database & Schema Changes) is complete:
- [x] Task 1.1: Schema field added
- [x] Task 1.2: Convex query/mutation added
- [x] Task 1.3: React hook created
