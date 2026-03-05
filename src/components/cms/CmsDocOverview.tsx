"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Doc } from "@convex/_generated/dataModel"
import type { Id } from "@convex/_generated/dataModel"
import type { DocGroupId } from "./CmsSidebar"
import { DOC_GROUPS } from "./CmsSidebar"
import { NavArrowRight } from "iconoir-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { CmsSaveButton } from "@/components/admin/cms/CmsSaveButton"

type CmsDocOverviewProps = {
  userId: Id<"users">
  onGroupClick: (groupId: DocGroupId) => void
  onNavigateToHeader: () => void
}

export function CmsDocOverview({ userId, onGroupClick, onNavigateToHeader }: CmsDocOverviewProps) {
  const allSections = useQuery(api.documentationSections.listAllSections, {
    requestorId: userId,
  })
  const pageSettings = useQuery(api.pageContent.getSection, {
    pageSlug: "docs",
    sectionSlug: "docs-page-settings",
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

  // Aggregate per group
  const rows = DOC_GROUPS.map((g) => {
    const articles = allSections.filter((s) => s.group === g.group)
    const publishedCount = articles.filter((s) => s.isPublished).length
    return {
      ...g,
      total: articles.length,
      published: publishedCount,
      draft: articles.length - publishedCount,
    }
  })

  const totalArticles = rows.reduce((sum, r) => sum + r.total, 0)
  const totalPublished = rows.reduce((sum, r) => sum + r.published, 0)

  return (
    <div className="mx-auto w-full max-w-2xl p-comfort pt-8">
      {/* Page title */}
      <h2 className="text-narrative text-xl font-medium tracking-tight text-foreground">
        Dokumentasi
      </h2>
      <div className="mt-2 border-t border-border" />

      {/* Summary */}
      <p className="mt-4 text-interface text-xs text-muted-foreground">
        {totalArticles} artikel{" "}
        <span className="mx-1 text-border">·</span>{" "}
        <span className="text-emerald-600">{totalPublished} published</span>{" "}
        <span className="mx-1 text-border">·</span>{" "}
        <span>{totalArticles - totalPublished} draft</span>
      </p>

      {/* Group list */}
      <div className="mt-4 overflow-hidden rounded-action border border-border">
        {rows.map((row, i) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onGroupClick(row.id)}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
              i > 0 ? "border-t border-border" : ""
            }`}
          >
            {/* Group name */}
            <span className="text-interface flex-1 text-sm font-medium text-foreground">
              {row.label}
            </span>

            {/* Article count */}
            <span className="text-interface text-xs text-muted-foreground">
              {row.total} artikel
              {row.published > 0 && (
                <span className="ml-1 text-emerald-600">
                  ({row.published} published)
                </span>
              )}
            </span>

            {/* Arrow */}
            <NavArrowRight className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          </button>
        ))}
      </div>

      {/* Info box */}
      <div className="mt-4 rounded-action border border-border bg-muted/50 px-4 py-3">
        <p className="text-interface text-xs leading-relaxed text-muted-foreground">
          Pilih grup untuk melihat dan mengelola artikel di dalamnya.
          Artikel berstatus Draft (unpublished) tidak akan tampil di halaman dokumentasi frontend.
        </p>
      </div>

      {/* Navigation hint */}
      <div className="mt-2 rounded-action border border-border bg-muted/50 px-4 py-3">
        <p className="text-interface text-xs leading-relaxed text-muted-foreground">
          Untuk menyembunyikan halaman Dokumentasi dari navigasi, hapus atau sembunyikan link-nya
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
      <PatternToggles
        key={pageSettings?._id ?? "default"}
        pageSettings={pageSettings}
        userId={userId}
        pageSlug="docs"
        sectionSlug="docs-page-settings"
      />
    </div>
  )
}

function PatternToggles({ pageSettings, userId, pageSlug, sectionSlug }: {
  pageSettings: Doc<"pageContent"> | null | undefined
  userId: Id<"users">
  pageSlug: string
  sectionSlug: string
}) {
  const upsertSection = useMutation(api.pageContent.upsertSection)
  const [showGridPattern, setShowGridPattern] = useState(pageSettings?.showGridPattern === true)
  const [showDottedPattern, setShowDottedPattern] = useState(pageSettings?.showDottedPattern !== false)
  const [showDiagonalStripes, setShowDiagonalStripes] = useState(pageSettings?.showDiagonalStripes === true)

  async function handleSave() {
    await upsertSection({
      requestorId: userId,
      id: pageSettings?._id,
      pageSlug,
      sectionSlug,
      sectionType: "page-settings",
      title: "",
      showGridPattern,
      showDottedPattern,
      showDiagonalStripes,
      isPublished: true,
      sortOrder: 0,
    })
  }

  return (
    <>
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
        <CmsSaveButton onSave={handleSave} />
      </div>
    </>
  )
}
