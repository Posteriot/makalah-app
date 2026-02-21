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

### Task 7: TeaserCard — Add `isDisabled` Check + Price Masking

**Files:**
- Modify: `src/components/marketing/pricing-teaser/types.ts`
- Modify: `src/components/marketing/pricing-teaser/TeaserCard.tsx`

**Context:** TeaserCard (home page pricing teaser) currently only checks `isWaitlistMode` to disable cards. It does NOT check the per-tier `isDisabled` field from DB. It also doesn't mask the price. The `TeaserPlan` type doesn't include `isDisabled`.

**Step 1: Add `isDisabled` to TeaserPlan type**

In `src/components/marketing/pricing-teaser/types.ts`:

```typescript
export type TeaserPlan = {
  _id: string
  name: string
  price: string
  unit?: string
  isHighlighted: boolean
  isDisabled?: boolean    // <-- add this
  description: string
  creditNote: string
}
```

**Step 2: Update TeaserCard to check `isDisabled` + mask price**

In `src/components/marketing/pricing-teaser/TeaserCard.tsx`:

Add helper at top:
```typescript
function maskPrice(price: string): string {
  return price.replace(/\d/g, "0")
}
```

Change `isDisabledByWaitlist` logic (line 9):
```typescript
const isDisabledByWaitlist = isWaitlistMode && plan.name.toLowerCase() !== "gratis"
const effectiveDisabled = plan.isDisabled || isDisabledByWaitlist
```

Replace all usages of `isDisabledByWaitlist` with `effectiveDisabled` in the JSX. This affects:
- The card opacity class: `effectiveDisabled && "opacity-60"`
- The "SEGERA HADIR" button render: `{effectiveDisabled && (`
- The price display: `{effectiveDisabled ? maskPrice(plan.price) : plan.price}`

**Step 3: Verify caller passes `isDisabled` from DB**

Check the parent component that constructs `TeaserPlan` objects. Ensure `isDisabled` is passed from the DB plan data. The `pricingPlans` table already has `isDisabled` field, so the data should flow through.

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/components/marketing/pricing-teaser/types.ts src/components/marketing/pricing-teaser/TeaserCard.tsx
git commit -m "feat(pricing): add isDisabled check and price masking to TeaserCard"
```

---

### Task 8: BPP Checkout — Replace Hardcoded Prices + Disabled Guard

**Files:**
- Modify: `src/app/(onboarding)/checkout/bpp/page.tsx`

**Context:** This page has `BPP_PACKAGE = { credits: 300, priceIDR: 80_000 }` hardcoded at line 33. If admin changes BPP price in CMS, this page would still show the old price. Also no check for `isDisabled`. Must query DB for pricing and redirect if disabled.

**Step 1: Replace hardcoded `BPP_PACKAGE` with DB query**

In `CheckoutBPPContent`, add queries:
```typescript
const bppPlan = useQuery(api.pricingPlans.getPlanBySlug, { slug: "bpp" })
const bppPackage = useQuery(api.billing.pricingHelpers.getBppCreditPackage, { packageType: "paper" })
```

Remove the hardcoded `BPP_PACKAGE` constant at top of file.

Create a derived object from DB data with fallback:
```typescript
const pkg = bppPackage ?? { credits: 300, priceIDR: 80_000, label: "Paket Paper", description: "1 paper lengkap (~15 halaman)" }
```

**Step 2: Add disabled guard with redirect**

After `bppPlan` loads, if disabled → redirect to overview:
```typescript
useEffect(() => {
  if (bppPlan?.isDisabled) {
    router.replace("/subscription/overview")
  }
}, [bppPlan?.isDisabled, router])
```

Also show loading while `bppPlan === undefined` or `bppPackage === undefined`.

**Step 3: Replace all `BPP_PACKAGE` references**

Replace every `BPP_PACKAGE.credits`, `BPP_PACKAGE.priceIDR`, `BPP_PACKAGE.description` with the derived `pkg` object. Key locations:
- Line 209: `packageType: BPP_PACKAGE.type` → `packageType: "paper"` (type stays "paper")
- Line 285: `{BPP_PACKAGE.credits} kredit ({BPP_PACKAGE.description})` → `{pkg.credits} kredit ({pkg.description})`
- Line 420: `{BPP_PACKAGE.credits} kredit` → `{pkg.credits} kredit`
- Line 423: `Rp {BPP_PACKAGE.priceIDR.toLocaleString("id-ID")}` → `Rp {pkg.priceIDR.toLocaleString("id-ID")}`
- Line 554: Same pattern for total payment
- Line 561: `currentCredits + BPP_PACKAGE.credits` → `currentCredits + pkg.credits`

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/app/(onboarding)/checkout/bpp/page.tsx
git commit -m "feat(checkout): replace hardcoded BPP pricing with DB query + disabled guard"
```

---

### Task 9: Pro Checkout — Replace Hardcoded Prices + Disabled Guard

**Files:**
- Modify: `src/app/(onboarding)/checkout/pro/page.tsx`

**Context:** This page imports `SUBSCRIPTION_PRICING` from constants and uses `PRO_PRICING = SUBSCRIPTION_PRICING[PRO_PLAN_TYPE]` (line 35). If admin changes Pro price in CMS, this page still shows old price. Also no `isDisabled` check.

**Step 1: Replace `SUBSCRIPTION_PRICING` import with DB query**

In `CheckoutPROContent`, add queries:
```typescript
const proPlan = useQuery(api.pricingPlans.getPlanBySlug, { slug: "pro" })
const proPricing = useQuery(api.billing.pricingHelpers.getProPricing)
```

Remove the top-level import and constants:
```typescript
// Remove these:
import { SUBSCRIPTION_PRICING } from "@convex/billing/constants"
const PRO_PLAN_TYPE = "pro_monthly" as const
const PRO_PRICING = SUBSCRIPTION_PRICING[PRO_PLAN_TYPE]
```

Create derived pricing object:
```typescript
const pricing = proPricing ?? { priceIDR: 200_000, label: "Pro Bulanan" }
```

**Step 2: Add disabled guard with redirect**

```typescript
useEffect(() => {
  if (proPlan?.isDisabled) {
    router.replace("/subscription/overview")
  }
}, [proPlan?.isDisabled, router])
```

Also show loading while `proPlan === undefined` or `proPricing === undefined`.

**Step 3: Replace all `pricing` references**

The variable `pricing` is already used throughout the component. After replacing the source from constants to DB, the usages at lines 360, 443-444, 554 should continue to work since the shape is the same (`priceIDR`, `label`).

Keep `PRO_PLAN_TYPE = "pro_monthly"` for the subscribe API call body — the server endpoint still needs the plan type string.

**Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add src/app/(onboarding)/checkout/pro/page.tsx
git commit -m "feat(checkout): replace hardcoded Pro pricing with DB query + disabled guard"
```

---

### Task 10: Subscription Overview — Hide Upgrade Cards When Target Tier Disabled

**Files:**
- Modify: `src/app/(dashboard)/subscription/overview/page.tsx`

**Context:** The `RegularOverviewView` shows upgrade cards (Gratis→BPP, Gratis→Pro, BPP→Pro). These don't check `isDisabled`. If admin disables BPP, the "Top Up Kredit" card should hide. If admin disables Pro, the "Upgrade ke Pro" card should hide.

**Step 1: Gratis tier — filter disabled plans from upgrade cards**

In `RegularOverviewView`, lines 199-201 — the plans are already queried from `getActivePlans`. The filter currently only checks slug:
```typescript
.filter((plan) => plan.slug === "bpp" || plan.slug === "pro")
```

Add `isDisabled` check:
```typescript
.filter((plan) => (plan.slug === "bpp" || plan.slug === "pro") && !plan.isDisabled)
```

**Step 2: BPP tier — hide Pro upgrade pitch when Pro disabled**

Lines 238-267 show the Pro upgrade pitch when `tier === "bpp" && proPlan`. Add disabled check:
```typescript
{tier === "bpp" && proPlan && !proPlan.isDisabled && (
```

**Step 3: BPP tier — hide Top Up button when BPP disabled**

The BPP "Top Up Kredit" button at line 119-126 is shown when `tier === "bpp"`. Query BPP plan to check disabled:
```typescript
const bppPlan = useQuery(
  api.pricingPlans.getPlanBySlug,
  tier === "bpp" ? { slug: "bpp" } : "skip"
)
```

Then conditionally render:
```typescript
{tier === "bpp" && bppPlan && !bppPlan.isDisabled && (
  <Link href="/checkout/bpp?from=overview" ...>Top Up Kredit</Link>
)}
```

**Step 4: Admin overview — hardcoded prices in "Cara Kerja Pembayaran" section**

Lines 657-676 have hardcoded text: "Beli credit mulai Rp 25.000" and "Rp 200.000/bulan". These are informational text in the admin view. Since these are not user-facing payment values and the admin can see current prices in CMS, leave these as-is (they're admin-only educational content).

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/app/(dashboard)/subscription/overview/page.tsx
git commit -m "feat(subscription): hide upgrade cards when target tier is disabled"
```

---

### Task 11: Plans Hub — Guard Disabled State

**Files:**
- Modify: `src/app/(dashboard)/subscription/plans/page.tsx`

**Context:** The Plans Hub page (Pro-only) shows plan cards but doesn't check `isDisabled`. This page already queries `getActivePlans` and only shows `plan.slug === "pro"`. If Pro is disabled and user is already Pro (viewing their subscription), the page still works — it shows cancel/reactivate. But if Pro is disabled, hide the checkout CTA. Also mask price when disabled.

**Step 1: Add disabled check to plan card**

In the `.map()` at line 125, derive disabled state:
```typescript
const isEffectiveDisabled = plan.isDisabled ?? false
```

**Step 2: Mask price when disabled**

Add the `maskPrice` helper:
```typescript
function maskPrice(price: string): string {
  return price.replace(/\d/g, "0")
}
```

Update price display at line 161:
```typescript
{isEffectiveDisabled ? maskPrice(plan.price) : plan.price}
```

**Step 3: Hide checkout CTA when disabled**

Update `showProCheckout` at line 132:
```typescript
const showProCheckout = isPro && currentTier !== "pro" && currentTier !== "unlimited" && !isEffectiveDisabled
```

**Step 4: Show "Segera Hadir" when disabled**

After the existing CTA blocks, add:
```typescript
{isEffectiveDisabled && !isCurrentTier && (
  <span className="mt-auto inline-flex w-full items-center justify-center rounded-action bg-slate-200 px-4 py-2.5 text-signal text-[11px] font-bold uppercase tracking-widest text-muted-foreground dark:bg-slate-700">
    SEGERA HADIR
  </span>
)}
```

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```bash
git add src/app/(dashboard)/subscription/plans/page.tsx
git commit -m "feat(plans): add disabled guard, price masking, and 'Segera Hadir' to Plans Hub"
```

---

### Task 12: Verify End-to-End

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

**CMS Editor:**
1. Admin Panel → CMS → Pricing → Gratis: verify price fields disabled, isDisabled toggle hidden
2. Admin Panel → CMS → Pricing → BPP: edit price → save → verify pricing page shows new price
3. Admin Panel → CMS → Pricing → BPP: toggle "Nonaktif" on → verify pricing page shows "Rp00rb" + "SEGERA HADIR"
4. Admin Panel → CMS → Pricing → Pro: same as BPP

**Frontend Price Masking:**
5. Pricing page: verify price masking when disabled
6. Home teaser: verify TeaserCard shows masked price + "SEGERA HADIR" when `isDisabled` true

**Checkout Pages (hardcoded prices eliminated):**
7. `/checkout/bpp`: with BPP enabled, verify price matches DB value (not hardcoded 80_000)
8. `/checkout/bpp`: with BPP disabled, verify redirect to `/subscription/overview`
9. `/checkout/pro`: with Pro enabled, verify price matches DB value (not hardcoded 200_000)
10. `/checkout/pro`: with Pro disabled, verify redirect to `/subscription/overview`

**Payment Endpoints:**
11. Topup endpoint: with BPP disabled, attempt topup → expect 403 error
12. Subscribe endpoint: with Pro disabled, attempt subscribe → expect 403 error

**Subscription Pages:**
13. `/subscription/overview` (Gratis): with BPP disabled → BPP upgrade card hidden, Pro card visible (if enabled)
14. `/subscription/overview` (BPP): with Pro disabled → Pro upgrade pitch hidden
15. `/subscription/plans` (Pro): with Pro disabled → price masked, checkout CTA hidden, "SEGERA HADIR" shown

**Step 4: Commit any fixes found during verification**

```bash
git add -A
git commit -m "fix(pricing-cms): address issues found during verification"
```
