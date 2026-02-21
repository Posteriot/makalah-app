# Pricing CMS Design

## Goal

Seluruh teks dan harga pricing (home teaser + pricing page) bisa diedit dari CMS admin panel. Harga BPP dan Pro yang diubah admin langsung berlaku di payment flow. Admin bisa nonaktifkan tier secara independen (per-tier toggle).

## Architecture

DB (`pricingPlans` table) menjadi single source of truth untuk display DAN payment. Constants di `billing/constants.ts` menjadi fallback saja. Frontend menampilkan masked price ("Rp00rb") saat tier disabled.

## Data Model

### pricingPlans table (existing — no schema changes)

Semua field sudah ada di schema. Yang dipakai CMS:

| Field | Type | Editable | Notes |
|-------|------|----------|-------|
| `name` | string | All tiers | Nama tier |
| `slug` | string | Read-only | "gratis", "bpp", "pro" |
| `price` | string | BPP, Pro | Display string: "Rp80rb" |
| `priceValue` | number | BPP, Pro | Numeric for payment |
| `unit` | string | All tiers | "/paper", "/bulan" |
| `tagline` | string | All tiers | Pricing page description |
| `teaserDescription` | string | All tiers | Home teaser description |
| `teaserCreditNote` | string | All tiers | Home teaser credit note |
| `features` | string[] | All tiers | Feature list (pricing page) |
| `ctaText` | string | All tiers | Button text |
| `ctaHref` | string | All tiers | Button link |
| `isHighlighted` | boolean | All tiers | "Solusi Terbaik" badge |
| `isDisabled` | boolean | BPP, Pro | "Segera Hadir" mode |
| `creditPackages` | array | BPP only | Edit existing packages |

### Gratis Lockdown

- `price` locked to "Rp0"
- `priceValue` locked to 0
- `isDisabled` locked to false

## CMS Editor

### Location

ContentManager sidebar → "Pricing" page → 3 sub-items:
- Gratis
- Bayar Per Paper (BPP)
- Pro

### PricingPlanEditor.tsx

Single editor component, renders differently per slug:

1. **Common fields**: name, tagline, teaserDescription, teaserCreditNote, features[], ctaText, ctaHref, isHighlighted
2. **Price fields** (BPP/Pro only): price (string), priceValue (number), unit
3. **Credit Packages** (BPP only): edit label, description, credits, priceIDR per package
4. **Disable toggle** (BPP/Pro only): isDisabled switch

## DB as Single Source of Truth

### Current state (dual source)

- `billing/constants.ts`: `PAPER_PRICE_IDR = 80_000`, `CREDIT_PACKAGES`, `SUBSCRIPTION_PRICING`
- `pricingPlans` table: same values stored in DB
- Payment reads from constants

### After CMS

- Payment reads from DB via helper: `getPricingFromDB(slug)`
- Constants become fallback only (if DB query fails)
- Admin changes price in CMS → payment uses new price immediately

### Helper function

```typescript
// convex/billing/pricingHelpers.ts
async function getBppPricing(db): Promise<{ priceIDR, credits, tokens }>
async function getProPricing(db): Promise<{ priceIDR }>
```

Fallback to constants if plan not found.

## Display Behavior When Disabled

When `isDisabled === true`:

1. **Price masked**: `plan.price.replace(/\d/g, "0")` → "Rp80rb" → "Rp00rb", "Rp200rb" → "Rp000rb"
2. **Button**: "SEGERA HADIR", disabled, opacity 60%
3. **Card**: reduced opacity, hover disabled
4. **Payment**: endpoint rejects requests for disabled tiers

Applied in: `PricingCard.tsx`, `TeaserCard.tsx`

## Per-tier Toggle vs Waitlist

- Per-tier `isDisabled`: granular control per plan
- Global waitlist (`appConfig`): remains as override
- Frontend: `effectiveDisabled = plan.isDisabled || (isWaitlistMode && plan.slug !== "gratis")`

## Convex Mutations

### `updatePricingPlan` (new)

Admin-only mutation to update all editable fields of a plan.

Args: `requestorId, id, name?, price?, priceValue?, unit?, tagline?, teaserDescription?, teaserCreditNote?, features?, ctaText?, ctaHref?, isHighlighted?, isDisabled?`

Validation:
- Gratis: reject price/priceValue/isDisabled changes
- Required: requestorId must be admin/superadmin

### `updateCreditPackages` (new)

Admin-only mutation to update credit packages for BPP plan.

Args: `requestorId, planId, creditPackages[]`

## Files Affected

| File | Change |
|------|--------|
| `convex/pricingPlans.ts` | +2 mutations |
| `convex/billing/pricingHelpers.ts` | **New** — DB price reader with fallback |
| `convex/billing/credits.ts` | Use pricingHelpers instead of constants |
| `src/components/admin/cms/PricingPlanEditor.tsx` | **New** — full plan editor |
| `src/components/admin/ContentManager.tsx` | Add Pricing to sidebar nav |
| `src/components/marketing/pricing/PricingCard.tsx` | Mask price when disabled |
| `src/components/marketing/pricing-teaser/TeaserCard.tsx` | Mask price when disabled |
| Payment endpoints | Use DB pricing via helpers |
