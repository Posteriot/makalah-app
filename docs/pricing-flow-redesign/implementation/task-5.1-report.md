# Task 5.1 Report: Handle redirect parameter in sign-up flow

## Summary

Implemented redirect URL validation utility and updated sign-up page to honor redirect parameter from pricing page CTAs.

## Changes Made

### File 1: `src/lib/utils/redirectAfterAuth.ts` (NEW)

Created utility functions for redirect URL handling:

1. **`getRedirectUrl(searchParams)`**
   - Validates redirect URL from search params
   - Returns whitelisted path or default `/get-started`

2. **`isCheckoutRedirect(redirectUrl)`**
   - Checks if redirect targets a checkout page
   - Used in Task 5.2 to determine onboarding flag behavior

3. **`getClerkRedirectUrl(searchParams)`**
   - Returns validated redirect URL for Clerk's `forceRedirectUrl` prop
   - Returns `undefined` if no valid redirect (allows Clerk default)

**Whitelist of Allowed Paths:**
```typescript
const ALLOWED_REDIRECT_PATHS = [
  "/get-started",
  "/checkout/bpp",
  "/checkout/pro",
  "/chat",
  "/dashboard",
]
```

### File 2: `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` (MODIFIED)

Updated to use redirect parameter:

1. **Import utility:**
   ```typescript
   import { getClerkRedirectUrl } from "@/lib/utils/redirectAfterAuth"
   ```

2. **Get redirect URL from search params:**
   ```typescript
   const redirectUrl = getClerkRedirectUrl(searchParams)
   ```

3. **Pass to SignUp component:**
   ```typescript
   <SignUp
     appearance={clerkAppearance}
     forceRedirectUrl={redirectUrl}
   />
   ```

## Design Decisions

### 1. Whitelist Approach

Only allowed paths are accepted as redirect targets. This prevents:
- Open redirect vulnerabilities
- Redirects to external URLs
- Redirects to unauthorized internal paths

### 2. URL Decoding

The utility decodes URL-encoded redirect values:
```typescript
const decodedRedirect = decodeURIComponent(redirect)
```

This handles URLs like `/sign-up?redirect=%2Fcheckout%2Fbpp`

### 3. Undefined Default

`getClerkRedirectUrl()` returns `undefined` instead of a default path when no valid redirect is found. This allows Clerk's built-in default redirect behavior to take over.

### 4. forceRedirectUrl vs redirectUrl

Clerk provides two props:
- `redirectUrl` - suggestion that can be overridden
- `forceRedirectUrl` - always honored

We use `forceRedirectUrl` because the redirect comes from a specific user action (clicking CTA on pricing page).

## User Flow

```
[Pricing Page]
    │
    ├── User clicks "Beli Kredit" (not signed in)
    │   └── /sign-up?redirect=/checkout/bpp
    │
    └── [Sign Up Page]
        │
        ├── searchParams.get("redirect") = "/checkout/bpp"
        │
        ├── getClerkRedirectUrl() validates → "/checkout/bpp"
        │
        ├── SignUp forceRedirectUrl="/checkout/bpp"
        │
        └── After signup → Clerk redirects to /checkout/bpp
```

## Security Considerations

1. **Path Validation**: Only paths starting with allowed prefixes are accepted
2. **No External URLs**: Only relative paths (starting with `/`) are in the whitelist
3. **Decoding**: Handles URL-encoded values safely
4. **Undefined Fallback**: Invalid redirects fall back to Clerk defaults

## Verification Results

| Check | Result |
|-------|--------|
| TypeScript type check (`npx tsc --noEmit`) | Passed |
| ESLint (`npm run lint`) | Passed |

## Integration Points

This utility is used by:
- **Task 5.1**: Sign-up page (this task)
- **Task 5.2**: Will use `isCheckoutRedirect()` to set onboarding flag

## Next Steps

- **Task 5.2**: Set onboarding flag on signup with redirect intent
- **Task 5.3**: Update Hero CTA to handle first-time detection
