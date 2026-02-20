"use client"

import { useState } from "react"
import { NavArrowRight, NavArrowDown } from "iconoir-react"
import type { Id } from "@convex/_generated/dataModel"
import { HeroSectionEditor } from "./cms/HeroSectionEditor"
import { BenefitsSectionEditor } from "./cms/BenefitsSectionEditor"
import { FeatureShowcaseEditor } from "./cms/FeatureShowcaseEditor"
import { HeaderConfigEditor } from "./cms/HeaderConfigEditor"

type PageId = "home" | "about" | "privacy" | "security" | "terms" | "header" | "footer"
type SectionId = "hero" | "benefits" | "features-workflow" | "features-refrasa"

type NavSection = {
  id: SectionId
  label: string
}

type NavPage = {
  id: PageId
  label: string
  sections?: NavSection[]
}

const PAGES_NAV: { pages: NavPage[]; global: NavPage[] } = {
  pages: [
    {
      id: "home",
      label: "Home",
      sections: [
        { id: "hero", label: "Hero" },
        { id: "benefits", label: "Benefits" },
        { id: "features-workflow", label: "Fitur: Workflow" },
        { id: "features-refrasa", label: "Fitur: Refrasa" },
      ],
    },
    { id: "about", label: "About" },
    { id: "privacy", label: "Privacy" },
    { id: "security", label: "Security" },
    { id: "terms", label: "Terms" },
  ],
  global: [
    { id: "header", label: "Header" },
    { id: "footer", label: "Footer" },
  ],
}

type ContentManagerProps = {
  userId: Id<"users">
}

export function ContentManager({ userId }: ContentManagerProps) {
  const [selectedPage, setSelectedPage] = useState<PageId | null>(null)
  const [selectedSection, setSelectedSection] = useState<SectionId | null>(null)
  const [homeExpanded, setHomeExpanded] = useState(false)

  function handlePageClick(page: NavPage) {
    if (page.sections) {
      setHomeExpanded((prev) => !prev)
    } else {
      setSelectedPage(page.id)
      setSelectedSection(null)
    }
  }

  function handleSectionClick(pageId: PageId, section: NavSection) {
    setSelectedPage(pageId)
    setSelectedSection(section.id)
  }

  function isPageActive(pageId: PageId) {
    return selectedPage === pageId && selectedSection === null
  }

  function isSectionActive(sectionId: SectionId) {
    return selectedSection === sectionId
  }

  function getSelectionLabel(): string | null {
    if (!selectedPage) return null
    const page = [...PAGES_NAV.pages, ...PAGES_NAV.global].find(
      (p) => p.id === selectedPage
    )
    if (!page) return null
    if (selectedSection) {
      const section = page.sections?.find((s) => s.id === selectedSection)
      return section ? `${page.label} / ${section.label}` : null
    }
    return page.label
  }

  const selectionLabel = getSelectionLabel()

  return (
    <div className="rounded-shell border-main border border-border bg-card/60">
      {/* Header */}
      <div className="border-b border-border p-comfort">
        <h3 className="text-interface text-base font-medium text-foreground">
          Content Manager
        </h3>
      </div>

      {/* Body: sidebar + editor */}
      <div className="flex min-h-[480px]">
        {/* Left sidebar */}
        <div className="w-56 shrink-0 border-r border-border p-comfort">
          {/* Pages group */}
          <div className="mb-4">
            <span className="text-signal mb-2 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Pages
            </span>
            <div className="flex flex-col gap-dense">
              {PAGES_NAV.pages.map((page) => (
                <div key={page.id}>
                  <button
                    type="button"
                    onClick={() => handlePageClick(page)}
                    className={`text-interface flex w-full items-center gap-2 rounded-action px-2 py-1.5 text-left text-sm transition-colors duration-50 ${
                      isPageActive(page.id)
                        ? "border-l-2 border-amber-500 bg-muted/30 text-foreground"
                        : "cursor-pointer border-l-2 border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    {page.sections && (
                      <span className="shrink-0">
                        {homeExpanded ? (
                          <NavArrowDown className="h-4 w-4" strokeWidth={1.5} />
                        ) : (
                          <NavArrowRight className="h-4 w-4" strokeWidth={1.5} />
                        )}
                      </span>
                    )}
                    <span>{page.label}</span>
                  </button>

                  {/* Sections under Home */}
                  {page.sections && homeExpanded && (
                    <div className="ml-4 mt-1 flex flex-col gap-dense border-l border-border pl-2">
                      {page.sections.map((section) => (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => handleSectionClick(page.id, section)}
                          className={`text-interface w-full rounded-action px-2 py-1 text-left text-sm transition-colors duration-50 ${
                            isSectionActive(section.id)
                              ? "border-l-2 border-amber-500 bg-muted/30 text-foreground"
                              : "cursor-pointer border-l-2 border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          }`}
                        >
                          {section.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Global group */}
          <div>
            <span className="text-signal mb-2 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Global
            </span>
            <div className="flex flex-col gap-dense">
              {PAGES_NAV.global.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => handlePageClick(page)}
                  className={`text-interface flex w-full items-center gap-2 rounded-action px-2 py-1.5 text-left text-sm transition-colors duration-50 ${
                    isPageActive(page.id)
                      ? "border-l-2 border-amber-500 bg-muted/30 text-foreground"
                      : "cursor-pointer border-l-2 border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <span>{page.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right panel: editor area */}
        <div className="flex flex-1 items-center justify-center p-comfort">
          {selectedPage === "home" && selectedSection === "hero" ? (
            <HeroSectionEditor userId={userId} />
          ) : selectedPage === "home" && selectedSection === "benefits" ? (
            <BenefitsSectionEditor userId={userId} />
          ) : selectedPage === "home" && selectedSection === "features-workflow" ? (
            <FeatureShowcaseEditor pageSlug="home" sectionSlug="features-workflow" userId={userId} />
          ) : selectedPage === "home" && selectedSection === "features-refrasa" ? (
            <FeatureShowcaseEditor pageSlug="home" sectionSlug="features-refrasa" userId={userId} />
          ) : selectedPage === "header" ? (
            <HeaderConfigEditor userId={userId} />
          ) : selectionLabel ? (
            <div className="text-center">
              <span className="text-signal mb-3 block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {selectionLabel}
              </span>
              <p className="text-interface text-sm text-muted-foreground">
                Editor untuk{" "}
                <span className="font-medium text-foreground">
                  {selectionLabel}
                </span>{" "}
                akan segera tersedia
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-interface text-sm text-muted-foreground">
                Pilih halaman atau section untuk mulai editing
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
