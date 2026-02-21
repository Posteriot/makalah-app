# Pricing CMS Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Admin bisa edit semua teks dan harga pricing dari CMS, harga berlaku langsung di payment, dan bisa disable tier secara independen.

**Architecture:** DB (`pricingPlans` table) menjadi single source of truth. Payment endpoints baca harga dari DB via helper functions, constants jadi fallback. Frontend mask harga saat tier disabled. Editor baru `PricingPlanEditor` di ContentManager.

**Tech Stack:** Convex (mutations + queries), React, TypeScript, Tailwind CSS

---

### Task 1: Create Pricing Helper Functions (DB Price Reader)

**Files:**
- Create: `convex/billing/pricingHelpers.ts`
- Modify: `convex/billing/constants.ts` (export helper functions)

**Context:** Currently `topup/route.ts` imports `getPackageByType()` from constants.ts which returns hardcoded values. We need a Convex query that reads from DB with fallback to constants.

**Step 1: Create `convex/billing/pricingHelpers.ts`**

```typescript
import { query } from "../_generated/server"
import { v } from "convex/values"
import { CREDIT_PACKAGES, SUBSCRIPTION_PRICING } from "./constants"

/**
 * Get BPP credit package pricing from DB, fallback to constants.
 * Used by topup payment endpoint.
 */
export const getBppCreditPackage = query({
  args: { packageType: v.string() },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("pricingPlans")
      .withIndex("by_slug", (q) => q.eq("slug", "bpp"))
      .first()

    // Check DB credit packages first
    if (plan?.creditPackages && plan.creditPackages.length > 0) {
      const dbPkg = plan.creditPackages.find((p) => p.type === args.packageType)
      if (dbPkg) {
        return {
          source: "db" as const,
          credits: dbPkg.credits,
          tokens: dbPkg.tokens,
          priceIDR: dbPkg.priceIDR,
          label: dbPkg.label,
          description: dbPkg.description ?? "",
        }
      }
    }

    // Fallback to constants
    const constPkg = CREDIT_PACKAGES.find((p) => p.type === args.packageType)
    if (!constPkg) return null

    return {
      source: "constants" as const,
      credits: constPkg.credits,
      tokens: constPkg.tokens,
      priceIDR: constPkg.priceIDR,
      label: constPkg.label,
      description: constPkg.description,
    }
  },
})

/**
 * Get Pro subscription pricing from DB, fallback to constants.
 * Used by subscribe payment endpoint.
 */
export const getProPricing = query({
  args: {},
  handler: async (ctx) => {
    const plan = await ctx.db
      .query("pricingPlans")
      .withIndex("by_slug", (q) => q.eq("slug", "pro"))
      .first()

    if (plan?.priceValue) {
      return {
        source: "db" as const,
        priceIDR: plan.priceValue,
        label: plan.name ?? "Pro Bulanan",
        intervalMonths: 1,
      }
    }

    // Fallback to constants
    const pricing = SUBSCRIPTION_PRICING.pro_monthly
    return {
      source: "constants" as const,
      priceIDR: pricing.priceIDR,
      label: pricing.label,
      intervalMonths: pricing.intervalMonths,
    }
  },
})

/**
 * Check if a plan tier is disabled (not available for purchase).
 */
export const isPlanDisabled = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("pricingPlans")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first()

    return plan?.isDisabled ?? false
  },
})
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add convex/billing/pricingHelpers.ts
git commit -m "feat(billing): add DB pricing helpers with constants fallback"
```

---

### Task 2: Wire Payment Endpoints to DB Pricing

**Files:**
- Modify: `src/app/api/payments/topup/route.ts:56-71`
- Modify: `src/app/api/payments/subscribe/route.ts:82-85`

**Context:** Currently both endpoints import pricing from `constants.ts`. Switch them to query DB via the new helpers, with disabled-tier guard.

**Step 1: Update topup route**

In `src/app/api/payments/topup/route.ts`, replace the package validation block (lines ~56-71):

Before:
```typescript
import { isValidPackageType, getPackageByType } from "@convex/billing/constants"
// ...
if (!isValidPackageType(packageType)) { ... }
const pkg = getPackageByType(packageType)
const { credits, priceIDR: amount, label: packageLabel } = pkg
```

After:
```typescript
import { isValidPackageType } from "@convex/billing/constants"
// ...
if (!isValidPackageType(packageType)) { ... }

// Check if BPP tier is disabled
const bppDisabled = await fetchQuery(api.billing.pricingHelpers.isPlanDisabled, { slug: "bpp" }, convexOptions)
if (bppDisabled) {
  return NextResponse.json(
    { error: "Paket BPP sedang tidak tersedia" },
    { status: 403 }
  )
}

// Get pricing from DB (fallback to constants)
const pkg = await fetchQuery(api.billing.pricingHelpers.getBppCreditPackage, { packageType }, convexOptions)
if (!pkg) {
  return NextResponse.json(
    { error: "Paket tidak ditemukan" },
    { status: 400 }
  )
}
const { credits, priceIDR: amount, label: packageLabel } = pkg
```

**Step 2: Update subscribe route**

In `src/app/api/payments/subscribe/route.ts`, replace pricing lookup (lines ~82-85):

Before:
```typescript
import { SUBSCRIPTION_PRICING } from "@convex/billing/constants"
// ...
const pricing = SUBSCRIPTION_PRICING[planType]
const { priceIDR: amount, label: planLabel } = pricing
```

After:
```typescript
// Check if Pro tier is disabled
const proDisabled = await fetchQuery(api.billing.pricingHelpers.isPlanDisabled, { slug: "pro" }, convexOptions)
if (proDisabled) {
  return NextResponse.json(
    { error: "Paket Pro sedang tidak tersedia" },
    { status: 403 }
  )
}

// Get pricing from DB (fallback to constants)
const pricing = await fetchQuery(api.billing.pricingHelpers.getProPricing, {}, convexOptions)
const { priceIDR: amount, label: planLabel } = pricing
```

Remove the `SUBSCRIPTION_PRICING` import if no longer used elsewhere in the file.

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/app/api/payments/topup/route.ts src/app/api/payments/subscribe/route.ts
git commit -m "feat(billing): wire payment endpoints to DB pricing with disabled guard"
```

---

### Task 3: Add Convex Mutations for Pricing Plans

**Files:**
- Modify: `convex/pricingPlans.ts` (add mutations)

**Context:** Currently `pricingPlans.ts` only has query functions. Add admin-only mutations for updating plans and credit packages.

**Step 1: Add mutations to `convex/pricingPlans.ts`**

Append after existing queries:

```typescript
import { mutation } from "./_generated/server"
import { requireRole } from "./lib/permissions" // same pattern as other CMS mutations

/**
 * Update a pricing plan's editable fields.
 * Admin only. Gratis plan has locked price and isDisabled.
 */
export const updatePricingPlan = mutation({
  args: {
    requestorId: v.id("users"),
    id: v.id("pricingPlans"),
    name: v.optional(v.string()),
    price: v.optional(v.string()),
    priceValue: v.optional(v.number()),
    unit: v.optional(v.string()),
    tagline: v.optional(v.string()),
    teaserDescription: v.optional(v.string()),
    teaserCreditNote: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
    ctaText: v.optional(v.string()),
    ctaHref: v.optional(v.string()),
    isHighlighted: v.optional(v.boolean()),
    isDisabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")

    const plan = await ctx.db.get(args.id)
    if (!plan) throw new Error("Plan not found")

    // Gratis lockdown: reject price and disable changes
    if (plan.slug === "gratis") {
      if (args.price !== undefined || args.priceValue !== undefined) {
        throw new Error("Cannot change Gratis plan price")
      }
      if (args.isDisabled !== undefined) {
        throw new Error("Cannot disable Gratis plan")
      }
    }

    const { requestorId, id, ...updates } = args
    // Filter out undefined values
    const patch: Record<string, unknown> = { updatedAt: Date.now() }
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        patch[key] = value
      }
    }

    await ctx.db.patch(id, patch)
  },
})

/**
 * Update credit packages for a pricing plan (BPP only).
 * Admin only.
 */
export const updateCreditPackages = mutation({
  args: {
    requestorId: v.id("users"),
    id: v.id("pricingPlans"),
    creditPackages: v.array(
      v.object({
        type: v.union(v.literal("paper"), v.literal("extension_s"), v.literal("extension_m")),
        credits: v.number(),
        tokens: v.number(),
        priceIDR: v.number(),
        label: v.string(),
        description: v.optional(v.string()),
        ratePerCredit: v.optional(v.number()),
        popular: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")

    const plan = await ctx.db.get(args.id)
    if (!plan) throw new Error("Plan not found")
    if (plan.slug !== "bpp") throw new Error("Credit packages only for BPP plan")

    await ctx.db.patch(args.id, {
      creditPackages: args.creditPackages,
      updatedAt: Date.now(),
    })
  },
})
```

**Step 2: Check existing imports in `convex/pricingPlans.ts`**

Make sure `mutation` and `v` are imported. The file likely already imports `query` and `v` — add `mutation` to the import.

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add convex/pricingPlans.ts
git commit -m "feat(cms): add admin mutations for pricing plan updates"
```

---

### Task 4: Create PricingPlanEditor Component

**Files:**
- Create: `src/components/admin/cms/PricingPlanEditor.tsx`

**Context:** This is the main CMS editor. It queries a single plan by slug, renders form fields, and saves via the new mutations. Pattern follows existing editors like `BenefitsSectionEditor.tsx`.

**Step 1: Create the editor component**

```typescript
"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"

type CreditPackage = {
  type: "paper" | "extension_s" | "extension_m"
  credits: number
  tokens: number
  priceIDR: number
  label: string
  description?: string
  ratePerCredit?: number
  popular?: boolean
}

type PricingPlanEditorProps = {
  slug: string
  userId: Id<"users">
}

export function PricingPlanEditor({ slug, userId }: PricingPlanEditorProps) {
  const plan = useQuery(api.pricingPlans.getPlanBySlug, { slug })
  const updatePlan = useMutation(api.pricingPlans.updatePricingPlan)
  const updatePackages = useMutation(api.pricingPlans.updateCreditPackages)

  const isGratis = slug === "gratis"
  const isBpp = slug === "bpp"

  // Form state
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [priceValue, setPriceValue] = useState(0)
  const [unit, setUnit] = useState("")
  const [tagline, setTagline] = useState("")
  const [teaserDescription, setTeaserDescription] = useState("")
  const [teaserCreditNote, setTeaserCreditNote] = useState("")
  const [features, setFeatures] = useState<string[]>([])
  const [ctaText, setCtaText] = useState("")
  const [ctaHref, setCtaHref] = useState("")
  const [isHighlighted, setIsHighlighted] = useState(false)
  const [isDisabled, setIsDisabled] = useState(false)
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([])

  // UI state
  const [isSaving, setIsSaving] = useState(false)
  const [saveLabel, setSaveLabel] = useState("Simpan")

  // Sync from DB
  useEffect(() => {
    if (plan) {
      setName(plan.name ?? "")
      setPrice(plan.price ?? "")
      setPriceValue(plan.priceValue ?? 0)
      setUnit(plan.unit ?? "")
      setTagline(plan.tagline ?? "")
      setTeaserDescription(plan.teaserDescription ?? "")
      setTeaserCreditNote(plan.teaserCreditNote ?? "")
      setFeatures(plan.features ?? [])
      setCtaText(plan.ctaText ?? "")
      setCtaHref(plan.ctaHref ?? "")
      setIsHighlighted(plan.isHighlighted ?? false)
      setIsDisabled(plan.isDisabled ?? false)
      setCreditPackages((plan.creditPackages as CreditPackage[] | undefined) ?? [])
    }
  }, [plan])

  // Feature list helpers
  function updateFeature(index: number, value: string) {
    setFeatures((prev) => prev.map((f, i) => (i === index ? value : f)))
  }
  function addFeature() {
    setFeatures((prev) => [...prev, ""])
  }
  function removeFeature(index: number) {
    setFeatures((prev) => prev.filter((_, i) => i !== index))
  }

  // Credit package helpers
  function updatePackage(index: number, field: keyof CreditPackage, value: string | number | boolean) {
    setCreditPackages((prev) =>
      prev.map((pkg, i) => (i === index ? { ...pkg, [field]: value } : pkg))
    )
  }

  async function handleSave() {
    if (!plan) return
    setIsSaving(true)
    try {
      await updatePlan({
        requestorId: userId,
        id: plan._id as Id<"pricingPlans">,
        name,
        ...(!isGratis && { price, priceValue, isDisabled }),
        unit,
        tagline,
        teaserDescription,
        teaserCreditNote,
        features,
        ctaText,
        ctaHref,
        isHighlighted,
      })

      // Save credit packages separately for BPP
      if (isBpp && creditPackages.length > 0) {
        await updatePackages({
          requestorId: userId,
          id: plan._id as Id<"pricingPlans">,
          creditPackages,
        })
      }

      setSaveLabel("Tersimpan!")
      setTimeout(() => setSaveLabel("Simpan"), 2000)
    } finally {
      setIsSaving(false)
    }
  }

  // Loading skeleton
  if (plan === undefined) {
    return (
      <div className="w-full space-y-4 p-comfort">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-9 w-32" />
      </div>
    )
  }

  if (plan === null) {
    return (
      <div className="w-full p-comfort">
        <p className="text-interface text-sm text-muted-foreground">
          Plan "{slug}" tidak ditemukan di database.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 p-comfort">
      {/* Section header */}
      <div>
        <h3 className="text-narrative text-lg font-medium tracking-tight text-foreground">
          {plan.name}
        </h3>
        <div className="mt-2 border-t border-border" />
      </div>

      {/* Basic fields */}
      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Nama Plan
          </label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama tier" />
        </div>

        {/* Price + PriceValue (locked for Gratis) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
              Harga (Display)
            </label>
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Rp80rb"
              disabled={isGratis}
            />
          </div>
          <div>
            <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
              Harga (Numerik / Payment)
            </label>
            <Input
              type="number"
              value={priceValue}
              onChange={(e) => setPriceValue(Number(e.target.value))}
              placeholder="80000"
              disabled={isGratis}
            />
            {!isGratis && (
              <p className="text-interface mt-1 text-[10px] text-muted-foreground">
                Nilai ini dipakai untuk pembayaran aktual
              </p>
            )}
          </div>
        </div>

        {/* Unit */}
        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Unit
          </label>
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="/paper, /bulan" />
        </div>

        {/* Tagline */}
        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Tagline (Pricing Page)
          </label>
          <Textarea
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="Deskripsi di halaman pricing"
            rows={2}
          />
        </div>

        {/* Teaser Description */}
        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Teaser Description (Home)
          </label>
          <Textarea
            value={teaserDescription}
            onChange={(e) => setTeaserDescription(e.target.value)}
            placeholder="Deskripsi singkat di home"
            rows={2}
          />
        </div>

        {/* Teaser Credit Note */}
        <div>
          <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
            Teaser Credit Note (Home)
          </label>
          <Input
            value={teaserCreditNote}
            onChange={(e) => setTeaserCreditNote(e.target.value)}
            placeholder="Catatan kredit di teaser"
          />
        </div>

        {/* CTA */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
              CTA Text
            </label>
            <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} placeholder="Coba" />
          </div>
          <div>
            <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
              CTA Href
            </label>
            <Input value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} placeholder="/sign-up" />
          </div>
        </div>

        {/* Highlighted */}
        <div className="flex items-center gap-3">
          <label className="text-interface text-xs font-medium text-muted-foreground">
            Highlighted (Badge "Solusi Terbaik")
          </label>
          <Switch
            className="data-[state=checked]:bg-emerald-600"
            checked={isHighlighted}
            onCheckedChange={setIsHighlighted}
          />
        </div>

        {/* Disabled toggle (not for Gratis) */}
        {!isGratis && (
          <div className="flex items-center gap-3">
            <label className="text-interface text-xs font-medium text-muted-foreground">
              Nonaktif (Tombol "Segera Hadir")
            </label>
            <Switch
              className="data-[state=checked]:bg-emerald-600"
              checked={isDisabled}
              onCheckedChange={setIsDisabled}
            />
          </div>
        )}
      </div>

      {/* Features list */}
      <div className="space-y-3">
        <span className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Features (Pricing Page)
        </span>
        <div className="space-y-2">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={feature}
                onChange={(e) => updateFeature(index, e.target.value)}
                placeholder={`Fitur ${index + 1}`}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => removeFeature(index)}
                className="text-interface text-xs text-destructive hover:underline"
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addFeature}
          className="rounded-action border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent"
        >
          Tambah Fitur
        </button>
      </div>

      {/* Credit Packages (BPP only) */}
      {isBpp && creditPackages.length > 0 && (
        <div className="space-y-3">
          <span className="text-signal mb-1 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Credit Packages
          </span>
          {creditPackages.map((pkg, index) => (
            <div key={index} className="rounded-action border border-border p-4 space-y-3">
              <span className="text-interface text-sm font-medium text-foreground">
                {pkg.type}
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
                    Label
                  </label>
                  <Input
                    value={pkg.label}
                    onChange={(e) => updatePackage(index, "label", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
                    Harga (IDR)
                  </label>
                  <Input
                    type="number"
                    value={pkg.priceIDR}
                    onChange={(e) => updatePackage(index, "priceIDR", Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
                    Credits
                  </label>
                  <Input
                    type="number"
                    value={pkg.credits}
                    onChange={(e) => updatePackage(index, "credits", Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
                    Tokens
                  </label>
                  <Input
                    type="number"
                    value={pkg.tokens}
                    onChange={(e) => updatePackage(index, "tokens", Number(e.target.value))}
                  />
                </div>
              </div>
              <div>
                <label className="text-interface mb-1 block text-xs font-medium text-muted-foreground">
                  Description
                </label>
                <Input
                  value={pkg.description ?? ""}
                  onChange={(e) => updatePackage(index, "description", e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="rounded-action bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isSaving ? "Menyimpan..." : saveLabel}
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/admin/cms/PricingPlanEditor.tsx
git commit -m "feat(cms): create PricingPlanEditor component"
```

---

### Task 5: Wire PricingPlanEditor into ContentManager

**Files:**
- Modify: `src/components/admin/ContentManager.tsx`

**Context:** Add "Pricing" page to sidebar nav with 3 sub-items (Gratis, BPP, Pro). Wire to PricingPlanEditor.

**Step 1: Add import**

At top of file, add:
```typescript
import { PricingPlanEditor } from "./cms/PricingPlanEditor"
```

**Step 2: Update types**

Update `PageId` type (line 21):
```typescript
type PageId = "home" | "pricing" | "about" | "privacy" | "security" | "terms" | "header" | "footer" | "documentation" | "blog"
```

Update `SectionId` type (lines 22-25), add:
```typescript
  | "pricing-gratis" | "pricing-bpp" | "pricing-pro"
```

**Step 3: Add Pricing page to PAGES_NAV**

Insert after `home` entry (line 49), before `about`:
```typescript
    {
      id: "pricing",
      label: "Pricing",
      sections: [
        { id: "pricing-gratis", label: "Gratis" },
        { id: "pricing-bpp", label: "Bayar Per Paper" },
        { id: "pricing-pro", label: "Pro" },
      ],
    },
```

**Step 4: Add a slug map constant**

Below `BLOG_CATEGORY_MAP`, add:
```typescript
const PRICING_SLUG_MAP: Record<string, string> = {
  "pricing-gratis": "gratis",
  "pricing-bpp": "bpp",
  "pricing-pro": "pro",
}
```

**Step 5: Add editor routing**

In the right panel conditional chain, before the `selectionLabel` fallback, add:
```typescript
) : selectedPage === "pricing" && selectedSection && PRICING_SLUG_MAP[selectedSection] ? (
  <PricingPlanEditor
    slug={PRICING_SLUG_MAP[selectedSection]}
    userId={userId}
  />
```

**Step 6: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```bash
git add src/components/admin/ContentManager.tsx
git commit -m "feat(cms): add Pricing page to ContentManager sidebar"
```

---

### Task 6: Frontend Price Masking When Disabled

**Files:**
- Modify: `src/components/marketing/pricing/PricingCard.tsx:106-113`
- Modify: `src/components/marketing/pricing-teaser/TeaserCard.tsx:44-51`

**Context:** When a plan is disabled (or disabled by waitlist), mask the price by replacing digits with 0. This is purely visual — DB data stays intact.

**Step 1: Add helper function**

Create a shared helper. Add to both files (or extract to a shared util if preferred — but YAGNI, just inline):

```typescript
function maskPrice(price: string): string {
  return price.replace(/\d/g, "0")
}
```

**Step 2: Update PricingCard price display**

In `PricingCard.tsx`, in the main component (line ~106), change the price rendering:

Before:
```tsx
<p className="text-interface text-3xl md:text-3xl font-medium tracking-tight tabular-nums text-foreground text-center mb-6">
  {plan.price}
```

After:
```tsx
<p className="text-interface text-3xl md:text-3xl font-medium tracking-tight tabular-nums text-foreground text-center mb-6">
  {(plan.isDisabled || isDisabledByWaitlist) ? maskPrice(plan.price) : plan.price}
```

**Step 3: Update TeaserCard price display**

In `TeaserCard.tsx`, same pattern (line ~44):

Before:
```tsx
<p className="text-interface text-3xl md:text-3xl font-medium tracking-tight tabular-nums text-foreground text-center mb-6">
  {plan.price}
```

After — note: TeaserCard uses `isDisabledByWaitlist` but also needs to check `plan.isDisabled` from the TeaserPlan type. Check if `TeaserPlan` type includes `isDisabled`. If not, add it.

First check `src/components/marketing/pricing-teaser/types.ts` for the TeaserPlan type and add `isDisabled` if missing.

Then:
```tsx
<p className="text-interface text-3xl md:text-3xl font-medium tracking-tight tabular-nums text-foreground text-center mb-6">
  {(isDisabledByWaitlist || plan.isDisabled) ? maskPrice(plan.price) : plan.price}
```

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/components/marketing/pricing/PricingCard.tsx src/components/marketing/pricing-teaser/TeaserCard.tsx
git commit -m "feat(pricing): mask price display when tier is disabled"
```

---

### Task 7: Verify End-to-End

**Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: Zero errors

**Step 2: Run build**

```bash
npm run build
```
Expected: Build succeeds

**Step 3: Manual verification checklist**

With `npm run dev` + `npx convex dev` running:

1. Admin Panel → CMS → Pricing → Gratis: verify price fields disabled, isDisabled toggle hidden
2. Admin Panel → CMS → Pricing → BPP: edit price → save → verify pricing page shows new price
3. Admin Panel → CMS → Pricing → BPP: toggle "Nonaktif" on → verify pricing page shows "Rp00rb" + "SEGERA HADIR"
4. Admin Panel → CMS → Pricing → Pro: same as BPP
5. Home teaser: verify price masking works same as pricing page
6. Topup endpoint: with BPP disabled, attempt topup → expect 403 error
7. Subscribe endpoint: with Pro disabled, attempt subscribe → expect 403 error

**Step 4: Commit any fixes found during verification**

```bash
git add -A
git commit -m "fix(pricing-cms): address issues found during verification"
```
