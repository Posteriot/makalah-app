# Task 5.2 Report: Set onboarding flag on signup with redirect intent

## Summary

Implemented auto-complete onboarding behavior for checkout pages. When a user lands on any checkout page (BPP or PRO), the `hasCompletedOnboarding` flag is automatically set to `true`.

## Design Decision: Client-Side vs Webhook

### Why Client-Side?

The plan suggested modifying Clerk webhook, but this approach has a limitation:
- **Webhook doesn't receive redirect URL info** - Clerk's `user.created` webhook payload doesn't include the redirect URL the user was sent to
- **No way to know intent** - From webhook, we can't determine if user intended to go to checkout

### Chosen Approach: Client-Side on Checkout Pages

Benefits:
1. **Reliable** - Checkout page knows for certain that user is on checkout
2. **Simple** - Just call `completeOnboarding()` on mount
3. **Idempotent** - Safe to call even if already completed

## Changes Made

### File 1: `src/app/(onboarding)/checkout/bpp/page.tsx`

```typescript
import { useEffect, useRef } from "react"
import { useOnboardingStatus } from "@/lib/hooks/useOnboardingStatus"

export default function CheckoutBPPPage() {
  const { hasCompletedOnboarding, completeOnboarding } = useOnboardingStatus()
  const onboardingCompletedRef = useRef(false)

  // Auto-complete onboarding when user lands on checkout page
  useEffect(() => {
    if (!hasCompletedOnboarding && !onboardingCompletedRef.current) {
      onboardingCompletedRef.current = true
      completeOnboarding()
    }
  }, [hasCompletedOnboarding, completeOnboarding])

  // ... rest of component
}
```

### File 2: `src/app/(onboarding)/checkout/pro/page.tsx`

Same pattern applied:

```typescript
import { useEffect, useRef } from "react"
import { useOnboardingStatus } from "@/lib/hooks/useOnboardingStatus"

export default function CheckoutPROPage() {
  const { hasCompletedOnboarding, completeOnboarding } = useOnboardingStatus()
  const onboardingCompletedRef = useRef(false)

  useEffect(() => {
    if (!hasCompletedOnboarding && !onboardingCompletedRef.current) {
      onboardingCompletedRef.current = true
      completeOnboarding()
    }
  }, [hasCompletedOnboarding, completeOnboarding])

  // ... rest of component
}
```

## Why useRef?

React 18's Strict Mode double-invokes effects in development. Using `useRef` prevents:
1. Multiple mutation calls
2. Race conditions
3. Unnecessary database writes

```typescript
const onboardingCompletedRef = useRef(false)

if (!hasCompletedOnboarding && !onboardingCompletedRef.current) {
  onboardingCompletedRef.current = true  // Mark as called
  completeOnboarding()
}
```

## User Flow

### Scenario: New user from pricing page

```
[User on /pricing (not signed in)]
    │
    ├── Clicks "Beli Kredit"
    │   └── /sign-up?redirect=/checkout/bpp
    │
    ├── [Signs up]
    │   └── Clerk redirects to /checkout/bpp
    │
    ├── [CheckoutBPPPage mounts]
    │   ├── hasCompletedOnboarding = false
    │   └── completeOnboarding() called → sets to true
    │
    └── [Next visit to app]
        └── Hero CTA goes directly to /chat (skips /get-started)
```

### Scenario: Returning user via direct link

```
[User directly visits /checkout/bpp]
    │
    ├── [CheckoutBPPPage mounts]
    │   ├── hasCompletedOnboarding already true
    │   └── Effect skipped (no action)
    │
    └── [Checkout proceeds normally]
```

## Verification Results

| Check | Result |
|-------|--------|
| TypeScript type check (`npx tsc --noEmit`) | Passed |
| ESLint (`npm run lint`) | Passed |

## Edge Cases Handled

1. **Already completed**: Effect checks `hasCompletedOnboarding` before calling mutation
2. **Strict mode**: `useRef` prevents double-call
3. **Race condition**: Ref set immediately before async call
4. **Auth state loading**: Effect only runs when status is loaded

## Integration Points

This works with:
- **Task 5.1**: Redirect URL handling in sign-up
- **Task 5.3**: Hero CTA uses `hasCompletedOnboarding` to decide destination

## Next Steps

- **Task 5.3**: Update Hero CTA to handle first-time detection
