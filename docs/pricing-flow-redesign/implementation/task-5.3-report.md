# Task 5.3 Report: Update Hero CTA to handle first-time detection

## Summary

Created a smart Hero CTA component that determines the appropriate destination based on user authentication status and onboarding completion state.

## Changes Made

### File 1: `src/components/marketing/HeroCTA.tsx` (NEW)

Client component that uses auth and onboarding hooks:

```typescript
"use client"

import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { Rocket } from "lucide-react"
import { useOnboardingStatus } from "@/lib/hooks/useOnboardingStatus"

export function HeroCTA() {
  const { isSignedIn, isLoaded: isUserLoaded } = useUser()
  const { hasCompletedOnboarding, isLoading: isOnboardingLoading } = useOnboardingStatus()

  const getHref = (): string => {
    if (!isSignedIn) {
      return "/sign-up"
    }
    if (hasCompletedOnboarding) {
      return "/chat"
    }
    return "/get-started"
  }

  const isLoading = !isUserLoaded || (isSignedIn && isOnboardingLoading)

  return (
    <Link
      href={getHref()}
      className="btn-brand text-base px-6 py-3 inline-flex items-center gap-2"
      aria-busy={isLoading}
    >
      <Rocket className="w-5 h-5" />
      <span>Ayo Mulai!</span>
    </Link>
  )
}
```

### File 2: `src/app/(marketing)/page.tsx` (MODIFIED)

Updated imports and hero-actions section:

```diff
- import { UserPlus, FileText } from "lucide-react"
+ import { FileText } from "lucide-react"
+ import { HeroCTA } from "@/components/marketing/HeroCTA"

  {/* CTA Buttons */}
  <div className="hero-actions">
-   <Link
-     href="/waiting-list"
-     className="btn-brand text-base px-6 py-3 inline-flex items-center gap-2"
-   >
-     <UserPlus className="w-5 h-5" />
-     <span>Daftarkan email untuk uji coba</span>
-   </Link>
+   <HeroCTA />
    <Link
      href="/documentation"
      className="btn-outline text-base px-6 py-3 inline-flex items-center gap-2"
    >
```

## CTA Destination Logic

| Auth State | Onboarding State | Destination |
|------------|------------------|-------------|
| Not signed in | N/A | `/sign-up` |
| Signed in | Not completed | `/get-started` |
| Signed in | Completed | `/chat` |

## User Flow Examples

### New Visitor (Not Signed In)
```
[Homepage]
    │
    └── Clicks "Ayo Mulai!"
        └── /sign-up
            └── [After signup] → /get-started or redirect destination
```

### First-Time User (Signed In, Not Completed)
```
[Homepage]
    │
    └── Clicks "Ayo Mulai!"
        └── /get-started
            └── [User chooses tier or skips]
                └── /chat
```

### Returning User (Signed In, Completed)
```
[Homepage]
    │
    └── Clicks "Ayo Mulai!"
        └── /chat (direct to app)
```

## Design Decisions

### 1. Separate Component

Created `HeroCTA.tsx` instead of inline code because:
- Homepage is a server component for SEO
- CTA needs client-side hooks (`useUser`, `useOnboardingStatus`)
- Clean separation of concerns

### 2. Icon Change

Changed from `UserPlus` to `Rocket`:
- `UserPlus` implied "sign up" which isn't always the action
- `Rocket` is more action-oriented and fits "Ayo Mulai!" (Let's Start!)

### 3. Loading State

Added `aria-busy` attribute for accessibility:
```typescript
const isLoading = !isUserLoaded || (isSignedIn && isOnboardingLoading)
```

This handles:
- Auth state loading from Clerk
- Onboarding status loading from Convex (only if signed in)

### 4. Secondary CTA Unchanged

Kept "Lihat Dokumentasi" link as-is:
- Documentation is always publicly accessible
- No auth logic needed

## Verification Results

| Check | Result |
|-------|--------|
| TypeScript type check (`npx tsc --noEmit`) | Passed |
| ESLint (`npm run lint`) | Passed |

## Phase 5 Complete

All redirect logic and integration tasks are done:
- Task 5.1: Redirect parameter handling ✓
- Task 5.2: Onboarding flag on checkout ✓
- Task 5.3: Hero CTA first-time detection ✓

## Next Steps

Phase 5 complete. Remaining:
- **Phase 6**: Testing & Cleanup (Task 6.1, 6.2, 6.3)
