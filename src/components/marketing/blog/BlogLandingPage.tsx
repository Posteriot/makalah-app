"use client"

import { useMemo, useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { FilterList } from "iconoir-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { GridPattern, DottedPattern, DiagonalStripes } from "@/components/marketing/SectionBackground"
import { BlogFeedSection } from "./BlogFeedSection"
import { BlogFiltersPanel } from "./BlogFiltersPanel"
import { BlogHeadlineSection } from "./BlogHeadlineSection"
import { BlogNewsletterSection } from "./BlogNewsletterSection"
import {
  type BlogPost,
  type CategoryFilter,
  type CanonicalCategory,
  type SortFilter,
  type TimeRangeFilter,
} from "./types"
import { isInTimeRange, normalizeCategory } from "./utils"

export function BlogLandingPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("Semua")
  const [timeRangeFilter, setTimeRangeFilter] = useState<TimeRangeFilter>("all")
  const [sortFilter, setSortFilter] = useState<SortFilter>("newest")
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [expandedRowKey, setExpandedRowKey] = useState<string | null>(null)

  const posts = useQuery(api.blog.getPublishedPosts, { category: undefined, limit: 200 })
  const featuredPost = useQuery(api.blog.getFeaturedPost)
  const pageSettings = useQuery(api.pageContent.getSection, {
    pageSlug: "blog",
    sectionSlug: "blog-page-settings",
  })

  const allPosts = useMemo(() => (posts ?? []) as BlogPost[], [posts])

  const latestPost = useMemo(() => {
    if (!allPosts.length) return null
    return [...allPosts].sort((a, b) => b.publishedAt - a.publishedAt)[0]
  }, [allPosts])

  // Rule: featured menang; kalau tidak ada featured, latest menang.
  const headlinePost = (featuredPost ?? latestPost ?? null) as BlogPost | null
  const headlinePostId = headlinePost?._id ?? null

  const categoryCounts = useMemo(() => {
    return allPosts.reduce<Record<CanonicalCategory, number>>(
      (acc, post) => {
        const category = normalizeCategory(post.category, post.title, post.excerpt)
        acc[category] += 1
        return acc
      },
      { Update: 0, Tutorial: 0, Opini: 0, Event: 0 }
    )
  }, [allPosts])

  const feedPosts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    const filtered = allPosts
      .filter((post) => {
        const normalizedCategory = normalizeCategory(post.category, post.title, post.excerpt)

        if (categoryFilter !== "Semua" && normalizedCategory !== categoryFilter) return false
        if (!isInTimeRange(post.publishedAt, timeRangeFilter)) return false

        if (!query) return true

        const haystack = [post.title, post.excerpt, post.author, normalizedCategory]
          .join(" ")
          .toLowerCase()
        return haystack.includes(query)
      })

    const sorted = [...filtered].sort((a, b) =>
      sortFilter === "newest" ? b.publishedAt - a.publishedAt : a.publishedAt - b.publishedAt
    )

    if (!headlinePostId) return sorted

    const withoutHeadline = sorted.filter((post) => post._id !== headlinePostId)

    // Keep feed at 4 real rows when possible. If excluding headline leaves < 4,
    // include headline back from the filtered/sorted set.
    if (withoutHeadline.length < 4) {
      return sorted.slice(0, 4)
    }

    return withoutHeadline
  }, [allPosts, headlinePostId, categoryFilter, timeRangeFilter, searchQuery, sortFilter])

  const rowKeys = useMemo(
    () => feedPosts.map((post) => `post-${String(post._id)}`),
    [feedPosts]
  )
  const expandedRowKeyResolved =
    expandedRowKey && rowKeys.includes(expandedRowKey)
      ? expandedRowKey
      : null

  const isLoadingPosts = !posts

  return (
    <div className="bg-background text-foreground">
      <section className="relative isolate overflow-hidden border-b border-hairline bg-[color:var(--section-bg-alt)]">
        {/* Background patterns — conditional via CMS page-settings */}
        {pageSettings != null && pageSettings.showGridPattern !== false && <GridPattern className="z-0" />}
        {pageSettings != null && pageSettings.showDottedPattern !== false && <DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-100" />}
        {pageSettings != null && pageSettings.showDiagonalStripes !== false && <DiagonalStripes className="z-0" />}

        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-8 pt-[calc(var(--header-h)+16px)] md:px-8 md:pb-10 md:pt-[calc(var(--header-h)+20px)]">
          <div className="grid grid-cols-1 gap-comfort md:grid-cols-16">
            <aside className="hidden md:col-span-4 md:block">
              <div
                className="rounded-shell border-hairline bg-card/90 p-comfort backdrop-blur-[1px] dark:bg-slate-900"
                style={{ position: "sticky", top: "calc(var(--header-h) + 16px)" }}
              >
                <BlogFiltersPanel
                  searchQuery={searchQuery}
                  onSearchQueryChange={setSearchQuery}
                  categoryFilter={categoryFilter}
                  onCategoryFilterChange={setCategoryFilter}
                  timeRangeFilter={timeRangeFilter}
                  onTimeRangeFilterChange={setTimeRangeFilter}
                  sortFilter={sortFilter}
                  onSortFilterChange={setSortFilter}
                  allPostsCount={allPosts.length}
                  categoryCounts={categoryCounts}
                />
              </div>
            </aside>

            <div className="md:col-span-12">
              <div className="mb-5 flex justify-end md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(true)}
                  className="rounded-action p-1 text-foreground transition-colors hover:text-foreground/70"
                  aria-label="Buka filter"
                >
                  <FilterList className="h-7 w-7" strokeWidth={1.5} />
                </button>
              </div>

              <BlogHeadlineSection
                isLoading={isLoadingPosts}
                headlinePost={headlinePost}
                showDiagonalStripes={pageSettings?.showDiagonalStripes}
              />

              <div className="mt-4 mb-5 md:hidden">
                <p className="text-interface text-xs text-muted-foreground">
                  {isLoadingPosts ? "Memuat konten..." : `${feedPosts.length} konten`}
                </p>
              </div>

              <div className="mt-5 md:mt-7">
                <BlogFeedSection
                  isLoading={isLoadingPosts}
                  displayPosts={feedPosts}
                  expandedRowKeyResolved={expandedRowKeyResolved}
                  onExpandRow={(rowKey) => setExpandedRowKey(rowKey)}
                  onToggleRow={(rowKey) =>
                    setExpandedRowKey((currentKey) => (currentKey === rowKey ? null : rowKey))
                  }
                  showDiagonalStripes={pageSettings?.showDiagonalStripes}
                />
              </div>

              <BlogNewsletterSection />
            </div>
          </div>
        </div>

        <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
          <SheetContent side="right" className="w-[320px] p-5 sm:max-w-[320px]">
            <SheetHeader className="mb-4 p-0">
              <SheetTitle className="text-signal text-[10px] font-bold tracking-widest text-foreground">
                Filter Konten
              </SheetTitle>
            </SheetHeader>
            <BlogFiltersPanel
              mobile
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              categoryFilter={categoryFilter}
              onCategoryFilterChange={setCategoryFilter}
              timeRangeFilter={timeRangeFilter}
              onTimeRangeFilterChange={setTimeRangeFilter}
              sortFilter={sortFilter}
              onSortFilterChange={setSortFilter}
              allPostsCount={allPosts.length}
              categoryCounts={categoryCounts}
            />
          </SheetContent>
        </Sheet>
      </section>
    </div>
  )
}
