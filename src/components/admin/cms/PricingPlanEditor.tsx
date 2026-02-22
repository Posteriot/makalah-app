"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { CmsSaveButton } from "./CmsSaveButton"

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
          Plan &quot;{slug}&quot; tidak ditemukan di database.
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
            Teaser Description (Home &amp; Get Started)
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
            Teaser Credit Note (Home &amp; Get Started)
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
            Highlighted (Badge &quot;Solusi Terbaik&quot;)
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
              Nonaktif (Tombol &quot;Segera Hadir&quot;)
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
      <CmsSaveButton onSave={handleSave} />
    </div>
  )
}
