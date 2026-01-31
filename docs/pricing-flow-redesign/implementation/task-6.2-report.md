# Task 6.2 Report: Deprecate Old Topup Page

## Summary

Deprecated the old topup page at `/subscription/topup` by replacing its implementation with a server-side redirect to the new `/checkout/bpp` route. This ensures backward compatibility for existing bookmarks and links.

## Changes Made

### File: `src/app/(dashboard)/subscription/topup/page.tsx` (REPLACED)

**Before:** Full topup page implementation (~600 lines) with:
- Payment method selection (QRIS, VA, E-Wallet)
- Credit package selection
- Xendit payment integration
- QR code display
- VA number display with copy functionality

**After:** Simple redirect (12 lines):

```typescript
import { redirect } from "next/navigation"

/**
 * DEPRECATED: Old topup page
 *
 * This page has been moved to /checkout/bpp as part of the pricing flow redesign.
 * This redirect ensures existing bookmarks and links continue to work.
 *
 * @see /checkout/bpp for the new checkout page
 */
export default function DeprecatedTopupPage() {
  redirect("/checkout/bpp")
}
```

## Related Routes (Kept Intact)

The following routes were **NOT** modified because they handle payment callbacks from Xendit:

| Route | Purpose |
|-------|---------|
| `/subscription/topup/success` | Payment success callback |
| `/subscription/topup/failed` | Payment failure callback |

These callback URLs are configured in `/api/payments/topup/route.ts`:
```typescript
successReturnUrl: `${appUrl}/subscription/topup/success`,
failureReturnUrl: `${appUrl}/subscription/topup/failed`,
```

**Future consideration:** Migrate these callbacks to `/checkout/bpp/success|failed` in a future release.

## Links Still Pointing to Old Route

The following files still reference `/subscription/topup` but will work correctly due to the redirect:

| File | Reference |
|------|-----------|
| `subscription/overview/page.tsx` | Topup button href |
| `subscription/layout.tsx` | Navigation tab |
| `subscription/topup/failed/page.tsx` | Retry link |
| `api/payments/topup/route.ts` | Callback URLs |
| `convex/migrations/seedPricingPlans.ts` | CTA href in seed data |

**Rationale:** The redirect handles all these cases gracefully. A full migration of these references is out of scope for v1.

## Verification

```bash
# Type check
npx tsc --noEmit  # Passed

# Lint
npm run lint  # Passed
```

## Backward Compatibility

| Scenario | Behavior |
|----------|----------|
| User bookmarked `/subscription/topup` | Redirects to `/checkout/bpp` |
| External link to old page | Redirects to `/checkout/bpp` |
| Dashboard navigation | Redirects to `/checkout/bpp` |
| Payment callback to `/subscription/topup/success` | Works (route not changed) |

## Design Decision

Chose server-side redirect (`redirect()` from `next/navigation`) over:
- **Client-side redirect:** Slower, causes flash of content
- **Deleting the file:** Would cause 404 errors for existing links
- **Updating all references:** Higher risk, more changes needed

## Next Steps

- Task 6.3: Final commit and PR
