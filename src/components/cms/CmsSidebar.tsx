"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FastArrowLeft, NavArrowRight, NavArrowLeft } from "iconoir-react"
import type { CmsPageId } from "./CmsActivityBar"

/**
 * Section identifiers for Home and About pages
 */
export type CmsSectionId =
  | "hero"
  | "benefits"
  | "features-workflow"
  | "features-refrasa"
  | "manifesto"
  | "problems"
  | "agents"
  | "career-contact"

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

const HOME_SECTIONS: Array<{ id: CmsSectionId; label: string }> = [
  { id: "hero", label: "Hero" },
  { id: "benefits", label: "Benefits" },
  { id: "features-workflow", label: "Fitur: Workflow" },
  { id: "features-refrasa", label: "Fitur: Refrasa" },
]

const ABOUT_SECTIONS: Array<{ id: CmsSectionId; label: string }> = [
  { id: "manifesto", label: "Manifesto" },
  { id: "problems", label: "Problems" },
  { id: "agents", label: "Agents" },
  { id: "career-contact", label: "Karier & Kontak" },
]

const DOC_GROUPS: Array<{ id: DocGroupId; label: string; group: string }> = [
  { id: "doc-mulai", label: "Mulai", group: "Mulai" },
  { id: "doc-fitur-utama", label: "Fitur Utama", group: "Fitur Utama" },
  { id: "doc-subskripsi", label: "Subskripsi", group: "Subskripsi" },
  { id: "doc-panduan-lanjutan", label: "Panduan Lanjutan", group: "Panduan Lanjutan" },
]

const BLOG_CATEGORIES: Array<{ id: BlogCategoryId; label: string; category: string }> = [
  { id: "blog-update", label: "Update", category: "Update" },
  { id: "blog-tutorial", label: "Tutorial", category: "Tutorial" },
  { id: "blog-opini", label: "Opini", category: "Opini" },
  { id: "blog-event", label: "Event", category: "Event" },
]

const PAGE_TITLES: Record<CmsPageId, string> = {
  home: "Home",
  about: "About",
  documentation: "Dokumentasi",
  blog: "Blog",
  privacy: "Privacy",
  security: "Security",
  terms: "Terms",
  header: "Header",
  footer: "Footer",
}

interface CmsSidebarProps {
  activePage: CmsPageId | null
  activeSection: CmsSectionId | null
  onSectionChange: (section: CmsSectionId) => void

  // Documentation drill-down
  activeDocGroup: DocGroupId | null
  onDocGroupChange: (group: DocGroupId | null) => void
  selectedDocSlug: string | null
  onDocSlugChange: (slug: string | null) => void
  onDocCreateNew: () => void

  // Blog drill-down
  activeBlogCategory: BlogCategoryId | null
  onBlogCategoryChange: (category: BlogCategoryId | null) => void
  selectedBlogSlug: string | null
  onBlogSlugChange: (slug: string | null) => void
  onBlogCreateNew: () => void

  // Sidebar chrome
  onCollapseSidebar: () => void
  className?: string
}

/**
 * CmsSidebar - Dynamic sidebar for CMS layout
 *
 * Shows different content based on the active CMS page:
 * - Home / About: Simple section list with active indicator
 * - Documentation: Group drill-down (groups -> back button when selected)
 * - Blog: Category drill-down (categories -> back button when selected)
 * - Other pages: Empty state (editor loads in main area)
 * - No page selected: Placeholder message
 */
export function CmsSidebar({
  activePage,
  activeSection,
  onSectionChange,
  activeDocGroup,
  onDocGroupChange,
  selectedDocSlug: _selectedDocSlug,
  onDocSlugChange: _onDocSlugChange,
  onDocCreateNew: _onDocCreateNew,
  activeBlogCategory,
  onBlogCategoryChange,
  selectedBlogSlug: _selectedBlogSlug,
  onBlogSlugChange: _onBlogSlugChange,
  onBlogCreateNew: _onBlogCreateNew,
  onCollapseSidebar,
  className,
}: CmsSidebarProps) {
  // Render section list for Home or About pages
  function renderSectionList(sections: Array<{ id: CmsSectionId; label: string }>) {
    return (
      <div className="flex flex-col gap-dense">
        {sections.map((section) => {
          const isActive = activeSection === section.id
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => onSectionChange(section.id)}
              className={cn(
                "text-interface w-full rounded-action px-3 py-1.5 text-left text-sm transition-colors duration-50",
                isActive
                  ? "border-l-2 border-amber-500 bg-muted/30 text-foreground"
                  : "cursor-pointer border-l-2 border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {section.label}
            </button>
          )
        })}
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
        <div className="flex flex-col gap-dense">
          <button
            type="button"
            onClick={() => onItemChange(null)}
            className={cn(
              "text-interface flex w-full items-center gap-2 rounded-action px-3 py-1.5 text-left text-sm",
              "cursor-pointer text-muted-foreground transition-colors duration-50 hover:bg-muted/50 hover:text-foreground"
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
      <div className="flex flex-col gap-dense">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemChange(item.id)}
            className={cn(
              "text-interface flex w-full items-center justify-between rounded-action px-3 py-1.5 text-left text-sm",
              "cursor-pointer border-l-2 border-transparent text-muted-foreground transition-colors duration-50 hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <span>{item.label}</span>
            <NavArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/60" strokeWidth={1.5} />
          </button>
        ))}
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
          <div className="px-2 py-3">
            {renderSectionList(HOME_SECTIONS)}
          </div>
        )
      case "about":
        return (
          <div className="px-2 py-3">
            {renderSectionList(ABOUT_SECTIONS)}
          </div>
        )
      case "documentation":
        return (
          <div className="px-2 py-3">
            {renderDrillDownList(DOC_GROUPS, activeDocGroup, onDocGroupChange)}
          </div>
        )
      case "blog":
        return (
          <div className="px-2 py-3">
            {renderDrillDownList(BLOG_CATEGORIES, activeBlogCategory, onBlogCategoryChange)}
          </div>
        )
      // Pages without sections: privacy, security, terms, header, footer
      default:
        return (
          <div className="flex flex-1 items-center justify-center px-3">
            <p className="text-interface text-center text-sm text-muted-foreground">
              Editor loaded
            </p>
          </div>
        )
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
      {/* Header with page title and collapse button */}
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-300/90 px-3 dark:border-slate-700/80">
        <h3 className="text-interface text-sm font-medium text-foreground truncate">
          {activePage ? PAGE_TITLES[activePage] : "CMS"}
        </h3>
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

      {/* Dynamic content area */}
      <div className="flex flex-1 flex-col overflow-y-auto">
        {renderContent()}
      </div>
    </aside>
  )
}

export default CmsSidebar
