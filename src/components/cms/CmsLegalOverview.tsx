"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import type { LegalPageId } from "./CmsSidebar"
import { NavArrowRight } from "iconoir-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { CmsSaveButton } from "@/components/admin/cms/CmsSaveButton"

const LEGAL_SLUGS: Array<{ id: LegalPageId; label: string; slug: string }> = [
  { id: "privacy", label: "Privacy Policy", slug: "privacy" },
  { id: "security", label: "Security", slug: "security" },
  { id: "terms", label: "Terms of Service", slug: "terms" },
]

type CmsLegalOverviewProps = {
  userId: Id<"users">
  onPageClick: (pageId: LegalPageId) => void
}

export function CmsLegalOverview({
  userId,
  onPageClick,
}: CmsLegalOverviewProps) {
  const allPages = useQuery(api.richTextPages.listAllPages, {
    requestorId: userId,
  })
  const pageSettings = useQuery(api.pageContent.getSection, {
    pageSlug: "legal",
    sectionSlug: "legal-page-settings",
  })
  const upsertSection = useMutation(api.pageContent.upsertSection)

  // Pattern toggle state — legal pages default: only Dotted active
  const [showGridPattern, setShowGridPattern] = useState(false)
  const [showDottedPattern, setShowDottedPattern] = useState(true)
  const [showDiagonalStripes, setShowDiagonalStripes] = useState(false)

  // Sync from DB
  useEffect(() => {
    if (pageSettings) {
      setShowGridPattern(pageSettings.showGridPattern === true)
      setShowDottedPattern(pageSettings.showDottedPattern !== false)
      setShowDiagonalStripes(pageSettings.showDiagonalStripes === true)
    }
  }, [pageSettings])

  async function handleSavePatterns() {
    await upsertSection({
      requestorId: userId,
      id: pageSettings?._id,
      pageSlug: "legal",
      sectionSlug: "legal-page-settings",
      sectionType: "page-settings",
      title: "",
      showGridPattern,
      showDottedPattern,
      showDiagonalStripes,
      isPublished: true,
      sortOrder: 0,
    })
  }

  // Loading
  if (allPages === undefined) {
    return (
      <div className="mx-auto w-full max-w-2xl p-comfort pt-8">
        <Skeleton className="mb-6 h-7 w-32" />
        <Skeleton className="mb-4 h-4 w-48" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="mb-2 h-12 w-full" />
        ))}
      </div>
    )
  }

  const pageMap = new Map(allPages.map((p) => [p.slug, p]))

  const rows = LEGAL_SLUGS.map((def) => {
    const record = pageMap.get(def.slug)
    return {
      ...def,
      isPublished: record?.isPublished ?? false,
      hasRecord: !!record,
    }
  })

  const publishedCount = rows.filter((r) => r.isPublished).length
  const draftCount = rows.length - publishedCount

  return (
    <div className="mx-auto w-full max-w-2xl p-comfort pt-8">
      {/* Page title */}
      <h2 className="text-narrative text-xl font-medium tracking-tight text-foreground">
        Legal
      </h2>
      <div className="mt-2 border-t border-border" />

      {/* Summary */}
      <p className="mt-4 text-interface text-xs text-muted-foreground">
        {rows.length} halaman{" "}
        <span className="mx-1 text-border">·</span>{" "}
        <span className="text-emerald-600">{publishedCount} published</span>{" "}
        <span className="mx-1 text-border">·</span>{" "}
        <span>{draftCount} draft</span>
      </p>

      {/* Page list */}
      <div className="mt-4 overflow-hidden rounded-action border border-border">
        {rows.map((row, i) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onPageClick(row.id)}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
              i > 0 ? "border-t border-border" : ""
            }`}
          >
            {/* Status dot */}
            <span
              className={`h-2 w-2 min-w-2 rounded-full ${
                row.isPublished
                  ? "bg-emerald-500 shadow-[0_0_6px] shadow-emerald-500/40"
                  : "bg-slate-400 dark:bg-slate-600"
              }`}
            />

            {/* Page name */}
            <span className="text-interface flex-1 text-sm font-medium text-foreground">
              {row.label}
            </span>

            {/* Status badge */}
            <span
              className={`text-signal text-[10px] font-bold uppercase tracking-widest ${
                row.isPublished
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground"
              }`}
            >
              {row.isPublished ? "Published" : row.hasRecord ? "Draft" : "Belum dibuat"}
            </span>

            {/* Arrow */}
            <NavArrowRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          </button>
        ))}
      </div>

      {/* Info box */}
      <div className="mt-4 rounded-action border border-border bg-muted/50 px-4 py-3">
        <p className="text-interface text-xs leading-relaxed text-muted-foreground">
          Halaman legal menggunakan editor TipTap (rich text). Halaman yang belum pernah
          disimpan di CMS akan menampilkan konten static bawaan. Halaman berstatus Draft
          (unpublished) juga tetap menampilkan konten static.
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
