"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import type { BlogCategoryId } from "./CmsSidebar"
import { BLOG_CATEGORIES } from "./CmsSidebar"
import { NavArrowRight, Plus } from "iconoir-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { CmsSaveButton } from "@/components/admin/cms/CmsSaveButton"
import { normalizeCategory } from "@/components/marketing/blog/utils"

type CmsBlogOverviewProps = {
  userId: Id<"users">
  onCategoryClick: (categoryId: BlogCategoryId) => void
  onCreateNewPost: () => void
  onNavigateToHeader: () => void
}

export function CmsBlogOverview({ userId, onCategoryClick, onCreateNewPost, onNavigateToHeader }: CmsBlogOverviewProps) {
  const allPosts = useQuery(api.blog.listAllPosts, {
    requestorId: userId,
  })
  const pageSettings = useQuery(api.pageContent.getSection, {
    pageSlug: "blog",
    sectionSlug: "blog-page-settings",
  })
  const upsertSection = useMutation(api.pageContent.upsertSection)

  // Pattern toggle state — blog page default: only Dotted active
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
      pageSlug: "blog",
      sectionSlug: "blog-page-settings",
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
  if (allPosts === undefined) {
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

  // Aggregate per category (using normalizeCategory for consistency)
  const rows = BLOG_CATEGORIES.map((c) => {
    const posts = allPosts.filter(
      (p) => normalizeCategory(p.category, p.title, p.excerpt ?? "") === c.category
    )
    const publishedCount = posts.filter((p) => p.isPublished).length
    return {
      ...c,
      total: posts.length,
      published: publishedCount,
      draft: posts.length - publishedCount,
    }
  })

  const totalPosts = allPosts.length
  const totalPublished = allPosts.filter((p) => p.isPublished).length

  return (
    <div className="mx-auto w-full max-w-2xl p-comfort pt-8">
      {/* Page title */}
      <h2 className="text-narrative text-xl font-medium tracking-tight text-foreground">
        Blog
      </h2>
      <div className="mt-2 border-t border-border" />

      {/* Summary */}
      <p className="mt-4 text-interface text-xs text-muted-foreground">
        {totalPosts} post{" "}
        <span className="mx-1 text-border">·</span>{" "}
        <span className="text-emerald-600">{totalPublished} published</span>{" "}
        <span className="mx-1 text-border">·</span>{" "}
        <span>{totalPosts - totalPublished} draft</span>
      </p>

      {/* Category list */}
      <div className="mt-4 overflow-hidden rounded-action border border-border">
        {rows.map((row, i) => (
          <button
            key={row.id}
            type="button"
            onClick={() => onCategoryClick(row.id)}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
              i > 0 ? "border-t border-border" : ""
            }`}
          >
            {/* Category name */}
            <span className="text-interface flex-1 text-sm font-medium text-foreground">
              {row.label}
            </span>

            {/* Post count */}
            <span className="text-interface text-xs text-muted-foreground">
              {row.total} post
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
          Pilih kategori untuk melihat dan mengelola post di dalamnya.
          Post berstatus Draft (unpublished) tidak akan tampil di halaman blog frontend.
        </p>
      </div>

      {/* Navigation hint */}
      <div className="mt-2 rounded-action border border-border bg-muted/50 px-4 py-3">
        <p className="text-interface text-xs leading-relaxed text-muted-foreground">
          Untuk menyembunyikan halaman Blog dari navigasi, hapus atau sembunyikan link-nya
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

      {/* Global create button */}
      <button
        type="button"
        onClick={onCreateNewPost}
        className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-action border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
      >
        <Plus className="h-4 w-4" strokeWidth={1.5} />
        Buat Post Baru
      </button>

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
