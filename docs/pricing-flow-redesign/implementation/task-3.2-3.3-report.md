# Task 3.2 & 3.3 Report: Checkout Pages

## Summary

Implemented the checkout pages for BPP (full payment flow) and PRO (coming soon placeholder).

## Task 3.2: Checkout BPP Page

### Changes Made

**File:** `src/app/(onboarding)/checkout/bpp/page.tsx`

Full payment flow adapted from the existing topup page with onboarding styling:

1. **Page Header**
   - CreditCard icon
   - "Beli Kredit" title
   - "Bayar Per Paper" subtitle

2. **Current Balance Card**
   - Shows user's current credit balance
   - Uses `api.billing.credits.getCreditBalance` query

3. **Package Selection**
   - Dynamic packages from `api.pricingPlans.getCreditPackagesForPlan`
   - Each package shows: label, credits, price (IDR)
   - Visual indicator for selected and popular packages

4. **Payment Methods**
   - QRIS (scan with e-wallet)
   - Virtual Account (BCA, BNI, BRI, Mandiri)
   - E-Wallet (OVO with mobile number input, GoPay)

5. **Payment Result View**
   - QR Code display for QRIS (using `qrcode.react` library)
   - VA Number with copy-to-clipboard functionality
   - OVO push notification status
   - Expiration time display
   - Instructions card

6. **Summary & Pay Button**
   - Total payment amount
   - Credits after top-up projection
   - Uses `onboarding-btn-primary` class for brand styling

### Design Decisions

1. **Adapted from Topup Page**: Copied logic from `src/app/(dashboard)/subscription/topup/page.tsx` to maintain consistency with existing payment infrastructure.

2. **Removed Dashboard Elements**: Stripped breadcrumbs and dashboard layout dependencies.

3. **Onboarding Styling**: Used `rounded-xl` for cards and `onboarding-btn-primary` for the pay button to match onboarding design system.

4. **Error Handling**: Error banner with AlertCircle icon for payment failures.

---

## Task 3.3: Checkout PRO Page

### Changes Made

**File:** `src/app/(onboarding)/checkout/pro/page.tsx`

Coming soon placeholder page:

1. **Header**
   - Crown icon (amber-500)
   - "Langganan PRO" title
   - "Rp 200.000 / bulan" price

2. **Features Card**
   - Lists 6 PRO benefits with green checkmarks:
     - 2000 kredit per bulan
     - Menyusun sampai 5 paper (~75 halaman)
     - Full 13 tahap workflow
     - Draft hingga paper utuh
     - Diskusi tak terbatas
     - Export Word & PDF

3. **Coming Soon Card**
   - Amber-themed background (amber-50/amber-950)
   - Construction icon
   - "SEGERA HADIR" heading
   - Explanation text about feature under development
   - "Coba Bayar Per Paper" link to `/checkout/bpp`

### Design Decisions

1. **Amber Theme**: Used amber color palette to indicate "coming soon" status while maintaining visual appeal.

2. **Feature Preview**: Shows full feature list so users understand PRO value proposition even before it's available.

3. **Fallback CTA**: Provides clear path to BPP checkout as alternative.

---

## Verification Results

| Check | Result |
|-------|--------|
| TypeScript type check (`npx tsc --noEmit`) | Passed |
| ESLint (`npm run lint`) | Passed |

## User Flow

```
[/get-started]
    │
    ├── Click "Beli Kredit" (BPP)
    │   └── /checkout/bpp
    │       ├── Select package
    │       ├── Select payment method
    │       ├── Click "Bayar Sekarang"
    │       └── Payment result (QR/VA/E-Wallet)
    │
    └── Click "Segera Hadir" (PRO) - disabled
        └── (No action)

[/checkout/pro]
    └── Click "Coba Bayar Per Paper"
        └── /checkout/bpp
```

## Visual Reference

Based on wireframes.md Section 5 & 6:
- Centered content (max-width 600px from layout)
- Card-based UI with border and background
- Consistent with onboarding design system

## Dependencies Used

- `qrcode.react` - QR code generation for QRIS
- `lucide-react` - Icons (CreditCard, Crown, Construction, etc.)
- `sonner` - Toast notifications
- `convex/react` - Data queries

## Next Tasks

Phase 3 complete. Next is Phase 4: Marketing Pages Redesign
- **Task 4.1**: Create PricingTeaser component
- **Task 4.2**: Update Homepage to use PricingTeaser
