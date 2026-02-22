"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import type { CmsSectionId } from "./CmsSidebar"
import { NavArrowRight } from "iconoir-react"
import { Skeleton } from "@/components/ui/skeleton"

type SectionDef = {
  id: CmsSectionId
  label: string
}

type CmsPageOverviewProps = {
  pageTitle: string
  pageSlug: string
  sections: SectionDef[]
  userId: Id<"users">
  onSectionClick: (sectionId: CmsSectionId) => void
}

export function CmsPageOverview({
  pageTitle,
  pageSlug,
  sections,
  userId,
  onSectionClick,
}: CmsPageOverviewProps) {
  const allSections = useQuery(api.pageContent.listAllSections, {
    requestorId: userId,
  })

  // Loading
  if (allSections === undefined) {
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

  // Match section defs with DB records
  const pageSections = allSections.filter((s) => s.pageSlug === pageSlug)
  const sectionMap = new Map(pageSections.map((s) => [s.sectionSlug, s]))

  const rows = sections.map((def) => {
    const record = sectionMap.get(def.id)
    return {
      ...def,
      isPublished: record?.isPublished ?? false,
      hasRecord: !!record,
      updatedAt: record?.updatedAt,
    }
  })

  const publishedCount = rows.filter((r) => r.isPublished).length
  const draftCount = rows.length - publishedCount

  return (
    <div className="mx-auto w-full max-w-2xl p-comfort pt-8">
      {/* Page title */}
      <h2 className="text-narrative text-xl font-medium tracking-tight text-foreground">
        {pageTitle}
      </h2>
      <div className="mt-2 border-t border-border" />

      {/* Summary */}
      <p className="mt-4 text-interface text-xs text-muted-foreground">
        {rows.length} sections{" "}
        <span className="mx-1 text-border">·</span>{" "}
        <span className="text-emerald-600">{publishedCount} published</span>{" "}
        <span className="mx-1 text-border">·</span>{" "}
        <span>{draftCount} draft</span>
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
                row.isPublished
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
          Section yang belum pernah disimpan di CMS akan menampilkan konten static bawaan.
          Section berstatus Draft (unpublished) akan disembunyikan dari frontend.
        </p>
      </div>
    </div>
  )
}
