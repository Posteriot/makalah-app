"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import type { CmsSectionId } from "./CmsSidebar"
import { NavArrowRight } from "iconoir-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { CmsSaveButton } from "@/components/admin/cms/CmsSaveButton"

type CmsPricingOverviewProps = {
  userId: Id<"users">
  onSectionClick: (sectionId: CmsSectionId) => void
  onNavigateToHeader: () => void
}

export function CmsPricingOverview({
  userId,
  onSectionClick,
  onNavigateToHeader,
}: CmsPricingOverviewProps) {
  const allSections = useQuery(api.pageContent.listAllSections, {
    requestorId: userId,
  })
  const plans = useQuery(api.pricingPlans.getActivePlans)
  const headerSection = useQuery(api.pageContent.getSection, {
    pageSlug: "pricing",
    sectionSlug: "pricing-page-header",
  })
  const upsertSection = useMutation(api.pageContent.upsertSection)

  // Pattern toggle state
  const [showGridPattern, setShowGridPattern] = useState(true)
  const [showDottedPattern, setShowDottedPattern] = useState(true)
  const [showDiagonalStripes, setShowDiagonalStripes] = useState(true)

  // Sync from DB
  useEffect(() => {
    if (headerSection) {
      setShowGridPattern(headerSection.showGridPattern !== false)
      setShowDottedPattern(headerSection.showDottedPattern !== false)
      setShowDiagonalStripes(headerSection.showDiagonalStripes !== false)
    }
  }, [headerSection])

  async function handleSavePatterns() {
    await upsertSection({
      requestorId: userId,
      id: headerSection?._id,
      pageSlug: "pricing",
      sectionSlug: "pricing-page-header",
      sectionType: "pricing-header",
      title: headerSection?.title ?? "",
      showGridPattern,
      showDottedPattern,
      showDiagonalStripes,
      isPublished: headerSection?.isPublished ?? false,
      sortOrder: headerSection?.sortOrder ?? 0,
    })
  }

  // Loading
  if (allSections === undefined || plans === undefined) {
    return (
      <div className="mx-auto w-full max-w-2xl p-comfort pt-8">
        <Skeleton className="mb-6 h-7 w-32" />
        <Skeleton className="mb-4 h-4 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="mb-2 h-12 w-full" />
        ))}
      </div>
    )
  }

  // Header section from pageContent
  const headerRecord = allSections.find(
    (s) => s.pageSlug === "pricing" && s.sectionSlug === "pricing-page-header"
  )

  // Build rows
  const rows: Array<{
    id: CmsSectionId
    label: string
    status: "published" | "draft" | "no-record"
    statusLabel: string
  }> = [
    {
      id: "pricing-header",
      label: "Header",
      status: headerRecord
        ? headerRecord.isPublished
          ? "published"
          : "draft"
        : "no-record",
      statusLabel: headerRecord
        ? headerRecord.isPublished
          ? "Published"
          : "Draft"
        : "Belum dibuat",
    },
    ...plans.map((plan) => ({
      id: `pricing-${plan.slug}` as CmsSectionId,
      label: plan.name,
      status: (plan.isDisabled ? "draft" : "published") as "published" | "draft",
      statusLabel: plan.isDisabled ? "Disabled" : "Active",
    })),
  ]

  const activeCount = rows.filter((r) => r.status === "published").length

  return (
    <div className="mx-auto w-full max-w-2xl p-comfort pt-8">
      {/* Page title */}
      <h2 className="text-narrative text-xl font-medium tracking-tight text-foreground">
        Pricing
      </h2>
      <div className="mt-2 border-t border-border" />

      {/* Summary */}
      <p className="mt-4 text-interface text-xs text-muted-foreground">
        {rows.length} sections{" "}
        <span className="mx-1 text-border">·</span>{" "}
        <span className="text-emerald-600">{activeCount} active</span>{" "}
        <span className="mx-1 text-border">·</span>{" "}
        <span>{rows.length - activeCount} draft/disabled</span>
      </p>

      {/* Section list */}
      <div className="mt-4 overflow-hidden rounded-action border border-border">
        {rows.map((row, i) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onSectionClick(row.id)}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
              i > 0 ? "border-t border-border" : ""
            }`}
          >
            {/* Status dot */}
            <span
              className={`h-2 w-2 min-w-2 rounded-full ${
                row.status === "published"
                  ? "bg-emerald-500 shadow-[0_0_6px] shadow-emerald-500/40"
                  : "bg-slate-400 dark:bg-slate-600"
              }`}
            />

            {/* Section name */}
            <span className="text-interface flex-1 text-sm font-medium text-foreground">
              {row.label}
            </span>

            {/* Status badge */}
            <span
              className={`text-signal text-[10px] font-bold uppercase tracking-widest ${
                row.status === "published"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground"
              }`}
            >
              {row.statusLabel}
            </span>

            {/* Arrow */}
            <NavArrowRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          </button>
        ))}
      </div>

      {/* Info: no published toggle */}
      <div className="mt-4 rounded-action border border-border bg-muted/50 px-4 py-3">
        <p className="text-interface text-xs leading-relaxed text-muted-foreground">
          Pricing plans tidak memiliki toggle published/unpublished karena terhubung langsung
          ke sistem billing. Gunakan toggle{" "}
          <span className="font-medium text-foreground">Disabled</span>{" "}
          pada masing-masing plan untuk menonaktifkan pembelian.
        </p>
      </div>

      {/* Info: hide pricing page */}
      <div className="mt-2 rounded-action border border-border bg-muted/50 px-4 py-3">
        <p className="text-interface text-xs leading-relaxed text-muted-foreground">
          Untuk menyembunyikan halaman Pricing dari navigasi, hapus atau sembunyikan link-nya
          di{" "}
          <button
            type="button"
            onClick={onNavigateToHeader}
            className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
          >
            Global Layout → Header
          </button>
          .
        </p>
      </div>

      {/* ── Background Patterns ── */}
      <div className="mt-6 border-t border-border" />
      <div className="mt-4 space-y-3">
        <span className="text-signal block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Background Patterns
        </span>
        <div className="flex items-center gap-3">
          <label className="text-interface text-xs font-medium text-muted-foreground">
            Grid Pattern
          </label>
          <Switch
            className="data-[state=checked]:bg-emerald-600"
            checked={showGridPattern}
            onCheckedChange={setShowGridPattern}
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-interface text-xs font-medium text-muted-foreground">
            Dotted Pattern
          </label>
          <Switch
            className="data-[state=checked]:bg-emerald-600"
            checked={showDottedPattern}
            onCheckedChange={setShowDottedPattern}
          />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-interface text-xs font-medium text-muted-foreground">
            Diagonal Stripes
          </label>
          <Switch
            className="data-[state=checked]:bg-emerald-600"
            checked={showDiagonalStripes}
            onCheckedChange={setShowDiagonalStripes}
          />
        </div>
        <CmsSaveButton onSave={handleSavePatterns} />
      </div>
    </div>
  )
}
