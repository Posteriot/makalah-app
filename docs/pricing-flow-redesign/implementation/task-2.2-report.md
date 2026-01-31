# Task 2.2 Report: Create OnboardingLayout with Minimal Header

## Summary

Created `OnboardingHeader` component and updated the onboarding layout with auth protection and centered content container.

## Changes Made

### File 1: `src/components/onboarding/OnboardingHeader.tsx` (New)

```typescript
"use client"

import Link from "next/link"
import Image from "next/image"
import { X } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useOnboardingStatus } from "@/lib/hooks/useOnboardingStatus"

export function OnboardingHeader() {
  // Logo (left) + Close button (right)
  // Close from /get-started calls completeOnboarding() before redirect
  // Close from /checkout/* redirects to /pricing
}
```

### File 2: `src/app/(onboarding)/layout.tsx` (Updated)

```typescript
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader"

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  // Protected route - redirect to sign-in if not authenticated
  if (!userId) {
    redirect("/sign-in")
  }

  return (
    <div className="min-h-screen bg-background">
      <OnboardingHeader />
      <main className="pt-16">
        <div className="max-w-[600px] mx-auto px-6 py-12">
          {children}
        </div>
      </main>
    </div>
  )
}
```

## Design Decisions

### 1. Server-side Auth Check

Using `auth()` from `@clerk/nextjs/server` in the server component layout:
- More secure than client-side checks
- Redirect happens before any client-side rendering
- Follows existing pattern in `(dashboard)` layout

### 2. Minimal Header Design

Following wireframes.md Section 3 spec:
- Fixed position at top (h-16 / 64px)
- Logo on left (links to homepage)
- Close button on right (X icon)
- Subtle border and backdrop blur

### 3. Close Button Behavior

| Current Route | Close Action |
|---------------|--------------|
| `/get-started` | Call `completeOnboarding()`, redirect to `/` |
| `/checkout/bpp` | Redirect to `/pricing` |
| `/checkout/pro` | Redirect to `/pricing` |

The `/get-started` close behavior ensures:
- User won't see welcome page again (hasCompletedOnboarding = true)
- Returning users go directly to `/chat` from Hero CTA

### 4. Content Container

- `max-width: 600px` for readable content width
- `px-6` (24px) horizontal padding
- `py-12` (48px) vertical padding
- Centered with `mx-auto`

### 5. Theme-Aware Logo

Using CSS classes to show correct brand text based on theme:
- Light mode: `/makalah_brand_text_dark.svg`
- Dark mode: `/makalah_brand_text.svg`

## Verification Results

| Check | Result |
|-------|--------|
| TypeScript type check (`npx tsc --noEmit`) | Passed |
| ESLint (`npm run lint`) | Passed |

## Component Structure

```
OnboardingLayout (Server Component)
├── Auth check (redirect if not authenticated)
└── Layout structure
    ├── OnboardingHeader (Client Component)
    │   ├── Logo Link
    │   └── Close Button
    └── Main Content
        └── Centered Container (children)
```

## Next Dependencies

This layout enables:
- **Task 2.3**: Auth protection already implemented in this task
- **Task 2.4**: Background styling (onboarding-bg class)
- **Task 3.1-3.3**: Page implementations will render inside this layout
