"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FastArrowLeft, NavArrowRight, NavArrowLeft } from "iconoir-react"
import { normalizeCategory } from "@/components/marketing/blog/utils"
import type { CmsPageId } from "./CmsActivityBar"

/**
 * Section identifiers for Home and About pages
 */
export type CmsSectionId =
  | "hero"
  | "benefits"
  | "features-workflow"
  | "features-refrasa"
  | "pricing-teaser"
  | "manifesto"
  | "problems"
  | "agents"
  | "career-contact"
  | "pricing-header"
  | "pricing-gratis"
  | "pricing-bpp"
  | "pricing-pro"

/**
 * Legal sub-page identifiers (children of "legal" parent)
 */
export type LegalPageId = "privacy" | "security" | "terms"

/**
 * Global layout sub-page identifiers (children of "global-layout" parent)
 */
export type GlobalLayoutPageId = "header" | "footer"

/**
 * Documentation group identifiers for drill-down navigation
 */
export type DocGroupId =
  | "doc-mulai"
  | "doc-fitur-utama"
  | "doc-subskripsi"
  | "doc-panduan-lanjutan"

/**
 * Blog category identifiers for drill-down navigation
 */
export type BlogCategoryId =
  | "blog-update"
  | "blog-tutorial"
  | "blog-opini"
  | "blog-event"

// -- Navigation data --

export const HOME_SECTIONS: Array<{ id: CmsSectionId; label: string }> = [
  { id: "hero", label: "Hero" },
  { id: "benefits", label: "Benefits" },
  { id: "features-workflow", label: "Fitur: Workflow" },
  { id: "features-refrasa", label: "Fitur: Refrasa" },
  { id: "pricing-teaser", label: "Pricing Teaser" },
]

export const ABOUT_SECTIONS: Array<{ id: CmsSectionId; label: string }> = [
  { id: "manifesto", label: "Manifesto" },
  { id: "problems", label: "Problems" },
  { id: "agents", label: "Agents" },
  { id: "career-contact", label: "Karier & Kontak" },
]

export const PRICING_SECTIONS: Array<{ id: CmsSectionId; label: string }> = [
  { id: "pricing-header", label: "Header" },
  { id: "pricing-gratis", label: "Gratis" },
  { id: "pricing-bpp", label: "Bayar Per Paper" },
  { id: "pricing-pro", label: "Pro" },
]

const LEGAL_PAGES: Array<{ id: LegalPageId; label: string }> = [
  { id: "privacy", label: "Privacy" },
  { id: "security", label: "Security" },
  { id: "terms", label: "Terms" },
]

const GLOBAL_LAYOUT_PAGES: Array<{ id: GlobalLayoutPageId; label: string }> = [
  { id: "header", label: "Header" },
  { id: "footer", label: "Footer" },
]

export const DOC_GROUPS: Array<{ id: DocGroupId; label: string; group: string }> = [
  { id: "doc-mulai", label: "Mulai", group: "Mulai" },
  { id: "doc-fitur-utama", label: "Fitur Utama", group: "Fitur Utama" },
  { id: "doc-subskripsi", label: "Subskripsi", group: "Subskripsi" },
  { id: "doc-panduan-lanjutan", label: "Panduan Lanjutan", group: "Panduan Lanjutan" },
]

export const BLOG_CATEGORIES: Array<{ id: BlogCategoryId; label: string; category: string }> = [
  { id: "blog-update", label: "Update", category: "Update" },
  { id: "blog-tutorial", label: "Tutorial", category: "Tutorial" },
  { id: "blog-opini", label: "Opini", category: "Opini" },
  { id: "blog-event", label: "Event", category: "Event" },
]

const PAGE_TITLES: Record<CmsPageId, string> = {
  home: "Home",
  about: "About",
  pricing: "Pricing",
  documentation: "Dokumentasi",
  blog: "Blog",
  legal: "Legal",
  "global-layout": "Global Layout",
}

interface CmsSidebarProps {
  userId: Id<"users">
  activePage: CmsPageId | null
  activeSection: CmsSectionId | null
  onSectionChange: (section: CmsSectionId) => void

  // Legal sub-page
  activeLegalPage: LegalPageId | null
  onLegalPageChange: (page: LegalPageId) => void

  // Global layout sub-page
  activeGlobalLayoutPage: GlobalLayoutPageId | null
  onGlobalLayoutPageChange: (page: GlobalLayoutPageId) => void

  // Documentation drill-down
  activeDocGroup: DocGroupId | null
  onDocGroupChange: (group: DocGroupId | null) => void
  selectedDocSlug: string | null
  onDocSlugChange: (slug: string | null) => void

  // Blog drill-down
  activeBlogCategory: BlogCategoryId | null
  onBlogCategoryChange: (category: BlogCategoryId | null) => void
  selectedBlogSlug: string | null
  onBlogSlugChange: (slug: string | null) => void

  // Sidebar chrome
  onCollapseSidebar: () => void
  onResetToOverview: () => void
  className?: string
}

/**
 * Chat-style item classes (mimics SidebarChatHistory conversation items)
 */
function getItemClasses(isActive: boolean) {
  return cn(
    "group mx-1 my-0.5 flex w-[calc(100%-0.5rem)] items-center rounded-action border px-2.5 py-2.5 text-left text-sm transition-colors",
    "border-transparent font-sans",
    isActive
      ? "border-slate-300/90 bg-slate-50 shadow-[inset_0_1px_0_var(--border-hairline-soft)] dark:border-slate-700 dark:bg-slate-900/60"
      : "cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-600/60"
  )
}

/**
 * CmsSidebar - Dynamic sidebar for CMS layout
 *
 * Header is always "Content Manager" (static).
 * Page title shown above child items in the content area.
 * Active items use chat conversation history styling (border + bg, no amber stripe).
 */
export function CmsSidebar({
  userId,
  activePage,
  activeSection,
  onSectionChange,
  activeLegalPage,
  onLegalPageChange,
  activeGlobalLayoutPage,
  onGlobalLayoutPageChange,
  activeDocGroup,
  onDocGroupChange,
  selectedDocSlug,
  onDocSlugChange,
  activeBlogCategory,
  onBlogCategoryChange,
  selectedBlogSlug,
  onBlogSlugChange,
  onCollapseSidebar,
  onResetToOverview,
  className,
}: CmsSidebarProps) {
  // Render section list for Home or About pages
  function renderSectionList(sections: Array<{ id: CmsSectionId; label: string }>) {
    return (
      <div className="flex flex-col">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => onSectionChange(section.id)}
            className={getItemClasses(activeSection === section.id)}
          >
            <span className="truncate">{section.label}</span>
          </button>
        ))}
      </div>
    )
  }

  // Render simple sub-page list (Legal, Global Layout)
  function renderSubPageList<T extends string>(
    items: Array<{ id: T; label: string }>,
    activeItem: T | null,
    onItemChange: (item: T) => void
  ) {
    return (
      <div className="flex flex-col">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemChange(item.id)}
            className={getItemClasses(activeItem === item.id)}
          >
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </div>
    )
  }

  // Render drill-down group list (Documentation or Blog)
  function renderDrillDownList<T extends string>(
    items: Array<{ id: T; label: string }>,
    activeItem: T | null,
    onItemChange: (item: T | null) => void
  ) {
    // If a group/category is selected, show back button + label
    if (activeItem !== null) {
      const selectedItem = items.find((item) => item.id === activeItem)
      return (
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => onItemChange(null)}
            className={cn(
              "group mx-1 my-0.5 flex w-[calc(100%-0.5rem)] items-center gap-2 rounded-action border border-transparent px-2.5 py-2.5 text-left text-sm",
              "cursor-pointer font-sans transition-colors hover:bg-slate-300 dark:hover:bg-slate-600/60"
            )}
          >
            <NavArrowLeft className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            <span className="truncate">{selectedItem?.label}</span>
          </button>
        </div>
      )
    }

    // Show the list of groups/categories
    return (
      <div className="flex flex-col">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemChange(item.id)}
            className={cn(
              "group mx-1 my-0.5 flex w-[calc(100%-0.5rem)] items-center justify-between rounded-action border border-transparent px-2.5 py-2.5 text-left text-sm",
              "cursor-pointer font-sans transition-colors hover:bg-slate-300 dark:hover:bg-slate-600/60"
            )}
          >
            <span>{item.label}</span>
            <NavArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/60" strokeWidth={1.5} />
          </button>
        ))}
      </div>
    )
  }

  // Query doc articles when a group is selected
  const docGroupName = activeDocGroup
    ? DOC_GROUPS.find((g) => g.id === activeDocGroup)?.group ?? null
    : null
  const docSections = useQuery(
    api.documentationSections.listAllSections,
    activePage === "documentation" && activeDocGroup
      ? { requestorId: userId }
      : "skip"
  )

  // Render documentation drill-down with article children
  function renderDocDrillDown() {
    // No group selected — show group list
    if (activeDocGroup === null) {
      return renderDrillDownList(DOC_GROUPS, activeDocGroup, onDocGroupChange)
    }

    const selectedGroup = DOC_GROUPS.find((g) => g.id === activeDocGroup)
    const groupArticles = docSections
      ?.filter((s) => s.group === docGroupName)
      .sort((a, b) => a.order - b.order) ?? []

    return (
      <div className="flex flex-col">
        {/* Back button */}
        <button
          type="button"
          onClick={() => {
            onDocGroupChange(null)
            onDocSlugChange(null)
          }}
          className={cn(
            "group mx-1 my-0.5 flex w-[calc(100%-0.5rem)] items-center gap-2 rounded-action border border-transparent px-2.5 py-2.5 text-left text-sm",
            "cursor-pointer font-sans transition-colors hover:bg-slate-300 dark:hover:bg-slate-600/60"
          )}
        >
          <NavArrowLeft className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          <span className="truncate">{selectedGroup?.label}</span>
        </button>

        {/* Separator */}
        <div className="mx-3 my-1 border-t border-slate-300/50 dark:border-slate-700/50" />

        {/* Article list */}
        {groupArticles.map((article) => (
          <button
            key={article._id}
            type="button"
            onClick={() => onDocSlugChange(article.slug)}
            className={getItemClasses(selectedDocSlug === article.slug)}
          >
            <span className="truncate">{article.title}</span>
          </button>
        ))}

        {groupArticles.length === 0 && docSections !== undefined && (
          <p className="mx-3 my-2 text-xs text-muted-foreground">
            Belum ada artikel
          </p>
        )}
      </div>
    )
  }

  // Query blog posts when a category is selected
  const blogCategoryName = activeBlogCategory
    ? BLOG_CATEGORIES.find((c) => c.id === activeBlogCategory)?.category ?? null
    : null
  const blogPosts = useQuery(
    api.blog.listAllPosts,
    activePage === "blog" && activeBlogCategory
      ? { requestorId: userId }
      : "skip"
  )

  // Render blog drill-down with post children
  function renderBlogDrillDown() {
    // No category selected — show category list
    if (activeBlogCategory === null) {
      return renderDrillDownList(BLOG_CATEGORIES, activeBlogCategory, onBlogCategoryChange)
    }

    const selectedCategory = BLOG_CATEGORIES.find((c) => c.id === activeBlogCategory)
    const categoryPosts = blogPosts
      ?.filter((p) => normalizeCategory(p.category, p.title, p.excerpt ?? "") === blogCategoryName) ?? []

    return (
      <div className="flex flex-col">
        {/* Back button */}
        <button
          type="button"
          onClick={() => {
            onBlogCategoryChange(null)
            onBlogSlugChange(null)
          }}
          className={cn(
            "group mx-1 my-0.5 flex w-[calc(100%-0.5rem)] items-center gap-2 rounded-action border border-transparent px-2.5 py-2.5 text-left text-sm",
            "cursor-pointer font-sans transition-colors hover:bg-slate-300 dark:hover:bg-slate-600/60"
          )}
        >
          <NavArrowLeft className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          <span className="truncate">{selectedCategory?.label}</span>
        </button>

        {/* Separator */}
        <div className="mx-3 my-1 border-t border-slate-300/50 dark:border-slate-700/50" />

        {/* Post list */}
        {categoryPosts.map((post) => (
          <button
            key={post._id}
            type="button"
            onClick={() => onBlogSlugChange(post.slug)}
            className={getItemClasses(selectedBlogSlug === post.slug)}
          >
            <span className="truncate">{post.title}</span>
          </button>
        ))}

        {categoryPosts.length === 0 && blogPosts !== undefined && (
          <p className="mx-3 my-2 text-xs text-muted-foreground">
            Belum ada post
          </p>
        )}
      </div>
    )
  }

  // Render sidebar content based on active page
  function renderContent() {
    if (activePage === null) {
      return (
        <div className="flex flex-1 items-center justify-center px-3">
          <p className="text-interface text-center text-sm text-muted-foreground">
            Pilih halaman untuk mulai editing
          </p>
        </div>
      )
    }

    switch (activePage) {
      case "home":
        return (
          <div className="py-1">
            {renderSectionList(HOME_SECTIONS)}
          </div>
        )
      case "about":
        return (
          <div className="py-1">
            {renderSectionList(ABOUT_SECTIONS)}
          </div>
        )
      case "pricing":
        return (
          <div className="py-1">
            {renderSectionList(PRICING_SECTIONS)}
          </div>
        )
      case "legal":
        return (
          <div className="py-1">
            {renderSubPageList(LEGAL_PAGES, activeLegalPage, onLegalPageChange)}
          </div>
        )
      case "global-layout":
        return (
          <div className="py-1">
            {renderSubPageList(GLOBAL_LAYOUT_PAGES, activeGlobalLayoutPage, onGlobalLayoutPageChange)}
          </div>
        )
      case "documentation":
        return (
          <div className="py-1">
            {renderDocDrillDown()}
          </div>
        )
      case "blog":
        return (
          <div className="py-1">
            {renderBlogDrillDown()}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <aside
      className={cn(
        "flex h-full flex-col overflow-hidden",
        "border-r border-slate-300/50 bg-slate-50 dark:border-slate-700/80 dark:bg-slate-800",
        className
      )}
    >
      {/* Header — clickable "Content Manager" title + collapse button */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-300/90 px-3 dark:border-slate-700/80">
        <button
          type="button"
          onClick={onResetToOverview}
          className="text-interface text-sm font-medium text-foreground truncate transition-colors hover:text-primary"
        >
          Content Manager
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 rounded-action text-muted-foreground hover:text-foreground"
          onClick={onCollapseSidebar}
          aria-label="Collapse sidebar"
        >
          <FastArrowLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Page title label (above child items) */}
      {activePage && (
        <div className="shrink-0 px-3 pt-3 pb-1">
          <span className="text-signal text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {PAGE_TITLES[activePage]}
          </span>
        </div>
      )}

      {/* Dynamic content area */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {renderContent()}
      </div>
    </aside>
  )
}

export default CmsSidebar
