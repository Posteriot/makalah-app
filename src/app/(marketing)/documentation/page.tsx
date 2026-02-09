"use client"

import { Suspense, useEffect, useMemo, useState, useCallback } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Book,
  Page,
  Globe,
  LightBulb,
  Search,
  Settings,
  ShieldCheck,
  Group,
  Flash,
  NavArrowRight,
  NavArrowLeft,
  RefreshDouble,
} from "iconoir-react"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

type DocListItem = {
  text: string
  subItems?: string[]
}

type DocList = {
  variant: "bullet" | "numbered"
  items: DocListItem[]
}

type DocBlock =
  | {
    type: "infoCard"
    title: string
    description?: string
    items: string[]
  }
  | {
    type: "ctaCards"
    items: Array<{
      title: string
      description: string
      targetSection: string
      ctaText: string
      icon?: string
    }>
  }
  | {
    type: "section"
    title: string
    description?: string
    paragraphs?: string[]
    list?: DocList
  }

type DocumentationSection = {
  _id: string
  slug: string
  title: string
  group: string
  order: number
  icon?: string
  headerIcon?: string
  summary?: string
  blocks: DocBlock[]
  searchText: string
}

type SearchRecord = {
  id: string
  title: string
  text: string
  stemTitle: string
  stemText: string
}

// Iconoir icon map with backward-compatible keys (match database iconName values)
const iconMap = {
  BookOpen: Book,
  FileText: Page,
  Globe,
  Lightbulb: LightBulb,
  Settings,
  ShieldCheck,
  Users: Group,
  Zap: Flash,
}

type IconKey = keyof typeof iconMap

const getIcon = (key?: string) => {
  if (!key) return null
  const Icon = iconMap[key as IconKey]
  return Icon ?? null
}

const stripDiacritics = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f\u1AB0-\u1AFF\u1DC0-\u1DFF\u20D0-\u20FF\uFE20-\uFE2F]/g, "")

const baseNorm = (value: string) => stripDiacritics(value.toLowerCase())

const stemToken = (value: string) => {
  let token = value
  token = token.replace(/^[^\p{L}0-9]+|[^\p{L}0-9]+$/gu, "")
  token = token.replace(/(nya|lah|kah|pun|ku|mu)$/i, "")
  token = token.replace(/(kan|an|i)$/i, (match) => (token.length > 4 ? "" : match))
  return token
}

const escapeReg = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const tokenize = (value: string) =>
  baseNorm(value)
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)

const tokensFromText = (value: string) => tokenize(value).map(stemToken).filter(Boolean)

const scoreDoc = (record: SearchRecord, stems: string[]) => {
  const titleTokens = record.stemTitle.split(" ").filter(Boolean)
  const textTokens = record.stemText.split(" ").filter(Boolean)
  let score = 0

  for (const token of stems) {
    if (!token) continue
    const titleHits = titleTokens.reduce((count, t) => count + (t === token ? 1 : 0), 0)
    const textHits = textTokens.reduce((count, t) => count + (t === token ? 1 : 0), 0)
    score += titleHits * 2 + textHits
  }

  return score
}

const makeSnippet = (text: string, term: string, span = 80) => {
  const index = text.toLowerCase().indexOf(term.toLowerCase())
  if (index < 0) return text.slice(0, 120) + (text.length > 120 ? "..." : "")
  const start = Math.max(0, index - span)
  const end = Math.min(text.length, index + span)
  return (start > 0 ? "..." : "") + text.slice(start, end) + (end < text.length ? "..." : "")
}

const buildMatchRegex = (stems: string[]) => {
  const parts = stems.filter(Boolean).map((token) => escapeReg(token))
  if (parts.length === 0) return null
  return new RegExp(`\\b(?:${parts.join("|")})[\\w-]*`, "i")
}

const makeSnippetAdvanced = (text: string, stems: string[], fallback: string) => {
  const rx = buildMatchRegex(stems)
  if (rx) {
    const match = rx.exec(baseNorm(text))
    if (match) {
      return makeSnippet(text, match[0])
    }
  }
  return makeSnippet(text, fallback)
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

const highlightSnippet = (snippet: string, stems: string[]) => {
  const escaped = escapeHtml(snippet)
  const parts = stems.filter(Boolean).map((token) => escapeReg(token))
  if (parts.length === 0) return escaped
  const rx = new RegExp(`\\b(${parts.join("|")})[\\w-]*`, "gi")
  return escaped.replace(rx, "<mark>$&</mark>")
}

const renderInline = (text: string) => {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="text-narrative font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`${part}-${index}`}
          className="text-interface rounded-sm bg-slate-950/10 px-1 py-0.5 text-xs text-foreground dark:bg-slate-950"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return <span key={`${part}-${index}`}>{part}</span>
  })
}

function DocumentationContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const sections = useQuery(api.documentationSections.getPublishedSections) as
    | DocumentationSection[]
    | undefined
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchRecord[]>([])

  const orderedSections = useMemo(() => {
    if (!sections) return []
    return [...sections].sort((a, b) => a.order - b.order)
  }, [sections])

  const navigationGroups = useMemo(() => {
    const groups = new Map<string, DocumentationSection[]>()
    for (const section of orderedSections) {
      const list = groups.get(section.group) ?? []
      list.push(section)
      groups.set(section.group, list)
    }
    return Array.from(groups.entries()).map(([title, items]) => ({ title, items }))
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

  useEffect(() => {
    const handleToggle = () => setSidebarOpen((open) => !open)
    window.addEventListener("documentation:toggle-sidebar", handleToggle)
    return () => window.removeEventListener("documentation:toggle-sidebar", handleToggle)
  }, [])

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
  const nextSection =
    currentIndex >= 0 && currentIndex < orderedSections.length - 1
      ? orderedSections[currentIndex + 1]
      : null

  return (
    <div className="min-h-screen pt-[var(--header-h)]">
      <div className="grid grid-cols-1 md:grid-cols-16 min-h-screen">
        <aside className="sticky top-[var(--header-h)] hidden h-[calc(100vh-var(--header-h))] flex-col overflow-y-auto border-r border-hairline bg-card/30 px-4 py-6 md:col-span-4 md:flex">
          <div className="mb-6 rounded-lg bg-background/70 px-3 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && results.length > 0) {
                    handleSetActiveSection(results[0].id)
                  }
                }}
                placeholder="Cari dokumentasi..."
                className="h-10 w-full rounded-md border border-border bg-background pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {query.length > 0 && (
              <div className="mt-2 rounded-md border border-border bg-card/70">
                {results.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    Tidak ada hasil yang cocok
                  </div>
                ) : (
                  <ul className="max-h-56 overflow-auto">
                    {results.map((result) => (
                      <li key={result.id}>
                        <button
                          type="button"
                          onClick={() => handleSetActiveSection(result.id)}
                          className={cn(
                            "w-full px-3 py-2 text-left text-xs transition hover:bg-muted/50",
                            activeSection === result.id && "bg-muted/70"
                          )}
                        >
                          <div className="font-medium text-foreground">{result.title}</div>
                          <div
                            className="line-clamp-2 text-muted-foreground"
                            dangerouslySetInnerHTML={{
                              __html: highlightSnippet(
                                makeSnippetAdvanced(result.text, tokensFromText(query), query),
                                tokensFromText(query)
                              ),
                            }}
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
                  Tekan Enter untuk membuka hasil teratas
                </div>
              </div>
            )}
          </div>

          <nav className="flex flex-col gap-6">
            {navigationGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-signal text-[10px] font-bold text-muted-foreground">
                  {group.title}
                </h3>
                <ul className="mt-3 space-y-1">
                  {group.items.map((item) => {
                    const Icon = getIcon(item.icon)
                    const isActive = activeSection === item.slug
                    return (
                      <li key={item.slug}>
                        <button
                          type="button"
                          onClick={() => handleSetActiveSection(item.slug)}
                          className={cn(
                            "relative flex w-full items-center gap-3 rounded-action px-3 py-2 text-sm transition",
                            isActive
                              ? "bg-amber-500/5 text-amber-500"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          )}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full bg-amber-500" />
                          )}
                          {Icon && <Icon className="h-4 w-4 shrink-0" />}
                          <span className="text-interface flex-1 truncate text-left">
                            {item.title}
                          </span>
                          {isActive && <NavArrowRight className="h-4 w-4 shrink-0" />}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <main className="col-span-1 px-4 py-6 md:col-span-12 md:px-10">
          <div className="mx-auto w-full max-w-4xl">
            {activeContent ? (
              <article className="space-y-8">
                <div className="space-y-4">
                  <div className="text-signal text-[10px] font-bold text-muted-foreground">
                    {activeContent.group}
                  </div>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-action bg-primary/10">
                      {(() => {
                        const Icon = getIcon(activeContent.headerIcon ?? activeContent.icon)
                        return Icon ? <Icon className="h-6 w-6 text-primary" /> : null
                      })()}
                    </div>
                    <div>
                      <h1 className="text-interface text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                        {activeContent.title}
                      </h1>
                    </div>
                  </div>
                  {activeContent.summary && (
                    <p className="text-narrative text-sm leading-relaxed text-muted-foreground">
                      {activeContent.summary}
                    </p>
                  )}
                </div>

                <div className="space-y-6">
                  {activeContent.blocks.map((block, index) => {
                    if (block.type === "infoCard") {
                      return (
                        <div
                          key={`${block.type}-${index}`}
                          className="rounded-shell border-main border border-info/20 bg-info/5"
                        >
                          <div className="border-l-4 border-info px-5 py-4">
                            <h2 className="text-interface text-base font-medium text-info">
                              {block.title}
                            </h2>
                            {block.description && (
                              <p className="text-narrative mt-1 text-sm text-muted-foreground">
                                {block.description}
                              </p>
                            )}
                          </div>
                          <div className="px-5 pb-5 pt-4">
                            <ul className="space-y-2 text-narrative text-sm text-muted-foreground">
                              {block.items.map((item, itemIndex) => (
                                <li key={`${block.title}-${itemIndex}`} className="relative pl-4">
                                  <span className="absolute left-0 top-1 text-info">•</span>
                                  {renderInline(item)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )
                    }

                    if (block.type === "ctaCards") {
                      return (
                        <div
                          key={`${block.type}-${index}`}
                          className="grid gap-4 sm:grid-cols-2"
                        >
                          {block.items.map((item) => {
                            const Icon = getIcon(item.icon)
                            return (
                              <button
                                key={item.title}
                                type="button"
                                onClick={() => handleSetActiveSection(item.targetSection)}
                                className="hover-slash group flex h-full flex-col rounded-shell border border-main bg-card px-5 py-4 text-left transition hover:border-primary/30"
                              >
                                <div className="relative z-10 mb-4">
                                  {Icon && (
                                    <Icon className="mb-3 h-7 w-7 text-primary" />
                                  )}
                                  <h3 className="text-interface text-sm font-medium text-foreground">
                                    {item.title}
                                  </h3>
                                  <p className="text-narrative mt-1 text-sm text-muted-foreground">
                                    {item.description}
                                  </p>
                                </div>
                                <div className="text-signal relative z-10 mt-auto inline-flex items-center gap-2 text-xs text-primary">
                                  {item.ctaText}
                                  <NavArrowRight className="h-4 w-4" />
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )
                    }

                    return (
                      <section key={`${block.type}-${index}`} className="space-y-3">
                        <h2 className="text-interface text-base font-medium text-foreground">
                          {block.title}
                        </h2>
                        {block.description && (
                          <p className="text-narrative text-sm leading-relaxed text-muted-foreground">
                            {block.description}
                          </p>
                        )}
                        {block.paragraphs?.map((paragraph, paragraphIndex) => (
                          <p
                            key={`${block.title}-p-${paragraphIndex}`}
                            className="text-narrative text-sm leading-relaxed text-muted-foreground"
                          >
                            {renderInline(paragraph)}
                          </p>
                        ))}
                        {block.list && (
                          <ol
                            className={cn(
                              "space-y-2 text-sm text-muted-foreground",
                              block.list.variant === "bullet"
                                ? "list-disc pl-5"
                                : "list-decimal pl-5"
                            )}
                          >
                            {block.list.items.map((item, itemIndex) => (
                              <li key={`${block.title}-item-${itemIndex}`}>
                                <div>{renderInline(item.text)}</div>
                                {item.subItems && item.subItems.length > 0 && (
                                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                                    {item.subItems.map((subItem, subIndex) => (
                                      <li key={`${block.title}-sub-${subIndex}`}>
                                        {renderInline(subItem)}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </li>
                            ))}
                          </ol>
                        )}
                      </section>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between border-t border-border pt-4 md:hidden">
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-semibold",
                      previousSection
                        ? "text-foreground"
                        : "cursor-not-allowed text-muted-foreground"
                    )}
                    onClick={() =>
                      previousSection && handleSetActiveSection(previousSection.slug)
                    }
                    disabled={!previousSection}
                  >
                    <NavArrowLeft className="h-4 w-4" />
                    Kembali
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-semibold",
                      nextSection
                        ? "text-foreground"
                        : "cursor-not-allowed text-muted-foreground"
                    )}
                    onClick={() => nextSection && handleSetActiveSection(nextSection.slug)}
                    disabled={!nextSection}
                  >
                    Lanjut
                    <NavArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ) : (
              <div className="rounded-lg border border-border bg-card/60 p-6 text-center text-sm text-muted-foreground">
                Dokumentasi sedang dimuat.
              </div>
            )}
          </div>
        </main>
      </div>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <div className="border-b border-border px-5 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && results.length > 0) {
                    handleSetActiveSection(results[0].id)
                    setSidebarOpen(false)
                  }
                }}
                placeholder="Cari dokumentasi..."
                className="h-10 w-full rounded-md border border-border bg-background pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="overflow-y-auto px-5 py-5">
            {navigationGroups.map((group) => (
              <div key={group.title} className="mb-6">
                <h3 className="text-signal text-[10px] font-bold text-muted-foreground">
                  {group.title}
                </h3>
                <ul className="mt-3 space-y-1">
                  {group.items.map((item) => {
                    const Icon = getIcon(item.icon)
                    const isActive = activeSection === item.slug
                    return (
                      <li key={item.slug}>
                        <button
                          type="button"
                          onClick={() => {
                            handleSetActiveSection(item.slug)
                            setSidebarOpen(false)
                          }}
                          className={cn(
                            "relative flex w-full items-center gap-3 rounded-action px-3 py-2 text-sm transition",
                            isActive
                              ? "bg-amber-500/5 text-amber-500"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          )}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-2 bottom-2 w-[2px] rounded-r-full bg-amber-500" />
                          )}
                          {Icon && <Icon className="h-4 w-4 shrink-0" />}
                          <span className="text-interface flex-1 truncate text-left">
                            {item.title}
                          </span>
                          {isActive && <NavArrowRight className="h-4 w-4 shrink-0" />}
                        </button>
                      </li>
                    )
                  })}
                </ul>

                {query.length > 0 && (
                  <div className="mt-4 rounded-md border border-border bg-card/60">
                    <div className="px-3 py-2 text-[10px] font-semibold uppercase text-muted-foreground">
                      Hasil pencarian
                    </div>
                    {results.length === 0 ? (
                      <div className="px-3 pb-3 text-xs text-muted-foreground">
                        Tidak ada hasil
                      </div>
                    ) : (
                      <ul className="max-h-48 overflow-auto px-2 pb-3">
                        {results.map((result) => (
                          <li key={result.id}>
                            <button
                              type="button"
                              onClick={() => {
                                handleSetActiveSection(result.id)
                                setSidebarOpen(false)
                              }}
                              className={cn(
                                "w-full rounded px-2 py-2 text-left text-xs transition hover:bg-muted/50",
                                activeSection === result.id && "bg-muted/70"
                              )}
                            >
                              <div className="font-medium text-foreground">{result.title}</div>
                              <div
                                className="line-clamp-2 text-muted-foreground"
                                dangerouslySetInnerHTML={{
                                  __html: highlightSnippet(
                                    makeSnippetAdvanced(result.text, tokensFromText(query), query),
                                    tokensFromText(query)
                                  ),
                                }}
                              />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ))}
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
          <p className="text-sm text-muted-foreground">Memuat dokumentasi...</p>
        </div>
      </div>
    </div>
  )
}

export default function DocumentationPage() {
  return (
    <Suspense fallback={<DocumentationLoading />}>
      <DocumentationContent />
    </Suspense>
  )
}
