"use client"

import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { CmsActivityBar } from "./CmsActivityBar"
import { CmsTopBar } from "./CmsTopBar"
import { CmsSidebar } from "./CmsSidebar"
import { PanelResizer } from "@/components/ui/PanelResizer"
import type { Id } from "../../../convex/_generated/dataModel"
import type { CmsPageId } from "./CmsActivityBar"
import type { CmsSectionId, LegalPageId, GlobalLayoutPageId, DocGroupId, BlogCategoryId } from "./CmsSidebar"

import { HeroSectionEditor } from "@/components/admin/cms/HeroSectionEditor"
import { BenefitsSectionEditor } from "@/components/admin/cms/BenefitsSectionEditor"
import { FeatureShowcaseEditor } from "@/components/admin/cms/FeatureShowcaseEditor"
import { HeaderConfigEditor } from "@/components/admin/cms/HeaderConfigEditor"
import { FooterConfigEditor } from "@/components/admin/cms/FooterConfigEditor"
import { RichTextPageEditor } from "@/components/admin/cms/RichTextPageEditor"
import { ManifestoSectionEditor } from "@/components/admin/cms/ManifestoSectionEditor"
import { ProblemsSectionEditor } from "@/components/admin/cms/ProblemsSectionEditor"
import { AgentsSectionEditor } from "@/components/admin/cms/AgentsSectionEditor"
import { CareerContactEditor } from "@/components/admin/cms/CareerContactEditor"
import { DocSectionListEditor } from "@/components/admin/cms/DocSectionListEditor"
import { DocSectionEditor } from "@/components/admin/cms/DocSectionEditor"
import { BlogPostListEditor } from "@/components/admin/cms/BlogPostListEditor"
import { BlogPostEditor } from "@/components/admin/cms/BlogPostEditor"
import { PricingPlanEditor } from "@/components/admin/cms/PricingPlanEditor"
import { PricingHeaderEditor } from "@/components/admin/cms/PricingHeaderEditor"

/**
 * CmsShell - 4-column CSS Grid orchestrator for CMS layout
 *
 * Grid structure:
 * - Column 1: Activity Bar (48px fixed)
 * - Column 2: Sidebar (280px default, resizable)
 * - Column 3: Resizer (2px)
 * - Column 4: Main Content (1fr)
 */

interface CmsShellProps {
  userId: Id<"users">
}

// Default dimensions
const DEFAULT_SIDEBAR_WIDTH = 280
const MIN_SIDEBAR_WIDTH = 180
const COLLAPSE_THRESHOLD = 100

export function CmsShell({ userId }: CmsShellProps) {
  // Layout state
  const [activePage, setActivePage] = useState<CmsPageId | null>(null)
  const [activeSection, setActiveSection] = useState<CmsSectionId | null>(null)
  const [activeLegalPage, setActiveLegalPage] = useState<LegalPageId | null>(null)
  const [activeGlobalLayoutPage, setActiveGlobalLayoutPage] = useState<GlobalLayoutPageId | null>(null)
  const [activeDocGroup, setActiveDocGroup] = useState<DocGroupId | null>(null)
  const [selectedDocSlug, setSelectedDocSlug] = useState<string | null>(null)
  const [activeBlogCategory, setActiveBlogCategory] = useState<BlogCategoryId | null>(null)
  const [selectedBlogSlug, setSelectedBlogSlug] = useState<string | null>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH)

  // Reset all drill-down state when page changes
  const handlePageChange = useCallback((page: CmsPageId) => {
    setActivePage(page)
    setActiveSection(null)
    setActiveLegalPage(null)
    setActiveGlobalLayoutPage(null)
    setActiveDocGroup(null)
    setSelectedDocSlug(null)
    setActiveBlogCategory(null)
    setSelectedBlogSlug(null)
  }, [])

  // Calculate max width (50% of viewport)
  const getMaxWidth = useCallback(() => {
    if (typeof window === "undefined") return 600
    return window.innerWidth * 0.5
  }, [])

  // Sidebar resize handler
  const handleSidebarResize = useCallback(
    (delta: number) => {
      setSidebarWidth((prev) => {
        const newWidth = prev + delta
        const maxWidth = getMaxWidth()

        // Check collapse threshold
        if (newWidth < COLLAPSE_THRESHOLD) {
          setIsSidebarCollapsed(true)
          return MIN_SIDEBAR_WIDTH
        }

        // Ensure not collapsed
        if (isSidebarCollapsed && newWidth >= COLLAPSE_THRESHOLD) {
          setIsSidebarCollapsed(false)
        }

        // Clamp to min/max
        return Math.max(MIN_SIDEBAR_WIDTH, Math.min(newWidth, maxWidth))
      })
    },
    [getMaxWidth, isSidebarCollapsed]
  )

  // Reset sidebar to default
  const handleSidebarReset = useCallback(() => {
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH)
    setIsSidebarCollapsed(false)
  }, [])

  // Sidebar toggle handler
  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev)
  }, [])

  // Editor routing based on page + section + drill-down state
  function renderEditor() {
    // Home sections
    if (activePage === "home" && activeSection === "hero") return <HeroSectionEditor userId={userId} />
    if (activePage === "home" && activeSection === "benefits") return <BenefitsSectionEditor userId={userId} />
    if (activePage === "home" && activeSection === "features-workflow") return <FeatureShowcaseEditor pageSlug="home" sectionSlug="features-workflow" userId={userId} />
    if (activePage === "home" && activeSection === "features-refrasa") return <FeatureShowcaseEditor pageSlug="home" sectionSlug="features-refrasa" userId={userId} />
    if (activePage === "home" && activeSection === "pricing-teaser") return <PricingHeaderEditor pageSlug="home" sectionSlug="pricing-teaser" userId={userId} />

    // About sections
    if (activePage === "about" && activeSection === "manifesto") return <ManifestoSectionEditor userId={userId} />
    if (activePage === "about" && activeSection === "problems") return <ProblemsSectionEditor userId={userId} />
    if (activePage === "about" && activeSection === "agents") return <AgentsSectionEditor userId={userId} />
    if (activePage === "about" && activeSection === "career-contact") return <CareerContactEditor userId={userId} />

    // Pricing sections
    if (activePage === "pricing" && activeSection === "pricing-header") return <PricingHeaderEditor pageSlug="pricing" sectionSlug="pricing-page-header" userId={userId} />
    if (activePage === "pricing" && activeSection === "pricing-gratis") return <PricingPlanEditor slug="gratis" userId={userId} />
    if (activePage === "pricing" && activeSection === "pricing-bpp") return <PricingPlanEditor slug="bpp" userId={userId} />
    if (activePage === "pricing" && activeSection === "pricing-pro") return <PricingPlanEditor slug="pro" userId={userId} />

    // Legal sub-pages
    if (activePage === "legal" && activeLegalPage === "privacy") return <RichTextPageEditor slug="privacy" userId={userId} />
    if (activePage === "legal" && activeLegalPage === "security") return <RichTextPageEditor slug="security" userId={userId} />
    if (activePage === "legal" && activeLegalPage === "terms") return <RichTextPageEditor slug="terms" userId={userId} />

    // Global layout sub-pages
    if (activePage === "global-layout" && activeGlobalLayoutPage === "header") return <HeaderConfigEditor userId={userId} />
    if (activePage === "global-layout" && activeGlobalLayoutPage === "footer") return <FooterConfigEditor userId={userId} />

    // Documentation drill-down
    if (activePage === "documentation" && activeDocGroup && !selectedDocSlug) {
      const groupMap: Record<string, string> = {
        "doc-mulai": "Mulai",
        "doc-fitur-utama": "Fitur Utama",
        "doc-subskripsi": "Subskripsi",
        "doc-panduan-lanjutan": "Panduan Lanjutan",
      }
      return (
        <DocSectionListEditor
          userId={userId}
          group={groupMap[activeDocGroup]}
          onSelectSection={(slug) => setSelectedDocSlug(slug)}
          onCreateNew={() => setSelectedDocSlug("__new__")}
        />
      )
    }
    if (activePage === "documentation" && selectedDocSlug) {
      return (
        <DocSectionEditor
          slug={selectedDocSlug === "__new__" ? null : selectedDocSlug}
          userId={userId}
          onBack={() => setSelectedDocSlug(null)}
        />
      )
    }

    // Blog drill-down
    if (activePage === "blog" && activeBlogCategory && !selectedBlogSlug) {
      const categoryMap: Record<string, string> = {
        "blog-update": "Update",
        "blog-tutorial": "Tutorial",
        "blog-opini": "Opini",
        "blog-event": "Event",
      }
      return (
        <BlogPostListEditor
          userId={userId}
          category={categoryMap[activeBlogCategory]}
          onSelectPost={(slug) => setSelectedBlogSlug(slug)}
          onCreateNew={() => setSelectedBlogSlug("__new__")}
        />
      )
    }
    if (activePage === "blog" && selectedBlogSlug) {
      return (
        <BlogPostEditor
          slug={selectedBlogSlug === "__new__" ? null : selectedBlogSlug}
          userId={userId}
          onBack={() => setSelectedBlogSlug(null)}
        />
      )
    }

    // Empty states for pages that need child selection
    if (activePage === "home" && !activeSection) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-interface text-sm text-muted-foreground">
            Pilih section dari sidebar untuk mulai editing
          </p>
        </div>
      )
    }
    if (activePage === "about" && !activeSection) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-interface text-sm text-muted-foreground">
            Pilih section dari sidebar untuk mulai editing
          </p>
        </div>
      )
    }
    if (activePage === "pricing" && !activeSection) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-interface text-sm text-muted-foreground">
            Pilih paket dari sidebar untuk mulai editing
          </p>
        </div>
      )
    }
    if (activePage === "legal" && !activeLegalPage) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-interface text-sm text-muted-foreground">
            Pilih halaman dari sidebar untuk mulai editing
          </p>
        </div>
      )
    }
    if (activePage === "global-layout" && !activeGlobalLayoutPage) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-interface text-sm text-muted-foreground">
            Pilih komponen dari sidebar untuk mulai editing
          </p>
        </div>
      )
    }
    if (activePage === "documentation" && !activeDocGroup) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-interface text-sm text-muted-foreground">
            Pilih grup dokumentasi dari sidebar
          </p>
        </div>
      )
    }
    if (activePage === "blog" && !activeBlogCategory) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-interface text-sm text-muted-foreground">
            Pilih kategori blog dari sidebar
          </p>
        </div>
      )
    }

    // Default empty state
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-interface text-sm text-muted-foreground">
          Pilih halaman untuk mulai editing
        </p>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "grid h-full overflow-hidden",
        "transition-[grid-template-columns] duration-300 ease-in-out",
        isSidebarCollapsed && "sidebar-collapsed"
      )}
      style={{
        gridTemplateColumns: isSidebarCollapsed
          ? "48px 0px 0px 1fr"
          : `48px ${sidebarWidth}px 2px 1fr`,
      }}
    >
      {/* Column 1: Activity Bar */}
      <CmsActivityBar
        activePage={activePage}
        onPageChange={handlePageChange}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
      />

      {/* Column 2: Sidebar */}
      <aside
        className={cn(
          "flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-800",
          isSidebarCollapsed && "w-0"
        )}
      >
        <CmsSidebar
          activePage={activePage}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          activeLegalPage={activeLegalPage}
          onLegalPageChange={setActiveLegalPage}
          activeGlobalLayoutPage={activeGlobalLayoutPage}
          onGlobalLayoutPageChange={setActiveGlobalLayoutPage}
          activeDocGroup={activeDocGroup}
          onDocGroupChange={setActiveDocGroup}
          activeBlogCategory={activeBlogCategory}
          onBlogCategoryChange={setActiveBlogCategory}
          onCollapseSidebar={handleToggleSidebar}
        />
      </aside>

      {/* Column 3: Resizer */}
      {!isSidebarCollapsed ? (
        <PanelResizer
          position="left"
          onResize={handleSidebarResize}
          onDoubleClick={handleSidebarReset}
        />
      ) : (
        <div />
      )}

      {/* Column 4: Main Content */}
      <main className="flex flex-col overflow-hidden bg-white dark:bg-slate-900">
        <CmsTopBar
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
        />
        <div className="flex-1 overflow-y-auto p-comfort">
          <div className="mx-auto max-w-5xl">
            {renderEditor()}
          </div>
        </div>
      </main>
    </div>
  )
}

export default CmsShell
