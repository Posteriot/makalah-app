"use client"

import { Suspense, useEffect, useMemo, useState, useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { RefreshDouble, SidebarExpand } from "iconoir-react"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { DocumentationSection, NavigationGroup, SearchRecord } from "./types"
import { tokensFromText, scoreDoc, baseNorm, tokenize, stemToken } from "./utils"
import { GridPattern, DottedPattern, DiagonalStripes } from "@/components/marketing/SectionBackground"
import { DocSidebar } from "./DocSidebar"
import { DocArticle } from "./DocArticle"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

function DocumentationContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const sections = useQuery(api.documentationSections.getPublishedSections) as
    | DocumentationSection[]
    | undefined
  const pageSettings = useQuery(api.pageContent.getSection, {
    pageSlug: "docs",
    sectionSlug: "docs-page-settings",
  })
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchRecord[]>([])

  const orderedSections = useMemo(() => {
    if (!sections) return []
    return [...sections].sort((a, b) => a.order - b.order)
  }, [sections])

  const navigationGroups = useMemo<NavigationGroup[]>(() => {
    const groups = new Map<string, DocumentationSection[]>()
    for (const section of orderedSections) {
      const list = groups.get(section.group) ?? []
      list.push(section)
      groups.set(section.group, list)
    }

    const sidebarGroupOrder = ["Mulai", "Fitur Utama", "Subskripsi", "Panduan Lanjutan"]
    const rank = (groupTitle: string) => {
      const idx = sidebarGroupOrder.indexOf(groupTitle)
      return idx === -1 ? Number.MAX_SAFE_INTEGER : idx
    }

    return Array.from(groups.entries())
      .sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]))
      .map(([title, items]) => ({ title, items }))
  }, [orderedSections])

  const searchIndex = useMemo<SearchRecord[]>(() => {
    if (!sections) return []
    return sections.map((section) => ({
      id: section.slug,
      title: section.title,
      text: section.searchText,
      stemTitle: tokensFromText(section.title).join(" "),
      stemText: tokensFromText(section.searchText).join(" "),
    }))
  }, [sections])

  const updateUrl = useCallback(
    (sectionId: string) => {
      if (typeof window !== "undefined") {
        const currentSection = searchParams.get("section")
        const currentHash = window.location.hash
        if (currentSection === sectionId && currentHash === `#${sectionId}`) {
          return
        }
      }
      const params = new URLSearchParams(searchParams.toString())
      params.set("section", sectionId)
      router.replace(`${pathname}?${params.toString()}#${sectionId}`, { scroll: false })
    },
    [pathname, router, searchParams]
  )

  const handleSetActiveSection = useCallback(
    (sectionId: string) => {
      setActiveSection(sectionId)
      updateUrl(sectionId)
    },
    [updateUrl]
  )

  const handleMobileSelect = useCallback(
    (sectionId: string) => {
      handleSetActiveSection(sectionId)
      setMobileNavOpen(false)
    },
    [handleSetActiveSection]
  )

  useEffect(() => {
    if (!orderedSections.length) return
    const sectionParam = searchParams.get("section")
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1) : ""
    const hasParam = sectionParam && orderedSections.some((section) => section.slug === sectionParam)
    const hasHash = hash && orderedSections.some((section) => section.slug === hash)
    const nextSection = hasParam
      ? sectionParam
      : hasHash
        ? hash
        : orderedSections[0].slug
    setActiveSection(nextSection)
    updateUrl(nextSection)
  }, [orderedSections, searchParams, updateUrl])

  const scored = useMemo(() => {
    const q = query.trim()
    if (!q) return []

    const termsRaw = tokenize(q)
    const stems = termsRaw.map(stemToken).filter(Boolean)
    if (stems.length === 0) return []

    const plainIncludesScore = (record: SearchRecord, terms: string[]) => {
      const text = baseNorm(record.title + " " + record.text)
      let score = 0
      for (const term of terms) {
        const normalized = baseNorm(term)
        if (!normalized) continue
        if (text.includes(normalized)) score += 1
      }
      return score
    }

    return searchIndex
      .map((record) => {
        const stemScore = scoreDoc(record, stems)
        const rawScore = plainIncludesScore(record, termsRaw)
        const baseScore = Math.max(stemScore, rawScore)
        const bias = record.id === activeSection ? 0.5 : 0
        return { record, score: baseScore + bias }
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((entry) => entry.record)
  }, [query, searchIndex, activeSection])

  useEffect(() => {
    setResults(scored)
  }, [scored])

  const activeContent = useMemo(() => {
    if (!orderedSections.length || !activeSection) return null
    return orderedSections.find((section) => section.slug === activeSection) ?? null
  }, [activeSection, orderedSections])

  const currentIndex = useMemo(() => {
    return orderedSections.findIndex((section) => section.slug === activeSection)
  }, [orderedSections, activeSection])

  const previousSection = currentIndex > 0 ? orderedSections[currentIndex - 1] : null
  const nextSectionNav =
    currentIndex >= 0 && currentIndex < orderedSections.length - 1
      ? orderedSections[currentIndex + 1]
      : null
  const nextStepSections = useMemo(() => {
    if (!orderedSections.length || currentIndex < 0 || !activeSection) return []

    const directNext = orderedSections
      .slice(currentIndex + 1, currentIndex + 3)
      .filter((section) => section.slug !== activeSection)

    if (directNext.length >= 2) {
      return directNext
    }

    const fallback = [...directNext]
    for (const section of orderedSections) {
      if (section.slug === activeSection) continue
      if (fallback.some((item) => item.slug === section.slug)) continue
      fallback.push(section)
      if (fallback.length === 2) break
    }

    return fallback
  }, [orderedSections, currentIndex, activeSection])

  return (
    <div className="relative isolate overflow-hidden bg-[color:var(--section-bg-alt)] pt-[var(--header-h)]">
      {/* Background patterns — conditional via CMS when page-settings published */}
      {pageSettings?.isPublished && pageSettings.showGridPattern === true && <GridPattern className="z-0" />}
      {(!pageSettings?.isPublished || pageSettings.showDottedPattern !== false) && <DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-100" />}
      {pageSettings?.isPublished && pageSettings.showDiagonalStripes === true && <DiagonalStripes className="z-0" />}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 lg:px-8">
        <div className="grid grid-cols-1 gap-comfort pb-6 md:grid-cols-16">
          <aside className="hidden md:col-span-4 md:block">
            <div className="mt-4 rounded-shell border-hairline bg-card/90 p-comfort backdrop-blur-[1px] dark:bg-slate-900">
              <DocSidebar
                query={query}
                onQueryChange={setQuery}
                onSelectSection={handleSetActiveSection}
                activeSection={activeSection}
                navigationGroups={navigationGroups}
                results={results}
              />
            </div>
          </aside>

          <div className="col-span-1 pt-4 md:col-span-12">
            <div className="mb-4 flex justify-end md:hidden">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                className="rounded-action p-1 text-foreground transition-colors hover:text-foreground/70"
                aria-label="Buka navigasi"
              >
                <SidebarExpand className="h-7 w-7" strokeWidth={1.5} />
              </button>
            </div>
            <DocArticle
              activeContent={activeContent}
              previousSection={previousSection}
              nextSection={nextSectionNav}
              nextStepSections={nextStepSections}
              onSelectSection={handleSetActiveSection}
            />
          </div>
        </div>
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="right" className="w-72 p-0">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="text-signal text-[10px] font-bold tracking-widest text-foreground">
              Navigasi Dokumentasi
            </SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto p-comfort">
            <DocSidebar
              query={query}
              onQueryChange={setQuery}
              onSelectSection={handleMobileSelect}
              activeSection={activeSection}
              navigationGroups={navigationGroups}
              results={results}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function DocumentationLoading() {
  return (
    <div className="min-h-screen pt-[var(--header-h)]">
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshDouble className="h-8 w-8 animate-spin text-primary" />
          <p className="text-interface text-xs uppercase tracking-widest text-muted-foreground">
            Memuat dokumentasi...
          </p>
        </div>
      </div>
    </div>
  )
}

export function DocumentationPage() {
  return (
    <Suspense fallback={<DocumentationLoading />}>
      <DocumentationContent />
    </Suspense>
  )
}
